// Pretraining, at toy scale: read text, predict every next token, measure how wrong the
// guesses were, nudge the weights, repeat. The model here is the smallest one that still
// learns by gradient descent on next-token loss: a table of scores for "which word follows
// which" (a bigram model, as in Karpathy's makemore). An LLM swaps the table for a
// transformer that reads the whole context, and the 300 sentences for trillions of tokens.

export type Line = { text: string; keep: boolean; why?: string };

// What a crawl looks like before cleaning: real sentences, exact duplicates, and junk.
const SUBJECTS = ["the cat", "the dog", "a bird", "the child", "my friend"];
const VERBS = ["sat on", "slept on", "looked at", "jumped over", "ran past"];
const OBJECTS = ["the mat", "the rug", "the fence", "the wall", "a box"];
const ENDINGS = ["", " and then slept", " in the sun", " all day"];

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function crawl(): Line[] {
  const rand = seeded(11);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const lines: Line[] = [];
  const seen = new Set<string>();
  const junk = ["click here to subscribe !!!", "<div class=nav> home | about </div>", "cookie settings accept all", "buy cheap pills now"];
  for (let i = 0; i < 360; i++) {
    if (i % 12 === 5) {
      lines.push({ text: junk[Math.floor(i / 12) % junk.length], keep: false, why: "boilerplate or spam" });
      continue;
    }
    const text = `${pick(SUBJECTS)} ${pick(VERBS)} ${pick(OBJECTS)}${pick(ENDINGS)}`;
    if (seen.has(text)) {
      lines.push({ text, keep: false, why: "exact duplicate" });
      continue;
    }
    seen.add(text);
    lines.push({ text, keep: true });
  }
  return lines;
}

export const RAW = crawl();
export const CLEAN = RAW.filter((l) => l.keep).map((l) => l.text);

// Held-out sentences the model never trains on: the honest measure of what it learned.
const HELD = CLEAN.filter((_, i) => i % 10 === 0);
const TRAIN = CLEAN.filter((_, i) => i % 10 !== 0);

export const BOS = "<s>"; // marks the start of a document
export const EOS = "</s>"; // marks the end
export const VOCAB = [BOS, EOS, ...Array.from(new Set(CLEAN.join(" ").split(" "))).sort()];
const ID = new Map(VOCAB.map((w, i) => [w, i]));
export const V = VOCAB.length;

export const tokenize = (s: string) => [BOS, ...s.split(" "), EOS].map((w) => ID.get(w) ?? 0);

const softmax = (row: number[]) => {
  const max = Math.max(...row);
  const exps = row.map((x) => Math.exp(x - max));
  const total = exps.reduce((s, x) => s + x, 0);
  return exps.map((e) => e / total);
};

/** Average −log p(correct next token) over a set of sentences. Lower is better. */
function loss(W: number[][], sentences: string[]) {
  let total = 0;
  let n = 0;
  for (const s of sentences) {
    const ids = tokenize(s);
    for (let t = 0; t < ids.length - 1; t++) {
      total -= Math.log(softmax(W[ids[t]])[ids[t + 1]]);
      n++;
    }
  }
  return total / n;
}

export const SAMPLE_START = "my"; // a bigram only ever looks one word back
export const BATCH = 16; // sentences per training step
export const LR = 18; // step size for the average gradient
export const PROBES = ["the", "sat", "jumped", "and"]; // words we watch the model learn to follow

export type Guess = { word: string; p: number };

export type Frame = {
  step: number;
  read: number; // sentences read so far
  tokens: number; // tokens read so far
  batch: string[]; // the sentences in this step
  trainLoss: number; // loss on this batch, before the update
  heldLoss: number; // loss on held-out sentences, after the update
  probes: { word: string; top: Guess[] }[];
  sample: string; // greedy continuation of SAMPLE_START
  /** The first sentence of the batch, as the model saw it before this step's update. */
  scored: { word: string; next: string; p: number }[];
};

function top(W: number[][], word: string, k = 3): Guess[] {
  const p = softmax(W[ID.get(word)!]);
  return p
    .map((x, i) => ({ word: VOCAB[i], p: x }))
    .sort((a, b) => b.p - a.p)
    .slice(0, k);
}

function greedy(W: number[][], start: string, max = 8) {
  const out = [start];
  let at = ID.get(start)!;
  for (let i = 0; i < max; i++) {
    const p = softmax(W[at]);
    p[0] = 0; // never "start a new document" mid-sentence
    const next = p.indexOf(Math.max(...p));
    if (VOCAB[next] === EOS) break;
    out.push(VOCAB[next]);
    at = next;
  }
  return out.join(" ");
}

function score(W: number[][], sentence: string | undefined) {
  if (!sentence) return [];
  const ids = tokenize(sentence);
  return ids.slice(0, -1).map((id, t) => ({ word: VOCAB[id], next: VOCAB[ids[t + 1]], p: softmax(W[id])[ids[t + 1]] }));
}

function snapshot(W: number[][], step: number, read: number, tokens: number, batch: string[], trainLoss: number, scored: Frame["scored"]): Frame {
  return {
    step,
    read,
    tokens,
    batch,
    trainLoss,
    heldLoss: loss(W, HELD),
    probes: PROBES.map((word) => ({ word, top: top(W, word) })),
    sample: greedy(W, SAMPLE_START),
    scored,
  };
}

/** Train one pass over the data, BATCH sentences per step. Every step is one frame. */
export function train(): Frame[] {
  // Weights start at zero: every next word equally likely, loss = ln(V).
  const W = Array.from({ length: V }, () => Array(V).fill(0));
  const frames: Frame[] = [snapshot(W, 0, 0, 0, [], Math.log(V), score(W, TRAIN[0]))];
  let tokens = 0;
  for (let step = 1; step * BATCH <= TRAIN.length; step++) {
    const batch = TRAIN.slice((step - 1) * BATCH, step * BATCH);
    const trainLoss = loss(W, batch);
    const scored = score(W, batch[0]);
    // Gradient of the average cross-entropy: softmax(row) − one-hot(target), per pair.
    const grad = Array.from({ length: V }, () => Array(V).fill(0));
    let pairs = 0;
    for (const s of batch) {
      const ids = tokenize(s);
      tokens += ids.length;
      for (let t = 0; t < ids.length - 1; t++) {
        const p = softmax(W[ids[t]]);
        p.forEach((x, j) => (grad[ids[t]][j] += x - (j === ids[t + 1] ? 1 : 0)));
        pairs++;
      }
    }
    for (let i = 0; i < V; i++) for (let j = 0; j < V; j++) W[i][j] -= (LR * grad[i][j]) / pairs;
    frames.push(snapshot(W, step, step * BATCH, tokens, batch, trainLoss, scored));
  }
  return frames;
}

export const INITIAL_LOSS = Math.log(V);
export const SPLIT = { train: TRAIN.length, held: HELD.length };

// Real pretraining runs. Training compute ≈ 6 × parameters × tokens (Kaplan et al. 2020).
export const RUNS = [
  { id: "gpt3", name: "GPT-3", params: 175e9, tokens: 300e9 },
  { id: "llama3-8b", name: "Llama 3 8B", params: 8e9, tokens: 15e12 },
  { id: "llama3-70b", name: "Llama 3 70B", params: 70e9, tokens: 15e12 },
] as const;
export type RunId = (typeof RUNS)[number]["id"];


export const sci = (x: number) => {
  const e = Math.floor(Math.log10(x));
  return `${(x / 10 ** e).toFixed(1)} × 10^${e}`;
};
