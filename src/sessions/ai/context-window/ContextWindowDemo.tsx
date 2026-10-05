"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, Slider, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMapPanel } from "@/components/system/SystemMap";
import { PARTS, PRICE, STRATEGIES, TURNS, WINDOW, buildTurn, usd, type Segment, type Strategy } from "@/lib/contextWindow";

const ACCENT = "var(--ai)";
const COLOR: Record<Segment["id"], string> = {
  system: "var(--c1)",
  tools: "var(--c5)",
  summary: "var(--c4)",
  history: "var(--c3)",
  docs: "var(--c2)",
  answer: "var(--ghost)",
};

export default function ContextWindowDemo() {
  const [turn, setTurn] = useState(1);
  const [strategy, setStrategy] = useState<Strategy>("none");
  const [chunks, setChunks] = useState(3);
  const [caching, setCaching] = useState(true);
  const { stage, busy, run } = useWalk(6, 380);
  const f = buildTurn(turn, strategy, chunks, caching);
  const on = (s: number) => stage === s;
  const scale = Math.max(WINDOW, f.used);
  const tokens = (n: number) => n.toLocaleString("en-US");

  const next = () => {
    if (busy) return;
    setTurn((t) => (t >= TURNS ? 1 : t + 1));
    run();
  };

  const caption = f.rejected
    ? `Turn ${turn}: ${tokens(f.used)} tokens is ${tokens(f.over)} over the ${tokens(WINDOW)} window. The API rejects the call. Pick a trimming strategy.`
    : f.trimmed.length
      ? `Turn ${turn}: fits at ${tokens(f.used)} tokens, but turns ${f.trimmed[0]}–${f.trimmed.at(-1)} ${f.summarized ? "survive only as a summary" : "are gone. The model no longer knows what was said there"}.`
      : `Turn ${turn}: ${tokens(f.used)} of ${tokens(WINDOW)} tokens. Every turn re-sends the whole chat, so the prompt keeps growing.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Engineering · interactive"
        title="The context window, turn by turn"
        blurb="A model has no memory between calls. Every turn, your app re-sends the system prompt, the tools, the whole chat and any retrieved notes, and it all has to fit. Play a long chat and watch the window fill."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5" aria-label="What fills the context window this turn">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">Turn {turn} of {TURNS}</p>
                <p className="font-mono text-sm" style={{ color: f.rejected ? "var(--bad)" : "var(--text)" }}>
                  {tokens(f.used)} / {tokens(WINDOW)} tokens
                </p>
              </div>

              <div className="relative mt-4 h-14 w-full overflow-hidden rounded-lg bg-[var(--track)]">
                <div className="flex h-full">
                  {f.segments.map((s) => (
                    <div
                      key={s.id}
                      title={`${s.label}: ${tokens(s.tokens)}`}
                      className="h-full border-r border-[var(--bg)] transition-[width] duration-300"
                      style={{
                        width: `${(s.tokens / scale) * 100}%`,
                        background: s.id === "answer" ? `repeating-linear-gradient(45deg, var(--ghost) 0 6px, transparent 6px 12px)` : COLOR[s.id],
                      }}
                    />
                  ))}
                </div>
                {/* the window limit */}
                <div className="absolute inset-y-0 border-r-2 border-dashed" style={{ left: `${(WINDOW / scale) * 100}%`, borderColor: f.rejected ? "var(--bad)" : "var(--text)" }} />
                {f.rejected && (
                  <div className="absolute inset-y-0 right-0" style={{ left: `${(WINDOW / scale) * 100}%`, background: "color-mix(in srgb, var(--bad) 30%, transparent)" }} />
                )}
              </div>

              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
                {f.segments.map((s) => (
                  <li key={s.id} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.id === "answer" ? "var(--ghost)" : COLOR[s.id] }} />
                    {s.label} <span className="font-mono text-[var(--faint)]">{tokens(s.tokens)}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-5 text-sm font-medium">What the model can see of the chat</p>
              <ol className="mt-2 grid grid-cols-5 gap-1.5 sm:grid-cols-10">
                {Array.from({ length: TURNS }, (_, i) => i + 1).map((t) => {
                  const future = t > turn;
                  const kept = f.kept.includes(t);
                  const gone = f.trimmed.includes(t);
                  return (
                    <li
                      key={t}
                      className="grid h-11 place-items-center rounded-md border font-mono text-xs"
                      style={{
                        borderColor: kept ? "var(--c3)" : gone && f.summarized ? "var(--c4)" : "var(--line)",
                        background: kept ? "color-mix(in srgb, var(--c3) 18%, transparent)" : gone && f.summarized ? "color-mix(in srgb, var(--c4) 14%, transparent)" : "transparent",
                        color: future ? "var(--faint)" : gone && !f.summarized ? "var(--bad)" : "var(--text)",
                        textDecoration: gone && !f.summarized ? "line-through" : undefined,
                        opacity: future ? 0.5 : 1,
                      }}
                    >
                      {t}
                    </li>
                  );
                })}
              </ol>
              <p className="mt-3 font-mono text-xs text-[var(--faint)]">
                this call {f.rejected ? "rejected" : usd(f.cost.total)}
                {caching && turn > 1 && !f.rejected ? ` · ${usd(f.cost.withoutCache)} without caching` : ""}
              </p>
            </section>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <RunButton busy={busy} onClick={next} accent={ACCENT} running="Building the prompt…">
                {turn >= TURNS ? "Start over" : "Next turn"}
              </RunButton>
              <div className="w-full">
                <Choices label="When it doesn't fit" accent={ACCENT} value={strategy} onChange={setStrategy} options={STRATEGIES.map((s) => ({ id: s.id, label: s.label }))} />
              </div>
              <div className="w-full">
                <Slider label="Retrieved notes per turn" hint={`${PARTS.docsPerChunk} tokens each`} value={chunks} min={0} max={6} step={1} format={(v) => String(v)} accent={ACCENT} onChange={setChunks} />
              </div>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" checked={caching} onChange={(e) => setCaching(e.target.checked)} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                Prompt caching
              </label>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Start with the fixed prefix" what="The system prompt and the tool definitions go first, every single call." accent={ACCENT} active={on(0)}>
                <p className="font-mono text-sm">
                  {tokens(PARTS.system)} + {tokens(PARTS.tools)} = {tokens(PARTS.system + PARTS.tools)} tokens
                </p>
              </FlowStep>
              <FlowArrow label="same prefix as last turn" accent={ACCENT} active={on(1)} />

              <FlowStep n={2} title="Add the whole chat so far" what="The model remembers nothing. Each turn sends every earlier message again, so this part grows every turn." accent={ACCENT} active={on(1)}>
                <p className="text-sm">
                  {turn} {turn === 1 ? "turn" : "turns"} said, {f.kept.length} sent ·{" "}
                  <span className="font-mono">{tokens(f.segments.find((s) => s.id === "history")!.tokens)} tokens</span>
                </p>
              </FlowStep>
              <FlowArrow label="+ retrieved notes" accent={ACCENT} active={on(2)} />

              <FlowStep n={3} title="Add retrieved notes" what="RAG pastes notes into the prompt. More notes can mean better answers, and always means less room." accent={ACCENT} active={on(2)}>
                <p className="font-mono text-sm">
                  {chunks} × {PARTS.docsPerChunk} = {tokens(chunks * PARTS.docsPerChunk)} tokens
                </p>
              </FlowStep>
              <FlowArrow label="+ room to answer" accent={ACCENT} active={on(3)} />

              <FlowStep n={4} title="Reserve room for the answer" what="The answer is written into the same window. max_tokens holds that space back." accent={ACCENT} active={on(3)}>
                <p className="font-mono text-sm">{tokens(PARTS.answer)} tokens held back</p>
              </FlowStep>
              <FlowArrow label={`${tokens(f.used)} tokens`} accent={ACCENT} active={on(4)} />

              <FlowStep n={5} title="Make it fit the window" what="Over the limit, the call fails. Your app has to decide what to forget: the oldest turns, or a summary of them." accent={ACCENT} active={on(4) || (stage === null && (f.rejected || f.trimmed.length > 0))}>
                <p className="text-sm">
                  {f.rejected
                    ? `${tokens(f.over)} tokens too many. Nothing is trimmed, so this call is refused.`
                    : f.trimmed.length === 0
                      ? "Fits. Nothing trimmed yet."
                      : f.summarized
                        ? `Turns ${f.trimmed[0]}–${f.trimmed.at(-1)} were replaced by a ${PARTS.summary}-token summary. Details are lost, the gist stays.`
                        : `Turns ${f.trimmed[0]}–${f.trimmed.at(-1)} were dropped. Ask about them now and the model can only guess.`}
                </p>
                <p className="mt-2 text-xs text-[var(--faint)]">{STRATEGIES.find((s) => s.id === strategy)!.what}</p>
              </FlowStep>
              <FlowArrow label="one request" accent={ACCENT} active={on(5)} />

              <FlowStep n={6} title="Send it, and pay for every token" what="You pay for all input tokens on every call. A cached prefix is billed at about a tenth of the price. Then the next turn starts at step 1." accent={ACCENT} active={on(5)}>
                {f.rejected ? (
                  <p className="text-sm" style={{ color: "var(--bad)" }}>
                    Rejected: context length exceeded.
                  </p>
                ) : (
                  <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-y-1 text-sm">
                    <dt className="text-[var(--muted)]">Input at ${PRICE.input}/M</dt>
                    <dd className="font-mono">{usd(f.cost.input)}</dd>
                    <dt className="text-[var(--muted)]">Cached prefix at ${PRICE.cachedInput}/M</dt>
                    <dd className="font-mono">{usd(f.cost.cached)}</dd>
                    <dt className="text-[var(--muted)]">300 output tokens at ${PRICE.output}/M</dt>
                    <dd className="font-mono">{usd(f.cost.output)}</dd>
                    <dt className="font-medium">This call</dt>
                    <dd className="font-mono font-medium">{usd(f.cost.total)}</dd>
                  </dl>
                )}
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
