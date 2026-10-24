"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { CASES, FIRST, FIXED, PASS_SCORE, VARIANTS, evaluate, type Design } from "@/lib/evalTools";

const ACCENT = "var(--tools)";

export default function EvalToolsDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const r = evaluate(d);
  const b = r.regressions.find((x) => x.v === "v2B")!;

  const nodes: MapNode[] = [
    { id: "cases", label: "Test cases", sub: `${CASES.length} from real tickets`, at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "runner", label: "Eval runner", sub: `${CASES.length} × ${VARIANTS.length} variants`, at: [50, 18], mobileAt: [75, 12], state: "active" },
    { id: "models", label: "Models under test", sub: "A and B", at: [86, 18], mobileAt: [75, 42], state: "active" },
    { id: "code", label: "Code assertions", sub: d.code ? "contains · JSON · length" : "off", at: [14, 82], mobileAt: [25, 42], state: d.code ? "good" : "dim" },
    { id: "judge", label: "Judge model", sub: d.judge ? `rubric × ${d.repeats}` : "off", at: [50, 82], mobileAt: [25, 76], state: d.judge ? (d.repeats === 3 ? "good" : "wait") : "dim" },
    { id: "gate", label: "Merge gate", sub: d.gate ? (r.blocked ? "blocks the change" : "passes") : "report only", at: [86, 82], mobileAt: [75, 76], state: d.gate ? (r.blocked ? "wait" : "good") : "dim" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("c", ["cases", "runner"], { label: `${CASES.length} cases` })
    : stage === 1 ? hops("g", ["runner", "models", "runner"], { label: `${CASES.length * VARIANTS.length} answers` })
    : stage === 2 ? (d.code ? hops("a", ["runner", "code", "runner"], { label: "assertions" }) : [])
    : stage === 3 ? (d.judge ? hops("j", ["runner", "judge", "runner"], { label: `score × ${d.repeats}` }) : [])
    : stage === 4 ? hops("m", ["runner", "gate"], { label: `${b.flagged} regression${b.flagged === 1 ? "" : "s"} flagged`, tone: b.falseAlarms || b.missed ? "bad" : "good" })
    : [];

  const captions = [
    `Step 1: ${CASES.length} test cases, each an input with checks and a rubric.`,
    `Step 2: each case runs on ${VARIANTS.map((v) => v.label).join(", ")}.`,
    d.code ? "Step 3: code assertions run: required phrases, banned words, valid JSON, length." : "Step 3: no code assertions; only a model judges.",
    d.judge ? `Step 4: a judge model scores each answer against its rubric ${d.repeats === 3 ? "three times and averages" : "once"}; it passes at ${PASS_SCORE}.` : "Step 4: no judge; nothing checks tone or helpfulness.",
    `Step 5: for the cheaper model, ${b.caught} of ${b.real} real regressions caught, ${b.missed} missed, ${b.falseAlarms} false alarm${b.falseAlarms === 1 ? "" : "s"}.`,
  ];
  const caption = stage !== null ? captions[stage] : `Cheaper model: ${b.caught} of ${b.real} regressions caught · ${b.missed} missed · ${b.falseAlarms} false alarm${b.falseAlarms === 1 ? "" : "s"} · ${r.calls} model calls, $${r.cost.toFixed(2)} a run${d.gate ? (r.blocked ? " · merge blocked" : " · merge allowed") : ""}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="Tools · interactive"
        title="Eval tools"
        blurb="promptfoo, Braintrust and similar tools run a fixed test set against every variant of a prompt or model and show a pass/fail grid. A support team tries a new prompt (v2) and a cheaper model (B). Choose what checks the answers and how often, and see which real problems the grid shows, and which it invents."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Test cases, the eval runner, the models under test, code assertions, a judge model and the merge gate"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "cases", to: "runner", label: "cases" },
                  { from: "runner", to: "models", label: "generate" },
                  { from: "runner", to: "code", label: "assert", dim: !d.code },
                  { from: "runner", to: "judge", label: "grade", dim: !d.judge },
                  { from: "runner", to: "gate", label: "results" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Pass and fail for every case and variant">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">results grid</p>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[22rem] text-left text-[11px]">
                    <thead>
                      <tr className="text-[var(--faint)]">
                        <th className="py-0.5 pr-2 font-normal">case</th>
                        {VARIANTS.map((v) => (
                          <th key={v.id} className="py-0.5 pr-2 font-normal">
                            {v.label.split(" (")[0]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {CASES.map((c, i) => (
                        <tr key={c.id} className="border-t border-[var(--line)]">
                          <td className="py-1 pr-2 font-mono">{c.id}</td>
                          {r.cells[i].map((cell) => (
                            <td key={cell.v} className="py-1 pr-2 font-mono" style={{ color: cell.pass ? "var(--good)" : "var(--bad)" }} title={cell.out}>
                              {cell.pass ? "pass" : "fail"}
                              {d.judge && <span className="text-[var(--faint)]"> {cell.avg.toFixed(1)}</span>}
                              {cell.pass !== cell.truth && <span className="text-[var(--c2)]"> !</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[11px] text-[var(--faint)]">! marks a verdict that disagrees with the settled answer: a miss or a false alarm.</p>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  One judge run
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Code + judge × 3 + gate
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Evaluating…">
                Run the eval
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Write cases from real conversations" what="Each case is an input plus what a good answer must do. Take them from real tickets, especially the ones that went wrong; a test set made up at a desk tests what you already know." accent={ACCENT} active={at(0)}>
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] leading-relaxed">{`- vars: { input: "${CASES[2].input}" }
  assert:
    - type: not-contains
      value: guarantee
    - type: llm-rubric
      value: ${CASES[2].rubric}`}</pre>
              </FlowStep>
              <FlowArrow label="answers" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Check in code whatever code can check" what="Required phrases, banned words, valid JSON, length. Code assertions are free, instant and never disagree with themselves. They catch “within a month” when the policy says 30 days, which a judge reading for tone lets through." accent={ACCENT} active={at(1)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.code} onChange={(e) => set({ code: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Run code assertions
                </label>
              </FlowStep>
              <FlowArrow label="the rest" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Use a judge for what needs reading" what={`Tone, helpfulness, whether a promise was made: a model grades against a rubric. A judge is a model too, and scores near the pass mark (${PASS_SCORE}) move between runs. Averaging three runs settles most of them, at three times the judge cost.`} accent={ACCENT} active={at(2)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.judge} onChange={(e) => set({ judge: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Grade with a judge model
                </label>
                <Choices label="Judge runs per answer" accent={ACCENT} value={String(d.repeats)} onChange={(v) => set({ repeats: Number(v) as 1 | 3 })} options={[{ id: "1", label: "1" }, { id: "3", label: "3, averaged" }]} />
              </FlowStep>
              <FlowArrow label="grid" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Compare with what's live" what="What matters is change: cases that passed on the live version and fail on the new one. A case failing everywhere is a known gap, not a regression." accent={ACCENT} active={at(3)}>
                <ul className="space-y-0.5 text-xs">
                  {r.regressions.map((x) => (
                    <li key={x.v}>
                      {VARIANTS.find((v) => v.id === x.v)!.label}: {x.flagged} flagged · {x.caught}/{x.real} real caught{x.falseAlarms ? ` · ${x.falseAlarms} false alarm` : ""}{x.missed ? ` · ${x.missed} missed` : ""}
                    </li>
                  ))}
                </ul>
              </FlowStep>
              <FlowArrow label="decision" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Gate the change on regressions" what="Run the suite in CI on every prompt or model change and block the merge when something that passed now fails. That only works if the suite rarely cries wolf." accent={ACCENT} active={at(4)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.gate} onChange={(e) => set({ gate: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Block the merge on any regression
                </label>
                <p className="font-mono text-xs">
                  {r.calls} model calls · ${r.cost.toFixed(2)} a run{d.gate ? (r.blocked ? " · blocked" : " · allowed") : ""}
                </p>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Answers and judge scores are illustrative. The assertions, the repeats, the regression count and the cost run here.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
