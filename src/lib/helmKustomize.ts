// One app's manifests for dev, staging and production, packaged two ways. Helm values are
// deep-merged and rendered through a small template engine (.Values paths, default, if);
// Kustomize overlays are merged onto the base like a strategic merge patch with the images
// transformer. A schema check, tag pinning and a diff before apply decide what slips through.

export type Tool = "helm" | "kustomize";
export type Env = "dev" | "staging" | "prod";
export type Design = { tool: Tool; schema: boolean; pinTag: boolean; diff: boolean };
type Obj = { [k: string]: unknown };

export const FIRST: Design = { tool: "helm", schema: false, pinTag: false, diff: false };
export const FIXED: Design = { tool: "helm", schema: true, pinTag: true, diff: true };
export const ENVS: Env[] = ["dev", "staging", "prod"];
export const HAND_EDIT = 8; // someone ran kubectl scale --replicas=8 in production

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
export function merge(a: Obj, b: Obj): Obj {
  const out: Obj = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = isObj(v) && isObj(out[k]) ? merge(out[k] as Obj, v) : v;
  return out;
}
const get = (o: Obj, path: string) => path.split(".").reduce<unknown>((x, k) => (isObj(x) ? x[k] : undefined), o);

// ---------- Helm ----------
export const DEFAULT_VALUES: Obj = { replicas: 1, image: { repository: "shop", tag: "" }, cpu: "250m", ingress: { enabled: false, host: "" } };
export function envValues(env: Env, d: Design): Obj {
  if (env === "dev") return {};
  if (env === "staging") return { replicas: 2, ingress: { enabled: true, host: "staging.shop.example" }, ...(d.pinTag ? { image: { tag: "1.4.3-rc.1" } } : {}) };
  return { replica: 5, cpu: "1", ingress: { enabled: true, host: "shop.example" }, ...(d.pinTag ? { image: { tag: "1.4.2" } } : {}) };
}
export const TEMPLATE = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: shop
spec:
  replicas: {{ .Values.replicas }}
  template:
    spec:
      containers:
      - image: {{ .Values.image.repository }}:{{ .Values.image.tag | default "latest" }}
        resources: { requests: { cpu: {{ .Values.cpu }} } }
{{- if .Values.ingress.enabled }}
---
kind: Ingress
spec:
  rules:
  - host: {{ .Values.ingress.host }}
{{- end }}`;

export function renderHelm(values: Obj) {
  let t = TEMPLATE.replace(/\{\{- if \.Values\.([\w.]+) \}\}([\s\S]*?)\{\{- end \}\}/g, (_, p, body) => (get(values, p) ? body : ""));
  t = t.replace(/\{\{ \.Values\.([\w.]+)(?: \| default "([^"]*)")? \}\}/g, (_, p, def) => {
    const v = get(values, p);
    return v === undefined || v === "" || v === null ? (def ?? "") : String(v);
  });
  return t.split("\n").filter((l) => l.trim() !== "");
}

// values.schema.json with additionalProperties: false at every level.
export function schemaErrors(values: Obj, shape: Obj = DEFAULT_VALUES, at = ""): string[] {
  const errs: string[] = [];
  for (const [k, v] of Object.entries(values)) {
    if (!(k in shape)) errs.push(`${at}${at ? "" : "(root)"}: additional property '${k}' not allowed`);
    else if (isObj(v) && isObj(shape[k])) errs.push(...schemaErrors(v, shape[k] as Obj, `${at}${k}.`));
  }
  return errs;
}

// ---------- Kustomize ----------
export const BASE: Obj = { kind: "Deployment", metadata: { name: "shop" }, spec: { replicas: 1, template: { spec: { containers: [{ name: "app", image: "shop:latest", cpu: "250m" }] } } } };
// Production's overlay first said spec.replica; the API server rejects that at apply, so
// the overlay shown here is the corrected one.
export function overlay(env: Env, d: Design) {
  const patch: Obj = env === "dev" ? {} : env === "staging" ? { spec: { replicas: 2 } } : { spec: { replicas: 5 } };
  const newTag = d.pinTag ? (env === "prod" ? "1.4.2" : env === "staging" ? "1.4.3-rc.1" : null) : null;
  return { patch, newTag, ingress: env !== "dev" ? (env === "prod" ? "shop.example" : "staging.shop.example") : null };
}
export function renderKustomize(env: Env, d: Design) {
  const o = overlay(env, d);
  const m = merge(BASE, o.patch);
  const spec = m.spec as Obj;
  const c = ((spec.template as Obj).spec as Obj).containers as Obj[];
  const image = o.newTag ? `shop:${o.newTag}` : String(c[0].image);
  const lines = ["kind: Deployment", "metadata:", "  name: shop", "spec:", ...Object.entries(spec).filter(([k]) => k !== "template").map(([k, v]) => `  ${k}: ${v}`), "  template:", "    spec:", "      containers:", `      - image: ${image}`, `        resources: { requests: { cpu: ${env === "prod" ? "1" : "250m"} } }`];
  if (o.ingress) lines.push("---", "kind: Ingress", "spec:", "  rules:", `  - host: ${o.ingress}`);
  return lines;
}

// A caught typo gets fixed before anything ships, so the output uses the corrected value.
export function render(env: Env, d: Design) {
  if (d.tool === "helm") {
    const raw = envValues(env, d);
    const errors = d.schema ? schemaErrors(raw) : [];
    const used = errors.length ? merge(Object.fromEntries(Object.entries(raw).filter(([k]) => k !== "replica")), { replicas: raw.replica }) : raw;
    return { lines: renderHelm(merge(DEFAULT_VALUES, used)), values: raw, errors };
  }
  const errors = env === "prod" ? ['kubectl apply: strict decoding error: unknown field "spec.replica"'] : [];
  return { lines: renderKustomize(env, d), values: null, errors };
}

// Lines in b that aren't in a, and the reverse: enough for "what differs".
export function diff(a: string[], b: string[]) {
  return { removed: a.filter((l) => !b.includes(l)), added: b.filter((l) => !a.includes(l)) };
}

const field = (lines: string[], key: string) => lines.find((l) => l.trim().startsWith(`${key}:`))?.split(":").slice(1).join(":").trim();

export function events(d: Design) {
  const prod = render("prod", d);
  const replicas = field(prod.lines, "replicas");
  const image = prod.lines.find((l) => l.includes("image:"))!.split("image:")[1].trim();
  const typo = d.tool === "helm"
    ? prod.errors.length
      ? { ok: true, text: `helm upgrade fails: ${prod.errors[0]}; it's fixed to replicas: 5 before anything ships` }
      : { ok: false, text: `replica: 5 is ignored; production renders replicas: ${replicas} and runs one pod` }
    : { ok: true, text: "the patch adds spec.replica; the API server's strict validation rejects the apply, and it's fixed to replicas: 5" };
  const tag = image.endsWith(":latest")
    ? { ok: false, text: `production runs ${image}: whatever was pushed last, different on every node that pulls` }
    : { ok: true, text: `production runs ${image}; promoting is changing that one value` };
  const edit = d.diff
    ? { ok: true, text: `the diff shows replicas ${HAND_EDIT} → ${replicas ?? 1} before anything is applied, so the hand edit is spotted and moved into the repo` }
    : { ok: false, text: `the next deploy silently sets replicas back from ${HAND_EDIT} to ${replicas ?? 1} during peak traffic` };
  return [
    { id: "typo", title: "A typo in production's settings", ...typo },
    { id: "tag", title: "Nobody set production's image tag", ...tag },
    { id: "edit", title: `Someone scaled production to ${HAND_EDIT} by hand`, ...edit },
  ];
}
