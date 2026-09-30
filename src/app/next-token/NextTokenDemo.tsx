"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { decode, pct, sample, type Candidate } from "@/lib/sampling";

const PROMPT = "What is the capital of Pakistan?";
const CONTEXT = "The capital of Pakistan is";

const CANDIDATES: Candidate[] = [
  { token: "Islamabad", logit: 5.0 },
  { token: "Lahore", logit: 3.0 },
  { token: "Karachi", logit: 2.5 },
  { token: "Peshawar", logit: 1.5 },
  { token: "Multan", logit: 0.5 },
];

const COLORS = ["#8AA4FF", "#FFB86B", "#7EE0B5", "#F28FAD", "#C9A8FF"];

const PRESETS = [
  { name: "Greedy", t: 0, k: 5, p: 1 },
  { name: "Focused", t: 0.5, k: 5, p: 1 },
  { name: "Default", t: 1, k: 5, p: 1 },
  { name: "Creative", t: 2, k: 5, p: 1 },
  { name: "T=2, top-k 3", t: 2, k: 3, p: 1 },
  { name: "T=2, top-p 0.8", t: 2, k: 5, p: 0.8 },
];

const STAGES = ["Logits", "÷ T", "Softmax", "Top-K", "Top-P", "Renormalise", "Sample"];

