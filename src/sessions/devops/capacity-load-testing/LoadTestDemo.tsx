"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { APP, CONSTANT_RPS, DB, FIRST, FIXED, REAL_HIT, SLO_MS, STAGING, TEST_HIT, run, type Design } from "@/lib/loadTesting";

const ACCENT = "var(--ops)";
const MAX_MS = 2000;
const MAX_RPS = 2000;

function Curve({ r, d }: { r: ReturnType<typeof run>; d: Design }) {
  const W = 320;
  const H = 120;
  const x = (rps: number) => (Math.min(rps, MAX_RPS) / MAX_RPS) * W;
  const y = (ms: number) => H - (Math.min(ms, MAX_MS) / MAX_MS) * (H - 6);
  const pts = r.curve.filter((p) => p.rps <= MAX_RPS).map((p) => `${x(p.rps)},${y(Number.isFinite(d.p99 ? p.p99 : p.mean) ? (d.p99 ? p.p99 : p.mean) : MAX_MS)}`).join(" ");
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-32 w-full" preserveAspectRatio="none" role="img" aria-label={`Measured ${d.p99 ? "p99" : "average"} latency rises with load; the test reports ${r.reported ?? "no limit"}, production's real limit is ${r.truth} requests a second`}>
        <line x1={0} x2={W} y1={y(SLO_MS)} y2={y(SLO_MS)} stroke="var(--bad)" strokeOpacity={0.6} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
        <line x1={x(r.truth)} x2={x(r.truth)} y1={0} y2={H} stroke="var(--good)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        {r.reported !== null && <line x1={x(r.reported)} x2={x(r.reported)} y1={0} y2={H} stroke={ACCENT} vectorEffect="non-scaling-stroke" />}
        {!d.ramp && <rect x={0} y={0} width={x(CONSTANT_RPS)} height={H} fill={ACCENT} opacity={0.08} />}
        <polyline points={pts} fill="none" stroke={ACCENT} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption className="mt-1 text-[11px] text-[var(--faint)]">
        {d.p99 ? "p99" : "average"} latency against requests a second (0–{MAX_RPS.toLocaleString("en-US")}, capped at {MAX_MS / 1000} s). Red dashes: {SLO_MS} ms target. Green: production&apos;s real limit. Solid: what the test reports.
      </figcaption>
    </figure>
  );
}

