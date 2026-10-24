"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { FIRST, FIXED, INCIDENTS, MINUTES, START, panels, questions, type Design, type Incident, type Series } from "@/lib/goldenSignals";

const ACCENT = "var(--ops)";

function Spark({ s }: { s: Series }) {
  const W = 300;
  const H = 56;
  const max = Math.max(...s.values, s.threshold ?? 0) * 1.1 || 1;
  const y = (v: number) => H - 4 - (v / max) * (H - 8);
  const pts = s.values.map((v, i) => `${(i / (MINUTES - 1)) * W},${y(v)}`).join(" ");
  const last = s.values.at(-1)!;
  const over = s.threshold !== undefined && last > s.threshold;
  return (
    <figure className="mt-2">
      <figcaption className="flex justify-between gap-2 font-mono text-[10px] text-[var(--muted)]">
        <span>{s.label}</span>
        <span style={{ color: over ? "var(--bad)" : "var(--text)" }}>
          {last.toLocaleString("en-US")}
          {s.unit === "%" ? "%" : s.unit ? ` ${s.unit}` : ""}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 h-14 w-full" preserveAspectRatio="none" role="img" aria-label={`${s.label}: ${s.values[0]} at minute 0, ${last} at minute ${MINUTES}`}>
        <line x1={(START / (MINUTES - 1)) * W} x2={(START / (MINUTES - 1)) * W} y1={0} y2={H} stroke="var(--line)" strokeDasharray="2 3" />
        {s.threshold !== undefined && <line x1={0} x2={W} y1={y(s.threshold)} y2={y(s.threshold)} stroke="var(--bad)" strokeOpacity={0.5} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />}
        <polyline points={pts} fill="none" stroke={over ? "var(--bad)" : ACCENT} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      </svg>
    </figure>
  );
}

