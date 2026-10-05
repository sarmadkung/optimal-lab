"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { FlowArrow, FlowSequence, FlowStep } from "@/components/flow/Flow";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionControlBar } from "@/components/session/SessionControlBar";
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

const COLORS = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)"];
const MAX_LOGIT = Math.max(...CANDIDATES.map((c) => c.logit));

const PRESETS = [
  { name: "Greedy", t: 0, k: 5, p: 1 },
  { name: "Focused", t: 0.5, k: 5, p: 1 },
  { name: "Default", t: 1, k: 5, p: 1 },
  { name: "Creative", t: 2, k: 5, p: 1 },
  { name: "T=2, top-k 3", t: 2, k: 3, p: 1 },
  { name: "T=2, top-p 0.8", t: 2, k: 5, p: 0.8 },
];

// the arrow under step i says what it passes down to step i + 1
const ARROWS = [
  "the text so far",
  "5 raw scores",
  "5 scaled scores",
  "5 probabilities",
  "the tokens that survive",
  "final odds",
  "1 token",
];

export default function NextTokenDemo() {
  const [t, setT] = useState(1);
  const [k, setK] = useState(5);
  const [p, setP] = useState(1);
  const [needle, setNeedle] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [stage, setStage] = useState<number | null>(null); // 0-based step being run
  const [counts, setCounts] = useState<number[]>(CANDIDATES.map(() => 0));
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => decode(CANDIDATES, t, k, p), [t, k, p]);
  const total = counts.reduce((a, b) => a + b, 0);
  const keptCount = rows.filter((r) => r.kept).length;

  // changing a setting changes the distribution, so old samples no longer apply
  const change = (fn: () => void) => {
    fn();
    setCounts(CANDIDATES.map(() => 0));
    setPicked(null);
    setNeedle(null);
  };

  // walk the flow top to bottom, one step at a time
  async function sampleOnce() {
    if (busy) return;
    setBusy(true);
    setPicked(null);
    setNeedle(null);
    for (let s = 0; s < 6; s++) {
      setStage(s);
      await wait(380);
    }
    setStage(6);
    const r = Math.random();
    const idx = sample(rows, r);
    setNeedle(r);
    await wait(750);
    setStage(7);
    setPicked(idx);
    setCounts((c) => c.map((n, i) => (i === idx ? n + 1 : n)));
    await wait(500);
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

  const on = (i: number) => stage === i;
  const arrow = (i: number) => <FlowArrow label={ARROWS[i]} active={stage === i + 1} />;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Engineering · interactive"
        title="How an LLM picks the next token"
        blurb="The model does not return an answer. It runs the same eight steps for every single token. Read them top to bottom, change the settings, then sample to watch one token travel through."
      />

      <SessionControlBar
        label={stage !== null ? `Walking step ${stage + 1} of 8` : "Change settings in the flow, then sample"}
        busy={busy}
        onRun={sampleOnce}
        runLabel="Sample next token"
        runningLabel="Running the steps…"
        accent="var(--ai)"
      >
        <button
          type="button"
          onClick={() => sampleMany(100)}
          disabled={busy}
          className="min-h-11 rounded-md border border-[var(--line-strong)] px-4 text-sm disabled:opacity-50"
        >
          Sample 100×
        </button>
      </SessionControlBar>

      <div className="mt-4 flex flex-wrap gap-2">
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

      <div className="mt-6">
        <FlowSequence accent="var(--ai)">
        {/* 1 */}
        <FlowStep n={1} title="Read the text so far" what="The prompt and everything written so far go in." active={on(0)}>
          <p className="font-mono text-xs text-[var(--faint)]">prompt</p>
          <p className="mt-1 text-[var(--muted)]">{PROMPT}</p>
          <p className="mt-3 font-mono text-xs text-[var(--faint)]">output so far</p>
          <p className="mt-1 text-lg">{CONTEXT} …</p>
        </FlowStep>
        {arrow(0)}

        {/* 2 */}
        <FlowStep
          n={2}
          title="Score every possible token"
          what="The model gives each token in its vocabulary a raw score, called a logit. Higher means a better fit."
          active={on(1)}
        >
          <Bars
            rows={CANDIDATES.map((c, i) => ({
              label: c.token,
              width: c.logit / MAX_LOGIT,
              value: c.logit.toFixed(1),
              color: COLORS[i],
            }))}
          />
          <p className="mt-3 text-xs text-[var(--faint)]">
            A real model scores ~100,000 tokens. We show the top 5, with illustrative numbers.
          </p>
        </FlowStep>
        {arrow(1)}

        {/* 3 */}
        <FlowStep
          n={3}
          title="Divide by temperature"
          what="Every score is divided by T. Below 1 the gaps grow, above 1 they shrink."
          active={on(2)}
        >
          <Slider
            label="Temperature (T)"
            hint={t === 0 ? "0 = greedy: always take the top token" : t < 1 ? "sharper: the leader pulls ahead" : t > 1 ? "flatter: others get a real chance" : "1 = scores unchanged"}
            value={t}
            min={0}
            max={2}
            step={0.05}
            format={(v) => v.toFixed(2)}
            onChange={(v) => change(() => setT(v))}
          />
          <ul className="mt-4 grid gap-1 font-mono text-sm sm:grid-cols-2">
            {CANDIDATES.map((c, i) => (
              <li key={c.token} className="flex flex-wrap justify-between gap-x-3 gap-y-1 rounded bg-[var(--inset)] px-2 py-1">
                <span style={{ color: COLORS[i] }}>{c.token}</span>
                <span className="text-[var(--muted)] tabular-nums">
                  {c.logit.toFixed(1)} ÷ {t.toFixed(2)} ={" "}
                  <span className="text-[var(--text)]">{t === 0 ? (i === 0 ? "top" : "—") : (c.logit / t).toFixed(2)}</span>
                </span>
              </li>
            ))}
          </ul>
        </FlowStep>
        {arrow(2)}

        {/* 4 */}
        <FlowStep
          n={4}
          title="Softmax: turn scores into chances"
          what="Scores can be any number. Softmax maps them to probabilities that add up to 100%."
          active={on(3)}
        >
          <Bars rows={rows.map((r, i) => ({ label: r.token, width: r.tempered, value: pct(r.tempered), color: COLORS[i] }))} />
          <p className="mt-3 text-xs text-[var(--faint)]">
            <code className="font-mono">P = exp(score) / Σ exp(score)</code>
          </p>
        </FlowStep>
        {arrow(3)}

        {/* 5 */}
        <FlowStep
          n={5}
          title="Cut the long tail"
          what="Top-K keeps only the K most likely tokens. Top-P keeps the smallest set that covers P of the chance."
          active={on(4)}
        >
          <div className="grid gap-5 sm:grid-cols-2">
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
          </div>
          <ul className="mt-4 flex flex-wrap gap-2">
            {rows.map((r, i) => (
              <motion.li
                key={r.token}
                layout
                className={`rounded-md border px-2.5 py-1 text-sm ${r.kept ? "border-[var(--line-strong)]" : "border-dashed border-[var(--line)] text-[var(--faint)] line-through"}`}
                style={r.kept ? { color: COLORS[i] } : undefined}
              >
                {r.token}
                {r.cutBy && (
                  <span className="ml-1.5 font-mono text-[10px] uppercase no-underline">
                    {r.cutBy === "greedy" ? "greedy" : r.cutBy}
                  </span>
                )}
              </motion.li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-[var(--faint)]">
            {keptCount} of {rows.length} tokens survive.
          </p>
        </FlowStep>
        {arrow(4)}

        {/* 6 */}
        <FlowStep
          n={6}
          title="Scale back up to 100%"
          what="The survivors share the chance that was cut, so their odds add up to 100% again."
          active={on(5)}
        >
          <Bars
            rows={rows.map((r, i) => ({
              label: r.token,
              width: r.final,
              ghost: r.tempered,
              value: r.kept ? pct(r.final) : "cut",
              color: COLORS[i],
              dim: !r.kept,
            }))}
          />
          <p className="mt-3 text-xs text-[var(--faint)]">Faint bar = chance before the cut.</p>
        </FlowStep>
        {arrow(5)}

        {/* 7 */}
        <FlowStep
          n={7}
          title="Roll the weighted die"
          what="Drop a random point on this strip. A wider slice is more likely to be hit."
          active={on(6)}
        >
          <div className="relative h-10">
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
                  className="absolute -top-2 -bottom-2 w-0.5 bg-[var(--text)] shadow-[0_0_12px_var(--text)]"
                  initial={{ left: "0%", opacity: 0 }}
                  animate={{ left: `${needle * 100}%`, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 90, damping: 14 }}
                />
              )}
            </AnimatePresence>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={sampleOnce}
              disabled={busy}
              className="rounded-md bg-[var(--ai)] px-4 py-2 font-semibold text-[var(--on-accent)] transition-opacity disabled:opacity-50"
            >
              {busy ? "Running the steps…" : "Sample next token"}
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
        </FlowStep>
        {arrow(6)}

        {/* 8 */}
        <FlowStep
          n={8}
          title="Add it to the text, then repeat"
          what="The picked token is appended, and the whole loop runs again from step 1 for the next token."
          active={on(7)}
        >
          <p className="flex flex-wrap items-baseline gap-x-2 text-xl sm:text-2xl">
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
                  style={{ color: "var(--on-accent)", background: COLORS[picked] }}
                >
                  {CANDIDATES[picked].token}
                </motion.span>
              )}
            </AnimatePresence>
          </p>

          <AnimatePresence>
            {total > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <p className="mt-4 text-sm text-[var(--muted)]">
                  Same prompt, {total} {total === 1 ? "run" : "runs"}:
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

          <p className="mt-4 font-mono text-xs text-[var(--faint)]">↺ back to step 1 with the new text</p>
        </FlowStep>
        </FlowSequence>
      </div>

      <p className="mt-8 text-sm leading-relaxed text-[var(--muted)]">
        That is why the same prompt can give different answers: steps 1 to 6 are fixed maths, but
        step 7 is a dice roll. Temperature 0 removes the roll and always takes the top token.
      </p>
      <p className="mt-3 text-sm text-[var(--muted)]">
        Next in this track:{" "}
        <Link href="/tracks/ai/embeddings" className="font-medium text-[var(--accent)] hover:underline">
          Embeddings and similarity search →
        </Link>
      </p>
    </SessionPage>
  );
}

