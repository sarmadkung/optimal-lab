"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { DOCS, FIRST, FIXED, INDEX_GB, NODES, analyze, mappingChange, searchSku, sizing, type Design, type Mapping } from "@/lib/searchEngines";

const ACCENT = "var(--tools)";
const QUERY = "AB-1234-X";

export default function SearchEnginesDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const z = sizing(d);
  const exact = searchSku(QUERY, d.skuMapping, "term");
  const fuzzy = searchSku(QUERY, d.skuMapping, "match");
  const facetsOk = d.skuMapping !== "text";
  const mc = mappingChange(d);

  const nodes: MapNode[] = [
    { id: "app", label: "Shop search", sub: `“${QUERY}”`, at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "alias", label: d.alias ? "Alias products" : "Index products", sub: d.alias ? "→ products_v2" : "queried by name", at: [50, 18], mobileAt: [75, 12], state: d.alias ? "good" : "wait" },
    ...[0, 1, 2].map((i) => ({ id: `n${i}`, label: `Node ${i + 1}`, sub: `${Math.ceil((z.copies - i) / NODES)} shard cop${Math.ceil((z.copies - i) / NODES) === 1 ? "y" : "ies"}`, at: [86, 16 + i * 34] as [number, number], mobileAt: [18 + i * 32, 46] as [number, number], state: (Math.ceil((z.copies - i) / NODES) > 0 ? "active" : "dim") as MapNode["state"] })),
    { id: "writer", label: "Price updates", sub: `refresh every ${d.refreshS} s`, at: [14, 82], mobileAt: [50, 82], state: d.refreshS >= 30 ? "good" : "wait" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("q", ["app", "alias"], { label: "term sku" })
    : stage === 1 ? [0, 1, 2].slice(0, Math.min(NODES, z.copies)).flatMap((i) => hops(`s${i}`, ["alias", `n${i}`], { label: "shard", start: i * 0.15 }))
    : stage === 2 ? hops("r", ["n0", "alias", "app"], { label: exact.length ? `${exact.length} hit` : "0 hits", tone: exact.length === 1 ? "good" : "bad" })
    : stage === 3 ? hops("w", ["writer", "alias", "n0"], { label: `visible in ${d.refreshS} s` })
    : stage === 4 ? hops("m", ["writer", "alias"], { label: d.alias ? "swap alias" : "delete + reindex", tone: d.alias ? "good" : "bad" })
    : [];

  const captions = [
    `Step 1: a customer pastes the SKU ${QUERY} into search.`,
    `Step 2: the query fans out to ${d.shards} shard${d.shards > 1 ? "s" : ""}, each ${z.shardGb.toFixed(0)} GB, with ${d.replicas} replica${d.replicas === 1 ? "" : "s"} each.`,
    exact.length === 1 ? "Step 3: the exact SKU is found." : `Step 3: the sku field was analysed into ${analyze(QUERY).map((t) => `“${t}”`).join(", ")}, so the exact term matches nothing.`,
    `Step 4: tonight's price updates become searchable within ${d.refreshS} s of being written.`,
    d.alias ? "Step 5: a mapping change is a new index plus an atomic alias swap; search never stops." : `Step 5: a mapping change means deleting the index the app queries by name and reindexing: about ${mc.downtime} minutes with no search.`,
  ];
  const caption = stage !== null ? captions[stage] : `Exact SKU: ${exact.length === 1 ? "found" : "not found"} · facets by SKU: ${facetsOk ? "work" : "error"} · ${z.shardGb.toFixed(0)} GB shards · ${z.survivesNode ? "survives a node loss" : "a lost node loses data"} · mapping change: ${mc.downtime ? `${mc.downtime} min down` : "no downtime"}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="Tools · interactive"
        title="Search engines"
        blurb="Elasticsearch and OpenSearch keep an inverted index of analysed terms, split into shards and copied into replicas. A shop indexes 2 million products (60 GB). Whether pasting a SKU finds it, whether facets work, whether a node can die, and whether you can change a mapping without an outage are all decided before the first search."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Shop search, an index alias, three cluster nodes holding shards, and the price update writer"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[{ from: "app", to: "alias", label: "search" }, ...[0, 1, 2].map((i) => ({ from: "alias", to: `n${i}`, label: "shards" })), { from: "writer", to: "alias", label: "bulk" }]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.95}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="What the sku field stores and what each query returns">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">sku field · {d.skuMapping === "both" ? "keyword + text sub-field" : d.skuMapping}</p>
                <ul className="mt-2 space-y-0.5 font-mono text-[11px]">
                  {DOCS.map((doc) => (
                    <li key={doc.id} className="flex flex-wrap gap-x-2">
                      <span>{doc.sku}</span>
                      <span className="text-[var(--faint)]">→ {d.skuMapping === "text" ? analyze(doc.sku).join(" · ") : d.skuMapping === "keyword" ? doc.sku : `${doc.sku} | ${analyze(doc.sku).join(" · ")}`}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs">
                  term “{QUERY}”: <span style={{ color: exact.length === 1 ? "var(--good)" : "var(--bad)" }}>{exact.length ? exact.map((x) => x.sku).join(", ") : "no hits"}</span>
                </p>
                <p className="text-xs">
                  match “{QUERY}”: <span className="text-[var(--muted)]">{fuzzy.map((x) => x.sku).join(", ") || "no hits"}</span>
                </p>
                <p className="text-xs">
                  facet by sku: <span style={{ color: facetsOk ? "var(--good)" : "var(--bad)" }}>{facetsOk ? "works" : "error: text fields can't be aggregated by default"}</span>
                </p>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Dynamic defaults
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Mapped and sized
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Searching…">
                Search for the SKU
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Map each field on purpose" what="Left to dynamic mapping, a string becomes analysed text: split into lower-case words, which is right for names and wrong for SKUs, ids and enums. Map those as keyword (exact), or both: a keyword field with a text sub-field for partial matches." accent={ACCENT} active={at(0)}>
                <Choices<Mapping> label="sku mapping" accent={ACCENT} value={d.skuMapping} onChange={(v) => set({ skuMapping: v })} options={[{ id: "text", label: "text (dynamic default)" }, { id: "keyword", label: "keyword" }, { id: "both", label: "keyword + text" }]} />
              </FlowStep>
              <FlowArrow label="documents" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Size the shards" what={`A shard is a self-contained index. Common guidance is tens of GB each: one ${INDEX_GB} GB shard is slow to move and recover, hundreds of tiny ones waste memory. The shard count is fixed when the index is created.`} accent={ACCENT} active={at(1)}>
                <Choices label="Primary shards" accent={ACCENT} value={String(d.shards)} onChange={(v) => set({ shards: Number(v) })} options={[{ id: "1", label: "1" }, { id: "3", label: "3" }, { id: "30", label: "30" }]} />
                <p className="mt-2 font-mono text-[11px]" style={{ color: z.shardOk ? "var(--good)" : "var(--c2)" }}>
                  {z.shardGb.toFixed(z.shardGb < 10 ? 1 : 0)} GB per shard
                </p>
              </FlowStep>
              <FlowArrow label="copies" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Add replicas for failure and reads" what="A replica is a full copy of each shard on another node. Without one, losing a node loses data and search. Replicas also serve searches, so they add read capacity." accent={ACCENT} active={at(2)}>
                <Choices label="Replicas" accent={ACCENT} value={String(d.replicas)} onChange={(v) => set({ replicas: Number(v) })} options={[{ id: "0", label: "0" }, { id: "1", label: "1" }, { id: "2", label: "2" }]} />
                <p className="mt-2 font-mono text-[11px]" style={{ color: z.survivesNode ? "var(--good)" : "var(--bad)" }}>
                  {z.copies} shard copies on {NODES} nodes · {z.survivesNode ? "survives losing a node" : "a lost node loses data"}
                </p>
              </FlowStep>
              <FlowArrow label="writes" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Set the refresh interval for your writes" what="Search is near real-time: new documents become searchable at the next refresh, 1 s by default, and each refresh writes a small segment to merge later. For bulk price updates, refreshing every 30 s (or off during the load) is much cheaper." accent={ACCENT} active={at(3)}>
                <Choices label="Refresh interval" accent={ACCENT} value={String(d.refreshS)} onChange={(v) => set({ refreshS: Number(v) })} options={[{ id: "1", label: "1 s" }, { id: "30", label: "30 s" }]} />
                <p className="mt-2 font-mono text-[11px] text-[var(--muted)]">{z.segmentsPerHour.toLocaleString("en-US")} new segments an hour while writing</p>
              </FlowStep>
              <FlowArrow label="mapping change" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Query an alias, so you can reindex" what="Mappings of existing fields can't be changed in place; changing one means a new index and a reindex. If the app queries an alias, you build the new index beside the old one and switch the alias in one atomic call." accent={ACCENT} active={at(4)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.alias} onChange={(e) => set({ alias: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  The app searches an alias, not an index name
                </label>
                <ol className="list-decimal space-y-0.5 pl-4 text-[11px] text-[var(--muted)]">
                  {mc.steps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The standard analyzer, term and match queries, shard sizes and the alias swap run here; throughput figures are illustrative.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
