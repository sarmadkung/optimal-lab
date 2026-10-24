"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { FIRST, FIXED, MESSAGES, MS, check, luhn, redact, runAll, type Design, type OutputMode } from "@/lib/guardrailTools";

const ACCENT = "var(--tools)";
const sec = (ms: number) => `${(ms / 1000).toFixed(2)} s`;

export default function GuardrailToolsDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [pick, setPick] = useState(6);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const all = runAll(d);
  const m = MESSAGES.find((x) => x.id === pick)!;
  const c = check(m, d);
  const red = d.pii === "off" ? null : redact(m.user, d.pii === "luhn");

  const nodes: MapNode[] = [
    { id: "user", label: "Customer", sub: c.reached ? "saw something bad" : "chat", at: [14, 18], mobileAt: [25, 12], state: c.reached ? "bad" : "active" },
    { id: "in", label: "Input guard", sub: d.input ? "injection classifier" : "off", at: [50, 18], mobileAt: [75, 12], state: d.input ? (m.injection ? "wait" : "good") : "dim" },
    { id: "pii", label: "PII filter", sub: d.pii === "off" ? "off" : d.pii === "luhn" ? "patterns + Luhn" : "patterns", at: [86, 18], mobileAt: [75, 42], state: d.pii === "off" ? "dim" : c.falseRedaction ? "bad" : "good" },
    { id: "model", label: "Model", sub: "streams a reply", at: [86, 82], mobileAt: [75, 76], state: m.badReply ? "wait" : "active" },
    { id: "out", label: "Output guard", sub: d.output === "off" ? "off" : d.output === "buffer" ? "whole answer" : d.output === "sentence" ? "per sentence" : "after the fact", at: [50, 82], mobileAt: [25, 76], state: d.output === "off" ? "dim" : d.output === "async" && m.badReply ? "bad" : "good" },
    { id: "logs", label: "Logs + traces", sub: d.pii === "off" ? "prompts as sent" : "masked", at: [14, 82], mobileAt: [25, 42], state: d.pii === "off" ? "bad" : "good" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("i", ["user", "in"], { label: m.injection ? "“ignore your rules…”" : "message", tone: m.injection && !d.input ? "bad" : undefined })
    : stage === 1 ? (c.blocked ? [] : hops("p", ["in", "pii", "model"], { label: red?.found.length ? `${red.found.length} masked` : "as typed", tone: c.falseRedaction ? "bad" : undefined }))
    : stage === 2 ? (c.blocked ? [] : hops("o", ["model", "out"], { label: d.output === "buffer" ? "whole answer" : d.output === "sentence" ? "sentence by sentence" : "tokens" }))
    : stage === 3 ? (c.blocked ? hops("r", ["in", "user"], { label: "refused", tone: "good" }) : hops("u", ["out", "user"], { label: c.reached ? c.reached : "reply", tone: c.reached ? "bad" : "good" }))
    : stage === 4 ? hops("l", ["out", "logs"], { label: c.piiToModel ? "raw PII" : "masked" })
    : [];

  const captions = [
    `Step 1: ${m.note}: “${m.user}”.`,
    c.blocked ? "Step 2: the input guard refuses it before the model sees it." : red ? `Step 2: ${red.found.length ? `masked before the model: ${red.found.join(", ")}` : "nothing to mask"}${c.falseRedaction ? "; the order number was wrongly masked as a card" : ""}.` : "Step 2: the message goes to the model as typed.",
    c.blocked ? "Step 3: no model call." : d.output === "buffer" ? `Step 3: the whole answer is held until checked: first word after ${sec(c.ttft)}.` : d.output === "sentence" ? `Step 3: each sentence is checked before it's shown: first words after ${sec(c.ttft)}.` : d.output === "async" ? "Step 3: tokens stream straight to the customer; the check runs afterwards." : "Step 3: the reply streams with no output check.",
    c.reached ? `Step 4: ${c.reached} reached the customer.` : m.badReply && !c.blocked ? `Step 4: the output guard replaced ${m.badReply}.` : "Step 4: the reply is fine.",
    `Step 5: ${all.outage}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${all.reached} bad replies reached customers · ${all.falseBlocks} wrongly masked · ${all.piiSent} message${all.piiSent === 1 ? "" : "s"} sent raw to the model and logs · first word after ${sec(all.ttft)}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="Tools · interactive"
        title="Guardrail tools"
        blurb="Guardrail libraries and services (Guardrails AI, NeMo Guardrails, Llama Guard, Presidio) check what goes into a model and what comes out. Where you put them decides what they catch, how long a streamed answer takes to start, and what happens when the guard itself is down. Send six messages through a support bot."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Customer, input guard, PII filter, the model, the output guard, and logs"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "user", to: "in", label: "message" },
                  { from: "in", to: "pii", label: "allowed" },
                  { from: "pii", to: "model", label: "prompt" },
                  { from: "model", to: "out", label: "reply" },
                  { from: "out", to: "logs", label: "record" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Six messages and what reached the customer">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">messages · pick one</p>
                <ul className="mt-2 space-y-0.5">
                  {all.results.map((x) => (
                    <li key={x.m.id}>
                      <button type="button" aria-pressed={x.m.id === pick} onClick={() => setPick(x.m.id)} className="grid min-h-11 w-full grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-1.5 text-left text-xs" style={{ background: x.m.id === pick ? `color-mix(in srgb, ${ACCENT} 14%, transparent)` : "transparent" }}>
                        <span className="font-mono text-[var(--faint)]">{x.m.id}</span>
                        <span className="min-w-0 truncate">{x.m.note}</span>
                        <span className="text-right text-[11px]" style={{ color: x.reached || x.falseRedaction || x.piiToModel ? "var(--bad)" : "var(--good)" }}>
                          {x.reached ? "reached user" : x.falseRedaction ? "wrongly masked" : x.piiToModel ? "raw PII sent" : x.blocked ? "refused" : "fine"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                {red && (
                  <p className="mt-2 break-words font-mono text-[10px] text-[var(--muted)]">
                    to the model: “{red.out}”
                  </p>
                )}
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Output check only
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Layered, streaming-friendly
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Checking…">
                {`Send message ${m.id}`}
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Check the input before the model sees it" what={`A classifier for prompt injection and off-topic requests runs in about ${MS.inputGuard} ms. Refusing early is cheaper than cleaning up a reply.`} accent={ACCENT} active={at(0)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.input} onChange={(e) => set({ input: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Input guard
                </label>
              </FlowStep>
              <FlowArrow label="message" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Mask personal data, without masking order numbers" what="Patterns find emails and card-like numbers in milliseconds, and also match any 16-digit order number. A Luhn checksum, which every real card number passes, tells the two apart." accent={ACCENT} active={at(1)}>
                <Choices<Design["pii"]> label="PII filter" accent={ACCENT} value={d.pii} onChange={(v) => set({ pii: v })} options={[{ id: "off", label: "Off" }, { id: "pattern", label: "Patterns" }, { id: "luhn", label: "Patterns + Luhn" }]} />
                <p className="mt-2 font-mono text-[11px] text-[var(--muted)]">
                  Luhn(4242 4242 4242 4242) = {String(luhn("4242 4242 4242 4242"))} · Luhn(1234 5678 9012 3456) = {String(luhn("1234 5678 9012 3456"))}
                </p>
              </FlowStep>
              <FlowArrow label="prompt" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Check the output, and decide how that meets streaming" what={`Checking the whole answer before showing it removes streaming: the first word waits ${sec(MS.fullAnswer + MS.outputCheck)}. Checking each sentence before releasing it keeps most of the speed. Checking afterwards adds nothing and only tells you what the customer already saw.`} accent={ACCENT} active={at(2)}>
                <Choices<OutputMode> label="Output guard" accent={ACCENT} value={d.output} onChange={(v) => set({ output: v })} options={[{ id: "off", label: "Off" }, { id: "buffer", label: "Whole answer" }, { id: "sentence", label: "Per sentence" }, { id: "async", label: "Afterwards (log)" }]} />
              </FlowStep>
              <FlowArrow label="reply" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Decide what happens when the guard is down" what="A guard is another service that can time out. Failing closed refuses every request while it's down; failing open lets requests through unchecked and should page someone. Pick per guard: open for tone, closed for anything legal or financial." accent={ACCENT} active={at(3)}>
                <Choices<Design["outage"]> label="If a guard times out" accent={ACCENT} value={d.outage} onChange={(v) => set({ outage: v })} options={[{ id: "closed", label: "Fail closed" }, { id: "open", label: "Fail open + alert" }]} />
              </FlowStep>
              <FlowArrow label="records" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Count catches, false blocks and delay" what="A guard is judged on all three: what it stopped, what it stopped by mistake, and what it cost every customer in waiting." accent={ACCENT} active={at(4)}>
                <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-xs">
                  <dt>Bad replies that reached customers</dt>
                  <dd className="text-right font-mono" style={{ color: all.reached ? "var(--bad)" : "var(--good)" }}>{all.reached}</dd>
                  <dt>Order numbers masked by mistake</dt>
                  <dd className="text-right font-mono" style={{ color: all.falseBlocks ? "var(--bad)" : "var(--good)" }}>{all.falseBlocks}</dd>
                  <dt>Raw PII sent to the model and logs</dt>
                  <dd className="text-right font-mono" style={{ color: all.piiSent ? "var(--bad)" : "var(--good)" }}>{all.piiSent}</dd>
                  <dt>Time to first word</dt>
                  <dd className="text-right font-mono">{sec(all.ttft)}</dd>
                </dl>
                <p className="mt-2 text-[11px] text-[var(--faint)]">PII patterns and the Luhn check run on the messages here; classifier verdicts and latencies are illustrative.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
