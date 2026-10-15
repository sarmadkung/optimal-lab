"use client";

import Link from "next/link";
import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMapPanel } from "@/components/system/SystemMap";
import {
  D,
  DIMS,
  REAL_TABLES,
  SENTENCES,
  VOCAB,
  embed,
  fmt,
  maxGap,
  neighbours,
  sameBag,
  twin,
  type PositionMode,
  type Row,
  type SentenceId,
} from "@/lib/tokenEmbeddings";

const ACCENT = "var(--ai)";
type View = "token" | "position" | "input";

export default function TokenEmbeddingsDemo() {
  const [sentence, setSentence] = useState<SentenceId>("dog-man");
  const [mode, setMode] = useState<PositionMode>("sinusoidal");
  const [picked, setPicked] = useState(1);
  const [view, setView] = useState<View>("input");
  const { stage, busy, run } = useWalk(5, 1000);
  const on = (s: number) => stage === s;

  const rows = embed(sentence, mode);
  const at = Math.min(picked, rows.length - 1);
  const row = rows[at];
  const near = neighbours(row.id);
  // While the walk runs, the matrix follows the step; otherwise the reader picks.
  const shown: View = stage === 1 ? "token" : stage === 2 ? "position" : stage === null ? view : "input";

  // A word that appears twice (the picked one if it does): the clearest case for positions.
  const dupText = rows.some((r) => r.pos !== row.pos && r.text === row.text)
    ? row.text
    : rows.find((r, i) => rows.findIndex((o) => o.text === r.text) !== i)?.text;
  const [first, repeat] = dupText ? rows.filter((r) => r.text === dupText) : [];
  const gap = repeat && first ? maxGap(first.input, repeat.input) : 0;
  const other = twin(sentence);
  const blind = other ? sameBag(rows, embed(other, mode)) : false;

  const caption =
    stage === null
      ? mode === "none"
        ? `No positions: “${row.text}” is the same vector wherever it sits${other ? `, and “${SENTENCES[sentence]}” looks like “${SENTENCES[other]}”` : ""}. Turn positions on.`
        : `“${row.text}” at position ${row.pos} = its table row + the vector for position ${row.pos}. Click any word to follow it.`
      : [
          `The text splits into ${rows.length} tokens. Each one is just an id, a row number in the table.`,
          `Id ${row.id} picks row ${row.id}: “${row.text}” becomes ${D} numbers. Similar words have similar rows.`,
          mode === "none" ? "Positions are off, so every position vector is zero." : `Position ${row.pos} gets its own vector of sines and cosines.`,
          `Add the two. ${repeat && first ? `The two “${first.text}”s now differ by up to ${gap.toFixed(2)}.` : "Same word, different place, different vector."}`,
          `A ${rows.length} × ${D} matrix goes into the first layer. Attention reads it next.`,
        ][stage];

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Engineering · interactive"
        title="Token embeddings and positions"
        blurb="A token id is just a row number. The model swaps it for a row of learned numbers, then adds a vector for where the token sits. Without that second part, “the dog bit the man” and “the man bit the dog” look the same to it. Turn positions off and see."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5" aria-label="The sentence as a matrix of vectors">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">
                  {shown === "token" ? "Table rows" : shown === "position" ? "Position vectors" : "Input to layer 1"}
                </p>
                <p className="font-mono text-xs text-[var(--muted)]">
                  {rows.length} × {D}
                </p>
              </div>

              <ol className="mt-3 flex flex-wrap gap-1.5" aria-label="Tokens">
                {rows.map((r) => (
                  <li key={r.pos}>
                    <button
                      type="button"
                      onClick={() => setPicked(r.pos)}
                      aria-pressed={r.pos === at}
                      className="flex min-h-11 min-w-11 flex-col items-center justify-center rounded border px-2 py-0.5 font-mono text-sm"
                      style={
                        r.pos === at
                          ? { borderColor: ACCENT, background: `color-mix(in srgb, ${ACCENT} 18%, transparent)` }
                          : { borderColor: "var(--line)", color: "var(--muted)" }
                      }
                    >
                      <span>{r.text}</span>
                      <span className="text-[10px] text-[var(--faint)]">id {r.id}</span>
                    </button>
                  </li>
                ))}
              </ol>

              <Matrix rows={rows} view={shown} picked={at} />

              <div className="mt-3">
                <Choices
                  accent={ACCENT}
                  value={shown}
                  onChange={setView}
                  options={[
                    { id: "token", label: "Table row" },
                    { id: "position", label: "Position" },
                    { id: "input", label: "Sum" },
                  ]}
                />
              </div>

              {other && (
                <p className="mt-3 rounded-lg bg-[var(--inset)] p-3 text-sm" style={{ color: blind ? "var(--bad)" : "var(--text)" }}>
                  {blind
                    ? `“${SENTENCES[sentence]}” and “${SENTENCES[other]}” give the same ${rows.length} vectors in a different order. Attention can't tell them apart.`
                    : `“${SENTENCES[sentence]}” and “${SENTENCES[other]}” now give different vectors, so the model can tell who bit whom.`}
                </p>
              )}
            </section>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <Choices
                label="Sentence"
                accent={ACCENT}
                value={sentence}
                onChange={(s) => {
                  setSentence(s);
                  setPicked(1);
                }}
                options={(Object.keys(SENTENCES) as SentenceId[]).map((s) => ({ id: s, label: SENTENCES[s] }))}
              />
              <Choices
                label="Positions"
                accent={ACCENT}
                value={mode}
                onChange={setMode}
                options={[
                  { id: "sinusoidal", label: "Add positions" },
                  { id: "none", label: "No positions" },
                ]}
              />
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Embedding…">
                Walk the five steps
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Split the text into token ids" what="The tokenizer turns text into ids. An id is only a row number: id 2 is not “bigger” or “closer” to id 3 in any useful way." accent={ACCENT} active={on(0)}>
                <p className="font-mono text-sm">
                  “{SENTENCES[sentence]}” → [{rows.map((r) => r.id).join(", ")}]
                </p>
                <p className="mt-2 text-xs text-[var(--faint)]">
                  This toy vocabulary has {VOCAB.length} tokens. See{" "}
                  <Link href="/tracks/ai/tokenization" className="text-[var(--accent)] hover:underline">
                    How text becomes tokens
                  </Link>{" "}
                  for where ids come from.
                </p>
              </FlowStep>
              <FlowArrow label={`${rows.length} token ids`} accent={ACCENT} active={on(1)} />

              <FlowStep n={2} title="Look up each id's row" what="The embedding table has one row per token in the vocabulary. Training nudged the rows so that words used the same way end up close together." accent={ACCENT} active={on(1)}>
                <ul className="space-y-1 font-mono text-xs">
                  {VOCAB.map((v, id) => {
                    const used = rows.some((r) => r.id === id);
                    return (
                      <li key={v.text} className="grid grid-cols-[2rem_4rem_minmax(0,1fr)] gap-2" style={{ opacity: used ? 1 : 0.4, color: id === row.id ? ACCENT : undefined }}>
                        <span className="text-[var(--faint)]">{id}</span>
                        <span>{v.text}</span>
                        <span className="break-words">{fmt(v.vec)}</span>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  Closest rows to “{row.text}”: {near.map((n) => `${n.text} (${n.score.toFixed(2)})`).join(", ")}. The same cosine idea drives{" "}
                  <Link href="/tracks/ai/embeddings" className="text-[var(--accent)] hover:underline">
                    similarity search
                  </Link>
                  .
                </p>
                <p className="mt-2 text-xs text-[var(--faint)]">Dimensions here: {DIMS.join(" · ")}. Real tables learn hundreds of dimensions nobody named.</p>
              </FlowStep>
              <FlowArrow label={`${rows.length} vectors of ${D} numbers`} accent={ACCENT} active={on(2)} />

              <FlowStep n={3} title="Make a vector for each position" what="Attention compares every token with every other token at once, so it has no sense of order on its own. A position vector carries “I am token number 3”." accent={ACCENT} active={on(2)}>
                <Choices
                  accent={ACCENT}
                  value={mode}
                  onChange={setMode}
                  options={[
                    { id: "sinusoidal", label: "Sines and cosines" },
                    { id: "none", label: "No positions" },
                  ]}
                />
                <ul className="mt-3 space-y-1 font-mono text-xs">
                  {rows.map((r) => (
                    <li key={r.pos} className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-2" style={{ color: r.pos === at ? ACCENT : undefined }}>
                      <span className="text-[var(--faint)]">pos {r.pos}</span>
                      <span className="break-words">{fmt(r.position)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-[var(--faint)]">
                  sin(pos / 10000^(2i/d)) and cos(…): the first pair of numbers turns fast, later pairs turn slowly, like the hands of a clock. GPT-2 learns a position table instead; Llama uses RoPE, which rotates queries and keys inside attention.
                </p>
              </FlowStep>
              <FlowArrow label={`${rows.length} position vectors`} accent={ACCENT} active={on(3)} />

              <FlowStep n={4} title="Add them together" what="Not side by side: the position is added into the same numbers. One vector now says both what the token is and where it sits." accent={ACCENT} active={on(3)}>
                <dl className="grid grid-cols-[5rem_minmax(0,1fr)] gap-y-1 font-mono text-xs">
                  <dt className="text-[var(--faint)]">“{row.text}”</dt>
                  <dd className="break-words">{fmt(row.token)}</dd>
                  <dt className="text-[var(--faint)]">+ pos {row.pos}</dt>
                  <dd className="break-words">{fmt(row.position)}</dd>
                  <dt className="text-[var(--faint)]">= input</dt>
                  <dd className="break-words" style={{ color: ACCENT }}>
                    {fmt(row.input)}
                  </dd>
                </dl>
                {repeat && first && (
                  <p className="mt-3 text-sm" style={{ color: gap === 0 ? "var(--bad)" : "var(--text)" }}>
                    “{first.text}” at position {first.pos} vs position {repeat.pos}: {gap === 0 ? "identical vectors. The model can't tell them apart." : `they differ by up to ${gap.toFixed(2)} in one dimension.`}
                  </p>
                )}
              </FlowStep>
              <FlowArrow label={`a ${rows.length} × ${D} matrix`} accent={ACCENT} active={on(4)} />

              <FlowStep n={5} title="Hand the matrix to the first layer" what="One row per token goes into the first transformer block. From here on, attention mixes the rows together." accent={ACCENT} active={on(4)}>
                <table className="w-full font-mono text-xs">
                  <thead>
                    <tr className="text-left text-[var(--faint)]">
                      <th className="font-normal">model</th>
                      <th className="font-normal">table</th>
                      <th className="text-right font-normal">weights</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-0.5">this demo</td>
                      <td>
                        {VOCAB.length} × {D}
                      </td>
                      <td className="text-right">{VOCAB.length * D}</td>
                    </tr>
                    {REAL_TABLES.map((t) => (
                      <tr key={t.model}>
                        <td className="py-0.5">{t.model}</td>
                        <td>
                          {t.vocab.toLocaleString()} × {t.width.toLocaleString()}
                        </td>
                        <td className="text-right">{((t.vocab * t.width) / 1e6).toFixed(1)}M</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  Positions: {REAL_TABLES.map((t) => `${t.model}, ${t.positions}`).join(". ")}. Next:{" "}
                  <Link href="/tracks/ai/attention" className="text-[var(--accent)] hover:underline">
                    attention reads these rows
                  </Link>
                  .
                </p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

// One row per token, one cell per dimension. Blue for positive, pink for negative.
function Matrix({ rows, view, picked }: { rows: Row[]; view: View; picked: number }) {
  const pick = (r: Row) => (view === "token" ? r.token : view === "position" ? r.position : r.input);
  return (
    <div className="mt-4 min-w-0">
      <div className="grid grid-cols-[4.5rem_repeat(6,minmax(0,1fr))] gap-1 font-mono text-[10px] text-[var(--faint)]">
        <span />
        {DIMS.map((d) => (
          <span key={d} className="truncate text-center" title={d}>
            {d}
          </span>
        ))}
      </div>
      <ol className="mt-1 space-y-1">
        {rows.map((r) => (
          <li key={r.pos} className="grid grid-cols-[4.5rem_repeat(6,minmax(0,1fr))] items-center gap-1">
            <span className="truncate font-mono text-xs" style={{ color: r.pos === picked ? ACCENT : "var(--muted)", fontWeight: r.pos === picked ? 600 : 400 }}>
              {r.pos} · {r.text}
            </span>
            {pick(r).map((x, j) => {
              const strength = Math.round(Math.min(1, Math.abs(x) / 1.6) * 70);
              const tint = x >= 0 ? "var(--c1)" : "var(--c4)";
              return (
                <span
                  key={j}
                  className="grid h-8 place-items-center rounded font-mono text-[10px] tabular-nums transition-colors duration-300 sm:text-xs"
                  style={{
                    background: `color-mix(in srgb, ${tint} ${strength}%, var(--inset))`,
                    outline: r.pos === picked ? `1px solid ${ACCENT}` : undefined,
                  }}
                  title={`${DIMS[j]}: ${x.toFixed(2)}`}
                >
                  {x.toFixed(1)}
                </span>
              );
            })}
          </li>
        ))}
      </ol>
    </div>
  );
}
