"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, PlaybackControls, usePlayback } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMapPanel } from "@/components/system/SystemMap";
import { CHARS_PER_TOKEN, CORPORA, SPACE, encode, train } from "@/lib/tokenize";

const ACCENT = "var(--ai)";
const TINTS = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)"];

export default function TokenizationDemo() {
  const [corpusId, setCorpusId] = useState(CORPORA[0].id);
  const corpus = CORPORA.find((c) => c.id === corpusId) ?? CORPORA[0];
  const { frames, merges } = train(corpus);
  const playback = usePlayback(frames.length, 1300);
  const frame = frames[playback.i];
  const [text, setText] = useState<Record<string, string>>({});
  const input = text[corpus.id] ?? corpus.sample;

  const learned = merges.slice(0, frame.step);
  const encoded = encode(input, learned, frame.vocab, corpus.spaced);
  const chars = input.trim().length;
  const top = frame.pairs.slice(0, 5);
  const next = frame.pairs[0];
  const lastMerge = frame.merged;

  const caption =
    frame.step === 0
      ? `Start: every word is split into single characters. ${frame.vocab.length} tokens in the vocabulary.`
      : `Merge ${frame.step}: “${show(lastMerge!.a)}” + “${show(lastMerge!.b)}” appeared ${lastMerge!.count} times, so it became “${show(lastMerge!.a + lastMerge!.b)}”.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Engineering · interactive"
        title="How text becomes tokens"
        blurb="A model never reads letters or words. It reads tokens: chunks a tokenizer learned by merging the most common pairs of characters, over and over. Train one, then type your own text."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5" aria-label="The training words, split into tokens">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">
                  {frame.step === 0 ? "Characters only" : `After ${frame.step} ${frame.step === 1 ? "merge" : "merges"}`}
                </p>
                <p className="font-mono text-xs text-[var(--muted)]">vocabulary {frame.vocab.length}</p>
              </div>
              <ul className="mt-4 grid max-h-[22rem] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {frame.words.map((w) => (
                  <li key={w.text} className="flex min-w-0 items-center justify-between gap-2 rounded-lg bg-[var(--inset)] px-2 py-1.5">
                    <Chips tokens={w.tokens} highlight={lastMerge ? lastMerge.a + lastMerge.b : null} />
                    <span className="shrink-0 font-mono text-xs text-[var(--faint)]">×{w.count}</span>
                  </li>
                ))}
              </ul>
              {next && next.count > 1 && !playback.atEnd && (
                <p className="mt-3 text-sm text-[var(--muted)]">
                  Next merge: <span className="font-mono text-[var(--text)]">{show(next.a)} + {show(next.b)}</span> ({next.count} times)
                </p>
              )}
            </section>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <Choices
                accent={ACCENT}
                value={corpus.id}
                onChange={(id) => {
                  setCorpusId(id);
                  playback.reset();
                }}
                options={CORPORA.map((c) => ({ id: c.id, label: c.label }))}
              />
              <PlaybackControls playback={playback} accent={ACCENT} nextLabel="Next merge" status={`Merge ${frame.step} of ${frames.length - 1}`} />
              <label className="block w-full">
                <span className="text-sm font-medium">Try your own text</span>
                <input
                  value={input}
                  onChange={(e) => setText((t) => ({ ...t, [corpus.id]: e.target.value }))}
                  className="mt-2 min-h-11 w-full rounded-md border border-[var(--line-strong)] bg-[var(--bg)] px-3 font-mono text-sm"
                  spellCheck={false}
                />
                <span className="mt-1 block text-xs text-[var(--faint)]">
                  {chars} characters → <span className="text-[var(--text)]">{encoded.tokens.length} tokens</span> with the merges learned so far
                </span>
              </label>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Split every word into characters" what="Training starts from the smallest pieces. Each distinct character is one token in the vocabulary." accent={ACCENT} active={frame.step === 0}>
                <p className="break-words font-mono text-sm">{frames[0].vocab.map(show).join("  ")}</p>
                {corpus.spaced && (
                  <p className="mt-2 text-xs text-[var(--faint)]">
                    · marks the space before a word. GPT-style tokenizers keep it, so “ refund” and “refund” are different tokens.
                  </p>
                )}
              </FlowStep>
              <FlowArrow label="every word as characters" accent={ACCENT} />

              <FlowStep n={2} title="Count every pair of neighbours" what="Look at each pair of adjacent tokens, weighted by how often its word appears." accent={ACCENT} active={frame.step > 0 && !playback.atEnd}>
                <ol className="space-y-1.5">
                  {top.map((p, idx) => (
                    <li key={`${p.a}|${p.b}`} className="grid grid-cols-[minmax(0,6rem)_minmax(0,1fr)_2.5rem] items-center gap-2 text-sm">
                      <span className="truncate font-mono">{show(p.a)} + {show(p.b)}</span>
                      <span className="h-2 rounded bg-[var(--track)]">
                        <span className="block h-full rounded" style={{ width: `${(p.count / top[0].count) * 100}%`, background: idx === 0 ? ACCENT : "var(--ghost)" }} />
                      </span>
                      <span className="text-right font-mono tabular-nums">{p.count}</span>
                    </li>
                  ))}
                </ol>
              </FlowStep>
              <FlowArrow label="the most common pair" accent={ACCENT} />

              <FlowStep n={3} title="Merge the most common pair" what="That pair becomes one new token, everywhere it appears. The vocabulary grows by one." accent={ACCENT} active={frame.step > 0}>
                {lastMerge ? (
                  <p className="font-mono text-sm">
                    {show(lastMerge.a)} + {show(lastMerge.b)} → <span style={{ color: ACCENT }}>{show(lastMerge.a + lastMerge.b)}</span>
                    <span className="text-[var(--faint)]"> ({lastMerge.count}×)</span>
                  </p>
                ) : (
                  <p className="text-sm text-[var(--muted)]">Press Next merge to make the first one.</p>
                )}
              </FlowStep>
              <FlowArrow label="a bigger vocabulary" accent={ACCENT} />

              <FlowStep n={4} title="Repeat until the vocabulary is big enough" what="Real tokenizers stop at 50,000 to 200,000 tokens. This one stops when no pair repeats." accent={ACCENT} active={playback.atEnd && frame.step > 0}>
                <p className="break-words font-mono text-xs leading-6 text-[var(--muted)]">
                  {learned.length ? learned.map((m) => show(m.a + m.b)).join(" · ") : "No merges yet."}
                </p>
              </FlowStep>
              <FlowArrow label="the merge list, in order" accent={ACCENT} />

              <FlowStep n={5} title="Tokenize new text by replaying the merges" what="New text is split into characters, then the merges run in the order they were learned. Each token maps to an id: those ids are what the model reads." accent={ACCENT}>
                <Chips tokens={encoded.tokens} ids={encoded.ids} />
                <p className="mt-3 text-sm text-[var(--muted)]">
                  {encoded.unknown > 0
                    ? `${encoded.unknown} ${encoded.unknown === 1 ? "piece was" : "pieces were"} never seen in training. Real tokenizers start from all 256 bytes, so nothing is ever unknown.`
                    : `Common words become one token. Rare words fall apart into pieces. Real English averages about ${CHARS_PER_TOKEN} characters per token, and you pay per token.`}
                </p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

const show = (t: string) => t.replaceAll(SPACE, "·");

function Chips({ tokens, highlight = null, ids }: { tokens: string[]; highlight?: string | null; ids?: number[] }) {
  return (
    <ol className="flex min-w-0 flex-wrap gap-1" aria-label={`${tokens.length} tokens`}>
      {tokens.map((t, i) => {
        const tint = TINTS[i % TINTS.length];
        const hot = highlight !== null && t === highlight;
        return (
          <li
            key={`${t}-${i}`}
            className="flex flex-col items-center rounded border px-1.5 py-0.5 font-mono text-sm"
            style={{
              borderColor: hot ? ACCENT : `color-mix(in srgb, ${tint} 45%, transparent)`,
              background: `color-mix(in srgb, ${tint} ${hot ? 30 : 14}%, transparent)`,
            }}
          >
            <span className="whitespace-pre">{show(t)}</span>
            {ids && <span className="text-[10px] text-[var(--faint)]">{ids[i] < 0 ? "?" : ids[i]}</span>}
          </li>
        );
      })}
    </ol>
  );
}
