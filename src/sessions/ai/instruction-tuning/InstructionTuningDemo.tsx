"use client";

import Link from "next/link";
import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, Slider, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMapPanel } from "@/components/system/SystemMap";
import { ANSWERS, BASE, BETAS, COMPARISONS, PROMPT, SFT, SFT_EXAMPLES, bestBeta, byId, outcome, policy, preferA } from "@/lib/instructionTuning";

const ACCENT = "var(--ai)";
type Stage = "base" | "sft" | "rlhf";
const STAGES: { id: Stage; label: string }[] = [
  { id: "base", label: "Pretrained" },
  { id: "sft", label: "After SFT" },
  { id: "rlhf", label: "After RLHF" },
];
const BEST = bestBeta();

export default function InstructionTuningDemo() {
  const [picked, setPicked] = useState<Stage>("rlhf");
  const [betaIdx, setBetaIdx] = useState(BETAS.indexOf(BEST));
  const { stage, busy, run } = useWalk(5, 1100);
  const on = (s: number) => stage === s;

  const beta = BETAS[betaIdx];
  const rl = policy(beta);
  // While the walk runs, the chat follows the step; otherwise the reader picks.
  const shown: Stage = stage === null ? picked : stage === 0 ? "base" : stage <= 2 ? "sft" : "rlhf";
  const dist = shown === "base" ? BASE : shown === "sft" ? SFT : rl;
  const o = outcome(dist);
  const top = dist.indexOf(Math.max(...dist));
  const answer = ANSWERS[top];
  const hacked = shown === "rlhf" && answer.id === "flattering";

  const caption =
    stage === null
      ? shown === "base"
        ? `The pretrained model has never seen a question answered, so ${pct(BASE[0] + BASE[1])} of the time it just keeps writing text that looks like the web.`
        : shown === "sft"
          ? `After fine-tuning on written examples it answers ${pct(SFT[3])} of the time, but often vaguely. People rate it ${o.human.toFixed(2)} on average.`
          : hacked
            ? `β = ${beta}: the leash is too loose. The model chases the reward model's favourite, the flattering padded answer. Reward ${o.reward.toFixed(2)}, people's rating only ${o.human.toFixed(2)}.`
            : `β = ${beta}: the model leans into answers the reward model likes while staying close to SFT. People rate it ${o.human.toFixed(2)}. ${beta === BEST ? "That's the best β here." : `The best β here is ${BEST}.`}`
      : [
          `Stage 0: a pretrained model. It continues “${PROMPT}” instead of answering it.`,
          `Supervised fine-tuning: thousands of prompts with answers written by people. The helpful answer goes from ${pct(BASE[3])} to ${pct(SFT[3])}.`,
          "People compare pairs of answers. A reward model learns to give the one they pick a higher score.",
          `Reinforcement learning: shift probability towards high-reward answers, with β = ${beta} as the leash back to SFT.`,
          `Result: “${answer.label.toLowerCase()}” is now the most likely answer. People rate the model ${o.human.toFixed(2)}.`,
        ][stage];

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Engineering · interactive"
        title="Instruction tuning and RLHF"
        blurb="A pretrained model continues text; it doesn't answer you. Two more rounds of training turn it into an assistant: copy answers people wrote, then learn from which answers people prefer. Push that second part too hard and the model learns to please the scorer instead of you."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5" aria-label="One prompt answered at each stage of training">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">{STAGES.find((s) => s.id === shown)!.label} model</p>
                <p className="font-mono text-xs text-[var(--muted)]">people’s rating {o.human.toFixed(2)}</p>
              </div>

              <div className="mt-3 space-y-2">
                <p className="ml-auto w-fit max-w-[85%] rounded-lg bg-[var(--inset)] px-3 py-2 text-sm">{PROMPT}</p>
                <p
                  className="max-w-[92%] rounded-lg border px-3 py-2 text-sm transition-colors duration-300"
                  style={{ borderColor: hacked ? "var(--bad)" : answer.human > 0.5 ? "var(--good)" : "var(--line-strong)" }}
                  aria-live="polite"
                >
                  {answer.text}
                </p>
              </div>

              <ul className="mt-4 space-y-1.5" aria-label="How likely each answer is">
                {ANSWERS.map((a, i) => (
                  <li key={a.id} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_3rem] items-center gap-2 text-sm">
                    <span className="truncate" style={{ color: i === top ? "var(--text)" : "var(--muted)", fontWeight: i === top ? 600 : 400 }}>
                      {a.label}
                    </span>
                    <span className="h-2 rounded bg-[var(--track)]">
                      <span className="block h-full rounded transition-[width] duration-500" style={{ width: `${dist[i] * 100}%`, background: a.id === "flattering" ? "var(--c4)" : ACCENT }} />
                    </span>
                    <span className="text-right font-mono tabular-nums">{pct(dist[i])}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4">
                <p className="text-xs text-[var(--faint)]">Reward-model score vs what people think, as β changes</p>
                <Overoptimization betaIdx={betaIdx} />
              </div>
            </section>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <Choices label="Show the model" accent={ACCENT} value={shown} onChange={setPicked} options={STAGES} />
              <div className="w-full">
                <Slider
                  label="KL penalty β (the leash)"
                  hint="Small β: chase the reward. Large β: stay close to SFT."
                  accent={ACCENT}
                  value={betaIdx}
                  min={0}
                  max={BETAS.length - 1}
                  step={1}
                  format={(i) => `β = ${BETAS[i]}`}
                  onChange={(i) => {
                    setBetaIdx(i);
                    setPicked("rlhf");
                  }}
                />
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Training…">
                Walk the three stages
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Start from the pretrained model" what="Pretraining taught it to continue web text. A question on the web is usually followed by more text, not by an answer to it." accent={ACCENT} active={on(0)}>
                <Dist values={BASE} />
                <p className="mt-2 text-xs text-[var(--faint)]">
                  How it got here:{" "}
                  <Link href="/tracks/ai/pretraining" className="text-[var(--accent)] hover:underline">
                    Pretraining
                  </Link>
                  .
                </p>
              </FlowStep>
              <FlowArrow label="a text completer" accent={ACCENT} active={on(1)} />

              <FlowStep n={2} title="Fine-tune on answers people wrote" what="Supervised fine-tuning (SFT): the same next-token training, but only on prompt → good answer pairs. The model learns the shape of an answer." accent={ACCENT} active={on(1)}>
                <ul className="space-y-2 text-sm">
                  {SFT_EXAMPLES.map((e) => (
                    <li key={e.prompt} className="rounded-md bg-[var(--inset)] px-3 py-2">
                      <span className="text-[var(--muted)]">{e.prompt}</span>
                      <span className="block">→ {e.answer}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3">
                  <Dist values={SFT} />
                </div>
                <p className="mt-2 text-xs text-[var(--faint)]">InstructGPT used about 13,000 of these. Writing them is slow and expensive, so there are never enough.</p>
              </FlowStep>
              <FlowArrow label="an assistant, roughly" accent={ACCENT} active={on(2)} />

              <FlowStep n={3} title="People compare answers; a reward model learns their picks" what="Choosing the better of two answers is much easier than writing one. A reward model learns scores so that P(A beats B) = σ(score A − score B)." accent={ACCENT} active={on(2)}>
                <ul className="space-y-2">
                  {COMPARISONS.map(([a, b]) => {
                    const A = byId(a);
                    const B = byId(b);
                    return (
                      <li key={a + b} className="rounded-md bg-[var(--inset)] px-3 py-2 text-sm">
                        <span className="font-semibold">{A.label}</span> <span className="text-[var(--faint)]">picked over</span> {B.label}
                        <span className="mt-1 block font-mono text-xs text-[var(--muted)]">
                          scores {A.reward.toFixed(1)} vs {B.reward.toFixed(1)} → σ({(A.reward - B.reward).toFixed(1)}) = {pct(preferA(A, B))}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-2 text-sm" style={{ color: "var(--bad)" }}>
                  Raters skimming fast sometimes pick the longer, friendlier answer. The reward model learns that taste too: it scores “flattering and padded” highest of all.
                </p>
              </FlowStep>
              <FlowArrow label="a score for any answer" accent={ACCENT} active={on(3)} />

              <FlowStep n={4} title="Optimize for the reward, on a leash" what="Reinforcement learning (PPO in InstructGPT) shifts the model towards high-scoring answers. A KL penalty, weighted by β, charges it for drifting away from the SFT model." accent={ACCENT} active={on(3)}>
                <p className="font-mono text-xs text-[var(--muted)]">best policy: π(answer) ∝ π_SFT(answer) · e^(reward / β)</p>
                <div className="mt-3">
                  <Slider label="β" accent={ACCENT} value={betaIdx} min={0} max={BETAS.length - 1} step={1} format={(i) => String(BETAS[i])} onChange={(i) => setBetaIdx(i)} />
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    ["Reward", outcome(rl).reward.toFixed(2)],
                    ["People's rating", outcome(rl).human.toFixed(2)],
                    ["Drift (KL)", outcome(rl).kl.toFixed(2)],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-lg bg-[var(--inset)] p-2">
                      <dt className="text-xs text-[var(--faint)]">{k}</dt>
                      <dd className="font-mono text-sm">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  {beta < BEST
                    ? "Reward keeps rising as β shrinks, but people's rating falls: the model is exploiting the reward model's blind spot. This is reward hacking."
                    : beta > BEST
                      ? "A tight leash keeps the model safe but close to SFT, so it gains little."
                      : "Here the extra reward still matches what people want."}
                </p>
              </FlowStep>
              <FlowArrow label="the tuned model" accent={ACCENT} active={on(4)} />

              <FlowStep n={5} title="Ship the assistant" what="The result answers questions, follows formats and declines harmful requests. It also inherits whatever the raters and the reward model got wrong." accent={ACCENT} active={on(4)}>
                <p className="text-sm">
                  At β = {beta}: “{ANSWERS[rl.indexOf(Math.max(...rl))].label.toLowerCase()}” is the most likely answer. People’s rating: base {outcome(BASE).human.toFixed(2)} → SFT {outcome(SFT).human.toFixed(2)} → RLHF {outcome(rl).human.toFixed(2)}.
                </p>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  DPO uses the formula in step 4 to skip the separate reward model and RL loop: it trains directly on the pairs people compared. Constitutional AI and RLAIF swap some of the human raters for a model following written principles.
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

function Dist({ values }: { values: number[] }) {
  return (
    <ul className="space-y-1">
      {ANSWERS.map((a, i) => (
        <li key={a.id} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_3rem] items-center gap-2 text-xs">
          <span className="truncate text-[var(--muted)]">{a.label}</span>
          <span className="h-1.5 rounded bg-[var(--track)]">
            <span className="block h-full rounded transition-[width] duration-500" style={{ width: `${values[i] * 100}%`, background: ACCENT }} />
          </span>
          <span className="text-right font-mono tabular-nums">{pct(values[i])}</span>
        </li>
      ))}
    </ul>
  );
}

// Expected reward and people's rating for every β. The gap opening on the left is reward hacking.
function Overoptimization({ betaIdx }: { betaIdx: number }) {
  const pts = BETAS.map((b) => outcome(policy(b)));
  const X = (i: number) => 12 + (i / (BETAS.length - 1)) * 176;
  const R = (r: number) => 70 - ((r - 0.5) / 1.6) * 60; // reward 0.5 → 2.1
  const H = (h: number) => 70 - ((h - 0.25) / 0.5) * 60; // rating 0.25 → 0.75
  const line = (y: (i: number) => number) => pts.map((_, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${y(i).toFixed(1)}`).join(" ");
  return (
    <figure>
      <svg viewBox="0 0 200 84" className="mt-1 w-full" role="img" aria-label="As β shrinks, reward rises but people's rating peaks and then falls">
        <line x1="12" x2="188" y1="70" y2="70" stroke="var(--line)" />
        <path d={line((i) => R(pts[i].reward))} fill="none" stroke="var(--c4)" strokeWidth="2" />
        <path d={line((i) => H(pts[i].human))} fill="none" stroke="var(--good)" strokeWidth="2" />
        <line x1={X(betaIdx)} x2={X(betaIdx)} y1="6" y2="70" stroke={ACCENT} strokeWidth="1" />
        <circle cx={X(betaIdx)} cy={H(pts[betaIdx].human)} r="2.8" fill="var(--good)" />
        <circle cx={X(betaIdx)} cy={R(pts[betaIdx].reward)} r="2.8" fill="var(--c4)" />
        <text x="12" y="81" fontSize="7" fill="var(--faint)">β {BETAS[0]} (loose)</text>
        <text x="188" y="81" fontSize="7" textAnchor="end" fill="var(--faint)">β {BETAS.at(-1)} (tight)</text>
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-3 text-xs text-[var(--muted)]">
        <span style={{ color: "var(--c4)" }}>— reward-model score</span>
        <span style={{ color: "var(--good)" }}>— people’s rating</span>
      </figcaption>
    </figure>
  );
}
