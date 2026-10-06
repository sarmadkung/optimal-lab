"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { PlaybackControls, usePlayback } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, type NodeState, type Packet } from "@/components/system/SystemMap";
import {
  CAPACITY,
  COOLDOWN,
  FAIL_THRESHOLD,
  OUTAGE,
  RETRIES,
  TICKS,
  TIMEOUT_MS,
  USERS_PER_TICK,
  recoveredAt,
  simulate,
  type BreakerState,
  type Settings,
  type TickFrame,
} from "@/lib/circuitBreaker";

const ACCENT = "var(--sys)";
const BREAKER_COLOR: Record<BreakerState, string> = { closed: "var(--good)", open: "var(--bad)", "half-open": "var(--auto)" };

const PRESETS: { id: string; label: string; s: Settings }[] = [
  { id: "naive", label: "Retry at once", s: { retries: true, backoff: false, breaker: false } },
  { id: "backoff", label: "Retry with backoff", s: { retries: true, backoff: true, breaker: false } },
  { id: "breaker", label: "Backoff + breaker", s: { retries: true, backoff: true, breaker: true } },
];

export default function CircuitBreakerDemo() {
  const [s, setS] = useState<Settings>(PRESETS[0].s);
  const frames = simulate(s);
  const playback = usePlayback(frames.length, 700);
  const f = frames[playback.i];
  const recovered = recoveredAt(frames);
  const set = (patch: Partial<Settings>) => {
    setS((x) => ({ ...x, ...patch }));
    playback.reset();
  };

  const bState: NodeState = !f.bHealthy ? "bad" : f.overloaded ? "wait" : f.load ? "good" : "idle";
  const packets: Packet[] = [
    { id: `u-${f.tick}`, from: "users", to: "a", label: `${USERS_PER_TICK} users` },
    ...(f.load ? [{ id: `b-${f.tick}`, from: "a", to: "b", label: `${f.load} calls`, delay: 0.3, tone: f.failed ? ("bad" as const) : ("good" as const) }] : []),
  ];

  const caption =
    f.breaker === "open"
      ? `Tick ${f.tick}: the circuit is open. A fails ${f.shortCircuited} calls instantly without calling B, so B gets a rest.`
      : f.breaker === "half-open"
        ? `Tick ${f.tick}: half-open. One trial call goes through to see if B is back.`
        : !f.bHealthy
          ? `Tick ${f.tick}: B is down. ${f.load} calls hit it and each waits ${TIMEOUT_MS} ms for a timeout.`
          : f.overloaded
            ? `Tick ${f.tick}: B is healthy again but gets ${f.load} calls for ${CAPACITY} slots. Retries are keeping it down.`
            : `Tick ${f.tick}: B handles ${f.load} calls fine.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="System design · interactive"
        title="Retries, backoff and circuit breakers"
        blurb={`Service B goes down from tick ${OUTAGE.from} to ${OUTAGE.to}. Service A calls it ${USERS_PER_TICK} times a tick. Retrying feels safe, but every retry is more load on a service that's already struggling. Find the setup that lets B recover.`}
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-4">
              <SystemMap
                title="Users call service A, which calls service B"
                accent={ACCENT}
                chrome="split"
                nodes={[
                  { id: "users", label: "Users", sub: `wait ~${f.waitMs} ms`, at: [12, 50], mobileAt: [50, 12], state: f.waitMs > 500 ? "bad" : "idle" },
                  { id: "a", label: "Service A", sub: s.breaker ? `breaker: ${f.breaker}` : "no breaker", at: [48, 50], mobileAt: [50, 50], state: f.breaker === "open" ? "wait" : "active" },
                  { id: "b", label: "Service B", sub: !f.bHealthy ? "down" : f.overloaded ? `${f.load}/${CAPACITY} overloaded` : `${f.load}/${CAPACITY} calls`, at: [86, 50], mobileAt: [50, 88], state: bState },
                ]}
                links={[
                  { from: "users", to: "a", label: "requests" },
                  { from: "a", to: "b", label: "calls", dim: f.load === 0 },
                ]}
                packets={packets}
                aspect={2.8}
                mobileAspect={1.2}
              />
              <LoadChart frames={frames} at={playback.i} showBreaker={s.breaker} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button key={p.id} type="button" onClick={() => set(p.s)} className="min-h-11 rounded-md border border-[var(--line-strong)] px-3 text-sm">
                    {p.label}
                  </button>
                ))}
              </div>
              <Toggle on={s.retries} label={`Retry failed calls (${RETRIES}×)`} onChange={(v) => set({ retries: v })} />
              <Toggle on={s.backoff} disabled={!s.retries} label="Exponential backoff with jitter" onChange={(v) => set({ backoff: v })} />
              <Toggle on={s.breaker} label={`Circuit breaker (opens after ${FAIL_THRESHOLD} failures)`} onChange={(v) => set({ breaker: v })} />
              <p className="w-full text-sm" style={{ color: recovered === null ? "var(--bad)" : "var(--good)" }}>
                {recovered === null ? "B never recovers in this run." : `B is serving normally again from tick ${recovered}.`}
              </p>
              <PlaybackControls playback={playback} accent={ACCENT} nextLabel="Next tick" status={`tick ${f.tick} of ${TICKS - 1}`} />
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Call with a timeout" what={`Never wait forever. A ${TIMEOUT_MS} ms timeout turns a hung dependency into a fast, visible failure.`} accent={ACCENT} active={f.load > 0 && f.breaker === "closed"}>
                <p className="text-sm">{f.ok} ok · {f.failed} failed this tick</p>
              </FlowStep>
              <FlowArrow label="failure" accent={ACCENT} />

              <FlowStep n={2} title="Retry, but back off" what="Retrying at once multiplies the load right when B is weakest. Wait 1, 2, 4… times longer each try, with random jitter, so retries spread out instead of arriving together." accent={ACCENT} active={s.retries && f.load > USERS_PER_TICK}>
                <p className="text-sm" style={{ color: f.load > USERS_PER_TICK ? "var(--bad)" : undefined }}>
                  B got {f.load} calls this tick for {USERS_PER_TICK} user requests{f.load > USERS_PER_TICK ? `: ${f.load - USERS_PER_TICK} are retries.` : "."}
                </p>
              </FlowStep>
              <FlowArrow label="failures keep coming" accent={ACCENT} />

              <FlowStep n={3} title="Count failures while closed" what={`The breaker passes calls through and counts failures. After ${FAIL_THRESHOLD} in a row it trips.`} accent={ACCENT} active={s.breaker && f.breaker === "closed" && f.failed > 0}>
                <p className="text-sm">{s.breaker ? `State: ${f.breaker}` : "No breaker in this setup."}</p>
              </FlowStep>
              <FlowArrow label="threshold reached" accent={ACCENT} />

              <FlowStep n={4} title="Open: fail fast" what="A stops calling B and returns an error (or a cached or default answer) at once. Users get a fast answer instead of a 1-second timeout, and B gets no load at all." accent={ACCENT} active={f.breaker === "open"}>
                <p className="text-sm">{f.shortCircuited ? `${f.shortCircuited} calls failed fast in ~2 ms.` : "Nothing short-circuited this tick."}</p>
              </FlowStep>
              <FlowArrow label={`after ${COOLDOWN} ticks`} accent={ACCENT} />

              <FlowStep n={5} title="Half-open: try one call" what="One trial request tests B. Success closes the circuit and traffic returns; failure opens it again for another cooldown." accent={ACCENT} active={f.breaker === "half-open"}>
                <p className="text-sm">{recovered !== null ? `Back to normal at tick ${recovered}.` : "Still recovering."}</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Toggle({ on, label, onChange, disabled }: { on: boolean; label: string; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="flex min-h-11 w-full items-center gap-2 text-sm" style={{ opacity: disabled ? 0.5 : 1 }}>
      <input type="checkbox" checked={on} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" style={{ accentColor: ACCENT }} />
      {label}
    </label>
  );
}