function Bars({
  rows,
}: {
  rows: { label: string; width: number; value: string; color: string; ghost?: number; dim?: boolean }[];
}) {
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <motion.li
          key={r.label}
          initial={false}
          animate={{ opacity: r.dim ? 0.4 : 1 }}
          className="grid grid-cols-[minmax(0,5.25rem)_minmax(0,1fr)_3.25rem] items-center gap-2 sm:grid-cols-[6.5rem_minmax(0,1fr)_4.5rem] sm:gap-3"
        >
          <span className={`truncate text-sm ${r.dim ? "line-through" : ""}`}>{r.label}</span>
          <div className="relative h-5 overflow-hidden rounded bg-[var(--track)]">
            {r.ghost !== undefined && (
              <motion.div
                className="absolute inset-y-0 left-0 bg-[var(--ghost)]"
                initial={false}
                animate={{ width: `${r.ghost * 100}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 28 }}
              />
            )}
            <motion.div
              className="absolute inset-y-1 left-0 rounded-sm"
              style={{ background: r.color }}
              initial={false}
              animate={{ width: `${r.width * 100}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 28 }}
            />
          </div>
          <span className="text-right font-mono text-sm tabular-nums">{r.value}</span>
        </motion.li>
      ))}
    </ul>
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
        <span className="font-mono text-sm tabular-nums text-[var(--ai)]">{props.format(props.value)}</span>
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

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
