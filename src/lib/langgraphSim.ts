// LangGraph. A support agent as a graph: classify the ticket, retrieve docs, grade them,
// rewrite the query and retry if they don't help, draft a reply, pause for a person,
// send. State is saved after every step by a checkpointer. The graph runner here works
// the way LangGraph's does (nodes return state updates, conditional edges pick the next
// node, a checkpoint after each step, interrupts, a recursion limit); model outputs are
// illustrative.

export type NodeId = "classify" | "retrieve" | "grade" | "rewrite" | "draft" | "review" | "send" | "escalate";
export type St = { ticket: string; category?: string; query: string; docs: string[]; relevant?: boolean; attempts: number; draft?: string; approved?: boolean; note?: string };

export type Scenario = "normal" | "crash" | "loop" | "reject";
export const SCENARIOS: { id: Scenario; label: string; one: string }[] = [
  { id: "normal", label: "A normal ticket", one: "docs are relevant on the first try" },
  { id: "crash", label: "Server restarts mid-run", one: "the process dies after the draft, while waiting for review" },
  { id: "loop", label: "No doc ever helps", one: "every retrieval is graded irrelevant" },
  { id: "reject", label: "Reviewer rejects the draft", one: "the reviewer wants a different tone" },
];

export type Checkpointer = "none" | "memory" | "postgres";
export type Design = { checkpointer: Checkpointer; interrupt: boolean; attemptCap: boolean };
export const FIRST: Design = { checkpointer: "none", interrupt: false, attemptCap: false };
export const FIXED: Design = { checkpointer: "postgres", interrupt: true, attemptCap: true };
export const RECURSION_LIMIT = 25; // LangGraph's default number of steps
export const MAX_ATTEMPTS = 3;
const LLM_NODES: NodeId[] = ["classify", "grade", "rewrite", "draft"];

type Node = (s: St, sc: Scenario, rejectedOnce: boolean) => Partial<St>;
const NODES: Record<NodeId, Node> = {
  classify: () => ({ category: "billing" }),
  retrieve: (s) => ({ docs: [`results for “${s.query}”`] }),
  grade: (s, sc) => ({ relevant: sc !== "loop" && s.attempts >= 0 }),
  rewrite: (s) => ({ query: `${s.query} (rephrased)`, attempts: s.attempts + 1 }),
  draft: (_s, _sc, rejectedOnce) => ({ draft: rejectedOnce ? "Hi Sam, so sorry about the double charge; the refund is on its way and should arrive by Friday." : "Your refund has been processed." }),
  review: (_s, sc, rejectedOnce) => ({ approved: sc !== "reject" || rejectedOnce }),
  send: () => ({ note: "reply sent" }),
  escalate: () => ({ note: "handed to a person: no helpful docs" }),
};

function next(at: NodeId, s: St, d: Design): NodeId | null {
  switch (at) {
    case "classify":
      return "retrieve";
    case "retrieve":
      return "grade";
    case "grade":
      if (s.relevant) return "draft";
      if (d.attemptCap && s.attempts >= MAX_ATTEMPTS) return "escalate";
      return "rewrite";
    case "rewrite":
      return "retrieve";
    case "draft":
      return d.interrupt ? "review" : "send";
    case "review":
      return s.approved ? "send" : "draft";
    default:
      return null;
  }
}

export type Step = { node: NodeId; checkpoint: number | null; redo: boolean; note: string };

export function runGraph(sc: Scenario, d: Design) {
  let s: St = { ticket: "I was charged twice for order 4821", query: "charged twice refund", docs: [], attempts: 0 };
  const steps: Step[] = [];
  const saved: { node: NodeId; state: St }[] = [];
  let at: NodeId | null = "classify";
  let rejectedOnce = false;
  let crashed = false;
  let outcome = "";
  let error: string | null = null;
  let total = 0;
  const durable = d.checkpointer === "postgres";

  while (at) {
    if (++total > RECURSION_LIMIT) {
      error = `GraphRecursionError: hit the limit of ${RECURSION_LIMIT} steps`;
      break;
    }
    // the reviewer's answer arrives in a later request; without a checkpointer there's no saved run to resume
    if (at === "review" && d.checkpointer === "none") {
      error = "interrupt needs a checkpointer: nothing to resume when the reviewer answers";
      break;
    }
    const update = NODES[at](s, sc, rejectedOnce);
    s = { ...s, ...update };
    if (at === "review" && !s.approved) rejectedOnce = true;
    const cp = d.checkpointer === "none" ? null : saved.push({ node: at, state: s });
    const note = at === "grade" ? (s.relevant ? "relevant" : "not relevant") : at === "review" ? (s.approved ? "approved" : "rejected: rewind to draft with the reviewer's note") : at === "draft" ? `“${s.draft}”` : at === "rewrite" ? `attempt ${s.attempts}` : "";
    steps.push({ node: at, checkpoint: cp, redo: false, note });
    if (at === "send" || at === "escalate") outcome = at === "send" && !d.interrupt ? "reply sent, with nobody reviewing it" : s.note!;
    // the process restarts right after the draft: resume from the last saved step, or start over
    if (sc === "crash" && at === "draft" && !crashed) {
      crashed = true;
      steps.push({ node: "draft", checkpoint: null, redo: false, note: "process restarts" });
      if (!durable) {
        steps.forEach((x) => (x.redo = x.note !== "process restarts"));
        s = { ticket: s.ticket, query: "charged twice refund", docs: [], attempts: 0 };
        saved.length = 0; // in-memory checkpoints die with the process
        at = "classify";
        continue;
      }
    }
    at = next(at, s, d);
  }
  if (!outcome && !error) outcome = "ended";
  const executed = steps.filter((x) => x.note !== "process restarts");
  return {
    steps,
    outcome: error ?? outcome,
    ok: !error,
    llmCalls: executed.filter((x) => LLM_NODES.includes(x.node)).length,
    redone: steps.filter((x) => x.redo && x.note !== "process restarts").length,
    checkpoints: saved.length,
    sentWithoutReview: !d.interrupt && executed.some((x) => x.node === "send"),
  };
}
