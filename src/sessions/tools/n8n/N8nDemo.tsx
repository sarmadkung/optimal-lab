"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { RunButton, Slider, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionSplitLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type NodeState, type Packet } from "@/components/system/SystemMap";
import { THRESHOLD, route } from "@/lib/n8n";

const ACCENT = "var(--tools)";

export default function N8nDemo() {
  const [amount, setAmount] = useState(240);
  const { stage, busy, run } = useWalk(5, 900);
  const taken = route(amount);
  const target = taken.high ? "slack" : "email";
  const branch = (id: "slack" | "email"): NodeState =>
    id !== target ? "dim" : stage === 4 ? "good" : stage === (taken.high ? 2 : 3) ? "active" : "idle";

  const packets: Packet[] =
    stage === 0 ? hops("in", ["source", "webhook"], { label: "POST" })
    : stage === 1 ? hops("json", ["webhook", "if"], { label: `$${amount}` })
    : (stage === 2 && taken.high) || (stage === 3 && !taken.high) ? hops("branch", ["if", target], { label: taken.high ? "true" : "false" })
    : [];
  const captions = [
    "Another system POSTs the order to the webhook.",
    `The webhook passes { amount: ${amount} } to the IF node.`,
    taken.high ? `${amount} > ${THRESHOLD}, so the true branch runs.` : "The true branch is skipped.",
    taken.high ? "The false branch is skipped." : `${amount} ≤ ${THRESHOLD}, so the false branch runs.`,
    `One execution, one path: ${taken.destination}.`,
  ];

  const liveCaption = stage === null ? `Drag the amount across $${THRESHOLD}, then run it. The dimmed branch will not run.` : captions[stage];

  return (
    <SessionPage>
      <SessionHeader
        kicker="Tools · interactive"
        title="An n8n workflow, node by node"
        blurb={`n8n runs a chain of nodes. A webhook starts it, an IF node picks a branch, and only one destination runs. Drag the amount across $${THRESHOLD}.`}
      />

      <div className="mt-6">
        <SessionSplitLayout
          visual={
            <SystemMap
              chrome="split"
          title="An n8n canvas: shop, webhook, IF node, Slack and email"
          accent={ACCENT}
          nodes={[
            { id: "source", label: "Shop", sub: "new order", at: [10, 50], mobileAt: [50, 10], state: stage === 0 ? "active" : "idle" },
            { id: "webhook", label: "Webhook", sub: "POST /order", at: [36, 50], mobileAt: [50, 36], state: stage === 0 || stage === 1 ? "active" : "idle" },
            { id: "if", label: "IF", sub: `amount > ${THRESHOLD}`, at: [62, 50], mobileAt: [50, 62], state: stage === 1 || stage === 2 || stage === 3 ? "active" : "idle" },
            { id: "slack", label: "Slack", sub: "#sales", at: [88, 20], mobileAt: [22, 89], state: branch("slack") },
            { id: "email", label: "Email", sub: "the team", at: [88, 80], mobileAt: [78, 89], state: branch("email") },
          ]}
          links={[
            { from: "source", to: "webhook" },
            { from: "webhook", to: "if" },
            { from: "if", to: "slack", label: "true", dim: !taken.high },
            { from: "if", to: "email", label: "false", dim: taken.high },
          ]}
          packets={packets}
          aspect={2.1}
          mobileAspect={0.95}
            />
          }
          panel={
            <SystemMapPanel caption={liveCaption}>
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
              <p className="break-words font-mono text-sm">{`{ "amount": ${amount} }`}</p>
              <RunButton busy={busy} onClick={run} accent={ACCENT}>
                Run the workflow
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
        <FlowStep n={1} title="Webhook receives the order" what="Some other system POSTs JSON. That payload is the input to every later node." accent={ACCENT} active={stage === 0}>
          <p className="break-words font-mono text-sm">{`{ "amount": ${amount} }`}</p>
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
        </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
