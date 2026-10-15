// Why models hallucinate, as a small simulation. Kalai et al. 2025 ("Why Language Models
// Hallucinate") argue two things this makes concrete:
//
//   1. Facts seen only once or twice in training can't be learned reliably, so the model's
//      probability for the right answer is low and spread over plausible wrong ones. Sampling
//      still produces one fluent answer; nothing in decoding says "I don't know".
//   2. Grading that gives 1 point for right and 0 for both wrong and "I don't know" rewards
//      guessing. Charge for wrong answers and abstaining starts to pay.
//
// Confidence here is the model's own probability for its top answer, and it is calibrated by
// construction. Base models are roughly calibrated (Kadavath et al. 2022); fine-tuning for
// helpfulness tends to make them overconfident.

export type Question = {
  id: string;
  q: string;
  short: string; // card title
  answer: string;
  wrong: [string, string, string]; // plausible wrong answers, most likely first
  seen: number; // how many times the fact appeared in the training data
  inDocs: boolean; // in your company's documents, so retrieval can find it
  made: boolean; // a made-up fact (rare facts are rare because nobody wrote them down)
};

export const QUESTIONS: Question[] = [
  { id: "france", q: "What is the capital of France?", short: "Capital of France", answer: "Paris", wrong: ["Lyon", "Marseille", "Nice"], seen: 100_000, inDocs: false, made: false },
  { id: "gold", q: "What is the chemical symbol for gold?", short: "Symbol for gold", answer: "Au", wrong: ["Ag", "Gd", "Go"], seen: 20_000, inDocs: false, made: false },
  { id: "austen", q: "Who wrote Pride and Prejudice?", short: "Pride and Prejudice", answer: "Jane Austen", wrong: ["Charlotte Brontë", "Emily Brontë", "George Eliot"], seen: 30_000, inDocs: false, made: false },
  { id: "eiffel", q: "In what year did the Eiffel Tower open?", short: "Eiffel Tower opened", answer: "1889", wrong: ["1887", "1900", "1878"], seen: 3_000, inDocs: false, made: false },
  { id: "boil", q: "What is water's boiling point at sea level, in °F?", short: "Boiling point, °F", answer: "212 °F", wrong: ["200 °F", "180 °F", "100 °F"], seen: 5_000, inDocs: false, made: false },
  { id: "bridge", q: "When was the Corran footbridge in Westhaven built?", short: "Corran footbridge", answer: "1907", wrong: ["1897", "1912", "1923"], seen: 12, inDocs: false, made: true },
  { id: "chess", q: "Who won the 1987 Westhaven chess open?", short: "1987 chess open", answer: "M. Ilves", wrong: ["P. Varga", "J. Okoro", "A. Lindqvist"], seen: 5, inDocs: false, made: true },
  { id: "birthday", q: "When was Dr. Lena Okafor, a postdoc with one paper, born?", short: "A postdoc's birthday", answer: "14 March 1991", wrong: ["3 June 1990", "22 October 1989", "9 January 1992"], seen: 1, inDocs: false, made: true },
  { id: "novel", q: "What is chapter 3 called in the self-published novel Salt Year?", short: "Chapter 3 of Salt Year", answer: "The Low Tide", wrong: ["Harbour Lights", "Before the Storm", "The Long Walk"], seen: 2, inDocs: false, made: true },
  { id: "refund", q: "How long is Acme's refund window?", short: "Acme refund window", answer: "45 days", wrong: ["30 days", "14 days", "60 days"], seen: 0, inDocs: true, made: true },
  { id: "port", q: "Which port does Acme's billing API listen on?", short: "Acme billing port", answer: "8443", wrong: ["443", "8080", "3000"], seen: 0, inDocs: true, made: true },
  { id: "ceo", q: "When did Acme's CEO join the company?", short: "Acme CEO joined", answer: "2016", wrong: ["2018", "2015", "2020"], seen: 2, inDocs: true, made: true },
];

const WRONG_SPLIT = [0.5, 0.3, 0.2];
const RETRIEVED = 0.97; // confidence when the answer is in the prompt

/** Probability of the right answer from training alone: more mentions, more certainty. */
export const fromTraining = (seen: number) => Math.max(0.08, seen / (seen + 3));

export type Candidate = { text: string; p: number; right: boolean };

export function candidates(q: Question, rag: boolean): Candidate[] {
  const right = rag && q.inDocs ? RETRIEVED : fromTraining(q.seen);
  return [{ text: q.answer, p: right, right: true }, ...q.wrong.map((w, i) => ({ text: w, p: (1 - right) * WRONG_SPLIT[i], right: false }))];
}

// One fixed random draw per question, so every reader sees the same samples.
function draws() {
  let s = 2025;
  return QUESTIONS.map(() => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  });
}
const U = draws();

export type Result = "right" | "wrong" | "abstain";

export type Answered = {
  q: Question;
  options: Candidate[];
  confidence: number; // probability of the model's top answer
  sampled: Candidate; // what decoding picked
  said: string;
  result: Result;
};

export function answerAll(rag: boolean, threshold: number): Answered[] {
  return QUESTIONS.map((q, i) => {
    const options = candidates(q, rag);
    const confidence = Math.max(...options.map((o) => o.p));
    let acc = 0;
    const sampled = options.find((o) => (acc += o.p) >= U[i]) ?? options[0];
    if (confidence < threshold) return { q, options, confidence, sampled, said: "I'm not sure.", result: "abstain" };
    return { q, options, confidence, sampled, said: sampled.text, result: sampled.right ? "right" : "wrong" };
  });
}

export type Grading = "accuracy" | "penalty";

export function score(results: Answered[], grading: Grading) {
  const right = results.filter((r) => r.result === "right").length;
  const wrong = results.filter((r) => r.result === "wrong").length;
  const abstain = results.filter((r) => r.result === "abstain").length;
  return { right, wrong, abstain, points: grading === "accuracy" ? right : right - wrong };
}

/**
 * Average points over many runs: an answered question scores p(right) under accuracy grading
 * and p(right) − p(wrong) with a penalty. Abstaining always scores 0.
 */
export function expected(results: Answered[], grading: Grading) {
  return results.reduce((sum, r) => {
    if (r.result === "abstain") return sum;
    const p = r.options[0].p;
    return sum + (grading === "accuracy" ? p : 2 * p - 1);
  }, 0);
}

export const THRESHOLDS = [0, 0.3, 0.5, 0.7, 0.9];
