"use client";

import { useState, type ReactNode } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { FIRST, FIXED, LABEL, PAUSED, V1, V2, simulate, type Design, type Resume, type StepName } from "@/lib/workflowVersioning";

const ACCENT = "var(--auto)";

export default function WorkflowVersioningDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [pick, setPick] = useState(3);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const r = simulate(d);
  const g = r.groups.find((x) => x.done === pick)!;
  const onV1 = d.resume === "pin";
  const bad = !!g.failed || g.doubled.length > 0;

  const toggle = (k: "compat" | "replay", label: string, extra?: ReactNode) => (
    <>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={d[k]} onChange={(e) => set({ [k]: e.target.checked } as Partial<Design>)} className="h-4 w-4" style={{ accentColor: ACCENT }} />
        {label}
      </label>
      {extra}
    </>
  );

  const nodes: MapNode[] = [
    { id: "deploy", label: "Deploy v2", sub: r.blocked ? "blocked by replay test" : "fraud check · amount_cents", at: [14, 18], mobileAt: [25, 12], state: r.blocked ? "wait" : "active" },
    { id: "engine", label: "Workflow engine", sub: `${r.total} runs paused`, at: [50, 18], mobileAt: [75, 12], state: "active" },
    { id: "history", label: "Run history", sub: "what each run did", at: [86, 18], mobileAt: [75, 42], state: d.replay ? "good" : "idle" },
    { id: "v1", label: "v1 workers", sub: onV1 ? "finish old runs" : "shut down", at: [14, 80], mobileAt: [25, 42], state: onV1 ? "good" : "dim" },
    { id: "v2", label: "v2 workers", sub: onV1 ? "new runs only" : "all runs", at: [50, 80], mobileAt: [25, 74], state: !onV1 && bad && !r.blocked ? "bad" : "good" },
    { id: "pay", label: "Payments + warehouse", sub: `${r.blocked ? 0 : r.doubleCharged} double charges`, at: [86, 80], mobileAt: [75, 74], state: !r.blocked && (r.doubleCharged || r.doubleShipped) ? "bad" : "good" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("d", ["deploy", "engine"], { label: "v2 code" })
    : stage === 1 ? hops("r", ["engine", onV1 ? "v1" : "v2"], { label: `${g.count} runs after ${LABEL[V1[g.done - 1]].toLowerCase()}` })
    : stage === 2 ? (onV1 ? [] : hops("p", ["engine", "v2"], { label: d.compat ? "amount → amount_cents" : "{ amount: 49 }", tone: d.compat ? "good" : "bad" }))
    : stage === 3 ? (d.replay ? hops("t", ["history", "v2", "deploy"], { label: r.blocked ? `${r.broken} runs would break` : "replay passes", tone: r.blocked ? "bad" : "good" }) : [])
    : stage === 4 ? (r.blocked ? [] : hops("x", [onV1 ? "v1" : "v2", "pay"], { label: g.failed ? "charge failed" : g.doubled.length ? `${g.doubled.join(" + ")} again` : g.path[0] ? LABEL[g.path[0]] : "done", tone: bad ? "bad" : "good" }))
    : [];

  const captions = [
    `Step 1: v2 adds a fraud check before the charge and renames amount to amount_cents. ${r.total} runs are paused part-way.`,
    d.resume === "pin" ? "Step 2: paused runs keep running v1 code until they finish; only new runs start on v2." : d.resume === "index" ? `Step 2: paused runs resume on v2 at the same step number: after ${g.done} step${g.done > 1 ? "s" : ""}, v2's next is ${LABEL[V2[g.done]] ?? "nothing"}.` : `Step 2: paused runs resume on v2 after the step they last finished (${LABEL[V1[g.done - 1]]}).`,
    onV1 ? "Step 3: v1 code reads v1 data; nothing to convert." : d.compat ? "Step 3: v2 reads amount_cents, or converts amount when an old run carries only that." : "Step 3: v2 reads amount_cents, which old runs don't have.",
    d.replay ? (r.blocked ? `Step 4: replaying recorded histories against v2 finds ${r.broken} runs that would break; the deploy is stopped.` : "Step 4: every recorded history replays cleanly against v2.") : "Step 4: v2 is shipped without testing it against runs already in flight.",
    r.blocked ? "Step 5: nothing broke, because nothing shipped. Change the plan and try again." : `Step 5: these ${g.count} runs: ${g.failed ? g.failed : g.doubled.length ? `${g.doubled.map((s) => LABEL[s].toLowerCase()).join(" and ")} a second time` : g.oldLogic ? "finish, charged without the fraud check" : "finish correctly"}.`,
  ];
  const caption = stage !== null ? captions[stage] : r.blocked ? `Deploy blocked: the replay test found ${r.broken} of ${r.total} paused runs that would break.` : `${r.doubleCharged} charged twice · ${r.doubleShipped} shipped twice · ${r.failed} failed · ${r.oldLogic} charged without the fraud check · ${r.clean} of ${r.total} clean.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Automation · interactive"
        title="Versioning and testing workflows"
        blurb="An order workflow has 120 runs paused part-way, waiting on stock, the warehouse or the courier, when version 2 ships: a fraud check before the charge, and the charge now reads amount_cents. Code changes instantly; runs in flight don't. Choose how paused runs meet the new code, and test it against them before you ship."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="The v2 deploy, the workflow engine, run history, v1 and v2 workers, and payments with the warehouse"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "deploy", to: "engine", label: "new code" },
                  { from: "history", to: "engine", label: "histories" },
                  { from: "engine", to: "v1", label: "old runs", dim: !onV1 },
                  { from: "engine", to: "v2", label: onV1 ? "new runs" : "all runs" },
                  { from: "v2", to: "pay", label: "steps" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <Runs d={d} pick={pick} setPick={setPick} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  As first built
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Fixed
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Deploying…">
                Deploy v2
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Know what's in flight" what="A workflow that waits days has runs part-way through at every deploy. Before changing it, list them: how many, and after which step each one is paused." accent={ACCENT} active={at(0)}>
                <p className="font-mono text-[11px]">v1: {V1.map((s) => LABEL[s]).join(" → ")}</p>
                <p className="font-mono text-[11px]">v2: {V2.map((s) => LABEL[s]).join(" → ")}</p>
              </FlowStep>
              <FlowArrow label="paused runs" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Decide how paused runs meet new code" what="Resuming by step number replays or skips steps when steps are inserted. Resuming after the last finished step by name keeps the order. Pinning lets old runs finish on old code while new runs start on the new one." accent={ACCENT} active={at(1)}>
                <Choices<Resume> label="Paused runs" accent={ACCENT} value={d.resume} onChange={(v) => set({ resume: v })} options={[{ id: "index", label: "Resume at the same step number" }, { id: "name", label: "Resume after the last step, by name" }, { id: "pin", label: "Finish on v1" }]} />
              </FlowStep>
              <FlowArrow label="next step" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Keep reading the old data" what="Runs started on v1 carry v1's data. A step on v2 that only understands the new shape fails on every one of them. Read both shapes until the last old run is done." accent={ACCENT} active={at(2)}>
                {toggle("compat", "v2 reads amount_cents, or converts amount", <p className="font-mono text-[11px] text-[var(--muted)]">amount_cents ?? Math.round(amount * 100)</p>)}
              </FlowStep>
              <FlowArrow label="data" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Replay recorded runs before shipping" what="Workflow engines keep each run's history. A replay test feeds those histories to the new code and fails the build if any run would take a different path, before a customer is charged twice." accent={ACCENT} active={at(3)}>
                {toggle("replay", "Run a replay test against in-flight histories in CI", d.replay ? <p className="text-[11px]" style={{ color: r.blocked ? "var(--c2)" : "var(--good)" }}>{r.blocked ? `Blocked: ${r.broken} runs would break.` : "Passes."}</p> : null)}
              </FlowStep>
              <FlowArrow label="deploy" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Ship, then count the runs" what="The cost of a bad change is counted in runs: charged twice, shipped twice, failed, or quietly finished on the old rules. New runs are fine either way; the paused ones are where it goes wrong." accent={ACCENT} active={at(4)}>
                <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-xs">
                  <dt>Charged twice</dt>
                  <dd className="text-right font-mono" style={{ color: !r.blocked && r.doubleCharged ? "var(--bad)" : "var(--good)" }}>{r.blocked ? 0 : r.doubleCharged}</dd>
                  <dt>Shipped twice</dt>
                  <dd className="text-right font-mono" style={{ color: !r.blocked && r.doubleShipped ? "var(--bad)" : "var(--good)" }}>{r.blocked ? 0 : r.doubleShipped}</dd>
                  <dt>Failed</dt>
                  <dd className="text-right font-mono" style={{ color: !r.blocked && r.failed ? "var(--bad)" : "var(--good)" }}>{r.blocked ? 0 : r.failed}</dd>
                  <dt>Charged without the fraud check</dt>
                  <dd className="text-right font-mono">{r.blocked ? 0 : r.oldLogic}</dd>
                </dl>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The paused runs, each resume rule, the data check and the replay test run here.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Runs({ d, pick, setPick }: { d: Design; pick: number; setPick: (n: number) => void }) {
  const r = simulate(d);
  const chip = (s: StepName, g: (typeof r.groups)[number]) => {
    const isFail = g.failed && s === "charge" && g.path[g.path.length - 1] === "charge";
    const again = g.doubled.includes(s);
    return (
      <span key={s} className="rounded px-1 py-0.5 text-[10px]" style={{ background: isFail || again ? "color-mix(in srgb, var(--bad) 18%, transparent)" : s === "fraud" ? "color-mix(in srgb, var(--good) 18%, transparent)" : "var(--inset)", color: isFail || again ? "var(--bad)" : "var(--text)" }}>
        {LABEL[s]}
        {again ? " again" : isFail ? " ✕" : ""}
      </span>
    );
  };
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Paused runs and the steps they take after the deploy">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">paused runs · pick a group</p>
        <p className="font-mono text-xs" style={{ color: r.blocked ? "var(--c2)" : r.broken ? "var(--bad)" : "var(--good)" }}>
          {r.blocked ? "deploy blocked" : `${r.broken} broken`}
        </p>
      </div>
      <ul className="mt-3 space-y-1">
        {r.groups.map((g) => (
          <li key={g.done}>
            <button type="button" aria-pressed={g.done === pick} onClick={() => setPick(g.done)} className="w-full rounded-md px-1.5 py-1.5 text-left text-xs" style={{ minHeight: "2.75rem", background: g.done === pick ? `color-mix(in srgb, ${ACCENT} 14%, transparent)` : "transparent" }}>
              <span className="block">
                <span className="font-mono">{g.count}</span> runs after {LABEL[V1[g.done - 1]].toLowerCase()}, waiting for {PAUSED.find((p) => p.done === g.done)!.waiting}
              </span>
              <span className="mt-1 flex flex-wrap gap-1">{g.path.length ? g.path.map((s) => chip(s, g)) : <span className="text-[10px] text-[var(--faint)]">nothing left</span>}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
