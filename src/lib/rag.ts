// Retrieval-augmented generation. Smaller chunks keep one fact each.
// A whole section mixes facts, so the prompt the model sees gets noisier.

export type Chunk = { id: string; source: string; text: string };

const SENTENCES: Chunk[] = [
  { id: "capital", source: "Handbook", text: "The capital of Pakistan is Islamabad." },
  { id: "karachi", source: "Handbook", text: "Karachi is the largest city by population." },
  { id: "rice", source: "Cookbook", text: "Soak the rice, parboil it, then layer it for biryani." },
];

const SECTIONS: Chunk[] = [
  {
    id: "handbook",
    source: "Handbook",
    text: "The capital of Pakistan is Islamabad. Karachi is the largest city by population.",
  },
  { id: "cookbook", source: "Cookbook", text: "Soak the rice, parboil it, then layer it for biryani." },
];

export type Ask = {
  id: string;
  question: string;
  // similarity of this question to each chunk id
  scores: Record<string, number>;
};

export const ASKS: Ask[] = [
  {
    id: "capital",
    question: "What is the capital of Pakistan?",
    scores: { capital: 0.94, karachi: 0.38, rice: 0.06, handbook: 0.61, cookbook: 0.05 },
  },
  {
    id: "rice",
    question: "How is biryani rice cooked?",
    scores: { capital: 0.04, karachi: 0.07, rice: 0.91, handbook: 0.08, cookbook: 0.91 },
  },
];

export function chunksFor(mode: "sentence" | "section") {
  return mode === "sentence" ? SENTENCES : SECTIONS;
}

export function retrieve(ask: Ask, mode: "sentence" | "section", k: number) {
  const chunks = chunksFor(mode);
  const ranked = chunks
    .map((chunk) => ({ ...chunk, score: ask.scores[chunk.id] ?? 0 }))
    .sort((a, b) => b.score - a.score);
  const kept = ranked.slice(0, k);
  const prompt = [
    "Answer using only the notes below. If they do not say, say you do not know.",
    "",
    ...kept.map((c) => `- (${c.source}) ${c.text}`),
    "",
    `Question: ${ask.question}`,
  ].join("\n");
  return { ranked, kept, prompt };
}
