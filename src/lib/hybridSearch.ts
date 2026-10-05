// Hybrid retrieval: keyword search (BM25) and vector search run side by side, their
// rankings are fused with Reciprocal Rank Fusion, and a reranker reorders the top few.
// After Anthropic's "Contextual Retrieval" write-up: embeddings + BM25 + reranking each
// cut retrieval failures further than the one before.

export type Doc = { id: string; title: string; text: string; vec: number[] };

// Hand-made "embeddings" over six readable concepts, so the reader can see why a
// paraphrase lands near the right note while an error code means nothing to it.
export const CONCEPTS = ["payment", "timeout", "refund", "login", "card", "api"] as const;

export const DOCS: Doc[] = [
  { id: "d1", title: "Error E1042", text: "Error E1042 means the payment gateway timed out. Retry after 30 seconds.", vec: [0.7, 0.7, 0, 0, 0.1, 0.2] },
  { id: "d2", title: "Card declined", text: "A declined card is decided by the bank. Ask the customer to call their bank.", vec: [0.6, 0, 0, 0, 0.8, 0] },
  { id: "d3", title: "Refund timing", text: "Refunds take 5 to 10 business days to reach the card.", vec: [0.4, 0, 0.9, 0, 0.3, 0] },
  { id: "d4", title: "Slow checkout", text: "Slow checkout usually means the payment provider is slow to answer.", vec: [0.8, 0.6, 0, 0, 0, 0] },
  { id: "d5", title: "Reset password", text: "Reset your password from the login page with the link we email you.", vec: [0, 0, 0, 1, 0, 0] },
  { id: "d6", title: "Error E2001", text: "Error E2001 means the API key in the request header is invalid.", vec: [0, 0, 0, 0.3, 0, 0.95] },
];

export type Query = { id: string; text: string; vec: number[]; answer: string; why: string };

export const QUERIES: Query[] = [
  {
    id: "code",
    text: "what does E1042 mean",
    // An unknown code carries almost no meaning to an embedding model: the vector is vague.
    vec: [0.3, 0.1, 0.1, 0.2, 0.1, 0.5],
    answer: "d1",
    why: "An exact code. Keyword search finds it; the vector is vague because E1042 means nothing on its own.",
  },
  {
    id: "paraphrase",
    text: "my money still hasn't come back",
    vec: [0.4, 0, 0.9, 0, 0.2, 0],
    answer: "d3",
    why: "A paraphrase. It shares no words with the refund note, so keyword search misses; the vector lands right on it.",
  },
  {
    id: "both",
    text: "payment gateway keeps timing out",
    vec: [0.75, 0.65, 0, 0, 0, 0.1],
    answer: "d1",
    why: "Both methods agree, and fusion keeps the note they both rank high.",
  },
  {
    id: "bank",
    text: "how long until the bank returns my money",
    vec: [0.4, 0, 0.8, 0, 0.45, 0],
    answer: "d3",
    why: "“Bank” pulls keyword search to the declined-card note, and fusion follows it. Only the reranker, reading question and note together, puts the refund note first.",
  },
];

export type Mode = "keyword" | "vector" | "hybrid" | "rerank";

export const MODES: { id: Mode; label: string }[] = [
  { id: "keyword", label: "Keyword only" },
  { id: "vector", label: "Vector only" },
  { id: "hybrid", label: "Hybrid (RRF)" },
  { id: "rerank", label: "Hybrid + rerank" },
];

const STOP = new Set(["a", "an", "the", "is", "to", "my", "what", "does", "it", "by", "from", "with", "we", "you", "your", "their", "after", "in", "of", "still", "has", "hasn't", "keeps", "means", "mean", "come", "back", "hasn", "t", "how", "until", "long", "why", "was"]);

export function terms(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t))
    .map((t) => t.replace(/(ing|ed|s)$/, "")); // a crude stemmer: timing → tim, timed → tim
}

// BM25 with the usual k1 = 1.2, b = 0.75.
export function bm25(query: string, docs = DOCS, k1 = 1.2, b = 0.75) {
  const tokenized = docs.map((d) => terms(d.text));
  const avg = tokenized.reduce((s, t) => s + t.length, 0) / docs.length;
  const qTerms = [...new Set(terms(query))];
  return docs.map((d, i) => {
    const tf = tokenized[i];
    let score = 0;
    const matched: string[] = [];
    for (const q of qTerms) {
      const n = tokenized.filter((t) => t.includes(q)).length;
      const f = tf.filter((t) => t === q).length;
      if (!f) continue;
      matched.push(q);
      const idf = Math.log(1 + (docs.length - n + 0.5) / (n + 0.5));
      score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * tf.length) / avg)));
    }
    return { id: d.id, score, matched };
  });
}

export function cosine(a: number[], b: number[]) {
  const dot = a.reduce((s, x, i) => s + x * b[i], 0);
  const n = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return dot / (n(a) * n(b));
}

export type Ranked = { id: string; score: number; rank: number };

function rank(rows: { id: string; score: number }[], minScore = -Infinity): Ranked[] {
  return rows
    .filter((r) => r.score > minScore)
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

/** Reciprocal Rank Fusion: each list votes 1 / (k + rank). k = 60 is the common default. */
export const RRF_K = 60;

// A cross-encoder reads the question and the note together, so it can judge meaning and
// exact terms at once. Here its scores are written by hand, standing in for that model.
const RERANK: Record<string, Record<string, number>> = {
  code: { d1: 0.97, d6: 0.31, d4: 0.22, d2: 0.05, d3: 0.03, d5: 0.02 },
  paraphrase: { d3: 0.93, d2: 0.28, d1: 0.06, d4: 0.05, d5: 0.02, d6: 0.01 },
  bank: { d3: 0.88, d2: 0.35, d4: 0.04, d1: 0.03, d5: 0.01, d6: 0.01 },
  both: { d1: 0.91, d4: 0.74, d2: 0.08, d3: 0.04, d6: 0.06, d5: 0.01 },
};

/** How many fused candidates go to the reranker, and how many notes reach the prompt. */
export const RERANK_TOP = 4;
export const FINAL_K = 2;

export function search(queryId: string) {
  const q = QUERIES.find((x) => x.id === queryId) ?? QUERIES[0];
  const keyword = bm25(q.text);
  const keywordRanked = rank(keyword, 0); // BM25 returns nothing for notes with no shared word
  const vectorRanked = rank(DOCS.map((d) => ({ id: d.id, score: cosine(q.vec, d.vec) })));

  const fused = rank(
    DOCS.map((d) => {
      const kr = keywordRanked.find((r) => r.id === d.id)?.rank;
      const vr = vectorRanked.find((r) => r.id === d.id)?.rank;
      return { id: d.id, score: (kr ? 1 / (RRF_K + kr) : 0) + (vr ? 1 / (RRF_K + vr) : 0) };
    }),
  );
  const reranked = rank(fused.slice(0, RERANK_TOP).map((r) => ({ id: r.id, score: RERANK[q.id][r.id] ?? 0 })));

  const top = (list: Ranked[]) => list.slice(0, FINAL_K).map((r) => r.id);
  const results: Record<Mode, string[]> = {
    keyword: top(keywordRanked),
    vector: top(vectorRanked),
    hybrid: top(fused),
    rerank: top(reranked),
  };
  return { query: q, keyword, keywordRanked, vectorRanked, fused, reranked, results };
}

export const doc = (id: string) => DOCS.find((d) => d.id === id)!;
