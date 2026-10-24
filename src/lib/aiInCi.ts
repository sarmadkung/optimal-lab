// AI checks in CI. A repository gets 120 pull requests a month. CI can run an AI review
// bot and an eval suite on them. Which PRs trigger the evals, how flaky the judge is,
// caching and how fork PRs get API keys decide the bill, the noise and the risk. The
// path filter runs on real file lists; eval costs, flakiness and the regressions are
// illustrative.

export type PR = { n: number; title: string; files: string[]; fork?: boolean; regression?: boolean };
export const SAMPLE: PR[] = [
  { n: 1, title: "Fix date picker", files: ["src/ui/DatePicker.tsx", "src/ui/DatePicker.test.tsx"] },
  { n: 2, title: "Reword the refund prompt", files: ["prompts/support/refund.md"], regression: true },
  { n: 3, title: "Switch the summariser to a cheaper model", files: ["config/models.yaml"], regression: true },
  { n: 4, title: "Add retrieval filters", files: ["src/ai/retrieve.ts", "src/ai/retrieve.test.ts"] },
  { n: 5, title: "Typo in README", files: ["README.md"], fork: true },
  { n: 6, title: "New billing page", files: ["src/billing/Page.tsx", "src/billing/api.ts"] },
  { n: 7, title: "Tighten the triage prompt", files: ["prompts/triage/system.md", "prompts/triage/examples.json"] },
  { n: 8, title: "Contributor: improve docs examples", files: ["docs/examples.md", "prompts/support/refund.md"], fork: true },
  { n: 9, title: "Bump dependencies", files: ["package.json", "pnpm-lock.yaml"] },
  { n: 10, title: "Change tool schema for orders", files: ["src/ai/tools/orders.ts"], regression: true },
];
export const PRS_PER_MONTH = 120;

// tiny glob: ** matches any path, * matches within one segment
export function glob(pattern: string, path: string) {
  const re = new RegExp("^" + pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, "§").replace(/\*/g, "[^/]*").replace(/§/g, ".*") + "$");
  return re.test(path);
}

export type Trigger = "all" | "prompts" | "ai";
export const FILTERS: Record<Trigger, string[]> = { all: ["**"], prompts: ["prompts/**"], ai: ["prompts/**", "src/ai/**", "config/models.yaml"] };
export type Design = { trigger: Trigger; repeats: 1 | 3; cache: boolean; forks: "target" | "label" };
export const FIRST: Design = { trigger: "all", repeats: 1, cache: false, forks: "target" };
export const FIXED: Design = { trigger: "ai", repeats: 3, cache: true, forks: "label" };
export const EVAL = { cost: 1.8, minutes: 7, flaky1: 0.15, flaky3: 0.02 }; // per run, illustrative
export const REVIEW_BOT = { cost: 0.3, minutes: 2 };

export function runs(pr: PR, d: Design) {
  return pr.files.some((f) => FILTERS[d.trigger].some((p) => glob(p, f)));
}

export function evaluate(d: Design) {
  const rows = SAMPLE.map((pr) => {
    const evals = runs(pr, d) && !(pr.fork && d.forks === "label");
    return { pr, evals, caught: !!pr.regression && evals, exposed: !!pr.fork && d.forks === "target" };
  });
  const share = rows.filter((r) => r.evals).length / SAMPLE.length;
  const evalRuns = PRS_PER_MONTH * share;
  const cacheSave = d.cache ? 0.7 : 0; // unchanged cases reuse stored results
  const evalCost = evalRuns * EVAL.cost * (d.repeats === 3 ? 2 : 1) * (1 - cacheSave);
  const flaky = evalRuns * (d.repeats === 3 ? EVAL.flaky3 : EVAL.flaky1);
  const regressions = SAMPLE.filter((p) => p.regression).length;
  return {
    rows,
    evalRuns: Math.round(evalRuns),
    cost: Math.round(evalCost + PRS_PER_MONTH * REVIEW_BOT.cost),
    minutesPerPr: Math.round((EVAL.minutes * (d.repeats === 3 ? 1.4 : 1) * (1 - cacheSave * 0.6) * share + REVIEW_BOT.minutes) * 10) / 10,
    flaky: Math.round(flaky),
    caught: rows.filter((r) => r.caught).length,
    regressions,
    exposed: rows.filter((r) => r.exposed).length,
  };
}
