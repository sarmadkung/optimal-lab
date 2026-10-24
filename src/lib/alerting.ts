// A 30-day month of one service, minute by minute: error rate, CPU and disk, with two real
// incidents and the usual noise. Alert rules run over the series: static thresholds on causes
// or symptoms, or the multiwindow burn-rate alerts from the Google SRE workbook (14.4× over
// 1 h and 5 min; 6× over 6 h and 30 min) against a 99.9% SLO. Then routing and escalation.

export type Signal = "causes" | "symptoms";
export type Design = { signal: Signal; burn: boolean; grouping: boolean; owner: boolean; escalate: boolean };

export const FIRST: Design = { signal: "causes", burn: false, grouping: false, owner: false, escalate: false };
export const FIXED: Design = { signal: "symptoms", burn: true, grouping: true, owner: true, escalate: true };

export const SLO = 0.999;
export const BUDGET = 1 - SLO;
export const DAYS = 30;
export const MIN = DAYS * 24 * 60;
export const PODS = 12;
const at = (day: number, h: number, m = 0) => (day - 1) * 1440 + h * 60 + m;

export const OUTAGE = { start: at(20, 3, 10), len: 25, rate: 0.25 }; // a bad config push, 3 a.m.
export const SLOW = { start: at(12, 9, 0), len: 14 * 60, rate: 0.007 }; // a dependency failing a few calls
export const BLIP = { start: at(5, 15, 0), len: 3, rate: 0.04 };

export function series() {
  const err = new Float64Array(MIN).fill(0.0002);
  const cpu = new Float64Array(MIN).fill(45);
  const disk = new Float64Array(MIN);
  for (let d = 1; d <= DAYS; d++) for (let m = 0; m < 20; m++) cpu[at(d, 2, m)] = 95; // nightly batch job
  for (const e of [OUTAGE, SLOW, BLIP]) for (let m = 0; m < e.len; m++) err[e.start + m] = e.rate;
  for (let m = 0; m < MIN; m++) disk[m] = 60 + ((m % (7 * 1440)) / (7 * 1440)) * 35; // log disk fills weekly, rotated on Sundays
  return { err, cpu, disk };
}

// Average error rate over the trailing window ending at minute t.
function windowed(err: Float64Array) {
  const pre = new Float64Array(MIN + 1);
  for (let i = 0; i < MIN; i++) pre[i + 1] = pre[i] + err[i];
  return (t: number, w: number) => (pre[t + 1] - pre[Math.max(0, t + 1 - w)]) / Math.min(w, t + 1);
}

export type Fired = { rule: string; start: number; impact: boolean; incident?: "outage" | "slow" };

function episodes(cond: (t: number) => boolean, rule: string, impactAt: (t: number) => Fired["incident"] | undefined, minGap = 30): Fired[] {
  const out: Fired[] = [];
  let lastEnd = -Infinity;
  let on = false;
  for (let t = 0; t < MIN; t++) {
    const c = cond(t);
    if (c && !on && t - lastEnd > minGap) {
      const inc = impactAt(t);
      out.push({ rule, start: t, impact: !!inc, incident: inc });
    }
    if (!c && on) lastEnd = t;
    on = c;
  }
  return out;
}

export function evaluate(d: Design) {
  const s = series();
  const w = windowed(s.err);
  const inside = (t: number, e: { start: number; len: number }) => t >= e.start && t < e.start + e.len + 60;
  const impact = (t: number): Fired["incident"] => (inside(t, OUTAGE) ? "outage" : inside(t, SLOW) ? "slow" : undefined);
  let fired: Fired[] = [];
  if (d.signal === "causes") {
    fired = [...episodes((t) => s.cpu[t] > 80, "CPU > 80% for 1 min", impact), ...episodes((t) => s.disk[t] > 90, "log disk > 90%", impact, 60 * 12)];
  } else if (!d.burn) {
    fired = episodes((t) => w(t, 5) > 0.01, "5-minute error rate > 1%", impact);
  } else {
    const fast = (t: number) => w(t, 60) > 14.4 * BUDGET && w(t, 5) > 14.4 * BUDGET;
    const slow = (t: number) => w(t, 360) > 6 * BUDGET && w(t, 30) > 6 * BUDGET;
    fired = [...episodes(fast, "fast burn: 14.4× over 1 h and 5 min", impact), ...episodes((t) => slow(t) && !fast(t), "slow burn: 6× over 6 h and 30 min", impact, 360)];
  }
  // Without grouping, each of the 12 pods fires its own copy; the log disk is one server.
  const copies = (f: Fired) => (d.grouping || f.rule.startsWith("log disk") ? 1 : PODS);
  const pages = fired.reduce((a, f) => a + copies(f), 0);
  const noise = fired.filter((f) => !f.impact).reduce((a, f) => a + copies(f), 0);
  const firstFor = (k: "outage" | "slow") => fired.find((f) => f.incident === k);
  const detect = (k: "outage" | "slow", e: { start: number }) => {
    const f = firstFor(k);
    return f ? f.start - e.start : null;
  };
  // Acknowledgement: the owning team knows the service; central on-call has to find them.
  // At 3 a.m. the primary sleeps through it; escalation pages the secondary after 10 minutes.
  const ack = (k: "outage" | "slow") => {
    const dt = detect(k, k === "outage" ? OUTAGE : SLOW);
    if (dt === null) return null;
    const night = k === "outage";
    return dt + (night ? (d.escalate ? 10 : 45) : 4) + (d.owner ? 2 : 20);
  };
  const used = Array.from(s.err).reduce((a, x) => a + x, 0) / MIN / BUDGET;
  return {
    fired,
    pages,
    noise,
    outage: { detect: detect("outage", OUTAGE), ack: ack("outage") },
    slow: { detect: detect("slow", SLOW), ack: ack("slow") },
    budgetUsed: used,
    w,
  };
}

export const fmtMin = (m: number | null) => (m === null ? "never paged" : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`);
