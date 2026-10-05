"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMapPanel } from "@/components/system/SystemMap";
import { D, DIMS, ENDINGS, attend, fmt, sentence, type AttentionRow, type Ending } from "@/lib/attention";

const ACCENT = "var(--ai)";

export default function AttentionDemo() {
  const [ending, setEnding] = useState<Ending>("tired");
  const tokens = sentence(ending);
  const [queryIndex, setQueryIndex] = useState(tokens.length - 1);
  const [causal, setCausal] = useState(true);
  const { stage, busy, run } = useWalk(6, 900);
  const { query, rows, output } = attend(ending, queryIndex, causal);
  const sorted = [...rows].sort((a, b) => b.weight - a.weight);
  const top = sorted[0];
  const tied = sorted.filter((r) => top.weight - r.weight < 0.02 && r.index !== queryIndex);
  const focus = tied.length > 1 ? `splits its attention between ${tied.map((r) => `“${r.text}”`).join(" and ")} (${pct(top.weight)} each)` : `pays most attention to “${top.text}” (${pct(top.weight)})`;
  const on = (s: number) => stage === s;

  const caption =
    stage === null
      ? `“${query.text}” ${focus}. Click any word on the left to make it the query.`
      : [
          `“${query.text}” gets a query vector. Every word also has a key and a value.`,
          `Dot product: how well “${query.text}”’s query matches each key.`,
          `Divide by √${D} = ${Math.sqrt(D)} so the scores don't grow with the vector size.`,
          causal ? `The ${rows.filter((r) => !r.visible).length} words after “${query.text}” are hidden. A model writing text can't look ahead.` : "No mask: every word can see every other word, as in an encoder like BERT.",
          `Softmax turns scores into weights that add up to 100%. “${top.text}” gets ${pct(top.weight)}.`,
          `The new “${query.text}” is a blend of the values, mostly from “${top.text}”.`,
        ][stage];

  const scoreList = (pick: (r: AttentionRow) => string, emphasize = false) => (
    <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
      {rows.map((r) => (
        <li key={r.index} className="flex justify-between gap-3" style={{ opacity: r.visible ? 1 : 0.35 }}>
          <span className={r.index === queryIndex ? "font-semibold" : ""}>{r.text}</span>
          <span className="font-mono tabular-nums" style={{ color: emphasize && r === top ? ACCENT : undefined }}>
            {r.visible ? pick(r) : "masked"}
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Engineering · interactive"
        title="Attention: which words does a word look at?"
        blurb="“The animal didn't cross the street because it was too tired.” What was tired? Attention is how each token pulls meaning from the tokens around it. Change the last word and watch where it looks."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 [--row:2.75rem] sm:p-5 lg:[--row:2rem]" aria-label="Attention from one word to every word">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">One attention head · query “{query.text}”</p>
              <HeadView words={tokens.map((t) => t.text)} rows={rows} queryIndex={queryIndex} onPick={setQueryIndex} />
            </section>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <Choices
                label="The sentence ends with…"
                accent={ACCENT}
                value={ending}
                onChange={(e) => setEnding(e)}
                options={(Object.keys(ENDINGS) as Ending[]).map((e) => ({ id: e, label: `too ${e}` }))}
              />
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Computing…">
                Walk the six steps
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Give every token a query, key and value" what="Three learned projections of the same token: the query asks “what am I looking for?”, the key says “what do I contain?”, the value is what gets passed on." accent={ACCENT} active={on(0)}>
                <dl className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-y-1 font-mono text-sm">
                  <dt className="text-[var(--faint)]">query</dt>
                  <dd className="break-words">{fmt(query.q)}</dd>
                  <dt className="text-[var(--faint)]">key</dt>
                  <dd className="break-words">{fmt(query.k)}</dd>
                  <dt className="text-[var(--faint)]">value</dt>
                  <dd className="break-words">{fmt(query.v)}</dd>
                </dl>
                <p className="mt-2 text-xs text-[var(--faint)]">Dimensions here: {DIMS.join(" · ")}. Real heads use 64 to 128 learned dimensions nobody named.</p>
              </FlowStep>
              <FlowArrow label={`1 query, ${tokens.length} keys`} accent={ACCENT} active={on(1)} />

              <FlowStep n={2} title="Score the query against every key" what="A dot product: multiply matching dimensions and add. Big when the query asks for what the key holds." accent={ACCENT} active={on(1)}>
                {scoreList((r) => r.raw.toFixed(2))}
              </FlowStep>
              <FlowArrow label={`${tokens.length} raw scores`} accent={ACCENT} active={on(2)} />

              <FlowStep n={3} title={`Divide by √d (√${D} = ${Math.sqrt(D)})`} what="Without this, scores grow with the vector size and softmax would put almost all weight on one word." accent={ACCENT} active={on(2)}>
                {scoreList((r) => r.scaled.toFixed(2))}
              </FlowStep>
              <FlowArrow label="scaled scores" accent={ACCENT} active={on(3)} />

              <FlowStep n={4} title="Hide the future" what="A model that writes left to right (GPT, Claude, Llama) may only attend to earlier tokens. The mask sets later scores to −∞." accent={ACCENT} active={on(3)}>
                <Choices
                  accent={ACCENT}
                  value={causal ? "causal" : "full"}
                  onChange={(id) => setCausal(id === "causal")}
                  options={[
                    { id: "causal", label: "Causal mask (decoder)" },
                    { id: "full", label: "No mask (encoder)" },
                  ]}
                />
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {rows.filter((r) => !r.visible).length} of {rows.length} tokens hidden from “{query.text}”.
                </p>
              </FlowStep>
              <FlowArrow label="visible scores" accent={ACCENT} active={on(4)} />

              <FlowStep n={5} title="Softmax the scores into weights" what="eˣ of each score, divided by the total. Every weight is between 0 and 1, and they add up to 1." accent={ACCENT} active={on(4)}>
                <ul className="space-y-1.5">
                  {rows.map((r) => (
                    <li key={r.index} className="grid grid-cols-[minmax(0,5rem)_minmax(0,1fr)_3rem] items-center gap-2 text-sm" style={{ opacity: r.visible ? 1 : 0.35 }}>
                      <span className="truncate">{r.text}</span>
                      <span className="h-2 rounded bg-[var(--track)]">
                        <span className="block h-full rounded transition-[width] duration-300" style={{ width: `${r.weight * 100}%`, background: ACCENT }} />
                      </span>
                      <span className="text-right font-mono tabular-nums">{pct(r.weight)}</span>
                    </li>
                  ))}
                </ul>
              </FlowStep>
              <FlowArrow label={`${rows.filter((r) => r.visible).length} weights`} accent={ACCENT} active={on(5)} />

              <FlowStep n={6} title="Blend the values" what="Multiply each value by its weight and add them up. That sum is the new vector for this token, now carrying meaning from the words it attended to." accent={ACCENT} active={on(5)}>
                <ul className="space-y-1.5">
                  {DIMS.map((dim, d) => (
                    <li key={dim} className="grid grid-cols-[minmax(0,6rem)_minmax(0,1fr)_3rem] items-center gap-2 text-sm">
                      <span className="truncate text-[var(--muted)]">{dim}</span>
                      <span className="h-2 rounded bg-[var(--track)]">
                        <span className="block h-full rounded transition-[width] duration-300" style={{ width: `${Math.min(1, output[d]) * 100}%`, background: "var(--c3)" }} />
                      </span>
                      <span className="text-right font-mono tabular-nums">{output[d].toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  {output[0] > output[1] + 0.2
                    ? `“${query.text}” now leans animate: it took most of its meaning from “animal”.`
                    : output[1] > output[0] + 0.2
                      ? `“${query.text}” now leans place: it took most of its meaning from “street”.`
                      : `“${query.text}” is still split between animal and street. On its own, “it” is ambiguous; the word at the end decides.`}{" "}
                  A real model runs dozens of heads like this in parallel, in every layer, then passes the result on to predict the next token.
                </p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

// Two columns of the same words, with a line from the query word to every word it can see.
// Line strength is the attention weight. After the "head view" in BertViz.
function HeadView({ words, rows, queryIndex, onPick }: { words: string[]; rows: AttentionRow[]; queryIndex: number; onPick: (i: number) => void }) {
  const n = words.length;
  const y = (i: number) => i * 10 + 5; // SVG units: each row is 10 tall, stretched to the real row height
  const grid = { gridTemplateRows: `repeat(${n}, minmax(0, 1fr))` };
  return (
    // 44px rows on a phone (tap targets), tighter from lg up so it fits beside the panel.
    <div className="relative mt-4 grid grid-cols-[minmax(0,1fr)_minmax(3rem,1.4fr)_minmax(0,1fr)]" style={{ height: `calc(${n} * var(--row))` }}>
      <ol className="grid" style={grid}>
        {words.map((w, i) => (
          <li key={`l-${i}`} className="min-h-0">
            <button
              type="button"
              onClick={() => onPick(i)}
              aria-pressed={i === queryIndex}
              aria-label={`Make “${w}” the query`}
              className="h-full w-full truncate rounded px-2 text-right text-sm"
              style={i === queryIndex ? { background: `color-mix(in srgb, ${ACCENT} 22%, transparent)`, color: "var(--text)", fontWeight: 600 } : { color: "var(--muted)" }}
            >
              {w}
            </button>
          </li>
        ))}
      </ol>
      <svg viewBox={`0 0 100 ${n * 10}`} preserveAspectRatio="none" className="h-full w-full" aria-hidden>
        {rows.map((r) =>
          r.visible ? (
            <line
              key={r.index}
              x1="0"
              y1={y(queryIndex)}
              x2="100"
              y2={y(r.index)}
              stroke={ACCENT}
              strokeWidth={1 + r.weight * 9}
              strokeOpacity={0.15 + r.weight * 0.85}
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              style={{ transition: "stroke-width 0.3s, stroke-opacity 0.3s" }}
            />
          ) : null,
        )}
      </svg>
      <ol className="grid" style={grid}>
        {rows.map((r) => (
          <li key={`r-${r.index}`} className="flex min-h-0 items-center justify-between gap-2 px-2 text-sm" style={{ opacity: r.visible ? 1 : 0.3 }}>
            <span className="truncate">{r.text}</span>
            <span className="font-mono text-xs tabular-nums text-[var(--faint)]">{r.visible ? pct(r.weight) : ""}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
