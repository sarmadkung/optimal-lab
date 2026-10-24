"use client";

import { useState, type ReactNode } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { COST_PER_AGENT_HOUR, FIRST, FIXED, REVIEW_MIN, SETUP_MIN, TASKS, runBatch, type Design, type Env, type Outcome } from "@/lib/backgroundAgents";

const ACCENT = "var(--tools)";
const COLOR: Record<Outcome["result"], string> = { merge: "var(--good)", wrong: "var(--c2)", "ci-red": "var(--bad)", conflict: "var(--c4)" };
const WORD: Record<Outcome["result"], string> = { merge: "ready to merge", wrong: "not what was meant", "ci-red": "CI red", conflict: "conflicts" };
const hm = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`);

export default function BackgroundAgentsDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [pick, setPick] = useState(9);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const r = runBatch(d);
  const o = r.outcomes.find((x) => x.t.n === pick)!;

  const toggle = (k: "specs" | "byArea", label: string, extra?: ReactNode) => (
    <>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={d[k]} onChange={(e) => set({ [k]: e.target.checked } as Partial<Design>)} className="h-4 w-4" style={{ accentColor: ACCENT }} />
        {label}
      </label>
      {extra}
    </>
  );

  const nodes: MapNode[] = [
    { id: "you", label: "You", sub: `${TASKS.length} backlog tasks`, at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "queue", label: "Agent queue", sub: `${d.parallel} at a time`, at: [50, 18], mobileAt: [75, 12], state: "active" },
    { id: "vm", label: "Cloud machine", sub: d.env === "bare" ? "repo only" : d.env === "script" ? `setup script · ${SETUP_MIN.script} min` : "ready snapshot", at: [86, 18], mobileAt: [75, 42], state: o.result === "ci-red" ? "bad" : "active" },
    { id: "registry", label: "Package registry", sub: d.env === "bare" ? "never reached" : "dependencies", at: [86, 80], mobileAt: [75, 74], state: d.env === "bare" ? "dim" : "good" },
    { id: "web", label: "Rest of the internet", sub: d.network === "open" ? "reachable" : "blocked", at: [50, 80], mobileAt: [25, 74], state: o.leaked ? "bad" : d.network === "open" ? "wait" : "dim" },
    { id: "gh", label: "GitHub", sub: `${r.merged} PRs ready`, at: [14, 80], mobileAt: [25, 42], state: r.merged === TASKS.length ? "good" : "wait" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("t", ["you", "queue"], { label: d.specs ? "spec + acceptance test" : o.t.title.slice(0, 18) })
    : stage === 1 ? hops("s", ["queue", "vm", ...(d.env === "bare" ? [] : ["registry"])], { label: d.env === "bare" ? "no deps" : "install", tone: d.env === "bare" ? "bad" : "good" })
    : stage === 2 ? (o.result === "conflict" ? hops("c", ["vm", "gh"], { label: "same files", tone: "bad" }) : [])
    : stage === 3 ? (o.t.injected ? hops("i", ["vm", "web"], { label: o.leaked ? "env → attacker" : "blocked", tone: o.leaked ? "bad" : "good" }) : [])
    : stage === 4 ? hops("p", ["vm", "gh", "you"], { label: WORD[o.result], tone: o.result === "merge" && !o.leaked ? "good" : "bad" })
    : [];

  const captions = [
    `Step 1: task ${o.t.n}, “${o.t.title}”, ${d.specs ? "with a short spec and the test that proves it done" : "as a one-line title"}.`,
    d.env === "bare" ? "Step 2: the machine has the repo but no dependencies; the agent can't run the tests." : d.env === "script" ? `Step 2: a setup script installs dependencies first (${SETUP_MIN.script} min every run).` : "Step 2: the machine starts from a snapshot with dependencies installed.",
    o.result === "conflict" ? `Step 3: another ${o.t.area} task ran at the same time; these PRs now conflict.` : `Step 3: it runs in round ${o.round} of ${r.rounds}, ${d.parallel} agent${d.parallel > 1 ? "s" : ""} at a time.`,
    o.t.injected ? (o.leaked ? "Step 4: issue #482 contains hidden instructions to post the environment to a URL, and the machine can reach it." : "Step 4: issue #482 contains hidden instructions to post the environment to a URL; the network allowlist blocks it.") : "Step 4: nothing in this task tries to reach out.",
    `Step 5: ${o.why}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${r.merged} of ${TASKS.length} PRs ready to merge · ${r.wrong} not what was meant · ${r.red} red · ${r.conflicts} conflicts · ${r.leaks} leak · done in ${hm(r.wallMin)} · $${r.cost.toFixed(2)}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="Tools · interactive"
        title="Background and cloud agents"
        blurb="Hand twelve backlog tasks to agents that each run in their own cloud machine and come back as pull requests. It feels like twelve extra engineers until the PRs arrive: some built the wrong thing, some never ran the tests, some conflict, and one followed instructions hidden in an issue. Set up the handoff and count the PRs worth merging."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="You, the agent queue, a cloud machine, the package registry, the rest of the internet and GitHub"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "you", to: "queue", label: "tasks" },
                  { from: "queue", to: "vm", label: "start" },
                  { from: "vm", to: "registry", label: "install", dim: d.env === "bare" },
                  { from: "vm", to: "web", label: "outbound", dim: d.network !== "open" },
                  { from: "vm", to: "gh", label: "PR" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <Board d={d} pick={pick} setPick={setPick} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  As first tried
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Fixed
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Agents working…">
                {`Follow task ${o.t.n}`}
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Hand over a spec, not a title" what="“Make onboarding better” gets a plausible PR that isn't what you meant. A few lines on the goal, the files involved and the test that proves it done turn a guess into a task." accent={ACCENT} active={at(0)}>
                {toggle("specs", "Each task has a short spec and an acceptance test")}
              </FlowStep>
              <FlowArrow label="task" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Give the machine a working environment" what="An agent that can't install dependencies can't run tests, so it hands back untested code. A setup script fixes that at a few minutes per run; a prepared snapshot starts ready." accent={ACCENT} active={at(1)}>
                <Choices<Env> label="Machine" accent={ACCENT} value={d.env} onChange={(v) => set({ env: v })} options={[{ id: "bare", label: "Repo only" }, { id: "script", label: "Setup script" }, { id: "snapshot", label: "Ready snapshot" }]} />
              </FlowStep>
              <FlowArrow label="a ready machine" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Run in parallel, but not on the same code" what="Twelve at once is fastest, until two agents rewrite the same billing code and one PR has to be redone. Cap how many run at once, and don't run two tasks in the same area together." accent={ACCENT} active={at(2)}>
                <Choices label="Agents at a time" accent={ACCENT} value={String(d.parallel)} onChange={(v) => set({ parallel: Number(v) as Design["parallel"] })} options={[{ id: "1", label: "1" }, { id: "4", label: "4" }, { id: "12", label: "12" }]} />
                {toggle("byArea", "Never two tasks in the same area at once")}
              </FlowStep>
              <FlowArrow label="work" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Limit what the machine can reach" what="Agents read issues, docs and web pages, and any of them can carry instructions. A machine that can only reach the package registry and GitHub can't send your environment anywhere else." accent={ACCENT} active={at(3)}>
                <Choices label="Network" accent={ACCENT} value={d.network} onChange={(v: Design["network"]) => set({ network: v })} options={[{ id: "open", label: "Open internet" }, { id: "allowlist", label: "Registry and GitHub only" }]} />
              </FlowStep>
              <FlowArrow label="pull requests" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Count PRs worth merging" what="Each PR still needs a person's review. Throughput is the PRs you can merge, not the PRs you get." accent={ACCENT} active={at(4)}>
                <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-xs">
                  <dt>Ready to merge</dt>
                  <dd className="text-right font-mono" style={{ color: r.merged === TASKS.length ? "var(--good)" : "var(--c2)" }}>{r.merged} / {TASKS.length}</dd>
                  <dt>Wrong thing · CI red · conflicts</dt>
                  <dd className="text-right font-mono">{r.wrong} · {r.red} · {r.conflicts}</dd>
                  <dt>Secrets sent out</dt>
                  <dd className="text-right font-mono" style={{ color: r.leaks ? "var(--bad)" : "var(--good)" }}>{r.leaks}</dd>
                  <dt>Time until all PRs are in</dt>
                  <dd className="text-right font-mono">{hm(r.wallMin)}</dd>
                  <dt>Agent cost · your review time</dt>
                  <dd className="text-right font-mono">${r.cost.toFixed(2)} · {hm(r.reviewMin)}</dd>
                </dl>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Task outcomes and durations are illustrative (cost at ${COST_PER_AGENT_HOUR} an agent-hour, {REVIEW_MIN} min to review a PR). Setup, scheduling, conflicts, the injection and the totals run here.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Board({ d, pick, setPick }: { d: Design; pick: number; setPick: (n: number) => void }) {
  const r = runBatch(d);
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Twelve tasks and the pull request each produced">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">tasks · pick one</p>
        <p className="font-mono text-xs" style={{ color: r.merged === TASKS.length ? "var(--good)" : "var(--c2)" }}>
          {r.merged}/{TASKS.length} ready
        </p>
      </div>
      <ul className="mt-3 grid gap-1 sm:grid-cols-2">
        {r.outcomes.map((o) => (
          <li key={o.t.n}>
            <button type="button" aria-pressed={o.t.n === pick} onClick={() => setPick(o.t.n)} className="grid min-h-11 w-full grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-1.5 text-left text-xs" style={{ background: o.t.n === pick ? `color-mix(in srgb, ${ACCENT} 14%, transparent)` : "transparent" }}>
              <span className="font-mono text-[var(--faint)]">{o.t.n}</span>
              <span className="min-w-0 truncate">{o.t.title}</span>
              <span className="text-right text-[11px]" style={{ color: o.leaked ? "var(--bad)" : COLOR[o.result] }}>
                {o.leaked ? "leaked env" : WORD[o.result]}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
