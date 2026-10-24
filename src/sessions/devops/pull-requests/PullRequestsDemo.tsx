"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { CI_MIN, FIRST, FIXED, PROBLEM_TEXT, PRS, REVIEWABLE, SPLIT_INTO, protectionRules, simulate, type Design, type Fresh, type Review } from "@/lib/pullRequests";

const ACCENT = "var(--ops)";
const CATCH_STAGE = { CI: 1, review: 2, "fresh main": 3, main: 4, production: 4 } as const;

export default function PullRequestsDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [pid, setPid] = useState("#103");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const sim = simulate(d);
  const o = sim.outcomes.find((x) => x.pr.id === pid)!;
  const caughtStage = o.caughtAt ? CATCH_STAGE[o.caughtAt] : 99;
  const late = o.caughtAt === "main" || o.caughtAt === "production";
  const reached = (i: number) => i <= caughtStage;
  const stateFor = (i: number) => (!reached(i) ? "dim" : caughtStage === i ? (late ? "bad" : "good") : "active");

  const nodes: MapNode[] = [
    { id: "author", label: "Author", sub: o.parts > 1 ? `${o.parts} PRs of ~${Math.ceil(o.pr.lines / o.parts)} lines` : `${o.pr.lines} lines`, at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "pr", label: `PR ${o.pr.id}`, sub: o.pr.path, at: [50, 18], mobileAt: [75, 12], state: "active" },
    { id: "ci", label: "CI", sub: d.checks ? "required check" : "advisory only", at: [86, 18], mobileAt: [75, 45], state: stateFor(1) },
    { id: "review", label: d.review === "owners" ? "Code owner" : "Reviewer", sub: d.review === "none" ? "not required" : d.review === "owners" ? "from CODEOWNERS" : "anyone on the team", at: [86, 82], mobileAt: [25, 45], state: d.review === "none" ? "dim" : stateFor(2) },
    { id: "queue", label: d.fresh === "queue" ? "Merge queue" : "Newest main", sub: d.fresh === "off" ? "not checked" : d.fresh === "queue" ? "tests in merge order" : "must be up to date", at: [50, 82], mobileAt: [25, 80], state: d.fresh === "off" ? "dim" : stateFor(3) },
    { id: "main", label: "main", sub: late ? (o.caughtAt === "main" ? "build broken" : "bug in production") : "green", at: [14, 82], mobileAt: [75, 80], state: !reached(4) ? "dim" : late ? "bad" : "good" },
  ];

  const ids = ["author", "pr", "ci", "review", "queue", "main"];
  const packets: Packet[] =
    stage === null || !reached(stage)
      ? []
      : hops(`s${stage}`, [ids[stage], ids[stage + 1]], {
          label: ["open", "tests", "review", "test on main", "merge"][stage],
          tone: caughtStage === stage ? (late ? "bad" : "good") : undefined,
        });

  const captions = [
    `Step 1: ${o.pr.id} “${o.pr.title}”: ${o.parts > 1 ? `split into ${o.parts} PRs` : `${o.pr.lines} lines`}.`,
    o.caughtAt === "CI" ? `Step 2: ${o.text}.` : `Step 2: CI runs the tests${o.pr.problem === "red" && !d.checks ? "; they fail, but the check isn't required" : ""}.`,
    o.caughtAt === "review" ? `Step 3: ${o.text}.` : d.review === "none" ? "Step 3: no review required." : `Step 3: ${d.review === "owners" ? "a code owner" : "a teammate"} approves.`,
    o.caughtAt === "fresh main" ? `Step 4: ${o.text}.` : d.fresh === "off" ? "Step 4: nobody tests it against today's main." : "Step 4: it passes on top of the newest main.",
    `Step 5: ${o.text}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${sim.mainBroken} broken main${sim.mainBroken === 1 ? "" : "s"} · ${sim.shipped} bug${sim.shipped === 1 ? "" : "s"} shipped · ${sim.runs} CI runs · ${sim.updates} manual branch updates. ${o.pr.id}: ${o.text}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="Pull requests and code review"
        blurb="Eight pull requests land on main in one day. Two are fine on their own and break main together, one has red tests, one is 1,800 lines, one changes a payments rule. Branch-protection rules decide whether each problem is caught by CI, a reviewer, a test against the newest main, or a customer."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="An author opens a pull request, CI runs, a reviewer approves, it is tested against the newest main, then merged"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "author", to: "pr", label: "push" },
                  { from: "pr", to: "ci", label: "checks" },
                  { from: "ci", to: "review", label: "green" },
                  { from: "review", to: "queue", label: "approved", dim: d.fresh === "off" },
                  { from: "queue", to: "main", label: "merge" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="All eight pull requests">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">
                  the day · {sim.mainBroken} broken main · {sim.shipped} shipped bugs
                </p>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {sim.outcomes.map((x) => {
                    const bad = x.caughtAt === "main" || x.caughtAt === "production";
                    return (
                      <li key={x.pr.id}>
                        <span style={{ color: bad ? "var(--bad)" : "var(--good)" }} aria-hidden>
                          {bad ? "✕ " : "✓ "}
                        </span>
                        <span className="font-mono">{x.pr.id}</span> {x.pr.title}
                        <span className="block text-[11px] text-[var(--muted)]">
                          {x.caughtAt ? `caught at ${x.caughtAt}: ` : ""}
                          {x.text}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices<string> label="Follow a pull request" accent={ACCENT} value={pid} onChange={setPid} options={PRS.map((p) => ({ id: p.id, label: `${p.id} ${p.title}` }))} />
                <p className="mt-1 text-[11px] text-[var(--faint)]">Hidden problem: {PROBLEM_TEXT[o.pr.problem]}.</p>
              </div>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  One approval, nothing else
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Small PRs, checks, owners, queue
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Merging…">
                Walk this pull request
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Keep the change small" what={`Reviewers read a few hundred lines closely and skim the rest. Splitting a big change into steps that each build and pass on their own (behind a flag if needed) makes every part reviewable.`} accent={ACCENT} active={at(0)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.split} onChange={(e) => set({ split: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Split anything over {REVIEWABLE} lines ({SPLIT_INTO} PRs for the checkout flow)
                </label>
              </FlowStep>
              <FlowArrow label="pull request" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Require the checks to pass" what={`CI runs on every push (about ${CI_MIN} minutes here). Unless the check is required by branch protection, a red result is only a suggestion and the merge button still works.`} accent={ACCENT} active={at(1)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.checks} onChange={(e) => set({ checks: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Required status check: ci/test
                </label>
              </FlowStep>
              <FlowArrow label="green build" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Get the right reviewer" what="Tests catch what someone thought to test. A reviewer catches intent: a rule the code shouldn't change, a case nobody wrote down. A CODEOWNERS file routes changes under a path to the team that owns it." accent={ACCENT} active={at(2)}>
                <Choices<Review> label="Review" accent={ACCENT} value={d.review} onChange={(x) => set({ review: x })} options={[{ id: "none", label: "Not required" }, { id: "any", label: "1 approval, anyone" }, { id: "owners", label: "1 approval + CODEOWNERS" }]} />
                {d.review === "owners" && <pre className="mt-2 overflow-x-auto rounded-md bg-[var(--inset)] p-2 font-mono text-[10px]">{"# .github/CODEOWNERS\npayments/   @org/payments\ncheckout/   @org/checkout"}</pre>}
              </FlowStep>
              <FlowArrow label="approved" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Test it on top of the newest main" what="A PR is tested against the main it branched from. If main moved, two green PRs can break it together. Requiring branches to be up to date fixes this by making every author update and rerun; a merge queue does the same test for them, in merge order." accent={ACCENT} active={at(3)}>
                <Choices<Fresh> label="Before merging" accent={ACCENT} value={d.fresh} onChange={(x) => set({ fresh: x })} options={[{ id: "off", label: "Merge as is" }, { id: "strict", label: "Must be up to date" }, { id: "queue", label: "Merge queue" }]} />
                <p className="mt-1 font-mono text-[11px] text-[var(--muted)]">
                  {sim.runs} CI runs · {sim.updates} manual branch updates
                </p>
              </FlowStep>
              <FlowArrow label="merge" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Merge, and keep main green" what="Every rule moves a problem earlier, where it is cheaper: a red check costs the author minutes, a broken main costs everyone who pulls it, a shipped bug costs customers." accent={ACCENT} active={at(4)}>
                <pre className="overflow-x-auto whitespace-pre rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] leading-relaxed">{["# branch protection on main", ...protectionRules(d)].join("\n")}</pre>
                <p className="mt-2 text-xs">
                  {sim.reviewMin} minutes of review in total · {sim.mainBroken} broken main · {sim.shipped} shipped
                </p>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The merge order, the checks and the counts run here; what each reviewer notices and the review times are illustrative.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
