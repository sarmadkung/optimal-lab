// A platform team's week of interrupt-driven work, and what automating or eliminating each
// task costs to build and saves every week. Toil share is compared with the 50% cap the
// Google SRE book sets. Task counts, minutes and build hours are illustrative.

export type Choice = "manual" | "automate" | "eliminate";
export type TaskId = "deploy" | "restart" | "disk" | "cert" | "access" | "status" | "envs";
export type Design = Record<TaskId, Choice> & { switching: boolean };

export const TEAM_HOURS = 80; // two engineers
export const TOIL_CAP = 0.5;
export const SWITCH_MIN = 15; // getting back into real work after an interruption
export const QUARTER_WEEKS = 12;

export const TASKS: { id: TaskId; title: string; perWeek: number; minutes: number; automate?: { build: number; residual: number; how: string; impact?: string }; eliminate?: { build: number; how: string } }[] = [
  { id: "deploy", title: "Run a deploy by hand", perWeek: 30, minutes: 25, automate: { build: 40, residual: 0, how: "a CD pipeline deploys every merge" } },
  { id: "restart", title: "Restart the stuck worker", perWeek: 20, minutes: 10, automate: { build: 3, residual: 0, how: "a liveness probe restarts it", impact: "users still hit 20 hangs a week, each lasting until the probe restarts the worker" }, eliminate: { build: 14, how: "fix the connection leak that makes it hang" } },
  { id: "disk", title: "Clear a full disk", perWeek: 6, minutes: 20, automate: { build: 4, residual: 2, how: "log rotation plus an early warning" }, eliminate: { build: 10, how: "ship logs off the servers" } },
  { id: "cert", title: "Renew a certificate", perWeek: 0.25, minutes: 45, automate: { build: 6, residual: 0, how: "ACME renews them" } },
  { id: "access", title: "Grant database read access", perWeek: 12, minutes: 15, automate: { build: 16, residual: 1, how: "a request form; the data owner clicks approve" } },
  { id: "status", title: "Answer “is it down?”", perWeek: 25, minutes: 5, automate: { build: 8, residual: 0, how: "a status page from the SLO dashboards" } },
  { id: "envs", title: "Set up a new service's infrastructure", perWeek: 2, minutes: 180, automate: { build: 30, residual: 10, how: "a template that creates repo, pipeline and infra" } },
];

export const FIRST: Design = { deploy: "manual", restart: "manual", disk: "manual", cert: "manual", access: "manual", status: "manual", envs: "manual", switching: true };
export const FIXED: Design = { deploy: "automate", restart: "eliminate", disk: "eliminate", cert: "automate", access: "automate", status: "automate", envs: "automate", switching: true };

export function row(t: (typeof TASKS)[number], c: Choice, switching: boolean) {
  const sw = switching ? SWITCH_MIN : 0;
  const before = (t.perWeek * (t.minutes + sw)) / 60;
  let after = before;
  let build = 0;
  if (c === "automate" && t.automate) {
    after = (t.perWeek * (t.automate.residual + (t.automate.residual ? sw : 0))) / 60;
    build = t.automate.build;
  } else if (c === "eliminate" && t.eliminate) {
    after = 0;
    build = t.eliminate.build;
  }
  const saved = before - after;
  const impact = c === "automate" ? t.automate?.impact : undefined;
  return { before, after, build, saved, payback: saved > 0 ? build / saved : Infinity, impact };
}

export function week(d: Design) {
  const rows = TASKS.map((t) => ({ t, choice: d[t.id], ...row(t, d[t.id], d.switching) }));
  const toil = rows.reduce((a, r) => a + r.after, 0);
  const build = rows.reduce((a, r) => a + r.build, 0);
  const interrupts = rows.reduce((a, r) => a + (r.after > 0 ? r.t.perWeek : 0), 0);
  const quarterNet = rows.reduce((a, r) => a + r.saved * QUARTER_WEEKS - r.build, 0);
  return { rows, toil, share: toil / TEAM_HOURS, build, interrupts, quarterNet };
}

export const hours = (h: number) => (h < 10 ? h.toFixed(1) : Math.round(h).toString());
