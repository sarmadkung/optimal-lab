"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type NodeState, type Packet } from "@/components/system/SystemMap";
import {
  COMMUNITIES,
  ENTITIES,
  FACTS,
  HOPS,
  MODES,
  QUESTIONS,
  TOP_K,
  answer,
  entity,
  factText,
  retrieve,
  vectorSearch,
  walk,
  type Context,
  type Entity,
  type Mode,
} from "@/lib/graphRag";

const ACCENT = "var(--ai)";
const KIND_COLOR: Record<Entity["kind"], string> = {
  service: "var(--c1)",
  team: "var(--c2)",
  person: "var(--c3)",
  incident: "var(--c4)",
  vendor: "var(--c5)",
};

export default function GraphRagDemo() {
  const [qId, setQId] = useState(QUESTIONS[1].id);
  const [mode, setMode] = useState<Mode>("graph");
  const [hopsN, setHopsN] = useState(2);
  const { stage, busy, run } = useWalk(5, 1100);
  const q = QUESTIONS.find((x) => x.id === qId)!;
  const ctx = retrieve(q, mode, hopsN);
  const a = answer(q, ctx);
  const w = walk(q.text, hopsN);
  const hits = vectorSearch(q.text);
  const at = (n: number) => stage === n;
  const store = mode === "vector" ? "vec" : mode === "graph" ? "graph" : "comm";

  const used = (id: string): NodeState => (id !== store ? "dim" : stage === 2 ? "active" : "idle");
  const packets: Packet[] =
    stage === 0 ? hops("q", ["user", "app"], { label: "question" })
    : stage === 1 && mode === "graph" ? hops("link", ["app", "llm", "app"], { label: "names?" })
    : stage === 2 ? hops(`get-${mode}-${hopsN}`, ["app", store, "app"], { label: mode === "vector" ? `top ${TOP_K}` : mode === "graph" ? `${hopsN} ${hopsN === 1 ? "hop" : "hops"}` : `${COMMUNITIES.length} summaries` })
    : stage === 4 ? hops("ans", ["app", "llm"], { label: `${ctx.lines.length} lines`, tone: a.right ? "good" : "bad" })
    : [];

  const captions = [
    `Step 1: “${q.text}”`,
    mode === "vector"
      ? "Step 2: the question becomes an embedding. Nothing else is needed to start."
      : mode === "graph"
        ? w.seeds.length
          ? `Step 2: a model call finds names in the question: ${w.seeds.map((s) => entity(s).label).join(", ")}. The walk starts there.`
          : "Step 2: no service, team or person is named in the question, so the walk has nowhere to start."
        : "Step 2: a question about everything needs no starting point. The app reads every community summary.",
    mode === "vector"
      ? `Step 3: the ${TOP_K} closest notes come back: ${hits.map((h) => h.doc.title).join(", ")}.`
      : mode === "graph"
        ? `Step 3: ${hopsN} ${hopsN === 1 ? "hop" : "hops"} from the start reach ${ctx.facts.size} facts.`
        : `Step 3: ${COMMUNITIES.length} summaries, written at index time, come back.`,
    `Step 4: ${ctx.lines.length} lines go into the prompt.`,
    a.right ? `Step 5: right. ${a.text}` : `Step 5: wrong or incomplete. ${a.text}`,
  ];
  const caption = stage !== null ? captions[stage] : `${q.kind} ${a.right ? "✓" : "✗"} ${MODES.find((m) => m.id === mode)!.label}: “${a.text}”`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Engineering · interactive"
        title="GraphRAG and knowledge graphs"
        blurb="Vector search finds notes that sound like the question. Some answers are spread across notes linked only by names: checkout calls payments, Ledger owns payments, Priya is on call for Ledger. Extract those links into a graph and you can walk them. Ask three kinds of question and compare."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-4">
              <SystemMap
                title="Your app fetches context from a vector index, a knowledge graph or community summaries, then asks the LLM"
                accent={ACCENT}
                chrome="split"
                nodes={[
                  { id: "user", label: "User", sub: "asks", at: [12, 50], mobileAt: [20, 12], state: stage === 0 ? "active" : "idle" },
                  { id: "app", label: "Your app", sub: mode === "graph" ? `${hopsN}-hop walk` : mode === "vector" ? `top ${TOP_K}` : "global", at: [36, 50], mobileAt: [72, 12], state: stage !== null ? "active" : "idle" },
                  { id: "vec", label: "Vector index", sub: "8 notes", at: [64, 14], mobileAt: [15, 52], state: used("vec") },
                  { id: "graph", label: "Graph", sub: `${ENTITIES.length} nodes · ${FACTS.length} facts`, at: [64, 50], mobileAt: [50, 52], state: used("graph") },
                  { id: "comm", label: "Summaries", sub: `${COMMUNITIES.length} communities`, at: [64, 86], mobileAt: [85, 52], state: used("comm") },
                  { id: "llm", label: "LLM", sub: stage === 4 ? (a.right ? "right" : "wrong") : "answers", at: [88, 50], mobileAt: [50, 88], state: stage === 4 ? (a.right ? "good" : "bad") : stage === 1 && mode === "graph" ? "active" : "idle" },
                ]}
                links={[
                  { from: "user", to: "app", label: "question" },
                  { from: "app", to: "vec", label: "embedding", dim: mode !== "vector" },
                  { from: "app", to: "graph", label: "start + hops", dim: mode !== "graph" },
                  { from: "app", to: "comm", label: "read all", dim: mode !== "global" },
                  { from: "app", to: "llm", label: "context" },
                ]}
                packets={packets}
                aspect={2.2}
                mobileAspect={0.95}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3 sm:p-4" aria-label="The knowledge graph, with what this retrieval reached">
                <GraphPicture ctx={ctx} mode={mode} />
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices label="Question" accent={ACCENT} value={q.id} onChange={setQId} options={QUESTIONS.map((x) => ({ id: x.id, label: x.label }))} />
              </div>
              <div className="w-full">
                <Choices label="Retrieval" accent={ACCENT} value={mode} onChange={setMode} options={MODES} />
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Retrieving…">
                Ask
              </RunButton>
              <p className="w-full text-sm" style={{ color: a.right ? "var(--good)" : "var(--bad)" }}>
                {a.right ? "✓ Right answer" : "✗ Wrong or incomplete"}
              </p>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Ask the question" what="Some questions live in one note, some need several notes chained by names, and some are about the whole collection." accent={ACCENT} active={at(0)}>
                <p className="text-sm">{q.text}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{q.kind}</p>
              </FlowStep>
              <FlowArrow label="the question" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Find where to start" what="Vector search embeds the question. A graph walk needs entities: a small model call finds the services, teams and people the question names." accent={ACCENT} active={at(1)}>
                {mode === "vector" ? (
                  <p className="text-sm">Embed the whole question. No names needed.</p>
                ) : mode === "graph" ? (
                  <p className="text-sm">
                    {w.seeds.length ? (
                      <>
                        Start at{" "}
                        {w.seeds.map((s) => (
                          <span key={s} className="font-mono" style={{ color: KIND_COLOR[entity(s).kind] }}>
                            {entity(s).label}
                          </span>
                        ))}
                        .
                      </>
                    ) : (
                      <span style={{ color: "var(--bad)" }}>No entity named. Nowhere to start.</span>
                    )}
                  </p>
                ) : (
                  <p className="text-sm">No starting point: read the summary of every community.</p>
                )}
              </FlowStep>
              <FlowArrow label={mode === "vector" ? "embedding" : mode === "graph" ? `${w.seeds.length} start ${w.seeds.length === 1 ? "node" : "nodes"}` : "all communities"} accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Retrieve" what="Vector: the closest notes. Graph: every fact within N hops of the start. Global: summaries an LLM wrote for each cluster of the graph at index time." accent={ACCENT} active={at(2)}>
                {mode === "vector" && (
                  <ol className="space-y-1 text-sm">
                    {hits.map((h) => (
                      <li key={h.doc.id}>
                        {h.doc.title} <span className="font-mono text-xs text-[var(--faint)]">({h.shared.join(", ")})</span>
                      </li>
                    ))}
                  </ol>
                )}
                {mode === "graph" && (
                  <>
                    <Choices label="Hops" accent={ACCENT} value={String(hopsN)} onChange={(v) => setHopsN(Number(v))} options={HOPS.map((h) => ({ id: String(h), label: String(h) }))} />
                    <ul className="mt-2 space-y-0.5 font-mono text-xs">
                      {w.facts.map((f) => (
                        <li key={f.id}>{factText(f)}</li>
                      ))}
                      {!w.facts.length && <li className="text-[var(--faint)]">nothing reached</li>}
                    </ul>
                  </>
                )}
                {mode === "global" && (
                  <ul className="space-y-1.5 text-sm">
                    {COMMUNITIES.map((c) => (
                      <li key={c.id}>
                        <span className="font-medium">{c.title}:</span> {c.summary}
                      </li>
                    ))}
                  </ul>
                )}
              </FlowStep>
              <FlowArrow label={`${ctx.lines.length} lines`} accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Paste it into the prompt" what="Only what was retrieved reaches the model. More hops find more, and also pull in facts that don't matter." accent={ACCENT} active={at(3)}>
                <p className="font-mono text-sm">
                  {ctx.lines.length} lines · {ctx.lines.join(" ").split(/\s+/).filter(Boolean).length} words
                </p>
                {mode === "graph" && <p className="mt-1 text-xs text-[var(--muted)]">Each fact links back to the note it came from, so the answer can cite it.</p>}
              </FlowStep>
              <FlowArrow label="context + question" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Answer from that context" what="The model can only join facts it was given. A missing link becomes a guess or a confident wrong answer." accent={ACCENT} active={at(4)}>
                <p className="text-sm" style={{ color: a.right ? "var(--good)" : "var(--bad)" }}>
                  {a.right ? "✓" : "✗"} {a.text}
                </p>
                <ul className="mt-3 space-y-1 text-xs">
                  {MODES.flatMap((m) => (m.id === "graph" ? HOPS.map((h) => ({ m, h })) : [{ m, h: 0 }])).map(({ m, h }) => {
                    const r = answer(q, retrieve(q, m.id, h || 1));
                    const current = m.id === mode && (m.id !== "graph" || h === hopsN);
                    return (
                      <li key={`${m.id}-${h}`} className="flex items-baseline justify-between gap-2" style={{ fontWeight: current ? 700 : 400 }}>
                        <span className="min-w-0">
                          {m.label}
                          {h ? `, ${h} ${h === 1 ? "hop" : "hops"}` : ""}
                        </span>
                        <span className="shrink-0" style={{ color: r.right ? "var(--good)" : "var(--bad)" }}>
                          {r.right ? "right ✓" : "✗"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-2 text-xs text-[var(--faint)]">
                  The price is paid at index time: an LLM reads every chunk to extract entities and relations, and writes a summary per community. That is many times the cost of embedding the same text.
                </p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

// A ring of panel colour behind each label, so edges don't run through the text.
const HALO = { stroke: "var(--panel)", strokeWidth: 0.9, paintOrder: "stroke" as const, strokeLinejoin: "round" as const };

function GraphPicture({ ctx, mode }: { ctx: Context; mode: Mode }) {
  const lit = (id: string) => ctx.facts.has(id) && mode !== "global";
  const reached = new Set(FACTS.filter((f) => lit(f.id)).flatMap((f) => [f.from, f.to]));
  for (const s of ctx.seeds) reached.add(s);
  const community = (id: string) => COMMUNITIES.findIndex((c) => c.members.includes(id));

  return (
    <figure>
      <svg viewBox="0 0 100 64" className="w-full" role="img" aria-label={`Knowledge graph: ${ENTITIES.length} entities and ${FACTS.length} facts. ${mode === "global" ? "Coloured by community." : `${reached.size} entities reached.`}`}>
        {FACTS.map((f) => {
          const a = entity(f.from).at;
          const b = entity(f.to).at;
          const on = lit(f.id);
          return (
            <g key={f.id}>
              <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={on ? ACCENT : "var(--line-strong)"} strokeWidth={on ? 0.7 : 0.3} opacity={on ? 1 : 0.6} />
              {on && (
                <text x={(a[0] + b[0]) / 2} y={(a[1] + b[1]) / 2 - 0.8} textAnchor="middle" fontSize={2.2} fill="var(--muted)" {...HALO}>
                  {f.rel}
                </text>
              )}
            </g>
          );
        })}
        {ENTITIES.map((e) => {
          const on = mode === "global" || reached.has(e.id);
          const seed = ctx.seeds.includes(e.id);
          const fill = mode === "global" ? (community(e.id) === 0 ? "var(--c1)" : "var(--c4)") : KIND_COLOR[e.kind];
          return (
            <g key={e.id} opacity={on ? 1 : 0.35}>
              {seed && <circle cx={e.at[0]} cy={e.at[1]} r={3} fill="none" stroke={ACCENT} strokeWidth={0.5} />}
              <circle cx={e.at[0]} cy={e.at[1]} r={1.8} fill={fill} />
              <text x={e.at[0]} y={e.at[1] + 4.6} textAnchor="middle" fontSize={2.8} fill="var(--text)" {...HALO}>
                {e.label}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
        {mode === "global"
          ? COMMUNITIES.map((c, i) => (
              <span key={c.id} className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ background: i === 0 ? "var(--c1)" : "var(--c4)" }} />
                {c.title}
              </span>
            ))
          : (Object.keys(KIND_COLOR) as Entity["kind"][]).map((k) => (
              <span key={k} className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ background: KIND_COLOR[k] }} />
                {k}
              </span>
            ))}
        {mode !== "global" && <span>· lit: reached by this retrieval</span>}
      </figcaption>
    </figure>
  );
}
