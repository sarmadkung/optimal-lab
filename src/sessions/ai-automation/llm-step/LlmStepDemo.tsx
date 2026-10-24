"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { CATEGORIES, FIRST, FIXED, ITEMS, SUMMARY_MAX, run, runAll, type Design, type OnInvalid, type Outcome } from "@/lib/llmStep";

const ACCENT = "var(--auto)";
const COLOR: Record<Outcome, string> = { right: "var(--good)", wrong: "var(--bad)", failed: "var(--bad)", person: "var(--c2)" };
const WORD: Record<Outcome, string> = { right: "written", wrong: "wrong data", failed: "run failed", person: "to a person" };

export default function LlmStepDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [pick, setPick] = useState(2);
  const { stage, busy, run: walk } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const item = ITEMS.find((x) => x.id === pick)!;
  const r = run(item, d);
  const all = runAll(d);
  const first = r.trace[0];
  const last = r.trace[r.trace.length - 1];

  const nodes: MapNode[] = [
    { id: "inbox", label: "Support inbox", sub: `${ITEMS.length} emails`, at: [14, 16], mobileAt: [25, 12], state: "active" },
    { id: "step", label: "LLM step", sub: "builds the prompt", at: [14, 62], mobileAt: [25, 42], state: "active" },
    { id: "model", label: "Model", sub: `${all.calls} calls`, at: [50, 16], mobileAt: [75, 12], state: "active" },
    { id: "check", label: "Parse + validate", sub: `${d.parse}${d.validate ? " · schema" : ""}`, at: [50, 62], mobileAt: [75, 42], state: first.problem ? (r.outcome === "right" ? "wait" : "bad") : "good" },
    { id: "desk", label: "Helpdesk", sub: `${all.right} right · ${all.wrong} wrong`, at: [86, 38], mobileAt: [25, 84], state: r.outcome === "right" ? "good" : r.outcome === "wrong" ? "bad" : r.outcome === "failed" && r.why.startsWith("422") ? "bad" : "idle" },
    { id: "queue", label: "Review queue", sub: `${all.person} waiting`, at: [86, 84], mobileAt: [75, 84], state: r.outcome === "person" ? "wait" : d.onInvalid === "person" || d.onInvalid === "retry" ? "idle" : "dim" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("in", ["inbox", "step"], { label: `email ${item.id}` })
    : stage === 1 ? hops("p", ["step", "model"], { label: "prompt" })
    : stage === 2 ? hops("a", ["model", "check"], { label: first.cutOff ? "cut off" : first.problem ? item.issue.split(" ").slice(0, 3).join(" ") : "JSON", tone: first.problem ? "bad" : "good" })
    : stage === 3 ? (r.trace.length > 1 ? hops("re", ["check", "model", "check"], { label: "retry + the error", tone: last.problem ? "bad" : "good" }) : first.problem ? hops("e", ["check", "step"], { label: "invalid", tone: "bad" }) : [])
    : stage === 4 ? (r.outcome === "person" ? hops("q", ["check", "queue"], { label: "needs a person" })
      : r.outcome === "failed" && !r.why.startsWith("422") ? hops("f", ["check", "step"], { label: "exception", tone: "bad" })
      : r.outcome === "failed" ? hops("w", ["check", "desk", "step"], { label: "422", tone: "bad" })
      : hops("w", ["check", "desk"], { label: r.outcome === "right" ? "ticket" : "wrong ticket", tone: r.outcome === "right" ? "good" : "bad" }))
    : [];

  const captions = [
    `Step 1: email ${item.id} arrives: “${item.text.length > 70 ? item.text.slice(0, 70) + "…" : item.text}”`,
    "Step 2: the step puts the email between delimiters and asks for four fields as JSON.",
    `Step 3: the model answers with ${item.issue}${first.problem ? `; ${first.problem}.` : ", and it passes."}`,
    r.trace.length > 1 ? `Step 4: asked again with the error; the second answer ${last.problem ? `still fails: ${last.problem}` : "passes"}.` : first.problem ? `Step 4: no retry: ${d.onInvalid === "fail" ? "the step throws and the run stops" : "it goes straight to a person"}.` : d.validate ? "Step 4: it passes every check; nothing to retry." : "Step 4: nothing is checked, so whatever parsed goes on.",
    `Step 5: ${r.why}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${all.right} of ${ITEMS.length} written right · ${all.wrong} written wrong · ${all.failed} failed runs · ${all.person} to a person · ${all.calls} model calls.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Automation · interactive"
        title="Adding an LLM step"
        blurb="A workflow step sends each support email to a model and files a helpdesk ticket from its JSON. The model mostly does it. It also wraps the JSON in a code fence, writes “high” for a number, gets cut off, makes up an order id and sometimes answers in prose. Parse, validate and retry, and see what reaches the helpdesk."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Support inbox, the LLM step, the model, a parse and validate step, the helpdesk and a review queue"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "inbox", to: "step", label: "email" },
                  { from: "step", to: "model", label: "prompt" },
                  { from: "model", to: "check", label: "answer" },
                  { from: "check", to: "desk", label: "ticket" },
                  { from: "check", to: "queue", label: "can't fix", dim: d.onInvalid === "fail" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.78}
              />
              <EmailTable d={d} pick={pick} setPick={setPick} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  As first built
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Fixed
                </button>
              </div>
              <RunButton busy={busy} onClick={walk} accent={ACCENT} running="Running…">
                {`Run email ${item.id}`}
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Take one item from the trigger" what="The LLM step is one step in a workflow, run once per item. Whatever it returns feeds the next step, which is usually an API that expects exact types." accent={ACCENT} active={at(0)}>
                <p className="text-xs">“{item.text}”</p>
              </FlowStep>
              <FlowArrow label="email text" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Build the prompt from a template" what="Fixed instructions, the allowed values, and the item between delimiters so text inside the email can't pass for instructions. Ask for JSON and nothing else." accent={ACCENT} active={at(1)}>
                <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-[var(--inset)] p-2 font-mono text-[11px] leading-relaxed">
                  {`File a helpdesk ticket for the email below.
Reply with only a JSON object:
  category: ${CATEGORIES.join(" | ")}
  priority: 1 (urgent) | 2 | 3 (low)
  summary: at most ${SUMMARY_MAX} characters
  order_id: the ORD-#### in the email, or null
<email>
${item.text}
</email>`}
                </pre>
              </FlowStep>
              <FlowArrow label="prompt" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Parse the answer" what="Models add fences and friendly sentences around JSON, and stop mid-object when they hit max_tokens. A tolerant parser strips the fence and takes the outermost braces; nothing rescues a cut-off answer. Structured-output modes remove most parse errors, but not wrong values." accent={ACCENT} active={at(2)}>
                <p className="mb-1 font-mono text-[11px] text-[var(--faint)]">model answer (illustrative){first.cutOff ? " · finish_reason: length" : ""}</p>
                <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-[var(--inset)] p-2 font-mono text-[11px]">{first.answer}</pre>
                <div className="mt-2">
                  <Choices label="Parser" accent={ACCENT} value={d.parse} onChange={(v: Design["parse"]) => set({ parse: v })} options={[{ id: "strict", label: "JSON.parse as is" }, { id: "tolerant", label: "Strip fences and prose" }]} />
                </div>
              </FlowStep>
              <FlowArrow label="an object" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Validate before anything is written" what="Check the object against the schema the next step needs (types, allowed values, lengths, required keys) and against facts code can check: an order id must be the one in the email. Without this, bad values surface later as a 422, or never." accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.validate} onChange={(e) => set({ validate: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Validate against the schema and the email
                </label>
                <ul className="space-y-0.5 font-mono text-[11px]">
                  {r.trace.map((t) => (
                    <li key={t.attempt} style={{ color: t.problem ? "var(--bad)" : "var(--good)" }}>
                      try {t.attempt}: {t.problem ?? (d.validate ? "valid" : "parsed (not checked)")}
                    </li>
                  ))}
                </ul>
              </FlowStep>
              <FlowArrow label="valid, or not" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Decide what a bad answer does" what="Throwing stops the run and pages someone. One retry with the error in the prompt fixes most slips, at the cost of another call. What still fails goes to a person, never silently into the system." accent={ACCENT} active={at(4)}>
                <Choices<OnInvalid> label="On a bad answer" accent={ACCENT} value={d.onInvalid} onChange={(v) => set({ onInvalid: v })} options={[{ id: "fail", label: "Throw" }, { id: "retry", label: "Retry once, then a person" }, { id: "person", label: "Send to a person" }]} />
                {r.trace.length > 1 && <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-[var(--inset)] p-2 font-mono text-[11px]">{last.answer}</pre>}
                <p className="mt-2 font-mono text-xs">
                  {all.right} right · {all.wrong} wrong · {all.failed} failed · {all.person} to a person · {all.calls} calls
                </p>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The model answers are illustrative. Parsing, validation, the retry and the helpdesk&apos;s checks run for real on them.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function EmailTable({ d, pick, setPick }: { d: Design; pick: number; setPick: (n: number) => void }) {
  const all = runAll(d);
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Ten emails and what reached the helpdesk">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">emails · pick one</p>
        <p className="font-mono text-xs" style={{ color: all.right === ITEMS.length ? "var(--good)" : "var(--bad)" }}>
          {all.right}/{ITEMS.length} right
        </p>
      </div>
      <ul className="mt-3 space-y-0.5">
        {all.results.map((r) => (
          <li key={r.item.id}>
            <button type="button" aria-pressed={r.item.id === pick} onClick={() => setPick(r.item.id)} className="grid min-h-11 w-full grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-1.5 text-left text-xs" style={{ background: r.item.id === pick ? `color-mix(in srgb, ${ACCENT} 14%, transparent)` : "transparent" }}>
              <span className="font-mono text-[var(--faint)]">{r.item.id}</span>
              <span className="min-w-0 truncate">{r.item.issue}</span>
              <span className="text-right text-[11px]" style={{ color: COLOR[r.outcome] }}>
                {WORD[r.outcome]}
                {r.retried && <span className="block text-[var(--faint)]">after a retry</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
