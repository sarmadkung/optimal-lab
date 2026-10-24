"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { AGENT_CARD, FIRST, FIXED, POLL_EVERY, REMOTES, REST_TIMEOUT, run, runTrip, type Design, type State } from "@/lib/agentToAgent";

const ACCENT = "var(--tools)";
const STATE_COLOR: Record<State, string> = { submitted: "var(--faint)", working: "var(--c1)", "input-required": "var(--c2)", "auth-required": "var(--c2)", completed: "var(--good)", failed: "var(--bad)", canceled: "var(--faint)" };

export default function AgentToAgentDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [pick, setPick] = useState("hotel");
  const { stage, busy, run: walk } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const trip = runTrip(d);
  const remote = REMOTES.find((r) => r.id === pick)!;
  const x = run(remote, d);
  const a2a = d.style !== "rest";
  const asks = x.seen.find((s) => s.state === "input-required" || s.state === "auth-required");

  const nodes: MapNode[] = [
    { id: "user", label: "Traveller", sub: asks && d.relay && a2a ? "answers a question" : "waiting", at: [14, 50], mobileAt: [50, 10], state: asks && d.relay && a2a ? "active" : "idle" },
    { id: "assistant", label: "Travel assistant", sub: a2a ? (d.style === "poll" ? `A2A · polls every ${POLL_EVERY} s` : "A2A · streaming") : `3 custom adapters · ${REST_TIMEOUT} s timeout`, at: [44, 50], mobileAt: [50, 38], state: "active" },
    ...REMOTES.map((r, i) => {
      const rr = trip.runs[i];
      return { id: r.id, label: r.name, sub: rr.final, at: [84, 16 + i * 34] as [number, number], mobileAt: [18 + i * 32, 80] as [number, number], state: (rr.final === "completed" ? "good" : rr.final === "failed" ? "bad" : "wait") as MapNode["state"] };
    }),
  ];

  const packets: Packet[] =
    stage === 0 ? (a2a ? hops("card", [pick, "assistant"], { label: "Agent Card" }) : [])
    : stage === 1 ? hops("send", ["assistant", pick], { label: a2a ? "message/send → task" : "POST /book" })
    : stage === 2 ? hops("upd", [pick, "assistant"], { label: a2a ? (d.style === "stream" ? "status updates (SSE)" : "tasks/get …") : x.final === "failed" ? x.seen[0].note : "200 OK", tone: x.final === "failed" ? "bad" : undefined })
    : stage === 3 ? (asks && a2a ? (d.relay ? hops("ask", ["assistant", "user", "assistant", pick], { label: asks.state }) : hops("stuck", [pick, "assistant"], { label: asks.state, tone: "bad" })) : [])
    : stage === 4 ? hops("done", [pick, "assistant", "user"], { label: x.final, tone: x.final === "completed" ? "good" : "bad" })
    : [];

  const captions = [
    a2a ? `Step 1: the assistant reads the ${remote.name}'s Agent Card: its skill “${remote.skill}”, streaming support and how it authenticates.` : `Step 1: someone wrote and maintains a custom adapter for the ${remote.name}'s REST API.`,
    a2a ? "Step 2: the request becomes an A2A task with an id and a state; it can outlive any one HTTP call." : `Step 2: one synchronous call that must finish within ${REST_TIMEOUT} s.`,
    a2a ? `Step 3: ${x.seen.map((s) => `${s.t} s ${s.state}`).join(" → ")}.` : `Step 3: ${x.seen[0].note}.`,
    asks && a2a ? (d.relay ? `Step 4: the task says ${asks.state} (“${asks.note}”); the assistant asks the traveller and sends the answer to the same task.` : `Step 4: the task says ${asks.state}, and the assistant has no way to pass it on.`) : "Step 4: no question for the traveller here.",
    `Step 5: ${x.why}.`,
  ];
  const caption = stage !== null ? captions[stage] : trip.tripDone !== null ? `Trip booked in ${trip.tripDone} s · ${trip.adapters} custom adapters · longest silence ${trip.longestSilence} s.` : `${trip.done} of 3 done · ${trip.failed} failed · ${trip.stuck} stuck waiting for the traveller · ${trip.adapters} custom adapters.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="Tools · interactive"
        title="Agent-to-agent protocols"
        blurb="A travel assistant hands parts of a trip to agents run by other companies: flights (fast), a hotel agent that works for a minute and then needs to ask which neighbourhood, and a visa agent that needs the traveller to sign in. MCP connects a model to tools; A2A connects agents that run their own long tasks. See what a custom REST call can't carry."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="The traveller, a travel assistant, and flight, hotel and visa agents from other vendors"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[{ from: "user", to: "assistant", label: "trip" }, ...REMOTES.map((r) => ({ from: "assistant", to: r.id, label: a2a ? "A2A task" : "REST" }))]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <Lanes d={d} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices label="Follow" accent={ACCENT} value={pick} onChange={setPick} options={REMOTES.map((r) => ({ id: r.id, label: r.name }))} />
              </div>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Custom REST
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  A2A, streamed
                </button>
              </div>
              <RunButton busy={busy} onClick={walk} accent={ACCENT} running="Delegating…">
                {`Delegate to the ${remote.name.toLowerCase()}`}
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Discover what the other agent can do" what="An A2A agent publishes an Agent Card (at /.well-known/agent-card.json): its skills, its endpoint, whether it streams, and how to authenticate. A client reads it instead of someone writing an adapter per vendor." accent={ACCENT} active={at(0)}>
                <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-[var(--inset)] p-2 font-mono text-[10px]">{JSON.stringify(AGENT_CARD, null, 1)}</pre>
              </FlowStep>
              <FlowArrow label="a skill" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Send a task, not a request" what="Agent work takes minutes, not milliseconds. A2A turns each request into a task with an id and a state (submitted, working, input-required, auth-required, completed, failed), so it can outlive any single HTTP call." accent={ACCENT} active={at(1)}>
                <Choices label="How the assistant calls other agents" accent={ACCENT} value={a2a ? "a2a" : "rest"} onChange={(v) => set({ style: v === "rest" ? "rest" : d.style === "rest" ? "poll" : d.style })} options={[{ id: "rest", label: `Custom REST, ${REST_TIMEOUT} s timeout` }, { id: "a2a", label: "A2A tasks" }]} />
              </FlowStep>
              <FlowArrow label="task id" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Follow the task: poll or stream" what={`Polling tasks/get every ${POLL_EVERY} s works anywhere and adds delay to every change. Streaming (message/stream over SSE) or push notifications deliver each state as it happens.`} accent={ACCENT} active={at(2)}>
                <Choices label="Updates" accent={ACCENT} value={d.style === "stream" ? "stream" : "poll"} onChange={(v) => a2a && set({ style: v as Design["style"] })} options={[{ id: "poll", label: `Poll every ${POLL_EVERY} s` }, { id: "stream", label: "Stream" }]} />
                {!a2a && <p className="mt-1 text-[11px] text-[var(--faint)]">Only applies to A2A tasks.</p>}
              </FlowStep>
              <FlowArrow label="state changes" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Pass questions back to the person" what="A remote agent may need something only the person has: a preference, a sign-in. input-required and auth-required pause the task; the client asks, then replies on the same task and it carries on." accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.relay} onChange={(e) => set({ relay: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Relay input-required and auth-required to the traveller
                </label>
              </FlowStep>
              <FlowArrow label="results" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Count what came back" what="A trip is booked when all three parts complete. Custom adapters are code you maintain for every vendor; a shared protocol replaces them." accent={ACCENT} active={at(4)}>
                <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-xs">
                  <dt>Parts completed</dt>
                  <dd className="text-right font-mono" style={{ color: trip.done === 3 ? "var(--good)" : "var(--bad)" }}>{trip.done} / 3</dd>
                  <dt>Trip booked after</dt>
                  <dd className="text-right font-mono">{trip.tripDone !== null ? `${trip.tripDone} s` : "never"}</dd>
                  <dt>Custom adapters to maintain</dt>
                  <dd className="text-right font-mono">{trip.adapters}</dd>
                </dl>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The remote agents&apos; timings are illustrative. Task states follow A2A&apos;s lifecycle; transitions are checked, and timeouts, polling and relaying run here.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Lanes({ d }: { d: Design }) {
  const trip = runTrip(d);
  const span = 120;
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="What the assistant saw from each agent over two minutes">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">what the assistant saw · 0–{span} s</p>
      <ul className="mt-3 space-y-3">
        {trip.runs.map((r) => (
          <li key={r.r.id} className="text-xs">
            <div className="flex flex-wrap justify-between gap-2">
              <span>{r.r.name}</span>
              <span className="font-mono text-[11px]" style={{ color: STATE_COLOR[r.final] }}>
                {r.final}
              </span>
            </div>
            <span className="relative mt-1 block h-3 w-full rounded bg-[var(--track)]">
              {r.seen.map((s, i) => {
                const end = i + 1 < r.seen.length ? r.seen[i + 1].t : laneEnd(r.final, span, s.t);
                return <span key={i} className="absolute top-0 block h-full" title={`${s.t} s ${s.state}`} style={{ left: `${(s.t / span) * 100}%`, width: `${Math.max(1, ((Math.min(end, span) - s.t) / span) * 100)}%`, background: STATE_COLOR[s.state] }} />;
              })}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 flex flex-wrap gap-x-3 font-mono text-[10px]">
        {(["working", "input-required", "completed", "failed"] as State[]).map((s) => (
          <span key={s} style={{ color: STATE_COLOR[s] }}>
            ■ {s}
          </span>
        ))}
      </p>
    </section>
  );
}

// a finished task shows a short end mark; a stuck one stays coloured to the edge
function laneEnd(final: State, span: number, t: number) {
  return final === "completed" || final === "failed" ? t + 3 : span;
}
