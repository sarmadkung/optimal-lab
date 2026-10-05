"use client";

import { useEffect, useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { RunButton } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMapPanel } from "@/components/system/SystemMap";
import { SORTED, linearChecks, search } from "@/lib/binarySearch";

const ACCENT = "var(--dsa)";
const TARGETS = [...SORTED, 13];

export default function BinarySearchDemo() {
  const [target, setTarget] = useState(22);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const frames = search(target);
  const frame = frames[Math.min(i, frames.length - 1)];
  const linear = linearChecks(target);

  const atEnd = i >= frames.length - 1;

  useEffect(() => {
    if (!playing || atEnd) return;
    const t = setTimeout(() => setI((n) => n + 1), 800);
    return () => clearTimeout(t);
  }, [playing, atEnd, i]);

  const pick = (n: number) => {
    setTarget(n);
    setI(0);
    setPlaying(false);
  };

  const note =
    frame.verdict === "found"
      ? `${frame.value} equals ${target}. Stop.`
      : frame.verdict === "low"
        ? `${frame.value} is below ${target}. Keep the right half.`
        : frame.verdict === "high"
          ? `${frame.value} is above ${target}. Keep the left half.`
          : `${target} is not in the list. The range is empty.`;

  const nextProbe = () => {
    setPlaying(false);
    setI((n) => (n >= frames.length - 1 ? 0 : n + 1));
  };

  const togglePlay = () => {
    if (atEnd) {
      setI(0);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  };

  return (
    <SessionPage>
      <SessionHeader
        kicker="DSA · interactive"
        title="Binary search"
        blurb={`The list is sorted. Each probe checks the middle and throws away the half that cannot hold ${target}.`}
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5" aria-label="The sorted list and the range still in play">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">
                  Probe {i + 1} of {frames.length}
                </p>
                <p className="font-mono text-xs text-[var(--faint)]">
                  {frame.mid < 0 ? "range empty" : `lo ${frame.lo} · mid ${frame.mid} · hi ${frame.hi}`}
                </p>
              </div>
              <ol className="mt-4 flex gap-1">
                {SORTED.map((v, idx) => {
                  const inRange = frame.mid >= 0 && idx >= frame.lo && idx <= frame.hi;
                  const mid = idx === frame.mid;
                  return (
                    <li key={v} className="flex min-w-0 flex-1 flex-col items-center">
                      <span
                        className="grid h-12 w-full place-items-center rounded-md border font-mono text-xs tabular-nums sm:h-14 sm:text-base"
                        style={{
                          borderColor: mid ? "var(--good)" : inRange ? ACCENT : "var(--line)",
                          background: mid
                            ? "color-mix(in srgb, var(--good) 22%, transparent)"
                            : inRange
                              ? "color-mix(in srgb, var(--dsa) 16%, transparent)"
                              : "var(--inset)",
                          opacity: frame.mid >= 0 && !inRange ? 0.45 : 1,
                        }}
                      >
                        {v}
                      </span>
                      <span className="mt-1 h-4 font-mono text-[10px] text-[var(--faint)]">
                        {frame.mid < 0 ? "" : idx === frame.mid ? "mid" : idx === frame.lo ? "lo" : idx === frame.hi ? "hi" : ""}
                      </span>
                    </li>
                  );
                })}
              </ol>
              <p className="mt-3 text-sm" style={{ color: frame.verdict === "found" ? "var(--good)" : "var(--text)" }}>
                {note}
              </p>
            </section>
          }
          panel={
            <SystemMapPanel caption={`Probe ${i + 1}: ${note}`}>
              <div className="w-full">
                <p className="text-sm font-medium">Target</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {TARGETS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={n === target}
                      onClick={() => pick(n)}
                      className="min-h-11 min-w-11 rounded-md border px-2 font-mono text-sm tabular-nums"
                      style={
                        n === target
                          ? { borderColor: ACCENT, color: "var(--text)", background: "color-mix(in srgb, var(--dsa) 16%, transparent)" }
                          : { borderColor: "var(--line)", color: "var(--muted)" }
                      }
                    >
                      {n === 13 ? "13 (missing)" : n}
                    </button>
                  ))}
                </div>
              </div>
              <RunButton busy={false} accent={ACCENT} onClick={nextProbe}>
                {atEnd ? "Restart" : "Next probe"}
              </RunButton>
              <button type="button" onClick={togglePlay} className="min-h-11 rounded-md border border-[var(--line-strong)] px-4 text-sm">
                {playing && !atEnd ? "Pause" : "Play"}
              </button>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Keep the range still in play" what="lo and hi are the first and last cells that might still hold the target." accent={ACCENT} active={i === 0}>
                <p className="font-mono text-sm">
                  {frame.mid < 0 ? "The range is empty." : `${frame.hi - frame.lo + 1} cells left, from index ${frame.lo} to ${frame.hi}.`}
                </p>
              </FlowStep>
              <FlowArrow label={frame.value === null ? "no cell left" : `middle cell ${frame.value}`} accent={ACCENT} active={playing} />

              <FlowStep n={2} title="Compare the middle to the target" what="Equal means you found it. Smaller means look right. Larger means look left." accent={ACCENT} active={i > 0 && frame.verdict !== "missing" && frame.verdict !== "found"}>
                <p className="text-sm">{note}</p>
              </FlowStep>
              <FlowArrow label={frame.verdict === "low" ? "right half" : frame.verdict === "high" ? "left half" : "stop"} accent={ACCENT} />

              <FlowStep n={3} title="Drop the half that cannot match" what="The list is sorted, so one comparison removes every cell on the wrong side of the middle." accent={ACCENT} active={i > 0 && (frame.verdict === "low" || frame.verdict === "high")}>
                <p className="text-sm text-[var(--muted)]">
                  Probe {i + 1} of {frames.length}. A linear scan would have checked {linear}{" "}
                  {linear === 1 ? "cell" : "cells"}.
                </p>
              </FlowStep>
              <FlowArrow label="smaller range" accent={ACCENT} />

              <FlowStep
                n={4}
                title="Repeat until one answer remains"
                what="Each probe halves what is left, so the number of probes grows like log n, not like n."
                accent={ACCENT}
                active={frame.verdict === "found" || frame.verdict === "missing"}
              >
                <p className="text-sm">
                  {frame.verdict === "found"
                    ? `Found ${target} in ${frames.length} ${frames.length === 1 ? "probe" : "probes"}. A linear scan needs ${linear}.`
                    : frame.verdict === "missing"
                      ? `Stopped after ${frames.length - 1} probes. ${target} is absent.`
                      : "Still narrowing."}
                </p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
