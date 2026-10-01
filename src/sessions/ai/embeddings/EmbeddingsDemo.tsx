"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, Meter, RunButton, Slider, useWalk } from "@/components/session/ui";
import { PRESETS, ranked } from "@/lib/embeddings";

const ACCENT = "var(--ai)";

export default function EmbeddingsDemo() {
  const [preset, setPreset] = useState(PRESETS[0].id);
  const [custom, setCustom] = useState<{ x: number; y: number } | null>(null);
  const [k, setK] = useState(2);
  const { stage, busy, run } = useWalk(4, 450);
  const chosen = PRESETS.find((p) => p.id === preset) ?? PRESETS[0];
  const query = custom ?? { x: chosen.x, y: chosen.y };
  const rows = ranked(query, k);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)]">AI engineering · interactive</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Embeddings and similarity search</h1>
      <p className="mt-3 text-[var(--muted)]">
        Text becomes a direction in space. Closer directions are more alike. Pick a question, or click
        the plot, and see which notes come back.
      </p>

      <div className="mt-6">
        <FlowStep n={1} title="Turn the question into a vector" what="The question is a point. Its direction is what we compare, not the words themselves." accent={ACCENT} active={stage === 0}>
          <Choices
            accent={ACCENT}
            value={custom ? null : preset}
            onChange={(id) => {
              setPreset(id);
              setCustom(null);
            }}
            options={PRESETS.map((p) => ({ id: p.id, label: p.label }))}
          />
          <p className="mt-3 text-xs text-[var(--faint)]">Or click the plot to place your own query.</p>
          <Plot
            query={query}
            onPick={(x, y) => setCustom({ x, y })}
          />
          <p className="mt-2 font-mono text-xs text-[var(--faint)]">
            x {query.x.toFixed(2)} · y {query.y.toFixed(2)}
          </p>
        </FlowStep>
        <FlowArrow label="1 query vector" accent={ACCENT} active={stage === 1} />

        <FlowStep n={2} title="Score every stored note" what="Cosine similarity is 1 when two directions match, and near 0 when they do not." accent={ACCENT} active={stage === 1}>
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.id}>
                <div className="mb-1 flex justify-between gap-3 text-sm">
                  <span className={row.kept ? "" : "text-[var(--faint)]"}>{row.label}</span>
                  <span className="font-mono tabular-nums">{row.score.toFixed(2)}</span>
                </div>
                <Meter value={row.score + 1} max={2} color={row.kept ? ACCENT : "var(--faint)"} />
              </li>
            ))}
          </ul>
        </FlowStep>
        <FlowArrow label="scores, high to low" accent={ACCENT} active={stage === 2} />

        <FlowStep n={3} title="Keep the closest ones" what="Top-k is how many notes you take back. The rest stay in the index." accent={ACCENT} active={stage === 2}>
          <Slider
            label="How many to return (k)"
            value={k}
            min={1}
            max={4}
            step={1}
            format={(v) => String(v)}
            accent={ACCENT}
            onChange={setK}
          />
          <ul className="mt-3 space-y-1 text-sm">
            {rows.map((row) => (
              <li key={row.id} className={row.kept ? "text-[var(--text)]" : "text-[var(--faint)] line-through"}>
                {row.label}
              </li>
            ))}
          </ul>
        </FlowStep>
        <FlowArrow label={`${k} notes`} accent={ACCENT} active={stage === 3} />

        <FlowStep n={4} title="Hand those notes onward" what="Search stops here. A later step, such as RAG, is what puts the notes into a prompt." accent={ACCENT} active={stage === 3}>
          <RunButton busy={busy} onClick={run} accent={ACCENT}>
            Run the search
          </RunButton>
        </FlowStep>
      </div>
    </div>
  );
}

function Plot({ query, onPick }: { query: { x: number; y: number }; onPick: (x: number, y: number) => void }) {
  const place = (x: number, y: number) => ({
    left: `${((x + 1.25) / 2.5) * 100}%`,
    top: `${((1.25 - y) / 2.5) * 100}%`,
  });
  return (
    <button
      type="button"
      aria-label="Plot. Click to move the query point."
      className="relative mt-4 h-56 w-full overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--inset)]"
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2.5 - 1.25;
        const y = 1.25 - ((e.clientY - rect.top) / rect.height) * 2.5;
        onPick(Math.max(-1.2, Math.min(1.2, x)), Math.max(-1.2, Math.min(1.2, y)));
      }}
    >
      {ranked(query, 4).map((row) => (
        <span
          key={row.id}
          className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ ...place(row.x, row.y), background: "var(--c2)" }}
          title={row.label}
        />
      ))}
      <span
        className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
        style={{ ...place(query.x, query.y), borderColor: ACCENT, background: "var(--panel)" }}
      />
    </button>
  );
}
