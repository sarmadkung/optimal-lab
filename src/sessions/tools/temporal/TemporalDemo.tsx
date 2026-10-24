"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { FIRST, FIXED, HEARTBEAT_S, MAX_INTERVAL_S, SCENARIOS, START_TO_CLOSE_S, history, type Design, type Retry, type Scenario } from "@/lib/temporalSim";

const ACCENT = "var(--tools)";
const dur = (s: number) => (s < 120 ? `${s} s` : s < 7200 ? `${Math.round(s / 60)} min` : `${Math.round((s / 3600) * 10) / 10} h`);

export default function TemporalDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [sc, setSc] = useState<Scenario>("lost");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const h = history(sc, d);
  const scenario = SCENARIOS.find((s) => s.id === sc)!;
  const crashed = sc === "crash";

  const nodes: MapNode[] = [
    { id: "client", label: "Order service", sub: "starts OrderWorkflow", at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "server", label: "Temporal Service", sub: `${h.ev.length} history events`, at: [50, 18], mobileAt: [75, 12], state: h.done && h.charges <= 1 ? "good" : "bad" },
    { id: "wa", label: "Worker A", sub: crashed ? "dies while shipping" : "runs workflow + activities", at: [86, 18], mobileAt: [75, 42], state: crashed ? "bad" : "active" },
    { id: "wb", label: "Worker B", sub: crashed && d.retry !== "none" ? "picks up the retry" : "idle", at: [86, 82], mobileAt: [75, 74], state: crashed && d.retry !== "none" ? "good" : "idle" },
    { id: "pay", label: "Payments API", sub: `${h.charges} charge${h.charges === 1 ? "" : "s"}`, at: [14, 82], mobileAt: [25, 42], state: h.charges > 1 ? "bad" : sc === "flaky" ? "wait" : "active" },
    { id: "ship", label: "Shipping API", sub: h.shipDelay ? `shipped ${dur(h.shipDelay)} late` : "on time", at: [50, 82], mobileAt: [25, 74], state: h.shipDelay > 600 ? "bad" : "active" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("s", ["client", "server", "wa"], { label: "start workflow" })
    : stage === 1 ? hops("c", ["wa", "pay"], { label: d.idempotencyKey ? "charge · key" : "charge", tone: sc === "flaky" || sc === "declined" ? "bad" : undefined })
    : stage === 2 ? (h.attempts > 1 ? hops("r", ["server", "wa", "pay"], { label: `attempt ${h.attempts}`, tone: h.charges > 1 ? "bad" : "good" }) : [])
    : stage === 3 ? (crashed ? hops("hb", ["wa", "server", ...(d.retry !== "none" ? ["wb"] : [])], { label: d.heartbeat ? `no heartbeat ${HEARTBEAT_S} s` : "silent for 1 h", tone: d.heartbeat ? "good" : "bad" }) : hops("sig", ["client", "server"], { label: "signal fraudCleared" }))
    : stage === 4 ? hops("e", ["server", "client"], { label: h.done ? "completed" : "failed", tone: h.done && h.charges <= 1 ? "good" : "bad" })
    : [];

  const captions = [
    `Step 1: the order service starts OrderWorkflow on the Temporal Service; a worker picks it up. Scenario: ${scenario.one}.`,
    `Step 2: ChargeCard runs as an activity: ${h.ev.find((e) => ["ActivityTaskCompleted", "ActivityTaskFailed", "ActivityTaskTimedOut"].includes(e.type))?.detail ?? "charged"}.`,
    d.retry === "none" ? "Step 3: no retry policy: the first failure fails the workflow." : `Step 3: the retry policy tries again (1 s, 2 s, 4 s… up to ${MAX_INTERVAL_S} s): ${h.attempts} attempt${h.attempts > 1 ? "s" : ""}.`,
    crashed ? (d.heartbeat ? `Step 4: the worker stops heartbeating; after ${HEARTBEAT_S} s Temporal retries ShipOrder on worker B.` : `Step 4: nobody notices the dead worker until the ${START_TO_CLOSE_S / 3600} h start-to-close timeout.`) : "Step 4: the workflow waits two hours for the fraudCleared signal; nothing runs and nothing is lost.",
    `Step 5: ${h.outcome}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${h.outcome} · ${h.charges} charge${h.charges === 1 ? "" : "s"} · ${h.attempts} charge attempt${h.attempts === 1 ? "" : "s"} · ${h.ev.length} events.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="Tools · interactive"
        title="Temporal"
        blurb="In Temporal you write the workflow as ordinary code. Every side effect is an activity, retried by policy, and the service records an event history that lets the workflow survive any crash. An order workflow charges a card, reserves stock, waits two hours for a fraud check, ships and sends a receipt. Break it four ways and read the history."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="The order service, the Temporal Service, two workers, the payments API and the shipping API"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "client", to: "server", label: "start, signal" },
                  { from: "server", to: "wa", label: "task queue" },
                  { from: "server", to: "wb", label: "task queue" },
                  { from: "wa", to: "pay", label: "ChargeCard" },
                  { from: "wb", to: "ship", label: "ShipOrder" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <History d={d} sc={sc} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices<Scenario> label="What goes wrong" accent={ACCENT} value={sc} onChange={setSc} options={SCENARIOS.map((s) => ({ id: s.id, label: s.label }))} />
              </div>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  No policies
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Retries, heartbeats, keys
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Running…">
                Run the order
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Workflow code decides, activities act" what="The workflow function only decides what happens next and must be deterministic, because Temporal replays it from the history after a crash. Anything that touches the world (a charge, an API call, an email) is an activity, which can fail and be retried." accent={ACCENT} active={at(0)}>
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] leading-relaxed">{`charge  = await activities.chargeCard(order)
await     activities.reserveStock(order)
cleared = await condition(() => fraudOk, "24h")
await     activities.shipOrder(order)
await     activities.sendReceipt(order)`}</pre>
              </FlowStep>
              <FlowArrow label="activity tasks" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Retry what's worth retrying" what={`Activities retry by policy: 1 s, then doubling to a ${MAX_INTERVAL_S} s cap, forever by default. A 503 deserves that; a declined card never succeeds, so mark it non-retryable and let the workflow handle it.`} accent={ACCENT} active={at(1)}>
                <Choices<Retry> label="Retry policy" accent={ACCENT} value={d.retry} onChange={(v) => set({ retry: v })} options={[{ id: "none", label: "No retries" }, { id: "default", label: "Default exponential" }, { id: "nonRetryable", label: "Default, declines non-retryable" }]} />
              </FlowStep>
              <FlowArrow label="attempts" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Detect dead workers with heartbeats" what={`A start-to-close timeout of ${START_TO_CLOSE_S / 3600} h means a crashed worker goes unnoticed for an hour. A long activity that heartbeats every few seconds, with a ${HEARTBEAT_S} s heartbeat timeout, is retried elsewhere within seconds.`} accent={ACCENT} active={at(2)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.heartbeat} onChange={(e) => set({ heartbeat: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  ShipOrder heartbeats, {HEARTBEAT_S} s heartbeat timeout
                </label>
              </FlowStep>
              <FlowArrow label="side effects" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Make activities idempotent" what="Temporal retries an activity when it doesn't hear back, including when the charge went through and only the response was lost. Pass a key built from the workflow id so the payment provider returns the first charge instead of making a second." accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.idempotencyKey} onChange={(e) => set({ idempotencyKey: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Idempotency key from the workflow id
                </label>
              </FlowStep>
              <FlowArrow label="history" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Read the event history" what="Every decision, attempt, timer and signal is an event. It's how Temporal resumes after a crash, and how you debug a run months later." accent={ACCENT} active={at(4)}>
                <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-xs">
                  <dt>Outcome</dt>
                  <dd className="text-right" style={{ color: h.charges > 1 || (!h.done && !(sc === "declined" && d.retry === "nonRetryable")) ? "var(--bad)" : "var(--good)" }}>{h.outcome}</dd>
                  <dt>Charges</dt>
                  <dd className="text-right font-mono" style={{ color: h.charges > 1 ? "var(--bad)" : "var(--text)" }}>{h.charges}</dd>
                  <dt>Charge attempts</dt>
                  <dd className="text-right font-mono">{h.attempts}</dd>
                  <dt>Time to finish (incl. the 2 h wait)</dt>
                  <dd className="text-right font-mono">{dur(h.seconds)}</dd>
                </dl>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Event types are Temporal&apos;s; timings are illustrative. Retries, timeouts, heartbeats and idempotency run here.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function History({ d, sc }: { d: Design; sc: Scenario }) {
  const h = history(sc, d);
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="The workflow's event history">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">event history</p>
        <p className="font-mono text-xs">{h.ev.length} events</p>
      </div>
      <ol className="mt-3 max-h-80 space-y-0.5 overflow-y-auto font-mono text-[10px]">
        {h.ev.map((e, i) => (
          <li key={i} className="grid grid-cols-[1.5rem_3.5rem_minmax(0,1fr)] gap-2" style={{ color: e.bad ? "var(--bad)" : "var(--text)" }}>
            <span className="text-[var(--faint)]">{i + 1}</span>
            <span className="text-[var(--faint)]">{dur(e.t)}</span>
            <span className="min-w-0 break-words">
              {e.type}
              {e.detail ? <span className="text-[var(--muted)]"> · {e.detail}</span> : null}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
