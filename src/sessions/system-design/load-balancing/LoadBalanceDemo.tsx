"use client";

import { useMemo, useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, Meter, PlaybackControls, usePlayback } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import {
  SERVERS,
  SCENARIOS,
  STRATEGY_LABEL,
  compareStrategies,
  configFromScenario,
  simulate,
  summarize,
  type ScenarioId,
  type Strategy,
} from "@/lib/loadBalance";

const ACCENT = "var(--sys)";
const STRATEGIES: Strategy[] = ["roundRobin", "least", "weighted"];
/** Playback step interval — keep slow so request + return hops are readable. */
const PLAY_MS = 1650;
const HOP_STEP = 0.58;
const REQ_DURATION = 0.48;
const SERVER_AT: [number, number][] = [
  [76, 24],
  [76, 50],
  [76, 76],
];
const SERVER_MOBILE_AT: [number, number][] = [
  [22, 78],
  [50, 78],
  [78, 78],
];

function strategySub(strategy: Strategy) {
  switch (strategy) {
    case "roundRobin":
      return "round robin · health-aware";
    case "least":
      return "least conn. · health-aware";
    case "weighted":
      return "weighted · health-aware";
  }
}

export default function LoadBalanceDemo() {
  const [strategy, setStrategy] = useState<Strategy>("roundRobin");
  const [scenario, setScenario] = useState<ScenarioId>("baseline");
  const scenarioDef = SCENARIOS[scenario];
  const simConfig = useMemo(() => configFromScenario(scenario, strategy), [scenario, strategy]);
  const frames = useMemo(() => simulate(simConfig), [simConfig]);
  const comparison = useMemo(() => {
    const { strategy: _ignored, ...rest } = configFromScenario(scenario, "roundRobin");
    return compareStrategies(rest);
  }, [scenario]);
  const summary = useMemo(() => summarize(frames), [frames]);
  const playback = usePlayback(frames.length, PLAY_MS);
  const { i } = playback;
  const frame = frames[i];
  const assigning = frame.phase === "assign";
  const maxServer = Math.max(1, frame.queueCap, ...frames.flatMap((f) => f.inflight));
  const maxLb = Math.max(1, ...frames.map((f) => f.lbQueue), scenarioDef.arrivals);

  const nodes: MapNode[] = [
    {
      id: "client",
      label: "Clients",
      sub: assigning ? `${scenarioDef.arrivals} new / tick` : "between bursts",
      at: [14, 50],
      mobileAt: [50, 14],
      state: assigning ? "active" : "idle",
    },
    {
      id: "lb",
      label: "Load balancer",
      sub:
        frame.lbQueue > 0 || frame.failedTotal > 0
          ? `${frame.lbQueue} queued · ${frame.failedTotal} failed`
          : strategySub(strategy),
      at: [40, 50],
      mobileAt: [50, 42],
      state: frame.lbQueue > 0 ? "wait" : assigning ? "active" : "idle",
    },
    ...SERVERS.map((s, idx) => {
      const busy = frame.inflight[idx];
      const up = frame.healthy[idx];
      const atCap = busy >= frame.queueCap;
      const fast = idx === 2;
      let state: MapNode["state"] = "idle";
      if (!up) state = "dim";
      else if (assigning && frame.assigned.includes(idx)) state = "active";
      else if (atCap) state = "wait";
      else if (!assigning && busy > 0) state = fast && busy <= 1 ? "good" : "wait";
      else if (!assigning && fast && busy === 0) state = "good";

      return {
        id: s.name,
        label: `Server ${s.name}`,
        sub: !up
          ? "unhealthy · skipped"
          : `${busy}/${frame.queueCap} in flight · ${s.rate}/tick`,
        at: SERVER_AT[idx],
        mobileAt: SERVER_MOBILE_AT[idx],
        state,
      };
    }),
  ];

  const completedTotal = frame.completed.reduce((a, n) => a + n, 0);

  const packets: Packet[] = [];
  if (assigning) {
    frame.assigned.forEach((server, idx) => {
      packets.push({
        id: `${scenario}-${strategy}-${i}-${idx}-in`,
        from: "client",
        to: "lb",
        label: `req ${idx + 1}`,
        delay: idx * 0.12,
        duration: REQ_DURATION,
      });
      packets.push({
        id: `${scenario}-${strategy}-${i}-${idx}-out`,
        from: "lb",
        to: SERVERS[server].name,
        label: `→ ${SERVERS[server].name}`,
        delay: 0.5 + idx * 0.14,
        duration: REQ_DURATION,
      });
    });
    if (frame.queuedThisTick > 0) {
      packets.push({
        id: `${scenario}-${strategy}-${i}-hold`,
        from: "client",
        to: "lb",
        label: `${frame.queuedThisTick} wait`,
        tone: "bad",
        delay: 0.75,
        duration: REQ_DURATION,
      });
    }
  } else {
    SERVERS.forEach((s, idx) => {
      if (!frame.healthy[idx] || frame.completed[idx] === 0) return;
      packets.push(
        ...hops(`${scenario}-${strategy}-${i}-ok-${s.name}`, [s.name, "lb", "client"], {
          label: `${frame.completed[idx]}×200`,
          tone: "good",
          start: idx * 0.4,
          step: HOP_STEP,
        }),
      );
    });
    if (frame.failedThisTick > 0) {
      packets.push(
        ...hops(`${scenario}-${strategy}-${i}-503`, ["lb", "client"], {
          label: `${frame.failedThisTick}×503`,
          tone: "bad",
          start: 0.2 + SERVERS.length * 0.25,
          step: HOP_STEP,
        }),
      );
    }
  }

  const caption = assigning ? (
    <>
      Tick {frame.tick} · <span className="font-medium text-[var(--text)]">routing</span>: placed{" "}
      {frame.assigned.length}
      {frame.drainedFromLb > 0 ? <> ({frame.drainedFromLb} from LB queue)</> : null}
      {frame.queuedThisTick > 0 ? (
        <>
          , <span style={{ color: "var(--bad)" }}>{frame.queuedThisTick} overflowed to the LB queue</span>
        </>
      ) : null}
      . {frame.lbQueue} waiting total.
    </>
  ) : (
    <>
      Tick {frame.tick} · <span className="font-medium text-[var(--text)]">finishing</span>:{" "}
      {completedTotal > 0 ? (
        <>
          <span style={{ color: "var(--good)" }}>{completedTotal} response{completedTotal === 1 ? "" : "s"}</span> return server → LB → client
        </>
      ) : (
        "backends drain"
      )}
      {frame.failedThisTick > 0 ? (
        <>
          ;{" "}
          <span style={{ color: "var(--bad)" }}>
            {frame.failedThisTick} timed out (503)
          </span>
        </>
      ) : null}
      {frame.lbQueue > 0 ? (
        <>
          {" "}
          · oldest wait {frame.oldestLbWait}/{scenarioDef.lbTimeout} tick
          {scenarioDef.lbTimeout === 1 ? "" : "s"}
        </>
      ) : null}
      .
    </>
  );

  const activeStep = assigning ? 2 : frame.failedThisTick > 0 || frame.lbQueue > 0 ? 4 : 3;

  return (
    <SessionPage>
      <SessionHeader
        kicker="System design · interactive"
        title="Load balancing strategies"
        blurb="Pick a backend, skip unhealthy hosts, respect queue caps, and shed load when the waiting room at the load balancer is full — then compare round robin, least connections, and weighted routing."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <SystemMap
              title="Clients, load balancer, queues, and three backends"
              accent={ACCENT}
              chrome="split"
              nodes={nodes}
              links={[
                { from: "client", to: "lb", label: assigning ? "request" : undefined, active: assigning },
                {
                  from: "lb",
                  to: "client",
                  label: !assigning && frame.failedThisTick > 0 ? "503" : !assigning && completedTotal > 0 ? "200" : undefined,
                  dim: assigning || (frame.failedThisTick === 0 && completedTotal === 0),
                  dashed: true,
                  active: !assigning && (completedTotal > 0 || frame.failedThisTick > 0),
                },
                ...SERVERS.map((s, idx) => ({
                  from: "lb",
                  to: s.name,
                  label: !frame.healthy[idx] ? "health ✗" : assigning ? undefined : frame.completed[idx] > 0 ? undefined : undefined,
                  dim: !frame.healthy[idx],
                  active: assigning && frame.healthy[idx] && frame.assigned.some((pick) => pick === idx),
                })),
                ...SERVERS.map((s, idx) => ({
                  from: s.name,
                  to: "lb",
                  label: !assigning && frame.completed[idx] > 0 ? "200" : undefined,
                  dim: assigning || frame.completed[idx] === 0 || !frame.healthy[idx],
                  dashed: true,
                  active: !assigning && frame.completed[idx] > 0,
                })),
              ]}
              packets={packets}
              aspect={1.65}
              mobileAspect={1.05}
            />
          }
          panel={
            <SystemMapPanel caption={caption}>
              <Choices
                label="Scenario"
                accent={ACCENT}
                value={scenario}
                onChange={(id) => {
                  setScenario(id);
                  playback.reset();
                }}
                options={(Object.keys(SCENARIOS) as ScenarioId[]).map((id) => ({
                  id,
                  label: SCENARIOS[id].label,
                }))}
              />
              <p className="text-xs leading-relaxed text-[var(--faint)]">{scenarioDef.hint}</p>
              <Choices
                label="Strategy"
                accent={ACCENT}
                value={strategy}
                onChange={(id) => {
                  setStrategy(id);
                  playback.reset();
                }}
                options={STRATEGIES.map((id) => ({ id, label: STRATEGY_LABEL[id] }))}
              />
              <PlaybackControls
                playback={playback}
                accent={ACCENT}
                nextLabel="Next step"
                status={`Tick ${frame.tick} · ${assigning ? "route" : "finish"} (${i + 1}/${frames.length})`}
              />
              <div className="rounded-lg border border-[var(--line)] p-3">
                <p className="text-xs font-medium text-[var(--muted)]">Same scenario, all strategies</p>
                <ul className="mt-2 space-y-1.5 text-xs text-[var(--faint)]">
                  {STRATEGIES.map((id) => {
                    const s = comparison[id];
                    const active = id === strategy;
                    return (
                      <li key={id} className={active ? "text-[var(--text)]" : undefined}>
                        <span className="font-medium">{STRATEGY_LABEL[id]}</span>
                        {active ? " (playing)" : ""}: failed{" "}
                        <span className="font-mono tabular-nums">{s.totalFailed}</span>, peak LB queue{" "}
                        <span className="font-mono tabular-nums">{s.peakLbQueue}</span>, placed{" "}
                        <span className="font-mono tabular-nums">{s.totalPlaced}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <p className="text-xs leading-relaxed text-[var(--faint)]">
                This run — placed <span className="font-mono tabular-nums text-[var(--muted)]">{summary.totalPlaced}</span>, peak slow-server backlog{" "}
                <span className="font-mono tabular-nums text-[var(--muted)]">{summary.peakSlowQueue}</span>.
              </p>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep
                n={1}
                title="Scenario, strategy, and health"
                what="Round robin ignores load. Least connections picks the shortest queue. Weighted divides queue depth by server speed so fast backends receive more when load is even."
                accent={ACCENT}
              >
                <ul className="flex flex-wrap gap-2 text-sm">
                  {SERVERS.map((s, idx) => (
                    <li
                      key={s.name}
                      className="rounded-md border border-[var(--line)] px-3 py-2"
                      style={{ opacity: frame.healthy[idx] ? 1 : 0.45 }}
                    >
                      {s.name}{" "}
                      <span className="text-[var(--faint)]">
                        {frame.healthy[idx] ? `${s.rate}/tick` : "health ✗"}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {STRATEGY_LABEL[strategy]} · cap {frame.queueCap}/server · LB timeout {scenarioDef.lbTimeout >= 99 ? "off" : `${scenarioDef.lbTimeout} ticks`}
                </p>
              </FlowStep>
              <FlowArrow label={`${scenarioDef.arrivals} new requests / tick`} accent={ACCENT} active={assigning && playback.playing} />

              <FlowStep
                n={2}
                title="Route what fits; queue the rest"
                what="Each arrival goes to a healthy backend with space. Overflow waits at the load balancer. The queue drains first on the next routing step before new bursts land."
                accent={ACCENT}
                active={activeStep === 2}
              >
                <div className="mb-3 flex items-center justify-between gap-3 text-sm">
                  <span>LB waiting room</span>
                  <span className="font-mono tabular-nums">{frame.lbQueue}</span>
                </div>
                <Meter value={frame.lbQueue} max={maxLb} color={frame.lbQueue > 0 ? "var(--bad)" : ACCENT} />
                <p className="mt-2 text-xs text-[var(--faint)]">
                  This step: {frame.assigned.length} placed
                  {frame.drainedFromLb > 0 ? ` (${frame.drainedFromLb} dequeued)` : ""}
                  {frame.queuedThisTick > 0 ? ` · ${frame.queuedThisTick} new waits` : ""}
                </p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {frame.assigned.length === 0 ? (
                    <li className="text-sm text-[var(--faint)]">Nothing placed — all backends full or down.</li>
                  ) : (
                    frame.assigned.map((server, idx) => (
                      <li key={`${i}-${idx}`} className="rounded-md border border-[var(--line)] px-3 py-2 font-mono text-sm">
                        → {SERVERS[server].name}
                      </li>
                    ))
                  )}
                </ul>
              </FlowStep>
              <FlowArrow label="backends finish work" accent={ACCENT} active={!assigning && playback.playing} />

              <FlowStep
                n={3}
                title="Servers drain at their own rate"
                what="Fast servers clear depth quickly. Slow ones stay near their cap when traffic keeps arriving."
                accent={ACCENT}
                active={activeStep === 3}
              >
                <ul className="space-y-3">
                  {SERVERS.map((server, idx) => (
                    <li key={server.name} style={{ opacity: frame.healthy[idx] ? 1 : 0.45 }}>
                      <div className="mb-1 flex justify-between gap-3 text-sm">
                        <span>
                          {server.name}{" "}
                          <span className="text-[var(--faint)]">
                            {!frame.healthy[idx] ? "unhealthy" : idx === 2 ? "fast · " : ""}
                            {frame.healthy[idx] ? `${server.rate}/tick` : ""}
                          </span>
                        </span>
                        <span className="font-mono tabular-nums">
                          {frame.healthy[idx] ? `${frame.inflight[idx]}/${frame.queueCap}` : "—"}
                        </span>
                      </div>
                      {frame.healthy[idx] ? (
                        <Meter
                          value={frame.inflight[idx]}
                          max={maxServer}
                          color={frame.inflight[idx] >= frame.queueCap ? "var(--bad)" : idx === 2 ? "var(--good)" : ACCENT}
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              </FlowStep>
              <FlowArrow label="waiting too long → fail" accent={ACCENT} active={!assigning && frame.failedThisTick > 0} />

              <FlowStep
                n={4}
                title="Queued requests time out"
                what="When nothing healthy has capacity, requests pile up at the balancer. After the timeout, they are rejected — the 503s clients actually see."
                accent={ACCENT}
                active={activeStep === 4}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>Still queued</span>
                      <span className="font-mono tabular-nums">{frame.lbQueue}</span>
                    </div>
                    <Meter value={frame.lbQueue} max={maxLb} color="var(--bad)" />
                    {scenarioDef.lbTimeout < 99 ? (
                      <p className="mt-1 text-xs text-[var(--faint)]">
                        Oldest wait: {frame.oldestLbWait} / {scenarioDef.lbTimeout}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>Failed total</span>
                      <span className="font-mono tabular-nums">{frame.failedTotal}</span>
                    </div>
                    <Meter value={frame.failedTotal} max={Math.max(1, summary.totalFailed, frame.failedTotal)} color="var(--bad)" />
                  </div>
                </div>
                {!assigning && frame.failedThisTick > 0 ? (
                  <p className="mt-3 text-sm" style={{ color: "var(--bad)" }}>
                    {frame.failedThisTick} request{frame.failedThisTick === 1 ? "" : "s"} exceeded the LB timeout and returned 503.
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-[var(--muted)]">
                    {scenarioDef.lbTimeout >= 99
                      ? "Uneven speed turns timeouts off so you can compare routing first."
                      : "Try Full queues or Only C up if you want steady 503s."}
                  </p>
                )}
                {!assigning && playback.atEnd ? (
                  <p className="mt-3 text-sm text-[var(--muted)]">
                    Done — {summary.totalFailed} failed, {summary.totalPlaced} placed, peak LB queue {summary.peakLbQueue}. Swap strategy in the panel and compare the table above without changing scenario.
                  </p>
                ) : null}
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
