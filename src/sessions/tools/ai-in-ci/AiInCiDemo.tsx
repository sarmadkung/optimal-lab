"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { EVAL, FILTERS, FIRST, FIXED, PRS_PER_MONTH, REVIEW_BOT, evaluate, type Design, type Trigger } from "@/lib/aiInCi";

const ACCENT = "var(--tools)";

export default function AiInCiDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [pick, setPick] = useState(3);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const r = evaluate(d);
  const row = r.rows.find((x) => x.pr.n === pick)!;

  const nodes: MapNode[] = [
    { id: "pr", label: row.pr.fork ? "Fork pull request" : "Pull request", sub: `#${row.pr.n} · ${row.pr.files.length} file${row.pr.files.length > 1 ? "s" : ""}`, at: [14, 18], mobileAt: [25, 12], state: row.pr.fork ? "wait" : "active" },
    { id: "ci", label: "CI workflow", sub: `${r.minutesPerPr} min of AI checks a PR`, at: [50, 18], mobileAt: [75, 12], state: "active" },
    { id: "bot", label: "AI review bot", sub: `$${REVIEW_BOT.cost} a PR`, at: [86, 18], mobileAt: [75, 42], state: "active" },
    { id: "evals", label: "Eval suite", sub: row.evals ? (d.repeats === 3 ? "judge × 3" : "judge × 1") : "skipped", at: [86, 82], mobileAt: [75, 76], state: row.evals ? (row.caught ? "good" : "active") : row.pr.regression ? "bad" : "dim" },
    { id: "secrets", label: "Model API key", sub: d.forks === "target" ? "given to every run" : "only after a maintainer's label", at: [50, 82], mobileAt: [25, 42], state: row.exposed ? "bad" : "good" },
    { id: "merge", label: "Merge", sub: row.pr.regression ? (row.caught ? "blocked: regression" : "regression merged") : "allowed", at: [14, 82], mobileAt: [25, 76], state: row.pr.regression ? (row.caught ? "good" : "bad") : "good" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("p", ["pr", "ci", "bot"], { label: "diff" })
    : stage === 1 ? (row.evals ? hops("e", ["ci", "evals"], { label: "paths match" }) : [])
    : stage === 2 ? (row.evals ? hops("j", ["evals", "ci"], { label: d.cache ? "cached + changed cases" : "all cases" }) : [])
    : stage === 3 ? (row.pr.fork ? hops("k", ["secrets", "ci"], { label: row.exposed ? "key in a fork's run" : "waits for a label", tone: row.exposed ? "bad" : "good" }) : [])
    : stage === 4 ? hops("m", ["ci", "merge"], { label: row.pr.regression ? (row.caught ? "regression found" : "regression missed") : "checks done", tone: row.pr.regression && !row.caught ? "bad" : "good" })
    : [];

  const captions = [
    `Step 1: PR #${row.pr.n}, “${row.pr.title}”, changes ${row.pr.files.join(", ")}; the review bot comments on the diff.`,
    row.evals ? `Step 2: a changed file matches ${FILTERS[d.trigger].join(" or ")}, so the eval suite runs.` : row.pr.fork && d.forks === "label" ? "Step 2: a fork's PR: the eval suite waits for a maintainer to add a label." : `Step 2: no changed file matches ${FILTERS[d.trigger].join(" or ")}; evals are skipped.`,
    row.evals ? `Step 3: the judge scores each answer ${d.repeats === 3 ? "three times" : "once"}${d.cache ? "; unchanged cases reuse cached results" : ""}.` : "Step 3: nothing to grade.",
    row.pr.fork ? (row.exposed ? "Step 4: pull_request_target runs with the repository's secrets; this fork's code can read the model API key." : "Step 4: the fork's code runs without secrets until a maintainer has looked at it.") : "Step 4: a branch in the repository; secrets are available as usual.",
    `Step 5: ${row.pr.regression ? (row.caught ? "the eval suite finds the regression and blocks the merge" : "the regression is merged: the evals never ran on it") : "nothing to block"}.`,
  ];
  const caption = stage !== null ? captions[stage] : `$${r.cost} a month · ${r.evalRuns} eval runs · ${r.flaky} flaky failures · ${r.caught} of ${r.regressions} regressions caught · ${r.exposed} fork PRs with the API key.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="Tools · interactive"
        title="AI checks in CI"
        blurb="A repository gets 120 pull requests a month, and CI can run an AI review bot and an LLM eval suite on them. Run everything everywhere and the bill, the waiting and the flaky failures pile up; filter too narrowly and a model swap in a YAML file ships untested; hand forks the API key and someone else spends it. Set up the workflow."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="A pull request, the CI workflow, an AI review bot, the eval suite, the model API key and the merge"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "pr", to: "ci", label: "push" },
                  { from: "ci", to: "bot", label: "review" },
                  { from: "ci", to: "evals", label: "if paths match" },
                  { from: "secrets", to: "ci", label: "API key" },
                  { from: "ci", to: "merge", label: "status" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Ten sample pull requests and what CI did">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">10 sample PRs · pick one</p>
                <ul className="mt-2 space-y-0.5">
                  {r.rows.map((x) => (
                    <li key={x.pr.n}>
                      <button type="button" aria-pressed={x.pr.n === pick} onClick={() => setPick(x.pr.n)} className="grid min-h-11 w-full grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-1.5 text-left text-xs" style={{ background: x.pr.n === pick ? `color-mix(in srgb, ${ACCENT} 14%, transparent)` : "transparent" }}>
                        <span className="font-mono text-[var(--faint)]">#{x.pr.n}</span>
                        <span className="min-w-0">
                          <span className="block truncate">{x.pr.title}</span>
                          <span className="block truncate font-mono text-[10px] text-[var(--faint)]">{x.pr.files.join(", ")}</span>
                        </span>
                        <span className="text-right text-[11px]" style={{ color: x.exposed || (x.pr.regression && !x.caught) ? "var(--bad)" : x.evals ? "var(--good)" : "var(--muted)" }}>
                          {x.exposed ? "key exposed" : x.pr.regression ? (x.caught ? "caught" : "missed") : x.evals ? "evals ran" : "skipped"}
                        </span>
                      </button>
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
                  Everything, every PR
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Filtered, stable, safe
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="CI running…">
                {`Run CI on #${row.pr.n}`}
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Put a review bot on every pull request" what={`An AI reviewer reads the diff and comments: cheap (about $${REVIEW_BOT.cost} a PR here), quick, and only a suggestion. It doesn't replace a person's review or tests.`} accent={ACCENT} active={at(0)}>
                <p className="font-mono text-[11px] text-[var(--muted)]">
                  {PRS_PER_MONTH} PRs × ${REVIEW_BOT.cost} = ${Math.round(PRS_PER_MONTH * REVIEW_BOT.cost)} a month
                </p>
              </FlowStep>
              <FlowArrow label="changed files" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Run evals when AI behaviour can change" what="An eval suite costs real money and minutes per run. Trigger it on the paths that change behaviour: prompts, AI code, and the config that picks the model. A filter on prompts/** alone misses a model swap in a YAML file." accent={ACCENT} active={at(1)}>
                <Choices<Trigger> label="Run evals when these change" accent={ACCENT} value={d.trigger} onChange={(v) => set({ trigger: v })} options={[{ id: "all", label: "Any file" }, { id: "prompts", label: "prompts/** only" }, { id: "ai", label: "prompts, src/ai, model config" }]} />
                <p className="mt-2 font-mono text-[11px] text-[var(--muted)]">{FILTERS[d.trigger].join(" · ")}</p>
              </FlowStep>
              <FlowArrow label="eval run" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Make the result stable, and cheap to repeat" what={`A judge that runs once fails about ${Math.round(EVAL.flaky1 * 100)}% of good runs by chance (illustrative), and people learn to click re-run. Averaging three judge runs settles most; caching results for unchanged cases cuts the cost back down.`} accent={ACCENT} active={at(2)}>
                <Choices label="Judge runs" accent={ACCENT} value={String(d.repeats)} onChange={(v) => set({ repeats: Number(v) as 1 | 3 })} options={[{ id: "1", label: "1" }, { id: "3", label: "3, averaged" }]} />
                <label className="mt-2 flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.cache} onChange={(e) => set({ cache: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Cache results for cases whose prompt and model didn&apos;t change
                </label>
              </FlowStep>
              <FlowArrow label="secrets" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Keep the API key away from fork PRs" what="Evals need a model API key. On GitHub, pull_request_target runs with the repository's secrets, so checking out and running a fork's code there hands the key to anyone who opens a PR. Run fork PRs without secrets, and run evals after a maintainer adds a label." accent={ACCENT} active={at(3)}>
                <Choices<Design["forks"]> label="Fork PRs" accent={ACCENT} value={d.forks} onChange={(v) => set({ forks: v })} options={[{ id: "target", label: "pull_request_target, with secrets" }, { id: "label", label: "No secrets until a maintainer labels it" }]} />
              </FlowStep>
              <FlowArrow label="status" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Count the month" what="Money, minutes added to every PR, failures that weren't real, regressions caught before merge, and keys exposed." accent={ACCENT} active={at(4)}>
                <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-xs">
                  <dt>AI checks a month</dt>
                  <dd className="text-right font-mono">${r.cost}</dd>
                  <dt>Added to an average PR</dt>
                  <dd className="text-right font-mono">{r.minutesPerPr} min</dd>
                  <dt>Flaky eval failures</dt>
                  <dd className="text-right font-mono" style={{ color: r.flaky > 5 ? "var(--bad)" : "var(--good)" }}>{r.flaky}</dd>
                  <dt>Regressions caught (sample)</dt>
                  <dd className="text-right font-mono" style={{ color: r.caught < r.regressions ? "var(--bad)" : "var(--good)" }}>{r.caught} / {r.regressions}</dd>
                  <dt>Fork PRs that got the key</dt>
                  <dd className="text-right font-mono" style={{ color: r.exposed ? "var(--bad)" : "var(--good)" }}>{r.exposed}</dd>
                </dl>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The path filter runs on the sample PRs&apos; real file lists. Eval cost, run time and flakiness are illustrative.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
