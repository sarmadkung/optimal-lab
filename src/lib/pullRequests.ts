// One day of pull requests against main, merged in order under a set of branch-protection
// rules. Each PR carries a known problem (or none); the rules decide where it is caught:
// in CI, in review, when tested against the newest main, or after it reached main.
// Which reviewer catches what is a simple rule; review times are illustrative.

export type Review = "none" | "any" | "owners";
export type Fresh = "off" | "strict" | "queue";
export type Design = { split: boolean; checks: boolean; review: Review; fresh: Fresh };

export const FIRST: Design = { split: false, checks: false, review: "any", fresh: "off" };
export const FIXED: Design = { split: true, checks: true, review: "owners", fresh: "queue" };

export const REVIEWABLE = 400; // lines a reviewer still reads closely
export const CI_MIN = 12;
export const SPLIT_INTO = 5;

type Problem = "none" | "red" | "renames" | "callsOld" | "hiddenBug" | "wrongRule";
export type Pr = { id: string; title: string; lines: number; path: string; problem: Problem };

export const PRS: Pr[] = [
  { id: "#101", title: "Fix a typo in the README", lines: 4, path: "docs/", problem: "none" },
  { id: "#102", title: "Rename getUser to fetchUser", lines: 120, path: "users/", problem: "renames" },
  { id: "#103", title: "Show the plan on the invoice page", lines: 60, path: "billing/", problem: "callsOld" },
  { id: "#104", title: "Faster search query", lines: 80, path: "search/", problem: "red" },
  { id: "#105", title: "New checkout flow", lines: 1800, path: "checkout/", problem: "hiddenBug" },
  { id: "#106", title: "Refund window to 60 days", lines: 30, path: "payments/", problem: "wrongRule" },
  { id: "#107", title: "Dark mode toggle", lines: 150, path: "web/", problem: "none" },
  { id: "#108", title: "Update dependencies", lines: 40, path: "deps/", problem: "none" },
];

export const PROBLEM_TEXT: Record<Problem, string> = {
  none: "nothing wrong",
  red: "its own tests fail",
  renames: "renames a function and updates every caller it can see",
  callsOld: "adds a new call to getUser, which #102 renames",
  hiddenBug: "the discount is applied twice when a coupon is reused",
  wrongRule: "refunds after 30 days need finance sign-off; the change skips it",
};

export type Outcome = {
  pr: Pr;
  parts: number;
  caughtAt: "CI" | "review" | "fresh main" | "main" | "production" | null;
  text: string;
  runs: number;
  updates: number;
  reviewMin: number;
};

export function simulate(d: Design) {
  const outcomes: Outcome[] = [];
  let mergedRename = false;
  for (const pr of PRS) {
    const parts = d.split && pr.lines > REVIEWABLE ? SPLIT_INTO : 1;
    const partLines = Math.ceil(pr.lines / parts);
    let runs = parts; // CI runs once per opened PR
    let updates = 0;
    // A reviewer skims anything far beyond what they can hold in their head.
    const reviewMin = d.review === "none" ? 0 : parts * Math.round(10 + Math.min(partLines, REVIEWABLE) / 8);
    const skims = partLines > REVIEWABLE;
    let caughtAt: Outcome["caughtAt"] = null;
    let text = "merged cleanly";

    if (pr.problem === "red") {
      if (d.checks) {
        caughtAt = "CI";
        runs += 1;
        text = "the required check is red, so it can't merge until the author fixes it";
      } else {
        caughtAt = "main";
        runs += 2;
        text = "merged with red tests; main is broken until someone reverts it";
      }
    } else if (pr.problem === "hiddenBug" || pr.problem === "wrongRule") {
      const reviewerCatches = pr.problem === "hiddenBug" ? d.review !== "none" && !skims : d.review === "owners";
      if (reviewerCatches) {
        caughtAt = "review";
        text = pr.problem === "hiddenBug" ? `a ${partLines}-line part is small enough to read; the reviewer spots the double discount` : "CODEOWNERS asks the payments team, who know the finance rule";
      } else {
        caughtAt = "production";
        text = pr.problem === "hiddenBug" ? (d.review === "none" ? "merged without review; the bug ships" : `${pr.lines} lines get a skim and an approval; the bug ships`) : d.review === "none" ? "merged without review; refunds skip finance" : "an engineer outside payments approves; refunds skip finance";
      }
    } else if (pr.problem === "callsOld" && mergedRename) {
      if (d.fresh === "off") {
        caughtAt = "main";
        runs += 2;
        text = "green on its old base, but main no longer has getUser: main fails to build";
      } else {
        caughtAt = "fresh main";
        runs += 1;
        text = d.fresh === "queue" ? "the merge queue tests it on top of #102, fails, and drops it; the author fixes the call" : "it must update to the newest main first; CI fails and the author fixes the call";
      }
    }
    if (pr.problem === "renames") mergedRename = true;
    // Strict mode: anything merged since the last run means update the branch and run again.
    if (d.fresh === "strict" && outcomes.length > 0) {
      updates += parts;
      runs += parts;
    }
    if (d.fresh === "queue") runs += parts;
    outcomes.push({ pr, parts, caughtAt, text, runs, updates, reviewMin });
  }
  const sum = (f: (o: Outcome) => number) => outcomes.reduce((a, o) => a + f(o), 0);
  return {
    outcomes,
    mainBroken: outcomes.filter((o) => o.caughtAt === "main").length,
    shipped: outcomes.filter((o) => o.caughtAt === "production").length,
    runs: sum((o) => o.runs),
    updates: sum((o) => o.updates),
    reviewMin: sum((o) => o.reviewMin),
  };
}

export function protectionRules(d: Design) {
  const r: string[] = [];
  if (d.checks) r.push("Require status checks to pass: ci/test");
  if (d.review !== "none") r.push("Require 1 approving review");
  if (d.review === "owners") r.push("Require review from Code Owners  (payments/ @org/payments)");
  if (d.fresh === "strict") r.push("Require branches to be up to date before merging");
  if (d.fresh === "queue") r.push("Require merge queue");
  return r.length ? r : ["(no rules: anyone can push or merge)"];
}
