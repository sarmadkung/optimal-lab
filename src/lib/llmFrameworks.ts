// LangChain and LlamaIndex. A few lines of framework code build a RAG pipeline over a
// 40-page employee handbook. Behind them sit defaults (chunk size, how many chunks are
// retrieved, how the answer is assembled) that decide how many model calls run and
// whether the answer is complete. The defaults and the question are illustrative of
// typical frameworks; the chunking, retrieval, call counts and tokens run here.

export const PAGES = 40;
export const TOKENS_PER_PAGE = 600;
export const DOC_TOKENS = PAGES * TOKENS_PER_PAGE;
// the question needs two facts that live 9 pages apart
export const FACTS = [
  { at: 6100, text: "Parental leave is 16 weeks at full pay." },
  { at: 11500, text: "It must be requested 8 weeks before the start date, through HR." },
];
export const QUESTION = "How much parental leave do I get, and how do I request it?";
export const PROMPT_TOKENS = 180; // the framework's question-answering template, roughly
export const ANSWER_TOKENS = 120;

export type Mode = "compact" | "refine";
export const MODES: { id: Mode; label: string; one: string }[] = [
  { id: "compact", label: "Stuff into one call", one: "all retrieved chunks in one prompt" },
  { id: "refine", label: "Refine", one: "one call per chunk, each improving the last answer" },
];
export type Design = { chunk: number; topK: number; mode: Mode; tracing: boolean };
export const FIRST: Design = { chunk: 1024, topK: 2, mode: "compact", tracing: false };
export const FIXED: Design = { chunk: 400, topK: 5, mode: "compact", tracing: true };
export const CHUNKS = [256, 400, 1024];
export const TOPKS = [2, 5, 10];

// chunks ranked by similarity: those holding a fact first, then the general leave policy pages
export function retrieve(d: Design) {
  const n = Math.ceil(DOC_TOKENS / d.chunk);
  const factChunks = FACTS.map((f) => Math.floor(f.at / d.chunk));
  // larger chunks dilute a fact with unrelated text, so they rank lower than distractors
  const distractors = [Math.floor(5000 / d.chunk), Math.floor(14000 / d.chunk), Math.floor(2000 / d.chunk)].filter((c) => !factChunks.includes(c));
  const ranked = d.chunk >= 1024 ? [factChunks[0], ...distractors, factChunks[1]] : [...factChunks, ...distractors];
  const rest = Array.from({ length: n }, (_, i) => i).filter((c) => !ranked.includes(c));
  const unique = [...ranked, ...rest].filter((c, i, all) => all.indexOf(c) === i);
  const got = unique.slice(0, d.topK);
  const found = FACTS.filter((_, i) => got.includes(factChunks[i]));
  return { chunks: n, got, found, factChunks };
}

export function answer(d: Design) {
  const r = retrieve(d);
  const k = r.got.length;
  const ctx = k * d.chunk;
  const calls = d.mode === "compact" ? 1 : k;
  const inputTokens = d.mode === "compact" ? PROMPT_TOKENS + ctx : k * (PROMPT_TOKENS + d.chunk) + (k - 1) * ANSWER_TOKENS;
  const seconds = Math.round((calls * 1.1 + inputTokens / 20000 + ANSWER_TOKENS / 60) * 10) / 10;
  const complete = r.found.length === FACTS.length;
  return { ...r, k, calls, inputTokens, seconds, complete, costPer1k: ((inputTokens * 3 + calls * ANSWER_TOKENS * 15) / 1e6) * 1000 };
}
