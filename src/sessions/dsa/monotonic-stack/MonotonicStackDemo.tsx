"use client";

import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { PlaybackControls, usePlayback } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMapPanel } from "@/components/system/SystemMap";
import { TEMPS, dailyTemperatures } from "@/lib/dsaPatterns";

const ACCENT = "var(--dsa)";
const frames = dailyTemperatures(TEMPS);
const MIN = Math.min(...TEMPS) - 4;
const MAX = Math.max(...TEMPS);

export default function MonotonicStackDemo() {
  const playback = usePlayback(frames.length, 1300);
  const f = frames[playback.i];
  const finished = f.i >= TEMPS.length;
  const reading = f.i >= 0 && !finished;

  const caption =
    f.i < 0
      ? "Empty stack. Each day waits on the stack until a warmer day shows up."
      : finished
        ? `The days left on the stack (${f.popped.map((j) => `day ${j}`).join(", ") || "none"}) never got warmer: they answer 0. ${f.ops} pushes and pops for ${TEMPS.length} days.`
        : f.popped.length
          ? `Day ${f.i} is ${TEMPS[f.i]}°, warmer than ${f.popped.map((j) => `day ${j} (${TEMPS[j]}°)`).join(" and ")}. ${f.popped.length === 1 ? "It is" : "They are"} popped and answered, then day ${f.i} is pushed.`
          : `Day ${f.i} is ${TEMPS[f.i]}°, not warmer than the top of the stack. Push it and wait.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DSA · interactive"
        title="Monotonic stack: days until a warmer day"
        blurb="For each day, how long until it gets warmer? Checking forward from every day is O(n²). Keep a stack of days still waiting, coldest on top, and each day is pushed and popped at most once."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5" aria-label="Temperatures, the waiting stack and the answers">
              <div className="flex h-44 items-end gap-1 sm:h-52">
                {TEMPS.map((t, i) => {
                  const now = i === f.i;
                  const waiting = f.stack.includes(i) && !now;
                  const answered = f.answer[i] !== null;
                  const popping = f.popped.includes(i);
                  return (
                    <div key={i} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                      <div
                        className="rounded-t transition-[background,opacity] duration-300"
                        style={{
                          height: `${((t - MIN) / (MAX - MIN)) * 100}%`,
                          background: now ? ACCENT : popping ? "var(--good)" : waiting ? "color-mix(in srgb, var(--dsa) 45%, transparent)" : "var(--line-strong)",
                          opacity: answered && !popping ? 0.45 : 1,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-1 grid gap-1" style={{ gridTemplateColumns: `repeat(${TEMPS.length}, minmax(0, 1fr))` }}>
                {TEMPS.map((t, i) => (
                  <div key={i} className="text-center font-mono text-[10px] leading-tight sm:text-xs">
                    <span className="block text-[var(--muted)]">{t}°</span>
                    <span className="block text-[var(--faint)]">d{i}</span>
                    <span className="mt-1 block rounded bg-[var(--inset)] py-0.5" style={{ color: f.answer[i] === null ? "var(--faint)" : "var(--text)" }}>
                      {f.answer[i] ?? "·"}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">Stack</span>
                <span className="font-mono text-xs text-[var(--faint)]">bottom</span>
                <ol className="flex flex-wrap gap-1">
                  {f.stack.length === 0 && <li className="font-mono text-sm text-[var(--faint)]">empty</li>}
                  {f.stack.map((j, idx) => (
                    <li
                      key={j}
                      className="rounded border px-2 py-0.5 font-mono text-sm"
                      style={{ borderColor: idx === f.stack.length - 1 ? ACCENT : "var(--line)" }}
                    >
                      d{j} {TEMPS[j]}°
                    </li>
                  ))}
                </ol>
                <span className="font-mono text-xs text-[var(--faint)]">top</span>
              </div>
            </section>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <PlaybackControls playback={playback} accent={ACCENT} nextLabel="Next day" status={`${f.ops} stack operations · max ${2 * TEMPS.length}`} />
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Read today's temperature" what="Walk the days left to right, once." accent={ACCENT} active={reading}>
                <p className="font-mono text-sm">{reading ? `day ${f.i}: ${TEMPS[f.i]}°` : "—"}</p>
              </FlowStep>
              <FlowArrow label="today" accent={ACCENT} />

              <FlowStep n={2} title="Pop every colder day off the top" what="Today is the first warmer day for each of them. Their answer is today's index minus theirs." accent={ACCENT} active={reading && f.popped.length > 0}>
                <p className="text-sm">
                  {reading && f.popped.length
                    ? f.popped.map((j) => `d${j}: ${f.i} − ${j} = ${f.i - j}`).join(" · ")
                    : "Nothing colder on top."}
                </p>
              </FlowStep>
              <FlowArrow label="stack is warmer on top now" accent={ACCENT} />

              <FlowStep n={3} title="Push today" what="Today now waits for its own warmer day. The stack always reads warmest at the bottom, coldest on top: that's the “monotonic” part." accent={ACCENT} active={reading && f.popped.length === 0}>
                <p className="font-mono text-sm">{f.stack.map((j) => `${TEMPS[j]}°`).join(" ≥ ") || "—"}</p>
              </FlowStep>
              <FlowArrow label="after the last day" accent={ACCENT} />

              <FlowStep n={4} title="Whoever is left gets 0" what="No warmer day ever came. Every day was pushed once and popped at most once: O(n) time." accent={ACCENT} active={finished}>
                <p className="font-mono text-sm break-words">[{f.answer.map((a) => a ?? "·").join(", ")}]</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
