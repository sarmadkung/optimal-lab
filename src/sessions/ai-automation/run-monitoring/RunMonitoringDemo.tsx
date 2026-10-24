"use client";

import { useState, type ReactNode } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { DIAGNOSE, FIRST, FIXED, HOURS, INCIDENTS, RATE, RUNS_PER_HOUR, TRANSIENT_FAILURES, detect, runAll, type Design, type IncidentId } from "@/lib/runMonitoring";

const ACCENT = "var(--auto)";
const hrs = (h: number) => (h < 1 ? `${Math.round(h * 60)} min` : `${Math.round(h * 10) / 10} h`);

export default function RunMonitoringDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [pick, setPick] = useState<IncidentId>("empty");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const all = runAll(d);
  const s = all.seen.find((x) => x.incident.id === pick)!;
  const inc = s.incident;
  const det = detect(inc, d);

  const toggle = (k: "history" | "zeroItems" | "heartbeat", label: string, extra?: ReactNode) => (
    <>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={d[k]} onChange={(e) => set({ [k]: e.target.checked } as Partial<Design>)} className="h-4 w-4" style={{ accentColor: ACCENT }} />
        {label}
      </label>
      {extra}
    </>
  );

  const nodes: MapNode[] = [
    { id: "sched", label: "Scheduler", sub: inc.id === "scheduler" ? "dead after a reboot" : `${RUNS_PER_HOUR} runs an hour`, at: [14, 18], mobileAt: [25, 12], state: inc.id === "scheduler" ? "bad" : "active" },
    { id: "flow", label: "Invoice workflow", sub: inc.id === "stuck" ? "one run hung" : inc.id === "empty" ? "succeeds, 0 invoices" : inc.failRate ? `${Math.round(inc.failRate * 100)}% failing` : "running", at: [50, 18], mobileAt: [75, 12], state: inc.silent ? "wait" : "bad" },
    { id: "vendor", label: "Vendor API", sub: inc.id === "blip" ? "500 for 40 min" : inc.id === "empty" ? "token revoked" : "up", at: [86, 18], mobileAt: [75, 42], state: inc.id === "blip" || inc.id === "empty" ? "bad" : "good" },
    { id: "store", label: "Run history", sub: d.history ? "every run, every step" : "logs only", at: [50, 80], mobileAt: [25, 42], state: d.history ? "good" : "dim" },
    { id: "alert", label: "Alerting", sub: `${all.alerts} alerts this week`, at: [86, 80], mobileAt: [75, 74], state: s.by ? "good" : d.onFailure === "none" && !d.zeroItems && !d.heartbeat ? "dim" : "idle" },
    { id: "team", label: "On-call person", sub: s.by ? `told after ${hrs(det.after!)}` : inc.complaint ? `hears after ${hrs(inc.complaint)}` : "never needed", at: [14, 80], mobileAt: [25, 74], state: s.by ? "good" : inc.complaint ? "bad" : "idle" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("r", ["sched", "flow", "vendor"], { label: inc.id === "scheduler" ? "no runs" : "run", tone: inc.id === "scheduler" ? "bad" : undefined })
    : stage === 1 ? hops("h", ["flow", "store"], { label: d.history ? "run + steps + items" : "a log line" })
    : stage === 2 ? (s.by ? hops("a", ["store", "alert"], { label: s.by.split(" ").slice(0, 3).join(" "), tone: "good" }) : [])
    : stage === 3 ? (s.by ? hops("p", ["alert", "team"], { label: "page" }) : inc.complaint ? hops("c", ["vendor", "team"], { label: "customer complains", tone: "bad" }) : [])
    : stage === 4 ? (inc.heals === undefined ? hops("f", ["team", "store", "flow"], { label: d.history ? "failed step found" : "reading logs…" }) : [])
    : [];

  const captions = [
    `Step 1: hour ${inc.start} of the week: ${inc.label.toLowerCase()}.`,
    d.history ? "Step 2: every run is recorded with its status, each step's result and how many invoices it handled." : "Step 2: only scattered log lines are kept; a run that did nothing looks like a run that worked.",
    s.by ? `Step 3: an alert fires: ${s.by}.` : inc.silent ? "Step 3: no run fails, so failure alerts stay quiet." : d.onFailure === "none" ? "Step 3: nothing is watching failures." : "Step 3: the failures don't trip any rule.",
    s.by ? `Step 4: someone is told after ${hrs(det.after!)}.` : inc.complaint ? `Step 4: nobody knows until a customer or a colleague complains, after ${hrs(inc.complaint)}.` : "Step 4: it fixes itself; nobody needs to act.",
    inc.heals !== undefined ? "Step 5: it healed on its own after 40 minutes." : `Step 5: fixed ${hrs(s.hours)} after it started${d.history ? "" : `, ${DIAGNOSE.blind} h of it spent finding where it broke`}; ${s.delayed} invoices delayed.`,
  ];
  const caption = stage !== null ? captions[stage] : `${all.caught} of ${all.incidents} incidents caught by an alert · ${all.outageHours} hours of trouble · ${all.delayed} invoices delayed · ${all.alerts} alerts sent.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Automation · interactive"
        title="Monitoring runs and failures"
        blurb="An invoice workflow runs 12 times an hour for a week. Four things go wrong, and three of them never raise an error: a revoked token makes every run succeed with nothing in it, the scheduler doesn't come back after a reboot, and a hung run blocks the rest. Choose what to record and what to alert on, and count how long each problem lasts."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Scheduler, the invoice workflow, the vendor API, run history, alerting and the on-call person"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "sched", to: "flow", label: "start" },
                  { from: "flow", to: "vendor", label: "fetch" },
                  { from: "flow", to: "store", label: "record" },
                  { from: "store", to: "alert", label: "rules" },
                  { from: "alert", to: "team", label: "page" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <Week d={d} pick={pick} setPick={setPick} />
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
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Replaying…">
                Replay this incident
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Expect quiet failures" what="The failures that hurt most don't throw: an API that answers 200 with nothing in it, a schedule that stops firing, a run that waits forever. Error alerts can't see any of them." accent={ACCENT} active={at(0)}>
                <p className="text-xs">
                  {inc.label}. <span className="text-[var(--muted)]">{inc.silent ? "No run fails." : `${Math.round(inc.failRate * 100)}% of runs fail.`}</span>
                </p>
              </FlowStep>
              <FlowArrow label="runs" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Record every run, with its steps and output" what="Keep each run: when it started, each step's status and duration, and how many items it handled. That turns “something's wrong” into “step 2 returned 0 invoices since 14:00”." accent={ACCENT} active={at(1)}>
                {toggle("history", "Keep run history with step status and item counts", <p className="text-[11px] text-[var(--faint)]">Finding where it broke: {d.history ? `${DIAGNOSE.history * 60} min` : `${DIAGNOSE.blind} h`} per incident.</p>)}
              </FlowStep>
              <FlowArrow label="history" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Alert on failure rates, not every failure" what={`An email per failed run is ${TRANSIENT_FAILURES}+ messages a week about things retries already fixed, and people learn to ignore them. Alert when more than ${RATE * 100}% of an hour's runs fail.`} accent={ACCENT} active={at(2)}>
                <Choices<Design["onFailure"]> label="On failed runs" accent={ACCENT} value={d.onFailure} onChange={(v) => set({ onFailure: v })} options={[{ id: "none", label: "Nothing" }, { id: "every", label: "Email every failure" }, { id: "rate", label: `Alert over ${RATE * 100}% an hour` }]} />
                <p className="mt-2 font-mono text-xs">{all.failedRuns} failed runs · {all.alerts} alerts</p>
              </FlowStep>
              <FlowArrow label="alerts" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Watch output and silence too" what="Alert when runs succeed but handle nothing for hours, when no run has finished in 30 minutes (a dead man's switch for the schedule), and when a run is older than it should ever be." accent={ACCENT} active={at(3)}>
                {toggle("zeroItems", "Alert on zero invoices for 2 hours")}
                {toggle("heartbeat", "Alert when no run finishes in 30 min, or one runs over 30 min")}
              </FlowStep>
              <FlowArrow label="a person" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Count time to notice and time to fix" what="Each incident lasts from its start until it's fixed: time to notice, time to find the failed step, time to fix. Monitoring shortens the first two; nothing else does." accent={ACCENT} active={at(4)}>
                <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-xs">
                  <dt>Incidents caught by an alert</dt>
                  <dd className="text-right font-mono">{all.caught} / {all.incidents}</dd>
                  <dt>Hours of trouble</dt>
                  <dd className="text-right font-mono" style={{ color: all.outageHours > 24 ? "var(--bad)" : "var(--text)" }}>{all.outageHours}</dd>
                  <dt>Invoices delayed</dt>
                  <dd className="text-right font-mono">{all.delayed}</dd>
                  <dt>Alerts sent</dt>
                  <dd className="text-right font-mono" style={{ color: all.alerts > 10 ? "var(--bad)" : "var(--text)" }}>{all.alerts}</dd>
                </dl>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The incidents and how long people take to complain are assumptions. Which rule fires when, fix times and alert counts run here.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Week({ d, pick, setPick }: { d: Design; pick: IncidentId; setPick: (id: IncidentId) => void }) {
  const all = runAll(d);
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="The week's incidents, when each was noticed and fixed">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">the week · pick one</p>
        <p className="font-mono text-xs" style={{ color: all.caught === all.incidents ? "var(--good)" : "var(--bad)" }}>
          {all.outageHours} h of trouble
        </p>
      </div>
      <ul className="mt-3 space-y-0.5">
        {all.seen.map((s) => {
          const left = (s.incident.start / HOURS) * 100;
          const width = Math.max(0.8, (s.hours / HOURS) * 100);
          const det = s.detectAt !== null ? ((s.detectAt - s.incident.start) / HOURS) * 100 : null;
          return (
            <li key={s.incident.id}>
              <button type="button" aria-pressed={s.incident.id === pick} onClick={() => setPick(s.incident.id)} className="grid min-h-11 w-full grid-cols-[minmax(0,1fr)_4rem] items-center gap-2 rounded-md px-1.5 text-left text-xs" style={{ background: s.incident.id === pick ? `color-mix(in srgb, ${ACCENT} 14%, transparent)` : "transparent" }}>
                <span className="min-w-0">
                  <span className="block truncate">{s.incident.label}</span>
                  <span className="relative mt-1 block h-2 w-full rounded-full bg-[var(--track)]">
                    <span className="absolute top-0 block h-full rounded-full" style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%`, background: s.incident.heals !== undefined ? "var(--faint)" : s.by ? "var(--c2)" : "var(--bad)" }} />
                    {det !== null && <span className="absolute -top-0.5 block h-3 w-0.5" style={{ left: `${left + det}%`, background: "var(--text)" }} />}
                  </span>
                </span>
                <span className="text-right font-mono text-[11px]" style={{ color: s.incident.heals !== undefined ? "var(--muted)" : s.by ? "var(--good)" : "var(--bad)" }}>
                  {hrs(s.hours)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11px] text-[var(--faint)]">Bars run from hour 0 to {HOURS}; the tick is when someone was told.</p>
    </section>
  );
}
