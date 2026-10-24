// Triggers: what starts a workflow, and starting it exactly once. An hour of changes in a
// CRM, with our endpoint down for six minutes, two deals that change twice within
// minutes, and a provider that sometimes delivers a webhook twice. The events are
// seeded; polling, delivery, retries and deduplication really run on them.

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const OUTAGE: [number, number] = [20, 26]; // minutes past 10:00 when our endpoint is down
export const POLL_EVERY = 5;
export type Ev = { id: string; deal: string; at: number; change: string; deliveredTwice: boolean };

export const EVENTS: Ev[] = (() => {
  const r = mulberry32(12);
  const out: Ev[] = [];
  let n = 0;
  const add = (deal: string, at: number, change: string, twice = false) => out.push({ id: `evt_${++n}`, deal, at: Math.round(at * 10) / 10, change, deliveredTwice: twice });
  for (let i = 0; i < 20; i++) add(`D-${100 + i}`, 1 + r() * 57, r() < 0.5 ? "stage changed" : "amount changed", i === 4 || i === 13);
  // two deals change twice inside one polling window
  add("D-200", 32.2, "stage → Won");
  add("D-200", 33.9, "stage → Lost");
  add("D-201", 51.1, "owner → Ana");
  add("D-201", 52.0, "owner → Ben");
  // one event whose webhook we answer too slowly, so the provider sends it again
  add("D-202", 41.5, "stage → Won", true);
  return out.sort((a, b) => a.at - b.at);
})();

export type Kind = "poll" | "webhook" | "retries";
export const KINDS: { id: Kind; label: string; one: string }[] = [
  { id: "poll", label: "Poll every 5 min", one: "Every 5 minutes, ask the CRM for deals changed since the last successful poll. It returns each deal's current state." },
  { id: "webhook", label: "Webhook, no retries", one: "The CRM calls our URL the moment something changes. If we're down, that call is lost." },
  { id: "retries", label: "Webhook with retries", one: "The CRM calls our URL, and retries with backoff (1, 2, 4, 8 minutes…) until we answer 200." },
];

const down = (t: number) => t >= OUTAGE[0] && t < OUTAGE[1];
export type Run = { ev: Ev; at: number; dup: boolean };

export function simulate(kind: Kind, dedupe: boolean) {
  const runs: Run[] = [];
  const missed: { ev: Ev; why: string }[] = [];
  let calls = 0;
  if (kind === "poll") {
    let since = 0;
    for (let t = POLL_EVERY; t <= 60; t += POLL_EVERY) {
      calls++;
      if (down(t)) continue; // the poll fails; the cursor stays where it was
      const changed = EVENTS.filter((e) => e.at > since && e.at <= t);
      const latest = new Map<string, Ev>();
      for (const e of changed) latest.set(e.deal, e);
      for (const e of changed) {
        if (latest.get(e.deal) === e) runs.push({ ev: e, at: t, dup: false });
        else missed.push({ ev: e, why: "overwritten before the next poll" });
      }
      since = t;
    }
  } else {
    for (const e of EVENTS) {
      const attempts: number[] = [];
      let t = e.at + 0.02;
      let wait = 1;
      while (down(t)) {
        calls++;
        if (kind === "webhook") break;
        t = e.at + wait;
        wait *= 2;
      }
      if (down(t)) {
        missed.push({ ev: e, why: "delivered while we were down" });
        continue;
      }
      attempts.push(t);
      if (e.deliveredTwice) attempts.push(t + 0.3);
      attempts.forEach((a, i) => runs.push({ ev: e, at: a, dup: i > 0 }));
      calls += attempts.length;
    }
  }
  const seen = new Set<string>();
  const started = runs
    .sort((a, b) => a.at - b.at)
    .filter((r) => {
      if (!dedupe) return true;
      if (seen.has(r.ev.id)) return false;
      seen.add(r.ev.id);
      return true;
    });
  const delays = started.filter((r) => !r.dup).map((r) => r.at - r.ev.at);
  return {
    started,
    missed,
    duplicates: started.filter((r) => r.dup).length,
    avgDelayMin: delays.reduce((a, b) => a + b, 0) / Math.max(1, delays.length),
    maxDelayMin: Math.max(0, ...delays),
    calls,
  };
}
