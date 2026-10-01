"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { EMAILS, KIND_LABEL } from "@/lib/workflow";

const ACCENT = "var(--auto)";

export default function WorkflowDemo() {
  const [id, setId] = useState(EMAILS[0].id);
  const { stage, busy, run } = useWalk(5, 450);
  const email = EMAILS.find((e) => e.id === id) ?? EMAILS[0];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)]">AI automation · interactive</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">One item through a workflow</h1>
      <p className="mt-3 text-[var(--muted)]">
        A workflow is a fixed path with a branch. The email changes. The steps do not. Pick a message
        and watch which action it takes.
      </p>

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
          <div className="mt-4">
            <RunButton busy={busy} onClick={run} accent={ACCENT}>
              Run this email
            </RunButton>
          </div>
        </FlowStep>
      </div>
    </div>
  );
}
