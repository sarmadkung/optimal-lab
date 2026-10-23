"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type Packet } from "@/components/system/SystemMap";
import { FACTS, LENGTHS, SOURCE_WORDS, STRATEGIES, THREAD, score, type Length, type Strategy } from "@/lib/factfulSummary";

const ACCENT = "var(--native)";

export default function SummarizationDemo() {
  const [strategy, setStrategy] = useState<Strategy>("plain");
  const [len, setLen] = useState<Length>(40);
  const [check, setCheck] = useState(false);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const r = score(strategy, len);
  const facts = strategy === "facts";

  const packets: Packet[] =
    stage === 0 ? hops("t", ["thread", facts ? "facts" : "writer"], { label: `${THREAD.length} messages` })
    : stage === 1 ? (facts ? hops("f", ["facts", "writer"], { label: `${FACTS.length} facts` }) : [])
    : stage === 2 ? hops("w", ["writer", "check"], { label: `${r.words} words` })
    : stage === 3 ? hops("c", ["check", "screen"], { label: check ? (r.bad.length ? `${r.bad.length} unsupported` : "all found") : "unchecked", tone: check && r.bad.length ? "bad" : "good" })
    : stage === 4 ? hops("s", ["screen", "check"], { label: `${r.keyKept}/${r.keyTotal} key facts`, tone: r.keyKept === r.keyTotal ? "good" : "bad" })
    : [];

  const captions = [
    `Step 1: the next agent needs the money, the dates, what was decided, who owns what, and what is still open.`,
    facts ? `Step 2: a first pass lists ${FACTS.length} facts from the thread before any sentence is written.` : "Step 2: skipped: the model goes straight from the thread to prose.",
    `Step 3: about ${len} words asked for, ${r.words} written: ${r.kept} of ${FACTS.length} facts made it in.`,
    check ? `Step 4: ${r.claims.length} numbers, dates and names checked against the thread; ${r.bad.length ? `${r.bad.map((b) => b.claim).join(" and ")} ${r.bad.length === 1 ? "is" : "are"} not in it` : "every one is there"}.` : "Step 4: nothing is checked; whatever the model wrote goes on the agent's screen.",
    `Step 5: ${r.keyKept} of the ${r.keyTotal} facts the agent needs to act are in the summary${r.facts.find((f) => f.fact.id === "open")!.kept ? "" : ", and it never says the invoice is still open"}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${STRATEGIES.find((s) => s.id === strategy)!.label}, ~${len} words: ${r.kept}/${FACTS.length} facts, ${r.keyKept}/${r.keyTotal} that matter${check ? `, ${r.bad.length} unsupported` : ""}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Native · interactive"
        title="Summarization that keeps the facts"
        blurb={`A support thread of ${SOURCE_WORDS} words goes to the next agent as a short summary. Shorter summaries drop the dates and owners first, and plain ones merge two charges into an amount nobody paid. List the facts before writing, then check every number and name against the thread.`}
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Support thread, fact list, model, claim check and the agent's screen"
                accent={ACCENT}
                chrome="split"
                nodes={[
                  { id: "thread", label: "Support thread", sub: `${SOURCE_WORDS} words`, at: [11, 30], mobileAt: [50, 8], state: "active" },
                  { id: "facts", label: "Fact list", sub: facts ? `${FACTS.length} facts` : "skipped", at: [37, 80], mobileAt: [22, 28], state: facts ? "active" : "dim" },
                  { id: "writer", label: "Model writes", sub: `~${len} words`, at: [63, 30], mobileAt: [50, 48], state: "active" },
                  { id: "check", label: "Claim check", sub: check ? `${r.bad.length} unsupported` : "off", at: [88, 30], mobileAt: [50, 69], state: !check ? "dim" : r.bad.length ? "bad" : "good" },
                  { id: "screen", label: "Agent's screen", sub: `${r.keyKept}/${r.keyTotal} key facts`, at: [88, 80], mobileAt: [50, 90], state: r.keyKept === r.keyTotal ? "good" : "bad" },
                ]}
                links={[
                  { from: "thread", to: "facts", label: "messages", dim: !facts },
                  { from: "facts", to: "writer", label: "facts", dim: !facts },
                  { from: "thread", to: "writer", label: "messages", dim: facts },
                  { from: "writer", to: "check", label: "summary" },
                  { from: "check", to: "screen", label: "shown" },
                ]}
                packets={packets}
                aspect={2}
                mobileAspect={0.72}
              />
              <SummaryCard strategy={strategy} len={len} check={check} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full space-y-3">
                <Choices label="Prompt" accent={ACCENT} value={strategy} onChange={setStrategy} options={STRATEGIES.map((s) => ({ id: s.id, label: s.label }))} />
                <Choices label="Length" accent={ACCENT} value={String(len)} onChange={(v) => setLen(Number(v) as Length)} options={LENGTHS.map((l) => ({ id: String(l), label: `~${l} words` }))} />
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Summarizing…">
                Summarize the thread
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Decide what the reader needs" what="A summary is for someone. The next agent on this case needs the amounts, the dates, what was decided, who owns the next step and what is still open. Those are the facts a summary must keep; the pleasantries can go." accent={ACCENT} active={at(0)}>
                <ol className="space-y-2 text-xs">
                  {THREAD.map((m, i) => (
                    <li key={i} className="rounded-md bg-[var(--inset)] p-2">
                      <span className="font-mono text-[11px] text-[var(--faint)]">
                        {m.who} · {m.when}
                      </span>
                      <span className="mt-0.5 block">{m.text}</span>
                    </li>
                  ))}
                </ol>
              </FlowStep>
              <FlowArrow label={facts ? "the thread" : "straight to prose"} accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="List the facts before writing" what="Asked for prose straight away, a model writes a smooth story and fits the facts in where they read well; at 20 words most don't fit. Asked first for a list of amounts, dates, decisions, owners and open items, it then writes from the list, most important first." accent={ACCENT} active={at(1)}>
                <Choices label="Prompt" accent={ACCENT} value={strategy} onChange={setStrategy} options={STRATEGIES.map((s) => ({ id: s.id, label: s.label }))} />
                <p className="mt-2 text-xs">{STRATEGIES.find((s) => s.id === strategy)!.one}</p>
                {facts && (
                  <ul className="mt-2 grid gap-x-3 gap-y-0.5 font-mono text-[11px] text-[var(--muted)] sm:grid-cols-2">
                    {FACTS.map((f) => (
                      <li key={f.id}>
                        {f.key ? "● " : "○ "}
                        {f.label}
                      </li>
                    ))}
                  </ul>
                )}
              </FlowStep>
              <FlowArrow label={facts ? `${FACTS.length} facts` : "the thread"} accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Write to a length" what="Every cut is a choice about what to drop. A plain summary drops whatever reads least smoothly, often dates and owners, and at the shortest length it merges “£1,240 twice” into a £2,480 refund. Writing from a ranked list drops the least important facts first." accent={ACCENT} active={at(2)}>
                <Choices label="Length" accent={ACCENT} value={String(len)} onChange={(v) => setLen(Number(v) as Length)} options={LENGTHS.map((l) => ({ id: String(l), label: `~${l} words` }))} />
                <p className="mt-2 font-mono text-xs">
                  {r.words} words · {Math.round((r.words / SOURCE_WORDS) * 100)}% of the thread · {r.kept}/{FACTS.length} facts
                </p>
              </FlowStep>
              <FlowArrow label="summary" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Check every number and name against the thread" what="Pull each amount, date, number and name out of the summary and look for it in the source. Anything not there was changed or invented. This catches a wrong amount; it can't catch “Case closed”, a false claim made of ordinary words, which needs a second model comparing each sentence with the thread." accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={check} onChange={(e) => setCheck(e.target.checked)} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Check numbers, dates and names against the thread
                </label>
                <ul className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                  {r.claims.map((c) => (
                    <li key={c.claim} className="rounded px-1.5 py-0.5" style={{ background: "var(--inset)", color: !check ? "var(--faint)" : c.found ? "var(--good)" : "var(--bad)" }}>
                      {check ? (c.found ? "✓ " : "✗ ") : ""}
                      {c.claim}
                    </li>
                  ))}
                </ul>
              </FlowStep>
              <FlowArrow label="what survived" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Score the facts that matter" what="Count facts, not words. Coverage of the facts the reader needs (●) is the score; “no unsupported claims” is the floor. Run the same thread through every prompt and length, and pick the shortest one that keeps them all." accent={ACCENT} active={at(4)}>
                <ul className="grid gap-x-3 gap-y-0.5 text-xs sm:grid-cols-2">
                  {r.facts.map(({ fact, kept }) => (
                    <li key={fact.id} style={{ color: kept ? "var(--good)" : fact.key ? "var(--bad)" : "var(--muted)" }}>
                      {kept ? "✓" : "✗"} {fact.key ? "● " : "○ "}
                      {fact.label}
                    </li>
                  ))}
                </ul>
                <Grid />
                <p className="mt-2 text-[11px] text-[var(--faint)]">The summaries are illustrative. Fact coverage and the claim check run for real on their text.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function SummaryCard({ strategy, len, check }: { strategy: Strategy; len: Length; check: boolean }) {
  const r = score(strategy, len);
  const bad = check ? r.bad.map((b) => b.claim) : [];
  const parts = bad.length ? r.text.split(new RegExp(`(${bad.map((b) => b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`)) : [r.text];
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="The summary the next agent sees">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">on the agent&apos;s screen</p>
        <p className="font-mono text-xs" style={{ color: r.keyKept === r.keyTotal ? "var(--good)" : "var(--bad)" }}>
          {r.words} words · {r.keyKept}/{r.keyTotal} key facts
        </p>
      </div>
      <p className="mt-3 text-sm leading-relaxed">
        {parts.map((p, i) =>
          bad.includes(p) ? (
            <mark key={i} className="rounded-sm px-0.5 text-[var(--text)]" style={{ background: "color-mix(in srgb, var(--bad) 30%, transparent)" }}>
              {p}
            </mark>
          ) : (
            <span key={i}>{p}</span>
          ),
        )}
      </p>
    </section>
  );
}

function Grid() {
  return (
    <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-x-3 gap-y-0.5 font-mono text-[11px]">
      <span className="text-[var(--faint)]">prompt · length</span>
      <span className="text-right text-[var(--faint)]">words</span>
      <span className="text-right text-[var(--faint)]">key facts</span>
      <span className="text-right text-[var(--faint)]">unsupported</span>
      {STRATEGIES.flatMap((s) =>
        LENGTHS.map((l) => {
          const x = score(s.id, l);
          return [
            <span key={`${s.id}${l}a`}>
              {s.label} · {l}
            </span>,
            <span key={`${s.id}${l}b`} className="text-right">
              {x.words}
            </span>,
            <span key={`${s.id}${l}c`} className="text-right" style={{ color: x.keyKept === x.keyTotal ? "var(--good)" : "var(--bad)" }}>
              {x.keyKept}/{x.keyTotal}
            </span>,
            <span key={`${s.id}${l}d`} className="text-right" style={{ color: x.bad.length ? "var(--bad)" : "var(--good)" }}>
              {x.bad.length}
            </span>,
          ];
        }),
      )}
    </div>
  );
}
