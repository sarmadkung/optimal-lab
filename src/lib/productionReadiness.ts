// From prototype to production. A "summarize this document" feature worked on ten
// hand-picked inputs in the demo. A thousand real requests are generated from a
// seeded mix of what production sends: long pastes, other languages, rate limits,
// server errors, slow tails, broken output and repeats. Every request then really runs
// through whichever safeguards are on.

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const normal = (r: () => number) => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());

export const CONTEXT_LIMIT = 32_000;
export const ABANDON_S = 30; // users give up waiting after this
export const PRICE = { inPerM: 1, outPerM: 4 };
const OUT_TOKENS = 300;

export type Req = {
  id: number;
  tokens: number;
  english: boolean;
  repeatOf: number | null;
  attempts: { status: 200 | 429 | 500; latency: number }[]; // what the provider would do on each try
  badOutput: boolean;
  repairOk: boolean;
};

export const DEMO: Req[] = Array.from({ length: 10 }, (_, i) => ({ id: i, tokens: 900 + i * 120, english: true, repeatOf: null, attempts: [{ status: 200, latency: 2 + (i % 4) * 0.3 }], badOutput: false, repairOk: true }));

export const TRAFFIC: Req[] = (() => {
  const r = mulberry32(21);
  const out: Req[] = [];
  for (let id = 0; id < 1000; id++) {
    if (id > 20 && r() < 0.18) {
      const of = Math.floor(r() * id);
      out.push({ ...out[of], id, repeatOf: of });
      continue;
    }
    const longPaste = r() < 0.025;
    const tokens = longPaste ? Math.round(40_000 + r() * 80_000) : Math.round(Math.exp(Math.log(1500) + 0.9 * normal(r)));
    const attempts = [0, 1, 2, 3].map((k) => {
      const u = r();
      const status: 200 | 429 | 500 = u < (k === 0 ? 0.03 : 0.12) ? 429 : u < (k === 0 ? 0.04 : 0.14) ? 500 : 200;
      const slow = r() < 0.03;
      const latency = Math.exp(Math.log(2.4) + 0.45 * normal(r)) * (slow ? 9 : 1);
      return { status, latency: Math.round(latency * 10) / 10 };
    });
    out.push({ id, tokens, english: r() > 0.12, repeatOf: null, attempts, badOutput: r() < 0.04, repairOk: r() < 0.9 });
  }
  return out;
})();

export type Guards = { input: boolean; provider: boolean; output: boolean; cache: boolean };
export const GUARD_LIST: { id: keyof Guards; label: string }[] = [
  { id: "input", label: "Guard the input" },
  { id: "provider", label: "Time out, retry, fall back" },
  { id: "output", label: "Validate the output" },
  { id: "cache", label: "Cache repeats" },
];
export type Fail = "tooLong" | "language" | "rateLimit" | "serverError" | "tooSlow" | "badOutput";
export const FAIL_LABEL: Record<Fail, string> = {
  tooLong: "input over the context limit",
  language: "answered in English to a non-English user",
  rateLimit: "429 rate limited",
  serverError: "500 from the provider",
  tooSlow: `over ${ABANDON_S} s, user left`,
  badOutput: "broken output shown",
};

const TIMEOUT_S = 12;
const BACKOFF = [1, 2, 4];

export function runOne(q: Req, g: Guards, cached: Set<number>) {
  if (g.cache && q.repeatOf !== null && cached.has(q.repeatOf)) return { ok: true as const, latency: 0.05, cost: 0, fail: null, cache: true };
  if (q.tokens > CONTEXT_LIMIT && !g.input) return { ok: false as const, latency: 0.5, cost: 0, fail: "tooLong" as Fail, cache: false };
  if (!q.english && !g.input) return { ok: false as const, latency: q.attempts[0].latency, cost: cost(q.tokens), fail: "language" as Fail, cache: false };
  // a long paste is summarized in chunks first: more tokens, one more round trip
  const chunked = q.tokens > CONTEXT_LIMIT;
  let latency = chunked ? 3 : 0;
  let spent = chunked ? cost(q.tokens) : 0;
  const tries = g.provider ? q.attempts.length : 1;
  let done = false;
  let fail: Fail | null = null;
  for (let k = 0; k < tries; k++) {
    const a = q.attempts[k];
    const waited = g.provider ? Math.min(a.latency, TIMEOUT_S) : a.latency;
    latency += waited;
    if (g.provider && a.latency > TIMEOUT_S) {
      fail = "tooSlow";
      latency += BACKOFF[Math.min(k, 2)];
      continue; // gave up on this attempt; try again
    }
    if (a.status !== 200) {
      fail = a.status === 429 ? "rateLimit" : "serverError";
      if (g.provider) latency += BACKOFF[Math.min(k, 2)];
      continue;
    }
    spent += cost(chunked ? 6000 : q.tokens);
    done = true;
    fail = null;
    break;
  }
  if (!done && g.provider) {
    // the last resort: a second provider, a little slower
    latency += 3.5;
    spent += cost(chunked ? 6000 : q.tokens);
    done = true;
    fail = null;
  }
  if (!done) return { ok: false as const, latency, cost: spent, fail, cache: false };
  if (latency > ABANDON_S) return { ok: false as const, latency, cost: spent, fail: "tooSlow" as Fail, cache: false };
  if (q.badOutput) {
    if (!g.output) return { ok: false as const, latency, cost: spent, fail: "badOutput" as Fail, cache: false };
    latency += q.attempts[0].latency;
    spent += cost(q.tokens);
    if (!q.repairOk) return { ok: false as const, latency, cost: spent, fail: "badOutput" as Fail, cache: false };
  }
  return { ok: true as const, latency, cost: spent, fail: null, cache: false };
}

function cost(tokensIn: number) {
  return (tokensIn * PRICE.inPerM + OUT_TOKENS * PRICE.outPerM) / 1e6;
}

const pct = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};

export function run(reqs: Req[], g: Guards) {
  const cached = new Set<number>();
  const rows = reqs.map((q) => {
    const x = runOne(q, g, cached);
    if (x.ok) cached.add(q.repeatOf ?? q.id);
    return { q, ...x };
  });
  const fails = Object.fromEntries(Object.keys(FAIL_LABEL).map((k) => [k, rows.filter((x) => x.fail === k).length])) as Record<Fail, number>;
  const lat = rows.map((x) => x.latency);
  return {
    rows,
    ok: rows.filter((x) => x.ok).length,
    total: rows.length,
    fails,
    p50: pct(lat, 0.5),
    p95: pct(lat, 0.95),
    costPer1k: (rows.reduce((s, x) => s + x.cost, 0) / rows.length) * 1000,
    cacheHits: rows.filter((x) => x.cache).length,
  };
}

export const NO_GUARDS: Guards = { input: false, provider: false, output: false, cache: false };
export const STATS = {
  longPastes: TRAFFIC.filter((q) => q.tokens > CONTEXT_LIMIT).length,
  nonEnglish: TRAFFIC.filter((q) => !q.english).length,
  repeats: TRAFFIC.filter((q) => q.repeatOf !== null).length,
  firstTryErrors: TRAFFIC.filter((q) => q.attempts[0].status !== 200).length,
  slow: TRAFFIC.filter((q) => q.attempts[0].latency > TIMEOUT_S).length,
  badOutput: TRAFFIC.filter((q) => q.badOutput).length,
};
export { TIMEOUT_S };
