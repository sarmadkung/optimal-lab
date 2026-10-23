"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { LABELS, LATENCY_MS, METHODS, QUEUES, RULES, TICKETS, byRules, costPer10k, evaluate, predict, promptTokens, queueOf, type Method } from "@/lib/ticketClassification";

const ACCENT = "var(--native)";
const QUEUE_AT: Record<string, { at: [number, number]; mobileAt: [number, number] }> = {
  billing: { at: [84, 13], mobileAt: [25, 72] },
  eng: { at: [84, 38], mobileAt: [75, 72] },
  support: { at: [84, 63], mobileAt: [25, 92] },
  sales: { at: [84, 87], mobileAt: [75, 92] },
};

export default function ClassificationDemo() {
  const [method, setMethod] = useState<Method>("rules");
  const [pick, setPick] = useState(10);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const t = TICKETS.find((x) => x.id === pick)!;
  const p = predict(method, t);
  const ok = p === t.truth;
  const q = queueOf(p);
  const rightQ = q === queueOf(t.truth);
  const ev = evaluate(method);
  const rule = byRules(t.text);
  const m = METHODS.find((x) => x.id === method)!;

  const packets: Packet[] =
    stage === 0 ? hops("in", ["inbox", "clf"], { label: `ticket #${t.id}` })
    : stage === 2 ? hops("out", ["clf", "router"], { label: `"${p}"`, tone: ok ? "good" : "bad" })
    : stage === 3 ? hops("q", ["router", `q-${q}`], { label: `#${t.id}`, tone: rightQ ? "good" : "bad" })
    : stage === 4 && !rightQ ? hops("fix", [`q-${q}`, "router", `q-${queueOf(t.truth)}`], { label: "moved by hand", tone: "bad" })
    : [];

  const nodes: MapNode[] = [
    { id: "inbox", label: "Inbox", sub: `${TICKETS.length} tickets`, at: [16, 18], mobileAt: [50, 8], state: "active" },
    { id: "clf", label: "Classifier", sub: m.label.toLowerCase(), at: [16, 62], mobileAt: [50, 30], state: at(1) ? "wait" : "active" },
    { id: "router", label: "Router", sub: "label → queue", at: [50, 50], mobileAt: [50, 51], state: "active" },
    ...QUEUES.map((x) => ({
      id: `q-${x.id}`,
      label: x.label,
      sub: `${ev.rows.filter((r) => queueOf(r.p) === x.id).length} tickets`,
      ...QUEUE_AT[x.id],
      state: (x.id === q ? (rightQ ? "good" : "bad") : "idle") as MapNode["state"],
    })),
  ];

  const captions = [
    `Step 1: ticket #${t.id} arrives: “${t.text}”`,
    method === "rules"
      ? `Step 2: the rules run in order; ${rule.matched ? `“${rule.matched}” matches the ${rule.label} rule` : "nothing matches, so it falls through to other"}.`
      : `Step 2: ${m.label.toLowerCase()}, about ${LATENCY_MS[method]} ms.`,
    `Step 3: the answer is one label from the list: ${p}${ok ? "" : `, but the right one is ${t.truth}`}.`,
    `Step 4: ${p} goes to ${QUEUES.find((x) => x.id === q)!.label}${rightQ ? "." : `, the wrong team; ${QUEUES.find((x) => x.id === queueOf(t.truth))!.label} should have it.`}`,
    `Step 5: on all ${ev.total} labelled tickets this method gets ${ev.correct} right and sends ${ev.misrouted} to the wrong team.`,
  ];
  const caption = stage !== null ? captions[stage] : `${m.label}: ${ev.correct} of ${ev.total} right, ${ev.misrouted} sent to the wrong team, $${costPer10k(method).toFixed(2)} per 10,000 tickets.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Native · interactive"
        title="Classification and routing"
        blurb="Support tickets need to reach the right team. Keyword rules are free and instant, but miss paraphrases, negation and other languages. A model reads meaning, and still needs labels it can tell apart. Label the same sixteen tickets four ways and score each one."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Inbox, classifier, router and four team queues"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "inbox", to: "clf", label: "text" },
                  { from: "clf", to: "router", label: "label" },
                  ...QUEUES.map((x) => ({ from: "router", to: `q-${x.id}`, label: x.label, dim: stage !== null && stage >= 3 && x.id !== q && !(stage === 4 && x.id === queueOf(t.truth)) })),
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.78}
              />
              <TicketTable method={method} pick={pick} setPick={setPick} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices label="Classifier" accent={ACCENT} value={method} onChange={setMethod} options={METHODS.map((x) => ({ id: x.id, label: x.label }))} />
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Classifying…">
                {`Classify ticket #${t.id}`}
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Write down what each label means" what="Before any code, the team agrees on a short list of labels and one sentence each. Where two labels overlap (an upgrade that was billed wrong), the definition decides. “Other” catches the rest so nothing is forced into a wrong box." accent={ACCENT} active={at(0)}>
                <ul className="space-y-1.5 text-xs">
                  {LABELS.map((l) => (
                    <li key={l.id} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2">
                      <span className="font-mono" style={{ color: ACCENT }}>
                        {l.name}
                      </span>
                      <span style={{ color: method === "defs" ? "var(--text)" : "var(--faint)" }}>{l.def}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-[var(--faint)]">{method === "defs" ? "The model is given these definitions in its prompt." : method === "names" ? "The model sees the five names only, not these definitions." : "Rules and embeddings never read these; they only matter through the examples and keywords people chose."}</p>
              </FlowStep>
              <FlowArrow label={`ticket #${t.id}`} accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Run the classifier" what="Rules match words. Embeddings find past tickets that mean something similar and borrow their label. A model reads the ticket and the label list and picks one. Each is a trade between cost, speed and how much meaning it understands." accent={ACCENT} active={at(1)}>
                <Choices label="Classifier" accent={ACCENT} value={method} onChange={setMethod} options={METHODS.map((x) => ({ id: x.id, label: x.label }))} />
                <p className="mt-2 text-xs">{m.one}</p>
                {method === "rules" ? (
                  <ol className="mt-2 space-y-0.5 font-mono text-[11px]">
                    {RULES.map((r) => (
                      <li key={r.label} style={{ color: rule.label === r.label ? (ok ? "var(--good)" : "var(--bad)") : "var(--muted)" }}>
                        {r.label}: /{r.src}/{rule.label === r.label && rule.matched ? `  ← “${rule.matched}”` : ""}
                      </li>
                    ))}
                    <li style={{ color: rule.label === "other" ? (ok ? "var(--good)" : "var(--bad)") : "var(--muted)" }}>no match → other</li>
                  </ol>
                ) : (
                  <p className="mt-2 font-mono text-[11px] text-[var(--muted)]">
                    {method === "embed" ? `ticket → vector → 5 nearest of 200 labelled tickets vote: ${p}` : `prompt ${promptTokens(method)} tokens + ticket ~60 tokens → “${p}”`}
                  </p>
                )}
                <p className="mt-1 text-xs" style={{ color: ok ? "var(--good)" : "var(--bad)" }}>
                  #{t.id}: {ok ? "right" : "wrong"}. {t.why}
                </p>
              </FlowStep>
              <FlowArrow label="one label" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Accept only a label from the list" what="A model left to write freely answers “Billing / sales?” or “Upgrade issue”, which no router understands. Constrain the output to the label list with a JSON schema enum, and the answer is always one routable value." accent={ACCENT} active={at(2)}>
                <pre className="overflow-x-auto rounded-md bg-[var(--inset)] p-2 font-mono text-[11px] leading-relaxed">
                  {`"label": { "enum": [${LABELS.map((l) => `"${l.id}"`).join(", ")}] }\n→ { "label": "${p}" }`}
                </pre>
                <p className="mt-1 text-[11px] text-[var(--faint)]">Free text against a fixed list is its own session: Classify and route, in AI Automation.</p>
              </FlowStep>
              <FlowArrow label={`"${p}"`} accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Route the label to a team" what="The router is a plain lookup, label to queue, so it never needs a model. Two labels can share a queue: account and other both go to the support desk, so mixing them up costs nothing." accent={ACCENT} active={at(3)}>
                <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[11px] sm:grid-cols-3">
                  {LABELS.map((l) => (
                    <li key={l.id} style={{ color: l.id === p ? (rightQ ? "var(--good)" : "var(--bad)") : "var(--muted)" }}>
                      {l.id} → {QUEUES.find((x) => x.id === l.queue)!.label}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs" style={{ color: rightQ ? "var(--good)" : "var(--bad)" }}>
                  {rightQ ? (ok ? "Right team." : "Wrong label, right team: both labels share a queue.") : "Wrong team: someone has to notice and move it, and the customer waits longer."}
                </p>
              </FlowStep>
              <FlowArrow label={`${TICKETS.length} labelled tickets`} accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Score it on tickets people labelled" what="Pick a few hundred past tickets, have people label them, and run every candidate on the same set. Look at each label's recall, not only the total: a classifier can be right most of the time and still miss almost every account request." accent={ACCENT} active={at(4)}>
                <Scores method={method} />
                <p className="mt-2 text-[11px] text-[var(--faint)]">Rules run for real on the text. Embedding and model answers are illustrative; prices assume a small model at $0.15 and an embedding model at $0.02 per million input tokens.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function TicketTable({ method, pick, setPick }: { method: Method; pick: number; setPick: (n: number) => void }) {
  const ev = evaluate(method);
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Sixteen tickets with the true and predicted label">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">labelled tickets · pick one to run</p>
        <p className="font-mono text-xs" style={{ color: ACCENT }}>
          {ev.correct}/{ev.total} right
        </p>
      </div>
      <ul className="mt-3 space-y-0.5">
        {ev.rows.map(({ t, p }) => {
          const ok = p === t.truth;
          const on = t.id === pick;
          return (
            <li key={t.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => setPick(t.id)}
                className="grid min-h-11 w-full grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs"
                style={{ background: on ? `color-mix(in srgb, ${ACCENT} 14%, transparent)` : "transparent" }}
              >
                <span className="font-mono text-[var(--faint)]">{t.id}</span>
                <span className="min-w-0">{t.text}</span>
                <span className="text-right font-mono text-[11px]" style={{ color: ok ? "var(--good)" : "var(--bad)" }}>
                  {ok ? `${p} ✓` : `${p} ✗ ${t.truth}`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Scores({ method }: { method: Method }) {
  const ev = evaluate(method);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-4 gap-y-0.5 font-mono text-[11px]">
        <span className="text-[var(--faint)]">label</span>
        <span className="text-right text-[var(--faint)]">recall</span>
        <span className="text-right text-[var(--faint)]">precision</span>
        {ev.perLabel.map((r) => (
          <Row key={r.label} label={`${r.label} (${r.n})`} a={pct(r.recall)} b={pct(r.precision)} bad={r.recall < 0.75} />
        ))}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-x-3 gap-y-0.5 font-mono text-[11px]">
        <span className="text-[var(--faint)]">method</span>
        <span className="text-right text-[var(--faint)]">right</span>
        <span className="text-right text-[var(--faint)]">$/10k</span>
        <span className="text-right text-[var(--faint)]">time</span>
        {METHODS.map((x) => {
          const e = evaluate(x.id);
          const on = x.id === method;
          return [
            <span key={`${x.id}-l`} style={{ color: on ? "var(--text)" : "var(--muted)", fontWeight: on ? 600 : 400 }}>
              {x.label}
            </span>,
            <span key={`${x.id}-r`} className="text-right">
              {e.correct}/{e.total}
            </span>,
            <span key={`${x.id}-c`} className="text-right">
              ${costPer10k(x.id).toFixed(2)}
            </span>,
            <span key={`${x.id}-t`} className="text-right">
              {LATENCY_MS[x.id]} ms
            </span>,
          ];
        })}
      </div>
    </div>
  );
}

function Row({ label, a, b, bad }: { label: string; a: string; b: string; bad: boolean }) {
  return (
    <>
      <span>{label}</span>
      <span className="text-right" style={{ color: bad ? "var(--bad)" : "var(--text)" }}>
        {a}
      </span>
      <span className="text-right">{b}</span>
    </>
  );
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
