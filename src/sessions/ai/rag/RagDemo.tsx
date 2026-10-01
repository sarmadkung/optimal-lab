"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, Slider, useWalk } from "@/components/session/ui";
import { ASKS, retrieve, type Ask } from "@/lib/rag";

const ACCENT = "var(--ai)";

export default function RagDemo() {
  const [askId, setAskId] = useState(ASKS[0].id);
  const [mode, setMode] = useState<"sentence" | "section">("sentence");
  const [k, setK] = useState(1);
  const { stage, busy, run } = useWalk(6, 420);
  const ask = ASKS.find((a) => a.id === askId) ?? ASKS[0];
  const { ranked, kept, prompt } = retrieve(ask, mode, k);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)]">AI engineering · interactive</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">RAG, step by step</h1>
      <p className="mt-3 text-[var(--muted)]">
        The model does not search your docs. You split them, retrieve a few chunks, and paste those
        chunks into the prompt. The model only sees that prompt.
      </p>

      <div className="mt-6">
        <FlowStep n={1} title="Ask a question" what="Retrieval starts from the question, not from the whole corpus." accent={ACCENT} active={stage === 0}>
          <Choices
            accent={ACCENT}
            value={ask.id}
            onChange={setAskId}
            options={ASKS.map((a) => ({ id: a.id, label: a.question }))}
          />
        </FlowStep>
        <FlowArrow label="the question" accent={ACCENT} active={stage === 1} />

        <FlowStep n={2} title="Split the docs into chunks" what="A sentence keeps one fact. A whole section glues facts together, so the match gets blurrier." accent={ACCENT} active={stage === 1}>
          <Choices
            accent={ACCENT}
            value={mode}
            onChange={setMode}
            options={[
              { id: "sentence", label: "One sentence per chunk" },
              { id: "section", label: "Whole section" },
            ]}
          />
          <ul className="mt-3 space-y-2">
            {ranked.map((chunk) => (
              <li key={chunk.id} className="rounded-md border border-[var(--line)] px-3 py-2 text-sm">
                <span className="font-mono text-xs text-[var(--faint)]">{chunk.source}</span>
                <p className="mt-1">{chunk.text}</p>
              </li>
            ))}
          </ul>
        </FlowStep>
        <FlowArrow label={`${ranked.length} chunks`} accent={ACCENT} active={stage === 2} />

        <FlowStep n={3} title="Score each chunk against the question" what="Higher means this chunk is more like the question. These scores are fixed for the demo so you can see the ranking move." accent={ACCENT} active={stage === 2}>
          <ul className="space-y-2 font-mono text-sm">
            {ranked.map((chunk) => (
              <li key={chunk.id} className="flex justify-between gap-3">
                <span className="truncate">{chunk.text}</span>
                <span className="tabular-nums">{chunk.score.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </FlowStep>
        <FlowArrow label="ranked chunks" accent={ACCENT} active={stage === 3} />

        <FlowStep n={4} title="Keep the top matches" what="k is how many chunks go into the prompt. Too few and you miss the fact. Too many and you add noise." accent={ACCENT} active={stage === 3}>
          <Slider label="Chunks to keep (k)" value={k} min={1} max={ranked.length} step={1} format={(v) => String(v)} accent={ACCENT} onChange={setK} />
          <ul className="mt-3 space-y-1 text-sm">
            {ranked.map((chunk) => {
              const keep = kept.some((c) => c.id === chunk.id);
              return (
                <li key={chunk.id} className={keep ? "" : "text-[var(--faint)] line-through"}>
                  {chunk.text}
                </li>
              );
            })}
          </ul>
        </FlowStep>
        <FlowArrow label="the notes" accent={ACCENT} active={stage === 4} />

        <FlowStep n={5} title="Paste them into the prompt" what="This is the whole input the model gets. If a fact is not in here, the model was not given it." accent={ACCENT} active={stage === 4}>
          <pre className="overflow-x-hidden whitespace-pre-wrap break-words rounded-md bg-[var(--inset)] p-3 font-mono text-xs leading-relaxed">
            {prompt}
          </pre>
        </FlowStep>
        <FlowArrow label="1 prompt" accent={ACCENT} active={stage === 5} />

        <FlowStep n={6} title="Answer only from that prompt" what="The model is not searching again. It writes from the notes you just pasted." accent={ACCENT} active={stage === 5}>
          <Answer ask={ask} mode={mode} keptIds={kept.map((c) => c.id)} />
          <div className="mt-4">
            <RunButton busy={busy} onClick={run} accent={ACCENT}>
              Run retrieval
            </RunButton>
          </div>
        </FlowStep>
      </div>
    </div>
  );
}

function Answer({ ask, mode, keptIds }: { ask: Ask; mode: "sentence" | "section"; keptIds: string[] }) {
  const has = (id: string) => keptIds.includes(id);
  let text = "The notes do not say. I do not know.";
  if (ask.id === "capital") {
    if (has("capital")) text = "The capital of Pakistan is Islamabad.";
    else if (has("handbook"))
      text = "The notes mention Islamabad and Karachi together, so the capital is easy to mix up with the largest city.";
  } else if (has("rice") || has("cookbook")) {
    text = "Soak the rice, parboil it, then layer it.";
  }
  const noisy = ask.id === "capital" && mode === "section" && has("handbook");
  return (
    <p className="text-sm" style={{ color: noisy ? "var(--bad)" : "var(--text)" }}>
      {text}
    </p>
  );
}
