"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, Meter, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, type NodeState, type Packet } from "@/components/system/SystemMap";
import { KEYS, NEW_WRITES, ORDERS, QUERIES, SHARDS, layout, route, type Key } from "@/lib/sharding";

const ACCENT = "var(--sys)";
const SHARD_AT: [number, number][] = [[86, 12], [86, 38], [86, 64], [86, 90]];
const SHARD_MOBILE_AT: [number, number][] = [[25, 66], [75, 66], [25, 90], [75, 90]];

export default function ShardingDemo() {
  const [key, setKey] = useState<Key>("hash");
  const [queryId, setQueryId] = useState(QUERIES[0].id);
  const query = QUERIES.find((q) => q.id === queryId)!;
  const { rows, writes } = layout(key);
  const r = route(query, key);
  const { stage, busy, run } = useWalk(3, 900);
  const maxRows = Math.max(...rows.map((x) => x.length));
  const maxWrites = Math.max(...writes);
  const hot = writes.indexOf(maxWrites);
  const hotShare = maxWrites / NEW_WRITES.length;

  const shardState = (i: number): NodeState => {
    if (stage === null) return hotShare > 0.4 && i === hot ? "bad" : "idle";
    if (!r.asked.includes(i)) return "dim";
    return stage >= 1 && r.hits[i] > 0 ? "good" : "active";
  };
  const packets: Packet[] =
    stage === 0 ? [{ id: `q-${key}-${queryId}`, from: "app", to: "router", label: "query" }]
    : stage === 1 ? r.asked.map((i) => ({ id: `s-${key}-${queryId}-${i}`, from: "router", to: `s${i}`, label: "SELECT" }))
    : stage === 2 ? r.asked.map((i) => ({ id: `b-${key}-${queryId}-${i}`, from: `s${i}`, to: "router", label: `${r.hits[i]} rows`, tone: r.hits[i] ? ("good" as const) : undefined }))
    : [];

  const caption =
    stage === null
      ? `Shard key ${KEYS.find((k) => k.id === key)!.label}: rows ${rows.map((x) => x.length).join(" / ")}, new writes ${writes.join(" / ")}. ${hotShare > 0.4 ? `Shard ${hot + 1} takes ${Math.round(hotShare * 100)}% of new writes: a hot shard.` : "Load is spread."}`
      : r.scatter
        ? `The query doesn't include the shard key, so the router asks all ${SHARDS} shards and merges ${r.total} ${r.total === 1 ? "row" : "rows"}.`
        : `The query includes the shard key, so the router asks only shard ${r.asked[0] + 1}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="System design · interactive"
        title="Sharding: choosing the shard key"
        blurb={`One orders table is too big for one database, so it's split across ${SHARDS} shards. The shard key decides where every row lives, which shard takes the new writes, and how many shards each query has to ask.`}
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-4">
              <SystemMap
                title="An app, a shard router and four database shards"
                accent={ACCENT}
                chrome="split"
                nodes={[
                  { id: "app", label: "App", sub: query.sql, at: [12, 50], mobileAt: [50, 10], state: stage === 0 ? "active" : "idle" },
                  { id: "router", label: "Shard router", sub: KEYS.find((k) => k.id === key)!.label, at: [46, 50], mobileAt: [50, 38], state: stage !== null ? "active" : "idle" },
                  ...rows.map((rs, i) => ({ id: `s${i}`, label: `Shard ${i + 1}`, sub: `${rs.length} rows · +${writes[i]}/day`, at: SHARD_AT[i], mobileAt: SHARD_MOBILE_AT[i], state: shardState(i) })),
                ]}
                links={[
                  { from: "app", to: "router", label: "query" },
                  ...rows.map((_, i) => ({ from: "router", to: `s${i}`, label: "SELECT", dim: stage !== null && !r.asked.includes(i) })),
                ]}
                packets={packets}
                aspect={1.9}
                mobileAspect={0.9}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Rows and new writes per shard">
                <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
                  <span />
                  <span className="text-xs text-[var(--faint)]">rows stored</span>
                  <span className="text-xs text-[var(--faint)]">new writes today</span>
                  {rows.map((rs, i) => (
                    <div key={i} className="contents">
                      <span className="font-mono text-xs">Shard {i + 1}</span>
                      <span className="flex items-center gap-2">
                        <span className="min-w-0 flex-1"><Meter value={rs.length} max={maxRows} color="var(--c1)" /></span>
                        <span className="w-6 text-right font-mono text-xs">{rs.length}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="min-w-0 flex-1"><Meter value={writes[i]} max={Math.max(maxWrites, 1)} color={i === hot && hotShare > 0.4 ? "var(--bad)" : "var(--c3)"} /></span>
                        <span className="w-6 text-right font-mono text-xs">{writes[i]}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <Choices label="Shard key" accent={ACCENT} value={key} onChange={setKey} options={KEYS.map((k) => ({ id: k.id, label: k.label }))} />
              <p className="w-full font-mono text-xs text-[var(--faint)]">{KEYS.find((k) => k.id === key)!.rule}</p>
              <Choices label="Query" accent={ACCENT} value={queryId} onChange={setQueryId} options={QUERIES.map((q) => ({ id: q.id, label: q.label }))} />
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Querying…">
                Run the query
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Pick a shard key" what="A column every row has, used to decide its shard. It is very hard to change later: every row would have to move." accent={ACCENT}>
                <p className="font-mono text-sm">{KEYS.find((k) => k.id === key)!.rule}</p>
              </FlowStep>
              <FlowArrow label={`${ORDERS.length} rows`} accent={ACCENT} />

              <FlowStep n={2} title="Each row goes to one shard" what="Hashing spreads rows evenly. A natural key like country or date keeps related rows together, but only as evenly as the data itself." accent={ACCENT}>
                <p className="text-sm">
                  Rows per shard: {rows.map((x) => x.length).join(" / ")} (ideal {ORDERS.length / SHARDS} each)
                </p>
              </FlowStep>
              <FlowArrow label="new orders keep coming" accent={ACCENT} />

              <FlowStep n={3} title="Watch where new writes land" what="A range key on time sends every new write to the newest shard. A key with one big value (one busy country) makes one shard hot while others idle." accent={ACCENT} active={stage === null && hotShare > 0.4}>
                <p className="text-sm" style={{ color: hotShare > 0.4 ? "var(--bad)" : undefined }}>
                  Shard {hot + 1} takes {Math.round(hotShare * 100)}% of today&apos;s writes{hotShare > 0.4 ? ": a hot shard." : "."}
                </p>
              </FlowStep>
              <FlowArrow label="a query" accent={ACCENT} />

              <FlowStep n={4} title="Queries with the key hit one shard" what="If the WHERE clause names the shard key, the router knows exactly which shard to ask." accent={ACCENT} active={stage !== null && !r.scatter}>
                <p className="text-sm">{r.scatter ? "This query doesn't name the key." : `Asked shard ${r.asked[0] + 1} only.`}</p>
              </FlowStep>
              <FlowArrow label="otherwise" accent={ACCENT} />

              <FlowStep n={5} title="Other queries scatter to every shard" what="Without the key, the router asks all shards and merges the answers. It works, but the slowest shard sets the speed, and every shard does the work." accent={ACCENT} active={stage !== null && r.scatter}>
                <p className="text-sm">
                  Asked {r.asked.length} of {SHARDS} shards · {r.total} matching rows
                </p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
