// What it takes a team to get a new service to its first production deploy, as a task graph.
// Each task is a ticket to another team or a self-service call through the platform; the
// time to first deploy is the graph's critical path (longest chain of dependencies).
// Durations are illustrative.

export type Design = { selfInfra: boolean; template: boolean; autoNet: boolean; defaults: boolean; catalog: boolean };
export const FIRST: Design = { selfInfra: false, template: false, autoNet: false, defaults: false, catalog: false };
export const FIXED: Design = { selfInfra: true, template: true, autoNet: true, defaults: true, catalog: true };

type Task = { id: string; title: string; deps: string[]; team: string; manualDays: number; platformDays: number; via: keyof Design | null; how: string };

export const TASKS: Task[] = [
  { id: "repo", title: "Create the repository", deps: [], team: "you", manualDays: 0.5, platformDays: 0.02, via: "template", how: "the template creates it" },
  { id: "ci", title: "Set up CI and the image build", deps: ["repo"], team: "you", manualDays: 2, platformDays: 0, via: "template", how: "comes with the template" },
  { id: "ns", title: "Namespace, quotas and access", deps: [], team: "platform team", manualDays: 3, platformDays: 0.01, via: "selfInfra", how: "requested in the portal" },
  { id: "db", title: "A Postgres database", deps: [], team: "DBAs", manualDays: 8, platformDays: 0.02, via: "selfInfra", how: "a database claim, provisioned in minutes" },
  { id: "secrets", title: "Credentials in the secret store", deps: ["db"], team: "security", manualDays: 3, platformDays: 0, via: "selfInfra", how: "written by the database provisioner" },
  { id: "dns", title: "DNS name and TLS certificate", deps: ["ns"], team: "network team", manualDays: 6, platformDays: 0, via: "autoNet", how: "created from the ingress automatically" },
  { id: "obs", title: "Dashboards and alerts", deps: ["ci"], team: "you", manualDays: 2, platformDays: 0, via: "defaults", how: "standard dashboards and SLO alerts for every service" },
  { id: "deploy", title: "First production deploy", deps: ["ci", "ns", "secrets", "dns", "obs"], team: "you", manualDays: 0.5, platformDays: 0.1, via: null, how: "merge to main" },
];

export function days(t: Task, d: Design) {
  if (t.via === null) return d.template ? t.platformDays : t.manualDays;
  return d[t.via] ? t.platformDays : t.manualDays;
}

// Longest path through the dependency graph (tasks without dependencies start at once).
export function schedule(d: Design) {
  const finish = new Map<string, number>();
  const start = new Map<string, number>();
  const visit = (id: string): number => {
    if (finish.has(id)) return finish.get(id)!;
    const t = TASKS.find((x) => x.id === id)!;
    const s = Math.max(0, ...t.deps.map(visit));
    start.set(id, s);
    finish.set(id, s + days(t, d));
    return finish.get(id)!;
  };
  TASKS.forEach((t) => visit(t.id));
  const total = finish.get("deploy")!;
  // Walk back along the tasks that set each start time.
  const critical: string[] = [];
  let cur: string | undefined = "deploy";
  while (cur) {
    critical.unshift(cur);
    const t: Task = TASKS.find((x) => x.id === cur)!;
    cur = t.deps.find((dep) => Math.abs(finish.get(dep)! - start.get(t.id)!) < 1e-9);
  }
  const tickets = TASKS.filter((t) => t.team !== "you" && days(t, d) === t.manualDays);
  return { total, start, finish, critical, tickets, teams: new Set(tickets.map((t) => t.team)).size };
}

export const OWNER_LOOKUP = { without: 45, with: 2 }; // minutes to find who owns a failing service at 3 a.m.

export const fmtDays = (n: number) => (n < 1 ? `${Math.max(1, Math.round(n * 8 * 60))} min` : `${Math.round(n * 10) / 10} days`);
