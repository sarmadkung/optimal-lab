// Durable workflows. 700 people start a 14-day trial over a week. Each trial is a
// long-running flow: a welcome email, wait up to 3 days for them to connect their data
// (or nudge them), a "trial ends soon" email on day 12, and the trial's end on day 14.
// Four deploys restart the workers over three weeks, and one database scan runs slow.
// The users, events and deploys are seeded; the three ways of running the flow and
// every email they send run here.

export const USERS = 700;
export const SIGNUPS_PER_DAY = 100;
export const DEPLOYS = [2.5, 6.2, 11.4, 16.8]; // days
export const SLOW_SCAN_DAY = 9; // the scan due at day 9 00:00 takes 75 minutes
export const HOUR = 1 / 24;

export type Impl = "sleep" | "cron" | "engine";
export type Design = { impl: Impl; lock: boolean; deterministic: boolean };
export const FIRST: Design = { impl: "sleep", lock: false, deterministic: false };
export const FIXED: Design = { impl: "engine", lock: true, deterministic: true };

export type Email = "welcome" | "nudge" | "ending" | "ended";
export const EMAILS: Email[] = ["welcome", "nudge", "ending", "ended"];
export const EMAIL_LABEL: Record<Email, string> = { welcome: "Welcome", nudge: "Connect your data (day 3)", ending: "Trial ends soon (day 12)", ended: "Trial ended (day 14)" };

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x6d2b79f5) >>> 0) / 2 ** 32);
}

export type User = { id: number; signup: number; connected: number | null };
export const POPULATION: User[] = (() => {
  const r = rng(11);
  return Array.from({ length: USERS }, (_, id) => {
    const signup = id / SIGNUPS_PER_DAY;
    const x = r();
    const connected = x < 0.6 ? signup + 0.1 + r() * 2.8 : x < 0.7 ? signup + 3.5 + r() * 6 : null;
    return { id, signup, connected };
  });
})();

// what should be sent, and when
export function due(u: User): { email: Email; at: number }[] {
  const out: { email: Email; at: number }[] = [{ email: "welcome", at: u.signup }];
  if (u.connected === null || u.connected > u.signup + 3) out.push({ email: "nudge", at: u.signup + 3 });
  out.push({ email: "ending", at: u.signup + 12 }, { email: "ended", at: u.signup + 14 });
  return out;
}

export type Sent = { email: Email; due: number; sentAt: number[] };

export function runUser(u: User, d: Design): Sent[] {
  const plan = due(u);
  if (d.impl === "sleep") {
    // the flow lives in a worker's memory; the first deploy after signup ends it
    const killed = DEPLOYS.find((t) => t > u.signup) ?? Infinity;
    return plan.map((p) => ({ email: p.email, due: p.at, sentAt: p.at < killed ? [p.at] : [] }));
  }
  if (d.impl === "cron") {
    // an hourly job scans a status table and sends what's due
    return plan.map((p) => {
      const run = Math.ceil(p.at / HOUR) * HOUR;
      const sentAt = [run];
      // the slow scan marks rows only when it finishes; the next scan sends them again
      if (!d.lock && Math.abs(run - SLOW_SCAN_DAY) < 1e-9) sentAt.push(run + HOUR);
      return { email: p.email, due: p.at, sentAt };
    });
  }
  // a workflow engine stores timers and events and replays history after a restart
  const stuckAt = d.deterministic ? Infinity : (DEPLOYS.find((t) => t > u.signup + 3 && t < u.signup + 14) ?? Infinity);
  return plan.map((p) => ({ email: p.email, due: p.at, sentAt: p.at < stuckAt ? [p.at] : [] }));
}

export function simulate(d: Design) {
  let missed = 0;
  let doubled = 0;
  let lateHours = 0;
  let sentCount = 0;
  let perfect = 0;
  let stuck = 0;
  const byEmail = Object.fromEntries(EMAILS.map((e) => [e, { due: 0, sent: 0, missed: 0, doubled: 0 }])) as Record<Email, { due: number; sent: number; missed: number; doubled: number }>;
  for (const u of POPULATION) {
    const s = runUser(u, d);
    let ok = true;
    for (const x of s) {
      byEmail[x.email].due++;
      if (!x.sentAt.length) {
        missed++;
        byEmail[x.email].missed++;
        ok = false;
        continue;
      }
      byEmail[x.email].sent++;
      sentCount += x.sentAt.length;
      lateHours += (x.sentAt[0] - x.due) * 24;
      if (x.sentAt.length > 1) {
        doubled++;
        byEmail[x.email].doubled++;
        ok = false;
      }
    }
    if (d.impl === "engine" && !d.deterministic && s.some((x) => !x.sentAt.length)) stuck++;
    if (ok) perfect++;
  }
  const delivered = sentCount;
  return { missed, doubled, perfect, stuck, avgLateMin: sentCount ? Math.round((lateHours / (sentCount - doubled)) * 60) : 0, delivered, byEmail };
}
