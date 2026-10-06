// Agentic system patterns, after Anthropic's "Building effective agents" (Dec 2024).
// Workflows follow a path you wrote in code; an agent picks its own next step in a loop.
// Each pattern here runs one example task, so you can compare how many model calls it
// makes, how long it takes, and how predictable it is.

export type PatternId = "chain" | "route" | "parallel" | "orchestrator" | "evaluator" | "agent";

export type Hop = { from: string; to: string; label: string };

export type Step = { title: string; what: string; hops: Hop[]; output: string };

export type Pattern = {
  id: PatternId;
  name: string;
  kind: "workflow" | "agent";
  when: string;
  task: string;
  nodes: { id: string; label: string; sub: string; at: [number, number]; mobileAt: [number, number] }[];
  steps: Step[];
  /** sequential model-call rounds, to compare latency */
  rounds: number;
  calls: number;
  predictable: "high" | "medium" | "low";
};

const IN: [number, number] = [11, 50];
const IN_M: [number, number] = [50, 9];
const OUT: [number, number] = [89, 50];
const OUT_M: [number, number] = [50, 91];

export const PATTERNS: Pattern[] = [
  {
    id: "chain",
    name: "Prompt chaining",
    kind: "workflow",
    when: "The task splits into fixed steps, and each step is easier than the whole.",
    task: "Write a launch email, then translate it to Spanish.",
    nodes: [
      { id: "in", label: "Input", sub: "product notes", at: IN, mobileAt: IN_M },
      { id: "draft", label: "LLM call 1", sub: "draft", at: [37, 50], mobileAt: [50, 36] },
      { id: "gate", label: "Code check", sub: "< 120 words?", at: [63, 50], mobileAt: [50, 63] },
      { id: "translate", label: "LLM call 2", sub: "translate → es", at: [89, 50], mobileAt: [50, 91] },
    ],
    steps: [
      { title: "Draft the email", what: "One call does one job: write the English draft.", hops: [{ from: "in", to: "draft", label: "notes" }], output: "Draft: 96 words." },
      { title: "Check it in code", what: "A gate between calls catches a bad draft before it costs a second call.", hops: [{ from: "draft", to: "gate", label: "draft" }], output: "96 < 120. Pass." },
      { title: "Translate it", what: "The second call only sees the checked draft.", hops: [{ from: "gate", to: "translate", label: "draft" }], output: "Spanish email ready." },
    ],
    rounds: 2,
    calls: 2,
    predictable: "high",
  },
  {
    id: "route",
    name: "Routing",
    kind: "workflow",
    when: "Inputs fall into clear categories that each deserve their own prompt or model.",
    task: "Answer a support ticket: “I was charged twice.”",
    nodes: [
      { id: "in", label: "Ticket", sub: "charged twice", at: IN, mobileAt: IN_M },
      { id: "router", label: "Router LLM", sub: "classify", at: [37, 50], mobileAt: [50, 34] },
      { id: "billing", label: "Billing prompt", sub: "refund policy", at: [63, 20], mobileAt: [22, 62] },
      { id: "tech", label: "Tech prompt", sub: "not used", at: [63, 80], mobileAt: [78, 62] },
      { id: "out", label: "Reply", sub: "refund steps", at: OUT, mobileAt: OUT_M },
    ],
    steps: [
      { title: "Classify the input", what: "A small, cheap call picks the category.", hops: [{ from: "in", to: "router", label: "ticket" }], output: "Category: billing." },
      { title: "Send it to one specialist", what: "Only the matching branch runs. The others never see it.", hops: [{ from: "router", to: "billing", label: "billing" }], output: "Billing prompt runs." },
      { title: "Return its answer", what: "Each branch can be tuned without hurting the others.", hops: [{ from: "billing", to: "out", label: "reply" }], output: "Reply quotes the refund policy." },
    ],
    rounds: 2,
    calls: 2,
    predictable: "high",
  },
  {
    id: "parallel",
    name: "Parallelization",
    kind: "workflow",
    when: "Independent parts can run at once, or several votes make a result more reliable.",
    task: "Review a pull request for security, performance and style.",
    nodes: [
      { id: "in", label: "Diff", sub: "PR #42", at: IN, mobileAt: IN_M },
      { id: "sec", label: "LLM: security", sub: "1 finding", at: [50, 18], mobileAt: [18, 45] },
      { id: "perf", label: "LLM: perf", sub: "0 findings", at: [50, 50], mobileAt: [50, 45] },
      { id: "style", label: "LLM: style", sub: "2 findings", at: [50, 82], mobileAt: [82, 45] },
      { id: "out", label: "Merge in code", sub: "3 findings", at: OUT, mobileAt: OUT_M },
    ],
    steps: [
      { title: "Fan out", what: "Three calls start at the same time, each with one focus.", hops: [{ from: "in", to: "sec", label: "diff" }, { from: "in", to: "perf", label: "diff" }, { from: "in", to: "style", label: "diff" }], output: "3 calls in flight." },
      { title: "Collect the results", what: "Wall time is the slowest call, not the sum.", hops: [{ from: "sec", to: "out", label: "1" }, { from: "perf", to: "out", label: "0" }, { from: "style", to: "out", label: "2" }], output: "3 findings merged by plain code." },
    ],
    rounds: 1,
    calls: 3,
    predictable: "high",
  },
  {
    id: "orchestrator",
    name: "Orchestrator–workers",
    kind: "workflow",
    when: "You can't know the subtasks in advance, but one model can plan them.",
    task: "Rename a config option across a repo.",
    nodes: [
      { id: "in", label: "Request", sub: "rename option", at: IN, mobileAt: IN_M },
      { id: "orch", label: "Orchestrator", sub: "plans 3 files", at: [37, 50], mobileAt: [50, 28] },
      { id: "w1", label: "Worker", sub: "config.ts", at: [63, 18], mobileAt: [18, 58] },
      { id: "w2", label: "Worker", sub: "server.ts", at: [63, 50], mobileAt: [50, 58] },
      { id: "w3", label: "Worker", sub: "README", at: [63, 82], mobileAt: [82, 58] },
      { id: "out", label: "Synthesis", sub: "one diff", at: OUT, mobileAt: OUT_M },
    ],
    steps: [
      { title: "Plan the subtasks", what: "The orchestrator decides which files need edits. The code didn't know.", hops: [{ from: "in", to: "orch", label: "request" }], output: "Plan: 3 files." },
      { title: "Hand each to a worker", what: "Workers run in parallel, each with only its own file.", hops: [{ from: "orch", to: "w1", label: "edit" }, { from: "orch", to: "w2", label: "edit" }, { from: "orch", to: "w3", label: "edit" }], output: "3 edits." },
      { title: "Combine the results", what: "The orchestrator reads every edit and writes one answer.", hops: [{ from: "w1", to: "orch", label: "diff" }, { from: "w2", to: "orch", label: "diff" }, { from: "w3", to: "orch", label: "diff" }, { from: "orch", to: "out", label: "diff" }], output: "One combined diff." },
    ],
    rounds: 3,
    calls: 5,
    predictable: "medium",
  },
  {
    id: "evaluator",
    name: "Evaluator–optimizer",
    kind: "workflow",
    when: "You have clear criteria, and feedback measurably improves the result.",
    task: "Write a product tagline under 8 words that mentions speed.",
    nodes: [
      { id: "in", label: "Brief", sub: "tagline", at: IN, mobileAt: IN_M },
      { id: "gen", label: "Generator", sub: "writes", at: [37, 50], mobileAt: [50, 34] },
      { id: "eval", label: "Evaluator", sub: "grades", at: [63, 50], mobileAt: [50, 64] },
      { id: "out", label: "Output", sub: "accepted", at: OUT, mobileAt: OUT_M },
    ],
    steps: [
      { title: "Generate a draft", what: "The first attempt is allowed to miss.", hops: [{ from: "in", to: "gen", label: "brief" }, { from: "gen", to: "eval", label: "draft 1" }], output: "“The fastest way to plan your whole team's week.” 9 words." },
      { title: "Grade it and send feedback", what: "The evaluator checks the criteria and says what to fix.", hops: [{ from: "eval", to: "gen", label: "too long" }], output: "Fail: 9 words." },
      { title: "Revise until it passes", what: "Loop with a cap. Without a cap, it can loop forever.", hops: [{ from: "gen", to: "eval", label: "draft 2" }, { from: "eval", to: "out", label: "pass" }], output: "“Plan your team's week in seconds.” 6 words. Pass." },
    ],
    rounds: 4,
    calls: 4,
    predictable: "medium",
  },
  {
    id: "agent",
    name: "Autonomous agent",
    kind: "agent",
    when: "Open-ended work where you can't predict the steps. Needs tools, a stop rule and a sandbox.",
    task: "Fix the failing test in this repo.",
    nodes: [
      { id: "in", label: "Goal", sub: "fix test", at: IN, mobileAt: IN_M },
      { id: "llm", label: "LLM", sub: "decides next", at: [37, 50], mobileAt: [50, 36] },
      { id: "tools", label: "Tools", sub: "read · edit · run", at: [63, 22], mobileAt: [22, 66] },
      { id: "env", label: "Environment", sub: "test output", at: [63, 78], mobileAt: [78, 66] },
      { id: "out", label: "Done", sub: "tests green", at: OUT, mobileAt: OUT_M },
    ],
    steps: [
      { title: "Decide the next action", what: "Nobody wrote the plan. The model picks a tool from what it sees now.", hops: [{ from: "in", to: "llm", label: "goal" }, { from: "llm", to: "tools", label: "run tests" }], output: "Calls run_tests." },
      { title: "Observe the result", what: "Ground truth from the environment, not the model's guess.", hops: [{ from: "tools", to: "env", label: "npm test" }, { from: "env", to: "llm", label: "1 failing" }], output: "1 failing: date parsing." },
      { title: "Loop: act again", what: "Read a file, edit it, run the tests again. Each turn costs a call.", hops: [{ from: "llm", to: "tools", label: "edit file" }, { from: "tools", to: "env", label: "npm test" }, { from: "env", to: "llm", label: "all pass" }], output: "Edit, rerun: green." },
      { title: "Stop when the goal is met", what: "A stop rule (goal met, or a max number of turns) ends the loop.", hops: [{ from: "llm", to: "out", label: "done" }], output: "Stopped after 4 turns." },
    ],
    rounds: 4,
    calls: 4,
    predictable: "low",
  },
];

/** Rough wall time at ~2 s per sequential model call. */
export const seconds = (p: Pattern) => p.rounds * 2;
