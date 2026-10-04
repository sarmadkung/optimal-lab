"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, Slider, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionSplitLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type NodeState, type Packet } from "@/components/system/SystemMap";
import { ASKS, retrieve, type Ask } from "@/lib/rag";

const ACCENT = "var(--ai)";

export default function RagDemo() {
  const [askId, setAskId] = useState(ASKS[0].id);
  const [mode, setMode] = useState<"sentence" | "section">("sentence");
  const [k, setK] = useState(1);
  const { stage, busy, run } = useWalk(6, 1000);
  const ask = ASKS.find((a) => a.id === askId) ?? ASKS[0];
  const { ranked, kept, prompt } = retrieve(ask, mode, k);

  const lit = (...at: number[]): NodeState => (stage !== null && at.includes(stage) ? "active" : "idle");
  const packets: Packet[] =
    stage === 0 ? hops("q", ["user", "app"], { label: "question" })
    : stage === 1 ? hops("chunk", ["app", "docs"], { label: "question" })
    : stage === 3 ? hops("top", ["docs", "app"], { label: `top ${k}` })
    : stage === 4 ? hops("prompt", ["app", "llm"], { label: "prompt" })
    : stage === 5 ? [...hops("ans", ["llm", "app"], { label: "answer" }), ...hops("ans2", ["app", "user"], { label: "answer", start: 0.45 })]
    : [];
  const captions = [
    "The question goes to your app, not straight to the model.",
    `Your app sends it to the document index, split into ${ranked.length} chunks.`,
    "The index scores every chunk against the question.",
    `Only the top ${k} chunk${k > 1 ? "s" : ""} come back to your app.`,
    "Your app pastes those chunks into one prompt and sends it to the model.",
    "The model answers from that prompt. It never touched the index.",
  ];

  const liveCaption = stage === null ? "Run retrieval to watch the question travel." : captions[stage];

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI engineering · interactive"
        title="RAG, step by step"
        blurb="The model does not search your docs. You split them, retrieve a few chunks, and paste those chunks into the prompt. The model only sees that prompt."
      />

      <div className="mt-6">
        <SessionSplitLayout
          visual={
            <SystemMap
              title="A user, your app, the document index and the model"
              accent={ACCENT}
              chrome="split"
              nodes={[
                { id: "user", label: "User", sub: "asks", at: [13, 22], mobileAt: [24, 14], state: lit(0, 5) },
                { id: "app", label: "Your app", sub: "builds the prompt", at: [48, 50], mobileAt: [50, 50], state: lit(0, 1, 3, 4, 5) },
                { id: "docs", label: "Doc index", sub: `${ranked.length} chunks`, at: [86, 22], mobileAt: [76, 14], state: lit(1, 2, 3) },
                { id: "llm", label: "LLM", sub: "sees only the prompt", at: [86, 78], mobileAt: [50, 86], state: lit(4, 5) },
              ]}
              links={[
                { from: "user", to: "app", label: stage === 5 ? "answer" : "question" },
                { from: "app", to: "docs", label: stage === 3 ? `top ${k} chunks` : "search", active: stage === 2 },
                { from: "app", to: "llm", label: stage === 5 ? "answer" : "prompt" },
              ]}
              packets={packets}
              aspect={2.1}
              mobileAspect={1}
            />
          }
          panel={
            <SystemMapPanel caption={liveCaption}>
              <Choices accent={ACCENT} value={ask.id} onChange={setAskId} options={ASKS.map((a) => ({ id: a.id, label: a.question }))} />
              <Choices
                accent={ACCENT}
                value={mode}
                onChange={setMode}
                options={[
                  { id: "sentence", label: "One sentence per chunk" },
                  { id: "section", label: "Whole section" },
                ]}
              />
              <Slider label="Chunks to keep (k)" value={k} min={1} max={ranked.length} step={1} format={(v) => String(v)} accent={ACCENT} onChange={setK} />
              <RunButton busy={busy} onClick={run} accent={ACCENT}>
                Run retrieval
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
        <FlowStep n={1} title="Ask a question" what="Retrieval starts from the question, not from the whole corpus." accent={ACCENT} active={stage === 0}>
          <p className="text-sm text-[var(--muted)]">{ask.question}</p>
        </FlowStep>
        <FlowArrow label="the question" accent={ACCENT} active={stage === 1} />

        <FlowStep n={2} title="Split the docs into chunks" what="A sentence keeps one fact. A whole section glues facts together, so the match gets blurrier." accent={ACCENT} active={stage === 1}>
          <ul className="space-y-2">
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
          <ul className="space-y-1 text-sm">
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
        </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
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
