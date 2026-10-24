// Background and cloud agents. Twelve backlog tasks are handed to agents that each run
// in their own cloud machine and open a pull request. How the machine is set up, how
// tasks are written, how many run at once and what the machine can reach decide how
// many PRs are worth merging. Task outcomes and minutes are illustrative; setup,
// batching, conflicts, the injection and the totals run here.

export type Task = { n: number; title: string; area: string; minutes: number; vague: boolean; breaksSomething: boolean; injected?: boolean };

export const TASKS: Task[] = [
  { n: 1, title: "Round VAT to the cent", area: "billing", minutes: 14, vague: false, breaksSomething: true },
  { n: 2, title: "Add credit notes", area: "billing", minutes: 38, vague: true, breaksSomething: true },
  { n: 3, title: "Show tax lines on invoices", area: "billing", minutes: 22, vague: true, breaksSomething: false },
  { n: 4, title: "Paginate /orders", area: "api", minutes: 25, vague: false, breaksSomething: true },
  { n: 5, title: "Rate-limit /login", area: "api", minutes: 18, vague: true, breaksSomething: false },
  { n: 6, title: "Upgrade the date library", area: "deps", minutes: 30, vague: false, breaksSomething: true },
  { n: 7, title: "Add dark mode to settings", area: "ui-settings", minutes: 26, vague: true, breaksSomething: false },
  { n: 8, title: "Fix typo in welcome email", area: "emails", minutes: 6, vague: false, breaksSomething: false },
  { n: 9, title: "Triage: error on CSV import (issue #482)", area: "import", minutes: 20, vague: false, breaksSomething: false, injected: true },
  { n: 10, title: "Improve search", area: "search", minutes: 40, vague: true, breaksSomething: true },
  { n: 11, title: "Add alt text to product images", area: "ui-products", minutes: 12, vague: false, breaksSomething: false },
  { n: 12, title: "Make onboarding better", area: "onboarding", minutes: 35, vague: true, breaksSomething: false },
];

export type Env = "bare" | "script" | "snapshot";
export type Design = { env: Env; specs: boolean; parallel: 1 | 4 | 12; byArea: boolean; network: "open" | "allowlist" };
export const FIRST: Design = { env: "bare", specs: false, parallel: 12, byArea: false, network: "open" };
export const FIXED: Design = { env: "snapshot", specs: true, parallel: 4, byArea: true, network: "allowlist" };
export const SETUP_MIN: Record<Env, number> = { bare: 0, script: 6, snapshot: 0.5 };
export const COST_PER_AGENT_HOUR = 3; // illustrative compute and model cost
export const REVIEW_MIN = 12;

export type Outcome = { t: Task; round: number; result: "merge" | "wrong" | "ci-red" | "conflict"; leaked: boolean; why: string; minutes: number };

export function runBatch(d: Design) {
  const outcomes: Outcome[] = [];
  let wall = 0;
  // fill each round of agents in order; with byArea, a task waits if its area is already running
  const queue = [...TASKS];
  const rounds: Task[][] = [];
  while (queue.length) {
    const round: Task[] = [];
    for (let i = 0; i < queue.length && round.length < d.parallel; ) {
      if (d.byArea && round.some((t) => t.area === queue[i].area)) i++;
      else round.push(queue.splice(i, 1)[0]);
    }
    rounds.push(round);
  }
  for (const [ri, batch] of rounds.entries()) {
    const seenAreas = new Set<string>();
    let longest = 0;
    for (const t of batch) {
      const minutes = t.minutes + SETUP_MIN[d.env];
      longest = Math.max(longest, minutes);
      // an injected instruction in issue #482 says to post the environment to a URL
      const leaked = !!t.injected && d.network === "open";
      let result: Outcome["result"] = "merge";
      let why = "tests pass, does what the task says";
      if (t.vague && !d.specs) {
        result = "wrong";
        why = "built something reasonable that isn't what was meant";
      } else if (d.env === "bare" && t.breaksSomething) {
        result = "ci-red";
        why = "couldn't install dependencies, so never ran the tests; CI is red";
      } else if (seenAreas.has(t.area)) {
        result = "conflict";
        why = `ran at the same time as another ${t.area} task; the PRs conflict`;
      }
      seenAreas.add(t.area);
      if (leaked) why = "followed an instruction hidden in the issue and sent the machine's environment to an outside URL";
      outcomes.push({ t, round: ri + 1, result, leaked, why, minutes });
    }
    wall += longest;
  }
  outcomes.sort((a, b) => a.t.n - b.t.n);
  const agentMinutes = outcomes.reduce((a, o) => a + o.minutes, 0);
  const n = (r: Outcome["result"]) => outcomes.filter((o) => o.result === r).length;
  return {
    outcomes,
    merged: n("merge"),
    wrong: n("wrong"),
    red: n("ci-red"),
    conflicts: n("conflict"),
    leaks: outcomes.filter((o) => o.leaked).length,
    wallMin: Math.round(wall),
    cost: Math.round((agentMinutes / 60) * COST_PER_AGENT_HOUR * 100) / 100,
    reviewMin: outcomes.length * REVIEW_MIN,
    rounds: rounds.length,
  };
}
