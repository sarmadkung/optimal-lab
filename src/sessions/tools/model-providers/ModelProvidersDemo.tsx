"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { CONVERSATION, DIFFERENCES, PROVIDERS, STREAM, SYSTEM, TOOL, sizeOf, toRequest, type Provider } from "@/lib/modelProviders";

const ACCENT = "var(--tools)";
const TURNS_AT_STAGE = [1, 1, 2, 3, 4];

export default function ModelProvidersDemo() {
  const [p, setP] = useState<Provider>("anthropic");
  const { stage, busy, run } = useWalk(5, 1400);
  const at = (i: number) => stage === i;
  const upTo = stage === null ? 4 : TURNS_AT_STAGE[stage];
  const req = toRequest(p, upTo);
  const prov = PROVIDERS.find((x) => x.id === p)!;

  const nodes: MapNode[] = [
    { id: "app", label: "Your app", sub: "one conversation", at: [14, 50], mobileAt: [50, 10], state: "active" },
    ...PROVIDERS.map((x, i) => ({ id: x.id, label: x.label, sub: x.id === p ? "this request" : "", at: [62, 16 + i * 34] as [number, number], mobileAt: [18 + i * 32, 46] as [number, number], state: (x.id === p ? "active" : "dim") as MapNode["state"] })),
    { id: "tool", label: "get_order", sub: "your code", at: [14, 88], mobileAt: [18, 86], state: stage === 2 || stage === 3 ? "active" : "idle" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("q", ["app", p], { label: "system + question" })
    : stage === 1 ? hops("t", ["app", p], { label: "tool definition" })
    : stage === 2 ? hops("c", [p, "app", "tool"], { label: p === "openai" ? "tool_calls" : p === "anthropic" ? "tool_use" : "functionCall" })
    : stage === 3 ? hops("r", ["tool", "app", p], { label: p === "openai" ? "role: tool" : p === "anthropic" ? "tool_result" : "functionResponse" })
    : stage === 4 ? hops("s", [p, "app"], { label: "stream" })
    : [];

  const captions = [
    `Step 1: the system prompt goes ${DIFFERENCES[0][p]}, then the user's question.`,
    `Step 2: the tool is described with its JSON Schema in ${DIFFERENCES[2][p]}.`,
    `Step 3: the model asks for get_order; the arguments arrive as ${DIFFERENCES[3][p]}.`,
    `Step 4: your code runs it and sends the result as ${DIFFERENCES[4][p]}.`,
    `Step 5: the answer streams as server-sent events; the stream ends with ${DIFFERENCES[6][p]}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${prov.label}: ${prov.endpoint} · the full conversation is ${sizeOf(req).toLocaleString("en-US")} characters of JSON. Same conversation, three shapes.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="Tools · interactive"
        title="Model provider APIs"
        blurb="OpenAI, Anthropic and Gemini all take a conversation, tool definitions and settings, and all stream back tokens and tool calls, in different shapes. Send one conversation (a question, a tool call, its result, the answer) to each and see exactly what changes in the request and the stream."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Your app, three model provider APIs and the get_order tool in your code"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[...PROVIDERS.map((x) => ({ from: "app", to: x.id, label: x.id === p ? "HTTPS" : "", dim: x.id !== p })), { from: "app", to: "tool", label: "run tool" }]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.95}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label={`The request body for ${prov.label}`}>
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">
                  request body · {prov.endpoint}
                </p>
                <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] leading-relaxed">{JSON.stringify(req, null, 1)}</pre>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices<Provider> label="Provider" accent={ACCENT} value={p} onChange={setP} options={PROVIDERS.map((x) => ({ id: x.id, label: x.label }))} />
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Sending…">
                Step through the conversation
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Send the instructions and the question" what="Every API takes the conversation so far on every request; none of them remembers it for you. Where the system prompt goes differs." accent={ACCENT} active={at(0)}>
                <p className="text-xs">System: “{SYSTEM}”</p>
                <p className="text-xs">User: “{(CONVERSATION[0] as { text: string }).text}”</p>
              </FlowStep>
              <FlowArrow label="+ tools" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Describe the tools" what="All three take a name, a description and a JSON Schema for the arguments, wrapped differently." accent={ACCENT} active={at(1)}>
                <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-[var(--inset)] p-2 font-mono text-[10px]">{JSON.stringify((req as { tools: unknown[] }).tools[0], null, 1)}</pre>
                <p className="mt-1 text-[11px] text-[var(--faint)]">Neutral form: {TOOL.name}, “{TOOL.description}”</p>
              </FlowStep>
              <FlowArrow label="tool call" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Read the model's tool call" what="The model stops and asks for a tool. Your code has to find the call in the response, parse its arguments, and keep its id to answer it." accent={ACCENT} active={at(2)}>
                <p className="font-mono text-[11px]">arguments: {DIFFERENCES[3][p]}</p>
              </FlowStep>
              <FlowArrow label="tool result" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Send the result back, matched to the call" what="The result goes back in the next request, tied to the call by id (or by name, for Gemini), in a message whose role differs per provider." accent={ACCENT} active={at(3)}>
                <p className="font-mono text-[11px]">{DIFFERENCES[4][p]}</p>
              </FlowStep>
              <FlowArrow label="answer" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Stream the answer" what="All three stream over server-sent events. The event shapes differ, and so does how the end of the stream is marked." accent={ACCENT} active={at(4)}>
                <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] leading-relaxed">{STREAM[p].join("\n")}</pre>
                <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[30rem] text-left text-[11px]">
                  <thead>
                    <tr className="text-[var(--faint)]">
                      <th className="py-0.5 pr-2 font-normal" />
                      {PROVIDERS.map((x) => (
                        <th key={x.id} className="py-0.5 pr-2 font-normal" style={{ color: x.id === p ? ACCENT : undefined }}>
                          {x.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DIFFERENCES.map((row) => (
                      <tr key={row.what} className="border-t border-[var(--line)] align-top">
                        <td className="py-1 pr-2 text-[var(--muted)]">{row.what}</td>
                        <td className="py-1 pr-2">{row.openai}</td>
                        <td className="py-1 pr-2">{row.anthropic}</td>
                        <td className="py-1">{row.gemini}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Request shapes follow each provider&apos;s public API reference, simplified; model names are left out. Check the current docs before relying on a field.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
