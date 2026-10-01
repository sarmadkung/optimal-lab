"use client";

import { useEffect, useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Meter, Slider } from "@/components/session/ui";
import { simulate } from "@/lib/backpressure";

const ACCENT = "var(--node)";

export default function BackpressureDemo() {
  const [produce, setProduce] = useState(8);
  const [consume, setConsume] = useState(3);
  const [hwm, setHwm] = useState(10);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const frames = simulate(produce, consume, hwm);
  const frame = frames[Math.min(i, frames.length - 1)];
  const peak = Math.max(hwm, ...frames.map((f) => f.buffer));

  const atEnd = i >= frames.length - 1;

  useEffect(() => {
    if (!playing || atEnd) return;
    const t = setTimeout(() => setI((n) => n + 1), 600);
    return () => clearTimeout(t);
  }, [playing, atEnd, i]);

  const reset = () => {
    setI(0);
    setPlaying(false);
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)]">Node.js · interactive</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Streams and backpressure</h1>
      <p className="mt-3 text-[var(--muted)]">
        The producer wants to write faster than the consumer can read. The high water mark is the
        buffer&apos;s limit. Cross it, and the producer pauses.
      </p>

      <div className="mt-6">
        <FlowStep n={1} title="Write a chunk" what="If the stream is flowing, the producer adds bytes to the buffer." accent={ACCENT} active={frame.wrote > 0}>
          <Slider
            label="Bytes written per tick"
            value={produce}
            min={1}
            max={12}
            step={1}
            format={(v) => String(v)}
            accent={ACCENT}
            onChange={(v) => {
              setProduce(v);
              reset();
            }}
          />
          <p className="mt-2 font-mono text-sm">wrote {frame.wrote} this tick</p>
        </FlowStep>
        <FlowArrow label={`${frame.wrote} bytes`} accent={ACCENT} active={playing} />

        <FlowStep n={2} title="Hold them in the buffer" what="Unread bytes wait here. The bar is the buffer. The mark is the limit." accent={ACCENT} active>
          <Meter value={frame.buffer} max={peak} color={frame.paused ? "var(--bad)" : ACCENT} />
          <p className="mt-2 font-mono text-sm">
            buffer {frame.buffer} / limit {hwm}
          </p>
        </FlowStep>
        <FlowArrow label={frame.paused ? "over the limit" : "under the limit"} accent={ACCENT} />

        <FlowStep
          n={3}
          title="Pause when the buffer is full"
          what="Once the buffer reaches the high water mark, the producer stops writing until there is room."
          accent={ACCENT}
          active={frame.paused}
        >
          <Slider
            label="High water mark"
            hint="Pause at this many unread bytes"
            value={hwm}
            min={4}
            max={20}
            step={1}
            format={(v) => String(v)}
            accent={ACCENT}
            onChange={(v) => {
              setHwm(v);
              reset();
            }}
          />
          <p className="mt-2 text-sm" style={{ color: frame.paused ? "var(--bad)" : "var(--good)" }}>
            {frame.paused ? "Paused. The producer writes nothing until the buffer drops." : "Flowing. The producer may write."}
          </p>
        </FlowStep>
        <FlowArrow label={`${frame.read} bytes read`} accent={ACCENT} />

        <FlowStep n={4} title="Read some bytes out" what="The consumer takes what it can. If the buffer falls back under the limit, the producer resumes." accent={ACCENT} active={frame.read > 0}>
          <Slider
            label="Bytes read per tick"
            value={consume}
            min={1}
            max={12}
            step={1}
            format={(v) => String(v)}
            accent={ACCENT}
            onChange={(v) => {
              setConsume(v);
              reset();
            }}
          />
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
            Tick {frame.tick + 1} of {frames.length}. Read {frame.read}.
          </p>
        </FlowStep>
      </div>
    </div>
  );
}
