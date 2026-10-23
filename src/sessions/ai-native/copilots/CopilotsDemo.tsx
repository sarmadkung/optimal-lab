"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type Packet } from "@/components/system/SystemMap";
import { DEBOUNCES, GAPS, MODELS, TEXT, simulate, type ModelId } from "@/lib/copilot";

const ACCENT = "var(--native)";
const s1 = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

export default function CopilotsDemo() {
  const [debounce, setDebounce] = useState(0);
  const [model, setModel] = useState<ModelId>("small");
  const [gate, setGate] = useState(false);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const o = { debounce, model, minConf: gate ? 0.6 : 0 };
  const r = simulate(o);
  const m = MODELS.find((x) => x.id === model)!;
  const longPauses = GAPS.filter((g) => g >= 400).length;

  const packets: Packet[] =
    stage === 0 ? hops("k", ["user", "editor"], { label: `${TEXT.length} keystrokes` })
    : stage === 1 ? hops("req", ["editor", "model"], { label: `${r.requests} requests` })
    : stage === 2 ? hops("sug", ["model", "gate"], { label: `${r.requests - r.stale} in time`, tone: r.stale > r.requests / 2 ? "bad" : "good" })
    : stage === 3 ? hops("show", ["gate", "editor"], { label: `${r.shown} shown` })
    : stage === 4 ? hops("tab", ["user", "editor"], { label: `Tab × ${r.accepted}`, tone: r.accepted ? "good" : "bad" })
    : [];

  const captions = [
    `Step 1: someone types a ${TEXT.length}-character reply in ${s1(r.plainMs)}, with ${longPauses} pauses of 0.4 s or more.`,
    debounce ? `Step 2: the editor waits for ${debounce} ms without a keystroke before asking: ${r.requests} requests.` : `Step 2: the editor asks after every keystroke: ${r.requests} requests.`,
    `Step 3: ${m.label.toLowerCase()} model answers in ${m.latencyMs} ms; ${r.stale} answers arrive after the next keystroke and are thrown away.`,
    gate ? `Step 4: suggestions under 60% confidence are hidden (${r.hidden}); ${r.shown} are shown as grey text.` : `Step 4: every answer that arrives in time is shown: ${r.shown} grey suggestions, ${r.ignored} of them wrong.`,
    `Step 5: Tab accepts ${r.accepted}, saving ${r.keysSaved} keystrokes and ${s1(r.plainMs - r.totalMs)}; $${r.costPer1000.toFixed(2)} per 1,000 emails.`,
  ];
  const caption = stage !== null ? captions[stage] : `${m.label}, ${debounce} ms debounce${gate ? ", confident only" : ""}: ${r.requests} requests, ${r.shown} shown, ${r.accepted} accepted, ${r.keysSaved} of ${TEXT.length} keystrokes saved, $${r.costPer1000.toFixed(2)} per 1,000 emails.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Native · interactive"
        title="Copilots and inline suggestions"
        blurb="Grey text that finishes your sentence is a timing problem more than a model problem. Ask too eagerly and you pay for answers that arrive after the next keystroke; ask a slow model and it misses every pause; show everything and the user learns to ignore it. Replay one typed email under each setting."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Person typing, editor with a debounce timer, model and a confidence gate"
                accent={ACCENT}
                chrome="split"
                nodes={[
                  { id: "user", label: "Person typing", sub: `${r.keysTyped} keys typed`, at: [11, 50], mobileAt: [50, 8], state: "active" },
                  { id: "editor", label: "Editor", sub: debounce ? `waits ${debounce} ms` : "asks every key", at: [38, 50], mobileAt: [50, 36], state: "active" },
                  { id: "model", label: "Model", sub: `${m.latencyMs} ms`, at: [86, 50], mobileAt: [78, 66], state: r.stale > r.requests / 2 ? "wait" : "active" },
                  { id: "gate", label: "Confidence gate", sub: gate ? `${r.hidden} hidden` : "off", at: [62, 16], mobileAt: [22, 66], state: gate ? "active" : "dim" },
                ]}
                links={[
                  { from: "user", to: "editor", label: "keys / Tab" },
                  { from: "editor", to: "model", label: "text so far" },
                  { from: "model", to: "gate", label: "suggestion" },
                  { from: "gate", to: "editor", label: "grey text" },
                ]}
                packets={packets}
                aspect={1.6}
                mobileAspect={0.95}
              />
              <Timeline debounce={debounce} model={model} gate={gate} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full space-y-3">
                <Choices label="Ask after a pause of" accent={ACCENT} value={String(debounce)} onChange={(v) => setDebounce(Number(v))} options={DEBOUNCES.map((d) => ({ id: String(d), label: d ? `${d} ms` : "every key" }))} />
                <Choices label="Model" accent={ACCENT} value={model} onChange={setModel} options={MODELS.map((x) => ({ id: x.id, label: x.label }))} />
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Typing…">
                Replay the email
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Watch how people actually type" what="Typing comes in bursts: a character every 100–200 ms inside a word, a little longer between words, and real pauses where someone thinks, at a new sentence or before a detail like a date. Suggestions are only useful in those pauses." accent={ACCENT} active={at(0)}>
                <p className="font-mono text-xs text-[var(--muted)]">
                  {TEXT.length} characters · {s1(r.plainMs)} · {longPauses} pauses ≥ 0.4 s
                </p>
              </FlowStep>
              <FlowArrow label="keystrokes" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Wait for a pause before asking" what="Asking on every keystroke means paying for a model call per character, nearly all of them overtaken by the next key. A debounce waits until the user stops for a moment; too long a wait and the pause is over before the request goes out." accent={ACCENT} active={at(1)}>
                <Choices label="Ask after a pause of" accent={ACCENT} value={String(debounce)} onChange={(v) => setDebounce(Number(v))} options={DEBOUNCES.map((d) => ({ id: String(d), label: d ? `${d} ms` : "every key" }))} />
                <p className="mt-2 font-mono text-xs">{r.requests} requests for one email</p>
              </FlowStep>
              <FlowArrow label="text so far" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Ask the model, and drop late answers" what="An answer that arrives after the user typed again is for text that no longer exists: throw it away. A small model answers inside most pauses; a large one writes better suggestions but only fits the long pauses." accent={ACCENT} active={at(2)}>
                <Choices label="Model" accent={ACCENT} value={model} onChange={setModel} options={MODELS.map((x) => ({ id: x.id, label: x.label }))} />
                <p className="mt-2 font-mono text-xs">
                  {m.latencyMs} ms per answer · <span style={{ color: r.stale ? "var(--bad)" : "var(--good)" }}>{r.stale} arrived too late</span>
                </p>
              </FlowStep>
              <FlowArrow label="suggestions in time" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Show only suggestions worth reading" what="Every wrong grey suggestion costs a glance, and after enough of them people stop looking. Hide the ones the model is unsure of; that also hides a few that would have been right." accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={gate} onChange={(e) => setGate(e.target.checked)} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Only show suggestions with 60%+ confidence
                </label>
                <p className="font-mono text-xs">
                  {r.shown} shown · <span style={{ color: r.ignored > 3 ? "var(--bad)" : "var(--text)" }}>{r.ignored} wrong ones shown</span> · {r.hidden} hidden
                </p>
              </FlowStep>
              <FlowArrow label="Tab" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Count what Tab saved, and what it cost" what="Measure accepted suggestions and keystrokes saved, not suggestions shown. Then price the requests: the cheapest setting that keeps most of the savings is the one to ship." accent={ACCENT} active={at(4)}>
                <Grid model={model} gate={gate} debounce={debounce} />
                <p className="mt-2 text-[11px] text-[var(--faint)]">The keystroke timing is a seeded synthetic trace and the suggestions are illustrative; the debounce, latency, discarding, gate, Tab and cost run for real. Cost assumes 600 tokens of context per request.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

// The email as typed: accepted text in the accent colour, marks where suggestions were shown or arrived too late.
function Timeline({ debounce, model, gate }: { debounce: number; model: ModelId; gate: boolean }) {
  const r = simulate({ debounce, model, minConf: gate ? 0.6 : 0 });
  const accepted = new Set<number>();
  for (const e of r.events) if (e.kind === "accepted") for (let k = 0; k < (e.text ?? "").length; k++) accepted.add(e.pos + k);
  const markAt = new Map<number, "stale" | "ignored" | "accepted">();
  for (const e of r.events) if (e.kind === "stale" || e.kind === "ignored" || e.kind === "accepted") markAt.set(e.pos, markAt.get(e.pos) === "accepted" ? "accepted" : e.kind);
  const color = { stale: "var(--faint)", ignored: "var(--bad)", accepted: "var(--good)" };
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="The email, with accepted suggestions and where suggestions were dropped or ignored">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">the email</p>
        <p className="font-mono text-[11px]">
          <span style={{ color: color.accepted }}>▲ accepted</span> <span style={{ color: color.ignored }}>▲ wrong, shown</span> <span style={{ color: color.stale }}>▲ too late</span>
        </p>
      </div>
      <p className="mt-3 font-mono text-sm leading-loose break-words">
        {[...TEXT].map((ch, i) => (
          <span key={i} className="relative" style={{ color: accepted.has(i) ? ACCENT : "var(--text)", fontWeight: accepted.has(i) ? 600 : 400 }}>
            {markAt.has(i) && (
              <span aria-hidden className="absolute -bottom-3 left-0 text-[9px] leading-none" style={{ color: color[markAt.get(i)!] }}>
                ▲
              </span>
            )}
            {ch}
          </span>
        ))}
      </p>
      <p className="mt-3 font-mono text-[11px] text-[var(--muted)]">
        {r.keysSaved} of {TEXT.length} characters came from Tab · {s1(r.totalMs)} instead of {s1(r.plainMs)}
      </p>
    </section>
  );
}

function Grid({ model, gate, debounce }: { model: ModelId; gate: boolean; debounce: number }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] gap-x-3 gap-y-0.5 font-mono text-[11px]">
      <span className="text-[var(--faint)]">pause</span>
      <span className="text-right text-[var(--faint)]">requests</span>
      <span className="text-right text-[var(--faint)]">accepted</span>
      <span className="text-right text-[var(--faint)]">keys saved</span>
      <span className="text-right text-[var(--faint)]">$/1k emails</span>
      {DEBOUNCES.map((d) => {
        const x = simulate({ debounce: d, model, minConf: gate ? 0.6 : 0 });
        const on = d === debounce;
        return [
          <span key={`${d}a`} style={{ fontWeight: on ? 600 : 400, color: on ? "var(--text)" : "var(--muted)" }}>
            {d ? `${d} ms` : "every key"}
          </span>,
          <span key={`${d}b`} className="text-right">
            {x.requests}
          </span>,
          <span key={`${d}c`} className="text-right">
            {x.accepted}
          </span>,
          <span key={`${d}d`} className="text-right">
            {x.keysSaved}
          </span>,
          <span key={`${d}e`} className="text-right">
            {x.costPer1000.toFixed(2)}
          </span>,
        ];
      })}
    </div>
  );
}
