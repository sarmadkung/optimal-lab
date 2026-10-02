"use client";

import { useRef, useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { RunButton, wait } from "@/components/session/ui";
import { SystemMap, hops, type NodeState, type Packet } from "@/components/system/SystemMap";
import { DRAFT, type Decision } from "@/lib/approval";

const ACCENT = "var(--auto)";

export default function ApprovalDemo() {
  const [stage, setStage] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [decision, setDecision] = useState<Decision | null>(null);
  const cancel = useRef(false);

  async function run() {
    if (busy) return;
    setBusy(true);
    setDecision(null);
    for (let s = 0; s < 3; s++) {
      if (cancel.current) return;
      setStage(s);
      await wait(900);
    }
    setBusy(false);
  }

  function choose(next: Decision) {
    if (stage === null || stage < 2 || decision) return;
    setDecision(next);
    setStage(3);
  }

  const waiting = stage === 2 && !decision;

  const packets: Packet[] =
    stage === 0 ? hops("email", ["inbox", "model"], { label: "email" })
    : stage === 2 ? [...hops("draft", ["model", "gate"], { label: "draft" }), ...hops("ask", ["gate", "person"], { label: "review", start: 0.5 })]
    : stage === 3 && decision === "approve" ? [...hops("yes", ["person", "gate"], { label: "approve", tone: "good" }), ...hops("send", ["gate", "customer"], { label: "sent", tone: "good", start: 0.5 })]
    : stage === 3 && decision === "reject" ? hops("no", ["person", "gate"], { label: "reject", tone: "bad" })
    : [];
  const gate: NodeState = waiting ? "wait" : decision === "approve" ? "good" : decision === "reject" ? "bad" : "idle";
  const caption =
    stage === null ? "Run the workflow. It will stop at the gate and wait for you."
    : stage === 0 ? "Sara's email reaches the workflow."
    : stage === 1 ? "The model drafts a refund reply. Nothing is sent."
    : waiting ? "The draft is parked at the gate. Approve or reject it in step 3."
    : decision === "approve" ? "Approved. Only now does the reply leave for Sara."
    : "Rejected. The draft never leaves the gate.";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)]">AI automation · interactive</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Pause for a person</h1>
      <p className="mt-3 text-[var(--muted)]">
        The workflow can draft a refund. It must not send it. A person approves or rejects, and only
        then does the run finish.
      </p>

      <div className="mt-6">
        <SystemMap
          title="Inbox, model, approval gate, a person and the customer"
          accent={ACCENT}
          nodes={[
            { id: "inbox", label: "Inbox", sub: "Charged twice", at: [11, 62], mobileAt: [25, 10], state: stage === 0 ? "active" : "idle" },
            { id: "model", label: "Model", sub: "drafts a reply", at: [36, 62], mobileAt: [75, 10], state: stage === 0 || stage === 1 || stage === 2 ? "active" : "idle" },
            { id: "gate", label: "Approval gate", sub: waiting ? "waiting…" : "holds the draft", at: [63, 62], mobileAt: [50, 48], state: gate },
            { id: "person", label: "Person", sub: "you", at: [63, 15], mobileAt: [18, 86], state: waiting ? "wait" : stage === 3 ? "active" : "idle" },
            { id: "customer", label: "Sara", sub: "customer", at: [89, 62], mobileAt: [82, 86], state: decision === "approve" ? "good" : decision === "reject" ? "dim" : "idle" },
          ]}
          links={[
            { from: "inbox", to: "model" },
            { from: "model", to: "gate", label: "draft" },
            { from: "gate", to: "person", label: decision ?? "review", active: waiting },
            { from: "gate", to: "customer", label: "reply", dim: decision === "reject" },
          ]}
          packets={packets}
          aspect={2.1}
          mobileAspect={0.95}
          caption={caption}
        >
          <RunButton busy={busy} onClick={run} accent={ACCENT} running="Drafting…">
            Run until the pause
          </RunButton>
        </SystemMap>
      </div>

      <div className="mt-6">
        <FlowStep n={1} title="The email arrives" what="Sara wrote that order 1842 was charged twice." accent={ACCENT} active={stage === 0}>
          <p className="text-sm text-[var(--muted)]">From sara@shop.com · Charged twice</p>
        </FlowStep>
        <FlowArrow label="the email" accent={ACCENT} active={stage === 1} />

        <FlowStep n={2} title="Draft a reply" what="The model writes the message. It is not delivered." accent={ACCENT} active={stage === 1 || stage === 2}>
          <div className="rounded-md border border-[var(--line)] bg-[var(--inset)] p-3 text-sm">
            <p className="font-mono text-xs text-[var(--faint)]">To {DRAFT.to}</p>
            <p className="mt-2 font-medium">{DRAFT.subject}</p>
            <p className="mt-2 text-[var(--muted)]">{DRAFT.body}</p>
          </div>
        </FlowStep>
        <FlowArrow label="waiting" accent={ACCENT} active={waiting} />

        <FlowStep n={3} title="Wait for approval" what="Nothing is sent while this step is open. Approve delivers the draft. Reject throws it away." accent={ACCENT} active={waiting}>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!waiting}
              onClick={() => choose("approve")}
              className="min-h-11 rounded-md px-4 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-40"
              style={{ background: "var(--good)" }}
            >
              Approve and send
            </button>
            <button
              type="button"
              disabled={!waiting}
              onClick={() => choose("reject")}
              className="min-h-11 rounded-md border border-[var(--bad)] px-4 text-sm disabled:opacity-40"
              style={{ color: "var(--bad)" }}
            >
              Reject
            </button>
          </div>
          {stage === null && <p className="mt-3 text-xs text-[var(--faint)]">Run the workflow to reach this pause.</p>}
        </FlowStep>
        <FlowArrow label={decision === "approve" ? "sent" : decision === "reject" ? "stopped" : "no decision yet"} accent={ACCENT} active={stage === 3} />

        <FlowStep n={4} title="Finish the run" what="The log says what the person did. The model does not get a second try unless someone starts again." accent={ACCENT} active={stage === 3}>
          <p className="text-sm" style={{ color: decision === "approve" ? "var(--good)" : decision === "reject" ? "var(--bad)" : "var(--muted)" }}>
            {decision === "approve" && "Sent to Sara. The duplicate refund is in the reply."}
            {decision === "reject" && "Stopped. The draft was not sent."}
            {decision === null && "Still waiting on a person."}
          </p>
        </FlowStep>
      </div>
    </div>
  );
}
