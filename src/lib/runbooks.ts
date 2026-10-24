// Three 3 a.m. pages handled by an engineer who joined last month. Each runbook quality
// changes a phase of the response: finding the doc, diagnosing, fixing, verifying. Time to
// mitigate is the sum of the phases; phase times are illustrative.

export type IncidentId = "queue" | "disk" | "cert";
export type Design = { linked: boolean; diagnose: boolean; automated: boolean; verify: boolean; current: boolean };

export const FIRST: Design = { linked: false, diagnose: false, automated: false, verify: false, current: false };
export const FIXED: Design = { linked: true, diagnose: true, automated: true, verify: true, current: true };

export const INCIDENTS: { id: IncidentId; title: string; alert: string; check: string; cause: string; wrongFix: string; fix: string; verify: string; fixMin: number; autoMin: number; undoMin: number }[] = [
  {
    id: "queue",
    title: "Orders queue backlog",
    alert: "OrdersQueueBacklog: 12,400 messages waiting",
    check: "kubectl -n orders get pods -l app=consumer   # one pod: 0 messages/min for 40 min",
    cause: "one consumer is stuck on a poison message and holds its partition",
    wrongFix: "scaling consumers to 20: the stuck partition still has one stuck reader",
    fix: "move the poison message to the dead-letter queue, restart that consumer",
    verify: "backlog falls by ~800/min; alert resolves",
    fixMin: 8,
    autoMin: 2,
    undoMin: 10,
  },
  {
    id: "disk",
    title: "Database disk 95% full",
    alert: "PostgresDiskAlmostFull: db-1 /var/lib/postgresql 95%",
    check: "du -sh pg_wal; check archive_command status   # WAL is 80% of the disk",
    cause: "WAL archiving to object storage has failed since a credential rotated, so WAL files pile up",
    wrongFix: "deleting old files in pg_wal to free space: the replica breaks and point-in-time recovery has a hole",
    fix: "restore the archive credential; WAL archives and Postgres recycles the files itself",
    verify: "archiver shows no failures; disk falls below 60%",
    fixMin: 15,
    autoMin: 4,
    undoMin: 90,
  },
  {
    id: "cert",
    title: "Internal API returning TLS errors",
    alert: "PaymentsClientTLSErrors: 100% handshake failures",
    check: "openssl s_client -connect payments.internal:443 | openssl x509 -noout -enddate   # expired 02:58",
    cause: "the internal CA's certificate for payments.internal expired; renewal was manual",
    wrongFix: "turning off certificate verification in the client: works, and now nothing checks who it talks to",
    fix: "issue a new certificate from the internal CA, reload the service, file a ticket to automate renewal",
    verify: "handshakes succeed; expiry is 90 days out",
    fixMin: 20,
    autoMin: 5,
    undoMin: 25,
  },
];

export type Phase = { name: string; minutes: number; note: string; bad?: boolean };

export function respond(id: IncidentId, d: Design) {
  const inc = INCIDENTS.find((x) => x.id === id)!;
  const phases: Phase[] = [];
  phases.push(d.linked ? { name: "Find the runbook", minutes: 1, note: "the alert links straight to it" } : { name: "Find the runbook", minutes: 14, note: "searching the wiki for the alert name finds three pages, two outdated" });
  let wrong = false;
  if (d.diagnose) phases.push({ name: "Diagnose", minutes: 6, note: `runs the check and sees the cause: ${inc.cause}` });
  else {
    wrong = true;
    phases.push({ name: "Diagnose", minutes: 3, note: `no checks listed, so they jump to the obvious fix: ${inc.wrongFix}`, bad: true });
  }
  if (!d.current) phases.push({ name: "Fix", minutes: 25 + inc.fixMin, note: "the commands name a host and a namespace renamed last quarter; they fail, and the senior engineer is woken up", bad: true });
  else phases.push({ name: "Fix", minutes: d.automated ? inc.autoMin : inc.fixMin, note: d.automated ? "one reviewed script, run from the runbook" : "types the commands one by one" });
  if (wrong) phases.push({ name: "Undo the wrong fix", minutes: inc.undoMin, note: "the obvious fix made it worse; the senior engineer cleans up", bad: true });
  phases.push(d.verify ? { name: "Verify", minutes: 5, note: `checks: ${inc.verify}` } : { name: "Verify", minutes: 0, note: "declares it fixed when the alert goes quiet; it fires again 40 minutes later", bad: true });
  if (!d.verify) phases.push({ name: "Reopened", minutes: 40, note: "back to bed, paged again", bad: true });
  const total = phases.reduce((a, p) => a + p.minutes, 0);
  const woke = !d.current || wrong;
  return { inc, phases, total, woke, harm: wrong ? inc.wrongFix : null };
}

export function scorecard(d: Design) {
  return INCIDENTS.map((i) => ({ i, ...respond(i.id, d) }));
}

export function runbookText(id: IncidentId, d: Design) {
  const inc = INCIDENTS.find((x) => x.id === id)!;
  const l = [`# ${inc.title}`, `Alert: ${inc.alert}`];
  if (d.diagnose) l.push("", "## Check first", `$ ${inc.check}`, "If that isn't what you see, stop and escalate.");
  l.push("", "## Fix", d.automated ? `$ ./runbooks/${inc.id}/mitigate.sh   # reviewed, idempotent` : `$ ${inc.fix}`);
  if (!d.current) l.push("# last edited 14 months ago");
  if (d.verify) l.push("", "## Verify", inc.verify, "If not, roll back and escalate.");
  return l;
}
