// One hour of a checkout service, minute by minute, generated as individual requests
// (seeded, so it's the same every time). At minute 30 the database connection pool runs
// out: a slice of requests waits seconds for a connection and some time out. Panels are
// computed from the raw requests: means, real percentiles, rates and saturation.

export type Incident = "pool" | "deploy" | "spike";
export type Design = { percentiles: boolean; perEndpoint: boolean; errorRate: boolean; saturation: "cpu" | "pool" };

export const FIRST: Design = { percentiles: false, perEndpoint: false, errorRate: false, saturation: "cpu" };
export const FIXED: Design = { percentiles: true, perEndpoint: true, errorRate: true, saturation: "pool" };
export const MINUTES = 60;
export const START = 30;
export const ENDPOINTS = ["/checkout", "/products", "/cart"] as const;

export const INCIDENTS: { id: Incident; title: string }[] = [
  { id: "pool", title: "The DB connection pool runs out" },
  { id: "deploy", title: "A deploy breaks /checkout" },
  { id: "spike", title: "A marketing email doubles traffic" },
];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export type Req = { min: number; ep: (typeof ENDPOINTS)[number]; ms: number; error: boolean };

export function generate(inc: Incident): { reqs: Req[]; cpu: number[]; pool: number[]; rpm: number[] } {
  const r = rng(inc === "pool" ? 7 : inc === "deploy" ? 11 : 13);
  const reqs: Req[] = [];
  const cpu: number[] = [];
  const pool: number[] = [];
  const rpm: number[] = [];
  for (let m = 0; m < MINUTES; m++) {
    const after = m >= START;
    const n = inc === "spike" && after ? 600 : 300;
    rpm.push(n);
    let used = 0;
    for (let i = 0; i < n; i++) {
      const ep = ENDPOINTS[i % 6 === 0 ? 0 : i % 2 === 0 ? 1 : 2];
      let ms = 40 + 80 * -Math.log(1 - r() * 0.98); // a long-ish tail, mean ~120 ms
      let error = r() < 0.002;
      if (after && inc === "pool" && ep === "/checkout" && r() < 0.35) {
        ms += 2500 + r() * 2500; // waiting for a connection
        error = ms > 4500; // the client gives up at 4.5 s
      }
      if (after && inc === "deploy" && ep === "/checkout") error = r() < 0.4;
      if (after && inc === "spike") ms *= 1.6;
      used += ms;
      reqs.push({ min: m, ep, ms: Math.round(ms), error });
    }
    cpu.push(Math.round((inc === "spike" && after ? 78 : 42) + r() * 6));
    pool.push(Math.min(100, Math.round(inc === "pool" && after ? 100 : inc === "spike" && after ? 71 : 35 + r() * 8 + used / 1e5)));
  }
  return { reqs, cpu, pool, rpm };
}

export function percentile(xs: number[], p: number) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)];
}
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export type Series = { label: string; unit: string; values: number[]; threshold?: number };

export function panels(inc: Incident, d: Design) {
  const g = generate(inc);
  const byMin = (f: (rs: Req[]) => number, ep?: string) => Array.from({ length: MINUTES }, (_, m) => f(g.reqs.filter((q) => q.min === m && (!ep || q.ep === ep))));
  const latency: Series[] = d.percentiles
    ? (d.perEndpoint ? ENDPOINTS : ([undefined] as const)).map((ep) => ({ label: `p99 latency${ep ? ` ${ep}` : ""}`, unit: "ms", values: byMin((rs) => percentile(rs.map((q) => q.ms), 99), ep), threshold: 1000 }))
    : [{ label: "average latency", unit: "ms", values: byMin((rs) => Math.round(mean(rs.map((q) => q.ms)))), threshold: 1000 }];
  const traffic: Series = { label: "requests per minute", unit: "rpm", values: g.rpm };
  const errors: Series[] = d.errorRate
    ? (d.perEndpoint ? ENDPOINTS : ([undefined] as const)).map((ep) => ({ label: `error rate${ep ? ` ${ep}` : ""}`, unit: "%", values: byMin((rs) => Math.round((rs.filter((q) => q.error).length / Math.max(1, rs.length)) * 1000) / 10, ep), threshold: 1 }))
    : [{ label: "errors (total since start)", unit: "", values: byMin((rs) => rs.filter((q) => q.error).length).map((_, i, a) => a.slice(0, i + 1).reduce((x, y) => x + y, 0)) }];
  const saturation: Series = d.saturation === "pool" ? { label: "DB pool in use", unit: "%", values: g.pool, threshold: 90 } : { label: "average CPU", unit: "%", values: g.cpu, threshold: 80 };
  return { latency, traffic, errors, saturation, g };
}

// Can someone answer these correctly from the panels? The truth comes from the raw requests.
export function questions(inc: Incident, d: Design) {
  const p = panels(inc, d);
  const after = (s: Series) => mean(s.values.slice(START));
  const before = (s: Series) => mean(s.values.slice(0, START));
  const truthHurting = ENDPOINTS.some((ep) => {
    const rs = p.g.reqs.filter((q) => q.min >= START && q.ep === ep);
    return percentile(rs.map((q) => q.ms), 99) > 1000 || rs.filter((q) => q.error).length / rs.length > 0.01;
  });
  const shownHurting = [...p.latency, ...p.errors].some((s) => s.threshold !== undefined && after(s) > s.threshold);
  const stepped = [...p.latency, ...(d.errorRate ? p.errors : []), p.saturation].some((s) => after(s) > Math.max(1, before(s)) * 1.5);
  const what = inc === "pool" ? d.saturation === "pool" : inc === "spike" ? true : d.errorRate;
  return [
    {
      q: "Are users hurting right now?",
      ok: shownHurting === truthHurting,
      why: shownHurting === truthHurting ? (truthHurting ? `a panel crosses its line from minute ${START}` : "no: slower, but every line stays under its threshold") : "the dashboard says no; the slowest requests and failures say yes",
    },
    { q: "When did it change?", ok: stepped, why: stepped ? `there's a clear step at minute ${START}` : "a running total only bends; there's no edge to point at" },
    { q: "Everyone, or one endpoint?", ok: d.perEndpoint, why: d.perEndpoint ? (inc === "spike" ? "every endpoint slows together" : "only /checkout moves") : "every endpoint is averaged into one line" },
    { q: "What's running out?", ok: what, why: what ? (inc === "pool" ? "the connection pool is pinned at 100%" : inc === "spike" ? "traffic doubled, and CPU and the pool rose with it" : "nothing: resources are flat, so it's errors from the new code") : inc === "pool" ? "CPU looks fine; the pool, which is full, isn't on the dashboard" : "without error rates, nothing points at the deploy" },
  ];
}
