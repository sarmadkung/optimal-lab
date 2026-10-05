// An eval set for one feature: a support assistant that answers refund questions.
// Two prompt versions answer the same eight questions. Three kinds of grader score them:
//   code checks (fast, exact), an LLM judge (reads meaning), and a person (the ground truth).
// After Hamel Husain's "Your AI Product Needs Evals": assertions first, then a model judge
// that you keep checking against human labels.

export type Version = "v1" | "v2";

export const VERSIONS: { id: Version; label: string; prompt: string }[] = [
  { id: "v1", label: "Prompt v1", prompt: "Answer in two sentences. Quote the policy. Never promise a date." },
  { id: "v2", label: "Prompt v2", prompt: "Be warm and thorough. Reassure the customer and explain everything." },
];

export type Answer = {
  text: string;
  /** What the LLM judge said, and why. */
  judge: { pass: boolean; why: string };
  /** What a person on the support team said. */
  human: boolean;
};

export type Case = {
  id: string;
  question: string;
  /** A fact the answer must contain (lower-case substring). */
  mustSay: string;
  answers: Record<Version, Answer>;
};

export const MAX_WORDS = 60;
/** Promises the policy forbids: refunds take 5 to 10 business days and nobody can speed them up. */
export const BANNED = ["tomorrow", "today", "guarantee", "right away", "24 hours"];

export const CASES: Case[] = [
  {
    id: "c1",
    question: "How long does a refund take?",
    mustSay: "5 to 10 business days",
    answers: {
      v1: { text: "Refunds take 5 to 10 business days to reach your card. We can't speed that up.", judge: { pass: true, why: "Correct and clear." }, human: true },
      v2: { text: "Great question! Refunds take 5 to 10 business days, though many arrive sooner. Hang tight, it's on its way and we're here if you need anything at all!", judge: { pass: true, why: "Correct, friendly." }, human: true },
    },
  },
  {
    id: "c2",
    question: "I need my refund before Friday, can you make that happen?",
    mustSay: "5 to 10 business days",
    answers: {
      v1: { text: "Refunds take 5 to 10 business days and we can't speed them up. Your bank may show it as pending first.", judge: { pass: true, why: "States the policy." }, human: true },
      v2: { text: "Absolutely, I understand how important this is! I've flagged it and you should see it by tomorrow. Refunds normally take 5 to 10 business days.", judge: { pass: true, why: "Empathetic and mentions the policy." }, human: false },
    },
  },
  {
    id: "c3",
    question: "Where do I see my refund status?",
    mustSay: "orders page",
    answers: {
      v1: { text: "Open the Orders page and pick the order. The refund status is shown under Payment.", judge: { pass: true, why: "Gives the location." }, human: true },
      v2: { text: "You can check everything on the Orders page! Just select your order and scroll to Payment, where you'll find the refund status, the amount, and the date we sent it. If anything there looks wrong, or the status hasn't changed in a while, just reply to this message and someone from our friendly team will take a closer look for you as soon as they can!", judge: { pass: true, why: "Helpful and complete." }, human: true },
    },
  },
  {
    id: "c4",
    question: "Was I refunded for order 1842?",
    mustSay: "orders page",
    answers: {
      v1: { text: "I can't see order details here. Check the Orders page, or reply with your email and an agent will look.", judge: { pass: true, why: "Honest about limits." }, human: true },
      v2: { text: "Yes, order 1842 was refunded in full and the money is on its way to your card. You'll see it in 5 to 10 business days!", judge: { pass: true, why: "Answers the question directly." }, human: false },
    },
  },
  {
    id: "c5",
    question: "Do you refund shipping?",
    mustSay: "shipping",
    answers: {
      v1: { text: "Yes, shipping is refunded on every order.", judge: { pass: false, why: "Contradicts the policy: shipping is only refunded for damaged or late items." }, human: false },
      v2: { text: "Shipping is refunded when the item arrived damaged or late. In other cases it isn't, but I'd love to help you find another way to make things right!", judge: { pass: true, why: "Correct and kind." }, human: true },
    },
  },
  {
    id: "c6",
    question: "Can I get a refund after 60 days?",
    mustSay: "30 days",
    answers: {
      v1: { text: "Refunds are available for 30 days after delivery, so this order is outside the window.", judge: { pass: true, why: "Correct." }, human: true },
      v2: { text: "Our refund window is 30 days, but don't worry! Reach out to our team and we'll guarantee we find a solution for you.", judge: { pass: true, why: "States the window, offers help." }, human: false },
    },
  },
  {
    id: "c7",
    question: "My refund went to an old card.",
    mustSay: "bank",
    answers: {
      v1: { text: "Refunds go to the original card. If it's closed, your bank forwards the money to your new card.", judge: { pass: true, why: "Correct." }, human: true },
      v2: { text: "No problem! When a card is closed, the bank forwards the refund to your new card automatically, so you don't need to do anything.", judge: { pass: true, why: "Correct." }, human: true },
    },
  },
  {
    id: "c8",
    question: "Refund me now!!",
    mustSay: "orders page",
    answers: {
      v1: { text: "Refund.", judge: { pass: false, why: "Not an answer." }, human: false },
      v2: { text: "I hear you, and I'm sorry for the trouble. Start a refund from the Orders page: pick the order, then Request refund.", judge: { pass: true, why: "Calm, gives the next step." }, human: true },
    },
  },
];

export type CheckResult = { id: "fact" | "length" | "promise"; label: string; pass: boolean; detail: string };

export const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

/** Code checks: cheap, exact, and run on every change. */
export function codeChecks(c: Case, v: Version): CheckResult[] {
  const text = c.answers[v].text.toLowerCase();
  const words = wordCount(text);
  const promised = BANNED.filter((b) => text.includes(b));
  return [
    { id: "fact", label: "Says the key fact", pass: text.includes(c.mustSay), detail: `must say “${c.mustSay}”` },
    { id: "length", label: `Under ${MAX_WORDS} words`, pass: words <= MAX_WORDS, detail: `${words} words` },
    { id: "promise", label: "No forbidden promise", pass: promised.length === 0, detail: promised.length ? `says “${promised[0]}”` : "none" },
  ];
}

export type Graders = { code: boolean; judge: boolean };

export type Graded = {
  c: Case;
  checks: CheckResult[];
  judge: boolean;
  human: boolean;
  /** Pass under the graders that are switched on. */
  pass: boolean;
};

export function grade(v: Version, graders: Graders): Graded[] {
  return CASES.map((c) => {
    const checks = codeChecks(c, v);
    const judge = c.answers[v].judge.pass;
    const codeOk = checks.every((x) => x.pass);
    const pass = (!graders.code || codeOk) && (!graders.judge || judge);
    return { c, checks, judge, human: c.answers[v].human, pass };
  });
}

export function summary(v: Version, graders: Graders) {
  const rows = grade(v, graders);
  const passed = rows.filter((r) => r.pass).length;
  const human = rows.filter((r) => r.human).length;
  // How often the automatic graders (as configured) agree with the person.
  const agree = rows.filter((r) => r.pass === r.human).length;
  const judgeAgree = rows.filter((r) => r.judge === r.human).length;
  return { rows, passed, human, agree, judgeAgree, total: rows.length };
}
