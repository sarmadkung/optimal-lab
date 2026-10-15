// One transformer block, small enough to follow by hand (pre-norm, as in GPT-2 and Llama):
//
//   h   = x + Attention(LayerNorm(x))      tokens look at each other
//   out = h + FeedForward(LayerNorm(h))    each token is processed on its own
//
// The "+ x" and "+ h" are residual connections: each sub-layer only adds a change to a running
// vector (the residual stream) instead of replacing it. Stack blocks without them and the
// tokens blur into one another: Dong et al. 2021, "Attention is not all you need: pure
// attention loses rank doubly exponentially with depth".
//
// Here d = 4, one attention head with identity projections (query = key = value = the
// normalized vector), and a hand-set feed-forward layer 4 → 16 → 4 with ReLU. Real models
// learn every one of these matrices and give each layer its own weights.

export type Vec = number[];

export const TOKENS = ["The", "cat", "sat", "down"];
export const D = 4;
export const HIDDEN = 16; // feed-forward width: 4 × d, as in GPT-2

// Input vectors (embedding + position), as they come out of the embedding step.
export const INPUT: Vec[] = [
  [0.2, -0.1, 1.0, 0.1],
  [1.1, 0.3, -0.2, 0.4],
  [-0.3, 1.0, 0.4, -0.6],
  [0.1, 0.6, -0.8, 0.9],
];

// A fixed, deterministic pseudo-random generator so every reader sees the same weights.
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32 - 0.5;
  };
}
const rand = seeded(7);
const matrix = (rows: number, cols: number, scale: number) =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => rand() * scale));

export const W1 = matrix(HIDDEN, D, 1.6); // expand: 4 → 16
export const W2 = matrix(D, HIDDEN, 0.7); // project back: 16 → 4

const mean = (v: Vec) => v.reduce((s, x) => s + x, 0) / v.length;
const dot = (a: Vec, b: Vec) => a.reduce((s, x, i) => s + x * b[i], 0);
const add = (a: Vec, b: Vec) => a.map((x, i) => x + b[i]);
const mul = (m: number[][], v: Vec) => m.map((row) => dot(row, v));
const relu = (x: number) => Math.max(0, x);

/** LayerNorm with no learned scale or shift: mean 0, spread 1 for every token. */
export function layerNorm(v: Vec): Vec {
  const m = mean(v);
  const variance = mean(v.map((x) => (x - m) ** 2));
  return v.map((x) => (x - m) / Math.sqrt(variance + 1e-5));
}

/** Causal self-attention, one head: each token blends itself and the tokens before it. */
export function attention(xs: Vec[]): { out: Vec[]; weights: number[][] } {
  const weights = xs.map((q, i) => {
    const scores = xs.map((k, j) => (j <= i ? dot(q, k) / Math.sqrt(D) : -Infinity));
    const max = Math.max(...scores);
    const exps = scores.map((s) => (s === -Infinity ? 0 : Math.exp(s - max)));
    const total = exps.reduce((s, x) => s + x, 0);
    return exps.map((e) => e / total);
  });
  const out = weights.map((w) => xs[0].map((_, d) => w.reduce((s, wj, j) => s + wj * xs[j][d], 0)));
  return { out, weights };
}

export function feedForward(v: Vec): { hidden: Vec; out: Vec } {
  const hidden = mul(W1, v).map(relu);
  return { hidden, out: mul(W2, hidden) };
}

export type BlockTrace = {
  input: Vec[];
  norm1: Vec[];
  attn: Vec[];
  weights: number[][];
  mid: Vec[]; // after the first residual add (or just attn, without residuals)
  norm2: Vec[];
  hidden: Vec[]; // the 16-wide layer inside the feed-forward, after ReLU
  ffn: Vec[];
  output: Vec[];
};

export function block(xs: Vec[], residual: boolean): BlockTrace {
  const norm1 = xs.map(layerNorm);
  const { out: attn, weights } = attention(norm1);
  const mid = residual ? xs.map((x, i) => add(x, attn[i])) : attn;
  const norm2 = mid.map(layerNorm);
  const ff = norm2.map(feedForward);
  const ffn = ff.map((f) => f.out);
  const output = residual ? mid.map((h, i) => add(h, ffn[i])) : ffn;
  return { input: xs, norm1, attn, weights, mid, norm2, hidden: ff.map((f) => f.hidden), ffn, output };
}

/** Run the same block `layers` times. Returns one trace per layer. */
export function stack(layers: number, residual: boolean): BlockTrace[] {
  const traces: BlockTrace[] = [];
  let xs = INPUT;
  for (let l = 0; l < layers; l++) {
    const t = block(xs, residual);
    traces.push(t);
    xs = t.output;
  }
  return traces;
}

export const cosine = (a: Vec, b: Vec) => {
  const n = Math.sqrt(dot(a, a) * dot(b, b));
  return n === 0 ? 0 : dot(a, b) / n;
};

/**
 * How alike the tokens are, from 0 (unrelated) to 1 (the same direction), measured after
 * centering each dimension across tokens: what is left is what tells the tokens apart.
 */
export function sameness(xs: Vec[]) {
  const centre = xs[0].map((_, d) => mean(xs.map((x) => x[d])));
  const spread = Math.sqrt(mean(xs.map((x) => mean(x.map((v, d) => (v - centre[d]) ** 2)))));
  const size = Math.sqrt(mean(xs.map((x) => mean(x.map((v) => v * v)))));
  // Share of each vector that is common to every token.
  return size === 0 ? 1 : 1 - Math.min(1, spread / size);
}

// Real models: d_model, layers, feed-forward width, attention heads and key/value heads.
// Parameters per block: attention Q, K, V, O plus the feed-forward matrices
// (2 for GPT-2's GELU MLP, 3 for Llama's SwiGLU). Biases and norms are left out (<0.1%).
export const MODELS = [
  { id: "gpt2", name: "GPT-2 small", d: 768, layers: 12, ffn: 3072, heads: 12, kvHeads: 12, ffMats: 2, vocab: 50_257, tied: true, total: "124M" },
  { id: "llama8", name: "Llama 3 8B", d: 4096, layers: 32, ffn: 14336, heads: 32, kvHeads: 8, ffMats: 3, vocab: 128_256, tied: false, total: "8.0B" },
  { id: "llama70", name: "Llama 3 70B", d: 8192, layers: 80, ffn: 28672, heads: 64, kvHeads: 8, ffMats: 3, vocab: 128_256, tied: false, total: "70.6B" },
] as const;
export type ModelId = (typeof MODELS)[number]["id"];

export function blockParams(m: (typeof MODELS)[number]) {
  const headDim = m.d / m.heads;
  const attn = 2 * m.d * m.d + 2 * m.d * (m.kvHeads * headDim); // Q and O are d×d; K and V shrink with fewer kv heads
  const ffn = m.ffMats * m.d * m.ffn;
  const embeddings = m.vocab * m.d * (m.tied ? 1 : 2);
  return { attn, ffn, block: attn + ffn, all: (attn + ffn) * m.layers + embeddings, embeddings };
}

export const fmtVec = (v: Vec) => `[${v.map((x) => (x >= 0 ? " " : "") + x.toFixed(2)).join(", ")}]`;
export const fmtCount = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n.toLocaleString());
