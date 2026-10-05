"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type NodeState, type Packet } from "@/components/system/SystemMap";
import { FINAL_K, MODES, QUERIES, RERANK_TOP, RRF_K, doc, search, type Mode, type Ranked } from "@/lib/hybridSearch";

const ACCENT = "var(--ai)";

export default function HybridSearchDemo() {
  const [queryId, setQueryId] = useState(QUERIES[0].id);
  const [mode, setMode] = useState<Mode>("rerank");
  const { stage, busy, run } = useWalk(5, 1000);
  const r = search(queryId);
  const q = r.query;

  const usesKeyword = mode !== "vector";
  const usesVector = mode !== "keyword";
  const usesFusion = mode === "hybrid" || mode === "rerank";
  const usesRerank = mode === "rerank";
  const final = r.results[mode];
  const hit = final[0] === q.answer;

  const state = (used: boolean, ...at: number[]): NodeState => (!used ? "dim" : stage !== null && at.includes(stage) ? "active" : "idle");
  const packets: Packet[] =
    stage === 0 && usesKeyword ? hops("kw", ["app", "kw", "app"], { label: "terms" })
    : stage === 1 && usesVector ? hops("vec", ["app", "vec", "app"], { label: "vector" })
    : stage === 3 && usesRerank ? hops("rr", ["app", "rerank", "app"], { label: `top ${RERANK_TOP}` })
    : stage === 4 ? hops("llm", ["app", "llm"], { label: `top ${FINAL_K}`, tone: hit ? "good" : "bad" })
    : [];

  const captions = [
    usesKeyword ? `BM25 looks for the exact words: ${r.keywordRanked.length ? `${r.keywordRanked.length} ${r.keywordRanked.length === 1 ? "note shares" : "notes share"} a term.` : "no note shares a single term."}` : "Keyword search is off in this mode.",
    usesVector ? `Vector search compares meaning. Closest: “${doc(r.vectorRanked[0].id).title}”.` : "Vector search is off in this mode.",
    usesFusion ? `RRF merges both rankings. A note near the top of either list rises.` : "No fusion: one list is all there is.",
    usesRerank ? `The reranker reads the question and each of the top ${RERANK_TOP} notes together, and reorders them.` : "No reranker in this mode.",
    hit ? `The right note, “${doc(q.answer).title}”, reaches the model first.` : `The model gets ${final.length ? `“${doc(final[0]).title}” first` : "nothing"}. The right note was ${final.includes(q.answer) ? "second" : "left out"}.`,
  ];
  const caption = stage === null ? q.why : captions[stage];

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Engineering · interactive"
        title="Hybrid search and reranking"
        blurb="Vector search finds meaning but misses exact codes. Keyword search finds exact words but misses paraphrases. Production RAG runs both, fuses the rankings, then lets a reranker pick. Try each query in each mode."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <SystemMap
              title="Your app queries a keyword index and a vector index, fuses them, reranks, and sends the top notes to the model"
              accent={ACCENT}
              chrome="split"
              nodes={[
                { id: "user", label: "User", sub: "asks", at: [10, 50], mobileAt: [22, 10], state: stage === null ? "idle" : "active" },
                { id: "app", label: "Your app", sub: usesFusion ? "fuses with RRF" : "one list", at: [34, 50], mobileAt: [62, 32], state: stage !== null ? "active" : "idle" },
                { id: "kw", label: "Keyword index", sub: "BM25", at: [60, 15], mobileAt: [22, 58], state: state(usesKeyword, 0) },
                { id: "vec", label: "Vector index", sub: "cosine", at: [60, 85], mobileAt: [78, 58], state: state(usesVector, 1) },
                { id: "rerank", label: "Reranker", sub: "cross-encoder", at: [87, 26], mobileAt: [22, 88], state: state(usesRerank, 3) },
                { id: "llm", label: "LLM", sub: `top ${FINAL_K} notes`, at: [87, 74], mobileAt: [78, 88], state: stage === 4 ? (hit ? "good" : "bad") : "idle" },
              ]}
              links={[
                { from: "user", to: "app", label: "question" },
                { from: "app", to: "kw", label: "terms", dim: !usesKeyword },
                { from: "app", to: "vec", label: "vector", dim: !usesVector },
                { from: "app", to: "rerank", label: "candidates", dim: !usesRerank },
                { from: "app", to: "llm", label: `top ${FINAL_K}` },
              ]}
              packets={packets}
              aspect={2}
              mobileAspect={0.85}
            />
          }
          panel={
            <SystemMapPanel caption={caption}>
              <Choices label="Question" accent={ACCENT} value={q.id} onChange={setQueryId} options={QUERIES.map((x) => ({ id: x.id, label: x.text }))} />
              <Choices label="Retrieval" accent={ACCENT} value={mode} onChange={setMode} options={MODES} />
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Searching…">
                Run the search
              </RunButton>
              <p className="w-full text-sm" style={{ color: hit ? "var(--good)" : "var(--bad)" }}>
                {hit ? "✓ Right note ranked first" : "✗ Right note not ranked first"}
                <span className="text-[var(--faint)]"> · wanted “{doc(q.answer).title}”</span>
              </p>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Keyword search (BM25)" what="Scores notes that share exact terms with the question. Rare terms count more. Great for codes, names and IDs." accent={ACCENT} active={stage === 0}>
                {!usesKeyword && <Off />}
                {r.keywordRanked.length ? (
                  <RankList list={r.keywordRanked} answer={q.answer} fmt={(x) => x.score.toFixed(2)} extra={(x) => r.keyword.find((k) => k.id === x.id)?.matched.join(", ")} />
                ) : (
                  <p className="text-sm text-[var(--muted)]">No note shares a word with the question. Keyword search returns nothing.</p>
                )}
              </FlowStep>
              <FlowArrow label="ranking 1" accent={ACCENT} active={stage === 1} />

              <FlowStep n={2} title="Vector search" what="Embeds the question and finds the notes pointing the same way. Great for paraphrases, weak on codes it has never seen." accent={ACCENT} active={stage === 1}>
                {!usesVector && <Off />}
                <RankList list={r.vectorRanked.slice(0, 4)} answer={q.answer} fmt={(x) => x.score.toFixed(2)} />
              </FlowStep>
              <FlowArrow label="ranking 2" accent={ACCENT} active={stage === 2} />

              <FlowStep n={3} title="Fuse with Reciprocal Rank Fusion" what={`Each list gives a note 1 / (${RRF_K} + its rank). Add them up. Scores are never compared across methods, only ranks.`} accent={ACCENT} active={stage === 2}>
                {!usesFusion && <Off />}
                <RankList list={r.fused.slice(0, 4)} answer={q.answer} fmt={(x) => x.score.toFixed(4)} />
              </FlowStep>
              <FlowArrow label={`top ${RERANK_TOP} candidates`} accent={ACCENT} active={stage === 3} />

              <FlowStep n={4} title="Rerank the top few" what="A cross-encoder reads the question and each note together. Slower per note, so it only sees a short list, but it is much more precise." accent={ACCENT} active={stage === 3}>
                {!usesRerank && <Off />}
                <RankList list={r.reranked} answer={q.answer} fmt={(x) => x.score.toFixed(2)} />
              </FlowStep>
              <FlowArrow label={`top ${FINAL_K} notes`} accent={ACCENT} active={stage === 4} />

              <FlowStep n={5} title="Paste the winners into the prompt" what="Only these notes reach the model. If the right one is not here, the answer is a guess." accent={ACCENT} active={stage === 4}>
                <ul className="space-y-1.5 text-sm">
                  {MODES.map((m) => {
                    const ok = r.results[m.id][0] === q.answer;
                    return (
                      <li key={m.id} className="flex items-baseline justify-between gap-2" style={{ fontWeight: m.id === mode ? 600 : 400 }}>
                        <span className="min-w-0 truncate">{m.label}</span>
                        <span className="shrink-0" style={{ color: ok ? "var(--good)" : "var(--bad)" }}>
                          {r.results[m.id][0] ? doc(r.results[m.id][0]).title : "nothing"} {ok ? "✓" : "✗"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Off() {
  return <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">Off in this mode · shown for comparison</p>;
}

function RankList({ list, answer, fmt, extra }: { list: Ranked[]; answer: string; fmt: (r: Ranked) => string; extra?: (r: Ranked) => string | undefined }) {
  return (
    <ol className="space-y-1 text-sm">
      {list.map((x) => {
        const right = x.id === answer;
        return (
          <li key={x.id} className="flex items-baseline justify-between gap-2">
            <span className="min-w-0 truncate">
              <span className="font-mono text-xs text-[var(--faint)]">{x.rank}. </span>
              <span style={{ color: right ? "var(--good)" : undefined }}>{doc(x.id).title}</span>
              {extra?.(x) && <span className="text-xs text-[var(--faint)]"> · {extra(x)}</span>}
            </span>
            <span className="shrink-0 font-mono text-xs tabular-nums">{fmt(x)}</span>
          </li>
        );
      })}
    </ol>
  );
}