export default function NextTokenDemo() {
  const [t, setT] = useState(1);
  const [k, setK] = useState(5);
  const [p, setP] = useState(1);
  const [needle, setNeedle] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [stage, setStage] = useState<number | null>(null);
  const [counts, setCounts] = useState<number[]>(CANDIDATES.map(() => 0));
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => decode(CANDIDATES, t, k, p), [t, k, p]);
  const total = counts.reduce((a, b) => a + b, 0);

  // changing a setting changes the distribution, so old samples no longer apply
  const change = (fn: () => void) => {
    fn();
    setCounts(CANDIDATES.map(() => 0));
    setPicked(null);
    setNeedle(null);
  };

  async function sampleOnce() {
    if (busy) return;
    setBusy(true);
    setPicked(null);
    setNeedle(null);
    for (let s = 0; s < STAGES.length; s++) {
      setStage(s);
      await wait(170);
    }
    const r = Math.random();
    const idx = sample(rows, r);
    setNeedle(r);
    await wait(650);
    setPicked(idx);
    setCounts((c) => c.map((n, i) => (i === idx ? n + 1 : n)));
    setStage(null);
    setBusy(false);
  }

  function sampleMany(n: number) {
    const add = CANDIDATES.map(() => 0);
    for (let i = 0; i < n; i++) add[sample(rows, Math.random())]++;
    setCounts((c) => c.map((v, i) => v + add[i]));
    setPicked(null);
    setNeedle(null);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--ai)]">
        AI Engineering · interactive
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        How an LLM picks the next token
      </h1>
      <p className="mt-3 text-[var(--muted)]">
        The model does not return an answer. It scores every possible next token, turns the scores
        into probabilities, trims the list, then rolls a weighted die. Change the settings and watch
        the odds move.
      </p>

      {/* the sentence being generated */}
      <section className="mt-8 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <p className="font-mono text-xs text-[var(--faint)]">prompt</p>
        <p className="mt-1 text-[var(--muted)]">{PROMPT}</p>
        <p className="mt-4 font-mono text-xs text-[var(--faint)]">model output so far</p>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-xl sm:text-2xl">
          <span>{CONTEXT}</span>
          <AnimatePresence mode="wait">
            {picked === null ? (
              <motion.span
                key="blank"
                className="inline-block h-7 w-24 rounded-md border border-dashed border-[var(--line-strong)] align-middle"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.4, repeat: Infinity }}
              />
            ) : (
              <motion.span
                key={`pick-${picked}-${total}`}
                initial={{ opacity: 0, y: 12, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ type: "spring", stiffness: 420, damping: 26 }}
                className="rounded-md px-2 font-semibold"
                style={{ color: "#0A0C10", background: COLORS[picked] }}
              >
                {CANDIDATES[picked].token}
              </motion.span>
            )}
          </AnimatePresence>
        </p>
      </section>

      {/* pipeline strip */}
      <ol className="mt-6 flex flex-wrap gap-1.5 font-mono text-[11px] sm:text-xs">
        {STAGES.map((name, i) => (
          <motion.li
            key={name}
            className="rounded-full border px-2.5 py-1"
            animate={{
              borderColor: stage === i ? "#8AA4FF" : "#1F2530",
              color: stage !== null && i <= stage ? "#E6EAF2" : "#5E6977",
              backgroundColor: stage === i ? "rgba(138,164,255,0.15)" : "rgba(0,0,0,0)",
            }}
            transition={{ duration: 0.15 }}
          >
            {name}
          </motion.li>
        ))}
      </ol>

      {/* controls */}
      <section className="mt-6 grid gap-5 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:grid-cols-3">
        <Slider
          label="Temperature"
          hint={t === 0 ? "0 = greedy, always the top token" : t < 1 ? "sharper" : t > 1 ? "flatter" : "unchanged"}
          value={t}
          min={0}
          max={2}
          step={0.05}
          format={(v) => v.toFixed(2)}
          onChange={(v) => change(() => setT(v))}
        />
        <Slider
          label="Top-K"
          hint={`keep the ${k} most likely`}
          value={k}
          min={1}
          max={5}
          step={1}
          format={(v) => String(v)}
          onChange={(v) => change(() => setK(v))}
        />
        <Slider
          label="Top-P"
          hint={p >= 1 ? "off" : `keep until ${Math.round(p * 100)}% is covered`}
          value={p}
          min={0.05}
          max={1}
          step={0.05}
          format={(v) => v.toFixed(2)}
          onChange={(v) => change(() => setP(v))}
        />
        <div className="flex flex-wrap gap-2 sm:col-span-3">
          {PRESETS.map((pr) => {
            const active = pr.t === t && pr.k === k && pr.p === p;
            return (
              <button
                key={pr.name}
                onClick={() =>
                  change(() => {
                    setT(pr.t);
                    setK(pr.k);
                    setP(pr.p);
                  })
                }
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "border-[var(--ai)] bg-[var(--ai)]/15 text-[var(--text)]"
                    : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--line-strong)]"
                }`}
              >
                {pr.name}
              </button>
            );
          })}
        </div>
      </section>

      {/* the distribution */}
      <section className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-semibold">Candidates for the next token</h2>
          <p className="font-mono text-xs text-[var(--faint)]">illustrative numbers</p>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
          <Legend swatch="bg-white/15" text="after temperature" />
          <Legend swatch="bg-[var(--ai)]" text="final chance (after trimming)" />
        </div>

        <ul className="mt-4 space-y-3">
          {rows.map((row, i) => (
            <motion.li
              key={row.token}
              initial={false}
                  animate={{ opacity: row.kept ? 1 : 0.4 }}
              className="grid grid-cols-[5.5rem_1fr_4.5rem] items-center gap-3 sm:grid-cols-[7rem_3rem_1fr_4.5rem]"
            >
              <span className={`truncate ${row.kept ? "" : "line-through"}`}>{row.token}</span>
              <span className="hidden font-mono text-xs text-[var(--faint)] sm:block">
                {row.logit.toFixed(1)}
              </span>
              <div className="relative h-6 overflow-hidden rounded bg-white/[0.04]">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-white/15"
                  initial={false}
                  animate={{ width: `${row.tempered * 100}%` }}
                  transition={{ type: "spring", stiffness: 200, damping: 28 }}
                />
                <motion.div
                  className="absolute inset-y-1 left-0 rounded-sm"
                  style={{ background: COLORS[i] }}
                  initial={false}
                  animate={{ width: `${row.final * 100}%` }}
                  transition={{ type: "spring", stiffness: 200, damping: 28 }}
                />
                <AnimatePresence>
                  {row.cutBy && (
                    <motion.span
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase text-[var(--muted)]"
                    >
                      {row.cutBy === "greedy" ? "greedy: top only" : `cut by ${row.cutBy}`}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <span className="text-right font-mono text-sm tabular-nums">
                {row.kept ? pct(row.final) : "—"}
              </span>
            </motion.li>
          ))}
        </ul>

        {/* the weighted die: one strip, each token gets width = its final chance */}
        <div className="mt-6">
          <p className="text-sm text-[var(--muted)]">
            Sampling = drop a random point on this strip. Wider slice, more likely.
          </p>
          <div className="relative mt-3 h-10">
            <div className="flex h-full overflow-hidden rounded-md">
              {rows.map((row, i) => (
                <motion.div
                  key={row.token}
                  className="h-full"
                  style={{ background: COLORS[i] }}
                  initial={false}
                  animate={{
                    width: `${row.final * 100}%`,
                    opacity: picked === null || picked === i ? 1 : 0.3,
                  }}
                  transition={{ type: "spring", stiffness: 200, damping: 28 }}
                />
              ))}
            </div>
            <AnimatePresence>
              {needle !== null && (
                <motion.div
                  className="absolute -top-2 -bottom-2 w-0.5 bg-white shadow-[0_0_12px_white]"
                  initial={{ left: "0%", opacity: 0 }}
                  animate={{ left: `${needle * 100}%`, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 90, damping: 14 }}
                />
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={sampleOnce}
            disabled={busy}
            className="rounded-md bg-[var(--ai)] px-4 py-2 font-semibold text-[#0A0C10] transition-opacity disabled:opacity-50"
          >
            {busy ? "Sampling…" : "Sample next token"}
          </button>
          <button
            onClick={() => sampleMany(100)}
            disabled={busy}
            className="rounded-md border border-[var(--line-strong)] px-4 py-2 text-sm disabled:opacity-50"
          >
            Sample 100×
          </button>
          {total > 0 && (
            <button
              onClick={() => change(() => {})}
              className="rounded-md px-3 py-2 text-sm text-[var(--muted)] hover:text-[var(--text)]"
            >
              Reset
            </button>
          )}
        </div>

        {/* what actually came out */}
        <AnimatePresence>
          {total > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <p className="mt-6 text-sm text-[var(--muted)]">
                What came out after {total} {total === 1 ? "run" : "runs"} with the same prompt:
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {counts.map((n, i) =>
                  n === 0 ? null : (
                    <motion.li
                      layout
                      key={CANDIDATES[i].token}
                      className="rounded-md border border-[var(--line)] px-2.5 py-1 font-mono text-sm"
                    >
                      <span style={{ color: COLORS[i] }}>{CANDIDATES[i].token}</span>{" "}
                      <span className="text-[var(--muted)]">×{n}</span>
                    </motion.li>
                  ),
                )}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <section className="mt-6 space-y-3 text-sm leading-relaxed text-[var(--muted)]">
        <p>
          <span className="text-[var(--text)]">Logits</span> are raw scores. They can be any number,
          so softmax turns them into chances that add up to 100%:{" "}
          <code className="font-mono text-[var(--text)]">P = exp(logit / T) / Σ exp(logit / T)</code>.
        </p>
        <p>
          <span className="text-[var(--text)]">Temperature</span> divides the scores before softmax.
          Below 1 the gaps grow, so the top token wins more often. Above 1 the gaps shrink, so
          Lahore and Karachi get real chances.
        </p>
        <p>
          <span className="text-[var(--text)]">Top-K and Top-P</span> cut the long tail. What is left
          is scaled back up to 100%, because the die has to land somewhere.
        </p>
        <p>
          The picked token is added to the text, and the whole loop runs again for the next token.
        </p>
      </section>
    </div>
  );
}

function Slider(props: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{props.label}</span>
        <span className="font-mono text-sm tabular-nums text-[var(--ai)]">
          {props.format(props.value)}
        </span>
      </span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
        className="mt-2 w-full accent-[var(--ai)]"
      />
      <span className="mt-1 block text-xs text-[var(--faint)]">{props.hint}</span>
    </label>
  );
}

function Legend({ swatch, text }: { swatch: string; text: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-2.5 rounded-sm ${swatch}`} />
      {text}
    </span>
  );
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
