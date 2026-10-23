"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type Packet } from "@/components/system/SystemMap";
import { CODE, MUTANTS, SPEC, SUITES, buggy, mutation, runSuite, type SuiteId } from "@/lib/testGeneration";

const ACCENT = "var(--native)";
const pct = (x: number) => `${Math.round(x * 100)}%`;
const gbp = (x: number) => `£${x.toFixed(2)}`;

export default function AiTestsDemo() {
  const [suite, setSuite] = useState<SuiteId>("code");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const s = SUITES.find((x) => x.id === suite)!;
  const m = mutation(suite);
  const results = runSuite(suite, buggy);
  const source = suite === "code" ? "code" : "spec";

  const packets: Packet[] =
    stage === 0 ? hops("src", [source, "model"], { label: suite === "code" ? "the function" : "the rule" })
    : stage === 1 ? hops("t", ["model", "runner"], { label: `${s.tests.length} tests` })
    : stage === 2 ? hops("r", ["code", "runner"], { label: m.foundBug ? "1 test fails: a bug" : "all green", tone: m.foundBug ? "good" : "bad" })
    : stage === 3 ? hops("mu", ["mutants", "runner"], { label: `${MUTANTS.length} mutants` })
    : stage === 4 ? hops("sc", ["runner", "model"], { label: `${pct(m.score)} killed`, tone: m.score === 1 ? "good" : "bad" })
    : [];

  const captions = [
    suite === "code" ? "Step 1: the model is given the function and asked for unit tests." : "Step 1: the model is given the rule, not the code, and asked for tests including the boundaries.",
    `Step 2: it writes ${s.tests.length} tests.`,
    m.foundBug ? `Step 3: on the shipped code, “£50 exactly ships free” fails: the code says ${gbp(buggy(50, 1, false))}. A real bug, found.` : "Step 3: every test passes on the shipped code, including one that asserts a £50 order pays shipping. The bug is now locked in by a test.",
    `Step 4: after the fix, ${MUTANTS.length} small deliberate changes are made to the code, one at a time, to see whether any test notices.`,
    `Step 5: ${m.killed.filter((k) => k.killed).length} of ${MUTANTS.length} changes make a test fail (mutation score ${pct(m.score)})${m.score < 1 ? `; ${m.killed.filter((k) => !k.killed).length} slip through unnoticed` : ""}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${s.label}: ${m.passOnShipped}/${m.tests} pass on the shipped code · ${m.foundBug ? "finds the £50 bug" : "misses the £50 bug"} · mutation score ${pct(m.score)}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Native · interactive"
        title="Generating tests with AI"
        blurb="Ask a model to “write tests for this function” and it reads the function and asserts what it does, bugs included. All green, nothing learned. Give it the rule instead and the boundary test fails on the real bug. Then break the code on purpose to see what the tests would miss."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="The spec, the code, the model writing tests, the test runner and the mutants"
                accent={ACCENT}
                chrome="split"
                nodes={[
                  { id: "spec", label: "The rule (spec)", sub: suite === "code" ? "not given" : "given", at: [12, 18], mobileAt: [24, 8], state: suite === "code" ? "dim" : "active" },
                  { id: "code", label: "shipping()", sub: "has a bug at £50", at: [12, 82], mobileAt: [76, 8], state: suite === "code" ? "active" : "idle" },
                  { id: "model", label: "Model writes tests", sub: `${s.tests.length} tests`, at: [42, 50], mobileAt: [50, 38], state: "active" },
                  { id: "runner", label: "Test runner", sub: m.foundBug ? "1 failing" : "all green", at: [70, 50], mobileAt: [50, 66], state: m.foundBug ? "good" : "bad" },
                  { id: "mutants", label: "Mutants", sub: `${m.killed.filter((k) => k.killed).length}/${MUTANTS.length} killed`, at: [88, 18], mobileAt: [50, 92], state: m.score === 1 ? "good" : "wait" },
                ]}
                links={[
                  { from: "spec", to: "model", label: "rule", dim: suite === "code" },
                  { from: "code", to: "model", label: "source", dim: suite !== "code" },
                  { from: "model", to: "runner", label: "tests" },
                  { from: "code", to: "runner", label: "under test" },
                  { from: "mutants", to: "runner", label: "changed code" },
                ]}
                packets={packets}
                aspect={1.6}
                mobileAspect={0.85}
              />
              <Results suite={suite} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices label="Tests written" accent={ACCENT} value={suite} onChange={setSuite} options={SUITES.map((x) => ({ id: x.id, label: x.label }))} />
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Testing…">
                Generate and run the tests
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Decide what the tests check against" what="Tests are only useful if they come from what the code should do. Given the code, a model writes down what it does, including the bug. Given the rule, it writes down what should happen, which is what can disagree with the code." accent={ACCENT} active={at(0)}>
                <Choices label="Tests written" accent={ACCENT} value={suite} onChange={setSuite} options={SUITES.map((x) => ({ id: x.id, label: x.label }))} />
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] text-[var(--faint)]">the rule</p>
                    <ul className="mt-1 space-y-0.5 text-xs">
                      {SPEC.map((l) => (
                        <li key={l}>{l}</li>
                      ))}
                    </ul>
                  </div>
                  <pre className="min-w-0 overflow-x-auto rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] leading-relaxed">{CODE}</pre>
                </div>
              </FlowStep>
              <FlowArrow label={suite === "code" ? "the function" : "the rule"} accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Let the model write the tests" what={s.how} accent={ACCENT} active={at(1)}>
                <ul className="space-y-0.5 font-mono text-[11px]">
                  {s.tests.map((t) => (
                    <li key={t.name} className="break-words">
                      shipping({t.args[0]}, {t.args[1]}, {String(t.args[2])}) → {gbp(t.want)} <span className="font-sans text-[var(--muted)]">· {t.name}</span>
                    </li>
                  ))}
                </ul>
              </FlowStep>
              <FlowArrow label="tests" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Run them on the code as shipped" what="A suite that is all green on the first run has told you nothing new. A failing test from the spec is the useful outcome: either the code or the rule is wrong, and a person decides which." accent={ACCENT} active={at(2)}>
                <ul className="space-y-0.5 font-mono text-[11px]">
                  {results.map((x) => (
                    <li key={x.t.name} style={{ color: x.ok ? "var(--good)" : "var(--bad)" }}>
                      {x.ok ? "✓" : "✗"} {x.t.name}
                      {!x.ok && ` (got ${gbp(x.got)})`}
                    </li>
                  ))}
                </ul>
                {m.wrongTests.length > 0 && <p className="mt-2 text-xs text-[var(--bad)]">“{m.wrongTests[0]}” asserts the bug. When someone fixes the code, this test will fail and may get “fixed” back.</p>}
              </FlowStep>
              <FlowArrow label="after the fix" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Break the code on purpose" what="Mutation testing makes small changes to the code, a > for a ≥, a floor for a ceil, a missing doubling, and reruns the suite on each. A change no test notices is behaviour nothing checks." accent={ACCENT} active={at(3)}>
                <ul className="space-y-0.5 font-mono text-[11px]">
                  {m.killed.map((k) => (
                    <li key={k.m.id} className="break-words" style={{ color: k.killed ? "var(--good)" : "var(--bad)" }}>
                      {k.killed ? "killed" : "survived"} · {k.m.change}
                    </li>
                  ))}
                </ul>
              </FlowStep>
              <FlowArrow label="survivors" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Score the suite, then close the gaps" what="The mutation score is the share of changes caught. Hand the surviving mutants back to the model and ask for a test that would catch each one; that is how the third suite gets its 3.5 kg test." accent={ACCENT} active={at(4)}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-x-3 gap-y-0.5 font-mono text-[11px]">
                  <span className="text-[var(--faint)]">tests written</span>
                  <span className="text-right text-[var(--faint)]">tests</span>
                  <span className="text-right text-[var(--faint)]">£50 bug</span>
                  <span className="text-right text-[var(--faint)]">mutants caught</span>
                  {SUITES.map((x) => {
                    const r = mutation(x.id);
                    return [
                      <span key={`${x.id}a`} style={{ fontWeight: x.id === suite ? 600 : 400 }}>
                        {x.label}
                      </span>,
                      <span key={`${x.id}b`} className="text-right">
                        {r.tests}
                      </span>,
                      <span key={`${x.id}c`} className="text-right" style={{ color: r.foundBug ? "var(--good)" : "var(--bad)" }}>
                        {r.foundBug ? "found" : "missed"}
                      </span>,
                      <span key={`${x.id}d`} className="text-right">
                        {pct(r.score)}
                      </span>,
                    ];
                  })}
                </div>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The test suites stand in for what a model writes. The function, the tests and every mutant run for real in your browser.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Results({ suite }: { suite: SuiteId }) {
  const m = mutation(suite);
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Test results and mutation score">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">results</p>
        <p className="font-mono text-xs" style={{ color: m.foundBug ? "var(--good)" : "var(--bad)" }}>
          {m.foundBug ? "found the £50 bug" : "all green, bug locked in"}
        </p>
      </div>
      <div className="mt-3 grid grid-cols-9 gap-1" aria-label="Mutants caught">
        {m.killed.map((k) => (
          <span key={k.m.id} title={k.m.change} className="grid h-9 place-items-center rounded font-mono text-[10px]" style={{ background: k.killed ? "color-mix(in srgb, var(--good) 25%, transparent)" : "color-mix(in srgb, var(--bad) 25%, transparent)" }}>
            {k.m.id}
          </span>
        ))}
      </div>
      <p className="mt-2 font-mono text-xs">
        {m.passOnShipped}/{m.tests} pass on the shipped code · mutation score {pct(m.score)}
      </p>
    </section>
  );
}
