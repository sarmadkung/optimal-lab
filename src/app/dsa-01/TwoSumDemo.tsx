"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect, useState } from "react";
import { APPROACHES, TARGET, TRACES, growth, type Approach } from "@/lib/twoSum";

const SIZES = [8, 100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000];
const SPEEDS = [
  { label: "0.5×", ms: 1400 },
  { label: "1×", ms: 800 },
  { label: "2×", ms: 400 },
];

export default function TwoSumDemo() {
  const [approach, setApproach] = useState<Approach>("brute");
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [sizeIdx, setSizeIdx] = useState(5);

  const frames = TRACES[approach];
  const frame = frames[step];
  const last = step === frames.length - 1;
  const meta = APPROACHES.find((a) => a.id === approach)!;

  useEffect(() => {
    if (!playing || last) return;
    const id = setTimeout(() => setStep((s) => s + 1), SPEEDS[speed].ms);
    return () => clearTimeout(id);
  }, [playing, last, step, speed]);

  const pick = (a: Approach) => {
    setApproach(a);
    setStep(0);
    setPlaying(true);
  };

  const n = SIZES[sizeIdx];
  const ops = growth(n);
  const maxLog = Math.log10(growth(SIZES[SIZES.length - 1]).brute);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--dsa)]">
        DSA series #01 · interactive
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        One problem, <span className="text-[var(--dsa)]">three ways</span>
      </h1>
      <p className="mt-3 text-[var(--muted)]">
        DSA is not about writing code. It is about spotting the pattern and knowing more than one
        way to solve it. Here is the classic example: find two numbers that add up to{" "}
        <span className="font-mono text-[var(--text)]">{TARGET}</span>.
      </p>

      {/* approach tabs */}
      <div className="mt-8 grid gap-2 sm:grid-cols-3">
        {APPROACHES.map((a) => {
          const active = a.id === approach;
          return (
            <button
              key={a.id}
              onClick={() => pick(a.id)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                active
                  ? "border-[var(--dsa)] bg-[var(--dsa)]/10"
                  : "border-[var(--line)] bg-[var(--panel)] hover:border-[var(--line-strong)]"
              }`}
            >
              <span className="block text-sm font-medium">{a.name}</span>
              <span
                className={`font-mono text-sm ${active ? "text-[var(--dsa)]" : "text-[var(--muted)]"}`}
              >
                {a.big}
              </span>
            </button>
          );
        })}
      </div>

      {/* the visualiser */}
      <section className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <p className="text-sm text-[var(--muted)]">{meta.idea}</p>

        <LayoutGroup id={approach}>
          <div className="mt-6 grid grid-cols-8 gap-1.5 sm:gap-2">
            {frame.arr.map((value, pos) => {
              const origIdx = frame.orig[pos];
              const inAnswer = frame.found?.includes(origIdx) ?? false;
              const pointer = frame.pointers.find((p) => p.index === pos);
              const dim = frame.checked.includes(pos) && !inAnswer;
              return (
                <motion.div
                  key={origIdx}
                  layout
                  transition={{ type: "spring", stiffness: 260, damping: 26 }}
                  className="flex flex-col items-center"
                >
                  <motion.div
                    initial={false}
                    animate={{
                      opacity: dim ? 0.3 : 1,
                      scale: inAnswer ? 1.08 : pointer ? 1.04 : 1,
                      borderColor: inAnswer ? "#7EE0B5" : pointer ? "#FFB86B" : "#3A4453",
                      backgroundColor: inAnswer
                        ? "rgba(126,224,181,0.15)"
                        : pointer
                          ? "rgba(255,184,107,0.12)"
                          : "rgba(0,0,0,0)",
                    }}
                    className="flex aspect-square w-full items-center justify-center rounded-lg border-2 font-mono text-base sm:text-xl"
                  >
                    {value}
                  </motion.div>
                  <span className="mt-1 font-mono text-[10px] text-[var(--faint)]">[{origIdx}]</span>
                  <div className="h-6">
                    {pointer && (
                      <motion.span
                        layoutId={`ptr-${pointer.label}`}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        className="block font-mono text-sm font-semibold text-[var(--dsa)]"
                      >
                        ↑{pointer.label}
                      </motion.span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </LayoutGroup>

        {/* what is happening at this step */}
        <div className="mt-2 flex min-h-12 items-center justify-between gap-4 rounded-lg bg-black/25 px-4 py-3">
          <AnimatePresence mode="wait">
            <motion.p
              key={`${approach}-${step}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className={`font-mono text-sm ${frame.found ? "text-[#7EE0B5]" : "text-[var(--text)]"}`}
            >
              {frame.note}
            </motion.p>
          </AnimatePresence>
          <div className="shrink-0 text-right">
            <motion.p
              key={frame.ops}
              initial={{ scale: 1.25 }}
              animate={{ scale: 1 }}
              className="font-mono text-xl tabular-nums text-[var(--dsa)]"
            >
              {frame.ops}
            </motion.p>
            <p className="text-[10px] uppercase tracking-wider text-[var(--faint)]">checks</p>
          </div>
        </div>

        {/* hash map contents, only for the hash map approach */}
        <AnimatePresence>
          {approach === "hashMap" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <p className="mt-4 font-mono text-xs text-[var(--faint)]">hash map: value → index</p>
              <div className="mt-2 flex min-h-9 flex-wrap gap-2">
                <AnimatePresence>
                  {frame.map.map(([v, i]) => (
                    <motion.span
                      key={v}
                      initial={{ opacity: 0, scale: 0.6, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="rounded-md border border-[var(--line-strong)] px-2 py-1 font-mono text-sm"
                    >
                      {v} <span className="text-[var(--faint)]">→</span> {i}
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* player controls */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              if (last) setStep(0);
              setPlaying((p) => (last ? true : !p));
            }}
            className="w-24 rounded-md bg-[var(--dsa)] px-4 py-2 font-semibold text-[#0A0C10]"
          >
            {last ? "Replay" : playing ? "Pause" : "Play"}
          </button>
          <button
            onClick={() => {
              setPlaying(false);
              setStep((s) => Math.max(0, s - 1));
            }}
            disabled={step === 0}
            className="rounded-md border border-[var(--line-strong)] px-3 py-2 text-sm disabled:opacity-40"
          >
            ← Back
          </button>
          <button
            onClick={() => {
              setPlaying(false);
              setStep((s) => Math.min(frames.length - 1, s + 1));
            }}
            disabled={last}
            className="rounded-md border border-[var(--line-strong)] px-3 py-2 text-sm disabled:opacity-40"
          >
            Step →
          </button>
          <div className="ml-auto flex overflow-hidden rounded-md border border-[var(--line)]">
            {SPEEDS.map((s, i) => (
              <button
                key={s.label}
                onClick={() => setSpeed(i)}
                className={`px-2.5 py-1.5 font-mono text-xs ${
                  i === speed ? "bg-white/10 text-[var(--text)]" : "text-[var(--faint)]"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded bg-white/5">
          <motion.div
            className="h-full bg-[var(--dsa)]"
            animate={{ width: `${((step + 1) / frames.length) * 100}%` }}
          />
        </div>

        <p className="mt-4 text-sm text-[var(--muted)]">
          <span className="text-[var(--text)]">Trade-off:</span> {meta.tradeOff}{" "}
          <span className="font-mono text-xs text-[var(--faint)]">
            time {meta.big} · extra memory {meta.memory}
          </span>
        </p>
      </section>

      {/* small-n surprise */}
      <section className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <h2 className="font-semibold">Checks to find the answer in these 8 numbers</h2>
        <ul className="mt-4 space-y-2">
          {APPROACHES.map((a) => {
            const total = TRACES[a.id].at(-1)!.ops;
            const max = Math.max(...APPROACHES.map((x) => TRACES[x.id].at(-1)!.ops));
            return (
              <li key={a.id} className="grid grid-cols-[9rem_1fr_2.5rem] items-center gap-3 text-sm">
                <span className="truncate text-[var(--muted)]">{a.name}</span>
                <div className="h-3 rounded bg-white/5">
                  <motion.div
                    className="h-full rounded"
                    style={{ background: a.id === approach ? "#FFB86B" : "#5E6977" }}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(total / max) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", stiffness: 120, damping: 20 }}
                  />
                </div>
                <span className="text-right font-mono tabular-nums">{total}</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-sm text-[var(--muted)]">
          With 8 numbers, checking every pair is <em>not</em> slow, and sorting first actually costs
          more. Big-O ignores constants and small inputs. That is why you measure before you
          optimise.
        </p>
      </section>

      {/* growth */}
      <section className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-semibold">Now make the input bigger</h2>
          <p className="font-mono text-xs text-[var(--faint)]">log scale · 1 check = 1 ns</p>
        </div>
        <label className="mt-4 block">
          <span className="flex items-baseline justify-between text-sm">
            <span>Numbers in the array (n)</span>
            <span className="font-mono text-[var(--dsa)]">{n.toLocaleString("en-US")}</span>
          </span>
          <input
            type="range"
            min={0}
            max={SIZES.length - 1}
            step={1}
            value={sizeIdx}
            onChange={(e) => setSizeIdx(Number(e.target.value))}
            className="mt-2 w-full accent-[var(--dsa)]"
          />
        </label>
        <ul className="mt-5 space-y-3">
          {APPROACHES.map((a) => {
            const count = ops[a.id];
            return (
              <li key={a.id}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span>
                    {a.name} <span className="font-mono text-xs text-[var(--faint)]">{a.big}</span>
                  </span>
                  <span className="font-mono tabular-nums text-[var(--muted)]">
                    {compact(count)} checks ·{" "}
                    <span className="text-[var(--text)]">{duration(count)}</span>
                  </span>
                </div>
                <div className="mt-1.5 h-3 rounded bg-white/5">
                  <motion.div
                    className="h-full rounded"
                    style={{ background: a.id === "brute" ? "#F28FAD" : a.id === "hashMap" ? "#7EE0B5" : "#FFB86B" }}
                    initial={false}
                    animate={{ width: `${(Math.log10(count + 1) / maxLog) * 100}%` }}
                    transition={{ type: "spring", stiffness: 160, damping: 24 }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-sm text-[var(--muted)]">
          Same problem, same answer. At a million numbers the pair check takes minutes, the hash map
          about a millisecond. Knowing the pattern is what lets you pick.
        </p>
      </section>
    </div>
  );
}

function compact(x: number) {
  return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(x);
}

function duration(ops: number) {
  const s = ops / 1e9;
  if (s < 1e-6) return `${Math.round(s * 1e9)} ns`;
  if (s < 1e-3) return `${(s * 1e6).toFixed(1)} µs`;
  if (s < 1) return `${(s * 1e3).toFixed(1)} ms`;
  if (s < 120) return `${s.toFixed(1)} s`;
  if (s < 7200) return `${(s / 60).toFixed(1)} min`;
  return `${(s / 3600).toFixed(1)} h`;
}
