"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SystemMap, hops, type NodeState, type Packet } from "@/components/system/SystemMap";
import { EMAILS, KIND_LABEL, type Kind } from "@/lib/workflow";

const ACTIONS: { kind: Kind; label: string; sub: string; at: [number, number]; mobileAt: [number, number] }[] = [
  { kind: "billing", label: "Billing queue", sub: "draft refund", at: [84, 17], mobileAt: [17, 84] },
  { kind: "bug", label: "Bug tracker", sub: "open ticket", at: [84, 50], mobileAt: [50, 84] },
  { kind: "other", label: "Archive", sub: "no ping", at: [84, 83], mobileAt: [83, 84] },
];

const ACCENT = "var(--auto)";

export default function WorkflowDemo() {
  const [id, setId] = useState(EMAILS[0].id);
  const { stage, busy, run } = useWalk(5, 900);
  const email = EMAILS.find((e) => e.id === id) ?? EMAILS[0];

  const packets: Packet[] =
    stage === 1 ? hops("email", ["inbox", "classify"], { label: "email" })
    : stage === 3 ? hops("route", ["classify", email.kind], { label: KIND_LABEL[email.kind] })
    : [];
  const action = (kind: Kind): NodeState =>
    kind !== email.kind ? (stage !== null && stage >= 3 ? "dim" : "idle") : stage === 4 ? "good" : stage === 3 ? "active" : "idle";
  const captions = [
    `A new email lands in the inbox: “${email.subject}”.`,
    "The workflow hands the subject and body to the classifier.",
    `The classifier reads it and picks a label: ${KIND_LABEL[email.kind]}.`,
    `Only the ${KIND_LABEL[email.kind]} branch runs. The other two stay idle.`,
    email.result,
  ];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)]">AI automation · interactive</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">One item through a workflow</h1>
      <p className="mt-3 text-[var(--muted)]">
        A workflow is a fixed path with a branch. The email changes. The steps do not. Pick a message
        and watch which action it takes.
      </p>

      <div className="mt-6">
        <SystemMap
          title="An inbox, a classifier and three possible actions"
          accent={ACCENT}
          nodes={[
            { id: "inbox", label: "Inbox", sub: email.from, at: [12, 50], mobileAt: [50, 11], state: stage === 0 || stage === 1 ? "active" : "idle" },
            { id: "classify", label: "Classifier", sub: stage !== null && stage >= 2 ? KIND_LABEL[email.kind] : "billing · bug · other", at: [45, 50], mobileAt: [50, 44], state: stage === 1 || stage === 2 || stage === 3 ? "active" : "idle" },
            ...ACTIONS.map((a) => ({ id: a.kind, label: a.label, sub: a.sub, at: a.at, mobileAt: a.mobileAt, state: action(a.kind) })),
          ]}
          links={[
            { from: "inbox", to: "classify", label: "1 email" },
            ...ACTIONS.map((a) => ({ from: "classify", to: a.kind, label: KIND_LABEL[a.kind], dim: stage !== null && stage >= 3 && a.kind !== email.kind })),
          ]}
          packets={packets}
          aspect={2}
          mobileAspect={0.95}
          caption={stage === null ? "Pick an email, then run it to see which branch it takes." : captions[stage]}
        >
          <RunButton busy={busy} onClick={run} accent={ACCENT}>
            Run this email
          </RunButton>
        </SystemMap>
      </div>

      <div className="mt-6">
        <FlowStep n={1} title="A new email arrives" what="The trigger is the inbox. Nothing runs until a message shows up." accent={ACCENT} active={stage === 0}>
          <Choices
            accent={ACCENT}
            value={email.id}
            onChange={setId}
            options={EMAILS.map((e) => ({ id: e.id, label: e.subject }))}
          />
          <p className="mt-3 text-sm text-[var(--muted)]">
            From {email.from}. {email.body}
          </p>
        </FlowStep>
        <FlowArrow label="1 email" accent={ACCENT} active={stage === 1} />

        <FlowStep n={2} title="Read the subject and body" what="Classification looks at the text, not at who sits in the inbox." accent={ACCENT} active={stage === 1}>
          <p className="font-medium">{email.subject}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">{email.body}</p>
        </FlowStep>
        <FlowArrow label="the text" accent={ACCENT} active={stage === 2} />

        <FlowStep n={3} title="Classify it" what="Billing, bug, or other. That label picks the branch." accent={ACCENT} active={stage === 2}>
          <p className="text-sm">
            Label: <span className="font-semibold text-[var(--text)]">{KIND_LABEL[email.kind]}</span>
          </p>
        </FlowStep>
        <FlowArrow label={KIND_LABEL[email.kind]} accent={ACCENT} active={stage === 3} />

        <FlowStep n={4} title="Take the matching action" what="Each label has one action. The other actions do not run." accent={ACCENT} active={stage === 3}>
          <ul className="space-y-2 text-sm">
            {EMAILS.map((e) => {
              const on = e.kind === email.kind;
              return (
                <li
                  key={e.id}
                  className="rounded-md border px-3 py-2"
                  style={{
                    borderColor: on ? ACCENT : "var(--line)",
                    opacity: on ? 1 : 0.45,
                  }}
                >
                  {KIND_LABEL[e.kind]} → {e.action}
                </li>
              );
            })}
          </ul>
        </FlowStep>
        <FlowArrow label="a log line" accent={ACCENT} active={stage === 4} />

        <FlowStep n={5} title="Write down what happened" what="The run ends with one result. A person can read the log without opening the inbox." accent={ACCENT} active={stage === 4}>
          <p className="text-sm">{email.result}</p>
        </FlowStep>
      </div>
    </div>
  );
}
