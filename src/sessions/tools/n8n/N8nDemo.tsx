"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { RunButton, Slider, useWalk } from "@/components/session/ui";
import { THRESHOLD, route } from "@/lib/n8n";

const ACCENT = "var(--tools)";

export default function N8nDemo() {
  const [amount, setAmount] = useState(240);
  const { stage, busy, run } = useWalk(5, 450);
  const taken = route(amount);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)]">Tools · interactive</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">An n8n workflow, node by node</h1>
      <p className="mt-3 text-[var(--muted)]">
        n8n runs a chain of nodes. A webhook starts it, an IF node picks a branch, and only one
        destination runs. Drag the amount across ${THRESHOLD}.
      </p>

      <div className="mt-6">
        <FlowStep n={1} title="Webhook receives the order" what="Some other system POSTs JSON. That payload is the input to every later node." accent={ACCENT} active={stage === 0}>
          <Slider
            label="Order amount"
            hint={`Above ${THRESHOLD} notifies Slack. At or below it, only an email.`}
            value={amount}
            min={0}
            max={500}
            step={10}
            format={(v) => `$${v}`}
            accent={ACCENT}
            onChange={setAmount}
          />
          <p className="mt-2 break-words font-mono text-sm">{`{ "amount": ${amount} }`}</p>
        </FlowStep>
        <FlowArrow label="the JSON" accent={ACCENT} active={stage === 1} />

        <FlowStep n={2} title="IF amount is over the threshold" what={`The node tests amount > ${THRESHOLD}. It does not send anything itself.`} accent={ACCENT} active={stage === 1}>
          <p className="font-mono text-sm">
            {amount} &gt; {THRESHOLD} → {taken.high ? "true" : "false"}
          </p>
        </FlowStep>
        <FlowArrow label={taken.high ? "true branch" : "false branch"} accent={ACCENT} active={stage === 2 || stage === 3} />

        <FlowStep n={3} title="True: post to Slack" what="This node runs only when the test is true." accent={ACCENT} active={stage === 2 && taken.high}>
          <p className="text-sm" style={{ opacity: taken.high ? 1 : 0.45 }}>
            {taken.high ? taken.detail : "Not this time. The test was false."}
          </p>
        </FlowStep>
        <FlowArrow label="or the other branch" accent={ACCENT} />

        <FlowStep n={4} title="False: email the team" what="This node runs only when the test is false. Slack stays quiet." accent={ACCENT} active={stage === 3 && !taken.high}>
          <p className="text-sm" style={{ opacity: taken.high ? 0.45 : 1 }}>
            {taken.high ? "Not this time. The test was true." : taken.detail}
          </p>
        </FlowStep>
        <FlowArrow label="one destination" accent={ACCENT} active={stage === 4} />

        <FlowStep n={5} title="Record where it went" what="An execution is one path through the nodes, not both." accent={ACCENT} active={stage === 4}>
          <p className="text-sm">
            Sent to <span className="font-semibold text-[var(--text)]">{taken.destination}</span>.
          </p>
          <div className="mt-4">
            <RunButton busy={busy} onClick={run} accent={ACCENT}>
              Run the workflow
            </RunButton>
          </div>
        </FlowStep>
      </div>
    </div>
  );
}
