// From text completer to assistant, in the three stages of InstructGPT (Ouyang et al. 2022):
//
//   1. Supervised fine-tuning (SFT): train on prompts with answers written by people.
//   2. Reward model: people pick the better of two answers; a model learns to score answers
//      so that P(A beats B) = σ(r(A) − r(B))  (the Bradley–Terry model).
//   3. Reinforcement learning: push the model towards high-reward answers, with a penalty β
//      for drifting away from the SFT model. The best policy for that objective has a closed
//      form, the one DPO (Rafailov et al. 2023) is built on:
//
//        π(answer) ∝ π_SFT(answer) · exp(r(answer) / β)
//
// The reward model is only an approximation of what people want. Push it too hard (small β)
// and the policy finds answers the reward model overrates: reward goes up while people's
// ratings go down (Gao et al. 2022, "Scaling laws for reward model overoptimization").
//
// Here the model chooses between five whole answers instead of generating token by token,
// so every number can be computed exactly.

export const PROMPT = "How can I fall asleep faster?";

export type Answer = {
  id: string;
  label: string;
  text: string;
  base: number; // probability under the pretrained (base) model
  sft: number; // probability after supervised fine-tuning
  reward: number; // reward model score
  human: number; // what people actually think, 0 to 1 (unknown to the model)
};

export const ANSWERS: Answer[] = [
  {
    id: "more-questions",
    label: "Keeps writing questions",
    text: "How can I wake up earlier? How can I stop snoring? How can I remember my dreams?",
    base: 0.55,
    sft: 0.03,
    reward: -2.5,
    human: 0.02,
  },
  {
    id: "forum",
    label: "Continues a forum post",
    text: "I've tried everything. Posted in r/sleep last week but nobody replied. Anyone?",
    base: 0.3,
    sft: 0.04,
    reward: -1.8,
    human: 0.05,
  },
  {
    id: "vague",
    label: "Vague",
    text: "Sleep is important. Try to relax and you will fall asleep.",
    base: 0.1,
    sft: 0.28,
    reward: -0.6,
    human: 0.25,
  },
  {
    id: "helpful",
    label: "Helpful and short",
    text: "Keep a fixed wake-up time, avoid screens and caffeine late in the day, keep the room cool and dark, and get up if you're still awake after 20 minutes.",
    base: 0.04,
    sft: 0.55,
    reward: 1.2,
    human: 0.9,
  },
  {
    id: "flattering",
    label: "Flattering and padded",
    text: "What a wonderful question, you clearly care about your health! Sleep is one of the most important things in life. Here are 15 detailed tips, each explained at length…",
    base: 0.01,
    sft: 0.1,
    reward: 2.0,
    human: 0.3,
  },
];

// A few of the human-written examples SFT trains on (InstructGPT used about 13,000).
export const SFT_EXAMPLES = [
  { prompt: "Summarize this email in one line.", answer: "The launch moves to Tuesday; nothing else changes." },
  { prompt: "Give me a name for a bakery.", answer: "Rise & Crumb." },
  { prompt: "Explain DNS to a 10-year-old.", answer: "It's the internet's phone book: it turns names like example.com into the numbers computers use." },
];

// Pairs people compared. The reward model is trained so its scores agree with these picks.
export const COMPARISONS: [string, string][] = [
  ["helpful", "vague"],
  ["helpful", "more-questions"],
  ["flattering", "helpful"],
];

export const byId = (id: string) => ANSWERS.find((a) => a.id === id)!;
export const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
/** The reward model's probability that people prefer a over b. */
export const preferA = (a: Answer, b: Answer) => sigmoid(a.reward - b.reward);

/** The best policy for reward − β·KL(policy ‖ SFT), over the five answers. */
export function policy(beta: number): number[] {
  const logits = ANSWERS.map((a) => Math.log(a.sft) + a.reward / beta);
  const max = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - max));
  const total = exps.reduce((s, x) => s + x, 0);
  return exps.map((e) => e / total);
}

export type Outcome = { reward: number; human: number; kl: number };

/** Expected reward-model score, expected human rating, and drift from SFT (KL, in nats). */
export function outcome(p: number[]): Outcome {
  let reward = 0;
  let human = 0;
  let kl = 0;
  p.forEach((x, i) => {
    reward += x * ANSWERS[i].reward;
    human += x * ANSWERS[i].human;
    if (x > 0) kl += x * Math.log(x / ANSWERS[i].sft);
  });
  return { reward, human, kl };
}

export const BASE = ANSWERS.map((a) => a.base);
export const SFT = ANSWERS.map((a) => a.sft);

// The β slider, from "barely leashed" to "barely moved".
export const BETAS = [0.1, 0.2, 0.3, 0.5, 0.7, 1, 1.5, 2, 3, 5];

export function bestBeta() {
  return BETAS.map((b) => ({ b, h: outcome(policy(b)).human })).sort((x, y) => y.h - x.h)[0].b;
}
