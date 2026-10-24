// Configuration and credentials for a Deployment, and five things that happen to them.
// A Secret's value is base64, which anyone can decode (computed here), and a checksum of
// the config in the pod template makes a change roll out (real SHA-256 here).

import { sha256Hex, utf8 } from "./hashing";

export type Delivery = "env" | "volume" | "subPath";
export type Source = "git" | "external";
export type Design = { delivery: Delivery; checksum: boolean; narrowRbac: boolean; encrypted: boolean; source: Source };
export type EventId = "setting" | "rotate" | "peek" | "backup" | "repo";

export const FIRST: Design = { delivery: "env", checksum: false, narrowRbac: false, encrypted: false, source: "git" };
export const FIXED: Design = { delivery: "volume", checksum: true, narrowRbac: true, encrypted: true, source: "external" };

export const PASSWORD = "s3cret-Pg-2026";
export const NEW_PASSWORD = "n3w-Pg-rotated";
export const CONFIG = { LOG_LEVEL: "info", FEATURE_SEARCH_V2: "false" };

export const EVENTS: { id: EventId; title: string; step: number }[] = [
  { id: "setting", title: "Change LOG_LEVEL to debug", step: 1 },
  { id: "rotate", title: "Rotate the database password", step: 1 },
  { id: "peek", title: "A teammate runs kubectl get secret -o yaml", step: 2 },
  { id: "backup", title: "An etcd backup lands in a public bucket", step: 3 },
  { id: "repo", title: "Someone reads the Git repository", step: 4 },
];

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
export function base64(text: string) {
  const b = utf8(text);
  let out = "";
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i] << 16) | ((b[i + 1] ?? 0) << 8) | (b[i + 2] ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < b.length ? B64[(n >> 6) & 63] : "=") + (i + 2 < b.length ? B64[n & 63] : "=");
  }
  return out;
}
export function unbase64(s: string) {
  const clean = s.replace(/=+$/, "");
  const bytes: number[] = [];
  let buf = 0;
  let bits = 0;
  for (const c of clean) {
    buf = (buf << 6) | B64.indexOf(c);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buf >> bits) & 255);
    }
  }
  return String.fromCharCode(...bytes);
}

// checksum/config: a hash of the ConfigMap and Secret data placed on the pod template.
export function checksum(cfg: Record<string, string>, password: string) {
  return sha256Hex(JSON.stringify(cfg) + "\n" + password).slice(0, 16);
}

export function judge(e: EventId, d: Design): { ok: boolean; text: string } {
  const picksUp = (what: string) => {
    if (d.checksum) return { ok: true, text: `the checksum annotation changes, so the Deployment rolls every pod onto the new ${what} within minutes` };
    if (d.delivery === "volume") return { ok: true, text: `the kubelet rewrites the mounted file within about a minute; the app reloads it when it changes` };
    if (d.delivery === "subPath") return { ok: false, text: `a subPath mount is copied once and never updated; pods keep the old ${what} until they restart` };
    return { ok: false, text: `environment variables are read once at container start; running pods keep the old ${what} until something restarts them` };
  };
  switch (e) {
    case "setting":
      return picksUp("setting");
    case "rotate": {
      const r = picksUp("password");
      if (!r.ok) return { ok: false, text: `${r.text}. When the old password is revoked, those pods start failing` };
      return d.source === "external" ? { ok: true, text: `the secrets operator syncs the new value from the vault; ${r.text}` } : r;
    }
    case "peek":
      return d.narrowRbac
        ? { ok: true, text: "Forbidden: only the app's service account may get this Secret" }
        : { ok: false, text: `the YAML shows password: ${base64(PASSWORD)}, and base64 -d prints ${PASSWORD}` };
    case "backup":
      return d.encrypted
        ? { ok: true, text: "etcd holds the Secret encrypted with a key from the cloud KMS; the backup alone is useless" }
        : { ok: false, text: "Secrets are stored in etcd unencrypted unless encryption at rest is configured; the backup has every password" };
    case "repo":
      return d.source === "external"
        ? { ok: true, text: "the repo holds an ExternalSecret that names the vault path, not the value" }
        : { ok: false, text: `the Secret manifest in Git has password: ${base64(PASSWORD)}; base64 is an encoding, not encryption` };
  }
}

export function scorecard(d: Design) {
  return EVENTS.map((x) => ({ event: x, ...judge(x.id, d) }));
}

export function podSpec(d: Design) {
  const lines = ["spec:", "  template:"];
  if (d.checksum) lines.push("    metadata:", `      annotations: { checksum/config: ${checksum(CONFIG, PASSWORD)} }`);
  lines.push("    spec:", "      containers:", "      - name: app");
  if (d.delivery === "env") lines.push("        envFrom:", "        - configMapRef: { name: app-config }", "        - secretRef: { name: db }");
  else lines.push("        volumeMounts:", `        - { name: config, mountPath: /etc/app${d.delivery === "subPath" ? "/app.env, subPath: app.env" : ""} }`);
  return lines;
}
