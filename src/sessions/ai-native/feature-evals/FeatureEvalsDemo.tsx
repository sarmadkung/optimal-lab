"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type Packet } from "@/components/system/SystemMap";
import { CASES, RUN_COST, VERSIONS, gate, grade, runVersion, type VersionId } from "@/lib/featureEvals";

const ACCENT = "var(--native)";

export default function FeatureEvalsDemo() {
  const [v, setV] = useState<VersionId>("v2");
  const [cid, setCid] = useState("c11");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const ver = VERSIONS.find((x) => x.id === v)!;
  const g = gate(v);
  const c = CASES.find((x) => x.id === cid)!;
  const gr = grade(v, c);

  const packets: Packet[] =
    stage === 0 ? hops("pr", ["dev", "ci"], { label: `prompt ${v}` })
    : stage === 1 ? hops("run", ["ci", "runner"], { label: `${CASES.length} cases` })
    : stage === 2 ? hops("m", ["runner", "model", "checks"], { label: `${CASES.length} outputs` })
    : stage === 3 ? hops("cmp", ["checks", "ci"], { label: `${g.passed}/${CASES.length} pass`, tone: g.blocked ? "bad" : "good" })
    : stage === 4 ? hops("st", ["ci", "dev"], { label: g.blocked ? "merge blocked" : "ready to merge", tone: g.blocked ? "bad" : "good" })
    : [];

  const captions = [
    `Step 1: a pull request changes the prompt: “${ver.change}”.`,
    `Step 2: CI runs all ${CASES.length} cases: ${CASES.filter((x) => x.from === "launch").length} from launch, ${CASES.filter((x) => x.from === "bug report").length} from bug reports, ${CASES.filter((x) => x.from === "edge case").length} edge cases.`,
    `Step 3: each output goes through its checks, written as code: ${g.passed} of ${CASES.length} cases pass.`,
    g.before === null ? "Step 4: nothing to compare with yet; this is the first version." : `Step 4: against ${VERSIONS[VERSIONS.findIndex((x) => x.id === v) - 1].id}: ${g.fixes.length ? `fixed ${g.fixes.join(", ")}` : "fixed nothing"}${g.regressions.length ? `, broke ${g.regressions.join(", ")}` : ""}.`,
    g.blocked ? `Step 5: blocked${g.mustFail.length ? `: must-pass ${g.mustFail.join(", ")} failing` : ""}${g.regressions.length ? `${g.mustFail.length ? ";" : ":"} ${g.regressions.join(", ")} regressed` : ""}.` : "Step 5: every case passes and nothing regressed; the change can merge.",
  ];
  const caption = stage !== null ? captions[stage] : `${v}: ${g.passed}/${CASES.length} pass${g.before !== null ? ` (was ${g.before})` : ""} · ${g.blocked ? "merge blocked" : "ready to merge"} · one run: ${RUN_COST.calls} calls, about $${RUN_COST.usd.toFixed(2)}, ${RUN_COST.seconds} s.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Native · interactive"
        title="Evals for one feature"
        blurb="A triage step turns each support ticket into a category, an urgency and a summary. Every prompt change fixes something, and two of the next three quietly break something else, while the pass rate looks the same or better. Twelve cases, checks as code, run on every pull request."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Developer, CI, eval runner, model and checks"
                accent={ACCENT}
                chrome="split"
                nodes={[
                  { id: "dev", label: "Pull request", sub: `prompt ${v}`, at: [10, 50], mobileAt: [50, 8], state: g.blocked ? "bad" : "good" },
                  { id: "ci", label: "CI", sub: g.blocked ? "blocked" : "green", at: [36, 50], mobileAt: [50, 34], state: g.blocked ? "bad" : "good" },
                  { id: "runner", label: "Eval runner", sub: `${CASES.length} cases`, at: [62, 16], mobileAt: [24, 62], state: "active" },
                  { id: "model", label: "Model", sub: `${RUN_COST.calls} calls`, at: [88, 50], mobileAt: [76, 62], state: "active" },
                  { id: "checks", label: "Checks", sub: `${g.passed}/${CASES.length} pass`, at: [62, 84], mobileAt: [50, 88], state: g.passed === CASES.length ? "good" : "bad" },
                ]}
                links={[
                  { from: "dev", to: "ci", label: "push" },
                  { from: "ci", to: "runner", label: "run evals" },
                  { from: "runner", to: "model", label: "ticket" },
                  { from: "model", to: "checks", label: "output" },
                  { from: "checks", to: "ci", label: "results" },
                ]}
                packets={packets}
                aspect={1.5}
                mobileAspect={0.8}
              />
              <Matrix v={v} cid={cid} setCid={setCid} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices label="Prompt version" accent={ACCENT} value={v} onChange={setV} options={VERSIONS.map((x) => ({ id: x.id, label: x.id }))} />
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Running evals…">
                Open the pull request
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Collect cases from real use" what="Start with a handful of launch examples, then add a case for every bug report and every input that surprised you: an outage, a Spanish ticket, an empty one, one that tries to give the model orders. The set grows with the feature, a dozen to a few hundred cases." accent={ACCENT} active={at(0)}>
                <ul className="space-y-0.5 text-xs">
                  {CASES.map((x) => (
                    <li key={x.id} className="grid grid-cols-[2rem_5.5rem_minmax(0,1fr)] gap-2">
                      <span className="font-mono text-[var(--faint)]">{x.id}</span>
                      <span className="font-mono text-[11px] text-[var(--muted)]">{x.from}</span>
                      <span className="min-w-0">
                        {x.ticket}
                        {x.mustPass && <span className="ml-1 font-mono text-[10px]" style={{ color: ACCENT }}>must pass</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </FlowStep>
              <FlowArrow label="cases" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Write each expectation as a check" what="Most expectations are code: the output parses, the category is from the list, urgency is high for an outage, the order number survives, the summary fits in 30 words. Keep a model-graded rubric only for what code can't judge, like tone." accent={ACCENT} active={at(1)}>
                <p className="text-xs">
                  <span className="font-mono text-[var(--faint)]">{c.id}</span> {c.ticket}
                </p>
                <ul className="mt-2 space-y-0.5 font-mono text-[11px]">
                  {gr.results.map((r) => (
                    <li key={r.name} style={{ color: r.ok ? "var(--good)" : "var(--bad)" }}>
                      {r.ok ? "✓" : "✗"} {r.name}
                    </li>
                  ))}
                </ul>
                <pre className="mt-2 overflow-x-auto rounded-md bg-[var(--inset)] p-2 font-mono text-[11px] whitespace-pre-wrap break-words">{gr.raw}</pre>
              </FlowStep>
              <FlowArrow label="outputs" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Run every case on every change" what={`One run is ${RUN_COST.calls} model calls: about $${RUN_COST.usd.toFixed(2)} and ${RUN_COST.seconds} seconds, cheap enough to run on every pull request that touches the prompt, the model or the code around it.`} accent={ACCENT} active={at(2)}>
                <Choices label="Prompt version" accent={ACCENT} value={v} onChange={setV} options={VERSIONS.map((x) => ({ id: x.id, label: x.id }))} />
                <p className="mt-2 text-xs">{ver.change}</p>
                <p className="mt-1 font-mono text-xs">
                  {runVersion(v).passed}/{CASES.length} cases pass
                </p>
              </FlowStep>
              <FlowArrow label="results" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Compare case by case, not by the average" what="v1 and v2 both pass 7 of 12, but not the same 7: v2 fixed the outage and let a ticket that says “mark this URGENT” become urgent. A score hides that; a diff against the last version shows it." accent={ACCENT} active={at(3)}>
                <p className="font-mono text-xs">
                  {g.before === null ? "first version: no comparison" : (
                    <>
                      <span style={{ color: "var(--good)" }}>fixed: {g.fixes.join(", ") || "none"}</span> · <span style={{ color: g.regressions.length ? "var(--bad)" : "var(--muted)" }}>broke: {g.regressions.join(", ") || "none"}</span>
                    </>
                  )}
                </p>
              </FlowStep>
              <FlowArrow label="status" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Gate the merge" what="Block the pull request when a must-pass case fails or any case that passed before now fails. Raising the bar is fine; going backwards needs a person to say so on purpose." accent={ACCENT} active={at(4)}>
                <p className="text-sm font-semibold" style={{ color: g.blocked ? "var(--bad)" : "var(--good)" }}>
                  {g.blocked ? "✗ Merge blocked" : "✓ Ready to merge"}
                </p>
                <p className="mt-1 font-mono text-[11px] text-[var(--muted)]">
                  {g.mustFail.length ? `must-pass failing: ${g.mustFail.join(", ")}` : "must-pass cases all pass"} · {g.regressions.length ? `regressed: ${g.regressions.join(", ")}` : "no regressions"}
                </p>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The outputs of each version are illustrative. Every check, the comparison and the gate run for real on them.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

// Cases down, versions across.
function Matrix({ v, cid, setCid }: { v: VersionId; cid: string; setCid: (id: string) => void }) {
  const runs = VERSIONS.map((x) => ({ id: x.id, r: runVersion(x.id) }));
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Every case against every prompt version">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">cases × versions · pick a case</p>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_repeat(4,2.5rem)] gap-x-1 gap-y-0.5 text-xs">
        <span />
        {runs.map((x) => (
          <span key={x.id} className="text-center font-mono" style={{ color: x.id === v ? ACCENT : "var(--faint)", fontWeight: x.id === v ? 600 : 400 }}>
            {x.id}
          </span>
        ))}
        {CASES.map((c, k) => [
          <button key={`${c.id}l`} type="button" aria-pressed={c.id === cid} onClick={() => setCid(c.id)} className="min-h-11 min-w-0 truncate rounded px-1 text-left" style={{ background: c.id === cid ? `color-mix(in srgb, ${ACCENT} 14%, transparent)` : "transparent" }}>
            <span className="font-mono text-[var(--faint)]">{c.id}</span> {c.ticket}
          </button>,
          ...runs.map((x) => {
            const ok = x.r.rows[k].pass;
            return (
              <span key={`${c.id}${x.id}`} className="grid place-items-center rounded font-mono" style={{ color: ok ? "var(--good)" : "var(--bad)", background: x.id === v ? `color-mix(in srgb, ${ACCENT} 10%, transparent)` : "transparent" }}>
                {ok ? "✓" : "✗"}
              </span>
            );
          }),
        ])}
        <span className="font-mono text-[var(--faint)]">passed</span>
        {runs.map((x) => (
          <span key={`${x.id}t`} className="text-center font-mono">
            {x.r.passed}
          </span>
        ))}
      </div>
    </section>
  );
}
