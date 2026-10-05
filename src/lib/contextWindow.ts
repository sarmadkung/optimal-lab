// What goes into one model call, and what it costs.
// Every turn the app rebuilds the whole prompt: system prompt, tool definitions,
// the chat so far, retrieved notes, plus room left for the answer. It must fit the
// context window. When it does not, the app has to trim something.
// Numbers are small on purpose (an 8,000-token window) so the bar fills in a few turns.

export const WINDOW = 8_000;

export const PARTS = {
  system: 400,
  tools: 900,
  /** Each turn adds one user message and one model reply to the history. */
  turn: [520, 640, 700, 760, 820, 880, 940, 1000, 1060, 1120],
  docsPerChunk: 350,
  answer: 800,
  summary: 300,
};

export const TURNS = PARTS.turn.length;

/** Illustrative prices per million tokens, in the range most hosted models charge. */
export const PRICE = { input: 3, cachedInput: 0.3, output: 15 };

export type Strategy = "none" | "dropOldest" | "summarize";

export const STRATEGIES: { id: Strategy; label: string; what: string }[] = [
  { id: "none", label: "Send everything", what: "No trimming. Past the limit the API refuses the call." },
  { id: "dropOldest", label: "Drop oldest turns", what: "Forget the start of the chat until it fits." },
  { id: "summarize", label: "Summarize old turns", what: "Swap the oldest turns for one short summary." },
];

export type Segment = { id: "system" | "tools" | "summary" | "history" | "docs" | "answer"; label: string; tokens: number };

export type TurnFrame = {
  turn: number; // 1-based
  segments: Segment[];
  /** Turns the model can still see, 1-based. */
  kept: number[];
  /** Turns trimmed away (dropped or folded into the summary). */
  trimmed: number[];
  summarized: boolean;
  used: number;
  over: number;
  /** The API would reject this call. */
  rejected: boolean;
  cost: { input: number; cached: number; output: number; total: number; withoutCache: number };
};

export function buildTurn(turn: number, strategy: Strategy, chunks: number, caching: boolean): TurnFrame {
  const fixed = PARTS.system + PARTS.tools;
  const docs = chunks * PARTS.docsPerChunk;
  const history = Array.from({ length: turn }, (_, i) => i + 1);
  const historyTokens = (ids: number[]) => ids.reduce((s, id) => s + PARTS.turn[id - 1], 0);
  const budget = WINDOW - fixed - docs - PARTS.answer;

  let kept = history;
  let summarized = false;
  if (strategy !== "none") {
    // The newest turn always stays: it holds the question being answered.
    const room = strategy === "summarize" ? () => budget - (kept.length < history.length ? PARTS.summary : 0) : () => budget;
    while (kept.length > 1 && historyTokens(kept) > room()) {
      kept = kept.slice(1);
      if (strategy === "summarize") summarized = true;
    }
  }
  const trimmed = history.filter((t) => !kept.includes(t));

  const segments: Segment[] = [
    { id: "system", label: "System prompt", tokens: PARTS.system },
    { id: "tools", label: "Tool definitions", tokens: PARTS.tools },
    ...(summarized ? [{ id: "summary" as const, label: `Summary of turns 1–${trimmed.at(-1)}`, tokens: PARTS.summary }] : []),
    { id: "history", label: kept.length === 1 ? `Turn ${kept[0]}` : `Turns ${kept[0]}–${kept.at(-1)}`, tokens: historyTokens(kept) },
    { id: "docs", label: `${chunks} retrieved ${chunks === 1 ? "note" : "notes"}`, tokens: docs },
    { id: "answer", label: "Room for the answer", tokens: PARTS.answer },
  ];
  const used = segments.reduce((s, x) => s + x.tokens, 0);
  const over = Math.max(0, used - WINDOW);

  // Prompt caching: an unchanged prefix (system + tools) is billed at the cached rate after
  // the first call. Trimming the start of the history changes everything after the tools.
  const input = used - PARTS.answer;
  const cachedTokens = caching && turn > 1 ? fixed : 0;
  const perM = (n: number, p: number) => (n / 1_000_000) * p;
  const outputTokens = 300;
  const cost = {
    input: perM(input - cachedTokens, PRICE.input),
    cached: perM(cachedTokens, PRICE.cachedInput),
    output: perM(outputTokens, PRICE.output),
    total: 0,
    withoutCache: perM(input, PRICE.input) + perM(outputTokens, PRICE.output),
  };
  cost.total = cost.input + cost.cached + cost.output;

  return { turn, segments, kept, trimmed, summarized, used, over, rejected: over > 0, cost };
}

export const usd = (x: number) => (x < 0.01 ? `$${x.toFixed(4)}` : `$${x.toFixed(3)}`);
