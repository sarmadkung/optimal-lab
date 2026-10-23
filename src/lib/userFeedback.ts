// Collecting user feedback for an AI reply drafter. Two prompt versions, A and B; B's
// drafts are truly a little better. Sessions are synthetic and seeded: each draft has a
// hidden quality, and people click thumbs, regenerate, edit or abandon at rates that
// depend on it. Edit distance, coverage, correlation and the significance tests really run.

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Quality = "good" | "ok" | "bad";
export type Session = { v: "A" | "B"; q: Quality; thumb: 1 | -1 | 0; regen: boolean; sent: boolean; edit: number | null };

const MIX = { A: { good: 0.55, ok: 0.3 }, B: { good: 0.62, ok: 0.28 } };
const P = {
  up: { good: 0.015, ok: 0.005, bad: 0 },
  down: { good: 0, ok: 0.005, bad: 0.06 },
  regen: { good: 0.03, ok: 0.12, bad: 0.35 },
  sent: { good: 0.97, ok: 0.9, bad: 0.55 },
  edit: { good: [0.05, 0.04], ok: [0.25, 0.1], bad: [0.6, 0.15] },
};
export const MAX_N = 5000;

export const SESSIONS: Session[] = (() => {
  const r = mulberry32(42);
  const gauss = () => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());
  const out: Session[] = [];
  for (let i = 0; i < MAX_N * 2; i++) {
    const v = i % 2 ? "B" : "A";
    const u = r();
    const q: Quality = u < MIX[v].good ? "good" : u < MIX[v].good + MIX[v].ok ? "ok" : "bad";
    const t = r();
    const thumb = t < P.up[q] ? 1 : t < P.up[q] + P.down[q] ? -1 : 0;
    const regen = r() < P.regen[q];
    const sent = r() < P.sent[q];
    const [m, s] = P.edit[q];
    const edit = sent ? Math.max(0, Math.min(1, m + s * gauss())) : null;
    out.push({ v, q, thumb, regen, sent, edit });
  }
  return out;
})();

export type Signal = "thumbs" | "edit" | "regen" | "abandon";
export const SIGNALS: { id: Signal; label: string; one: string }[] = [
  { id: "thumbs", label: "Thumbs", one: "Up or down, when people bother to click." },
  { id: "edit", label: "Edits before sending", one: "How much of the draft people changed, as a share of its words." },
  { id: "regen", label: "Regenerate", one: "People asked for a different draft." },
  { id: "abandon", label: "Abandon", one: "People closed the draft without sending anything." },
];
const value = (s: Session, k: Signal): number | null =>
  k === "thumbs" ? (s.thumb === 0 ? null : s.thumb) : k === "edit" ? s.edit : k === "regen" ? (s.regen ? 1 : 0) : s.sent ? 0 : 1;
const qualityNum = (q: Quality) => (q === "good" ? 1 : q === "ok" ? 0.5 : 0);
const higherIsBetter: Record<Signal, boolean> = { thumbs: true, edit: false, regen: false, abandon: false };

function mean(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
}
function variance(xs: number[]) {
  const m = mean(xs);
  return xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, xs.length - 1);
}
function corr(a: number[], b: number[]) {
  const ma = mean(a);
  const mb = mean(b);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return num / Math.sqrt(da * db || 1);
}
// Two-sided p-value of a z statistic.
function pValue(z: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return 2 * p;
}

// For n sessions per version: how often the signal shows up, how well it tracks real quality, and whether it can tell A from B.
export function analyse(k: Signal, n: number) {
  const use = SESSIONS.filter((s, i) => Math.floor(i / 2) < n);
  const withSignal = use.filter((s) => value(s, k) !== null);
  const coverage = withSignal.length / use.length;
  const quality = corr(
    withSignal.map((s) => value(s, k)!),
    withSignal.map((s) => qualityNum(s.q)),
  );
  const a = withSignal.filter((s) => s.v === "A").map((s) => value(s, k)!);
  const b = withSignal.filter((s) => s.v === "B").map((s) => value(s, k)!);
  const se = Math.sqrt(variance(a) / Math.max(1, a.length) + variance(b) / Math.max(1, b.length));
  const z = se > 0 ? (mean(b) - mean(a)) / se : 0;
  const p = a.length > 2 && b.length > 2 ? pValue(z) : 1;
  const bBetter = higherIsBetter[k] ? mean(b) > mean(a) : mean(b) < mean(a);
  return { coverage, quality: higherIsBetter[k] ? quality : -quality, a: mean(a), b: mean(b), nA: a.length, nB: b.length, p, detected: p < 0.05 && bBetter };
}

export const TRUE_GOOD = { A: MIX.A.good, B: MIX.B.good };

// Word-level edit distance between the draft and what was sent, for the examples.
export function editRatio(draft: string, sent: string) {
  const x = draft.split(/\s+/).filter(Boolean);
  const y = sent.split(/\s+/).filter(Boolean);
  const d = Array.from({ length: x.length + 1 }, (_, i) => [i, ...new Array<number>(y.length).fill(0)]);
  for (let j = 1; j <= y.length; j++) d[0][j] = j;
  for (let i = 1; i <= x.length; i++) for (let j = 1; j <= y.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
  return { distance: d[x.length][y.length], ratio: d[x.length][y.length] / Math.max(x.length, y.length) };
}

export const EXAMPLES = [
  { draft: "Thanks for flagging this. I've refunded the duplicate charge; it should reach your card in 5 to 7 business days.", sent: "Thanks for flagging this. I've refunded the duplicate charge; it should reach your card in 5 to 7 business days." },
  { draft: "Thanks for reaching out. Unfortunately we can't change the invoice once it has been issued.", sent: "Thanks for reaching out. We can reissue the invoice with your new VAT number today." },
  { draft: "We apologise for any inconvenience this may have caused and appreciate your patience.", sent: "Sorry about that. The export bug is fixed in today's release; could you try again?" },
];
