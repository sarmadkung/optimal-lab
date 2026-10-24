"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { DBS, FIRST, NODE_RAM_GB, evaluate, type Db, type Design, type Quant } from "@/lib/vectorDbs";

const ACCENT = "var(--tools)";
const gbText = (gb: number) => (gb < 1 ? `${Math.round(gb * 1024)} MB` : `${gb.toFixed(gb < 10 ? 1 : 0)} GB`);

export default function VectorDbsDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const r = evaluate(d);
  const pct = `${d.selectivity * 100 >= 1 ? (d.selectivity * 100).toFixed(0) : (d.selectivity * 100).toFixed(1)}%`;

  const nodes: MapNode[] = [
    { id: "app", label: "Your app", sub: "top 10 in a workspace", at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "embed", label: "Embedding model", sub: `${d.dims} dimensions`, at: [50, 18], mobileAt: [75, 12], state: "active" },
    { id: "db", label: r.db.label, sub: r.db.run, at: [86, 50], mobileAt: [75, 44], state: r.fitsNode || d.db !== "pgvector" ? "good" : "wait" },
    { id: "index", label: "HNSW index", sub: gbText(r.gb), at: [50, 82], mobileAt: [25, 44], state: r.fitsNode ? "good" : "wait" },
    { id: "pg", label: "App data", sub: d.db === "pgvector" ? "same Postgres" : "Postgres, kept in sync", at: [14, 82], mobileAt: [25, 76], state: d.db === "pgvector" ? "good" : "wait" },
    { id: "filter", label: "Workspace filter", sub: `${pct} of vectors match`, at: [86, 86], mobileAt: [75, 76], state: r.f.returned < d.k ? "bad" : "good" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("q", ["app", "embed"], { label: "the question" })
    : stage === 1 ? hops("v", ["embed", "db"], { label: `${d.dims}-dim vector` })
    : stage === 2 ? hops("i", ["db", "index"], { label: `walk ${r.f.scanned.toLocaleString("en-US")} candidates` })
    : stage === 3 ? hops("f", ["index", "filter", "db"], { label: `${r.f.returned} match${r.f.returned === 1 ? "" : "es"}`, tone: r.f.returned < d.k ? "bad" : "good" })
    : stage === 4 ? hops("a", ["db", "app"], { label: `${r.f.returned} results`, tone: r.f.returned < d.k ? "bad" : "good" })
    : [];

  const captions = [
    "Step 1: a user asks a question inside one customer's workspace; it's embedded into a vector.",
    `Step 2: the vector goes to ${r.db.label}.`,
    `Step 3: the HNSW index (${gbText(r.gb)} for ${d.vectors.toLocaleString("en-US")} vectors) walks toward the nearest neighbours.`,
    `Step 4: only ${pct} of vectors belong to this workspace: ${r.db.filterNote}.`,
    r.f.returned < d.k ? `Step 5: ${r.f.returned} of ${d.k} results come back.` : `Step 5: all ${d.k} results come back; a plain post-filter would have returned about ${r.naive.returned}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${gbText(r.gb)} index (${r.fitsNode ? `fits a ${NODE_RAM_GB} GB server` : `too big for one ${NODE_RAM_GB} GB server`}) · ${r.f.returned} of ${d.k} filtered results · a naive post-filter would return ${r.naive.returned}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="Tools · interactive"
        title="Vector databases"
        blurb="pgvector, Pinecone, Qdrant and Weaviate all store embeddings and find the nearest ones. What separates them for your app is three numbers (how many vectors, how many dimensions, how selective your filters are) and how you want to run them. Size your index and run a filtered search."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Your app, an embedding model, the vector database, its HNSW index, your app data and a workspace filter"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "app", to: "embed", label: "text" },
                  { from: "embed", to: "db", label: "vector" },
                  { from: "db", to: "index", label: "search" },
                  { from: "index", to: "filter", label: "candidates" },
                  { from: "pg", to: "db", label: d.db === "pgvector" ? "same DB" : "sync", dim: d.db === "pgvector" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="The four databases compared">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">the four, for this workload</p>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {DBS.map((x) => {
                    const e = evaluate({ ...d, db: x.id });
                    return (
                      <li key={x.id} className="rounded-md border p-2 text-[11px]" style={{ borderColor: x.id === d.db ? ACCENT : "var(--line)" }}>
                        <p className="text-xs font-semibold">{x.label}</p>
                        <p className="text-[var(--muted)]">{x.run}</p>
                        <p className="mt-1" style={{ color: e.f.returned < d.k ? "var(--bad)" : "var(--good)" }}>
                          filtered search: {e.f.returned}/{d.k}
                        </p>
                        <ul className="mt-1 list-disc pl-4 text-[var(--muted)]">
                          {x.traits.map((t) => (
                            <li key={t}>{t}</li>
                          ))}
                        </ul>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices<Db> label="Database" accent={ACCENT} value={d.db} onChange={(v) => set({ db: v })} options={DBS.map((x) => ({ id: x.id, label: x.label }))} />
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Searching…">
                Run a filtered search
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Count your vectors" what="One vector per chunk. A help centre is thousands; every customer's documents in a SaaS product can be hundreds of millions. This number decides most of the rest." accent={ACCENT} active={at(0)}>
                <Choices label="Vectors" accent={ACCENT} value={String(d.vectors)} onChange={(v) => set({ vectors: Number(v) })} options={[{ id: "100000", label: "100 thousand" }, { id: "5000000", label: "5 million" }, { id: "100000000", label: "100 million" }]} />
              </FlowStep>
              <FlowArrow label="× dimensions" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Multiply by dimensions and bytes" what="Each vector is dimensions × 4 bytes as float32, plus the HNSW graph's links (about 40% more here). Quantizing to int8 or binary shrinks it 4× or 32×; binary usually needs a rescoring pass on full vectors kept on disk." accent={ACCENT} active={at(1)}>
                <Choices label="Dimensions" accent={ACCENT} value={String(d.dims)} onChange={(v) => set({ dims: Number(v) })} options={[{ id: "384", label: "384" }, { id: "1536", label: "1,536" }, { id: "3072", label: "3,072" }]} />
                <div className="mt-2">
                  <Choices<Quant> label="Stored as" accent={ACCENT} value={d.quant} onChange={(v) => set({ quant: v })} options={[{ id: "float32", label: "float32" }, { id: "int8", label: "int8" }, { id: "binary", label: "binary" }]} />
                </div>
                <p className="mt-2 font-mono text-[11px]" style={{ color: r.fitsNode ? "var(--good)" : "var(--c2)" }}>
                  index in memory: {gbText(r.gb)} {r.fitsNode ? `· fits a ${NODE_RAM_GB} GB server` : `· more than a ${NODE_RAM_GB} GB server should hold`}
                </p>
              </FlowStep>
              <FlowArrow label="an index" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Decide how you want to run it" what="pgvector lives in the Postgres you already back up, with joins and transactions over your app data. Pinecone is nothing to operate. Qdrant and Weaviate run anywhere, and are one more system to keep in sync with your data." accent={ACCENT} active={at(2)}>
                <p className="text-xs">{r.db.label}: {r.db.run}.</p>
              </FlowStep>
              <FlowArrow label="a filtered query" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Test filters at your real selectivity" what={`Most real queries are filtered (this customer, this language, documents this user may see). An index that finds ${d.ef} nearest candidates and then filters returns almost nothing when 1% match. Engines that filter during the search, or keep scanning, return the full ${d.k}.`} accent={ACCENT} active={at(3)}>
                <Choices label="Share of vectors the filter keeps" accent={ACCENT} value={String(d.selectivity)} onChange={(v) => set({ selectivity: Number(v) })} options={[{ id: "1", label: "100%" }, { id: "0.1", label: "10%" }, { id: "0.01", label: "1%" }, { id: "0.001", label: "0.1%" }]} />
                <p className="mt-2 font-mono text-[11px] text-[var(--muted)]">plain post-filter: {r.naive.note}</p>
                <p className="font-mono text-[11px]" style={{ color: r.f.returned < d.k ? "var(--bad)" : "var(--good)" }}>
                  {r.db.label}: {r.f.note}
                </p>
              </FlowStep>
              <FlowArrow label="results" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Choose by your numbers" what="Millions of vectors with your app data in Postgres: pgvector. No one to run a database: a managed service. Hundreds of millions, heavy filtering or built-in hybrid search: a dedicated vector database." accent={ACCENT} active={at(4)}>
                <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-xs">
                  <dt>Index size</dt>
                  <dd className="text-right font-mono">{gbText(r.gb)}</dd>
                  <dt>Filtered results</dt>
                  <dd className="text-right font-mono" style={{ color: r.f.returned < d.k ? "var(--bad)" : "var(--good)" }}>{r.f.returned} / {d.k}</dd>
                  <dt>Candidates examined</dt>
                  <dd className="text-right font-mono">{r.f.scanned.toLocaleString("en-US")}</dd>
                </dl>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Index memory and the filter arithmetic run here; product traits are summarised from each project&apos;s docs and change between versions.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
