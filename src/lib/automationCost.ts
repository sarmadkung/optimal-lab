// Controlling cost per run. A support workflow classifies each ticket and drafts a reply
// with a model, 400 tickets a day for 30 days. On day 12 a change makes the workflow
// update the ticket it was triggered by, which triggers it again. On day 20 a spam wave
// sends 6,000 junk tickets. Prices are illustrative; the runs, the loop, the controls
// and the bill are computed here.

export const DAYS = 30;
export const PER_DAY = 400;
export const SPAM_DAY = 20;
export const SPAM = 6000;
export const LOOP_DAY = 12;
export const LOOP_RUNS_PER_HOUR = 1800; // as fast as the runner can go
export const LOOP_HOURS = 16; // until someone notices the next morning
export const REPEAT_SHARE = 0.3; // tickets that ask an already-answered question
export const SPAM_SHARE = 0.05; // junk on a normal day

// dollars per million tokens: large and small model (illustrative list prices)
export const PRICE = { large: { in: 3, out: 15 }, small: { in: 0.8, out: 4 } };
export const CALLS = { classify: { in: 1500, out: 20 }, draft: { in: 3000, out: 400 } };

export type Design = { smallClassifier: boolean; skipJunk: boolean; cache: boolean; loopGuard: boolean; dailyCap: number | null };
export const FIRST: Design = { smallClassifier: false, skipJunk: false, cache: false, loopGuard: false, dailyCap: null };
export const FIXED: Design = { smallClassifier: true, skipJunk: true, cache: true, loopGuard: true, dailyCap: 60 };
export const CAPS = [null, 30, 60, 150];

const cost = (model: "large" | "small", c: { in: number; out: number }) => (c.in * PRICE[model].in + c.out * PRICE[model].out) / 1e6;
export const callCost = (model: "large" | "small", call: keyof typeof CALLS) => cost(model, CALLS[call]);

export function perRun(d: Design, kind: "real" | "junk" | "repeat" | "loop") {
  const classify = cost(d.smallClassifier ? "small" : "large", CALLS.classify);
  const draft = cost("large", CALLS.draft);
  if (kind === "junk" && d.skipJunk) return classify;
  if (kind === "repeat" && d.cache) return classify;
  return classify + draft;
}

export type Day = { day: number; tickets: number; runs: number; spend: number; capped: number; customersHeld: number; note: string | null };

export function simulate(d: Design) {
  const days: Day[] = [];
  for (let day = 1; day <= DAYS; day++) {
    const junk = Math.round(PER_DAY * SPAM_SHARE) + (day === SPAM_DAY ? SPAM : 0);
    const repeat = Math.round((PER_DAY - Math.round(PER_DAY * SPAM_SHARE)) * REPEAT_SHARE);
    const real = PER_DAY - Math.round(PER_DAY * SPAM_SHARE) - repeat;
    const loop = day === LOOP_DAY && !d.loopGuard ? LOOP_RUNS_PER_HOUR * LOOP_HOURS : 0;
    // arrivals are interleaved, so a cap stops every kind of run in proportion
    const kinds = [
      { kind: "real" as const, n: real },
      { kind: "repeat" as const, n: repeat },
      { kind: "junk" as const, n: junk },
      { kind: "loop" as const, n: loop },
    ];
    const uncapped = kinds.reduce((t, k) => t + k.n * perRun(d, k.kind), 0);
    const share = d.dailyCap !== null && uncapped > d.dailyCap ? d.dailyCap / uncapped : 1;
    const spend = uncapped * share;
    const runs = Math.round(kinds.reduce((t, k) => t + k.n, 0) * share);
    const capped = kinds.reduce((t, k) => t + k.n, 0) - runs;
    const customersHeld = Math.round((real + repeat) * (1 - share));
    const note = day === LOOP_DAY ? (d.loopGuard ? "loop guard ignores the workflow's own updates" : `loop: ${loop.toLocaleString("en-US")} extra runs`) : day === SPAM_DAY ? `${SPAM.toLocaleString("en-US")} spam tickets` : null;
    days.push({ day, tickets: real + repeat + junk, runs, spend, capped, customersHeld, note });
  }
  const total = days.reduce((a, x) => a + x.spend, 0);
  const worst = days.reduce((a, x) => (x.spend > a.spend ? x : a), days[0]);
  const normal = days.find((x) => x.day === 1)!;
  // the cap doesn't know which runs matter: real customers wait too
  return { days, total, worst, normalDay: normal.spend, perTicket: normal.spend / normal.tickets, capped: days.reduce((a, x) => a + x.capped, 0), customersHeld: days.reduce((a, x) => a + x.customersHeld, 0) };
}
