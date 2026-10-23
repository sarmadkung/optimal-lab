"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type Packet } from "@/components/system/SystemMap";
import { BUDGET_MS, DIMS, GOOD, KEYWORD_ONLY_NDCG, NODE, PEAK_QPS, PRODUCTS, START, indexGB, plan, type Design, type Dims, type Embed, type Quant, type Rewrite } from "@/lib/smartSearch";

const ACCENT = "var(--native)";
const usd = (x: number) => `$${Math.round(x).toLocaleString("en-US")}`;
const STEP_COLOR: Record<string, string> = { parse: "var(--c1)", rewrite: "var(--bad)", embed: "var(--c5)", search: "var(--good)", fuse: "var(--c3)", rerank: "var(--c2)", fetch: "var(--c4)" };

export default function SmartSearchDemo() {
  const [d, setD] = useState<Design>(START);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const p = plan(d);

  const packets: Packet[] =
    stage === 0 ? hops("q", ["user", "api"], { label: "“waterproof hiking boots”" })
    : stage === 1 ? hops("e", ["api", "embed", "api"], { label: d.embed === "api" ? "embedding API" : "own encoder" })
    : stage === 2 ? hops("s", ["api", "index", "api"], { label: `${p.shards} shard${p.shards === 1 ? "" : "s"}` })
    : stage === 3 ? (d.rerank ? hops("r", ["api", "rerank", "api"], { label: "top 50 reranked" }) : [])
    : stage === 4 ? hops("res", ["api", "user"], { label: `${p.p95} ms`, tone: p.fits ? "good" : "bad" })
    : [];

  const captions = [
    `Step 1: a shopper searches ${(PRODUCTS / 1e6).toFixed(0)} million listings; at peak, ${PEAK_QPS} people a second do.`,
    d.rewrite === "live" ? `Step 2: an LLM rewrites the query first (650 ms), then it is embedded ${d.embed === "api" ? "by an API call" : "on your own CPUs"}.` : `Step 2: the query is embedded ${d.embed === "api" ? "by an API call (70 ms)" : "on your own CPUs (9 ms)"}${d.rewrite === "offline" ? ", using a rewrite precomputed for popular queries" : ""}.`,
    `Step 3: vector and keyword search run in parallel across ${p.shards} shard${p.shards === 1 ? "" : "s"} holding a ${p.gb.toFixed(0)} GB index, and the two lists are merged.`,
    d.rerank ? "Step 4: a reranker scores the top 50 against the query on a GPU." : "Step 4: no reranker; the merged order is the final order.",
    `Step 5: ${p.p95} ms at p95 against a ${BUDGET_MS} ms budget${p.fits ? "" : ", over it"}; ${usd(p.total)} a month.`,
  ];
  const caption = stage !== null ? captions[stage] : `p95 ${p.p95} ms (budget ${BUDGET_MS}) · ${p.gb.toFixed(0)} GB index on ${p.nodes} nodes · ${usd(p.total)} a month · relevance ${p.ndcg.toFixed(2)} nDCG.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Native · case study"
        title="Smart search for your product"
        blurb={`Design meaning-based search for a marketplace with ${(PRODUCTS / 1e6).toFixed(0)} million listings, ${PEAK_QPS} queries a second at peak and a ${BUDGET_MS} ms budget. The first draft (big vectors, an LLM rewriting every query) is accurate and three times over budget. Size the index, place each model call, and keep search working when the vector side fails.`}
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Shopper, search API, embedding service, index cluster and reranker"
                accent={ACCENT}
                chrome="split"
                nodes={[
                  { id: "user", label: "Shopper", sub: `${p.p95} ms`, at: [10, 50], mobileAt: [50, 8], state: p.fits ? "good" : "bad" },
                  { id: "api", label: "Search API", sub: d.rewrite === "live" ? "calls an LLM" : "no LLM call", at: [38, 50], mobileAt: [50, 36], state: d.rewrite === "live" ? "bad" : "active" },
                  { id: "embed", label: "Query encoder", sub: d.embed === "api" ? "external API" : "own CPUs", at: [66, 16], mobileAt: [24, 64], state: "active" },
                  { id: "index", label: "Index cluster", sub: `${p.gb.toFixed(0)} GB · ${p.nodes} nodes`, at: [66, 84], mobileAt: [76, 64], state: p.nodes > 2 ? "wait" : "good" },
                  { id: "rerank", label: "Reranker", sub: d.rerank ? "GPU, top 50" : "off", at: [87, 50], mobileAt: [50, 90], state: d.rerank ? "active" : "dim" },
                ]}
                links={[
                  { from: "user", to: "api", label: "query" },
                  { from: "api", to: "embed", label: "text" },
                  { from: "api", to: "index", label: "vector + words" },
                  { from: "api", to: "rerank", label: "top 50", dim: !d.rerank },
                ]}
                packets={packets}
                aspect={1.6}
                mobileAspect={0.85}
              />
              <Waterfall d={d} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(START)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  First draft
                </button>
                <button type="button" onClick={() => setD(GOOD)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Fits the budget
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Searching…">
                Send a query
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Size the index before choosing a model" what={`Vectors dominate memory: ${(PRODUCTS / 1e6).toFixed(0)} million listings × dimensions × bytes, plus the search graph. Fewer dimensions and 8-bit quantization cost a little relevance and shrink the index several times, which decides how many machines you run.`} accent={ACCENT} active={at(0)}>
                <Choices label="Embedding dimensions" accent={ACCENT} value={String(d.dims)} onChange={(v) => set({ dims: Number(v) as Dims })} options={DIMS.map((x) => ({ id: String(x), label: String(x) }))} />
                <div className="mt-3">
                  <Choices label="Stored as" accent={ACCENT} value={d.quant} onChange={(v: Quant) => set({ quant: v })} options={[{ id: "float32", label: "float32" }, { id: "int8", label: "int8" }]} />
                </div>
                <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-4 gap-y-0.5 font-mono text-[11px]">
                  <span className="text-[var(--faint)]">dims</span>
                  <span className="text-right text-[var(--faint)]">float32</span>
                  <span className="text-right text-[var(--faint)]">int8</span>
                  {DIMS.map((x) => [
                    <span key={`${x}a`}>{x}</span>,
                    <span key={`${x}b`} className="text-right">
                      {indexGB({ dims: x, quant: "float32" }).toFixed(0)} GB
                    </span>,
                    <span key={`${x}c`} className="text-right">
                      {indexGB({ dims: x, quant: "int8" }).toFixed(0)} GB
                    </span>,
                  ])}
                </div>
                <p className="mt-1 font-mono text-xs">
                  {p.gb.toFixed(0)} GB → {p.shards} shard{p.shards === 1 ? "" : "s"} × 2 replicas = {p.nodes} nodes of {NODE.ramGB} GB
                </p>
              </FlowStep>
              <FlowArrow label="query" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Keep model calls off the hot path" what="Every query has to be embedded, so that call sits in the latency budget: an external API adds a network round trip, your own small encoder adds a few milliseconds. An LLM rewriting every query blows the budget alone; precompute rewrites for the popular queries instead." accent={ACCENT} active={at(1)}>
                <Choices label="Query embedding" accent={ACCENT} value={d.embed} onChange={(v: Embed) => set({ embed: v })} options={[{ id: "api", label: "Embedding API" }, { id: "self", label: "Own encoder on CPU" }]} />
                <div className="mt-3">
                  <Choices label="Query rewriting" accent={ACCENT} value={d.rewrite} onChange={(v: Rewrite) => set({ rewrite: v })} options={[{ id: "off", label: "Off" }, { id: "live", label: "LLM on every query" }, { id: "offline", label: "Precomputed for top queries" }]} />
                </div>
              </FlowStep>
              <FlowArrow label="vector + words" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Search words and meaning in parallel" what="Run keyword and vector search at the same time and merge the lists, so the slower of the two sets the time, not their sum. Product codes and brand names come from keywords; descriptions of a need come from vectors." accent={ACCENT} active={at(2)}>
                <p className="font-mono text-xs">{p.steps.find((s) => s.id === "search")!.ms} ms for both, across {p.shards} shard{p.shards === 1 ? "" : "s"}</p>
              </FlowStep>
              <FlowArrow label="top 50" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Rerank only the top" what="A cross-encoder reranker reads the query and each candidate together and orders them far better than either search alone. It is too slow for 20 million listings and fine for 50, on a GPU, for about 85 ms." accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.rerank} onChange={(e) => set({ rerank: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Rerank the top 50
                </label>
              </FlowStep>
              <FlowArrow label="results" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Fit the budget, and fail to keyword search" what="Add up the waterfall against the budget and the bill against the gain in relevance. And when the encoder or the vector index is down, answer with keyword results rather than an error: worse results beat no results." accent={ACCENT} active={at(4)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.fallback} onChange={(e) => set({ fallback: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Fall back to keyword search when the vector side fails
                </label>
                <p className="font-mono text-xs" style={{ color: d.fallback ? "var(--good)" : "var(--bad)" }}>
                  vector side down: {d.fallback ? `keyword results (nDCG ${KEYWORD_ONLY_NDCG})` : "search returns an error"}
                </p>
                <Bill d={d} />
                <p className="mt-2 text-[11px] text-[var(--faint)]">Component latencies, prices and relevance (nDCG@10) are typical figures, not measurements. Index size, nodes, the waterfall and the bill are computed from them.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Waterfall({ d }: { d: Design }) {
  const p = plan(d);
  const scale = Math.max(p.p95, BUDGET_MS) * 1.05;
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Latency of one search, step by step, against the budget">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">one search, p95</p>
        <p className="font-mono text-xs" style={{ color: p.fits ? "var(--good)" : "var(--bad)" }}>
          {p.p95} ms of {BUDGET_MS}
        </p>
      </div>
      <div className="relative mt-3 h-6 rounded bg-[var(--track)]">
        <div className="flex h-full overflow-hidden rounded">
          {p.steps.map((s) => (
            <div key={s.id} style={{ width: `${(s.ms / scale) * 100}%`, background: STEP_COLOR[s.id] }} />
          ))}
        </div>
        <div className="absolute inset-y-[-4px] w-0.5" style={{ left: `${(BUDGET_MS / scale) * 100}%`, background: "var(--text)" }} />
      </div>
      <ul className="mt-3 space-y-0.5 text-xs">
        {p.steps.map((s) => (
          <li key={s.id} className="flex justify-between gap-2">
            <span>
              <span style={{ color: STEP_COLOR[s.id] }}>■</span> {s.label}
            </span>
            <span className="font-mono">{s.ms} ms</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat label="index" value={`${p.gb.toFixed(0)} GB`} />
        <Stat label="per month" value={usd(p.total)} />
        <Stat label="nDCG@10" value={p.ndcg.toFixed(2)} />
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[var(--inset)] p-2">
      <p className="font-mono text-base">{value}</p>
      <p className="text-[11px] text-[var(--muted)]">{label}</p>
    </div>
  );
}

function Bill({ d }: { d: Design }) {
  const p = plan(d);
  const rows = [
    ["index nodes", p.cost.index],
    ["query embedding", p.cost.embed],
    ["reranker GPUs", p.cost.rerank],
    ["query rewriting", p.cost.rewrite],
  ] as const;
  return (
    <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 font-mono text-[11px]">
      {rows.map(([k, v]) => [
        <span key={`${k}a`} className="font-sans">
          {k}
        </span>,
        <span key={`${k}b`} className="text-right">
          {usd(v)}
        </span>,
      ])}
      <span className="font-sans font-semibold">total per month</span>
      <span className="text-right font-semibold">{usd(p.total)}</span>
    </div>
  );
}
