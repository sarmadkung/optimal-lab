"use client";

// One chapter at a time: a live stage, the narration for this moment, then Back / Next.
// See "Guided lessons" in README.md.

import { useEffect, useRef, useState, type ReactNode } from "react";

export type PredictSpec = {
  prompt: string;
  choices: { id: string; label: string }[];
  correct: string;
  why: Record<string, string>;
};

export type LessonStep = {
  id: string;
  chapter: string;
  title: string;
  body: string[];
  predict?: PredictSpec;
  /** Playback controls. Turn off when the reader drives the stage themselves. */
  controls?: boolean;
};

export type LessonContext = {
  index: number;
  speed: number;
  runId: number;
  paused: boolean;
  revealed: boolean;
};

const SPEEDS = [0.5, 1, 2] as const;

type Props = {
  steps: LessonStep[];
  accent: string;
  renderStage: (step: LessonStep, ctx: LessonContext) => ReactNode;
  renderExtra?: (step: LessonStep, ctx: LessonContext) => ReactNode;
};

export function Lesson({ steps, accent, renderStage, renderExtra }: Props) {
  const [index, setIndex] = useState(0);
  const [speed, setSpeed] = useState<number>(1);
  const [runId, setRunId] = useState(0);
  const [paused, setPaused] = useState(false);
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string | "skip">>({});
  const stageRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [hashReady, setHashReady] = useState(false);
  const scrolled = useRef(false);
  const indexRef = useRef(0);

  const step = steps[Math.min(index, steps.length - 1)];
  const stored = answers[step.id];
  const revealed = !step.predict || stored !== undefined;
  const answer = stored && stored !== "skip" ? stored : null;
  const ctx: LessonContext = { index, speed, runId, paused, revealed };

  const stepKey = steps.map((s) => s.id).join("|");
  indexRef.current = index;

  useEffect(() => {
    function applyHash() {
      const id = window.location.hash.replace("#", "");
      const found = stepKey.split("|").indexOf(id);
      if (found >= 0 && found !== indexRef.current) {
        setIndex(found);
        setPaused(false);
        setRunId((n) => n + 1);
      }
      setHashReady(true);
    }
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [stepKey]);

  useEffect(() => {
    if (!hashReady) return;
    const next = `#${steps[index].id}`;
    if (window.location.hash !== next) history.replaceState(null, "", next);
  }, [hashReady, index, steps]);

  useEffect(() => {
    if (!hashReady) return;
    if (!scrolled.current) {
      scrolled.current = true;
      return;
    }
    stageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hashReady, index]);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onPointer);
    return () => window.removeEventListener("mousedown", onPointer);
  }, [open]);

  function go(nextIndex: number) {
    const at = Math.max(0, Math.min(steps.length - 1, nextIndex));
    if (at === index) return;
    setIndex(at);
    setPaused(false);
    setRunId((n) => n + 1);
    setOpen(false);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
      const target = e.target;
      if (target instanceof HTMLElement && target.closest("input, textarea, select")) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        go(index + 1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(index - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // `go` is recreated each render and only reads the current index.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, steps.length]);

  function reveal(value: string | "skip") {
    setAnswers((prev) => (prev[step.id] ? prev : { ...prev, [step.id]: value }));
    setPaused(false);
    setRunId((n) => n + 1);
  }

  const next = steps[index + 1];
  const showControls = step.controls !== false;

  return (
    <div ref={stageRef} className="scroll-mt-20">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-mono text-xs text-[var(--muted)]">
          {index + 1} / {steps.length}
        </p>
        <div ref={menuRef} className="relative">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="min-h-11 rounded-md border border-[var(--line-strong)] px-3 text-sm"
          >
            Contents
          </button>
          {open && (
            <ol className="absolute right-0 z-40 mt-2 max-h-[70vh] w-[min(20rem,calc(100vw-2rem))] overflow-auto rounded-xl border border-[var(--line)] bg-[var(--panel)] p-2 shadow-lg">
              {steps.map((s, i) => {
                const current = i === index;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => go(i)}
                      className="flex min-h-11 w-full items-baseline gap-2 rounded-md px-2 py-2 text-left text-sm"
                      style={current ? { background: `color-mix(in srgb, ${accent} 16%, transparent)` } : undefined}
                    >
                      <span className="font-mono text-xs text-[var(--faint)]">{String(i + 1).padStart(2, "0")}</span>
                      <span className="min-w-0 flex-1">
                        {s.title}
                        {s.predict && <span className="ml-2 font-mono text-[10px] uppercase text-[var(--faint)]">Predict</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>

      <div className="mb-3 h-1 overflow-hidden rounded bg-[var(--track)]" aria-hidden>
        <div className="h-full rounded transition-[width] duration-300" style={{ width: `${((index + 1) / steps.length) * 100}%`, background: accent }} />
      </div>

      {/* The picture stays on the left. The chapter and Back / Next sit beside it
          once there is room, and under it on a phone, so both share one view. */}
      <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(17rem,0.85fr)]">
        <div className="lg:sticky lg:top-20">
          {renderStage(step, ctx)}

          {showControls && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                className="min-h-11 rounded-md px-4 text-sm font-semibold text-[var(--on-accent)]"
                style={{ background: accent }}
              >
                {paused ? "Play" : "Pause"}
              </button>
              <div className="flex rounded-md border border-[var(--line)] p-0.5">
                {SPEEDS.map((value) => {
                  const on = value === speed;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setSpeed(value)}
                      className="min-h-11 rounded px-3 font-mono text-sm"
                      style={on ? { background: `color-mix(in srgb, ${accent} 18%, transparent)`, color: "var(--text)" } : { color: "var(--muted)" }}
                    >
                      {value}×
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => {
                  setPaused(false);
                  setRunId((n) => n + 1);
                }}
                className="min-h-11 rounded-md border border-[var(--line-strong)] px-4 text-sm"
              >
                Replay
              </button>
            </div>
          )}
        </div>

        <div>
          <article aria-live="polite">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--accent)]">{step.chapter}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{step.title}</h2>
            <div className="mt-3 space-y-3 text-[var(--muted)]">
              {step.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            {step.predict && (
              <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">Your turn · predict</p>
            <p className="mt-2 font-medium text-[var(--text)]">{step.predict.prompt}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {step.predict.choices.map((choice) => {
                const picked = answer === choice.id;
                const correct = revealed && choice.id === step.predict?.correct;
                const wrong = revealed && picked && !correct;
                return (
                  <button
                    key={choice.id}
                    type="button"
                    disabled={revealed}
                    onClick={() => reveal(choice.id)}
                    className="min-h-11 rounded-md border px-3 py-2 text-sm disabled:cursor-default"
                    style={{
                      borderColor: correct ? "var(--good)" : wrong ? "var(--bad)" : picked ? accent : "var(--line)",
                      background: correct
                        ? "color-mix(in srgb, var(--good) 16%, transparent)"
                        : wrong
                          ? "color-mix(in srgb, var(--bad) 14%, transparent)"
                          : "transparent",
                      color: "var(--text)",
                    }}
                  >
                    {choice.label}
                  </button>
                );
              })}
            </div>
            {!revealed && (
              <button type="button" onClick={() => reveal("skip")} className="mt-3 min-h-11 text-sm text-[var(--muted)] underline-offset-2 hover:underline">
                Skip, just show me
              </button>
            )}
            {revealed && (
              <p className="mt-3 text-sm text-[var(--text)]">
                <span style={{ color: answer === step.predict.correct ? "var(--good)" : "var(--bad)" }}>
                  {answer === null ? "Answer. " : answer === step.predict.correct ? "Correct. " : "Not quite. "}
                </span>
                {answer === null ? step.predict.why[step.predict.correct] : step.predict.why[answer]}
              </p>
            )}
              </div>
            )}

            {renderExtra && <div className="mt-4">{renderExtra(step, ctx)}</div>}
          </article>

          <div className="mt-6 flex items-stretch gap-2">
            <button
              type="button"
              onClick={() => go(index - 1)}
              disabled={index === 0}
              className="min-h-11 shrink-0 rounded-md border border-[var(--line-strong)] px-4 text-sm disabled:opacity-40"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              disabled={!next}
              className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-3 rounded-md px-4 py-2 text-left disabled:opacity-50"
              style={{ background: accent, color: "var(--on-accent)" }}
            >
              <span className="min-w-0">
                <span className="block font-mono text-[10px] uppercase tracking-wider opacity-80">{next ? "Next" : "Done"}</span>
                <span className="block font-semibold">{next ? next.title : "Lesson complete"}</span>
              </span>
              <span aria-hidden>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
