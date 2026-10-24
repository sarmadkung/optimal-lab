// Versioning and testing workflows. An order workflow has 120 runs paused part-way
// (waiting for stock, the warehouse, the courier) when version 2 ships: it adds a fraud
// check before the charge and makes the charge step read amount_cents instead of
// amount. How paused runs pick up the new code decides whether customers are charged
// twice, shipped twice or not at all. The runs, the resume rules, the schema check and
// the replay test all run here.

export const V1 = ["validate", "reserve", "charge", "ship", "email"] as const;
export const V2 = ["validate", "reserve", "fraud", "charge", "ship", "email"] as const;
export type StepName = (typeof V2)[number];
export const LABEL: Record<StepName, string> = { validate: "Validate order", reserve: "Reserve stock", fraud: "Fraud check", charge: "Charge card", ship: "Ship", email: "Send receipt" };

// runs paused after this many v1 steps, waiting on something outside
export const PAUSED: { done: number; count: number; waiting: string }[] = [
  { done: 1, count: 30, waiting: "stock to arrive" },
  { done: 2, count: 25, waiting: "a payment retry window" },
  { done: 3, count: 40, waiting: "the warehouse to pick" },
  { done: 4, count: 25, waiting: "the courier's delivery scan" },
];

export type Resume = "index" | "name" | "pin";
export type Design = { resume: Resume; compat: boolean; replay: boolean };
export const FIRST: Design = { resume: "index", compat: false, replay: false };
export const FIXED: Design = { resume: "name", compat: true, replay: true };

export type Group = {
  done: number;
  count: number;
  waiting: string;
  path: StepName[]; // steps executed after the deploy
  doubled: StepName[];
  failed: string | null;
  oldLogic: boolean; // charged after the deploy without a fraud check
};

// steps after the deploy for one group of paused runs
export function resume(done: number, d: Design): { path: StepName[]; version: 1 | 2 } {
  const completed = V1.slice(0, done);
  if (d.resume === "pin") return { path: V1.slice(done) as unknown as StepName[], version: 1 };
  if (d.resume === "index") return { path: V2.slice(done) as unknown as StepName[], version: 2 };
  const last = completed[completed.length - 1];
  return { path: V2.slice(V2.indexOf(last) + 1) as unknown as StepName[], version: 2 };
}

export function simulate(d: Design) {
  const groups: Group[] = PAUSED.map((p) => {
    const completed = V1.slice(0, p.done) as unknown as StepName[];
    const { path, version } = resume(p.done, d);
    // v2's charge reads amount_cents; runs started on v1 carry only `amount`
    const failed = version === 2 && path.includes("charge") && !d.compat ? "charge step: amount_cents is undefined (the run carries amount)" : null;
    const ran = failed ? path.slice(0, path.indexOf("charge")) : path; // steps that actually happened
    const doubled = ran.filter((s) => completed.includes(s));
    return { ...p, path: failed ? path.slice(0, path.indexOf("charge") + 1) : path, doubled, failed, oldLogic: ran.includes("charge") && !ran.includes("fraud") };
  });
  const sum = (f: (g: Group) => boolean) => groups.reduce((a, g) => a + (f(g) ? g.count : 0), 0);
  const result = {
    groups,
    doubleCharged: sum((g) => g.doubled.includes("charge")),
    doubleShipped: sum((g) => g.doubled.includes("ship")),
    failed: sum((g) => !!g.failed),
    oldLogic: sum((g) => g.oldLogic),
    clean: sum((g) => !g.failed && !g.doubled.length),
  };
  const broken = sum((g) => !!g.failed || g.doubled.length > 0);
  // a replay test runs the new code against the recorded histories of paused runs before shipping
  const blocked = d.replay && broken > 0;
  return { ...result, broken, blocked, total: PAUSED.reduce((a, p) => a + p.count, 0) };
}
