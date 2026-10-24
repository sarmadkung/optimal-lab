"use client";

import { useState, type ReactNode } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { ALLOWED_DEPS, FIRST, FIXED, PRS, READ_LIMIT, reviewAll, type Design } from "@/lib/agentChangeReview";

const ACCENT = "var(--tools)";

export default function ReviewAgentChangesDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [pick, setPick] = useState(2);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const r = reviewAll(d);
  const v = r.verdicts.find((x) => x.pr.n === pick)!;
  const pr = v.pr;

  const toggle = (k: "tests" | "scope" | "deps" | "secrets", label: string, extra?: ReactNode) => (
    <>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={d[k]} onChange={(e) => set({ [k]: e.target.checked } as Partial<Design>)} className="h-4 w-4" style={{ accentColor: ACCENT }} />
        {label}
      </label>
      {extra}
    </>
  );

  const nodes: MapNode[] = [
    { id: "agent", label: "Coding agent", sub: `${PRS.length} pull requests`, at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "ci", label: "CI", sub: "all green", at: [50, 18], mobileAt: [75, 12], state: "good" },
    { id: "checks", label: "Diff checks", sub: [d.tests && "tests", d.scope && "scope", d.deps && "deps", d.secrets && "secrets"].filter(Boolean).join(" · ") || "none", at: [86, 18], mobileAt: [75, 42], state: v.flags.length ? "wait" : d.tests || d.scope || d.deps || d.secrets ? "good" : "dim" },
    { id: "you", label: "Reviewer", sub: d.review === "read" ? `reads up to ${READ_LIMIT} lines` : "skims", at: [86, 80], mobileAt: [75, 74], state: v.caughtBy === "person" ? "good" : "active" },
    { id: "main", label: "main branch", sub: `${r.badMerged} bad changes merged`, at: [14, 80], mobileAt: [25, 74], state: r.badMerged ? "bad" : "good" },
    { id: "spec", label: "The task", sub: "what was asked", at: [50, 56], mobileAt: [25, 42], state: d.review === "read" ? "active" : "dim" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("p", ["agent", "ci"], { label: `PR #${pr.n}` })
    : stage === 1 ? hops("c", ["ci", "checks"], { label: "green", tone: "good" })
    : stage === 2 ? hops("f", ["checks", "you"], { label: v.flags.length ? `${v.flags.length} flag${v.flags.length > 1 ? "s" : ""}` : "no flags", tone: v.flags.length ? "bad" : undefined })
    : stage === 3 ? (d.review === "read" ? hops("t", ["spec", "you"], { label: "task + diff" }) : [])
    : stage === 4 ? (v.merged ? hops("m", ["you", "main"], { label: "merge", tone: pr.bad ? "bad" : "good" }) : hops("x", ["you", "agent"], { label: "changes requested", tone: "good" }))
    : [];

  const captions = [
    `Step 1: the agent opens PR #${pr.n}, “${pr.title}”: ${v.lines.toLocaleString("en-US")} changed lines.`,
    "Step 2: CI is green. The agent kept going until it was, which is exactly why green isn't enough.",
    v.flags.length ? `Step 3: the diff checks flag it: ${v.flags.join("; ")}.` : "Step 3: no check flags it.",
    d.review === "read" ? (v.lines > READ_LIMIT ? `Step 4: ${v.lines.toLocaleString("en-US")} lines is too many to read properly; without a flag, the reviewer skims.` : "Step 4: the reviewer reads the diff against the task.") : "Step 4: the reviewer skims a green PR.",
    v.merged ? (pr.bad ? `Step 5: merged, and it ${pr.bad}.` : "Step 5: merged, correctly.") : `Step 5: sent back: ${pr.bad}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${r.badMerged} of ${PRS.filter((p) => p.bad).length} bad changes merged · ${r.falseAlarms} false alarm${r.falseAlarms === 1 ? "" : "s"} · ${r.minutes} minutes of review.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="Tools · interactive"
        title="Reviewing agent changes"
        blurb="A coding agent opens eight pull requests, and CI is green on all of them. That's what it was told to achieve, and some got there the wrong way: a skipped test, a weakened assertion, a typosquatted package, an auth check dropped inside 1,800 lines of reformatting, a live key. Decide what checks read the diff and how a person reviews."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="The coding agent, CI, diff checks, the task, the reviewer and the main branch"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "agent", to: "ci", label: "PR" },
                  { from: "ci", to: "checks", label: "diff" },
                  { from: "checks", to: "you", label: "flags" },
                  { from: "spec", to: "you", label: "context", dim: d.review !== "read" },
                  { from: "you", to: "main", label: "merge" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <Queue d={d} pick={pick} setPick={setPick} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Green means merge
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Checks + careful review
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Reviewing…">
                {`Review PR #${pr.n}`}
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Read what the agent changed, not what it says" what="Each PR comes with a confident summary. The diff is the only thing that's true." accent={ACCENT} active={at(0)}>
                <p className="text-xs">Task: {pr.task}</p>
                <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-[var(--inset)] p-2 font-mono text-[11px]">
                  {pr.diff.map((l) => `${l.kind} ${l.file}: ${l.text}`).join("\n")}
                  {pr.extraLines ? `\n… and ${pr.extraLines.toLocaleString("en-US")} more lines` : ""}
                </pre>
              </FlowStep>
              <FlowArrow label="CI: green" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Check how the tests went green" what="An agent told to make CI pass will sometimes change the test rather than the code. Flag skipped tests and exact assertions replaced with weak ones." accent={ACCENT} active={at(1)}>
                {toggle("tests", "Flag skipped tests and weakened assertions")}
              </FlowStep>
              <FlowArrow label="diff" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Check scope, dependencies and secrets" what="Compare the files touched with the task's area; flag new packages not on an approved list; scan for keys. Each flag points the reviewer at the exact lines, which matters most in a huge diff." accent={ACCENT} active={at(2)}>
                {toggle("scope", "Flag files outside the task's folders")}
                {toggle("deps", "Flag dependencies not on the approved list", <p className="font-mono text-[11px] text-[var(--faint)]">approved: {ALLOWED_DEPS.join(", ")}</p>)}
                {toggle("secrets", "Scan the diff for secrets")}
              </FlowStep>
              <FlowArrow label="flags" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Review against the task, and keep diffs small" what={`Skimming a green PR catches nothing. Reading the diff next to the task catches logic errors no check sees, but only in a diff a person can actually read (here up to ${READ_LIMIT} lines). Ask agents for small PRs.`} accent={ACCENT} active={at(3)}>
                <Choices label="The reviewer" accent={ACCENT} value={d.review} onChange={(x: Design["review"]) => set({ review: x })} options={[{ id: "skim", label: "Skims: CI is green" }, { id: "read", label: "Reads it against the task" }]} />
              </FlowStep>
              <FlowArrow label="decision" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Count what reached main" what="Bad changes merged is the number that matters; false alarms and review minutes are the price." accent={ACCENT} active={at(4)}>
                <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-xs">
                  <dt>Bad changes merged</dt>
                  <dd className="text-right font-mono" style={{ color: r.badMerged ? "var(--bad)" : "var(--good)" }}>{r.badMerged} / {PRS.filter((p) => p.bad).length}</dd>
                  <dt>False alarms on good PRs</dt>
                  <dd className="text-right font-mono">{r.falseAlarms}</dd>
                  <dt>Review time</dt>
                  <dd className="text-right font-mono">{r.minutes} min</dd>
                </dl>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The PRs are illustrative. The diff checks, the review rules and the merge decisions run here.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Queue({ d, pick, setPick }: { d: Design; pick: number; setPick: (n: number) => void }) {
  const r = reviewAll(d);
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Eight agent pull requests and what happened to each">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">pull requests · pick one</p>
        <p className="font-mono text-xs" style={{ color: r.badMerged ? "var(--bad)" : "var(--good)" }}>
          {r.badMerged} bad merged
        </p>
      </div>
      <ul className="mt-3 space-y-0.5">
        {r.verdicts.map((v) => (
          <li key={v.pr.n}>
            <button type="button" aria-pressed={v.pr.n === pick} onClick={() => setPick(v.pr.n)} className="grid min-h-11 w-full grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-1.5 text-left text-xs" style={{ background: v.pr.n === pick ? `color-mix(in srgb, ${ACCENT} 14%, transparent)` : "transparent" }}>
              <span className="font-mono text-[var(--faint)]">#{v.pr.n}</span>
              <span className="min-w-0">
                <span className="block truncate">{v.pr.title}</span>
                <span className="block font-mono text-[10px] text-[var(--faint)]">{v.lines.toLocaleString("en-US")} lines · CI green</span>
              </span>
              <span className="text-right text-[11px]" style={{ color: v.merged && v.pr.bad ? "var(--bad)" : v.merged ? "var(--good)" : "var(--c2)" }}>
                {v.merged ? (v.pr.bad ? "merged, bad" : v.flags.length ? "flagged, merged" : "merged") : v.caughtBy === "check" ? "caught by a check" : "caught in review"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
