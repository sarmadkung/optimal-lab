"use client";

import { useEffect, useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { RunButton, Slider } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMapPanel } from "@/components/system/SystemMap";
import { VALUES, costs, trace } from "@/lib/slidingWindow";

const ACCENT = "var(--dsa)";

export default function SlidingWindowDemo() {
  const [k, setK] = useState(3);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const frames = trace(k);
  const frame = frames[Math.min(i, frames.length - 1)];
  const scale = costs(1_000, k);
  const naiveHere = (i + 1) * k;
  const slideHere = i === 0 ? k : k + i * 2;

  const atEnd = i >= frames.length - 1;

  useEffect(() => {
    if (!playing || atEnd) return;
    const t = setTimeout(() => setI((n) => n + 1), 700);
    return () => clearTimeout(t);
  }, [playing, atEnd, i]);

  const slide = () => {
    if (i >= frames.length - 1) {
      setI(0);
      setPlaying(false);
      return;
    }
    setI((n) => n + 1);
  };

  const playLabel = playing && !atEnd ? "Pause" : "Play";
  const togglePlay = () => {
    if (atEnd) {
      setI(0);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  };
  const changeK = (v: number) => {
    setK(v);
    setI(0);
    setPlaying(false);
  };

  return (
    <SessionPage>
      <SessionHeader
        kicker="DSA · interactive"
        title="Sliding window"
        blurb={`Find the ${k} adjacent cells with the biggest sum. The first window is added in full. Every later window only drops the cell that left and adds the cell that entered.`}
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5" aria-label="The array and the window">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">
                  Window {i + 1} of {frames.length}
                </p>
                <p className="font-mono text-sm">
                  best <span className="text-[var(--text)]">{frame.best}</span>
                  <span className="text-[var(--faint)]"> at cell {frame.bestStart}</span>
                </p>
              </div>
              <div className="mt-4">
                <Cells start={frame.start} k={k} best={frame.bestStart} />
              </div>
              <p className="mt-4 font-mono text-2xl tabular-nums">
                sum = <span style={{ color: ACCENT }}>{frame.sum}</span>
              </p>
              <p className="mt-1 text-xs text-[var(--faint)]">
                Adds so far: sliding {slideHere}, re-adding every cell {naiveHere}.
              </p>
            </section>
          }
          panel={
            <SystemMapPanel
              caption={
                frame.left === null
                  ? `First window: add all ${k} cells. Sum ${frame.sum}.`
                  : `Dropped ${frame.left}, added ${frame.entered}. Sum ${frame.sum}.`
              }
            >
              <div className="w-full">
                <Slider label="Window size (k)" hint={`${frames.length} window positions`} value={k} min={1} max={VALUES.length} step={1} format={(v) => String(v)} accent={ACCENT} onChange={changeK} />
              </div>
              <RunButton busy={false} accent={ACCENT} onClick={slide}>
                {atEnd ? "Restart" : "Slide"}
              </RunButton>
              <button type="button" onClick={togglePlay} className="min-h-11 rounded-md border border-[var(--line-strong)] px-4 text-sm">
                {playLabel}
              </button>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Choose the window size" what="k is how many adjacent cells you look at together." accent={ACCENT} active={i === 0}>
                <p className="text-sm text-[var(--muted)]">
                  k = <span className="font-mono text-[var(--text)]">{k}</span>, so there are {frames.length} window positions. Change k in the panel.
                </p>
              </FlowStep>
              <FlowArrow label={`${k} cells`} accent={ACCENT} active={playing && i === 0} />

              <FlowStep n={2} title="Sum the cells inside" what="Add every value the window currently covers." accent={ACCENT} active={i === 0}>
                <p className="break-words font-mono text-sm">
                  {VALUES.slice(frame.start, frame.start + k).join(" + ")} = <span className="text-[var(--text)]">{frame.sum}</span>
                </p>
              </FlowStep>
              <FlowArrow label={frame.left === null ? "first window" : `drop ${frame.left}, add ${frame.entered}`} accent={ACCENT} active={playing} />

              <FlowStep
                n={3}
                title="Slide one cell to the right"
                what="Subtract the cell that fell off the left. Add the cell that came in on the right. Do not re-add the ones that stayed."
                accent={ACCENT}
                active={i > 0}
              >
                {frame.left === null ? (
                  <p className="text-sm text-[var(--muted)]">This is the first window, so there is nothing to drop yet. Press Slide.</p>
                ) : (
                  <p className="break-words font-mono text-sm">
                    {frame.sum + frame.left - frame.entered} − {frame.left} + {frame.entered} = {frame.sum}
                  </p>
                )}
              </FlowStep>
              <FlowArrow label={`best sum ${frame.best}`} accent={ACCENT} />

              <FlowStep n={4} title="Remember the best sum" what="Keep the largest sum you have seen, and where that window started." accent={ACCENT} active={atEnd}>
                <p className="text-sm">
                  Best sum is <span className="font-mono text-[var(--text)]">{frame.best}</span>, starting at cell{" "}
                  <span className="font-mono text-[var(--text)]">{frame.bestStart}</span>.
                </p>
              </FlowStep>
              <FlowArrow label="same idea, longer array" accent={ACCENT} />

              <FlowStep
                n={5}
                title="The extra work stays flat"
                what="Re-adding the window touches k cells every time. Sliding touches two. On a long array that gap is the whole point."
                accent={ACCENT}
              >
                <p className="text-sm text-[var(--muted)]">
                  For 1,000 cells and k = {k}: re-adding does{" "}
                  <span className="font-mono text-[var(--text)]">{scale.naive.toLocaleString("en-US")}</span> adds. Sliding does{" "}
                  <span className="font-mono text-[var(--text)]">{scale.slide.toLocaleString("en-US")}</span>.
                </p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Cells({ start, k, best }: { start: number; k: number; best: number }) {
  return (
    <ol className="flex gap-1">
      {VALUES.map((v, idx) => {
        const inside = idx >= start && idx < start + k;
        const inBest = idx >= best && idx < best + k;
        return (
          <li
            key={`${idx}-${v}`}
            className="grid h-12 min-w-0 flex-1 place-items-center rounded-md border font-mono text-sm tabular-nums sm:h-14 sm:text-base"
            style={{
              borderColor: inside ? ACCENT : "var(--line)",
              background: inside ? "color-mix(in srgb, var(--dsa) 18%, transparent)" : "var(--inset)",
              boxShadow: inBest && !inside ? "inset 0 -3px 0 var(--good)" : undefined,
            }}
          >
            {v}
          </li>
        );
      })}
    </ol>
  );
}
