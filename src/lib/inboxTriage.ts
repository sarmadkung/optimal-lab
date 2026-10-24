// Case study: triage a shared inbox into Slack. ops@ gets about 600 emails a day. A
// workflow filters out machine mail, has a model score each email for urgency, and posts
// the urgent ones to #ops. The day's emails and the model's scores are seeded and
// illustrative; the rules, the threshold, threading, quiet hours, the feedback loop,
// the counts and the cost run here.

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x6d2b79f5) >>> 0) / 2 ** 32);
}

export type Kind = "urgent" | "reply" | "fyi" | "machine";
export const KIND_LABEL: Record<Kind, string> = { urgent: "urgent", reply: "needs a reply", fyi: "FYI", machine: "newsletters, alerts, receipts" };
export type Mail = { id: number; thread: number; hour: number; kind: Kind; score: number; autoHeader: boolean };

export const PER_DAY = 600;
export const PRICE_PER_CALL = 0.0021; // one scoring call, illustrative
export const SLACK_LOOK_MIN = 4; // minutes someone spends on each post

// a day of mail: urgent threads get several replies, machine mail carries its headers
export const DAY: Mail[] = (() => {
  const r = rng(5);
  const out: Mail[] = [];
  let thread = 0;
  let id = 0;
  while (out.length < PER_DAY) {
    const x = r();
    const kind: Kind = x < 0.035 ? "urgent" : x < 0.25 ? "reply" : x < 0.45 ? "fyi" : "machine";
    const messages = kind === "urgent" ? 3 + Math.floor(r() * 4) : kind === "reply" ? 1 + Math.floor(r() * 2) : 1;
    const hour = Math.floor(r() * 24);
    thread++;
    // the model's urgency score for the thread: high for most urgent ones, but some
    // urgent mail sounds calm, and some ordinary mail sounds alarming
    const base = kind === "urgent" ? 0.35 + r() * 0.65 : kind === "reply" ? r() * 0.75 : kind === "fyi" ? r() * 0.5 : r() * 0.65;
    const auto = kind === "machine" && r() < 0.85;
    for (let m = 0; m < messages && out.length < PER_DAY; m++) {
      const score = Math.min(1, Math.max(0, base + (r() - 0.5) * 0.1));
      out.push({ id: ++id, thread, hour: Math.min(23, hour + m), kind, score: Math.round(score * 100) / 100, autoHeader: auto });
    }
  }
  return out;
})();

export type Design = { prefilter: boolean; threshold: number; perThread: boolean; quietHours: boolean; feedback: boolean };
export const FIRST: Design = { prefilter: false, threshold: 0.5, perThread: false, quietHours: false, feedback: false };
export const FIXED: Design = { prefilter: true, threshold: 0.4, perThread: true, quietHours: false, feedback: true };
export const THRESHOLDS = [0.4, 0.5, 0.6, 0.7, 0.8];
export const PAGE_AT = 0.7; // at night, only this sure gets a page
export const NIGHT = (h: number) => h < 7 || h >= 22;

// a month of 👍/👎 on posts: ten examples in the prompt sharpen the scores a little
const sharpen = (m: Mail) => (m.kind === "urgent" ? Math.min(1, m.score + 0.05) : Math.max(0, m.score - 0.08));

export function triage(d: Design) {
  const scored = DAY.filter((m) => !(d.prefilter && m.autoHeader));
  const score = (m: Mail) => (d.feedback ? sharpen(m) : m.score);
  const flagged = scored.filter((m) => score(m) >= d.threshold);
  const urgentThreads = new Set(DAY.filter((m) => m.kind === "urgent").map((m) => m.thread));
  const caughtThreads = new Set(flagged.filter((m) => m.kind === "urgent").map((m) => m.thread));

  // posts: one per flagged message, or one per thread (later messages go in the thread)
  const posts = d.perThread ? new Set(flagged.map((m) => m.thread)).size : flagged.length;
  const falsePosts = d.perThread ? new Set(flagged.filter((m) => m.kind !== "urgent").map((m) => m.thread)).size : flagged.filter((m) => m.kind !== "urgent").length;
  // at night, quiet hours page only for the most certain; the rest wait for 7:00
  const night = flagged.filter((m) => NIGHT(m.hour) && (!d.quietHours || score(m) >= PAGE_AT));
  const nightPages = new Set(night.map((m) => (d.perThread ? m.thread : m.id))).size;
  const heldTillMorning = d.quietHours ? new Set(flagged.filter((m) => NIGHT(m.hour) && m.kind === "urgent" && score(m) < PAGE_AT).map((m) => m.thread)).size : 0;

  return {
    scoredCalls: scored.length,
    cost: scored.length * PRICE_PER_CALL * 30,
    urgentThreads: urgentThreads.size,
    caught: caughtThreads.size,
    missed: urgentThreads.size - caughtThreads.size,
    posts,
    falsePosts,
    nightPages,
    heldTillMorning,
    minutesLooking: posts * SLACK_LOOK_MIN,
    machineFiltered: d.prefilter ? DAY.filter((m) => m.autoHeader).length : 0,
  };
}

// the threshold sweep the reader sees: caught urgent threads and posts at each threshold
export function sweep(d: Design) {
  return THRESHOLDS.map((t) => ({ t, ...triage({ ...d, threshold: t }) }));
}
