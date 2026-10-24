"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type NodeState, type Packet } from "@/components/system/SystemMap";
import { DEFECTS, FIRST, FIXED, FLAKE, FLAKE_QUARANTINED, MERGES, NIGHTS, PUSHES, STAGES, caughtWhere, minutes, month, pushRun, when, type DefectId, type Design, type Order, type When } from "@/lib/pipelineTests";

const ACCENT = "var(--ops)";
const WHEN_LABEL: Record<When, string> = { push: "every push", merge: "before merge", nightly: "nightly", off: "never" };
const WHEN_OPTS = (["push", "merge", "nightly", "off"] as When[]).map((w) => ({ id: w, label: WHEN_LABEL[w] }));
// Map position of each stage in the walk: lint and unit share the first box.
const STAGE_INDEX: Record<string, number> = { lint: 0, unit: 0, integration: 1, e2e: 2, load: 3 };

export default function PipelineTestsDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [defect, setDefect] = useState<DefectId>("logic");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const m = month(d);
  const def = DEFECTS.find((x) => x.id === defect)!;
  const c = caughtWhere(d, defect);
  const idx = def.stage ? STAGE_INDEX[def.stage] : 99;
  const caughtEarly = !!def.stage && c.good;
  const push = pushRun(d, def.stage);

  const st = (i: number, w: When): NodeState => {
    if (w === "off") return "dim";
    if (i === idx) return c.good ? "good" : "bad";
    // A push that fails stops later stages in a fail-fast pipeline; in parallel, push stages still run.
    if (caughtEarly && i > idx && (d.order === "failFast" || w !== "push")) return "dim";
    return "active";
  };
  const nodes: MapNode[] = [
    { id: "dev", label: "Push", sub: def.label.toLowerCase(), at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "fast", label: "Lint + unit", sub: `every push · ${minutes(d, "lint") + minutes(d, "unit")} min`, at: [50, 18], mobileAt: [75, 12], state: st(0, "push") },
    { id: "integ", label: "Integration", sub: `${WHEN_LABEL[d.integration]} · ${minutes(d, "integration")} min`, at: [86, 18], mobileAt: [75, 45], state: st(1, d.integration) },
    { id: "e2e", label: "End-to-end", sub: `${WHEN_LABEL[d.e2e]} · ${minutes(d, "e2e")} min${d.shards > 1 ? ` × ${d.shards}` : ""}`, at: [86, 82], mobileAt: [25, 45], state: st(2, d.e2e) },
    { id: "load", label: "Load test", sub: `${WHEN_LABEL[d.load]} · ${minutes(d, "load")} min`, at: [50, 82], mobileAt: [25, 80], state: st(3, d.load) },
    { id: "main", label: "main → production", sub: !def.stage ? "green" : c.good ? "never sees the defect" : c.when === "nightly" ? "defect on main overnight" : "defect in production", at: [14, 82], mobileAt: [75, 80], state: !def.stage || c.good ? "good" : "bad" },
  ];

  const ids = ["dev", "fast", "integ", "e2e", "load", "main"];
  const whens: When[] = ["push", d.integration, d.e2e, d.load];
  const packets: Packet[] = (() => {
    if (stage === null) return [];
    if (caughtEarly && stage > idx) return [];
    const caughtHere = stage === idx && caughtEarly;
    const label = stage === 4 ? (!def.stage || c.good ? "release" : "defect") : caughtHere ? "red ✕" : whens[stage] === "push" ? "push" : WHEN_LABEL[whens[stage]];
    const tone = caughtHere ? "good" : stage === 4 ? (!def.stage || c.good ? "good" : "bad") : stage === idx ? "bad" : undefined;
    return hops(`s${stage}`, [ids[stage], ids[stage + 1]], { label, tone });
  })();

  const verdict = def.stage ? `caught ${c.where}` : `a clean push is green in ${push.wait} min`;
  const captions = [
    `Step 1: lint and unit tests run on the push${d.order === "failFast" ? " first, cheapest first" : ", alongside everything else"}${idx === 0 ? `: ${verdict}` : ""}.`,
    `Step 2: integration tests run ${WHEN_LABEL[d.integration]}${idx === 1 ? `: ${verdict}` : ""}.`,
    `Step 3: end-to-end tests run ${WHEN_LABEL[d.e2e]}${d.shards > 1 ? ` in ${d.shards} shards` : ""}${idx === 2 ? `: ${verdict}` : ""}.`,
    `Step 4: the load test runs ${WHEN_LABEL[d.load]}${idx === 3 ? `: ${verdict}` : ""}.`,
    `Step 5: ${def.stage ? verdict : `green; the push waited ${push.wait} min`}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${def.label}: ${verdict}. Month: ${m.ci.toLocaleString("en-US")} CI minutes · clean push ${m.clean} min · ${m.flaky} flaky failures · ${m.escaped} defects reach main or production.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="Tests in the pipeline"
        blurb={`Five kinds of tests, from a 1-minute lint to a 35-minute load test. Run them all on every push and developers wait while CI bills pile up; run them rarely and defects reach main. Place each stage, then see a month: ${PUSHES} pushes, ${MERGES} merges, ${NIGHTS} nights.`}
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="A push goes through lint and unit tests, integration tests, end-to-end tests and a load test before main and production"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "dev", to: "fast", label: "push" },
                  { from: "fast", to: "integ", label: WHEN_LABEL[d.integration], dim: d.integration === "off" },
                  { from: "integ", to: "e2e", label: WHEN_LABEL[d.e2e], dim: d.e2e === "off" },
                  { from: "e2e", to: "load", label: WHEN_LABEL[d.load], dim: d.load === "off" },
                  { from: "load", to: "main", label: "release" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="One month of CI">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">the month</p>
                <p className="mt-2 font-mono text-xs">
                  {m.ci.toLocaleString("en-US")} CI minutes · clean push {m.clean} min · {m.flaky} flaky reds
                </p>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {m.caught.map((x) => (
                    <li key={x.defect.id}>
                      <span style={{ color: x.good ? "var(--good)" : "var(--bad)" }} aria-hidden>
                        {x.good ? "✓ " : "✕ "}
                      </span>
                      {x.defect.perMonth}× {x.defect.label.replace(/^A /, "").toLowerCase()}
                      <span className="block text-[11px] text-[var(--muted)]">caught {x.where}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices<DefectId> label="This push contains" accent={ACCENT} value={defect} onChange={setDefect} options={DEFECTS.map((x) => ({ id: x.id, label: x.label }))} />
              </div>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Everything on every push
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Fast first, slow later
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Testing…">
                Push this commit
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Run the cheap checks first" what="Lint and unit tests take minutes and catch most mistakes. Run in order and stop at the first failure, and a typo costs one minute of CI; run every stage at once, and the verdict is a little faster but each push pays for every stage." accent={ACCENT} active={at(0)}>
                <Choices<Order> label="Order" accent={ACCENT} value={d.order} onChange={(x) => set({ order: x })} options={[{ id: "failFast", label: "In order, stop at first failure" }, { id: "parallel", label: "All at once" }]} />
                <p className="mt-1 font-mono text-[11px] text-[var(--muted)]">
                  this push: ran {push.ran.join(", ")} · verdict in {push.wait} min
                </p>
              </FlowStep>
              <FlowArrow label="passes" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Test against real dependencies" what="Integration tests run the code against a real database in a container. They catch a wrong join that a mocked unit test happily passes." accent={ACCENT} active={at(1)}>
                <Choices<When> label="Integration tests run" accent={ACCENT} value={d.integration} onChange={(x) => set({ integration: x })} options={WHEN_OPTS} />
              </FlowStep>
              <FlowArrow label="passes" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Click through the app before it merges" what={`End-to-end tests drive a real browser through whole flows. They are slow and flaky (${FLAKE * 100}% of full runs fail for no reason here), so run them before merge rather than on every push, and split them across machines.`} accent={ACCENT} active={at(2)}>
                <Choices<When> label="End-to-end tests run" accent={ACCENT} value={d.e2e} onChange={(x) => set({ e2e: x })} options={WHEN_OPTS} />
                <div className="mt-2">
                  <Choices<string> label="Shards" accent={ACCENT} value={String(d.shards)} onChange={(x) => set({ shards: Number(x) as 1 | 4 })} options={[{ id: "1", label: "1 machine" }, { id: "4", label: "4 machines" }]} />
                </div>
              </FlowStep>
              <FlowArrow label="passes" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Run the slow tests on a schedule" what={`A ${STAGES.find((s) => s.id === "load")!.minutes}-minute load test on every push is most of the CI bill. Nightly, it still catches a slow query within a day, before a release, for 1/${Math.round(PUSHES / NIGHTS)} of the cost.`} accent={ACCENT} active={at(3)}>
                <Choices<When> label="Load test runs" accent={ACCENT} value={d.load} onChange={(x) => set({ load: x })} options={WHEN_OPTS} />
              </FlowStep>
              <FlowArrow label="release" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Keep red meaning red" what={`When tests fail at random, people rerun until green and stop reading failures. Quarantine known-flaky tests (they still run, but don't block) until fixed: here that drops spurious failures from ${FLAKE * 100}% to ${FLAKE_QUARANTINED * 100}% of runs.`} accent={ACCENT} active={at(4)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.quarantine} onChange={(e) => set({ quarantine: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Quarantine flaky tests
                </label>
                <p className="font-mono text-xs">
                  e2e {WHEN_LABEL[when(d, "e2e")]} → {m.flaky} spurious failures a month
                </p>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Wait times, the month&apos;s CI minutes and where each defect is caught are computed here; stage durations, defect counts and flake rates are illustrative.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
