// Answer directly, think step by step, or sample several chains and vote.
// A model does a fixed amount of work per token. Answering directly, every
// intermediate result has to be worked out inside the forward pass for the first
// answer token. Writing the steps out turns each result into text the next token
// can read. The accuracies are a teaching model, not measurements:
//   direct:  P = LOOKUP × HIDDEN^(steps − 1)   (each step done "in its head")
//   chain:   P = LOOKUP × WRITTEN^steps        (each written step can still slip)
//   vote:    a majority of N independent chains must agree on the right answer.

export const LOOKUP = 0.97; // recalling one fact or doing one operation
export const HIDDEN = 0.62; // each extra step done without writing it down
export const WRITTEN = 0.97; // each step written out

export type Problem = {
  id: string;
  label: string;
  question: string;
  steps: number;
  answer: string;
  direct: string; // a typical direct answer
  directRight: boolean;
  wrong: string[]; // answers a chain gives when one step slips
  chain: string[]; // the written steps
};

export const PROBLEMS: Problem[] = [
  {
    id: "fact",
    label: "A fact",
    question: "What is the capital of Australia?",
    steps: 1,
    answer: "Canberra",
    direct: "Canberra.",
    directRight: true,
    wrong: ["Sydney"],
    chain: ["The question asks for Australia's capital city.", "The capital of Australia is Canberra, not Sydney.", "Answer: Canberra."],
  },
  {
    id: "two",
    label: "Two steps",
    question: "A pack has 12 pencils. I buy 3 packs and give away 7 pencils. How many are left?",
    steps: 2,
    answer: "29",
    direct: "29.",
    directRight: true,
    wrong: ["33", "26"],
    chain: ["3 packs × 12 pencils = 36 pencils.", "36 − 7 = 29.", "Answer: 29."],
  },
  {
    id: "cafe",
    label: "Four steps",
    question: "A café sells 23 coffees an hour from 7:00 to 11:00, then 15 an hour until 15:00. Each coffee is $4. How much does it take in?",
    steps: 4,
    answer: "$608",
    direct: "$368.",
    directRight: false,
    wrong: ["$368", "$548", "$628"],
    chain: ["7:00 to 11:00 is 4 hours: 4 × 23 = 92 coffees.", "11:00 to 15:00 is 4 hours: 4 × 15 = 60 coffees.", "92 + 60 = 152 coffees.", "152 × $4 = $608.", "Answer: $608."],
  },
  {
    id: "trip",
    label: "Six steps",
    question: "A train leaves at 09:40 and the trip takes 2 h 35 min. It is 18 minutes late, and my meeting is a 12-minute walk from the station. If the meeting starts at 13:00, how many minutes early am I?",
    steps: 6,
    answer: "15 minutes",
    direct: "45 minutes early.",
    directRight: false,
    wrong: ["45 minutes", "3 minutes", "27 minutes"],
    chain: [
      "09:40 + 2 h = 11:40.",
      "11:40 + 35 min = 12:15, the planned arrival.",
      "18 minutes late: 12:15 + 18 min = 12:33.",
      "Walk 12 minutes: 12:33 + 12 min = 12:45.",
      "The meeting starts at 13:00.",
      "13:00 − 12:45 = 15 minutes.",
      "Answer: 15 minutes early.",
    ],
  },
];

export type Mode = "direct" | "chain" | "vote";
export const MODES: { id: Mode; label: string }[] = [
  { id: "direct", label: "Answer directly" },
  { id: "chain", label: "Think step by step" },
  { id: "vote", label: "Vote over samples" },
];

export function pDirect(steps: number): number {
  return LOOKUP * HIDDEN ** (steps - 1);
}

export function pChain(steps: number): number {
  return LOOKUP * WRITTEN ** steps;
}

function choose(n: number, k: number): number {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}

// Probability that more than half of n chains get it right.
// (Wrong chains may agree with each other too, so "more than half" is the safe bar.)
export function pVote(steps: number, n: number): number {
  const p = pChain(steps);
  let total = 0;
  for (let k = Math.floor(n / 2) + 1; k <= n; k++) total += choose(n, k) * p ** k * (1 - p) ** (n - k);
  return total;
}

export function accuracy(mode: Mode, steps: number, samples: number): number {
  return mode === "direct" ? pDirect(steps) : mode === "chain" ? pChain(steps) : pVote(steps, samples);
}

// Output tokens: roughly 4 characters per token for English text.
export const tokensOf = (text: string) => Math.max(1, Math.round(text.length / 4));

export function outputTokens(problem: Problem, mode: Mode, samples: number): number {
  const chain = tokensOf(problem.chain.join(" "));
  return mode === "direct" ? tokensOf(problem.direct) : mode === "chain" ? chain : chain * samples;
}

export const SAMPLE_COUNTS = [1, 3, 5, 7, 9];

export const pct = (p: number) => `${Math.round(p * 100)}%`;

// Picked so that one sampled chain slips on the longer problems, as it often will.
const SEED = 27;

// One possible set of sampled chains, the same on every visit: each chain is right
// with probability pChain, and a chain that slips lands on one of the usual wrong answers.
export function draw(problem: Problem, n: number): { answer: string; right: boolean }[] {
  let seed = (PROBLEMS.indexOf(problem) + 1) * 7919 + n * 104729 + SEED;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const p = pChain(problem.steps);
  return Array.from({ length: n }, () => {
    const right = rand() < p;
    return { answer: right ? problem.answer : problem.wrong[Math.floor(rand() * problem.wrong.length)], right };
  });
}

export function tally(samples: { answer: string; right: boolean }[]) {
  const counts = new Map<string, { n: number; right: boolean }>();
  for (const s of samples) counts.set(s.answer, { n: (counts.get(s.answer)?.n ?? 0) + 1, right: s.right });
  const rows = [...counts.entries()].map(([answer, v]) => ({ answer, ...v })).sort((a, b) => b.n - a.n);
  return { rows, winner: rows[0] };
}
