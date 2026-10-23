// Pair programming with AI: where it saves time and where it costs it. Five kinds of
// task split into phases, done by hand or with an assistant. Phase minutes are
// illustrative; the totals and the weekly mix are computed. Two published trials anchor
// the range.

export type Phase = "understand" | "prompt" | "wait" | "review" | "fix" | "write" | "test";
export const PHASES: { id: Phase; label: string; color: string }[] = [
  { id: "understand", label: "understand", color: "var(--c1)" },
  { id: "prompt", label: "explain to the AI", color: "var(--c5)" },
  { id: "wait", label: "wait", color: "var(--faint)" },
  { id: "review", label: "read its output", color: "var(--c2)" },
  { id: "fix", label: "fix its output", color: "var(--bad)" },
  { id: "write", label: "write code", color: "var(--good)" },
  { id: "test", label: "test", color: "var(--c4)" },
];

export type Task = { id: string; label: string; familiar: boolean; why: string; hand: Partial<Record<Phase, number>>; ai: Partial<Record<Phase, number>> };
export const TASKS: Task[] = [
  { id: "boiler", label: "A CRUD endpoint in a new service", familiar: false, why: "Mostly typing code that looks like a thousand other endpoints: the model has seen it all.", hand: { understand: 5, write: 40, test: 15 }, ai: { understand: 5, prompt: 3, wait: 2, review: 8, fix: 4, write: 2, test: 8 } },
  { id: "api", label: "Calling an unfamiliar API", familiar: false, why: "The model knows the library's shape; you'd otherwise read docs for 40 minutes.", hand: { understand: 40, write: 30, test: 20 }, ai: { understand: 10, prompt: 4, wait: 2, review: 12, fix: 10, write: 5, test: 15 } },
  { id: "tests", label: "Tests for existing code", familiar: false, why: "Repetitive and well specified; reading the tests is quicker than writing them.", hand: { understand: 15, write: 35, test: 5 }, ai: { understand: 10, prompt: 3, wait: 2, review: 10, fix: 6, write: 3, test: 5 } },
  { id: "bug", label: "A bug in code you know well", familiar: true, why: "You'd find it quickly; explaining the context and discarding wrong guesses takes longer.", hand: { understand: 20, write: 10, test: 10 }, ai: { understand: 15, prompt: 8, wait: 3, review: 8, fix: 5, write: 4, test: 10 } },
  { id: "refactor", label: "A refactor across 12 files with house rules", familiar: true, why: "The output looks right and breaks conventions in small ways; reviewing it is the work.", hand: { understand: 20, write: 70, test: 30 }, ai: { understand: 20, prompt: 10, wait: 6, review: 30, fix: 25, write: 10, test: 30 } },
];

export const total = (p: Partial<Record<Phase, number>>) => Object.values(p).reduce((a, b) => a + (b ?? 0), 0);

// A 30-hour week of tasks, split between familiar mature code and new or unfamiliar work.
export const WEEK_HOURS = 30;
export function week(familiarShare: number) {
  const fam = TASKS.filter((t) => t.familiar);
  const fresh = TASKS.filter((t) => !t.familiar);
  // within each kind, the tasks share the hours equally; count how many of each fit at hand-speed
  const minutes = WEEK_HOURS * 60;
  const groups = [
    { tasks: fam, share: familiarShare },
    { tasks: fresh, share: 1 - familiarShare },
  ];
  let hand = 0;
  let ai = 0;
  for (const g of groups) {
    for (const t of g.tasks) {
      const budget = (minutes * g.share) / g.tasks.length; // this many minutes of this task at hand-speed
      const n = budget / total(t.hand);
      hand += n * total(t.hand);
      ai += n * total(t.ai);
    }
  }
  return { hand, ai, change: ai / hand - 1 };
}

export const STUDIES = [
  {
    name: "METR randomized trial, 2025",
    href: "https://arxiv.org/abs/2507.09089",
    setting: "16 experienced developers, 246 real tasks in mature open-source projects they knew well (about 5 years each)",
    result: "Allowing AI made tasks take 19% longer. Developers expected a 24% speed-up beforehand, and still believed in a 20% speed-up afterwards.",
    change: 0.19,
  },
  {
    name: "GitHub Copilot randomized trial, 2023",
    href: "https://arxiv.org/abs/2302.06590",
    setting: "95 developers writing an HTTP server from scratch in JavaScript",
    result: "The group with Copilot finished 55.8% faster.",
    change: -0.558,
  },
];
