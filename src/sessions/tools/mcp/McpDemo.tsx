"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { ASKS, TOOLS } from "@/lib/mcp";

const ACCENT = "var(--tools)";

export default function McpDemo() {
  const [id, setId] = useState(ASKS[0].id);
  const { stage, busy, run } = useWalk(6, 440);
  const ask = ASKS.find((a) => a.id === id) ?? ASKS[0];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)]">Tools · interactive</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">MCP: tools the model can call</h1>
      <p className="mt-3 text-[var(--muted)]">
        MCP is a socket between your app and a tool server. The server lists what it can do. The model
        picks one. Your app forwards the call. The model never opens the tool itself.
      </p>

      <div className="mt-6">
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
          <Choices accent={ACCENT} value={ask.id} onChange={setId} options={ASKS.map((a) => ({ id: a.id, label: a.question }))} />
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
          <div className="mt-4">
            <RunButton busy={busy} onClick={run} accent={ACCENT}>
              Run the call
            </RunButton>
          </div>
        </FlowStep>
      </div>
    </div>
  );
}
