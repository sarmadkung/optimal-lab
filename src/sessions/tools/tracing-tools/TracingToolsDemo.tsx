"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { FIRST, FIXED, INSTRUMENTS, PER_DAY, TAIL_SHARE, evaluate, trace, type Design, type Instrument } from "@/lib/tracingTools";

const ACCENT = "var(--tools)";

export default function TracingToolsDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const r = evaluate(d);
  const t = trace(d);
  const keptPct = Math.round(r.kept * 1000) / 10;

  const nodes: MapNode[] = [
    { id: "app", label: "Support bot", sub: `${PER_DAY.toLocaleString("en-US")} requests a day`, at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "proxy", label: "LLM proxy", sub: d.instrument === "proxy" ? "records model calls" : "not used", at: [50, 18], mobileAt: [75, 12], state: d.instrument === "proxy" ? "active" : "dim" },
    { id: "model", label: "Model API", sub: "1 call a request", at: [86, 18], mobileAt: [75, 42], state: "active" },
    { id: "steps", label: "Retrieval + tools", sub: d.steps && d.instrument !== "proxy" ? "recorded as spans" : "invisible", at: [14, 82], mobileAt: [25, 42], state: d.steps && d.instrument !== "proxy" ? "good" : "dim" },
    { id: "backend", label: "Tracing backend", sub: `${r.gbMonth.toFixed(1)} GB a month`, at: [50, 82], mobileAt: [25, 76], state: r.answered >= 4 ? "good" : "wait" },
    { id: "you", label: "You, next month", sub: `${r.answered} of ${r.answers.length} answered`, at: [86, 82], mobileAt: [75, 76], state: r.answered === r.answers.length ? "good" : "bad" },
  ];

  const packets: Packet[] =
    stage === 0 ? (d.instrument === "proxy" ? hops("p", ["app", "proxy", "model"], { label: "prompt" }) : hops("s", ["app", "model"], { label: "prompt" }))
    : stage === 1 ? (d.steps && d.instrument !== "proxy" ? hops("st", ["steps", "backend"], { label: "spans" }) : [])
    : stage === 2 ? hops("t", [d.instrument === "proxy" ? "proxy" : "app", "backend"], { label: d.tags ? "trace + tags" : "trace" })
    : stage === 3 ? hops("r", ["app", "backend"], { label: d.redact ? "[CARD] [EMAIL]" : "raw card + email", tone: d.redact ? "good" : "bad" })
    : stage === 4 ? hops("q", ["backend", "you"], { label: `${r.answered}/${r.answers.length} answers`, tone: r.answered === r.answers.length ? "good" : "bad" })
    : [];

  const captions = [
    d.instrument === "proxy" ? "Step 1: the app calls the model through a proxy that records each call; nothing else is seen." : d.instrument === "sdk" ? "Step 1: the tracing tool's SDK wraps your functions and records each one." : "Step 1: your code emits OpenTelemetry GenAI spans; any backend that reads OTLP can store them.",
    d.steps && d.instrument !== "proxy" ? "Step 2: retrieval, the tool call and the guardrail are spans inside the same trace." : "Step 2: only the model call is recorded.",
    d.tags ? "Step 3: each trace carries the customer, the prompt version and later the user's feedback." : "Step 3: traces carry no tags; they can't be grouped by customer, version or feedback.",
    d.redact ? "Step 4: card numbers and emails are masked before the trace is stored." : "Step 4: prompts are stored as sent, card numbers and emails included.",
    `Step 5: ${keptPct}% of traces kept, ${r.gbMonth.toFixed(1)} GB a month; ${r.answered} of ${r.answers.length} questions answerable.`,
  ];
  const caption = stage !== null ? captions[stage] : `${r.answered} of ${r.answers.length} questions answerable · ${r.gbMonth.toFixed(1)} GB a month · ${keptPct}% of traces kept · ${d.redact ? "no raw PII" : "raw card numbers and emails stored"}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="Tools · interactive"
        title="Tracing tools"
        blurb="Langfuse, LangSmith, Helicone and OpenTelemetry-based tools record every model call with its prompt, tokens, cost and latency. Which one you pick matters less than what you capture: next month someone will ask which customer costs most, why an answer was wrong, and whether card numbers are sitting in your traces."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="The support bot, an LLM proxy, the model API, retrieval and tool steps, the tracing backend, and you next month"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "app", to: "proxy", label: "base URL", dim: d.instrument !== "proxy" },
                  { from: "proxy", to: "model", label: "call" },
                  { from: "steps", to: "backend", label: "spans", dim: !(d.steps && d.instrument !== "proxy") },
                  { from: "app", to: "backend", label: "traces" },
                  { from: "backend", to: "you", label: "queries" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="One trace as stored">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">one trace</p>
                <ul className="mt-2 space-y-1 font-mono text-[11px]">
                  {t.spans.map((s) => (
                    <li key={s.name} className="grid grid-cols-[minmax(0,1fr)_3.5rem] items-center gap-2" style={{ paddingLeft: s.depth * 12 }}>
                      <span className="min-w-0 truncate">{s.name}</span>
                      <span className="relative block h-2 rounded bg-[var(--track)]">
                        <span className="absolute inset-y-0 left-0 block rounded" style={{ width: `${(s.ms / 2900) * 100}%`, background: s.kind === "llm" ? ACCENT : "var(--c1)" }} />
                      </span>
                    </li>
                  ))}
                </ul>
                <ul className="mt-2 space-y-0.5 break-words font-mono text-[10px] text-[var(--muted)]">
                  {t.attrs.map((a) => (
                    <li key={a} style={{ color: !d.redact && a.startsWith("prompt") ? "var(--bad)" : undefined }}>
                      {a}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Proxy, everything raw
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Spans, tags, redaction, tail sampling
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Tracing…">
                Trace one request
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Choose how calls get recorded" what="A proxy needs one line (a new base URL) and only sees model calls. A tool's SDK sees whatever functions you wrap. OpenTelemetry's GenAI conventions give standard spans you can send to any backend, and switch later." accent={ACCENT} active={at(0)}>
                <Choices<Instrument> label="Instrumentation" accent={ACCENT} value={d.instrument} onChange={(v) => set({ instrument: v })} options={INSTRUMENTS.map((x) => ({ id: x.id, label: x.label }))} />
                <p className="mt-1 text-[11px] text-[var(--faint)]">{INSTRUMENTS.find((x) => x.id === d.instrument)!.one}</p>
              </FlowStep>
              <FlowArrow label="spans" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Record the steps around the model" what="Most wrong answers start before the model: the wrong document retrieved, a tool returning stale data. Record retrieval, tool calls and checks as spans in the same trace." accent={ACCENT} active={at(1)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.steps} onChange={(e) => set({ steps: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Record retrieval, tool calls and checks
                </label>
                {d.instrument === "proxy" && <p className="text-[11px] text-[var(--faint)]">A proxy can&apos;t see these; pick the SDK or OpenTelemetry.</p>}
              </FlowStep>
              <FlowArrow label="traces" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Tag traces with what you'll filter by" what="Customer or user id, prompt version, model, feature, and the user's thumbs up or down. Without them, a million traces can't answer a single “which” question." accent={ACCENT} active={at(2)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.tags} onChange={(e) => set({ tags: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Customer, prompt version and feedback on every trace
                </label>
              </FlowStep>
              <FlowArrow label="stored" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Mask personal data before it's stored" what="Traces copy prompts verbatim, so whatever users paste is now in another system with its own access and retention. Mask cards, emails and IDs at the source." accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.redact} onChange={(e) => set({ redact: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Redact PII before sending traces
                </label>
              </FlowStep>
              <FlowArrow label="next month" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Sample, but keep the interesting ones" what={`Keeping every trace is the most expensive option. A flat 10% sample drops most of the bad answers you'll want later. Tail sampling keeps errors, slow requests and thumbs-down in full (about ${Math.round(TAIL_SHARE * 100)}%) and a small share of the rest.`} accent={ACCENT} active={at(4)}>
                <Choices label="Keep" accent={ACCENT} value={String(d.sampling)} onChange={(v) => set({ sampling: v === "tail" ? "tail" : (Number(v) as 1 | 0.1) })} options={[{ id: "1", label: "Every trace" }, { id: "0.1", label: "10% at random" }, { id: "tail", label: "Tail-based" }]} />
                <ul className="mt-2 space-y-1 text-xs">
                  {r.answers.map((a) => (
                    <li key={a.id} className="flex gap-2">
                      <span style={{ color: a.blocked ? "var(--bad)" : "var(--good)" }} aria-hidden>
                        {a.blocked ? "✕" : "✓"}
                      </span>
                      <span>
                        {a.q}
                        {a.blocked && <span className="block text-[11px] text-[var(--faint)]">{a.blocked}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Storage sizes per trace are estimates; which question each setup can answer and the storage arithmetic run here.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
