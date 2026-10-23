// Generating tests with AI. A shipping-cost function has a bug at the free-shipping
// boundary. Three test suites (written from the code, from the spec, and from the spec
// plus surviving mutants) are illustrative of what a model writes; running them, and the
// mutation testing that scores them, really happens here.

export const SPEC = [
  "Orders of £50 or more ship free, except express.",
  "Otherwise shipping is £4.99, plus £1.50 for every started kg over 2 kg.",
  "Express doubles the cost.",
];

type Fn = (total: number, kg: number, express: boolean) => number;
const r2 = (x: number) => Math.round(x * 100) / 100;

export const CODE = `function shipping(total, kg, express) {
  if (!express && total > 50) return 0;
  let cost = 4.99;
  if (kg > 2) cost += 1.5 * Math.ceil(kg - 2);
  if (express) cost *= 2;
  return round2(cost);
}`;

// As shipped: "> 50" should be ">= 50".
export const buggy: Fn = (total, kg, express) => {
  if (!express && total > 50) return 0;
  let cost = 4.99;
  if (kg > 2) cost += 1.5 * Math.ceil(kg - 2);
  if (express) cost *= 2;
  return r2(cost);
};
export const fixed: Fn = (total, kg, express) => {
  if (!express && total >= 50) return 0;
  let cost = 4.99;
  if (kg > 2) cost += 1.5 * Math.ceil(kg - 2);
  if (express) cost *= 2;
  return r2(cost);
};

// Small deliberate changes to the fixed code. A good suite fails on each of them.
export const MUTANTS: { id: string; change: string; fn: Fn }[] = [
  { id: "m1", change: "total >= 50  →  total > 50", fn: buggy },
  { id: "m2", change: "total >= 50  →  total >= 60", fn: (t, kg, e) => (!e && t >= 60 ? 0 : fixed(0, kg, e)) },
  { id: "m3", change: "drop “!express &&”: express ships free too", fn: (t, kg, e) => (t >= 50 ? 0 : fixed(0, kg, e)) },
  { id: "m4", change: "kg > 2  →  kg >= 2", fn: (t, kg, e) => (!e && t >= 50 ? 0 : r2((4.99 + (kg >= 2 ? 1.5 * Math.max(1, Math.ceil(kg - 2)) : 0)) * (e ? 2 : 1))) },
  { id: "m5", change: "Math.ceil  →  Math.floor", fn: (t, kg, e) => (!e && t >= 50 ? 0 : r2((4.99 + (kg > 2 ? 1.5 * Math.floor(kg - 2) : 0)) * (e ? 2 : 1))) },
  { id: "m6", change: "1.5 per kg  →  1.0 per kg", fn: (t, kg, e) => (!e && t >= 50 ? 0 : r2((4.99 + (kg > 2 ? 1 * Math.ceil(kg - 2) : 0)) * (e ? 2 : 1))) },
  { id: "m7", change: "kg - 2  →  kg", fn: (t, kg, e) => (!e && t >= 50 ? 0 : r2((4.99 + (kg > 2 ? 1.5 * Math.ceil(kg) : 0)) * (e ? 2 : 1))) },
  { id: "m8", change: "express doubling removed", fn: (t, kg, e) => (!e && t >= 50 ? 0 : r2(4.99 + (kg > 2 ? 1.5 * Math.ceil(kg - 2) : 0))) },
  { id: "m9", change: "4.99  →  5.99", fn: (t, kg, e) => (!e && t >= 50 ? 0 : r2((5.99 + (kg > 2 ? 1.5 * Math.ceil(kg - 2) : 0)) * (e ? 2 : 1))) },
];

export type Test = { name: string; args: [number, number, boolean]; want: number };
export type SuiteId = "code" | "spec" | "mutants";
export const SUITES: { id: SuiteId; label: string; how: string; tests: Test[] }[] = [
  {
    id: "code",
    label: "From the code",
    how: "“Write unit tests for this function.” The model reads the implementation and asserts what it does.",
    tests: [
      { name: "small order pays base rate", args: [30, 1, false], want: 4.99 },
      { name: "large order ships free", args: [80, 1, false], want: 0 },
      { name: "an order of exactly £50 pays shipping", args: [50, 1, false], want: 4.99 },
      { name: "express doubles", args: [30, 1, true], want: 9.98 },
      { name: "heavy parcel adds per kg", args: [30, 4, false], want: 7.99 },
    ],
  },
  {
    id: "spec",
    label: "From the spec",
    how: "“Here is the rule. Write tests for it, including the boundaries.” The model never sees the code.",
    tests: [
      { name: "£49.99 pays shipping", args: [49.99, 1, false], want: 4.99 },
      { name: "£50 exactly ships free", args: [50, 1, false], want: 0 },
      { name: "express over £50 still pays", args: [80, 1, true], want: 9.98 },
      { name: "2 kg adds nothing", args: [30, 2, false], want: 4.99 },
      { name: "4 kg adds two kg", args: [30, 4, false], want: 7.99 },
      { name: "express doubles weight too", args: [30, 3, true], want: 12.98 },
    ],
  },
  {
    id: "mutants",
    label: "Spec + surviving mutants",
    how: "The spec suite, plus a test the model wrote for each mutant that survived it, after reading the mutant.",
    tests: [
      { name: "£49.99 pays shipping", args: [49.99, 1, false], want: 4.99 },
      { name: "£50 exactly ships free", args: [50, 1, false], want: 0 },
      { name: "express over £50 still pays", args: [80, 1, true], want: 9.98 },
      { name: "2 kg adds nothing", args: [30, 2, false], want: 4.99 },
      { name: "4 kg adds two kg", args: [30, 4, false], want: 7.99 },
      { name: "express doubles weight too", args: [30, 3, true], want: 12.98 },
      { name: "3.5 kg rounds up to 2 kg extra", args: [30, 3.5, false], want: 7.99 },
    ],
  },
];

export function runSuite(id: SuiteId, fn: Fn) {
  const s = SUITES.find((x) => x.id === id)!;
  return s.tests.map((t) => {
    const got = fn(...t.args);
    return { t, got, ok: Math.abs(got - t.want) < 0.005 };
  });
}

// Mutation score against the fixed code: tests that are wrong about the fixed code are set aside first.
export function mutation(id: SuiteId) {
  const onBuggy = runSuite(id, buggy);
  const onFixed = runSuite(id, fixed);
  const valid = SUITES.find((x) => x.id === id)!.tests.filter((_, i) => onFixed[i].ok);
  const killed = MUTANTS.map((m) => {
    const failing = valid.filter((t) => Math.abs(m.fn(...t.args) - t.want) >= 0.005);
    return { m, killed: failing.length > 0, by: failing[0]?.name ?? null };
  });
  return {
    tests: onFixed.length,
    passOnShipped: onBuggy.filter((x) => x.ok).length,
    foundBug: onBuggy.some((x) => !x.ok),
    wrongTests: onFixed.filter((x) => !x.ok).map((x) => x.t.name),
    killed,
    score: killed.filter((k) => k.killed).length / MUTANTS.length,
  };
}
