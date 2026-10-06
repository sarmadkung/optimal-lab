"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, PlaybackControls, usePlayback } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMapPanel } from "@/components/system/SystemMap";
import { HEIGHT_PRESETS, containerTrace, pairCount } from "@/lib/dsaPatterns";

const ACCENT = "var(--dsa)";

export default function TwoPointersDemo() {
  const [presetId, setPresetId] = useState(HEIGHT_PRESETS[0].id);
  const h = (HEIGHT_PRESETS.find((p) => p.id === presetId) ?? HEIGHT_PRESETS[0]).heights;
  const frames = containerTrace(h);
  const playback = usePlayback(frames.length, 1100);
  const f = frames[playback.i];
  const done = f.move === null;
  const max = Math.max(...h);
  // While running, the water between L and R; once finished, the best container.
  const [wl, wr] = done ? f.bestPair : [f.l, f.r];
  const water = Math.min(h[wl], h[wr]);

  const caption = done
    ? `The pointers met. Best: lines ${f.bestPair[0]} and ${f.bestPair[1]}, area ${f.best}, in ${frames.length - 1} checks instead of ${pairCount(h.length)}.`
    : `Lines ${f.l} and ${f.r}: min(${h[f.l]}, ${h[f.r]}) × ${f.r - f.l} = ${f.area}. ${
        h[f.l] === h[f.r] ? "Both are the same height, so either can move: the left one does." : `Move the ${f.move === "l" ? "left" : "right"} one, it's the shorter line.`
      }`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DSA · interactive"
        title="Two pointers: the container with most water"
        blurb="Pick two lines to hold the most water. Checking every pair is O(n²). Start at both ends and always move the shorter line inward, and one pass is enough. Watch why."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5" aria-label="Lines and the water between the two pointers">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">
                  {done ? "Finished" : `Check ${playback.i + 1} of ${frames.length - 1}`}
                </p>
                <p className="font-mono text-sm">
                  best <span style={{ color: ACCENT }}>{f.best}</span>
                </p>
              </div>
              <div className="relative mt-4 flex h-56 items-end gap-1 sm:h-64">
                {/* the water between the two lines */}
                <div
                  aria-hidden
                  className="absolute bottom-0 rounded-sm transition-all duration-300"
                  style={{
                    left: `${((wl + 0.5) / h.length) * 100}%`,
                    width: `${((wr - wl) / h.length) * 100}%`,
                    height: `${(water / max) * 100}%`,
                    background: `color-mix(in srgb, var(--c1) ${done ? 30 : 20}%, transparent)`,
                  }}
                />
                {h.map((v, i) => {
                  const isL = !done && i === f.l;
                  const isR = !done && i === f.r;
                  const outside = !done && (i < f.l || i > f.r);
                  return (
                    <div key={i} className="relative z-10 flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                      <div
                        className="w-2/3 rounded-t transition-[background,opacity] duration-300"
                        style={{
                          height: `${(v / max) * 100}%`,
                          minHeight: 2,
                          background: isL || isR ? ACCENT : done && (i === wl || i === wr) ? "var(--good)" : "var(--line-strong)",
                          opacity: outside ? 0.35 : 1,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-1 flex gap-1">
                {h.map((v, i) => (
                  <span key={i} className="flex min-w-0 flex-1 flex-col items-center font-mono text-xs">
                    <span className="text-[var(--faint)]">{v}</span>
                    <span className="h-4 font-semibold" style={{ color: ACCENT }}>
                      {!done && i === f.l ? "L" : !done && i === f.r ? "R" : ""}
                    </span>
                  </span>
                ))}
              </div>
            </section>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <Choices
                label="Heights"
                accent={ACCENT}
                value={presetId}
                onChange={(id) => {
                  setPresetId(id);
                  playback.reset();
                }}
                options={HEIGHT_PRESETS.map((p) => ({ id: p.id, label: p.label }))}
              />
              <PlaybackControls playback={playback} accent={ACCENT} nextLabel="Next step" status={`${frames.length - 1} checks vs ${pairCount(h.length)} pairs`} />
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Put a pointer at each end" what="The widest container uses the first and last line. Start there." accent={ACCENT} active={playback.i === 0}>
                <p className="font-mono text-sm">L = 0, R = {h.length - 1}</p>
              </FlowStep>
              <FlowArrow label="two lines" accent={ACCENT} />

              <FlowStep n={2} title="Measure the water" what="Water rises to the shorter line. Area = shorter height × distance between the lines." accent={ACCENT} active={!done}>
                {!done && (
                  <p className="font-mono text-sm">
                    min({h[f.l]}, {h[f.r]}) × ({f.r} − {f.l}) = {f.area}
                  </p>
                )}
              </FlowStep>
              <FlowArrow label="an area" accent={ACCENT} />

              <FlowStep n={3} title="Keep the best area" what="Remember the biggest area so far and which two lines made it." accent={ACCENT}>
                <p className="font-mono text-sm">
                  best = {f.best} (lines {f.bestPair[0]} and {f.bestPair[1]})
                </p>
              </FlowStep>
              <FlowArrow label="move one pointer" accent={ACCENT} />

              <FlowStep n={4} title="Move the shorter line inward" what="Moving the taller line can only lose width and never raises the water, since the short line still caps it. So every pair with the short line is already beaten: drop it." accent={ACCENT} active={!done && playback.i > 0}>
                {!done && (
                  <p className="text-sm">
                    {h[f.l] === h[f.r]
                      ? `Both lines are ${h[f.l]}. Neither can do better with a closer partner, so moving either is safe: L moves right.`
                      : h[f.l] < h[f.r]
                        ? `Left line (${h[f.l]}) is shorter, so L moves right.`
                        : `Right line (${h[f.r]}) is shorter, so R moves left.`}
                  </p>
                )}
              </FlowStep>
              <FlowArrow label="repeat until L meets R" accent={ACCENT} />

              <FlowStep n={5} title="Stop when the pointers meet" what="Each step drops one line, so the scan is O(n) time and O(1) extra space." accent={ACCENT} active={done}>
                <p className="text-sm">
                  {frames.length - 1} checks for {h.length} lines. Brute force checks {pairCount(h.length)} pairs; for 100,000 lines that is about 5 billion.
                </p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
