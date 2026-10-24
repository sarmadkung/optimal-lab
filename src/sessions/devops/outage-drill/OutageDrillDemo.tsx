"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { FIRST, FIXED, T, drill, type Design } from "@/lib/outageDrill";

const ACCENT = "var(--ops)";

export default function OutageDrillDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const r = drill(d);
  const total = r.phases.reduce((a, p) => a + p.minutes, 0);

  const nodes: MapNode[] = [
    { id: "drill", label: "Game day", sub: "12:00 stop the primary", at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "primary", label: "Primary DB", sub: "stopped", at: [50, 18], mobileAt: [75, 12], state: "bad" },
    { id: "standby", label: "Standby DB", sub: d.autoFailover ? `promoted at ${r.clock(T.failoverAuto)}` : "waits for a person", at: [86, 18], mobileAt: [75, 45], state: d.autoFailover ? "good" : "wait" },
    { id: "apps", label: "App pods", sub: d.reconnect ? "reconnect in a minute" : "stuck on the old IP", at: [86, 82], mobileAt: [75, 80], state: d.reconnect ? "good" : "bad" },
    { id: "oncall", label: d.runbook ? "Incident commander" : "On-call engineers", sub: d.alerting ? `paged at ${r.clock(T.detectAlert)}` : `hears at ${r.clock(T.detectCustomers)}`, at: [50, 82], mobileAt: [25, 80], state: d.alerting && d.runbook ? "good" : "wait" },
    { id: "users", label: "Customers", sub: `${r.downtime} min down · ${r.tickets} tickets`, at: [14, 82], mobileAt: [25, 45], state: r.downtime <= 5 ? "good" : "bad" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("k", ["drill", "primary"], { label: "stop", tone: "bad" })
    : stage === 1 ? (d.alerting ? hops("a", ["primary", "oncall"], { label: "page" }) : hops("a", ["users", "oncall"], { label: "complaints", tone: "bad" }))
    : stage === 2 ? (d.autoFailover ? hops("f", ["primary", "standby"], { label: "auto promote", tone: "good" }) : hops("f", ["oncall", "standby"], { label: "promote by hand" }))
    : stage === 3 ? hops("r", ["apps", "standby"], { label: d.reconnect ? "reconnect" : "old IP", tone: d.reconnect ? "good" : "bad" })
    : stage === 4 ? hops("p", ["oncall", "drill"], { label: `${r.findings.length} findings` })
    : [];

  const captions = [
    `Step 1: ${r.phases[0].note}, after ${r.phases[0].minutes} min.`,
    `Step 2: ${r.phases[1].note} (${r.phases[1].minutes} min).`,
    `Step 3: ${r.phases[2].note} (${r.phases[2].minutes} min).`,
    `Step 4: ${r.phases[3].note} (${r.phases[3].minutes} min).`,
    `Step 5: customers were affected for ${r.downtime} minutes. ${r.findings.length ? `The drill found ${r.findings.length} problem${r.findings.length === 1 ? "" : "s"}; ${r.fixedNextQuarter} fixed by next quarter.` : "Nothing new to fix."}`,
  ];
  const caption = stage !== null ? captions[stage] : `${r.downtime} minutes of downtime · ${r.tickets} support tickets · ${r.findings.length} findings, ${r.fixedNextQuarter} fixed by the next drill.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · case study"
        title="Run an outage drill"
        blurb="The cheapest way to learn how an outage goes is to cause one on purpose, on a Tuesday at noon, with everyone ready. Stop the primary database and watch what happens: who notices, who's in charge, whether failover and the apps recover on their own, and what the postmortem turns into."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="The game day stops the primary database; a standby takes over; app pods reconnect; on-call responds; customers feel the downtime"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "drill", to: "primary", label: "stop" },
                  { from: "primary", to: "standby", label: "replicates" },
                  { from: "apps", to: "standby", label: "SQL" },
                  { from: "primary", to: "oncall", label: "alert", dim: !d.alerting },
                  { from: "users", to: "oncall", label: "tickets" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="The drill's timeline and findings">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">12:00 → back at {r.clock(r.downtime)} · {r.downtime} min down</p>
                <ul className="mt-2 space-y-1.5">
                  {r.phases.map((p) => (
                    <li key={p.name} className="text-xs">
                      <span className="flex items-center gap-2">
                        <span className="w-24 shrink-0">{p.name}</span>
                        <span className="h-2 rounded-sm" style={{ width: `${Math.max(2, (p.minutes / Math.max(total, 1)) * 60)}%`, background: p.bad ? "var(--bad)" : ACCENT }} />
                        <span className="font-mono text-[11px] text-[var(--muted)]">{p.minutes} min</span>
                      </span>
                      <span className="block text-[11px] text-[var(--muted)]">{p.note}</span>
                    </li>
                  ))}
                </ul>
                {d.autoFailover && <p className="mt-1 text-[11px] text-[var(--faint)]">Failover started at 12:00 without waiting for anyone, so noticing and organising don&apos;t add to the downtime.</p>}
                <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">postmortem action items</p>
                <ul className="mt-1 space-y-0.5 text-[11px]">
                  {r.findings.length === 0 && <li className="text-[var(--good)]">none: the system behaved as designed</li>}
                  {r.findings.map((f, i) => (
                    <li key={f} style={{ color: i < r.fixedNextQuarter ? "var(--good)" : "var(--bad)" }}>
                      {i < r.fixedNextQuarter ? "✓ fixed: " : "✕ still open: "}
                      {f}
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
                  First drill
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  After the fixes
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Drilling…">
                Stop the primary
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Notice before customers do" what="An alert on the error rate pages someone in a couple of minutes. Without one, the first signal is support forwarding complaints, a quarter of an hour later." accent={ACCENT} active={at(0)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.alerting} onChange={(e) => set({ alerting: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Error-rate alert on the API
                </label>
              </FlowStep>
              <FlowArrow label="people" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Put one person in charge" what="An incident commander coordinates, a runbook says what to check, and someone updates the status page so support isn't buried in tickets. Without roles, everyone tries something at once." accent={ACCENT} active={at(1)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.runbook} onChange={(e) => set({ runbook: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Incident commander, runbook and status page
                </label>
              </FlowStep>
              <FlowArrow label="the database" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Fail over without waiting for people" what="Automatic failover promotes the standby within a minute of the primary dying, whether or not anyone has noticed yet. Manual failover starts the clock only once the right person is found." accent={ACCENT} active={at(2)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.autoFailover} onChange={(e) => set({ autoFailover: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Automatic failover
                </label>
              </FlowStep>
              <FlowArrow label="the apps" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Make the apps follow" what="A promoted standby has a new address. Apps whose connection pools cached the old one keep failing until restarted; apps that retry and re-resolve the name recover by themselves. Drills are how teams find out which kind they have." accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.reconnect} onChange={(e) => set({ reconnect: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Retry and re-resolve database connections
                </label>
              </FlowStep>
              <FlowArrow label="afterwards" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Write the postmortem, and finish it" what="A blameless postmortem lists what went wrong in the system, not who. It's only worth anything if each action item has an owner and a date, and the next drill checks they were done." accent={ACCENT} active={at(4)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.postmortem} onChange={(e) => set({ postmortem: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Action items with owners and due dates
                </label>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Downtime is added up phase by phase here; the phase times and ticket rate are illustrative.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
