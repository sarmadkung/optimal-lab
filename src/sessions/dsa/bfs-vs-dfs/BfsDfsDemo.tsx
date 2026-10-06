"use client";

import { useState } from "react";
import { FlowArrow, FlowSequence, FlowStep } from "@/components/flow/Flow";
import { Choices, PlaybackControls, usePlayback } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { EDGES, NODES, pathTo, search, type Algo, type SearchFrame } from "@/lib/graphSearch";

const ACCENT = "var(--dsa)";
const TARGETS = ["G", "I", "H"];

export default function BfsDfsDemo() {
  const [target, setTarget] = useState("G");
  const runs = { bfs: search("bfs", "A", target), dfs: search("dfs", "A", target) };
  const length = Math.max(runs.bfs.length, runs.dfs.length);
  const playback = usePlayback(length, 1100);
  const frameOf = (algo: Algo) => runs[algo][Math.min(playback.i, runs[algo].length - 1)];
  const bfs = frameOf("bfs");
  const dfs = frameOf("dfs");
  const bothDone = bfs.found && dfs.found;
  const hops = (f: SearchFrame) => pathTo(target, f.parent).length - 1;

  const caption = bothDone
    ? `Both found ${target}. BFS took the ${hops(bfs)}-hop path, the shortest one. DFS took ${hops(dfs)} hops: it follows whichever branch it dived into.`
    : playback.i === 0
      ? `Both start at A and look for ${target}. Same graph, same neighbours. Only the frontier differs: a queue or a stack.`
      : `BFS has visited ${bfs.visited.join(" ")}. DFS has visited ${dfs.visited.join(" ")}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DSA · interactive"
        title="BFS vs DFS on the same graph"
        blurb="Breadth-first search takes the oldest node from a queue, so it spreads out ring by ring. Depth-first search takes the newest from a stack, so it dives down one branch first. Run both side by side."
      />

      <div className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
        <p aria-live="polite" className="min-h-10 text-sm">
          {caption}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Choices
            accent={ACCENT}
            value={target}
            onChange={(t) => {
              setTarget(t);
              playback.reset();
            }}
            options={TARGETS.map((t) => ({ id: t, label: `Find ${t}` }))}
          />
          <PlaybackControls playback={playback} accent={ACCENT} nextLabel="Next step" status={`Step ${playback.i} of ${length - 1}`} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Lane algo="bfs" title="Breadth-first (queue)" frame={bfs} target={target} />
        <Lane algo="dfs" title="Depth-first (stack)" frame={dfs} target={target} />
      </div>

      <div className="mt-6">
        <FlowSequence mode="stage" accent={ACCENT}>
          <FlowStep n={1} title="Take the next node from the frontier" what="BFS takes from the front of a queue (oldest first). DFS takes from the top of a stack (newest first). That single choice is the whole difference." accent={ACCENT} active={playback.i > 0 && !bothDone}>
            <p className="font-mono text-sm">
              BFS → {bfs.current ?? "—"} · DFS → {dfs.current ?? "—"}
            </p>
          </FlowStep>
          <FlowArrow label="one node" accent={ACCENT} />
          <FlowStep n={2} title="Mark it visited" what="Never expand a node twice, or a cycle would loop forever." accent={ACCENT}>
            <p className="font-mono text-sm">
              BFS {bfs.visited.length} visited · DFS {dfs.visited.length} visited
            </p>
          </FlowStep>
          <FlowArrow label="its neighbours" accent={ACCENT} />
          <FlowStep n={3} title="Add its unvisited neighbours to the frontier" what="Remember who added each node. Following those links back gives the path." accent={ACCENT}>
            <p className="font-mono text-sm">
              queue [{bfs.frontier.join(", ")}] · stack [{dfs.frontier.join(", ")}]
            </p>
          </FlowStep>
          <FlowArrow label="repeat" accent={ACCENT} />
          <FlowStep n={4} title="Stop at the target, or when the frontier is empty" what="Both visit every node at most once: O(V + E). On an unweighted graph only BFS guarantees the fewest hops; DFS uses less memory on deep, narrow graphs." accent={ACCENT} active={bothDone}>
            <p className="font-mono text-sm">
              BFS path {pathTo(target, bfs.parent).join(" → ")} · DFS path {pathTo(target, dfs.parent).join(" → ")}
            </p>
          </FlowStep>
        </FlowSequence>
      </div>
    </SessionPage>
  );
}

function Lane({ algo, title, frame, target }: { algo: Algo; title: string; frame: SearchFrame; target: string }) {
  const pos = (id: string) => NODES.find((n) => n.id === id)!;
  const path = frame.found ? pathTo(target, frame.parent) : [];
  const onPath = (a: string, b: string) => path.some((p, i) => i > 0 && ((path[i - 1] === a && p === b) || (path[i - 1] === b && p === a)));
  const tree = (a: string, b: string) => frame.parent[b] === a || frame.parent[a] === b;

  return (
    <section aria-label={title} className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        <span className="font-mono text-xs" style={{ color: frame.found ? "var(--good)" : "var(--faint)" }}>
          {frame.found ? `found in ${frame.visited.length} visits` : `${frame.visited.length} visited`}
        </span>
      </div>
      <svg viewBox="0 0 100 100" className="mt-3 aspect-square w-full max-w-[22rem] mx-auto" role="img" aria-label={`${title}: visited ${frame.visited.join(", ") || "nothing yet"}`}>
        {EDGES.map(([a, b]) => {
          const A = pos(a);
          const B = pos(b);
          return (
            <line
              key={`${a}${b}`}
              x1={A.x}
              y1={A.y}
              x2={B.x}
              y2={B.y}
              strokeWidth={onPath(a, b) ? 2.2 : tree(a, b) ? 1.4 : 0.8}
              style={{ stroke: onPath(a, b) ? "var(--good)" : tree(a, b) ? ACCENT : "var(--line-strong)", transition: "stroke 0.3s" }}
            />
          );
        })}
        {NODES.map((n) => {
          const order = frame.visited.indexOf(n.id);
          const current = frame.current === n.id;
          const waiting = frame.frontier.includes(n.id);
          const isTarget = n.id === target;
          return (
            <g key={n.id}>
              <circle
                cx={n.x}
                cy={n.y}
                r={7}
                strokeWidth={isTarget ? 1.6 : 1}
                strokeDasharray={waiting && order < 0 ? "2 1.5" : undefined}
                style={{
                  fill: current ? ACCENT : order >= 0 ? "color-mix(in srgb, var(--dsa) 28%, var(--panel))" : "var(--panel)",
                  stroke: isTarget ? "var(--good)" : waiting || order >= 0 ? ACCENT : "var(--line-strong)",
                  transition: "fill 0.3s",
                }}
              />
              <text x={n.x} y={n.y + 2.2} textAnchor="middle" fontSize="6" fontWeight="600" style={{ fill: current ? "var(--on-accent)" : "var(--text)" }}>
                {n.id}
              </text>
              {order >= 0 && (
                <text x={n.x + 8.5} y={n.y - 5} fontSize="4.5" style={{ fill: "var(--muted)" }}>
                  {order + 1}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="mt-2 font-mono text-xs text-[var(--muted)]">
        {algo === "bfs" ? "queue (front →)" : "stack (→ top)"}: [{frame.frontier.join(", ")}]
      </p>
      <p className="mt-1 font-mono text-xs text-[var(--muted)]">order: {frame.visited.join(" ") || "—"}</p>
    </section>
  );
}
