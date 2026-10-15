"use client";

import Link from "next/link";
import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, Slider, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMapPanel } from "@/components/system/SystemMap";
import { QUESTIONS, THRESHOLDS, answerAll, expected, fromTraining, score, type Grading, type Result } from "@/lib/hallucinations";

const ACCENT = "var(--ai)";
const LOOK: Record<Result, { color: string; label: string }> = {
  right: { color: "var(--good)", label: "right" },
  wrong: { color: "var(--bad)", label: "made up" },
  abstain: { color: "var(--muted)", label: "abstained" },
};

export default function HallucinationsDemo() {
  const [picked, setPicked] = useState("birthday");
  const [rag, setRag] = useState(false);
  const [tIdx, setTIdx] = useState(0);
  const [grading, setGrading] = useState<Grading>("accuracy");
  const { stage, busy, run } = useWalk(5, 1100);
  const on = (s: number) => stage === s;

  const threshold = THRESHOLDS[tIdx];
  const results = answerAll(rag, threshold);
  const r = results.find((x) => x.q.id === picked)!;
  const s = score(results, grading);
  const exp = expected(results, grading);
  // What the same settings would score without abstaining, for comparison.
  const guessing = answerAll(rag, 0);
  const expGuess = expected(guessing, grading);

  const caption =
    stage === null
      ? `${s.right} right, ${s.wrong} made up, ${s.abstain} “not sure”. ${
          r.result === "wrong"
            ? `“${r.q.short}”: the fact appeared ${r.q.seen === 0 ? "nowhere" : `only ${r.q.seen === 1 ? "once" : `${r.q.seen} times`}`} in training, so the model guessed “${r.said}”, just as fluently.`
            : r.result === "abstain"
              ? `“${r.q.short}”: top answer only ${pct(r.confidence)} likely, below the ${pct(threshold)} threshold, so it says it isn't sure.`
              : `“${r.q.short}”: ${pct(r.options[0].p)} likely right${rag && r.q.inDocs ? ", because retrieval put the answer in the prompt" : ""}.`
        } Click any card.`
      : [
          `The question: “${r.q.q}”`,
          `The model spreads probability over answers. The right one gets ${pct(r.options[0].p)}.`,
          `Decoding picks one: “${r.sampled.text}”. It reads the same whether the model was ${pct(r.confidence)} or 99% sure.`,
          rag ? (r.q.inDocs ? "Retrieval found the answer in your docs and put it in the prompt." : "Retrieval is on, but this fact isn't in your docs, so nothing changes.") : "Retrieval is off: the model only has what it memorized.",
          r.result === "abstain" ? `Below the threshold: it says “I'm not sure.”` : `Above the threshold (${pct(threshold)}): it answers “${r.said}”.`,
        ][stage];

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Engineering · interactive"
        title="Why models hallucinate"
        blurb="A model is always asked for the next token, and it always gives one. When a fact was rare in its training data, the probabilities are spread thin, but the answer still comes out fluent and sure. Try the fixes: give it a source, let it say “I'm not sure”, and change how answers are graded."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5" aria-label="Twelve questions and how the model answered">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">12 questions · {rag ? "with retrieval" : "memory only"}</p>
                <p className="font-mono text-xs text-[var(--muted)]">abstain below {pct(threshold)}</p>
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {results.map((x) => {
                  const look = LOOK[x.result];
                  const sel = x.q.id === picked;
                  return (
                    <li key={x.q.id} className="min-w-0">
                      <button
                        type="button"
                        onClick={() => setPicked(x.q.id)}
                        aria-pressed={sel}
                        className="h-full min-h-11 w-full rounded-lg border px-2 py-1.5 text-left transition-colors duration-300"
                        style={{
                          borderColor: sel ? ACCENT : look.color,
                          background: `color-mix(in srgb, ${look.color} ${x.result === "abstain" ? 6 : 12}%, transparent)`,
                          boxShadow: sel ? `0 0 0 2px color-mix(in srgb, ${ACCENT} 30%, transparent)` : undefined,
                        }}
                      >
                        <span className="block truncate text-xs text-[var(--muted)]">{x.q.short}</span>
                        <span className="block truncate text-sm font-semibold">{x.said}</span>
                        <span className="mt-0.5 flex justify-between gap-1 font-mono text-[10px] text-[var(--faint)]">
                          <span>seen {x.q.seen.toLocaleString()}×</span>
                          <span style={{ color: look.color }}>{look.label}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <dl className="mt-4 grid grid-cols-3 gap-2">
                {(["right", "wrong", "abstain"] as Result[]).map((k) => (
                  <div key={k} className="rounded-lg bg-[var(--inset)] p-2">
                    <dt className="text-xs" style={{ color: LOOK[k].color }}>
                      {LOOK[k].label}
                    </dt>
                    <dd className="font-mono text-lg">{k === "right" ? s.right : k === "wrong" ? s.wrong : s.abstain}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs text-[var(--faint)]">The famous facts are real. The rare ones and “Acme” are made up: rare facts are rare because almost nobody wrote them down.</p>
            </section>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <Choices
                label="Retrieval (RAG)"
                accent={ACCENT}
                value={rag ? "on" : "off"}
                onChange={(v) => setRag(v === "on")}
                options={[
                  { id: "off", label: "Memory only" },
                  { id: "on", label: "Search your docs" },
                ]}
              />
              <div className="w-full">
                <Slider label="Say “not sure” below" accent={ACCENT} value={tIdx} min={0} max={THRESHOLDS.length - 1} step={1} format={(i) => (THRESHOLDS[i] === 0 ? "never" : pct(THRESHOLDS[i]))} onChange={setTIdx} />
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Answering…">
                Walk one question through
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="A question comes in" what="The model doesn't look anything up. It only has patterns from training, and some facts showed up there far more often than others." accent={ACCENT} active={on(0)}>
                <p className="text-sm">{r.q.q}</p>
                <p className="mt-2 font-mono text-xs text-[var(--muted)]">
                  this fact in the training data: {r.q.seen === 0 ? "never (it's private)" : `${r.q.seen.toLocaleString()} ${r.q.seen === 1 ? "time" : "times"}`}
                </p>
              </FlowStep>
              <FlowArrow label="the prompt" accent={ACCENT} active={on(1)} />

              <FlowStep n={2} title="Spread probability over answers" what="A fact seen thousands of times gets nearly all the probability. One seen once or twice gets a small share, and the rest goes to answers that merely look right." accent={ACCENT} active={on(1)}>
                <ul className="space-y-1.5">
                  {r.options.map((o) => (
                    <li key={o.text} className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_3rem] items-center gap-2 text-sm">
                      <span className="truncate" style={{ color: o.right ? "var(--good)" : "var(--text)" }}>
                        {o.text}
                      </span>
                      <span className="relative h-2 rounded bg-[var(--track)]">
                        <span className="block h-full rounded transition-[width] duration-300" style={{ width: `${o.p * 100}%`, background: o.right ? "var(--good)" : "var(--bad)" }} />
                        {threshold > 0 && <span className="absolute -top-1 h-4 w-px bg-[var(--text)]" style={{ left: `${threshold * 100}%` }} aria-hidden />}
                      </span>
                      <span className="text-right font-mono tabular-nums">{pct(o.p)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-[var(--faint)]">
                  From memory alone: {pct(fromTraining(r.q.seen))} on the right answer.{" "}
                  {threshold > 0 && "The thin line is the “not sure” threshold."}
                </p>
              </FlowStep>
              <FlowArrow label="4 probabilities" accent={ACCENT} active={on(2)} />

              <FlowStep n={3} title="Decoding always picks something" what="Sampling turns probabilities into one answer, written in the same confident tone either way. Nothing in this step can say “I don't know” unless the model was trained to." accent={ACCENT} active={on(2)}>
                <p className="text-sm">
                  Sampled: <span className="font-semibold" style={{ color: r.sampled.right ? "var(--good)" : "var(--bad)" }}>{r.sampled.text}</span>
                  <span className="text-[var(--muted)]"> ({r.sampled.right ? "right" : "wrong"}, it had {pct(r.sampled.p)})</span>
                </p>
                <p className="mt-2 text-xs text-[var(--faint)]">
                  How sampling picks:{" "}
                  <Link href="/tracks/ai/next-token" className="text-[var(--accent)] hover:underline">
                    How an LLM picks the next token
                  </Link>
                  .
                </p>
              </FlowStep>
              <FlowArrow label="one fluent answer" accent={ACCENT} active={on(3)} />

              <FlowStep n={4} title="Give it a source to read" what="Retrieval puts the relevant document in the prompt, so the model copies instead of recalling. It only helps for facts that are actually in your documents." accent={ACCENT} active={on(3)}>
                <Choices
                  accent={ACCENT}
                  value={rag ? "on" : "off"}
                  onChange={(v) => setRag(v === "on")}
                  options={[
                    { id: "off", label: "Memory only" },
                    { id: "on", label: "Search your docs" },
                  ]}
                />
                <p className="mt-3 text-sm text-[var(--muted)]">
                  {QUESTIONS.filter((q) => q.inDocs).length} of the 12 questions are about Acme, and only those are in the docs.{" "}
                  {rag ? `With retrieval they jump to ${pct(0.97)} right; the rare public facts stay rare.` : "Turn retrieval on and watch only those cards change."}{" "}
                  <Link href="/tracks/ai/rag" className="text-[var(--accent)] hover:underline">
                    RAG, step by step
                  </Link>
                </p>
              </FlowStep>
              <FlowArrow label="answer or abstain?" accent={ACCENT} active={on(4)} />

              <FlowStep n={5} title="Let it say “I'm not sure”, and grade fairly" what="If the top answer is below a confidence threshold, abstain. Whether that pays off depends on the grading: if wrong answers cost nothing, guessing always scores at least as well." accent={ACCENT} active={on(4)}>
                <Slider label="Abstain below" accent={ACCENT} value={tIdx} min={0} max={THRESHOLDS.length - 1} step={1} format={(i) => (THRESHOLDS[i] === 0 ? "never" : pct(THRESHOLDS[i]))} onChange={setTIdx} />
                <div className="mt-3">
                  <Choices
                    label="Grading"
                    accent={ACCENT}
                    value={grading}
                    onChange={setGrading}
                    options={[
                      { id: "accuracy", label: "Right +1, wrong 0" },
                      { id: "penalty", label: "Right +1, wrong −1" },
                    ]}
                  />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-[var(--inset)] p-2">
                    <dt className="text-xs text-[var(--faint)]">Expected score, never abstain</dt>
                    <dd className="font-mono text-sm">{expGuess.toFixed(2)}</dd>
                  </div>
                  <div className="rounded-lg bg-[var(--inset)] p-2">
                    <dt className="text-xs text-[var(--faint)]">Expected score, your threshold</dt>
                    <dd className="font-mono text-sm" style={{ color: exp > expGuess + 0.005 ? "var(--good)" : exp < expGuess - 0.005 ? "var(--bad)" : undefined }}>
                      {exp.toFixed(2)}
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  {grading === "accuracy"
                    ? "With right-or-nothing grading, abstaining can only lose points, so a model tuned to top these benchmarks learns to guess. That's a big part of why hallucination persists."
                    : "Once wrong answers cost a point, any answer below 50% is worth less than “I'm not sure”. Abstaining now raises the score."}{" "}
                  Expected score is the average over many runs; this run scored {s.points}.
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