function LoadChart({ frames, at, showBreaker }: { frames: TickFrame[]; at: number; showBreaker: boolean }) {
  const max = Math.max(CAPACITY * 2, ...frames.map((f) => f.load));
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Calls reaching service B each tick, against its capacity">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">Calls reaching B per tick</p>
        <p className="text-[11px] text-[var(--muted)]">dashed = capacity {CAPACITY} · shaded = B down</p>
      </div>
      <div className="relative mt-3 flex h-32 items-end gap-px">
        <div aria-hidden className="absolute inset-y-0" style={{ left: `${(OUTAGE.from / frames.length) * 100}%`, width: `${((OUTAGE.to - OUTAGE.from) / frames.length) * 100}%`, background: "color-mix(in srgb, var(--bad) 10%, transparent)" }} />
        <div aria-hidden className="absolute inset-x-0 border-t border-dashed" style={{ bottom: `${(CAPACITY / max) * 100}%`, borderColor: "var(--text)" }} />
        {frames.map((f) => (
          <div key={f.tick} className="relative flex h-full min-w-0 flex-1 flex-col justify-end" style={{ opacity: f.tick <= at ? 1 : 0.2 }}>
            <div className="rounded-t-sm" style={{ height: `${(f.load / max) * 100}%`, background: f.failed ? "var(--bad)" : "var(--good)" }} />
          </div>
        ))}
      </div>
      {showBreaker && (
      <>
      <div className="mt-1 flex gap-px" aria-hidden>
        {frames.map((f) => (
          <div key={f.tick} className="h-1.5 min-w-0 flex-1 rounded-sm" style={{ background: BREAKER_COLOR[f.breaker], opacity: f.tick <= at ? 1 : 0.2 }} />
        ))}
      </div>
      <p className="mt-2 text-[11px] text-[var(--muted)]">
        Bottom strip: breaker <span style={{ color: "var(--good)" }}>closed</span> · <span style={{ color: "var(--bad)" }}>open</span> · <span style={{ color: "var(--auto)" }}>half-open</span>
      </p>
      </>
      )}
    </section>
  );
}
