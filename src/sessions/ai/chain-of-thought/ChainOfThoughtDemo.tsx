"use client";

import { Fragment, useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMapPanel } from "@/components/system/SystemMap";
import {
  HIDDEN,
  LOOKUP,
  MODES,
  PROBLEMS,
  SAMPLE_COUNTS,
  WRITTEN,
  accuracy,
  draw,
  outputTokens,
  pChain,
  pDirect,
  pVote,
  pct,
  tally,
  type Mode,
} from "@/lib/chainOfThought";

const ACCENT = "var(--ai)";
const LINE: Record<Mode, string> = { direct: "var(--bad)", chain: "var(--ai)", vote: "var(--good)" };
const MAX_STEPS = 6;
const tokens = (n: number) => `${n} ${n === 1 ? "token" : "tokens"}`;

export default function ChainOfThoughtDemo() {
  const [problemId, setProblemId] = useState("cafe");
  const [mode, setMode] = useState<Mode>("chain");
  const [samples, setSamples] = useState(5);
  const { stage, busy, run } = useWalk(5, 1100);
  const p = PROBLEMS.find((x) => x.id === problemId)!;
  const acc = accuracy(mode, p.steps, samples);
  const drawn = draw(p, samples);
  const vote = tally(drawn);
  const at = (n: number) => stage === n;

  const captions = [
    `Step 1: “${p.question}” needs ${p.steps} ${p.steps === 1 ? "step" : "steps"} of work.`,
    `Step 2: answering at once, all ${p.steps} ${p.steps === 1 ? "step happens" : "steps happen"} inside the first answer token: ${pct(pDirect(p.steps))} right.`,
    `Step 3: written out, each result is text the next step can read: ${pct(pChain(p.steps))} right.`,
    `Step 4: ${samples} chains, the most common answer wins: ${vote.winner.answer} (${vote.winner.n} of ${samples}).`,
    `Step 5: ${MODES.find((m) => m.id === mode)!.label.toLowerCase()} is ${pct(acc)} right for about ${outputTokens(p, mode, samples)} output tokens.`,
  ];
  const caption =
    stage !== null
      ? captions[stage]
      : p.steps === 1
        ? "A lookup is one step. Thinking out loud costs tokens and adds nothing; it can even talk itself into a worse answer."
        : `Direct ${pct(pDirect(p.steps))}, step by step ${pct(pChain(p.steps))}, a vote of ${samples} ${pct(pVote(p.steps, samples))}. The longer the problem, the wider the gap.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Engineering · interactive"
        title="Chain of thought and reasoning models"
        blurb="A model does the same amount of work for every token. Ask for the answer straight away and every intermediate result has to happen in one pass. Let it write the steps first and each result becomes text it can read. See when that helps, when voting over several chains helps more, and what it costs."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5" aria-label="The model's answer and how accuracy falls with the number of steps">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">Question · {p.steps} {p.steps === 1 ? "step" : "steps"}</p>
              <p className="mt-1 text-sm">{p.question}</p>

              <p className="mt-4 font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">Model output · {MODES.find((m) => m.id === mode)!.label}</p>
              {mode === "direct" ? (
                <p className="mt-1 rounded-md bg-[var(--inset)] px-2.5 py-2 font-mono text-sm" style={{ color: p.directRight ? "var(--good)" : "var(--bad)" }}>
                  {p.direct} {p.directRight ? "✓" : `✗ (right: ${p.answer})`}
                </p>
              ) : mode === "chain" ? (
                <ol className="mt-1 space-y-1 rounded-md bg-[var(--inset)] px-2.5 py-2 font-mono text-[12px]">
                  {p.chain.map((line, i) => (
                    <li key={i} style={{ color: i === p.chain.length - 1 ? "var(--good)" : "var(--text)" }}>
                      {line}
                    </li>
                  ))}
                </ol>
              ) : (
                <ul className="mt-1 grid grid-cols-3 gap-1.5 sm:grid-cols-5">
                  {drawn.map((d, i) => (
                    <li key={i} className="rounded-md border px-1.5 py-1.5 text-center font-mono text-[11px]" style={{ borderColor: d.right ? "var(--good)" : "var(--bad)", color: d.right ? "var(--good)" : "var(--bad)" }}>
                      <span className="block text-[10px] text-[var(--faint)]">chain {i + 1}</span>
                      {d.answer}
                    </li>
                  ))}
                </ul>
              )}

              <AccuracyChart mode={mode} steps={p.steps} samples={samples} />
            </section>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices label="Question" accent={ACCENT} value={p.id} onChange={setProblemId} options={PROBLEMS.map((x) => ({ id: x.id, label: x.label }))} />
              </div>
              <div className="w-full">
                <Choices label="How it answers" accent={ACCENT} value={mode} onChange={setMode} options={MODES} />
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Thinking…">
                Ask the model
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Ask a question" what="Count the steps a person would write down to solve it. A fact is one; a word problem can be many." accent={ACCENT} active={at(0)}>
                <p className="text-sm">{p.question}</p>
                <p className="mt-1 font-mono text-xs text-[var(--faint)]">
                  {p.steps} {p.steps === 1 ? "step" : "steps"} · answer {p.answer}
                </p>
              </FlowStep>
              <FlowArrow label="the question" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Answer directly" what="The first answer token is computed in one pass through the layers. Every intermediate number has to be worked out inside that pass, with nowhere to write it." accent={ACCENT} active={at(1)}>
                <p className="font-mono text-sm" style={{ color: p.directRight ? "var(--good)" : "var(--bad)" }}>
                  “{p.direct}” {p.directRight ? "✓" : "✗"}
                </p>
                <p className="mt-1 font-mono text-xs text-[var(--muted)]">
                  {LOOKUP} × {HIDDEN}^{p.steps - 1} = {pct(pDirect(p.steps))} right · {tokens(outputTokens(p, "direct", 1))}
                </p>
              </FlowStep>
              <FlowArrow label="or: think first" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Write the steps out" what="“Think step by step” makes the model write each result down. The next token can read it, so every step is a small, easy one." accent={ACCENT} active={at(2)}>
                <ol className="space-y-0.5 font-mono text-xs">
                  {p.chain.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ol>
                <p className="mt-2 font-mono text-xs text-[var(--muted)]">
                  {LOOKUP} × {WRITTEN}^{p.steps} = {pct(pChain(p.steps))} right · {tokens(outputTokens(p, "chain", 1))}
                </p>
              </FlowStep>
              <FlowArrow label={`${samples} chains`} accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Sample several chains and vote" what="Self-consistency: sample a few chains at a temperature above zero and keep the most common final answer. A slip in one chain rarely repeats in the others." accent={ACCENT} active={at(3)}>
                <Choices label="Chains" accent={ACCENT} value={String(samples)} onChange={(v) => setSamples(Number(v))} options={SAMPLE_COUNTS.map((n) => ({ id: String(n), label: String(n) }))} />
                <ul className="mt-2 space-y-0.5 font-mono text-xs">
                  {vote.rows.map((r) => (
                    <li key={r.answer} style={{ color: r.right ? "var(--good)" : "var(--bad)" }}>
                      {r.answer}: {"●".repeat(r.n)} {r.n}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 font-mono text-xs text-[var(--muted)]">
                  a majority right: {pct(pVote(p.steps, samples))} · {tokens(outputTokens(p, "vote", samples))}
                </p>
              </FlowStep>
              <FlowArrow label="accuracy and cost" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Pay for the thinking" what="Reasoning tokens are output tokens: billed, and slower to produce than reading the prompt. Spend them where a problem has steps." accent={ACCENT} active={at(4)}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-x-3 gap-y-1 font-mono text-xs">
                  <span />
                  <span className="text-[11px] text-[var(--faint)]">direct</span>
                  <span className="text-[11px] text-[var(--faint)]">steps</span>
                  <span className="text-[11px] text-[var(--faint)]">vote</span>
                  {PROBLEMS.map((x) => {
                    const weight = x.id === p.id ? 700 : 400;
                    return (
                      <Fragment key={x.id}>
                        <span className="min-w-0 font-sans" style={{ fontWeight: weight }}>{x.label}</span>
                        <span style={{ color: LINE.direct, fontWeight: weight }}>{pct(pDirect(x.steps))}</span>
                        <span style={{ color: LINE.chain, fontWeight: weight }}>{pct(pChain(x.steps))}</span>
                        <span style={{ color: LINE.vote, fontWeight: weight }}>{pct(pVote(x.steps, samples))}</span>
                      </Fragment>
                    );
                  })}
                </div>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Reasoning models (OpenAI o-series, Claude with extended thinking, DeepSeek-R1) are trained with reinforcement learning to do this on their own: they think in hidden tokens before answering, and you set a budget for how many.
                </p>
                <p className="mt-1 text-xs text-[var(--faint)]">The per-step rates are a teaching model. The shape (direct falls fast, written steps fall slowly, votes lift it) follows Wei et al. 2022 and Wang et al. 2022.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function AccuracyChart({ mode, steps, samples }: { mode: Mode; steps: number; samples: number }) {
  const W = 320;
  const H = 150;
  const pad = { l: 34, r: 10, t: 10, b: 26 };
  const x = (s: number) => pad.l + ((s - 1) / (MAX_STEPS - 1)) * (W - pad.l - pad.r);
  const y = (p: number) => pad.t + (1 - p) * (H - pad.t - pad.b);
  const xs = Array.from({ length: MAX_STEPS }, (_, i) => i + 1);
  const lines: { id: Mode; label: string; f: (s: number) => number }[] = [
    { id: "direct", label: "direct", f: pDirect },
    { id: "chain", label: "step by step", f: pChain },
    { id: "vote", label: `vote of ${samples}`, f: (s) => pVote(s, samples) },
  ];

  return (
    <figure className="mt-5">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Chance of a right answer against the number of steps, for each way of answering">
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={0.6} />
            <text x={pad.l - 5} y={y(t) + 3} textAnchor="end" fontSize={8} fill="var(--faint)">
              {pct(t)}
            </text>
          </g>
        ))}
        {xs.map((s) => (
          <text key={s} x={x(s)} y={H - 12} textAnchor="middle" fontSize={8} fill={s === steps ? "var(--text)" : "var(--faint)"} fontWeight={s === steps ? 700 : 400}>
            {s}
          </text>
        ))}
        <text x={(pad.l + W - pad.r) / 2} y={H - 2} textAnchor="middle" fontSize={8} fill="var(--faint)">
          steps in the problem
        </text>
        <line x1={x(steps)} x2={x(steps)} y1={pad.t} y2={H - pad.b} stroke="var(--line-strong)" strokeDasharray="2 2" strokeWidth={0.8} />
        {lines.map((l) => (
          <g key={l.id} opacity={l.id === mode ? 1 : 0.45}>
            <polyline points={xs.map((s) => `${x(s)},${y(l.f(s))}`).join(" ")} fill="none" stroke={LINE[l.id]} strokeWidth={l.id === mode ? 2 : 1.2} />
            <circle cx={x(steps)} cy={y(l.f(steps))} r={l.id === mode ? 3.5 : 2.2} fill={LINE[l.id]} />
          </g>
        ))}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
        {lines.map((l) => (
          <span key={l.id} className="flex items-center gap-1.5" style={{ fontWeight: l.id === mode ? 600 : 400 }}>
            <span className="h-0.5 w-4" style={{ background: LINE[l.id] }} />
            {l.label} {pct(l.f(steps))}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
