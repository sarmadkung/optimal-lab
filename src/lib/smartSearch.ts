// Case study: smart search for a marketplace at scale. Twenty million listings,
// 200 queries a second at peak, a 300 ms budget for the search API. Index memory,
// node count, the latency waterfall and the monthly bill are computed from the choices;
// component latencies, prices and relevance scores are typical, illustrative figures.

export const PRODUCTS = 20_000_000;
export const PEAK_QPS = 200;
export const AVG_QPS = 50;
export const BUDGET_MS = 300;
const QUERIES_PER_MONTH = AVG_QPS * 3600 * 24 * 30;

export type Dims = 384 | 768 | 1536;
export const DIMS: Dims[] = [384, 768, 1536];
export type Quant = "float32" | "int8";
export type Embed = "api" | "self";
export type Rewrite = "off" | "live" | "offline";
export type Design = { dims: Dims; quant: Quant; embed: Embed; rerank: boolean; rewrite: Rewrite; fallback: boolean };

export const NODE = { ramGB: 64, usable: 0.7, perMonth: 600 };
export const GPU_PER_MONTH = 1500;

export function indexGB(d: Pick<Design, "dims" | "quant">) {
  const bytes = d.quant === "int8" ? 1 : 4;
  const vectors = PRODUCTS * d.dims * bytes;
  const graph = PRODUCTS * 32 * 2 * 4; // HNSW links: about 32 neighbours per layer-0 node, two-way, 4 bytes each
  return (vectors + graph) / 1e9;
}

export function plan(d: Design) {
  const gb = indexGB(d);
  const shards = Math.max(1, Math.ceil(gb / (NODE.ramGB * NODE.usable)));
  const nodes = shards * 2; // two replicas of each shard, for failover and peak load
  const steps = [
    { id: "parse", label: "parse + filters", ms: 3 },
    ...(d.rewrite === "live" ? [{ id: "rewrite", label: "LLM rewrites the query", ms: 650 }] : d.rewrite === "offline" ? [{ id: "rewrite", label: "look up a precomputed rewrite", ms: 2 }] : []),
    { id: "embed", label: d.embed === "api" ? "embed via API" : "embed on own CPU", ms: d.embed === "api" ? 70 : 9 },
    { id: "search", label: "vector + keyword, in parallel", ms: (d.quant === "int8" ? 8 : 12) + (d.dims === 1536 ? 6 : d.dims === 384 ? -3 : 0) + (shards > 1 ? 4 : 0) },
    { id: "fuse", label: "merge the two lists", ms: 2 },
    ...(d.rerank ? [{ id: "rerank", label: "rerank top 50 on GPU", ms: 85 }] : []),
    { id: "fetch", label: "fetch product cards", ms: 20 },
  ];
  const p95 = steps.reduce((s, x) => s + x.ms, 0);
  const embedApi = d.embed === "api" ? (QUERIES_PER_MONTH * 12 * 0.02) / 1e6 : 0;
  const rewriteCost = d.rewrite === "live" ? (QUERIES_PER_MONTH * 250 * 0.15) / 1e6 : d.rewrite === "offline" ? 40 : 0;
  const cost = {
    index: nodes * NODE.perMonth,
    embed: d.embed === "api" ? embedApi : 2 * NODE.perMonth * 0.5, // a share of two CPU nodes
    rerank: d.rerank ? 2 * GPU_PER_MONTH : 0,
    rewrite: rewriteCost,
  };
  const ndcg = 0.63 + (d.dims === 384 ? -0.02 : d.dims === 1536 ? 0.01 : 0) + (d.quant === "int8" ? -0.005 : 0) + (d.rerank ? 0.07 : 0) + (d.rewrite !== "off" ? 0.02 : 0);
  return { gb, shards, nodes, steps, p95, fits: p95 <= BUDGET_MS, cost, total: Object.values(cost).reduce((a, b) => a + b, 0), ndcg };
}

// When the vector side is down: keyword only, or an error page.
export const KEYWORD_ONLY_NDCG = 0.52;

export const START: Design = { dims: 1536, quant: "float32", embed: "api", rerank: false, rewrite: "live", fallback: false };
export const GOOD: Design = { dims: 768, quant: "int8", embed: "self", rerank: true, rewrite: "offline", fallback: true };
