"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Meter, PlaybackControls, Slider, usePlayback } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionSplitLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, type Packet } from "@/components/system/SystemMap";
import { simulate } from "@/lib/backpressure";

const ACCENT = "var(--node)";

export default function BackpressureDemo() {
  const [produce, setProduce] = useState(8);
  const [consume, setConsume] = useState(3);
  const [hwm, setHwm] = useState(10);
  const frames = simulate(produce, consume, hwm);
  const playback = usePlayback(frames.length, 1200);
  const frame = frames[playback.i];
  const peak = Math.max(hwm, ...frames.map((f) => f.buffer));

  const id = `${produce}-${consume}-${hwm}-${playback.i}`;
  const packets: Packet[] = [];
  if (frame.wrote > 0) packets.push({ id: `${id}-w`, from: "producer", to: "buffer", label: `${frame.wrote} B` });
  if (frame.read > 0) packets.push({ id: `${id}-r`, from: "buffer", to: "consumer", label: `${frame.read} B`, delay: 0.5 });
  if (frame.paused) packets.push({ id: `${id}-p`, from: "buffer", to: "producer", label: "pause", tone: "bad", delay: 0.5 });

  const caption = frame.paused ? (
    <>
      <span style={{ color: "var(--bad)" }}>Over the limit.</span> The buffer holds {frame.buffer} bytes, so the producer is told to pause.
    </>
  ) : (
    <>Flowing. Wrote {frame.wrote}, read {frame.read}, {frame.buffer} bytes waiting.</>
  );

  return (
    <SessionPage>
      <SessionHeader
        kicker="Node.js · interactive"
        title="Streams and backpressure"
        blurb="The producer wants to write faster than the consumer can read. The high water mark is the buffer's limit. Cross it, and the producer pauses."
      />

      <div className="mt-6">
        <SessionSplitLayout
          visual={
            <SystemMap
              chrome="split"
          title="A producer, the stream buffer and a consumer"
          accent={ACCENT}
          nodes={[
            { id: "producer", label: "Producer", sub: frame.paused ? "paused" : `writes ${produce}/tick`, at: [14, 50], mobileAt: [50, 13], state: frame.paused ? "bad" : "active" },
            { id: "buffer", label: "Buffer", sub: `${frame.buffer} / ${hwm} bytes`, at: [50, 50], mobileAt: [50, 50], state: frame.paused ? "bad" : "idle" },
            { id: "consumer", label: "Consumer", sub: `reads ${consume}/tick`, at: [86, 50], mobileAt: [50, 87], state: frame.read > 0 ? "active" : "idle" },
          ]}
          links={[
            { from: "producer", to: "buffer", label: frame.paused ? "backpressure" : "write()" },
            { from: "buffer", to: "consumer", label: "read()" },
          ]}
          packets={packets}
          aspect={2.6}
          mobileAspect={1}
            />
          }
          panel={
            <SystemMapPanel caption={caption}>
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
                  playback.reset();
                }}
              />
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
                  playback.reset();
                }}
              />
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
                  playback.reset();
                }}
              />
              <PlaybackControls playback={playback} accent={ACCENT} nextLabel="Next tick" status={`Tick ${frame.tick + 1} of ${frames.length}`} />
            </SystemMapPanel>
          }
          detail={
            <>
        <FlowStep n={1} title="Write a chunk" what="If the stream is flowing, the producer adds bytes to the buffer." accent={ACCENT} active={frame.wrote > 0}>
          <p className="font-mono text-sm">wrote {frame.wrote} this tick · {produce} B/tick in the panel</p>
        </FlowStep>
        <FlowArrow label={`${frame.wrote} bytes`} accent={ACCENT} active={playback.playing} />

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
          <p className="text-sm" style={{ color: frame.paused ? "var(--bad)" : "var(--good)" }}>
            {frame.paused ? "Paused. The producer writes nothing until the buffer drops." : "Flowing. The producer may write."}
          </p>
        </FlowStep>
        <FlowArrow label={`${frame.read} bytes read`} accent={ACCENT} />

        <FlowStep n={4} title="Read some bytes out" what="The consumer takes what it can. If the buffer falls back under the limit, the producer resumes on the next tick." accent={ACCENT} active={frame.read > 0}>
          <p className="text-xs text-[var(--faint)]">
            Tick {frame.tick + 1} of {frames.length}. Read {frame.read}.
          </p>
        </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
