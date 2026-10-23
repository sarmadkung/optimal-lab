// Showing sources and confidence in an HR policy assistant. Six hundred synthetic
// answers, each with the model's own confidence and whether it was right, drawn so the
// model is overconfident (as reported for models stating their own confidence). The
// first 400 calibrate, the last 200 test. Calibration, the error measure and the
// reader's check-or-act counts all really run.

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Answer = { raw: number; correct: boolean };
const all: Answer[] = (() => {
  const r = mulberry32(11);
  return Array.from({ length: 600 }, () => {
    const raw = 0.6 + 0.39 * Math.sqrt(r()); // models mostly say they are very sure
    const p = 0.5 + 0.38 * ((raw - 0.6) / 0.39); // says 95%, right about 85% of the time
    return { raw, correct: r() < p };
  });
})();
export const CALIBRATION = all.slice(0, 400);
export const TEST = all.slice(400);

export const BINS = [0.6, 0.7, 0.8, 0.9, 1.0];
const binOf = (x: number) => Math.min(BINS.length - 2, Math.max(0, Math.floor((x - 0.6) / 0.1)));

// Histogram binning: within each band of stated confidence, the share that was actually right.
export const BIN_ACCURACY = BINS.slice(0, -1).map((lo, i) => {
  const inBin = CALIBRATION.filter((a) => binOf(a.raw) === i);
  return { lo, hi: BINS[i + 1], n: inBin.length, acc: inBin.filter((a) => a.correct).length / Math.max(1, inBin.length) };
});
export const calibrated = (raw: number) => BIN_ACCURACY[binOf(raw)].acc;

// Expected calibration error: the gap between stated and actual accuracy, weighted by how many answers say it.
export function ece(set: Answer[], conf: (a: Answer) => number) {
  let total = 0;
  for (let i = 0; i < BINS.length - 1; i++) {
    const inBin = set.filter((a) => binOf(a.raw) === i);
    if (!inBin.length) continue;
    const said = inBin.reduce((s, a) => s + conf(a), 0) / inBin.length;
    const right = inBin.filter((a) => a.correct).length / inBin.length;
    total += (inBin.length / set.length) * Math.abs(said - right);
  }
  return total;
}

export type Display = "none" | "raw" | "calibrated";
export const DISPLAYS: { id: Display; label: string; one: string }[] = [
  { id: "none", label: "No signal", one: "Every answer looks equally sure." },
  { id: "raw", label: "Model's own confidence", one: "The confidence the model states, as High (80%+), Medium (70%+) or Low." },
  { id: "calibrated", label: "Calibrated confidence", one: "The model's confidence mapped to how often answers like it were right: High (80%+ right), Medium (60%+) or Low." },
];

export type Level = "High" | "Medium" | "Low";
export function level(d: Display, raw: number): Level | null {
  if (d === "none") return null;
  const c = d === "raw" ? raw : calibrated(raw);
  return d === "raw" ? (c >= 0.8 ? "High" : c >= 0.7 ? "Medium" : "Low") : c >= 0.8 ? "High" : c >= 0.6 ? "Medium" : "Low";
}

// A reader who acts on High answers (or on everything, with no signal) and checks the rest in the policy itself.
export const CHECK_MIN = { withSource: 0.5, without: 4 }; // minutes to check one answer: open the cited passage, or search the handbook
export function readers(d: Display, sources: boolean, set: Answer[] = TEST) {
  const rows = set.map((a) => ({ a, lvl: level(d, a.raw) }));
  const checked = rows.filter((x) => x.lvl !== null && x.lvl !== "High");
  const acted = rows.filter((x) => x.lvl === null || x.lvl === "High");
  const wrongActed = acted.filter((x) => !x.a.correct).length;
  const caught = checked.filter((x) => !x.a.correct).length;
  const minutes = checked.length * (sources ? CHECK_MIN.withSource : CHECK_MIN.without);
  return { total: set.length, wrong: set.filter((a) => !a.correct).length, acted: acted.length, checked: checked.length, wrongActed, caught, wastedChecks: checked.length - caught, minutes };
}

// Six of the answers, written out, for the answer card.
export const SAMPLES = [
  { q: "How many days of parental leave do I get?", a: "You get 26 weeks of paid parental leave, taken within the first year.", raw: 0.96, correct: true, source: "Parental leave §2.1: “Employees receive 26 weeks of paid parental leave, to be taken within 12 months of the birth or adoption.”" },
  { q: "Can I carry unused holiday into next year?", a: "Yes, up to 10 days can be carried over and must be used by 31 March.", raw: 0.93, correct: false, source: "Holiday §4.3: “Up to 5 days may be carried over and must be taken by 31 March.”" },
  { q: "Is a home-office chair reimbursable?", a: "Yes, up to £250 once every three years, with a receipt.", raw: 0.88, correct: true, source: "Remote work §6: “A chair or desk up to £250 every three years is reimbursable on receipt.”" },
  { q: "Do I need approval to work abroad for a month?", a: "No approval is needed for stays under 90 days.", raw: 0.84, correct: false, source: "Remote work §8: “Any work from outside the UK requires prior approval from HR and your manager.”" },
  { q: "What's the notice period after probation?", a: "One month, rising to three months after five years.", raw: 0.74, correct: true, source: "Contracts §3: “Notice is one month after probation and three months after five years of service.”" },
  { q: "Are gym memberships covered?", a: "Yes, the wellbeing allowance covers gyms up to £40 a month.", raw: 0.66, correct: false, source: "Benefits §5: “The wellbeing allowance of £300 a year may be used for gyms, classes or equipment.”" },
];
