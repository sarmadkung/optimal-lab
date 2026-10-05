// One head of scaled dot-product self-attention, small enough to check by hand.
// After "The Illustrated Transformer" (Jay Alammar) and the Transformer Explainer
// (Georgia Tech Polo Club): score = q·k, divide by √d, mask the future, softmax, mix values.
//
// Real models learn Q, K and V with weight matrices and use 64+ dimensions per head.
// Here each vector has 4 readable dimensions so the numbers explain themselves:
//   [animate, place, refers back, filler]

export const DIMS = ["animate", "place", "refers back", "filler"] as const;
export const D = DIMS.length;

type Vec = [number, number, number, number];

type TokenSpec = { text: string; q: Vec; k: Vec; v: Vec };

const FILLER: Pick<TokenSpec, "q" | "k" | "v"> = { q: [0.5, 0.5, 0, 0.5], k: [0, 0, 0, 1], v: [0, 0, 0, 1] };

const base: TokenSpec[] = [
  { text: "The", ...FILLER },
  { text: "animal", q: [0.5, 0.5, 0, 0.5], k: [1, 0, 0, 0], v: [1, 0, 0, 0] },
  { text: "didn't", ...FILLER, k: [0, 0, 0, 0.6] },
  { text: "cross", q: [1, 1, 0, 0], k: [0.2, 0.3, 0, 0.3], v: [0.2, 0.3, 0, 0.5] },
  { text: "the", ...FILLER },
  { text: "street", q: [0.5, 0.5, 0, 0.5], k: [0, 1, 0, 0], v: [0, 1, 0, 0] },
  { text: "because", ...FILLER, k: [0, 0, 0, 0.5] },
  // "it" on its own cannot tell an animal from a street: its query asks for both equally.
  { text: "it", q: [2, 2, 0, 0], k: [0.5, 0.5, 1, 0], v: [0.5, 0.5, 1, 0] },
  { text: "was", ...FILLER, k: [0, 0, 0, 0.6] },
  { text: "too", ...FILLER, k: [0, 0, 0, 0.6] },
];

export const ENDINGS = {
  tired: { text: "tired", q: [6, 0, 1.2, 0], k: [0.5, 0, 0.3, 0], v: [0.6, 0, 0, 0.4] } as TokenSpec,
  wide: { text: "wide", q: [0, 6, 1.2, 0], k: [0, 0.5, 0.3, 0], v: [0, 0.6, 0, 0.4] } as TokenSpec,
};
export type Ending = keyof typeof ENDINGS;

export const sentence = (ending: Ending) => [...base, ENDINGS[ending]];

const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);

export type AttentionRow = {
  text: string;
  index: number;
  /** q · k */
  raw: number;
  /** raw / √d */
  scaled: number;
  /** false when the causal mask hides this token (it comes after the query) */
  visible: boolean;
  /** softmax weight, 0 for masked tokens */
  weight: number;
};

export type AttentionResult = {
  query: TokenSpec;
  rows: AttentionRow[];
  /** Σ weight × value: the new vector for the query token */
  output: Vec;
};

export function attend(ending: Ending, queryIndex: number, causal: boolean): AttentionResult {
  const tokens = sentence(ending);
  const query = tokens[queryIndex];
  const scale = Math.sqrt(D);
  const rows: AttentionRow[] = tokens.map((t, index) => {
    const raw = dot(query.q, t.k);
    return { text: t.text, index, raw, scaled: raw / scale, visible: !causal || index <= queryIndex, weight: 0 };
  });
  // softmax over the visible tokens only (masked scores are −∞, so e^−∞ = 0)
  const max = Math.max(...rows.filter((r) => r.visible).map((r) => r.scaled));
  const exps = rows.map((r) => (r.visible ? Math.exp(r.scaled - max) : 0));
  const total = exps.reduce((s, x) => s + x, 0);
  rows.forEach((r, i) => (r.weight = exps[i] / total));
  const output = [0, 0, 0, 0] as Vec;
  rows.forEach((r, i) => tokens[i].v.forEach((x, d) => (output[d] += r.weight * x)));
  return { query, rows, output };
}

export const fmt = (v: number[]) => `[${v.map((x) => x.toFixed(1)).join(", ")}]`;