export default function LoadTestDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const { stage, busy, run: walk } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const r = run(d);

  const nodes: MapNode[] = [
    { id: "gen", label: "Load generator", sub: d.ramp ? "ramps 50 → 2,000 req/s" : `constant ${CONSTANT_RPS} req/s`, at: [14, 18], mobileAt: [25, 12], state: d.ramp ? "good" : "wait" },
    { id: "lb", label: "Load balancer", sub: d.prodLike ? "production-like" : "staging", at: [50, 18], mobileAt: [75, 12], state: "active" },
    { id: "app", label: `App × ${r.env.instances}`, sub: `CPU-bound at ${Math.round(r.atTruth.appCap)} req/s in prod`, at: [86, 18], mobileAt: [75, 45], state: r.seen === "app servers" ? "wait" : "active" },
    { id: "cache", label: "Cache", sub: `${Math.round(r.env.hit * 100)}% hits in the test`, at: [86, 82], mobileAt: [75, 80], state: d.realData ? "good" : "wait" },
    { id: "db", label: "Postgres", sub: `full at ${Math.round(r.atTruth.dbCap)} req/s in prod`, at: [50, 82], mobileAt: [25, 80], state: r.bottleneck === "database" ? (d.watchAll ? "bad" : "wait") : "active" },
    { id: "dash", label: "Test dashboard", sub: d.watchAll ? "every tier" : "app CPU only", at: [14, 82], mobileAt: [25, 45], state: r.ok ? "good" : "bad" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("g", ["gen", "lb", "app"], { label: d.ramp ? "ramp" : `${CONSTANT_RPS}/s` })
    : stage === 1 ? hops("c", ["app", "cache"], { label: `${Math.round(r.env.hit * 100)}% hit`, tone: d.realData ? undefined : "bad" })
    : stage === 2 ? hops("q", ["cache", "db"], { label: "misses" })
    : stage === 3 ? hops("m", ["app", "dash"], { label: d.p99 ? "p99" : "avg" })
    : stage === 4 ? hops("w", ["db", "dash"], { label: d.watchAll ? "DB saturating" : "not watched", tone: d.watchAll ? "good" : "bad" })
    : [];

  const captions = [
    d.ramp ? "Step 1: load rises steadily until the target is missed." : `Step 1: ${CONSTANT_RPS} requests a second for ten minutes. It passes; that's all it can say.`,
    d.realData ? `Step 2: requests replay real product ids; ${Math.round(REAL_HIT * 100)}% hit the cache, like production.` : `Step 2: the script asks for the same 20 products, so ${Math.round(TEST_HIT * 100)}% hit the cache and the database barely notices.`,
    d.prodLike ? "Step 3: the test runs against the same number of servers and the same database size as production." : `Step 3: staging has ${STAGING.instances} app server and a bigger, idle database; the result is multiplied by ${APP.instances}.`,
    d.p99 ? `Step 4: the limit is where p99 crosses ${SLO_MS} ms.` : `Step 4: the limit is where the average crosses ${SLO_MS} ms, well after the slowest users are suffering.`,
    `Step 5: ${r.verdict}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${r.reported === null ? "No limit found" : `Test: ${r.reported.toLocaleString("en-US")} req/s`} · real limit ${r.truth.toLocaleString("en-US")} req/s · ${r.verdict}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="Load testing"
        blurb={`How much traffic can the product API take before p99 latency passes ${SLO_MS} ms? A load test answers that, if it's built to. Each tier here is a queue whose latency climbs as it fills; the test's method decides whether it reports the real limit or a comfortable fiction.`}
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="A load generator sends traffic through a load balancer to app servers, a cache and Postgres, while a dashboard watches"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "gen", to: "lb", label: "requests" },
                  { from: "lb", to: "app", label: "spread" },
                  { from: "app", to: "cache", label: "lookup" },
                  { from: "cache", to: "db", label: "miss" },
                  { from: "app", to: "dash", label: "metrics" },
                  { from: "db", to: "dash", label: "metrics", dim: !d.watchAll },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Latency under load">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">
                  reported {r.reported === null ? "—" : r.reported.toLocaleString("en-US")} · real {r.truth.toLocaleString("en-US")} req/s
                </p>
                <Curve r={r} d={d} />
                <p className="mt-2 text-xs" style={{ color: r.ok ? "var(--good)" : "var(--bad)" }}>
                  {r.verdict}.
                </p>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  A quick test on staging
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  A test you can trust
                </button>
              </div>
              <RunButton busy={busy} onClick={walk} accent={ACCENT} running="Load testing…">
                Run the load test
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Ramp until it breaks" what="A test at a fixed rate only says “fine at that rate”. Raise the load steadily and the curve shows where latency starts to climb and where it goes vertical." accent={ACCENT} active={at(0)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.ramp} onChange={(e) => set({ ramp: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Ramp from 50 to 2,000 req/s
                </label>
              </FlowStep>
              <FlowArrow label="requests" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Send realistic requests" what={`A script that asks for the same few products is served from the cache. Replay real traffic patterns and the cache hits ${Math.round(REAL_HIT * 100)}% as in production, so the database does its real share.`} accent={ACCENT} active={at(1)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.realData} onChange={(e) => set({ realData: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Replay production&apos;s mix of product ids
                </label>
              </FlowStep>
              <FlowArrow label="infrastructure" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Test something shaped like production" what={`Multiplying a one-server result by three assumes everything scales with app servers. The database doesn't: it's one shared instance, full at ${DB.queriesPerSec} queries a second.`} accent={ACCENT} active={at(2)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.prodLike} onChange={(e) => set({ prodLike: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  {APP.instances} app servers and production&apos;s database size
                </label>
              </FlowStep>
              <FlowArrow label="latency" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Judge by p99, not the average" what="The average stays low while one request in a hundred waits seconds. The target is a percentile, so the test has to measure one." accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.p99} onChange={(e) => set({ p99: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Stop at p99 &gt; {SLO_MS} ms
                </label>
              </FlowStep>
              <FlowArrow label="where it broke" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Watch every tier while it runs" what="Knowing the number isn't enough; you need to know what ran out first. Watch app CPU, the cache, the database and its connection pool together, and the fix goes to the right place." accent={ACCENT} active={at(4)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.watchAll} onChange={(e) => set({ watchAll: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Dashboards for every tier during the test
                </label>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Each tier is a queue computed here: utilisation, mean time S/(1−ρ) and p99 ≈ 4.6 × mean. Service times and capacities are illustrative.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
