// Three rate limiters given the same traffic: "10 requests per 10 seconds per client".
//   Fixed window   one counter per window; it resets on the boundary.
//   Sliding window two counters, weighted by how much of the last window still overlaps
//                  (Cloudflare's approximation: prev × (1 − elapsed/window) + current).
//   Token bucket   up to 10 tokens, refilled at 1 per second; each request spends one.
// The interesting case is a burst that straddles a window boundary: a fixed window lets
// through twice the limit in two seconds.

export const LIMIT = 10;
export const WINDOW = 10; // seconds
export const SECONDS = 30;

export type Algo = "fixed" | "sliding" | "bucket";

export const ALGOS: { id: Algo; name: string; how: string }[] = [
  { id: "fixed", name: "Fixed window", how: "Count per 10-second window. Reset to 0 on the boundary." },
  { id: "sliding", name: "Sliding window", how: "This window's count plus the overlapping part of the last one." },
  { id: "bucket", name: "Token bucket", how: "10 tokens, +1 each second. A request spends a token." },
];

export type Pattern = { id: string; label: string; arrivals: number[] };

const zeros = () => Array.from({ length: SECONDS }, () => 0);

export const PATTERNS: Pattern[] = [
  {
    id: "boundary",
    label: "Burst across a boundary",
    arrivals: (() => {
      const a = zeros();
      a[2] = 2;
      a[9] = 10; // last second of window 1
      a[10] = 10; // first second of window 2
      a[20] = 3;
      return a;
    })(),
  },
  { id: "steady", label: "Steady, 1 per second", arrivals: zeros().map(() => 1) },
  {
    id: "spiky",
    label: "Spikes every 7 seconds",
    arrivals: zeros().map((_, i) => (i % 7 === 3 ? 8 : 0)),
  },
];

export type Second = { t: number; arrived: number; allowed: number; rejected: number; state: number };

export type Run = { seconds: Second[]; allowed: number; rejected: number; /** most requests let through in any 10-second span */ peak: number };

export function simulate(algo: Algo, arrivals: number[]): Run {
  const seconds: Second[] = [];
  let tokens = LIMIT;
  const counts: Record<number, number> = {}; // window index → allowed count
  for (let t = 0; t < arrivals.length; t++) {
    const w = Math.floor(t / WINDOW);
    if (algo === "bucket" && t > 0) tokens = Math.min(LIMIT, tokens + 1);
    let allowed = 0;
    for (let r = 0; r < arrivals[t]; r++) {
      let ok: boolean;
      if (algo === "fixed") ok = (counts[w] ?? 0) < LIMIT;
      else if (algo === "sliding") {
        const elapsed = (t % WINDOW) / WINDOW;
        const estimate = (counts[w - 1] ?? 0) * (1 - elapsed) + (counts[w] ?? 0);
        ok = estimate < LIMIT;
      } else ok = tokens >= 1;
      if (ok) {
        allowed++;
        counts[w] = (counts[w] ?? 0) + 1;
        if (algo === "bucket") tokens--;
      }
    }
    const elapsed = (t % WINDOW) / WINDOW;
    const state =
      algo === "fixed" ? (counts[w] ?? 0) : algo === "sliding" ? Math.round(((counts[w - 1] ?? 0) * (1 - elapsed) + (counts[w] ?? 0)) * 10) / 10 : tokens;
    seconds.push({ t, arrived: arrivals[t], allowed, rejected: arrivals[t] - allowed, state });
  }
  let peak = 0;
  for (let s = 0; s + WINDOW <= seconds.length; s++) peak = Math.max(peak, seconds.slice(s, s + WINDOW).reduce((sum, x) => sum + x.allowed, 0));
  return {
    seconds,
    allowed: seconds.reduce((s, x) => s + x.allowed, 0),
    rejected: seconds.reduce((s, x) => s + x.rejected, 0),
    peak,
  };
}
