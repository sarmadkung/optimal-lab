// A Postgres database defined for dev, staging and production, either copied into each
// environment or written once as a module. Plans are computed by comparing the addresses
// and attributes in state with what the configuration now declares, the way terraform
// plan does: same address and changed attributes → update, new address → create, gone →
// destroy, unless a moved block maps the old address to the new one.

export type Reuse = "copy" | "module";
export type Pin = "main" | "tag";
export type Env = "dev" | "staging" | "prod";
export type Design = { reuse: Reuse; validate: boolean; pin: Pin; moved: boolean };
export type EventId = "protect" | "typo" | "rename";

export const FIRST: Design = { reuse: "copy", validate: false, pin: "main", moved: false };
export const FIXED: Design = { reuse: "module", validate: true, pin: "tag", moved: true };
export const ENVS: Env[] = ["dev", "staging", "prod"];
export const CLASSES = ["db.t3.micro", "db.t3.small", "db.t3.medium", "db.r6g.large"];

export const EVENTS: { id: EventId; title: string; step: number }[] = [
  { id: "protect", title: "Turn on deletion protection everywhere", step: 0 },
  { id: "typo", title: "Someone sets instance_class = \"db.t3.mega\"", step: 1 },
  { id: "rename", title: "Module v2 renames the database resource", step: 3 },
];

type Resource = { address: string; attrs: Record<string, string> };

// What each module version declares, for one environment.
export function declared(version: "1.0" | "1.1" | "2.0", env: Env, d: Design): Resource[] {
  const prefix = d.reuse === "module" ? "module.db." : "";
  const db = version === "2.0" ? "main" : "this";
  const cls = env === "prod" ? "db.r6g.large" : env === "staging" ? "db.t3.medium" : "db.t3.micro";
  return [
    { address: `${prefix}aws_db_subnet_group.this`, attrs: { name: `${env}-db` } },
    { address: `${prefix}aws_security_group.db`, attrs: { ingress: "5432 from app subnets" } },
    { address: `${prefix}aws_db_instance.${db}`, attrs: { instance_class: cls, deletion_protection: version === "1.0" ? "false" : "true" } },
  ];
}

export type PlanLine = { action: "create" | "update" | "destroy" | "move" | "no-op"; address: string; detail?: string };

export function plan(state: Resource[], want: Resource[], moved: Record<string, string> = {}): PlanLine[] {
  const lines: PlanLine[] = [];
  const st = new Map(state.map((r) => [r.address, r]));
  for (const [from, to] of Object.entries(moved)) {
    if (st.has(from) && !st.has(to)) {
      st.set(to, { ...st.get(from)!, address: to });
      st.delete(from);
      lines.push({ action: "move", address: to, detail: `${from} has moved to ${to}` });
    }
  }
  for (const w of want) {
    const cur = st.get(w.address);
    if (!cur) lines.push({ action: "create", address: w.address });
    else {
      const changed = Object.keys(w.attrs).filter((k) => cur.attrs[k] !== w.attrs[k]);
      lines.push(changed.length ? { action: "update", address: w.address, detail: changed.map((k) => `${k}: ${cur.attrs[k]} → ${w.attrs[k]}`).join(", ") } : { action: "no-op", address: w.address });
    }
  }
  for (const a of st.keys()) if (!want.some((w) => w.address === a)) lines.push({ action: "destroy", address: a });
  return lines;
}

export const summary = (p: PlanLine[]) => {
  const n = (a: PlanLine["action"]) => p.filter((l) => l.action === a).length;
  return `${n("create")} to add, ${n("update")} to change, ${n("destroy")} to destroy${n("move") ? `, ${n("move")} moved` : ""}`;
};

export function judge(e: EventId, d: Design) {
  const mod = d.reuse === "module";
  if (e === "protect") {
    if (!mod) {
      // Three copies: the fix lands in dev and staging; prod's copy is missed.
      const plans = ENVS.map((env) => ({ env, plan: env === "prod" ? plan(declared("1.0", env, d), declared("1.0", env, d)) : plan(declared("1.0", env, d), declared("1.1", env, d)) }));
      return { ok: false, text: "the fix is made in three copies; prod's copy is missed and its database can still be deleted", plans, edits: 3 };
    }
    const plans = ENVS.map((env) => ({ env, plan: plan(declared("1.0", env, d), declared("1.1", env, d)) }));
    return { ok: true, text: d.pin === "tag" ? "one change to the module, released as v1.1; each environment bumps its ref and applies an in-place update" : "one change to the module; every environment picks it up on its next apply", plans, edits: 1 };
  }
  if (e === "typo") {
    const plans: { env: Env; plan: PlanLine[] }[] = [];
    if (d.validate && mod) return { ok: true, text: `terraform plan fails in a second: instance_class must be one of ${CLASSES.join(", ")}`, plans, edits: 0 };
    return { ok: false, text: "the plan passes; apply fails about ten minutes later when the cloud API rejects db.t3.mega, with part of the change already made", plans, edits: 0 };
  }
  // v2 renames aws_db_instance.this to .main. Unpinned environments get it on their next run.
  const want = declared("2.0", "prod", d);
  const before = declared("1.1", "prod", d);
  const prefix = mod ? "module.db." : "";
  const p = plan(before, want, d.moved && mod ? { [`${prefix}aws_db_instance.this`]: `${prefix}aws_db_instance.main` } : {});
  const destroys = p.some((l) => l.action === "destroy");
  const plans = [{ env: "prod" as Env, plan: p }];
  if (!mod) return { ok: true, text: "copies don't share upgrades, so nothing changes, and nothing gets the refactor either", plans: [], edits: 0 };
  if (!destroys) return { ok: true, text: "the moved block maps the old address to the new one: production's plan has nothing to destroy", plans, edits: 0 };
  if (d.pin === "tag") return { ok: true, text: "production stays on v1.1 until someone bumps the ref; that plan shows destroy and create on the database, and nobody approves it", plans, edits: 0 };
  return { ok: false, text: "ref=main pulls v2 into production's next apply: the plan destroys the database and creates an empty one, in a routine-looking pipeline run", plans, edits: 0 };
}

export function scorecard(d: Design) {
  return EVENTS.map((x) => ({ event: x, ...judge(x.id, d) }));
}

export function moduleBlock(d: Design) {
  if (d.reuse === "copy") return ["# envs/prod/main.tf (and a copy in dev/ and staging/)", 'resource "aws_db_instance" "this" {', '  instance_class      = "db.r6g.large"', "  deletion_protection = false", "  …", "}"];
  return [
    'module "db" {',
    `  source         = "git::https://git.example.com/modules/postgres.git?ref=${d.pin === "tag" ? "v1.1.0" : "main"}"`,
    '  name           = "prod-db"',
    '  instance_class = "db.r6g.large"',
    "}",
    ...(d.validate ? ["", "# modules/postgres/variables.tf", 'variable "instance_class" {', "  validation {", `    condition = contains([${CLASSES.map((c) => `"${c}"`).join(", ")}], var.instance_class)`, "  }", "}"] : []),
    ...(d.moved ? ["", "# modules/postgres/moved.tf (v2)", "moved {", "  from = aws_db_instance.this", "  to   = aws_db_instance.main", "}"] : []),
  ];
}