export default function DashboardsDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [inc, setInc] = useState<Incident>("pool");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const p = panels(inc, d);
  const qs = questions(inc, d);
  const answered = qs.filter((q) => q.ok).length;

  const nodes: MapNode[] = [
    { id: "users", label: "Shoppers", sub: `${p.traffic.values.at(-1)} requests a minute`, at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "svc", label: "Checkout service", sub: inc === "deploy" ? "new version at :30" : "3 endpoints", at: [50, 18], mobileAt: [75, 12], state: "active" },
    { id: "pool", label: "DB pool", sub: `${p.g.pool.at(-1)}% in use`, at: [86, 18], mobileAt: [75, 45], state: p.g.pool.at(-1)! >= 90 ? "bad" : "active" },
    { id: "db", label: "Postgres", sub: "primary", at: [86, 82], mobileAt: [75, 80], state: "active" },
    { id: "prom", label: "Prometheus", sub: "scrapes every 15 s", at: [50, 82], mobileAt: [25, 80], state: "active" },
    { id: "dash", label: "Dashboard", sub: `${answered}/4 questions answered`, at: [14, 82], mobileAt: [25, 45], state: answered === 4 ? "good" : "bad" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("l", ["users", "svc"], { label: d.percentiles ? "p99" : "avg" })
    : stage === 1 ? hops("t", ["users", "svc"], { label: "rpm" })
    : stage === 2 ? hops("e", ["svc", "users"], { label: d.errorRate ? "error %" : "error count", tone: inc !== "spike" ? "bad" : undefined })
    : stage === 3 ? hops("s", ["svc", "pool", "db"], { label: d.saturation === "pool" ? "pool %" : "CPU %" })
    : stage === 4 ? hops("q", ["prom", "dash"], { label: `${answered}/4`, tone: answered === 4 ? "good" : "bad" })
    : [];

  const captions = [
    `Step 1: latency as ${d.percentiles ? "the 99th percentile" : "an average"}: ${p.latency.map((s) => `${s.label} ${s.values.at(-1)} ms`).join(", ")}.`,
    `Step 2: traffic: ${p.traffic.values[0]} → ${p.traffic.values.at(-1)} requests a minute.`,
    `Step 3: errors as ${d.errorRate ? "a rate per minute" : "a running count"}.`,
    `Step 4: saturation shown as ${p.saturation.label}: ${p.saturation.values.at(-1)}%.`,
    `Step 5: the dashboard answers ${answered} of 4 questions.`,
  ];
  const caption = stage !== null ? captions[stage] : `${INCIDENTS.find((x) => x.id === inc)!.title} at minute ${START}: this dashboard answers ${answered} of 4 questions.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="Dashboards that answer questions"
        blurb="At 3 a.m. a dashboard has one job: tell you whether users are hurting, since when, where, and what's running out. The four golden signals (latency, traffic, errors, saturation) do that when they're drawn right. One hour of a checkout service, built request by request, with something going wrong at minute 30."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Shoppers call the checkout service, which uses a database connection pool and Postgres; Prometheus scrapes it and feeds the dashboard"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "users", to: "svc", label: "HTTP" },
                  { from: "svc", to: "pool", label: "connections" },
                  { from: "pool", to: "db", label: "SQL" },
                  { from: "prom", to: "svc", label: "scrape" },
                  { from: "prom", to: "dash", label: "query" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Four questions">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">four questions · {answered}/4</p>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {qs.map((q) => (
                    <li key={q.q}>
                      <span style={{ color: q.ok ? "var(--good)" : "var(--bad)" }} aria-hidden>
                        {q.ok ? "✓ " : "✕ "}
                      </span>
                      {q.q}
                      <span className="block text-[11px] text-[var(--muted)]">{q.why}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices<Incident> label="At minute 30" accent={ACCENT} value={inc} onChange={setInc} options={INCIDENTS.map((x) => ({ id: x.id, label: x.title }))} />
              </div>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Averages and totals
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Golden signals
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Reading…">
                Read the dashboard
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Latency: watch the slow requests" what="An average mixes thousands of fast requests with the few that hang, so it barely moves. The 99th percentile is the time 1 in 100 users waits longer than. That's where problems show first." accent={ACCENT} active={at(0)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.percentiles} onChange={(e) => set({ percentiles: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  p99 instead of the average
                </label>
                {p.latency.map((s) => (
                  <Spark key={s.label} s={s} />
                ))}
              </FlowStep>
              <FlowArrow label="how much" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Traffic: and split it by endpoint" what="Requests per minute says whether a change is load or something else. Splitting every signal by endpoint answers “everyone, or one thing?” before anyone opens a log." accent={ACCENT} active={at(1)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.perEndpoint} onChange={(e) => set({ perEndpoint: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  One line per endpoint
                </label>
                <Spark s={p.traffic} />
              </FlowStep>
              <FlowArrow label="how many fail" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Errors: a rate, not a count" what="A total that only goes up hides when things went wrong and how bad it is now. The share of requests failing per minute has a clear edge and a number to alert on." accent={ACCENT} active={at(2)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.errorRate} onChange={(e) => set({ errorRate: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Error rate per minute
                </label>
                {p.errors.map((s) => (
                  <Spark key={s.label} s={s} />
                ))}
              </FlowStep>
              <FlowArrow label="what's full" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Saturation: the tightest resource" what="CPU is easy to graph and often not the limit. Show whatever runs out first for this service: here, the database connection pool. When it's full, requests queue for a connection." accent={ACCENT} active={at(3)}>
                <Choices<"cpu" | "pool"> label="Saturation panel" accent={ACCENT} value={d.saturation} onChange={(x) => set({ saturation: x })} options={[{ id: "cpu", label: "Average CPU" }, { id: "pool", label: "DB pool in use" }]} />
                <Spark s={p.saturation} />
              </FlowStep>
              <FlowArrow label="questions" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Ask it the four questions" what="A good dashboard answers, at a glance: are users hurting, since when, where, and what's running out. Anything else can live on a second page." accent={ACCENT} active={at(4)}>
                <p className="text-xs">
                  {answered} of 4 answered from this dashboard.
                </p>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Every line is computed here from {p.g.reqs.length.toLocaleString("en-US")} generated requests (seeded): real percentiles, rates and counts; the dashed red lines are alert thresholds.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
