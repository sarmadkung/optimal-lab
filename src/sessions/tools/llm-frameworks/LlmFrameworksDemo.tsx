"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { CHUNKS, FACTS, FIRST, FIXED, MODES, PAGES, PROMPT_TOKENS, QUESTION, TOPKS, answer, type Design, type Mode } from "@/lib/llmFrameworks";

const ACCENT = "var(--tools)";

export default function LlmFrameworksDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const r = answer(d);

  const nodes: MapNode[] = [
    { id: "code", label: "Your 5 lines", sub: "load · index · query", at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "split", label: "Splitter", sub: `${r.chunks} chunks of ${d.chunk}`, at: [50, 18], mobileAt: [75, 12], state: d.chunk >= 1024 ? "wait" : "good" },
    { id: "index", label: "Vector index", sub: `top ${d.topK}`, at: [86, 18], mobileAt: [75, 42], state: r.complete ? "good" : "bad" },
    { id: "synth", label: "Answer step", sub: MODES.find((m) => m.id === d.mode)!.label.toLowerCase(), at: [50, 82], mobileAt: [25, 42], state: d.mode === "refine" ? "wait" : "good" },
    { id: "model", label: "Model", sub: `${r.calls} call${r.calls > 1 ? "s" : ""}`, at: [86, 82], mobileAt: [75, 74], state: "active" },
    { id: "trace", label: "Tracing", sub: d.tracing ? "every call visible" : "off", at: [14, 82], mobileAt: [25, 74], state: d.tracing ? "good" : "dim" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("l", ["code", "split"], { label: `${PAGES} pages` })
    : stage === 1 ? hops("e", ["split", "index"], { label: `${r.chunks} chunks` })
    : stage === 2 ? hops("q", ["index", "synth"], { label: `${r.k} chunks · ${r.found.length}/${FACTS.length} facts`, tone: r.complete ? "good" : "bad" })
    : stage === 3 ? Array.from({ length: Math.min(r.calls, 5) }, (_, i) => hops(`c${i}`, ["synth", "model", "synth"], { label: `call ${i + 1}`, start: i * 0.3 })).flat()
    : stage === 4 ? (d.tracing ? hops("t", ["synth", "trace"], { label: `${r.calls} calls · ${r.inputTokens.toLocaleString("en-US")} tokens` }) : [])
    : [];

  const captions = [
    `Step 1: five lines load the ${PAGES}-page handbook, build an index and ask: “${QUESTION}”`,
    `Step 2: the splitter cuts it into ${r.chunks} chunks of ${d.chunk} tokens.`,
    `Step 3: the retriever returns ${r.k} chunks; ${r.complete ? "both facts are in them" : `only ${r.found.length} of the ${FACTS.length} facts the answer needs`}.`,
    d.mode === "compact" ? "Step 4: all retrieved chunks go into one prompt." : `Step 4: refine makes ${r.calls} calls, one per chunk, each rewriting the last answer.`,
    d.tracing ? `Step 5: the trace shows ${r.calls} call${r.calls > 1 ? "s" : ""}, ${r.inputTokens.toLocaleString("en-US")} input tokens, ${r.seconds} s.` : "Step 5: without tracing you see the answer and nothing about how it was made.",
  ];
  const caption = stage !== null ? captions[stage] : `${r.complete ? "Complete answer" : "Half an answer"} · ${r.calls} model call${r.calls > 1 ? "s" : ""} · ${r.inputTokens.toLocaleString("en-US")} input tokens · ${r.seconds} s · $${r.costPer1k.toFixed(2)} per 1,000 questions.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="Tools · interactive"
        title="LangChain and LlamaIndex"
        blurb="A framework turns a RAG pipeline into five lines: load the documents, build an index, ask a question. Underneath, defaults pick the chunk size, how many chunks to retrieve, how the answer is assembled and the prompt. Ask one question of a 40-page handbook and see what the defaults decide."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Your code, the framework's splitter, vector index and answer step, the model, and tracing"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "code", to: "split", label: "documents" },
                  { from: "split", to: "index", label: "embed" },
                  { from: "index", to: "synth", label: "top k" },
                  { from: "synth", to: "model", label: "prompts" },
                  { from: "synth", to: "trace", label: "spans", dim: !d.tracing },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="What the question needed and what was retrieved">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">what the answer needs</p>
                <ul className="mt-2 space-y-1 text-xs">
                  {FACTS.map((f, i) => {
                    const got = r.got.includes(r.factChunks[i]);
                    return (
                      <li key={f.text} className="flex gap-2">
                        <span style={{ color: got ? "var(--good)" : "var(--bad)" }} aria-hidden>
                          {got ? "✓" : "✕"}
                        </span>
                        <span>
                          {f.text} <span className="font-mono text-[10px] text-[var(--faint)]">chunk {r.factChunks[i]}{got ? "" : ", not retrieved"}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-2 font-mono text-[11px] text-[var(--muted)]">retrieved chunks: {r.got.join(", ")}</p>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Defaults
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Chosen on purpose
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Asking…">
                Ask the question
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Five lines build the pipeline" what="This is the framework's real value: loaders for many formats, an index, and a query interface, working in minutes. Every decision you didn't make has a default." accent={ACCENT} active={at(0)}>
                <pre className="overflow-x-auto whitespace-pre rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] leading-relaxed">{`docs   = load("handbook/")
index  = VectorIndex.from_documents(docs)
engine = index.as_query_engine()
answer = engine.query("${QUESTION}")`}</pre>
              </FlowStep>
              <FlowArrow label="documents" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Check the chunk size" what="Big chunks hold whole sections but mix several topics, so a specific fact ranks below vaguer matches. Smaller chunks rank sharper and need more of them." accent={ACCENT} active={at(1)}>
                <Choices label="Chunk size (tokens)" accent={ACCENT} value={String(d.chunk)} onChange={(v) => set({ chunk: Number(v) })} options={CHUNKS.map((c) => ({ id: String(c), label: String(c) }))} />
              </FlowStep>
              <FlowArrow label="chunks" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Check how many chunks are retrieved" what="A small default top-k keeps prompts short and quietly drops the second half of a two-part answer." accent={ACCENT} active={at(2)}>
                <Choices label="Chunks retrieved (top k)" accent={ACCENT} value={String(d.topK)} onChange={(v) => set({ topK: Number(v) })} options={TOPKS.map((k) => ({ id: String(k), label: String(k) }))} />
              </FlowStep>
              <FlowArrow label="context" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Check how the answer is assembled" what="Stuffing everything into one prompt is one call. Refine makes one call per chunk, each rewriting the previous answer: more calls, more tokens, more time, for the same facts." accent={ACCENT} active={at(3)}>
                <Choices<Mode> label="Response mode" accent={ACCENT} value={d.mode} onChange={(v) => setD((c) => ({ ...c, mode: v }))} options={MODES.map((m) => ({ id: m.id, label: m.label }))} />
                <p className="mt-1 text-[11px] text-[var(--faint)]">Plus a built-in prompt template of about {PROMPT_TOKENS} tokens you didn&apos;t write.</p>
              </FlowStep>
              <FlowArrow label="answer" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Turn on tracing and read what ran" what="A tracing tool shows every prompt the framework sent, with tokens and timing. It's the fastest way to learn what a framework does on your behalf." accent={ACCENT} active={at(4)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.tracing} onChange={(e) => set({ tracing: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Send traces to a tracing tool
                </label>
                {d.tracing ? (
                  <ol className="space-y-0.5 font-mono text-[11px]">
                    <li>embed query · 1 call</li>
                    <li>retrieve · top {d.topK} of {r.chunks}</li>
                    {Array.from({ length: Math.min(r.calls, 6) }, (_, i) => (
                      <li key={i}>llm · {d.mode === "compact" ? `${r.inputTokens.toLocaleString("en-US")} tokens` : `chunk ${i + 1}${i ? " + previous answer" : ""}`}</li>
                    ))}
                    {r.calls > 6 && <li>… {r.calls - 6} more</li>}
                  </ol>
                ) : (
                  <p className="text-[11px] text-[var(--faint)]">Nothing to look at but the answer.</p>
                )}
                <p className="mt-2 text-[11px] text-[var(--faint)]">Defaults are illustrative of typical frameworks, not one version of one. Chunking, retrieval, call counts and tokens run here.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
