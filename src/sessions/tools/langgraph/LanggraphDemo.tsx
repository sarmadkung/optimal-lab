"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { FIRST, FIXED, MAX_ATTEMPTS, RECURSION_LIMIT, SCENARIOS, runGraph, type Checkpointer, type Design, type Scenario } from "@/lib/langgraphSim";

const ACCENT = "var(--tools)";

export default function LanggraphDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [sc, setSc] = useState<Scenario>("crash");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const r = runGraph(sc, d);
  const scenario = SCENARIOS.find((s) => s.id === sc)!;

  const nodes: MapNode[] = [
    { id: "app", label: "Your API", sub: "thread_id per ticket", at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "graph", label: "Graph runner", sub: `${r.steps.filter((s) => s.note !== "process restarts").length} steps run`, at: [50, 50], mobileAt: [75, 12], state: r.ok ? "good" : "bad" },
    { id: "model", label: "Model", sub: `${r.llmCalls} calls`, at: [86, 18], mobileAt: [75, 42], state: "active" },
    { id: "docs", label: "Docs search", sub: "retrieve", at: [86, 82], mobileAt: [75, 74], state: "active" },
    { id: "store", label: "Checkpointer", sub: d.checkpointer === "none" ? "none" : d.checkpointer === "memory" ? "in memory" : "Postgres", at: [14, 82], mobileAt: [25, 42], state: d.checkpointer === "postgres" ? "good" : d.checkpointer === "memory" ? "wait" : "dim" },
    { id: "person", label: "Reviewer", sub: d.interrupt ? "approves drafts" : "not asked", at: [50, 14], mobileAt: [25, 74], state: d.interrupt ? "active" : "dim" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("in", ["app", "graph"], { label: "ticket" })
    : stage === 1 ? [...hops("m", ["graph", "model", "graph"], { label: "classify / grade" }), ...hops("dsr", ["graph", "docs", "graph"], { label: "retrieve", start: 0.3 })]
    : stage === 2 ? (d.checkpointer === "none" ? [] : hops("cp", ["graph", "store"], { label: `${r.checkpoints} checkpoints` }))
    : stage === 3 ? (d.interrupt && d.checkpointer !== "none" ? hops("rv", ["graph", "person", "graph"], { label: sc === "reject" ? "rejected, then approved" : "approve?" }) : [])
    : stage === 4 ? hops("out", ["graph", "app"], { label: r.ok ? r.outcome.split(",")[0] : "error", tone: r.ok && !r.sentWithoutReview ? "good" : "bad" })
    : [];

  const captions = [
    `Step 1: a ticket starts a run on its own thread. Scenario: ${scenario.one}.`,
    `Step 2: ${r.steps.map((s) => (s.note === "process restarts" ? "✕ restart" : s.node)).join(" → ")}.`,
    d.checkpointer === "none" ? "Step 3: nothing is saved between steps." : `Step 3: state is saved after each step to ${d.checkpointer === "memory" ? "memory, which a restart wipes" : "Postgres"}.`,
    d.interrupt ? (d.checkpointer === "none" ? "Step 4: the graph can't pause for review without somewhere to save the run." : "Step 4: the run pauses before sending; the reviewer's answer resumes the same thread.") : "Step 4: the draft goes out without anyone seeing it.",
    `Step 5: ${r.outcome}${r.redone ? `; ${r.redone} steps ran twice` : ""}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${r.outcome} · ${r.llmCalls} model calls · ${r.redone} steps redone · ${r.checkpoints} checkpoints.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="Tools · interactive"
        title="LangGraph"
        blurb="LangGraph describes an agent as a graph: nodes do one step and update shared state, edges (some conditional) choose the next node, and a checkpointer saves state after every step. That's what lets a run pause for a person, survive a restart, and stop a loop. Run one support agent through four things that go wrong."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Your API, the graph runner, the model, docs search, a checkpointer and a reviewer"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "app", to: "graph", label: "invoke" },
                  { from: "graph", to: "model", label: "LLM nodes" },
                  { from: "graph", to: "docs", label: "retrieve" },
                  { from: "graph", to: "store", label: "save state", dim: d.checkpointer === "none" },
                  { from: "graph", to: "person", label: "interrupt", dim: !d.interrupt },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <Trace d={d} sc={sc} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices<Scenario> label="What happens" accent={ACCENT} value={sc} onChange={setSc} options={SCENARIOS.map((s) => ({ id: s.id, label: s.label }))} />
              </div>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Graph only
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Checkpoints + review + cap
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Running the graph…">
                Run the ticket
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Draw the agent as nodes and edges" what="Each node is one function that reads state and returns an update. Conditional edges look at the state to choose what runs next: retry retrieval when the docs aren't relevant, otherwise draft." accent={ACCENT} active={at(0)}>
                <p className="font-mono text-[11px] leading-relaxed">
                  classify → retrieve → grade
                  <br />
                  grade: relevant → draft · not → rewrite → retrieve{d.attemptCap ? ` · after ${MAX_ATTEMPTS} → escalate` : ""}
                  <br />
                  draft → {d.interrupt ? "review: approved → send · rejected → draft" : "send"}
                </p>
              </FlowStep>
              <FlowArrow label="state updates" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Save state after every step" what="A checkpointer writes the state after each step, keyed by thread. In memory is fine for a notebook and gone after a restart; a database checkpointer lets any process pick the thread up where it stopped." accent={ACCENT} active={at(1)}>
                <Choices<Checkpointer> label="Checkpointer" accent={ACCENT} value={d.checkpointer} onChange={(v) => set({ checkpointer: v })} options={[{ id: "none", label: "None" }, { id: "memory", label: "In memory" }, { id: "postgres", label: "Postgres" }]} />
              </FlowStep>
              <FlowArrow label="checkpoints" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Pause for a person with an interrupt" what="An interrupt before “send” stops the run and returns. Hours later, the reviewer's answer is sent to the same thread and the graph resumes from the saved state. A rejection routes back to draft with their note." accent={ACCENT} active={at(2)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.interrupt} onChange={(e) => set({ interrupt: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Interrupt before sending
                </label>
              </FlowStep>
              <FlowArrow label="approved" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Bound the loops in the state, not just the runner" what={`The runner stops any run after ${RECURSION_LIMIT} steps with an error. Counting attempts in the state and routing to a fallback after ${MAX_ATTEMPTS} ends the loop on purpose, with an answer.`} accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.attemptCap} onChange={(e) => set({ attemptCap: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Escalate to a person after {MAX_ATTEMPTS} retrieval attempts
                </label>
              </FlowStep>
              <FlowArrow label="result" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Count model calls and repeated work" what="Every step that runs twice is model calls paid twice. Every run that ends in an error is a ticket nobody answered." accent={ACCENT} active={at(4)}>
                <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-xs">
                  <dt>Outcome</dt>
                  <dd className="text-right" style={{ color: r.ok && !r.sentWithoutReview ? "var(--good)" : "var(--bad)" }}>{r.outcome}</dd>
                  <dt>Model calls</dt>
                  <dd className="text-right font-mono">{r.llmCalls}</dd>
                  <dt>Steps run twice</dt>
                  <dd className="text-right font-mono" style={{ color: r.redone ? "var(--bad)" : "var(--good)" }}>{r.redone}</dd>
                </dl>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The graph runner works like LangGraph&apos;s (state updates, conditional edges, checkpoints, interrupts, the step limit). What the model returns is illustrative.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Trace({ d, sc }: { d: Design; sc: Scenario }) {
  const r = runGraph(sc, d);
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Every step the graph ran, with checkpoints">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">steps and checkpoints</p>
        <p className="font-mono text-xs" style={{ color: r.ok ? "var(--good)" : "var(--bad)" }}>
          {r.steps.length} entries
        </p>
      </div>
      <ol className="mt-3 max-h-80 space-y-0.5 overflow-y-auto font-mono text-[11px]">
        {r.steps.map((s, i) => (
          <li key={i} className="grid grid-cols-[1.5rem_5rem_minmax(0,1fr)] gap-2" style={{ color: s.note === "process restarts" ? "var(--bad)" : s.redo ? "var(--faint)" : "var(--text)" }}>
            <span className="text-[var(--faint)]">{s.checkpoint ?? "·"}</span>
            <span>{s.note === "process restarts" ? "✕" : s.node}</span>
            <span className="min-w-0 truncate">{s.note === "process restarts" ? "process restarts" : s.redo ? `${s.note || ""} (lost, runs again)` : s.note}</span>
          </li>
        ))}
        {!r.ok && <li className="text-[var(--bad)]">{r.outcome}</li>}
      </ol>
    </section>
  );
}
