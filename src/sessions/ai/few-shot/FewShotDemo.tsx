"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMapPanel } from "@/components/system/SystemMap";
import {
  EXAMPLES,
  INSTRUCTION,
  LABELS,
  MAJORITY,
  PRESETS,
  RECENCY,
  SIMILAR,
  TICKETS,
  classify,
  promptWords,
  runAll,
  scores,
  shotsFor,
  type Label,
} from "@/lib/fewShot";

const ACCENT = "var(--ai)";
const LABEL_COLOR: Record<Label, string> = { billing: "var(--c1)", bug: "var(--c2)", "how-to": "var(--c4)" };
const PARTS = [
  { key: "base", label: "own guess", color: "var(--ghost)" },
  { key: "similar", label: "a similar example", color: "var(--good)" },
  { key: "majority", label: "label count", color: "var(--c5)" },
  { key: "recency", label: "last example", color: "var(--c3)" },
] as const;

export default function FewShotDemo() {
  const [ids, setIds] = useState<string[]>(["e1", "e2", "e3"]);
  const [ticketId, setTicketId] = useState("t3");
  const { stage, busy, run } = useWalk(5, 1100);
  const shots = shotsFor(ids);
  const ticket = TICKETS.find((t) => t.id === ticketId)!;
  const all = runAll(shots);
  const mine = classify(ticket, shots);
  const sc = scores(ticket, shots);
  const max = Math.max(...sc.map((x) => x.total), 2);
  const preset = PRESETS.find((p) => p.ids.join() === ids.join());
  const at = (n: number) => stage === n;

  const toggle = (id: string) => setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const captions = [
    "Step 1: the instruction says what to do and names the three labels.",
    shots.length ? `Step 2: ${shots.length} worked ${shots.length === 1 ? "example" : "examples"} go in before the ticket.` : "Step 2: no examples. The model only has the instruction.",
    `Step 3: the model scores each label for “${ticket.text}” and picks ${mine.meant}.`,
    mine.parsed ? `Step 4: the reply is exactly “${mine.output}”, so your code can read it.` : `Step 4: the reply is “${mine.output}”. Your code expects one of three exact words and can't read it.`,
    `Step 5: ${all.right} of ${TICKETS.length} tickets filed correctly.`,
  ];
  const caption =
    stage !== null
      ? captions[stage]
      : `${all.right} of ${TICKETS.length} filed correctly${shots.length === 0 ? `, though ${all.meaningRight} replies meant the right thing` : ""}. ${preset ? preset.note : "Toggle examples in step 2: the order you add them in matters."}`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Engineering · interactive"
        title="Zero-shot and few-shot prompting"
        blurb="Ask a model to sort support tickets and it answers, but in its own words and by its own idea of each label. Add a few worked examples and the format locks in and your team's conventions carry over. Pick the wrong examples and they bias every answer."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5" aria-label="The prompt and how each ticket was filed">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">The prompt · about {promptWords(shots, ticket)} words</p>
              <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-[var(--inset)] p-3 font-mono text-[12px] leading-relaxed">
                <span className="text-[var(--muted)]">{INSTRUCTION}</span>
                {shots.map((e) => (
                  <span key={e.id}>
                    {"\n\n"}Ticket: {e.text}
                    {"\n"}Label: <span style={{ color: LABEL_COLOR[e.label] }}>{e.label}</span>
                  </span>
                ))}
                {"\n\n"}Ticket: {ticket.text}
                {"\n"}
                {shots.length ? "Label: " : ""}
                <span className="border-b border-dashed" style={{ borderColor: ACCENT, color: mine.right ? "var(--good)" : "var(--bad)" }}>
                  {mine.output}
                </span>
              </pre>

              <p className="mt-4 text-sm font-medium">All eight tickets</p>
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {all.results.map((r) => {
                  const selected = r.ticket.id === ticketId;
                  return (
                    <li key={r.ticket.id}>
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setTicketId(r.ticket.id)}
                        className="flex min-h-11 w-full items-start justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs"
                        style={{ borderColor: selected ? ACCENT : "var(--line)", background: selected ? `color-mix(in srgb, ${ACCENT} 10%, transparent)` : "transparent" }}
                      >
                        <span className="min-w-0 break-words">{r.ticket.text}</span>
                        <span className="shrink-0 font-mono" style={{ color: r.right ? "var(--good)" : "var(--bad)" }}>
                          {r.parsed ?? "?"} {r.right ? "✓" : "✗"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices label="Examples in the prompt" accent={ACCENT} value={preset?.id ?? null} onChange={(id) => setIds(PRESETS.find((p) => p.id === id)!.ids)} options={PRESETS.map((p) => ({ id: p.id, label: p.label }))} />
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Classifying…">
                Classify this ticket
              </RunButton>
              <p className="w-full font-mono text-sm">
                {all.right}/{TICKETS.length} right · {all.parsed}/{TICKETS.length} readable
              </p>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Write the instruction" what="Say what to do and list the allowed answers. Zero-shot prompting stops here: no examples, just the instruction." accent={ACCENT} active={at(0)}>
                <p className="font-mono text-sm">{INSTRUCTION}</p>
              </FlowStep>
              <FlowArrow label="instruction" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Add worked examples" what="Each example is an input with the answer you want. They can sit in the prompt like this, or as earlier user and assistant turns. Click to add or remove; the order counts." accent={ACCENT} active={at(1)}>
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {EXAMPLES.map((e) => {
                    const pos = ids.indexOf(e.id);
                    const inPrompt = pos >= 0;
                    return (
                      <li key={e.id}>
                        <button
                          type="button"
                          aria-pressed={inPrompt}
                          onClick={() => toggle(e.id)}
                          className="flex min-h-11 w-full items-start gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs"
                          style={{ borderColor: inPrompt ? LABEL_COLOR[e.label] : "var(--line)", color: inPrompt ? "var(--text)" : "var(--muted)" }}
                        >
                          <span className="w-4 shrink-0 font-mono">{inPrompt ? pos + 1 : "+"}</span>
                          <span className="min-w-0 flex-1 break-words">{e.text}</span>
                          <span className="shrink-0 font-mono" style={{ color: LABEL_COLOR[e.label] }}>
                            {e.label}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </FlowStep>
              <FlowArrow label={`${shots.length} ${shots.length === 1 ? "example" : "examples"} + the ticket`} accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="The model continues the pattern" what="Each label gets a score. The model's own guess comes first. A similar example pulls toward its label; so does every example, a little, and the last one most of all." accent={ACCENT} active={at(2)}>
                <p className="text-sm">{ticket.text}</p>
                <ul className="mt-2 space-y-2">
                  {sc.map((x) => (
                    <li key={x.label} className="grid grid-cols-[3.5rem_minmax(0,1fr)_2.5rem] items-center gap-2 text-xs">
                      <span className="font-mono" style={{ color: LABEL_COLOR[x.label], fontWeight: x.label === mine.meant ? 700 : 400 }}>
                        {x.label}
                      </span>
                      <span className="flex h-3 overflow-hidden rounded bg-[var(--track)]">
                        {PARTS.map((p) => (
                          <span key={p.key} className="h-full transition-[width] duration-300" style={{ width: `${(x[p.key] / max) * 100}%`, background: p.color }} />
                        ))}
                      </span>
                      <span className="text-right font-mono">{x.total.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
                <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--muted)]">
                  {PARTS.map((p) => (
                    <li key={p.key} className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
                      {p.label}
                      {p.key === "similar" ? ` +${SIMILAR}` : p.key === "majority" ? ` +${MAJORITY} each` : p.key === "recency" ? ` +${RECENCY}` : ""}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-[var(--faint)]">Click a ticket in the picture to follow it here.</p>
              </FlowStep>
              <FlowArrow label="reply text" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Parse the reply" what="Your code files the ticket only if the reply is exactly one of the labels. With no examples, the model picks its own wording." accent={ACCENT} active={at(3)}>
                <p className="font-mono text-sm">
                  reply: “{mine.output}” →{" "}
                  <span style={{ color: mine.parsed ? "var(--good)" : "var(--bad)" }}>{mine.parsed ? `filed as ${mine.parsed}` : "can't parse"}</span>
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  The team files it as <span className="font-mono">{ticket.label}</span>.
                </p>
              </FlowStep>
              <FlowArrow label={`${TICKETS.length} tickets`} accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Score every ticket" what="Run the same prompt over a test set and count. Examples fix the format first, then the edge cases. One-sided examples make it worse." accent={ACCENT} active={at(4)}>
                <ul className="space-y-1 text-sm">
                  {PRESETS.map((p) => {
                    const r = runAll(shotsFor(p.ids));
                    return (
                      <li key={p.id} className="flex items-baseline justify-between gap-2" style={{ fontWeight: preset?.id === p.id ? 600 : 400 }}>
                        <span className="min-w-0">{p.label}</span>
                        <span className="shrink-0 font-mono">
                          {r.right}/{TICKETS.length} right
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Each example costs prompt tokens on every call. Today&rsquo;s instruction-tuned models need fewer examples than GPT-3 did, so use a few varied ones that cover the hard cases, balanced across labels.
                </p>
                <p className="mt-1 text-xs text-[var(--faint)]">{LABELS.length} labels · scores are a teaching model of the label biases measured by Zhao et al. (2021)</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
