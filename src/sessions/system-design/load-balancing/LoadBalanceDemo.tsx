"use client";

import { useEffect, useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, Meter } from "@/components/session/ui";
import { SERVERS, simulate, type Strategy } from "@/lib/loadBalance";

const ACCENT = "var(--sys)";

export default function LoadBalanceDemo() {
  const [strategy, setStrategy] = useState<Strategy>("roundRobin");
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const frames = simulate(strategy);
  const frame = frames[Math.min(i, frames.length - 1)];
  const max = Math.max(1, ...frames.flatMap((f) => f.inflight));

  const atEnd = i >= frames.length - 1;

  useEffect(() => {
    if (!playing || atEnd) return;
    const t = setTimeout(() => setI((n) => n + 1), 700);
    return () => clearTimeout(t);
  }, [playing, atEnd, i]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)]">System design · interactive</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Load balancing strategies</h1>
      <p className="mt-3 text-[var(--muted)]">
        Four requests arrive each tick. Server C finishes three in-flight requests a tick. A and B finish
        one. Round robin does not care. Least connections does.
      </p>

      <div className="mt-6">
        <FlowStep n={1} title="Pick a strategy" what="Round robin deals requests in order. Least connections sends the next request to whoever is least busy." accent={ACCENT} active>
          <Choices
            accent={ACCENT}
            value={strategy}
            onChange={(id) => {
              setStrategy(id);
              setI(0);
              setPlaying(false);
            }}
            options={[
              { id: "roundRobin", label: "Round robin" },
              { id: "least", label: "Least connections" },
            ]}
          />
        </FlowStep>
        <FlowArrow label="4 new requests" accent={ACCENT} active={playing} />

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
          what="C is fast, so its queue stays short. A and B keep a backlog when requests are shared evenly."
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
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setI((n) => (n >= frames.length - 1 ? 0 : n + 1))}
              className="min-h-11 rounded-md px-4 text-sm font-semibold text-[var(--on-accent)]"
              style={{ background: ACCENT }}
            >
              {i >= frames.length - 1 ? "Restart" : "Next tick"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (atEnd) {
                  setI(0);
                  setPlaying(true);
                  return;
                }
                setPlaying((p) => !p);
              }}
              className="min-h-11 rounded-md border border-[var(--line-strong)] px-4 text-sm"
            >
              {playing && !atEnd ? "Pause" : "Play"}
            </button>
          </div>
          <p className="mt-3 text-xs text-[var(--faint)]">
            Tick {i + 1} of {frames.length}, after servers finish their rate.
          </p>
        </FlowStep>
      </div>
    </div>
  );
}
