// Token embeddings and positions: the first thing a transformer does with token ids.
// Each id picks one row of an embedding table; a position vector is added so the model
// can tell "dog bit man" from "man bit dog". Without it, attention sees the same set of
// vectors in both sentences, just reordered.
//
// Real tables have 768 to 8,192 learned dimensions that nobody named. Here each vector has
// 6 readable dimensions so the numbers explain themselves. Positions use the sinusoidal
// formula from "Attention Is All You Need": PE(pos, 2i) = sin(pos / 10000^(2i/d)),
// PE(pos, 2i+1) = cos(pos / 10000^(2i/d)).

export const DIMS = ["animal", "person", "action", "past", "small word", "size"] as const;
export const D = DIMS.length;

export type Vec = number[];

// A toy vocabulary: id = index. GPT-2 has 50,257 rows; Llama 3 has 128,256.
export const VOCAB: { text: string; vec: Vec }[] = [
  { text: "the", vec: [0, 0, 0, 0, 1, 0] },
  { text: "a", vec: [0, 0, 0, 0, 0.9, -0.2] },
  { text: "dog", vec: [0.9, 0, 0, 0, 0, 0.4] },
  { text: "cat", vec: [0.9, 0, 0, 0, 0, -0.2] },
  { text: "man", vec: [0, 0.9, 0, 0, 0, 0.3] },
  { text: "child", vec: [0, 0.9, 0, 0, 0, -0.5] },
  { text: "bit", vec: [0.2, 0, 0.9, 0.8, 0, 0] },
  { text: "chased", vec: [0.3, 0, 0.9, 0.8, 0, 0.1] },
  { text: "sees", vec: [0, 0.2, 0.8, -0.6, 0, 0] },
  { text: "small", vec: [0, 0, 0, 0, 0.2, -0.9] },
];

export const SENTENCES = {
  "dog-man": "the dog bit the man",
  "man-dog": "the man bit the dog",
  "cat-child": "a small cat chased the child",
} as const;
export type SentenceId = keyof typeof SENTENCES;

export type PositionMode = "none" | "sinusoidal";

export const idOf = (word: string) => VOCAB.findIndex((v) => v.text === word);

export function positionVector(pos: number, d = D): Vec {
  return Array.from({ length: d }, (_, j) => {
    const i = Math.floor(j / 2);
    const angle = pos / Math.pow(10000, (2 * i) / d);
    return j % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
  });
}

const add = (a: Vec, b: Vec) => a.map((x, i) => x + b[i]);
const dot = (a: Vec, b: Vec) => a.reduce((s, x, i) => s + x * b[i], 0);
const norm = (a: Vec) => Math.sqrt(dot(a, a));
export const cosine = (a: Vec, b: Vec) => {
  const n = norm(a) * norm(b);
  return n === 0 ? 0 : dot(a, b) / n;
};

export type Row = {
  pos: number;
  text: string;
  id: number;
  token: Vec; // the row looked up in the table
  position: Vec; // all zeros when positions are off
  input: Vec; // token + position: what the first layer reads
};

export function embed(sentence: SentenceId, mode: PositionMode): Row[] {
  return SENTENCES[sentence].split(" ").map((text, pos) => {
    const id = idOf(text);
    const token = VOCAB[id].vec;
    const position = mode === "sinusoidal" ? positionVector(pos) : Array(D).fill(0);
    return { pos, text, id, token, position, input: add(token, position) };
  });
}

/** Other words in the table, most similar first. Similar meaning → nearby rows. */
export function neighbours(id: number, k = 3) {
  return VOCAB.map((v, j) => ({ text: v.text, id: j, score: cosine(VOCAB[id].vec, v.vec) }))
    .filter((v) => v.id !== id)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

/** Largest gap between two vectors, dimension by dimension. 0 means identical. */
export const maxGap = (a: Vec, b: Vec) => Math.max(...a.map((x, i) => Math.abs(x - b[i])));

/**
 * Can a model with no positions tell two sentences apart? Only if their vectors differ as a
 * set: attention without positions gives the same result for any order of the same rows.
 */
export function sameBag(a: Row[], b: Row[]) {
  const key = (rows: Row[]) =>
    rows
      .map((r) => r.input.map((x) => x.toFixed(4)).join(","))
      .sort()
      .join("|");
  return key(a) === key(b);
}

/** The order-swapped twin used for the comparison, if this sentence has one. */
export const twin = (s: SentenceId): SentenceId | null => (s === "dog-man" ? "man-dog" : s === "man-dog" ? "dog-man" : null);

// Real embedding tables: vocabulary × width, one learned number per cell.
export const REAL_TABLES = [
  { model: "GPT-2 small", vocab: 50_257, width: 768, positions: "learned table, 1,024 positions" },
  { model: "Llama 3 8B", vocab: 128_256, width: 4_096, positions: "RoPE: rotates queries and keys, no table" },
];

export const fmt = (v: Vec) => `[${v.map((x) => (x >= 0 ? " " : "") + x.toFixed(2)).join(", ")}]`;
