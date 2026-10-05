// Byte-pair encoding (BPE), the way GPT-style tokenizers are trained and used.
// Training: start from single characters, count every adjacent pair, merge the most
// common pair into one new token, repeat. Encoding: split new text into characters
// and replay the learned merges in the order they were learned.
// Worked example after the Hugging Face LLM course (chapter 6, "Byte-Pair Encoding").

/** Marks the space in front of a word, like "Ġ" in GPT-2's vocabulary. */
export const SPACE = "␣";

export type Word = { text: string; count: number };

export type Corpus = {
  id: string;
  label: string;
  words: Word[];
  merges: number;
  /** True when words carry the leading-space marker, as in GPT-style vocabularies. */
  spaced: boolean;
  /** Text the reader starts with in the "try your own" box. */
  sample: string;
};

export const CORPORA: Corpus[] = [
  {
    id: "toy",
    label: "hug · pug · pun · bun",
    // The Hugging Face course corpus: each word and how often it appears.
    words: [
      { text: "hug", count: 10 },
      { text: "pug", count: 5 },
      { text: "pun", count: 12 },
      { text: "bun", count: 4 },
      { text: "hugs", count: 5 },
    ],
    merges: 6,
    spaced: false,
    sample: "bug hugs puns",
  },
  {
    id: "english",
    label: "Support tickets",
    words: countWords(
      `the payment failed . the payment is pending . my payment was refunded . the refund is pending .
       the order shipped . my order is late . the order was cancelled . the order is pending .
       the card was declined . the card was charged twice . the refund was sent to the card .
       please check the payment . please check the order . please check the card .
       the tracking number is missing . the tracking page is down . the account is locked .
       the account was charged . reset the password . the password is wrong .`,
    ),
    merges: 40,
    spaced: true,
    sample: "my refund is pending",
  },
];

function countWords(text: string): Word[] {
  const counts = new Map<string, number>();
  for (const w of text.split(/\s+/).filter(Boolean)) counts.set(w, (counts.get(w) ?? 0) + 1);
  return [...counts].map(([word, count]) => ({ text: SPACE + word, count }));
}

export type Pair = { a: string; b: string; count: number };

export type TrainFrame = {
  /** 0 = characters only; n = after n merges. */
  step: number;
  words: { text: string; count: number; tokens: string[] }[];
  /** Adjacent pairs and how often they occur across the corpus, most common first. */
  pairs: Pair[];
  /** The merge made to reach this frame (null for the first frame). */
  merged: Pair | null;
  vocab: string[];
};

const key = (a: string, b: string) => `${a}\u0000${b}`;

export function countPairs(words: { tokens: string[]; count: number }[]): Pair[] {
  const counts = new Map<string, Pair>();
  for (const w of words) {
    for (let i = 0; i < w.tokens.length - 1; i++) {
      const k = key(w.tokens[i], w.tokens[i + 1]);
      const found = counts.get(k);
      if (found) found.count += w.count;
      else counts.set(k, { a: w.tokens[i], b: w.tokens[i + 1], count: w.count });
    }
  }
  // Most common first; ties go to the pair seen first, so the result is stable.
  return [...counts.values()].sort((x, y) => y.count - x.count);
}

function applyMerge(tokens: string[], a: string, b: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (i < tokens.length - 1 && tokens[i] === a && tokens[i + 1] === b) {
      out.push(a + b);
      i++;
    } else out.push(tokens[i]);
  }
  return out;
}

export function train(corpus: Corpus): { frames: TrainFrame[]; merges: Pair[] } {
  let words = corpus.words.map((w) => ({ ...w, tokens: [...w.text] }));
  const vocab = [...new Set(words.flatMap((w) => w.tokens))].sort();
  const frames: TrainFrame[] = [{ step: 0, words, pairs: countPairs(words), merged: null, vocab: [...vocab] }];
  const merges: Pair[] = [];

  for (let step = 1; step <= corpus.merges; step++) {
    const best = countPairs(words)[0];
    if (!best || best.count < 2) break; // nothing worth merging
    merges.push(best);
    vocab.push(best.a + best.b);
    words = words.map((w) => ({ ...w, tokens: applyMerge(w.tokens, best.a, best.b) }));
    frames.push({ step, words, pairs: countPairs(words), merged: best, vocab: [...vocab] });
  }
  return { frames, merges };
}

export type Encoded = { tokens: string[]; ids: number[]; unknown: number };

/** Tokenize new text with merges learned in training. Characters never seen in training are unknown. */
export function encode(text: string, merges: Pair[], vocab: string[], spaced = true): Encoded {
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (spaced ? SPACE + w : w));
  const index = new Map(vocab.map((v, i) => [v, i]));
  const tokens: string[] = [];
  for (const w of words) {
    let parts = [...w];
    for (const m of merges) parts = applyMerge(parts, m.a, m.b);
    tokens.push(...parts);
  }
  const ids = tokens.map((t) => index.get(t) ?? -1);
  return { tokens, ids, unknown: ids.filter((id) => id < 0).length };
}

/** Rough rule of thumb for English with a real tokenizer: about 4 characters per token. */
export const CHARS_PER_TOKEN = 4;
