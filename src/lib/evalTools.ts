// Eval tools. promptfoo, Braintrust and similar tools run a test set against every
// variant of a prompt or model and show a pass/fail matrix. A support team tests a new
// prompt (v2) and a cheaper model. The outputs and the judge's scores are illustrative;
// the code assertions, the repeats, the regression gate and the cost run here.

export type Variant = "v1A" | "v2A" | "v2B";
export const VARIANTS: { id: Variant; label: string }[] = [
  { id: "v1A", label: "prompt v1 · model A (live)" },
  { id: "v2A", label: "prompt v2 · model A" },
  { id: "v2B", label: "prompt v2 · model B (cheaper)" },
];

type Check = { kind: "contains" | "not-contains" | "json" | "max-words"; value?: string | number };
export type Case = { id: string; input: string; checks: Check[]; rubric: string; outputs: Record<Variant, string>; judge: Record<Variant, number> };

export const CASES: Case[] = [
  { id: "refund-window", input: "How long do I have to return shoes?", checks: [{ kind: "contains", value: "30 days" }], rubric: "states the 30-day window and how to start a return", outputs: { v1A: "You have 30 days from delivery to return them.", v2A: "Returns are accepted within 30 days of delivery; start one in Orders.", v2B: "You can return them within a month." }, judge: { v1A: 4, v2A: 5, v2B: 4.5 } },
  { id: "tone-angry", input: "This is the third time my order is late!!", checks: [{ kind: "not-contains", value: "calm down" }], rubric: "apologises, owns the problem, gives a next step", outputs: { v1A: "Sorry about that. Your order ships tomorrow.", v2A: "I'm sorry, three delays is not OK. I've upgraded shipping; it arrives Friday.", v2B: "Delays happen during busy periods. It ships tomorrow." }, judge: { v1A: 4.2, v2A: 5, v2B: 2.5 } },
  { id: "no-promise", input: "Will it arrive before Christmas for sure?", checks: [{ kind: "not-contains", value: "guarantee" }], rubric: "gives the estimate without promising", outputs: { v1A: "It's estimated for Dec 22.", v2A: "The estimate is Dec 22; carriers are busy, so I can't promise it.", v2B: "I guarantee it arrives by Dec 22." }, judge: { v1A: 4, v2A: 5, v2B: 1 } },
  { id: "json-order", input: "(tool output to summarise as JSON)", checks: [{ kind: "json" }], rubric: "valid JSON with status and eta", outputs: { v1A: '{"status":"shipped","eta":"2025-12-22"}', v2A: '{"status":"shipped","eta":"2025-12-22"}', v2B: 'Here you go: {"status":"shipped","eta":"2025-12-22"}' }, judge: { v1A: 5, v2A: 5, v2B: 3 } },
  { id: "short", input: "What's your phone number?", checks: [{ kind: "max-words", value: 25 }], rubric: "answers briefly", outputs: { v1A: "Call us on 0800 123 456, 9–5 weekdays.", v2A: "You can call 0800 123 456, weekdays 9–5.", v2B: "You can call 0800 123 456 on weekdays from 9 to 5." }, judge: { v1A: 5, v2A: 5, v2B: 5 } },
  { id: "policy-edge", input: "Can I return worn shoes?", checks: [{ kind: "contains", value: "unworn" }], rubric: "explains only unworn items qualify, offers warranty route", outputs: { v1A: "Only unworn items can be returned; defects go through the warranty.", v2A: "Returns are for unworn items; for defects, use the warranty claim.", v2B: "Only unworn items can be returned. Defects: warranty." }, judge: { v1A: 4.2, v2A: 4.5, v2B: 3.8 } },
];

export type Design = { code: boolean; judge: boolean; repeats: 1 | 3; gate: boolean };
export const FIRST: Design = { code: false, judge: true, repeats: 1, gate: false };
export const FIXED: Design = { code: true, judge: true, repeats: 3, gate: true };
export const PASS_SCORE = 3.5;
export const COST = { generate: 0.004, judge: 0.006 };

export function runCheck(c: Check, out: string): boolean {
  if (c.kind === "contains") return out.toLowerCase().includes(String(c.value).toLowerCase());
  if (c.kind === "not-contains") return !out.toLowerCase().includes(String(c.value).toLowerCase());
  if (c.kind === "max-words") return out.split(/\s+/).length <= Number(c.value);
  try {
    JSON.parse(out);
    return true;
  } catch {
    return false;
  }
}

// the judge is a model too: scores near the line wobble between runs (seeded)
function judgeRun(score: number, caseIdx: number, v: number, run: number) {
  const wobble = [0.6, -0.6, 0.2, -0.4, 0.5, -0.5][(caseIdx * 7 + v * 3 + run * 5) % 6];
  return score + (Math.abs(score - PASS_SCORE) <= 0.5 ? wobble : 0);
}

export function evaluate(d: Design) {
  const cells = CASES.map((c, ci) =>
    VARIANTS.map((v, vi) => {
      const out = c.outputs[v.id];
      const codePass = c.checks.every((k) => runCheck(k, out));
      const runs = Array.from({ length: d.repeats }, (_, r) => judgeRun(c.judge[v.id], ci, vi, r));
      const avg = runs.reduce((a, b) => a + b, 0) / runs.length;
      const judgePass = avg >= PASS_SCORE;
      const pass = (!d.code || codePass) && (!d.judge || judgePass);
      // what's actually true: code checks and the judge's settled score both pass
      const truth = codePass && c.judge[v.id] >= PASS_SCORE;
      return { v: v.id, out, codePass, avg, judgePass, pass, truth };
    }),
  );
  const regressions = VARIANTS.slice(1).map((v, i) => {
    const flagged = cells.filter((row) => row[0].pass && !row[i + 1].pass).length;
    const real = cells.filter((row) => row[0].truth && !row[i + 1].truth).length;
    const caught = cells.filter((row) => row[0].truth && !row[i + 1].truth && !row[i + 1].pass).length;
    return { v: v.id, flagged, real, caught, missed: real - caught, falseAlarms: Math.max(0, flagged - caught) };
  });
  const calls = CASES.length * VARIANTS.length * (1 + (d.judge ? d.repeats : 0));
  const cost = CASES.length * VARIANTS.length * (COST.generate + (d.judge ? d.repeats * COST.judge : 0));
  const blocked = d.gate && regressions.some((r) => r.flagged > 0);
  return { cells, regressions, calls, cost, blocked };
}
