"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { SCENARIOS, STEPS, all, simulate, type Design, type Scenario, type StepId } from "@/lib/idempotentSteps";

const ACCENT = "var(--auto)";
const AT: Record<StepId, { at: [number, number]; mobileAt: [number, number] }> = {
  invoice: { at: [84, 13], mobileAt: [25, 72] },
  charge: { at: [84, 38], mobileAt: [75, 72] },
  email: { at: [84, 63], mobileAt: [25, 92] },
  crm: { at: [84, 87], mobileAt: [75, 92] },
};

export default function IdempotentStepsDemo() {
  const [scenario, setScenario] = useState<Scenario>("timeout");
  const [d, setD] = useState<Design>({ resume: false, keys: false });
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const x = simulate(scenario, d);
  const sc = SCENARIOS.find((s) => s.id === scenario)!;
  const failStep = scenario === "timeout" ? "charge" : scenario === "crash" ? "email" : null;

  const nodes: MapNode[] = [
    { id: "trigger", label: "Signup webhook", sub: scenario === "twice" ? "delivered twice" : "once", at: [14, 18], mobileAt: [50, 8], state: scenario === "twice" ? "wait" : "active" },
    { id: "runner", label: "Workflow runner", sub: d.resume ? "resumes at the step" : "restarts from the top", at: [30, 62], mobileAt: [50, 34], state: "active" },
    ...STEPS.map((s) => ({ id: s.id, label: s.system, sub: `${x.counts[s.id]} × ${s.id}`, ...AT[s.id], state: (x.counts[s.id] > 1 ? "bad" : "good") as MapNode["state"] })),
  ];

  const packets: Packet[] =
    stage === 0 ? hops("t", ["trigger", "runner"], { label: "new signup" })
    : stage === 1 ? STEPS.slice(0, failStep ? STEPS.findIndex((s) => s.id === failStep) + 1 : 4).flatMap((s, i) => hops(`a${i}`, ["runner", s.id], { label: s.id, start: i * 0.25 }))
    : stage === 2 ? (failStep ? hops("f", [failStep, "runner"], { label: scenario === "timeout" ? "timeout" : "worker died", tone: "bad" }) : hops("t2", ["trigger", "runner"], { label: "same signup again", tone: "bad" }))
    : stage === 3 ? STEPS.slice(d.resume && failStep ? STEPS.findIndex((s) => s.id === failStep) : 0).flatMap((s, i) => hops(`b${i}`, ["runner", s.id], { label: d.keys ? "same key" : "again", start: i * 0.25, tone: d.keys ? "good" : "bad" }))
    : stage === 4 ? hops("c", ["runner", "trigger"], { label: x.extra ? `${x.extra} extra side effects` : "exactly one of each", tone: x.extra ? "bad" : "good" })
    : [];

  const captions = [
    "Step 1: a customer signs up; the workflow will invoice, charge, email and add them to the CRM.",
    failStep ? `Step 2: the steps run up to ${STEPS.find((s) => s.id === failStep)!.label.toLowerCase()}.` : "Step 2: the first run completes all four steps.",
    `Step 3: ${sc.one}`,
    scenario === "twice" ? `Step 4: the second run does every step again${d.keys ? "; each system recognises the key and does nothing new" : ""}.` : `Step 4: the retry starts ${d.resume ? `at the step that looked failed` : "from the top"}${d.keys ? "; every call carries the same key as the first time" : ""}.`,
    `Step 5: ${STEPS.map((s) => `${x.counts[s.id]} ${s.id}`).join(", ")}${x.extra ? `: ${x.extra} more than the customer should get` : ": exactly one of each"}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${sc.label}: ${STEPS.map((s) => `${x.counts[s.id]} ${s.id}`).join(" · ")}${x.extra ? ` — ${x.extra} too many` : " — exactly once"}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Automation · interactive"
        title="Idempotent steps"
        blurb="A signup workflow invoices, charges, emails and updates the CRM. Retrying a workflow is easy; retrying it without charging twice is not, because the step that failed may have already happened. Break it three ways, retry, and count what the customer actually received."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap title="Signup webhook, workflow runner and four outside systems" accent={ACCENT} chrome="split" nodes={nodes} links={[{ from: "trigger", to: "runner", label: "start" }, ...STEPS.map((s) => ({ from: "runner", to: s.id, label: s.label }))]} packets={packets} aspect={1.45} mobileAspect={0.78} />
              <World d={d} scenario={scenario} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices label="What goes wrong" accent={ACCENT} value={scenario} onChange={setScenario} options={SCENARIOS.map((s) => ({ id: s.id, label: s.label }))} />
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Running…">
                Run the signup
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="List the steps that change something outside" what="Reading data can be repeated freely. Creating an invoice, charging a card, sending an email and inserting a CRM row cannot: each repeat is a second one. Those are the steps that need protecting." accent={ACCENT} active={at(0)}>
                <ol className="space-y-0.5 text-xs">
                  {STEPS.map((s, i) => (
                    <li key={s.id}>
                      {i + 1}. {s.label} <span className="text-[var(--faint)]">({s.system})</span>
                    </li>
                  ))}
                </ol>
              </FlowStep>
              <FlowArrow label="run" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Something fails partway" what="The dangerous failures are the ones where the side effect happened and your workflow doesn't know: a timeout after the payment went through, a crash between doing a step and recording it, the same trigger arriving twice." accent={ACCENT} active={at(1)}>
                <Choices label="What goes wrong" accent={ACCENT} value={scenario} onChange={setScenario} options={SCENARIOS.map((s) => ({ id: s.id, label: s.label }))} />
                <p className="mt-2 text-xs">{sc.one}</p>
              </FlowStep>
              <FlowArrow label="failure" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Retry from the failed step, not the top" what="Recording progress after each step lets a retry skip what is known to be done. It still repeats the step that failed, which is exactly the one whose outcome is unknown." accent={ACCENT} active={at(2)}>
                <Choices label="On retry" accent={ACCENT} value={d.resume ? "resume" : "restart"} onChange={(v) => set({ resume: v === "resume" })} options={[{ id: "restart", label: "Start from the top" }, { id: "resume", label: "Resume at the failed step" }]} />
              </FlowStep>
              <FlowArrow label="retry" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Give every side effect a key" what="Derive a key from the trigger's event id and the step (evt_7c41:charge) and send it with the call. Payment APIs take an Idempotency-Key header; for the rest, check a sent log or upsert on an external id. A repeat with the same key does nothing new, whatever caused it." accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.keys} onChange={(e) => set({ keys: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Send a key per step, built from the event id
                </label>
                <ul className="space-y-0.5 font-mono text-[11px] text-[var(--muted)]">
                  {STEPS.map((s) => (
                    <li key={s.id}>
                      {s.system}: {s.keyed}
                    </li>
                  ))}
                </ul>
              </FlowStep>
              <FlowArrow label="side effects" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Count what the outside world got" what="The test of a retry policy is the outside world: one invoice, one charge, one email, one CRM row, for every failure you can think of. Keys from the event make all three cases come out right; resuming alone fixes none of them completely." accent={ACCENT} active={at(4)}>
                <ul className="space-y-0.5 font-mono text-[11px]">
                  {x.log.map((l, i) => (
                    <li key={i} className={l.includes("checkpoint") ? "text-[var(--faint)]" : ""}>
                      {l}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The workflow, the failures, the retries and how each system handles a repeated key run for real.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function World({ d, scenario }: { d: Design; scenario: Scenario }) {
  const rows = all(d);
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="What each failure left in the outside systems">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">outside world after the retry</p>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_repeat(4,auto)] gap-x-3 gap-y-1 text-xs">
        <span />
        {STEPS.map((s) => (
          <span key={s.id} className="text-right font-mono text-[11px] text-[var(--faint)]">
            {s.id}
          </span>
        ))}
        {rows.map((r) => [
          <span key={`${r.s.id}l`} style={{ fontWeight: r.s.id === scenario ? 600 : 400 }}>
            {r.s.label}
          </span>,
          ...STEPS.map((s) => (
            <span key={`${r.s.id}${s.id}`} className="text-right font-mono" style={{ color: r.counts[s.id] > 1 ? "var(--bad)" : "var(--good)" }}>
              {r.counts[s.id]}
            </span>
          )),
        ])}
      </div>
    </section>
  );
}
