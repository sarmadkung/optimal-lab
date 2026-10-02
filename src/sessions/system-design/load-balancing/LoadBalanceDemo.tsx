"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, Meter, PlaybackControls, usePlayback } from "@/components/session/ui";
import { SystemMap, type MapNode, type Packet } from "@/components/system/SystemMap";
import { SERVERS, simulate, type Strategy } from "@/lib/loadBalance";

const ACCENT = "var(--sys)";
const SERVER_AT: [number, number][] = [[82, 18], [82, 50], [82, 82]];
const SERVER_MOBILE_AT: [number, number][] = [[17, 82], [50, 82], [83, 82]];

export default function LoadBalanceDemo() {
  const [strategy, setStrategy] = useState<Strategy>("roundRobin");
  const frames = simulate(strategy);
  const playback = usePlayback(frames.length, 1500);
  const { i } = playback;
  const frame = frames[i];
  const max = Math.max(1, ...frames.flatMap((f) => f.inflight));

  const nodes: MapNode[] = [
    { id: "client", label: "Clients", sub: "4 requests", at: [12, 50], mobileAt: [50, 12], state: "active" },
    { id: "lb", label: "Load balancer", sub: strategy === "roundRobin" ? "round robin" : "least conn.", at: [42, 50], mobileAt: [50, 44], state: "active" },
    ...SERVERS.map((s, idx) => ({
      id: s.name,
      label: `Server ${s.name}`,
      sub: `${frame.inflight[idx]} busy · ${s.rate}/tick`,
      at: SERVER_AT[idx],
      mobileAt: SERVER_MOBILE_AT[idx],
      state: frame.assigned.includes(idx) ? ("active" as const) : ("idle" as const),
    })),
  ];

  const packets: Packet[] = frame.assigned.flatMap((server, idx) => [
    { id: `${strategy}-${i}-${idx}-in`, from: "client", to: "lb", label: `req ${idx + 1}`, delay: idx * 0.12, duration: 0.4 },
    { id: `${strategy}-${i}-${idx}-out`, from: "lb", to: SERVERS[server].name, label: `req ${idx + 1}`, delay: 0.45 + idx * 0.15, duration: 0.45 },
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)]">System design · interactive</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Load balancing strategies</h1>
      <p className="mt-3 text-[var(--muted)]">
        Four requests arrive each tick. Server C finishes three in-flight requests a tick. A and B finish
        one. Round robin does not care. Least connections does.
      </p>

      <div className="mt-6">
        <SystemMap
          title="Clients, a load balancer and three servers"
          accent={ACCENT}
          nodes={nodes}
          links={[
            { from: "client", to: "lb", label: "4 requests" },
            ...SERVERS.map((s) => ({ from: "lb", to: s.name })),
          ]}
          packets={packets}
          aspect={2}
          mobileAspect={0.95}
          caption={
            <>
              Tick {i + 1}:{" "}
              {frame.assigned.map((s, idx) => `req ${idx + 1} → ${SERVERS[s].name}`).join(", ")}.
            </>
          }
        >
          <PlaybackControls playback={playback} accent={ACCENT} nextLabel="Next tick" status={`Tick ${i + 1} of ${frames.length}`} />
        </SystemMap>
      </div>

      <div className="mt-6">
        <FlowStep n={1} title="Pick a strategy" what="Round robin deals requests in order. Least connections sends the next request to whoever is least busy." accent={ACCENT} active>
          <Choices
            accent={ACCENT}
            value={strategy}
            onChange={(id) => {
              setStrategy(id);
              playback.reset();
            }}
            options={[
              { id: "roundRobin", label: "Round robin" },
              { id: "least", label: "Least connections" },
            ]}
          />
        </FlowStep>
        <FlowArrow label="4 new requests" accent={ACCENT} active={playback.playing} />

        <FlowStep n={2} title="Assign each request" what="Watch which server receives the four arrivals this tick, before anyone finishes work." accent={ACCENT}>
          <ul className="flex flex-wrap gap-2">
            {frame.assigned.map((server, idx) => (
              <li key={`${i}-${idx}`} className="rounded-md border border-[var(--line)] px-3 py-2 font-mono text-sm">
                req {idx + 1} → {SERVERS[server].name}
              </li>
            ))}
          </ul>
        </FlowStep>
        <FlowArrow label="then each server finishes some" accent={ACCENT} />

        <FlowStep
          n={3}
          title="Servers finish work at their own speed"
          what="C is fast, so its queue stays short. A and B keep a backlog when requests are shared evenly. Then the next tick starts back at step 2."
          accent={ACCENT}
          active
        >
          <ul className="space-y-3">
            {SERVERS.map((server, idx) => (
              <li key={server.name}>
                <div className="mb-1 flex justify-between gap-3 text-sm">
                  <span>
                    {server.name}{" "}
                    <span className="text-[var(--faint)]">finishes {server.rate}/tick</span>
                  </span>
                  <span className="font-mono tabular-nums">{frame.inflight[idx]} left</span>
                </div>
                <Meter value={frame.inflight[idx]} max={max} color={idx === 2 ? "var(--good)" : ACCENT} />
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[var(--faint)]">
            Tick {i + 1} of {frames.length}, after servers finish their rate.
          </p>
        </FlowStep>
      </div>
    </div>
  );
}
