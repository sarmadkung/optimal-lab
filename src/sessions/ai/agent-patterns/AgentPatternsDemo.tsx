"use client";

import { Fragment, useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, type NodeState, type Packet } from "@/components/system/SystemMap";
import { PATTERNS, seconds, type PatternId } from "@/lib/agentPatterns";

const ACCENT = "var(--ai)";
const PREDICT_COLOR = { high: "var(--good)", medium: "var(--auto)", low: "var(--bad)" };

export default function AgentPatternsDemo() {
  const [id, setId] = useState<PatternId>("chain");
  const p = PATTERNS.find((x) => x.id === id)!;
  const { stage, busy, run } = useWalk(p.steps.length, 1300);
  const step = stage === null ? null : p.steps[stage];

  // Nodes touched by the current step light up; the dimmed ones are the paths not taken.
  const touched = new Set(step ? step.hops.flatMap((h) => [h.from, h.to]) : []);
  const allHops = p.steps.flatMap((s) => s.hops);
  const links = allHops.filter((h, i) => allHops.findIndex((o) => (o.from === h.from && o.to === h.to) || (o.from === h.to && o.to === h.from)) === i);
  const nodeState = (nodeId: string): NodeState => {
    if (id === "route" && nodeId === "tech") return "dim";
    if (!step) return "idle";
    if (stage === p.steps.length - 1 && step.hops.some((h) => h.to === nodeId) && (nodeId === "out" || nodeId === "translate")) return "good";
    return touched.has(nodeId) ? "active" : "idle";
  };
  const packets: Packet[] = step
    ? step.hops.map((h, i) => ({ id: `${id}-${stage}-${i}`, from: h.from, to: h.to, label: h.label, delay: id === "parallel" || (id === "orchestrator" && stage === 1) ? 0 : i * 0.5, duration: 0.5 }))
    : [];

  const caption = step ? `${step.title}. ${step.output}` : `${p.name}: ${p.when}`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Engineering · interactive"
        title="Agent patterns: workflow or agent?"
        blurb="Most “agents” in production are workflows: model calls wired together by your code. A true agent chooses its own next step in a loop. Run six patterns from Anthropic's Building Effective Agents and compare the cost of each."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <SystemMap
              title={`${p.name}: ${p.task}`}
              accent={ACCENT}
              chrome="split"
              nodes={p.nodes.map((n) => ({ ...n, state: nodeState(n.id) }))}
              links={links.map((h) => ({ from: h.from, to: h.to, label: h.label, dim: id === "route" && (h.to === "tech" || h.from === "tech") }))}
              packets={packets}
              aspect={2.2}
              mobileAspect={0.9}
            />
          }
          panel={
            <SystemMapPanel caption={caption}>
              <Choices
                label="Pattern"
                accent={ACCENT}
                value={id}
                onChange={(next) => {
                  if (!busy) setId(next);
                }}
                options={PATTERNS.map((x) => ({ id: x.id, label: x.name }))}
              />
              <dl className="grid w-full grid-cols-3 gap-2 text-center">
                <Stat label="model calls" value={String(p.calls)} />
                <Stat label="wall time" value={`~${seconds(p)}s`} />
                <Stat label="predictable" value={p.predictable} color={PREDICT_COLOR[p.predictable]} />
              </dl>
              <p className="w-full text-sm text-[var(--muted)]">
                <span className="font-medium text-[var(--text)]">Task:</span> {p.task}
              </p>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Running…">
                Run this pattern
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              {p.steps.map((s, i) => (
                <Fragment key={`${id}-${s.title}`}>
                  <FlowStep n={i + 1} title={s.title} what={s.what} accent={ACCENT} active={stage === i}>
                    <p className="text-sm">{s.output}</p>
                  </FlowStep>
                  {i < p.steps.length - 1 && <FlowArrow label={s.hops.at(-1)?.label} accent={ACCENT} active={stage === i + 1} />}
                </Fragment>
              ))}
            </>
          }
        />
      </div>

      <section className="mt-8" aria-label="All six patterns compared">
        <h2 className="text-lg font-semibold">Compare all six</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Start at the top. Move down only when the simpler pattern measurably fails.</p>
        <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--line)]">
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="bg-[var(--panel)] text-left text-xs text-[var(--faint)]">
              <tr>
                <th className="px-3 py-2 font-normal">Pattern</th>
                <th className="px-3 py-2 font-normal">Who decides the path</th>
                <th className="px-3 py-2 text-right font-normal">Calls</th>
                <th className="px-3 py-2 text-right font-normal">Wall time</th>
                <th className="px-3 py-2 font-normal">Predictable</th>
              </tr>
            </thead>
            <tbody>
              {PATTERNS.map((x) => (
                <tr key={x.id} className="border-t border-[var(--line)]" style={x.id === id ? { background: `color-mix(in srgb, ${ACCENT} 10%, transparent)` } : undefined}>
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => !busy && setId(x.id)} className="min-h-11 text-left font-medium underline-offset-2 hover:underline">
                      {x.name}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-[var(--muted)]">{x.kind === "agent" ? "The model, every turn" : x.id === "orchestrator" ? "A model plans, code runs it" : "Your code"}</td>
                  <td className="px-3 py-2 text-right font-mono">{x.calls}</td>
                  <td className="px-3 py-2 text-right font-mono">~{seconds(x)}s</td>
                  <td className="px-3 py-2" style={{ color: PREDICT_COLOR[x.predictable] }}>
                    {x.predictable}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </SessionPage>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col-reverse rounded-lg bg-[var(--inset)] px-2 py-2">
      <dt className="text-[10px] uppercase tracking-wider text-[var(--faint)]">{label}</dt>
      <dd className="font-mono text-base" style={{ color }}>
        {value}
      </dd>
    </div>
  );
}
