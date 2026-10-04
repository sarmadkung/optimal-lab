"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionSplitLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type NodeState, type Packet } from "@/components/system/SystemMap";
import { ASKS, TOOLS } from "@/lib/mcp";

const ACCENT = "var(--tools)";

export default function McpDemo() {
  const [id, setId] = useState(ASKS[0].id);
  const { stage, busy, run } = useWalk(6, 1100);
  const ask = ASKS.find((a) => a.id === id) ?? ASKS[0];
  const lit = (...at: number[]): NodeState => (stage !== null && at.includes(stage) ? "active" : "idle");

  const packets: Packet[] =
    stage === 0 ? [...hops("hi", ["app", "server"], { label: "connect" }), ...hops("ok", ["server", "app"], { label: "ok", tone: "good", start: 0.5 })]
    : stage === 1 ? hops("list", ["server", "app"], { label: `${TOOLS.length} tools` })
    : stage === 2 ? hops("ask", ["app", "model"], { label: "question + tools" })
    : stage === 3 ? hops("pick", ["model", "app"], { label: ask.tool })
    : stage === 4 ? hops("fwd", ["app", "server", "tool"], { label: ask.tool })
    : stage === 5 ? hops("res", ["tool", "server", "app", "model"], { label: "result", step: 0.35 })
    : [];
  const captions = [
    "Your app opens a connection to the MCP server and keeps it open.",
    "The server sends back the list of tools it offers.",
    "Your app gives the model the question and that tool list.",
    `The model answers with a request: call ${ask.tool}. It cannot run it.`,
    `Your app forwards the call to the server, which runs ${ask.tool}. The model waits.`,
    "The result travels back the same way and lands in the model's context.",
  ];

  const liveCaption = stage === null ? "Run the call and follow it from the model to the tool and back." : captions[stage];

  return (
    <SessionPage>
      <SessionHeader
        kicker="Tools · interactive"
        title="MCP: tools the model can call"
        blurb="MCP is a socket between your app and a tool server. The server lists what it can do. The model picks one. Your app forwards the call. The model never opens the tool itself."
      />

      <div className="mt-6">
        <SessionSplitLayout
          visual={
            <SystemMap
              chrome="split"
          title="The model, your app, an MCP server and the tool behind it"
          accent={ACCENT}
          nodes={[
            { id: "model", label: "Model", sub: stage === 4 ? "idle, waiting" : "picks a tool", at: [13, 72], mobileAt: [25, 15], state: lit(2, 3, 5) },
            { id: "app", label: "Your app", sub: "MCP client", at: [40, 26], mobileAt: [75, 15], state: lit(0, 1, 2, 3, 4, 5) },
            { id: "server", label: "MCP server", sub: `${TOOLS.length} tools`, at: [66, 72], mobileAt: [75, 85], state: lit(0, 1, 4, 5) },
            { id: "tool", label: ask.tool, sub: "the real work", at: [89, 26], mobileAt: [25, 85], state: lit(4, 5) },
          ]}
          links={[
            { from: "model", to: "app", label: stage === 3 ? "tool call" : stage === 5 ? "result" : "question + tools" },
            { from: "app", to: "server", label: stage === 0 ? "connection" : stage === 1 ? "tool list" : "forwarded call", dashed: true, active: stage !== null && stage >= 1 },
            { from: "server", to: "tool", label: stage === 5 ? "result" : "run" },
          ]}
          packets={packets}
          aspect={2.1}
          mobileAspect={1}
            />
          }
          panel={
            <SystemMapPanel caption={liveCaption}>
              <Choices accent={ACCENT} value={ask.id} onChange={setId} options={ASKS.map((a) => ({ id: a.id, label: a.question }))} />
              <RunButton busy={busy} onClick={run} accent={ACCENT}>
                Run the call
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
        <FlowStep n={1} title="Connect to the server" what="The app opens the MCP server at startup and keeps that connection." accent={ACCENT} active={stage === 0}>
          <p className="font-mono text-sm">server: local tools</p>
        </FlowStep>
        <FlowArrow label="list tools" accent={ACCENT} active={stage === 1} />

        <FlowStep n={2} title="Read the tool list" what="Each tool has a name and a one-line description. That list is what the model is allowed to choose from." accent={ACCENT} active={stage === 1}>
          <ul className="space-y-2">
            {TOOLS.map((tool) => (
              <li key={tool.name} className="rounded-md border border-[var(--line)] px-3 py-2 text-sm">
                <span className="font-mono">{tool.name}</span>
                <span className="mt-1 block text-[var(--muted)]">{tool.blurb}</span>
              </li>
            ))}
          </ul>
        </FlowStep>
        <FlowArrow label="the question" accent={ACCENT} active={stage === 2} />

        <FlowStep n={3} title="A question arrives" what="The question decides which tool is useful. Change it and the call changes." accent={ACCENT} active={stage === 2}>
          <p className="text-sm">{ask.question}</p>
        </FlowStep>
        <FlowArrow label={ask.tool} accent={ACCENT} active={stage === 3} />

        <FlowStep n={4} title="The model picks a tool" what="It names the tool and the arguments. That is a request, not a result." accent={ACCENT} active={stage === 3}>
          <p className="break-words font-mono text-sm">
            {ask.tool}({ask.args})
          </p>
        </FlowStep>
        <FlowArrow label="forwarded call" accent={ACCENT} active={stage === 4} />

        <FlowStep n={5} title="The app forwards it" what="Your app sends the call to the MCP server and waits. The model is idle here." accent={ACCENT} active={stage === 4}>
          <p className="text-sm text-[var(--muted)]">App → MCP server → {ask.tool}</p>
        </FlowStep>
        <FlowArrow label="tool result" accent={ACCENT} active={stage === 5} />

        <FlowStep n={6} title="Hand the result back" what="The server's reply goes back into the conversation. The model's next sentence can use it." accent={ACCENT} active={stage === 5}>
          <p className="break-words font-mono text-sm">{ask.result}</p>
        </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
