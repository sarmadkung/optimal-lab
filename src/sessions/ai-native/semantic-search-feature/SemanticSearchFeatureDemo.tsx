"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type Packet } from "@/components/system/SystemMap";
import { METHODS, QUERIES, RRF_K, THRESHOLD, scoreAll, search, type Method } from "@/lib/productSearch";

const ACCENT = "var(--native)";

export default function SemanticSearchFeatureDemo() {
  const [method, setMethod] = useState<Method>("keyword");
  const [qid, setQid] = useState("q3");
  const [filters, setFilters] = useState(false);
  const [threshold, setThreshold] = useState(false);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const q = QUERIES.find((x) => x.id === qid)!;
  const o = { method, filters, threshold };
  const r = search(q, o);
  const all = scoreAll({ filters, threshold }, method);
  const usesKw = method !== "semantic";
  const usesVec = method !== "keyword";
  const hasFilters = Object.keys(r.filters).length > 0;
  const topName = r.top[0]?.p.name;

  const packets: Packet[] =
    stage === 0 ? hops("q", ["box", "parser"], { label: `“${q.text}”` })
    : stage === 1 ? [...(usesKw ? hops("k", ["parser", "kw"], { label: r.text || "(empty)" }) : []), ...(usesVec ? hops("v", ["parser", "vec"], { label: "query vector" }) : [])]
    : stage === 2 ? [...(usesKw ? hops("k2", ["kw", "rank"], { label: "word matches" }) : []), ...(usesVec ? hops("v2", ["vec", "rank"], { label: "nearest" }) : [])]
    : stage === 3 ? hops("t", ["rank", "box"], { label: r.noMatch ? "no good match" : r.empty ? "0 results" : (topName ?? ""), tone: r.success ? "good" : "bad" })
    : stage === 4 ? hops("log", ["box", "rank"], { label: `${all.right}/${QUERIES.length} right` })
    : [];

  const captions = [
    `Step 1: a shopper types “${q.text}”.`,
    filters && hasFilters ? `Step 2: the parser pulls out ${describeFilters(r.filters)} and keeps ${r.pool} of 14 products; the rest of the words are matched.` : `Step 2: ${filters ? "no filter words found; " : ""}the whole query is matched against all 14 products.`,
    `Step 3: ${method === "keyword" ? "words are matched against names and descriptions" : method === "semantic" ? "the query vector is compared with every product's vector" : "both run, and their two rankings are merged"}.`,
    r.noMatch ? `Step 4: the best similarity is ${r.bestSem.toFixed(2)}, under ${THRESHOLD}, so the page says there's no good match.` : r.empty ? "Step 4: no product contains those words: zero results." : `Step 4: the top result is ${topName}, ${r.success ? "what the shopper wanted" : "not what the shopper wanted"}.`,
    `Step 5: over the ${QUERIES.length} logged queries, ${METHODS.find((m) => m.id === method)!.label.toLowerCase()} search gets ${all.right} right, ${all.zero} with zero results, ${all.junk} showing junk for a product the shop doesn't sell.`,
  ];
  const caption = stage !== null ? captions[stage] : `“${q.text}” · ${r.noMatch ? "no good match shown" : r.empty ? "zero results" : `top: ${topName}`} · ${r.success ? "right" : "wrong"}. ${q.why}`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Native · interactive"
        title="Search that understands meaning"
        blurb="Shoppers type “torch” for a headlamp, “something to keep me dry on a hike” for a rain jacket, and a product code when they know it. Keyword search returns nothing for the first; semantic search fumbles the code and recommends a dry bag for a kayak the shop doesn't sell. Run eight real queries through each and fix what breaks."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Search box, query parser, keyword index, vector index and ranking"
                accent={ACCENT}
                chrome="split"
                nodes={[
                  { id: "box", label: "Search box", sub: r.noMatch ? "no good match" : r.empty ? "0 results" : `${r.top.length} shown`, at: [12, 20], mobileAt: [22, 8], state: r.success ? "good" : "bad" },
                  { id: "parser", label: "Query parser", sub: filters ? (hasFilters ? describeFilters(r.filters) : "no filters") : "off", at: [36, 50], mobileAt: [64, 27], state: filters ? "active" : "idle" },
                  { id: "kw", label: "Keyword index", sub: usesKw ? "BM25" : "not used", at: [60, 18], mobileAt: [24, 51], state: usesKw ? "active" : "dim" },
                  { id: "vec", label: "Vector index", sub: usesVec ? "cosine" : "not used", at: [60, 82], mobileAt: [76, 51], state: usesVec ? "active" : "dim" },
                  { id: "rank", label: "Rank", sub: method === "hybrid" ? "fusion" : threshold && usesVec ? `≥ ${THRESHOLD}` : "sort", at: [86, 50], mobileAt: [50, 75], state: "active" },
                ]}
                links={[
                  { from: "box", to: "parser", label: "query" },
                  { from: "parser", to: "kw", label: "words", dim: !usesKw },
                  { from: "parser", to: "vec", label: "vector", dim: !usesVec },
                  { from: "kw", to: "rank", label: "matches", dim: !usesKw },
                  { from: "vec", to: "rank", label: "nearest", dim: !usesVec },
                  { from: "rank", to: "box", label: "results" },
                ]}
                packets={packets}
                aspect={1.5}
                mobileAspect={0.85}
              />
              <Results qid={qid} setQid={setQid} method={method} filters={filters} threshold={threshold} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices label="Search with" accent={ACCENT} value={method} onChange={setMethod} options={METHODS.map((m) => ({ id: m.id, label: m.label }))} />
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Searching…">
                Search
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Start from what people actually type" what="Pull a few hundred queries from the search log, especially the ones that got zero results or no click. They are the test set: a mix of product names, descriptions of a need, other words for the same thing, product codes and things you don't sell." accent={ACCENT} active={at(0)}>
                <p className="rounded-md bg-[var(--inset)] p-2 font-mono text-xs">“{q.text}”</p>
                <p className="mt-2 text-xs text-[var(--muted)]">{q.why}</p>
              </FlowStep>
              <FlowArrow label="query" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Pull out the hard filters" what="“Under $200” and “2 person” are not meaning to match, they are rules. Similarity ranks a $420 tent above a $189 one because it reads like a better tent. Parse limits like these into filters, apply them first, and match the rest of the words." accent={ACCENT} active={at(1)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={filters} onChange={(e) => setFilters(e.target.checked)} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Parse price and size into filters
                </label>
                <p className="font-mono text-[11px] text-[var(--muted)]">
                  {filters ? (hasFilters ? `${JSON.stringify(r.filters)} → ${r.pool} of 14 products · match “${r.text}”` : "no filter words in this query") : "off: every word is matched, every product is a candidate"}
                </p>
              </FlowStep>
              <FlowArrow label="words + vector" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Match the words, the meaning, or both" what="Keyword search finds exact terms and codes and fails on other words for the same thing. Semantic search embeds the query and finds products that mean something close, and treats a product code as just another number. Hybrid runs both." accent={ACCENT} active={at(2)}>
                <Choices label="Search with" accent={ACCENT} value={method} onChange={setMethod} options={METHODS.map((m) => ({ id: m.id, label: m.label }))} />
                <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 gap-y-0.5 font-mono text-[11px]">
                  <span className="text-[var(--faint)]">product</span>
                  <span className="text-right text-[var(--faint)]">keyword</span>
                  <span className="text-right text-[var(--faint)]">similarity</span>
                  {search(q, { ...o, method: "hybrid", threshold: false })
                    .top
                    .map((h) => [
                      <span key={`${h.p.sku}n`} className="min-w-0 truncate">
                        {h.p.name}
                      </span>,
                      <span key={`${h.p.sku}k`} className="text-right">
                        {h.kw ? h.kw.toFixed(1) : "–"}
                      </span>,
                      <span key={`${h.p.sku}s`} className="text-right">
                        {h.sem.toFixed(2)}
                      </span>,
                    ])}
                </div>
              </FlowStep>
              <FlowArrow label="two rankings" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Merge, and know when to say no" what={`Hybrid merges the two rankings with reciprocal rank fusion: each product scores 1/(${RRF_K} + rank) from each list. Semantic search always has a nearest product, even for “kayak”; below a similarity threshold, say there's no good match and offer a category instead.`} accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={threshold} onChange={(e) => setThreshold(e.target.checked)} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Say “no good match” below {THRESHOLD} similarity
                </label>
                <p className="font-mono text-[11px] text-[var(--muted)]">
                  {method === "keyword" ? (r.empty ? "keyword search: no word matched, so 0 results" : `keyword search has no similarity to test; top: ${topName}`) : `best similarity ${r.bestSem.toFixed(2)} · ${r.noMatch ? "below the threshold: no results shown" : `top: ${topName}`}`}
                </p>
              </FlowStep>
              <FlowArrow label="results + clicks" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Score it on the logged queries" what="Count queries whose first result is right, zero-result pages, and junk shown for things you don't sell. No single method wins every row: many shops send code-shaped queries to exact lookup and everything else to hybrid, then keep watching the zero-result and no-click queries." accent={ACCENT} active={at(4)}>
                <Scoreboard filters={filters} threshold={threshold} method={method} />
                <p className="mt-2 text-[11px] text-[var(--faint)]">Keyword scoring, filters, fusion and the threshold run for real. Similarities are illustrative; a real system gets them from an embedding model.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function describeFilters(f: { maxPrice?: number; people?: number }) {
  return [f.maxPrice !== undefined ? `price ≤ $${f.maxPrice}` : "", f.people !== undefined ? `${f.people} people` : ""].filter(Boolean).join(", ");
}

function Results({ qid, setQid, method, filters, threshold }: { qid: string; setQid: (id: string) => void; method: Method; filters: boolean; threshold: boolean }) {
  const q = QUERIES.find((x) => x.id === qid)!;
  const r = search(q, { method, filters, threshold });
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Search results for the chosen query">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">queries from the search log</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {QUERIES.map((x) => {
          const ok = search(x, { method, filters, threshold }).success;
          const on = x.id === qid;
          return (
            <button
              key={x.id}
              type="button"
              aria-pressed={on}
              onClick={() => setQid(x.id)}
              className="min-h-11 rounded-md border px-2.5 text-left text-xs"
              style={{ borderColor: on ? ACCENT : "var(--line)", background: on ? `color-mix(in srgb, ${ACCENT} 14%, transparent)` : "transparent" }}
            >
              <span style={{ color: ok ? "var(--good)" : "var(--bad)" }}>{ok ? "✓" : "✗"}</span> {x.text}
            </button>
          );
        })}
      </div>
      <div className="mt-3 rounded-md bg-[var(--inset)] p-3">
        <p className="font-mono text-xs text-[var(--muted)]">search: {q.text}</p>
        {r.noMatch ? (
          <p className="mt-2 text-sm">No good match for “{q.text}”. Browse a category, or tell us what you were looking for.</p>
        ) : r.empty ? (
          <p className="mt-2 text-sm text-[var(--bad)]">0 results</p>
        ) : (
          <ol className="mt-2 space-y-1">
            {r.top.map((h, i) => {
              const want = q.want.includes(h.p.sku);
              return (
                <li key={h.p.sku} className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-baseline gap-2 text-sm">
                  <span className="font-mono text-xs text-[var(--faint)]">{i + 1}</span>
                  <span className="min-w-0">
                    {h.p.name} <span className="font-mono text-[11px] text-[var(--faint)]">#{h.p.sku}</span>
                  </span>
                  <span className="font-mono text-xs" style={{ color: want ? "var(--good)" : "var(--muted)" }}>
                    ${h.p.price}
                    {want ? " ✓" : ""}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

function Scoreboard({ filters, threshold, method }: { filters: boolean; threshold: boolean; method: Method }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] gap-x-3 gap-y-0.5 font-mono text-[11px]">
      <span className="text-[var(--faint)]">method</span>
      <span className="text-right text-[var(--faint)]">right</span>
      <span className="text-right text-[var(--faint)]">0 results</span>
      <span className="text-right text-[var(--faint)]">junk</span>
      <span className="text-right text-[var(--faint)]">time</span>
      {METHODS.map((m) => {
        const s = scoreAll({ filters, threshold }, m.id);
        const on = m.id === method;
        return [
          <span key={`${m.id}a`} style={{ fontWeight: on ? 600 : 400, color: on ? "var(--text)" : "var(--muted)" }}>
            {m.label}
          </span>,
          <span key={`${m.id}b`} className="text-right">
            {s.right}/{QUERIES.length}
          </span>,
          <span key={`${m.id}c`} className="text-right" style={{ color: s.zero ? "var(--bad)" : "var(--text)" }}>
            {s.zero}
          </span>,
          <span key={`${m.id}d`} className="text-right" style={{ color: s.junk ? "var(--bad)" : "var(--text)" }}>
            {s.junk}
          </span>,
          <span key={`${m.id}e`} className="text-right">
            {m.ms} ms
          </span>,
        ];
      })}
    </div>
  );
}
