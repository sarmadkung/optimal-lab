"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type NodeState, type Packet } from "@/components/system/SystemMap";
import { EVENTS, WORKFLOW, run, runnerMinutes, type EventId, type Job } from "@/lib/githubActions";

const ACCENT = "var(--tools)";
const STATUS_COLOR = { success: "var(--good)", failure: "var(--bad)", skipped: "var(--faint)" };

export default function GithubActionsDemo() {
  const [event, setEvent] = useState<EventId>("pr");
  const [fail, setFail] = useState(false);
  const [cache, setCache] = useState(false);
  const { stage, busy, run: walk } = useWalk(5, 1000);
  const ev = EVENTS.find((e) => e.id === event)!;
  const r = run(event, fail, cache);
  const lit = (...at: number[]): NodeState => (stage !== null && at.includes(stage) ? "active" : "idle");
  const done = stage === null;

  const packets: Packet[] =
    stage === 0 ? hops("push", ["dev", "github"], { label: event === "pr" ? "pull_request" : "push" })
    : stage === 1 ? (r.triggered ? hops("match", ["github", "workflow"], { label: "ci.yml" }) : [{ id: "nomatch", from: "github", to: "workflow", label: "no match", tone: "bad" }])
    : stage === 2 && r.triggered ? hops("jobs", ["workflow", "runners"], { label: `${r.jobs.filter((j) => j.runner).length} jobs` })
    : stage === 4 && r.triggered ? hops("checks", ["runners", "checks"], { label: r.checks, tone: r.checks === "passing" ? "good" : "bad" })
    : [];

  const captions = [
    `${ev.detail}: GitHub records the event.`,
    r.triggered ? `ci.yml matches: its on: block lists ${event === "pr" ? "pull_request" : "push to main"}.` : "ci.yml only runs on pushes to main and on pull requests. Nothing starts, and no minutes are used.",
    r.triggered ? "lint and three matrix copies of test start at the same time, each on its own fresh runner." : "No jobs.",
    r.triggered ? `deploy: ${r.jobs.find((j) => j.id === "deploy")!.why}` : "No jobs.",
    r.triggered ? `Checks are ${r.checks}. ${r.checks === "failing" ? "Branch protection blocks the merge." : "The merge button turns green."}` : "No checks reported.",
  ];
  const caption = done ? (r.triggered ? `Pick an event and run it. This one takes about ${r.total}s and ${runnerMinutes(r.jobs)} billable runner minutes.` : captions[1]) : captions[stage];

  return (
    <SessionPage>
      <SessionHeader
        kicker="Tools · interactive"
        title="GitHub Actions on every push"
        blurb="One YAML file decides what runs when you push. Follow an event through on:, parallel jobs, a matrix and needs:, and see why deploy only runs on main."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-4">
              <SystemMap
                title="Developer, GitHub, the workflow file, the runners and the pull request checks"
                accent={ACCENT}
                chrome="split"
                nodes={[
                  { id: "dev", label: "You", sub: "git push", at: [11, 28], mobileAt: [26, 12], state: lit(0) },
                  { id: "github", label: "GitHub", sub: ev.detail.split(" ")[0], at: [38, 28], mobileAt: [74, 12], state: lit(0, 1) },
                  { id: "workflow", label: "ci.yml", sub: r.triggered ? "on: matched" : "no match", at: [64, 28], mobileAt: [26, 50], state: stage === 1 && !r.triggered ? "bad" : lit(1, 2) },
                  { id: "runners", label: "Runners", sub: r.triggered ? `${r.jobs.filter((j) => j.runner).length} VMs` : "idle", at: [64, 76], mobileAt: [74, 50], state: r.triggered ? lit(2, 3) : "dim" },
                  { id: "checks", label: "PR checks", sub: r.triggered ? r.checks : "—", at: [89, 76], mobileAt: [50, 88], state: stage === 4 ? (r.checks === "passing" ? "good" : "bad") : r.triggered ? "idle" : "dim" },
                ]}
                links={[
                  { from: "dev", to: "github", label: "event" },
                  { from: "github", to: "workflow", label: "match on:" },
                  { from: "workflow", to: "runners", label: "jobs", dim: !r.triggered },
                  { from: "runners", to: "checks", label: "status", dim: !r.triggered },
                ]}
                packets={packets}
                aspect={2.4}
                mobileAspect={1.1}
              />
              <Yaml highlight={stage === 1 ? ev.lines : stage === 2 ? [8, 12, 14, 15, 16] : stage === 3 ? [19, 20, 21] : []} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <Choices label="Event" accent={ACCENT} value={event} onChange={setEvent} options={EVENTS.map((e) => ({ id: e.id, label: e.label }))} />
              <div className="flex w-full flex-wrap gap-2">
                <Toggle on={fail} onChange={setFail} label="Break a test on Node 18" />
                <Toggle on={cache} onChange={setCache} label="Cache npm dependencies" />
              </div>
              <RunButton busy={busy} onClick={walk} accent={ACCENT} running="Running…">
                Run it
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="A push fires an event" what="Every push, pull request, tag or schedule is an event with a name and a branch." accent={ACCENT} active={stage === 0}>
                <p className="font-mono text-sm">{ev.detail}</p>
              </FlowStep>
              <FlowArrow label="event" accent={ACCENT} active={stage === 1} />

              <FlowStep n={2} title="GitHub matches workflows by on:" what="Each file in .github/workflows/ declares which events start it. No match, no run." accent={ACCENT} active={stage === 1}>
                <p className="text-sm" style={{ color: r.triggered ? "var(--good)" : "var(--bad)" }}>
                  {r.triggered ? "ci.yml matches." : "ci.yml does not match a push to a feature branch."}
                </p>
              </FlowStep>
              <FlowArrow label="jobs" accent={ACCENT} active={stage === 2} />

              <FlowStep n={3} title="Jobs start in parallel on fresh runners" what="Jobs with no needs: start together, each on a clean VM. A matrix copies one job per value." accent={ACCENT} active={stage === 2}>
                <Gantt jobs={r.jobs.filter((j) => j.id !== "deploy")} total={r.total} />
                {r.triggered && <p className="mt-2 text-xs text-[var(--faint)]">npm ci {cache ? "restored from cache: 7s" : "downloads everything: 38s"}</p>}
              </FlowStep>
              <FlowArrow label="all upstream jobs done" accent={ACCENT} active={stage === 3} />

              <FlowStep n={4} title="needs: waits, and if: can skip" what="deploy waits for lint and every test. If any failed, or this isn't main, it's skipped and never takes a runner." accent={ACCENT} active={stage === 3}>
                {r.triggered ? (
                  <p className="text-sm" style={{ color: STATUS_COLOR[r.jobs.find((j) => j.id === "deploy")!.status] }}>
                    deploy: {r.jobs.find((j) => j.id === "deploy")!.status}, {r.jobs.find((j) => j.id === "deploy")!.why}
                  </p>
                ) : (
                  <p className="text-sm text-[var(--faint)]">No run.</p>
                )}
              </FlowStep>
              <FlowArrow label="statuses" accent={ACCENT} active={stage === 4} />

              <FlowStep n={5} title="Results come back as checks" what="Each job reports a check on the commit. Branch protection can require them before a merge." accent={ACCENT} active={stage === 4}>
                <ul className="space-y-1 text-sm">
                  {r.jobs.map((j) => (
                    <li key={j.id} className="flex justify-between gap-2">
                      <span>{j.name}</span>
                      <span style={{ color: STATUS_COLOR[j.status] }}>{j.status}</span>
                    </li>
                  ))}
                  {!r.triggered && <li className="text-[var(--faint)]">No checks.</li>}
                </ul>
                {r.triggered && <p className="mt-2 text-xs text-[var(--faint)]">Wall time ~{r.total}s · {runnerMinutes(r.jobs)} billable minutes (each job rounds up)</p>}
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex min-h-11 items-center gap-2 rounded-md border border-[var(--line)] px-3 text-sm">
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" style={{ accentColor: ACCENT }} />
      {label}
    </label>
  );
}

function Yaml({ highlight }: { highlight: number[] }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3 text-xs leading-5" aria-label=".github/workflows/ci.yml">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">.github/workflows/ci.yml</span>
      {WORKFLOW.split("\n").map((line, i) => (
        <span
          key={i}
          className="block font-mono transition-colors"
          style={highlight.includes(i + 1) ? { background: "color-mix(in srgb, var(--tools) 20%, transparent)", color: "var(--text)" } : { color: "var(--muted)" }}
        >
          {line || " "}
        </span>
      ))}
    </pre>
  );
}

function Gantt({ jobs, total }: { jobs: Job[]; total: number }) {
  if (!jobs.length) return <p className="text-sm text-[var(--faint)]">No jobs.</p>;
  return (
    <ul className="space-y-1.5">
      {jobs.map((j) => (
        <li key={j.id} className="grid grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)] items-center gap-2 text-xs">
          <span className="truncate">{j.name}</span>
          <span className="relative h-3 rounded bg-[var(--track)]">
            <span className="absolute inset-y-0 rounded" style={{ left: `${(j.start / total) * 100}%`, width: `${((j.end - j.start) / total) * 100}%`, background: STATUS_COLOR[j.status] }} />
          </span>
        </li>
      ))}
    </ul>
  );
}
