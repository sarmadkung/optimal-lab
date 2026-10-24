// Monitoring runs and failures. An invoice workflow runs 12 times an hour for a week.
// Four things go wrong, and most of them never raise an error: a revoked token makes
// every run "succeed" with zero invoices, the scheduler dies, a run hangs and blocks the
// rest, and a parser bug fails one supplier's invoices. A vendor blip and stray
// transient failures add noise. Which rules notice what, how soon, and how many alerts
// they send all run here; how long customers take to complain is an assumption.

export const HOURS = 168;
export const RUNS_PER_HOUR = 12;

export type IncidentId = "blip" | "empty" | "scheduler" | "stuck" | "parser";
export type Incident = {
  id: IncidentId;
  label: string;
  start: number; // hour of the week
  silent: boolean; // no failed runs at all
  failRate: number; // share of runs that fail while it lasts
  affected: number; // share of invoices delayed while it lasts
  heals?: number; // hours until it fixes itself
  complaint: number | null; // hours until a person notices without monitoring
};

export const INCIDENTS: Incident[] = [
  { id: "blip", label: "Vendor API returns 500 for 40 minutes", start: 34, silent: false, failRate: 1, affected: 0, heals: 0.67, complaint: null },
  { id: "empty", label: "Token revoked: every run succeeds with 0 invoices", start: 62, silent: true, failRate: 0, affected: 1, complaint: 48 },
  { id: "stuck", label: "A run hangs on a call with no timeout and blocks the rest", start: 80, silent: true, failRate: 0, affected: 1, complaint: 6 },
  { id: "scheduler", label: "The scheduler doesn't come back after a reboot", start: 98, silent: true, failRate: 0, affected: 1, complaint: 20 },
  { id: "parser", label: "One supplier's new format fails 1 run in 5", start: 129, silent: false, failRate: 0.2, affected: 0.2, complaint: 24 },
];
export const TRANSIENT_FAILURES = 25; // single failed runs spread over the week, retried fine

export type Design = { history: boolean; onFailure: "none" | "every" | "rate"; zeroItems: boolean; heartbeat: boolean };
export const FIRST: Design = { history: false, onFailure: "none", zeroItems: false, heartbeat: false };
export const FIXED: Design = { history: true, onFailure: "rate", zeroItems: true, heartbeat: true };

export const RATE = 0.1; // alert when more than 10% of an hour's runs fail
export const DIAGNOSE = { history: 0.25, blind: 2 }; // hours to find where it broke
export const FIX = 0.5;

export type Seen = { incident: Incident; by: string | null; detectAt: number | null; resolvedAt: number | null; hours: number; delayed: number };

export function detect(i: Incident, d: Design): { by: string | null; after: number | null } {
  const rules: { by: string; after: number }[] = [];
  if (!i.silent && d.onFailure === "every") rules.push({ by: "an email for the failed run", after: 0.1 });
  if (!i.silent && d.onFailure === "rate" && i.failRate > RATE) rules.push({ by: `failure rate over ${RATE * 100}% for the hour`, after: 1 });
  if (i.id === "empty" && d.zeroItems) rules.push({ by: "zero invoices processed for 2 hours", after: 2 });
  if (i.id === "scheduler" && d.heartbeat) rules.push({ by: "no run finished in 30 minutes", after: 0.5 });
  if (i.id === "stuck" && d.heartbeat) rules.push({ by: "a run older than 30 minutes", after: 0.5 });
  rules.sort((a, b) => a.after - b.after);
  if (rules.length) return rules[0];
  if (i.complaint !== null) return { by: null, after: i.complaint };
  return { by: null, after: null };
}

export function runAll(d: Design) {
  const seen: Seen[] = INCIDENTS.map((i) => {
    const det = detect(i, d);
    if (i.heals !== undefined) {
      return { incident: i, by: det.by, detectAt: det.after !== null && det.after <= i.heals ? i.start + det.after : null, resolvedAt: i.start + i.heals, hours: i.heals, delayed: 0 };
    }
    const fixAfter = det.after === null ? HOURS - i.start : det.after + (d.history ? DIAGNOSE.history : DIAGNOSE.blind) + FIX;
    const hours = Math.min(fixAfter, HOURS - i.start);
    return { incident: i, by: det.by, detectAt: det.after === null ? null : i.start + det.after, resolvedAt: i.start + hours, hours, delayed: Math.round(hours * RUNS_PER_HOUR * i.affected) };
  });
  const real = seen.filter((s) => s.incident.heals === undefined);
  // alerts sent over the week
  const failedRuns = TRANSIENT_FAILURES + seen.reduce((a, s) => a + Math.round(s.hours * RUNS_PER_HOUR * s.incident.failRate), 0);
  const alerts =
    (d.onFailure === "every" ? failedRuns : 0) +
    (d.onFailure === "rate" ? seen.filter((s) => s.incident.failRate > RATE).length : 0) +
    seen.filter((s) => s.by && s.incident.silent).length;
  const actionable = real.filter((s) => s.by).length;
  return {
    seen,
    caught: actionable,
    incidents: real.length,
    outageHours: Math.round(real.reduce((a, s) => a + s.hours, 0) * 10) / 10,
    delayed: real.reduce((a, s) => a + s.delayed, 0),
    alerts,
    failedRuns,
  };
}
