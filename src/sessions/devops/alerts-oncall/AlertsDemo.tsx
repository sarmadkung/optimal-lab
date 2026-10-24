"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { BUDGET, DAYS, FIRST, FIXED, OUTAGE, PODS, SLO, SLOW, evaluate, fmtMin, series, type Design, type Signal } from "@/lib/alerting";

const ACCENT = "var(--ops)";
const SLO_PCT = (SLO * 100).toFixed(1);
type Case = "outage" | "slow" | "night";
const CASES: { id: Case; label: string }[] = [
  { id: "outage", label: "Day 20, 03:10: a bad config push" },
  { id: "slow", label: "Day 12: a dependency fails 0.7% of calls" },
  { id: "night", label: "Any night, 02:00: the batch job" },
];
const SERIES = series();
const DAILY = Array.from({ length: DAYS }, (_, d) => {
  let max = 0;
  for (let m = d * 1440; m < (d + 1) * 1440; m++) max = Math.max(max, SERIES.err[m]);
  return max;
});

export default function AlertsDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [c, setC] = useState<Case>("outage");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((x) => ({ ...x, ...p }));
  const e = evaluate(d);
  const inc = c === "outage" ? e.outage : c === "slow" ? e.slow : null;
  const paged = c === "night" ? d.signal === "causes" : inc!.detect !== null;
  const good = c === "night" ? !paged : paged;
  const copies = d.grouping ? 1 : PODS;
  const pagesPerDay = Array.from({ length: DAYS }, (_, day) => e.fired.filter((f) => Math.floor(f.start / 1440) === day).reduce((a, f) => a + (d.grouping || f.rule.startsWith("log disk") ? 1 : PODS), 0));
  const outageBurn = Math.round(OUTAGE.rate / BUDGET);
  const slowBurn = Math.round(SLOW.rate / BUDGET);

  const nodes: MapNode[] = [
    { id: "svc", label: `Service, ${PODS} pods`, sub: c === "night" ? "CPU 95%, users fine" : c === "outage" ? "25% of requests fail" : "0.7% of requests fail", at: [14, 18], mobileAt: [25, 12], state: c === "night" ? "active" : "bad" },
    { id: "rules", label: "Alert rules", sub: d.signal === "causes" ? "CPU, disk" : d.burn ? "SLO burn rate" : "error rate > 1%", at: [50, 18], mobileAt: [75, 12], state: good ? "good" : "bad" },
    { id: "am", label: "Alertmanager", sub: d.grouping ? "groups by service" : `${PODS} alerts, ${PODS} pages`, at: [86, 18], mobileAt: [75, 45], state: paged ? (d.grouping ? "good" : "wait") : "dim" },
    { id: "central", label: "Central on-call", sub: d.owner ? "not involved" : "finds the owner", at: [86, 82], mobileAt: [25, 45], state: paged && !d.owner ? "wait" : "dim" },
    { id: "owner", label: "Checkout team", sub: d.owner ? "paged directly" : "pulled in later", at: [50, 82], mobileAt: [25, 80], state: paged ? (good ? "good" : "bad") : "dim" },
    { id: "second", label: "Secondary", sub: d.escalate ? "paged after 10 min" : "no escalation", at: [14, 82], mobileAt: [75, 80], state: d.escalate && c === "outage" && paged ? "active" : "dim" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("m", ["svc", "rules"], { label: c === "night" ? "CPU 95%" : c === "outage" ? "25% errors" : "0.7% errors" })
    : stage === 1 ? (paged ? hops("f", ["rules", "am"], { label: "firing", tone: good ? "good" : "bad" }) : [])
    : stage === 2 ? (paged ? hops("g", ["am", d.owner ? "owner" : "central"], { label: `${copies} page${copies === 1 ? "" : "s"}`, tone: d.grouping ? undefined : "bad" }) : [])
    : stage === 3 ? (paged && !d.owner ? hops("r", ["central", "owner"], { label: "who owns this?" }) : [])
    : stage === 4 ? (paged && c === "outage" ? hops("e", [d.owner ? "owner" : "central", "second"], { label: d.escalate ? "escalate" : "nobody", tone: d.escalate ? "good" : "bad" }) : [])
    : [];

  const captions = [
    c === "night" ? "Step 1: the nightly batch job pegs CPU for 20 minutes; requests are fine." : `Step 1: errors at ${c === "outage" ? "25%" : "0.7%"}, burning the error budget ${c === "outage" ? outageBurn : slowBurn}× faster than the SLO allows.`,
    paged ? `Step 2: ${c === "night" ? "the CPU rule fires, though nobody is affected" : `a rule fires after ${fmtMin(inc!.detect)}`}.` : c === "night" ? "Step 2: nothing fires: users aren't affected." : "Step 2: no rule fires; customers will notice first.",
    paged ? `Step 3: ${copies} page${copies === 1 ? "" : "s"} go out${d.grouping ? ", one per service" : ", one per pod"}.` : "Step 3: no pages.",
    paged ? (d.owner ? "Step 4: routing sends it straight to the checkout team." : "Step 4: central on-call gets it and spends 20 minutes finding the owning team.") : "Step 4: nobody to route to.",
    c === "outage" && paged ? `Step 5: at 03:13 the primary is asleep${d.escalate ? "; after 10 minutes the secondary is paged" : " and nothing escalates"}. Acknowledged after ${fmtMin(e.outage.ack)}.` : c === "slow" && paged ? `Step 5: acknowledged after ${fmtMin(e.slow.ack)}, in working hours.` : "Step 5: nothing to escalate.",
  ];
  const caption = stage !== null ? captions[stage] : `Month: ${e.pages} pages, ${e.noise} with no user impact · outage ${e.outage.ack === null ? "never paged" : `acknowledged after ${fmtMin(e.outage.ack)}`} · slow burn ${e.slow.detect === null ? "never paged" : `paged after ${fmtMin(e.slow.detect)}`}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="Alerts and on-call"
        blurb={`A month of one service with a ${SLO_PCT}% SLO: a bad config push at 3 a.m., a day of a dependency quietly failing, and a batch job that pegs CPU every night. Every page wakes a person. Decide what pages, how it's measured, grouped, routed and escalated, and count the month's pages.`}
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="The service's metrics go through alert rules and Alertmanager to central on-call or the owning team, with escalation to a secondary"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "svc", to: "rules", label: "metrics" },
                  { from: "rules", to: "am", label: "firing" },
                  { from: "am", to: d.owner ? "owner" : "central", label: "page" },
                  { from: "central", to: "owner", label: "hand over", dim: d.owner },
                  { from: "owner", to: "second", label: "escalate", dim: !d.escalate },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="The month">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">
                  the month · {e.pages} pages · {e.noise} noise · {Math.round(e.budgetUsed * 100)}% of the error budget used
                </p>
                <div className="mt-2 grid gap-px" style={{ gridTemplateColumns: `repeat(${DAYS}, minmax(0, 1fr))` }} aria-hidden>
                  {DAILY.map((x, i) => (
                    <div key={i} className="h-5 rounded-sm" style={{ background: x >= 0.05 ? "var(--bad)" : x >= 0.005 ? "var(--c2)" : "color-mix(in srgb, var(--good) 35%, transparent)" }} />
                  ))}
                  {pagesPerDay.map((n, i) => (
                    <div key={`p${i}`} className="text-center font-mono text-[8px] text-[var(--muted)]">
                      {n || ""}
                    </div>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-[var(--faint)]">Each column is a day: red an outage, amber elevated errors. The number under it is that day&apos;s pages.</p>
                <ul className="mt-3 space-y-1 text-xs">
                  <li>
                    <span style={{ color: e.outage.ack !== null && e.outage.ack < 20 ? "var(--good)" : "var(--bad)" }}>Outage:</span> {e.outage.detect === null ? "never paged; customers reported it" : `paged after ${fmtMin(e.outage.detect)}, acknowledged after ${fmtMin(e.outage.ack)}`}
                  </li>
                  <li>
                    <span style={{ color: e.slow.detect !== null ? "var(--good)" : "var(--bad)" }}>Slow burn:</span> {e.slow.detect === null ? "never paged; found when customers complained" : `paged after ${fmtMin(e.slow.detect)}`}
                  </li>
                  <li>
                    <span style={{ color: e.noise ? "var(--bad)" : "var(--good)" }}>Noise:</span> {e.noise} pages nobody needed
                  </li>
                </ul>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices<Case> label="Follow" accent={ACCENT} value={c} onChange={setC} options={CASES} />
              </div>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Alert on everything
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  SLO burn, grouped, routed
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Paging…">
                Play it
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Page on what users feel" what="High CPU or a filling disk might matter later; errors and slow responses matter now. Page on symptoms and turn causes into tickets or dashboards, or the pager trains people to ignore it." accent={ACCENT} active={at(0)}>
                <Choices<Signal> label="Pages are based on" accent={ACCENT} value={d.signal} onChange={(x) => set({ signal: x })} options={[{ id: "causes", label: "Causes: CPU, disk" }, { id: "symptoms", label: "Symptoms: errors" }]} />
              </FlowStep>
              <FlowArrow label="how bad" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Measure against the error budget" what={`A ${SLO_PCT}% SLO allows ${(BUDGET * 100).toFixed(1)}% errors over 30 days. Burn rate is how fast you're spending that. Two windows each: page on 14.4× for an hour (2% of the budget gone), or 6× for six hours (5%), and catch slow leaks a fixed threshold never sees.`} accent={ACCENT} active={at(1)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.burn} disabled={d.signal === "causes"} onChange={(ev) => set({ burn: ev.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Multiwindow burn-rate alerts
                </label>
                <p className="font-mono text-[11px] text-[var(--muted)]">
                  outage burns {outageBurn}× · slow leak burns {slowBurn}× · 1% threshold = {Math.round(0.01 / BUDGET)}×
                </p>
              </FlowStep>
              <FlowArrow label="alerts" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="One incident, one page" what={`Every pod evaluates the same rule, so one bad push fires ${PODS} alerts. Grouping by service turns them into one page with ${PODS} lines in it.`} accent={ACCENT} active={at(2)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.grouping} onChange={(ev) => set({ grouping: ev.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Group alerts by service
                </label>
              </FlowStep>
              <FlowArrow label="page" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Route to the team that owns it" what="A label on the alert names the owning team, and the routing tree pages that team's rotation. A central on-call spends the first twenty minutes finding someone who knows the service." accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.owner} onChange={(ev) => set({ owner: ev.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Route by team label
                </label>
              </FlowStep>
              <FlowArrow label="no answer?" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Escalate when nobody answers" what="At 3 a.m. phones are on silent. An escalation policy pages the secondary if the primary hasn't acknowledged in ten minutes, and the manager after that." accent={ACCENT} active={at(4)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.escalate} onChange={(ev) => set({ escalate: ev.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Escalate after 10 minutes
                </label>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The rules run here over 43,200 minutes of generated metrics: real windowed error rates and burn rates. Response times are illustrative.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
