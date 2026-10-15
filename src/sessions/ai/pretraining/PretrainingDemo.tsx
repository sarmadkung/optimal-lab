"use client";

import Link from "next/link";
import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, PlaybackControls, usePlayback } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type NodeState, type Packet } from "@/components/system/SystemMap";
import { BATCH, CLEAN, INITIAL_LOSS, LR, RAW, RUNS, SAMPLE_START, SPLIT, V, sci, tokenize, train, type RunId } from "@/lib/pretraining";

const ACCENT = "var(--ai)";
const FRAMES = train();
const LAST = FRAMES.at(-1)!;
const DROPPED = RAW.length - CLEAN.length;
const DUPES = RAW.filter((l) => l.why === "exact duplicate").length;
const show = (w: string) => (w === "<s>" ? "start" : w === "</s>" ? "end" : w);

export default function PretrainingDemo() {
  const playback = usePlayback(FRAMES.length, 1700);
  const [run, setRun] = useState<RunId>("llama3-8b");
  const f = FRAMES[playback.i];
  const started = f.step > 0;
  const real = RUNS.find((r) => r.id === run)!;
  const toyFlops = 6 * V * V * LAST.tokens;
  const realFlops = 6 * real.params * real.tokens;

  const lit = (on: boolean): NodeState => (on ? "active" : "idle");
  const packets: Packet[] = started
    ? [
        ...hops(`batch-${f.step}`, ["crawl", "clean", "tok", "model"], { label: `${BATCH} lines`, step: 0.35 }),
        ...hops(`guess-${f.step}`, ["model", "loss"], { label: "guesses", start: 1.05, step: 0.35 }),
        ...hops(`held-${f.step}`, ["held", "loss"], { label: "check", start: 1.05, step: 0.35 }),
        ...hops(`grad-${f.step}`, ["loss", "model"], { label: "gradient", start: 1.45, step: 0.35, tone: "good" }),
      ]
    : [];

  const caption = !started
    ? `Before training: every weight is 0, so all ${V} words are equally likely next. Loss is ln(${V}) = ${INITIAL_LOSS.toFixed(2)}. Press Play.`
    : playback.atEnd
      ? `One pass over the data: ${f.read} sentences, ${f.tokens.toLocaleString()} tokens. Held-out loss fell from ${INITIAL_LOSS.toFixed(2)} to ${f.heldLoss.toFixed(2)}. “sat” is now followed by “on” ${pct(f.probes[1].top[0].p)} of the time.`
      : `Step ${f.step}: ${BATCH} more sentences. The model guessed every next word (batch loss ${f.trainLoss.toFixed(2)}), then every weight moved a little. Held-out loss: ${f.heldLoss.toFixed(2)}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Engineering · interactive"
        title="Pretraining"
        blurb="Pretraining is one task repeated trillions of times: guess the next token, see how wrong the guess was, nudge the weights. Nobody labels anything; the text is its own answer key. Watch a tiny model learn which word follows which, one batch at a time."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-4">
              <SystemMap
                title="The pretraining loop: web text, cleaning, tokenizer, model, loss and gradient"
                accent={ACCENT}
                chrome="split"
                nodes={[
                  { id: "crawl", label: "Web text", sub: `${RAW.length} lines`, at: [14, 24], mobileAt: [24, 12], state: lit(started) },
                  { id: "clean", label: "Clean + dedupe", sub: `${CLEAN.length} kept`, at: [50, 24], mobileAt: [76, 12], state: lit(started) },
                  { id: "tok", label: "Tokenizer", sub: `${V} tokens`, at: [86, 24], mobileAt: [76, 42], state: lit(started) },
                  { id: "model", label: "Model", sub: started ? `step ${f.step}` : "weights = 0", at: [86, 76], mobileAt: [76, 74], state: started ? "active" : "idle" },
                  { id: "loss", label: "Loss", sub: f.heldLoss.toFixed(2), at: [50, 76], mobileAt: [24, 74], state: started ? (f.heldLoss < 2 ? "good" : "active") : "idle" },
                  { id: "held", label: "Held-out text", sub: `${SPLIT.held} lines`, at: [14, 76], mobileAt: [24, 42], state: lit(started) },
                ]}
                links={[
                  { from: "crawl", to: "clean", label: "raw text" },
                  { from: "clean", to: "tok", label: "clean text" },
                  { from: "tok", to: "model", label: "token ids" },
                  { from: "model", to: "loss", label: "guesses" },
                  { from: "held", to: "loss", label: "never trained on" },
                ]}
                packets={packets}
                aspect={2.2}
                mobileAspect={1.05}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Loss over training and what the model predicts">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                  <LossChart at={playback.i} />
                  <ul className="space-y-2" aria-label="Most likely next word">
                    {f.probes.map((p) => (
                      <li key={p.word} className="grid grid-cols-[4.5rem_minmax(0,1fr)_4.5rem] items-center gap-2 text-sm">
                        <span className="truncate font-mono text-[var(--muted)]">{p.word} →</span>
                        <span className="h-2 rounded bg-[var(--track)]">
                          <span className="block h-full rounded transition-[width] duration-500" style={{ width: `${p.top[0].p * 100}%`, background: ACCENT }} />
                        </span>
                        <span className="truncate text-right font-mono text-xs tabular-nums">
                          {started ? `${show(p.top[0].word)} ${pct(p.top[0].p)}` : "any 3%"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <PlaybackControls playback={playback} accent={ACCENT} nextLabel="Next batch" status={`Step ${f.step} of ${FRAMES.length - 1}`} />
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Collect text and clean it" what="Crawl the web, then throw away spam, boilerplate and duplicates. Repeated text gets memorized instead of learned from, so deduplication matters." accent={ACCENT} active={!started}>
                <p className="font-mono text-sm">
                  {RAW.length} lines → {CLEAN.length} kept ({DUPES} duplicates, {DROPPED - DUPES} junk)
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  {RAW.slice(0, 7).map((l, i) => (
                    <li key={i} className={l.keep ? "" : "text-[var(--faint)] line-through"}>
                      {l.text}
                      {!l.keep && <span className="ml-2 font-mono text-xs">({l.why})</span>}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-[var(--faint)]">
                  {SPLIT.held} clean lines are held out: the model never trains on them, so their loss shows what it really learned.
                </p>
              </FlowStep>
              <FlowArrow label={`${SPLIT.train} sentences, ${BATCH} at a time`} accent={ACCENT} active={started} />

              <FlowStep n={2} title="Turn a batch into token ids" what="Each sentence becomes ids, with a marker for where a document starts and ends. Real runs pack thousands of tokens per sequence and millions per batch." accent={ACCENT} active={started && !playback.atEnd}>
                {started ? (
                  <>
                    <p className="text-sm">{f.batch[0]}</p>
                    <p className="mt-1 break-words font-mono text-xs text-[var(--muted)]">[{tokenize(f.batch[0]).join(", ")}]</p>
                    <p className="mt-2 text-xs text-[var(--faint)]">
                      + {BATCH - 1} more sentences this step · {f.tokens.toLocaleString()} tokens read so far
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-[var(--muted)]">Press Play to send the first batch.</p>
                )}
              </FlowStep>
              <FlowArrow label="token ids" accent={ACCENT} active={started && !playback.atEnd} />

              <FlowStep n={3} title="Guess every next token" what="At every position the model gives a probability to each word in the vocabulary. The word that actually came next is the answer key: no labels needed." accent={ACCENT} active={started && !playback.atEnd}>
                <ul className="space-y-1">
                  {f.scored.map((s, i) => (
                    <li key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,4rem)_3rem] items-center gap-2 font-mono text-xs">
                      <span className="truncate text-[var(--muted)]">
                        {show(s.word)} → <span className="text-[var(--text)]">{show(s.next)}</span>
                      </span>
                      <span className="h-1.5 rounded bg-[var(--track)]">
                        <span className="block h-full rounded" style={{ width: `${s.p * 100}%`, background: s.p > 0.3 ? "var(--good)" : ACCENT }} />
                      </span>
                      <span className="text-right tabular-nums">{pct(s.p)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-[var(--faint)]">Probability the model gave the real next word, before this step’s update.</p>
              </FlowStep>
              <FlowArrow label="how wrong each guess was" accent={ACCENT} active={started && !playback.atEnd} />

              <FlowStep n={4} title="Measure the loss, nudge every weight" what="Loss is the average of −log(probability of the right word): 0 if always certain and right, large if surprised. The gradient says which way each weight should move to lower it." accent={ACCENT} active={started && !playback.atEnd}>
                <dl className="grid grid-cols-3 gap-2">
                  {[
                    ["Batch loss", started ? f.trainLoss.toFixed(2) : "—"],
                    ["Held-out loss", f.heldLoss.toFixed(2)],
                    ["Learning rate", String(LR)],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-lg bg-[var(--inset)] p-2">
                      <dt className="text-xs text-[var(--faint)]">{k}</dt>
                      <dd className="font-mono text-sm">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-xs text-[var(--faint)]">
                  The same predict, measure, step loop as{" "}
                  <Link href="/tracks/ai/training-loss" className="text-[var(--accent)] hover:underline">
                    Training: loss and gradient descent
                  </Link>
                  , with {V * V} weights here and billions in an LLM. Then the next batch arrives.
                </p>
              </FlowStep>
              <FlowArrow label="repeat for every batch" accent={ACCENT} active={playback.atEnd} />

              <FlowStep n={5} title="What comes out: a text completer" what="After pretraining the model continues text well. It is not an assistant yet: ask it a question and it may just write more questions." accent={ACCENT} active={playback.atEnd}>
                <p className="font-mono text-sm">
                  “{SAMPLE_START}” → <span style={{ color: ACCENT }}>{f.sample}</span>
                </p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {started
                    ? "Each word fits the one before it, but “sat on the sun” shows this model only looks one word back. A transformer reads the whole context, which is why it can stay on topic for pages."
                    : "With zero weights the model has no preference, so it stops straight away."}
                </p>
                <div className="mt-4">
                  <Choices accent={ACCENT} value={run} onChange={setRun} options={RUNS.map((r) => ({ id: r.id, label: r.name }))} />
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    ["Parameters", short(real.params)],
                    ["Training tokens", short(real.tokens)],
                    ["Compute (6·N·D)", `${sci(realFlops)} FLOPs`],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-lg bg-[var(--inset)] p-2">
                      <dt className="text-xs text-[var(--faint)]">{k}</dt>
                      <dd className="break-words font-mono text-sm">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  This demo used about {sci(toyFlops)} FLOPs, so {real.name} took roughly 10^{Math.round(Math.log10(realFlops / toyFlops))} times more. Next:{" "}
                  <Link href="/tracks/ai/instruction-tuning" className="text-[var(--accent)] hover:underline">
                    turning a text completer into an assistant
                  </Link>
                  .
                </p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const short = (n: number) => (n >= 1e12 ? `${n / 1e12}T` : `${n / 1e9}B`);

// Batch loss and held-out loss per step, drawn up to the current frame.
function LossChart({ at }: { at: number }) {
  const n = FRAMES.length - 1;
  const X = (i: number) => 8 + (i / n) * 184;
  const Y = (l: number) => 8 + ((INITIAL_LOSS - l) / (INITIAL_LOSS - 1)) * 64; // loss 1 at the bottom
  const path = (pick: (i: number) => number, from: number) =>
    FRAMES.slice(from, at + 1)
      .map((_, k) => `${k ? "L" : "M"}${X(from + k).toFixed(1)} ${Y(pick(from + k)).toFixed(1)}`)
      .join(" ");
  return (
    <figure className="min-w-0">
      <svg viewBox="0 0 200 84" className="w-full" role="img" aria-label={`Loss falls from ${INITIAL_LOSS.toFixed(2)} to ${FRAMES[at].heldLoss.toFixed(2)}`}>
        <line x1="8" x2="192" y1={Y(INITIAL_LOSS)} y2={Y(INITIAL_LOSS)} stroke="var(--line)" strokeDasharray="3 3" />
        <line x1="8" x2="192" y1={Y(1)} y2={Y(1)} stroke="var(--line)" />
        <text x="192" y={Y(INITIAL_LOSS) - 2} fontSize="7" textAnchor="end" fill="var(--faint)">
          random guessing {INITIAL_LOSS.toFixed(2)}
        </text>
        {at > 1 && <path d={path((i) => FRAMES[i].trainLoss, 1)} fill="none" stroke="var(--ghost)" strokeWidth="1.5" />}
        <path d={path((i) => FRAMES[i].heldLoss, 0)} fill="none" stroke={ACCENT} strokeWidth="2.2" />
        <circle cx={X(at)} cy={Y(FRAMES[at].heldLoss)} r="2.8" fill={ACCENT} />
        <text x="8" y="82" fontSize="7" fill="var(--faint)">step 0</text>
        <text x="192" y="82" fontSize="7" textAnchor="end" fill="var(--faint)">step {n}</text>
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-3 text-xs text-[var(--muted)]">
        <span style={{ color: ACCENT }}>— held-out loss</span>
        <span>— batch loss</span>
      </figcaption>
    </figure>
  );
}
