"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type Packet } from "@/components/system/SystemMap";
import { ALL, NONE, OUTCOME_LABEL, RECEIPTS, SECONDS, TRIP, UNSURE, handle, run, type Options, type Outcome } from "@/lib/gracefulFailure";

const ACCENT = "var(--native)";
const TONE: Record<Outcome, string> = { auto: "var(--good)", checked: "var(--c2)", fixed: "var(--good)", wrongIn: "var(--bad)", manual: "var(--c2)", stuck: "var(--bad)" };
const ICON: Record<Outcome, string> = { auto: "✓", checked: "⚑", fixed: "✓", wrongIn: "✗", manual: "✎", stuck: "✗" };

export default function GracefulFailureDemo() {
  const [o, setO] = useState<Options>(NONE);
  const [pick, setPick] = useState(6);
  const { stage, busy, run: walk } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Options>) => setO((c) => ({ ...c, ...p }));
  const r = RECEIPTS.find((x) => x.id === pick)!;
  const h = handle(r, o);
  const all = run(o);
  const failed = r.kind === "timeout" || r.kind === "unreadable";
  const bad = h.outcome === "wrongIn" || h.outcome === "stuck";

  const packets: Packet[] =
    stage === 0 ? hops("ph", ["phone", "app", "model"], { label: `receipt ${r.id}` })
    : stage === 1 ? (failed ? hops("e", ["model", "app"], { label: r.kind === "timeout" ? "timeout" : "nothing read", tone: "bad" }) : hops("f", ["model", "app"], { label: r.field ? `${r.field} ${Math.round(r.conf * 100)}%` : "3 fields" }))
    : stage === 2 ? hops("c", ["app", "phone"], { label: o.mark && r.conf < UNSURE && !failed ? "marked unsure" : "form filled" })
    : stage === 3 ? (failed ? [] : hops("rl", ["app", "rules"], { label: o.rules ? "date in trip?" : "no rules" }))
    : stage === 4 ? (h.outcome === "stuck" ? hops("s", ["app", "phone"], { label: "try again", tone: "bad" }) : hops("ok", ["app", "ledger"], { label: OUTCOME_LABEL[h.outcome], tone: bad ? "bad" : "good" }))
    : [];

  const captions = [
    `Step 1: receipt ${r.id} (${r.merchant}, ${r.amount}) is photographed and sent to the model.`,
    failed ? `Step 2: ${r.note}` : r.kind === "wrong" ? `Step 2: the model fills the form; its ${r.field} reads “${r.read}” instead of “${r.field === "date" ? r.date : r.field === "amount" ? r.amount : r.merchant}”, at ${Math.round(r.conf * 100)}% confidence.` : `Step 2: the model fills merchant, date and amount${r.field ? `, unsure of the ${r.field}` : ""}.`,
    failed ? "Step 3: there is nothing to mark." : o.mark ? (r.conf < UNSURE ? `Step 3: the ${r.field} field is marked unsure${o.source ? ", with the receipt crop beside it" : ""}.` : "Step 3: every field is confident, so nothing is marked.") : "Step 3: the form looks the same however sure the model is.",
    failed ? "Step 4: no values to check." : o.rules ? `Step 4: the rule checks the date is within the trip (${TRIP.from} to ${TRIP.to}).` : "Step 4: no rules run.",
    `Step 5: ${h.why}`,
  ];
  const caption = stage !== null ? captions[stage] : `10 receipts: ${all.wrongIn} wrong ones submitted, ${all.stuck} stuck, ${all.fixed} corrected, ${all.falseAlarms} checked for nothing; ${Math.round(all.seconds / 60)} min ${all.seconds % 60} s of the employee's time.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Native · interactive"
        title="When the model is wrong"
        blurb="An expense app reads receipt photos and fills in the form. Most are right. One date is read the American way with full confidence, a faded logo is guessed, a subtotal is taken for the total, one call times out and one photo is a blur. Design so people notice the first three and are never stuck on the last two."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Phone, expense app, model, rules and the finance ledger"
                accent={ACCENT}
                chrome="split"
                nodes={[
                  { id: "phone", label: "Employee's phone", sub: `receipt ${r.id}`, at: [11, 50], mobileAt: [50, 8], state: "active" },
                  { id: "app", label: "Expense app", sub: o.fallback ? "has a manual form" : "AI form only", at: [38, 50], mobileAt: [50, 36], state: h.outcome === "stuck" ? "bad" : "active" },
                  { id: "model", label: "Model", sub: failed ? r.kind : `${Math.round(r.conf * 100)}% sure`, at: [64, 16], mobileAt: [22, 64], state: failed ? "bad" : "active" },
                  { id: "rules", label: "Rules", sub: o.rules ? "date within trip" : "off", at: [64, 84], mobileAt: [78, 64], state: o.rules ? "active" : "dim" },
                  { id: "ledger", label: "Finance ledger", sub: `${all.wrongIn} wrong rows`, at: [88, 50], mobileAt: [50, 90], state: all.wrongIn ? "bad" : "good" },
                ]}
                links={[
                  { from: "phone", to: "app", label: "photo" },
                  { from: "app", to: "model", label: "image" },
                  { from: "app", to: "rules", label: "values", dim: !o.rules },
                  { from: "app", to: "ledger", label: "submitted" },
                ]}
                packets={packets}
                aspect={1.5}
                mobileAspect={0.8}
              />
              <Receipts o={o} pick={pick} setPick={setPick} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setO(NONE)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Trust the model
                </button>
                <button type="button" onClick={() => setO(ALL)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Design for failure
                </button>
              </div>
              <RunButton busy={busy} onClick={walk} accent={ACCENT} running="Reading…">
                {`Read receipt ${r.id}`}
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Plan for every way it fails" what="List the failures before designing the screen: wrong and sure, wrong and unsure, right but unsure, no answer in time, and no answer at all. Each needs a different response, and a design that only imagines success handles none of them." accent={ACCENT} active={at(0)}>
                <ul className="space-y-0.5 text-xs">
                  {RECEIPTS.filter((x) => x.kind !== "ok" || x.field).map((x) => (
                    <li key={x.id} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-1">
                      <span className="font-mono text-[var(--faint)]">{x.id}</span>
                      <span>{x.note}</span>
                    </li>
                  ))}
                </ul>
              </FlowStep>
              <FlowArrow label="filled form" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Mark what the AI filled, and where it's unsure" what={`A form filled by AI should look filled by AI. Mark fields under ${Math.round(UNSURE * 100)}% confidence so the person's attention goes where the model's doubt is, instead of rereading every field, or none.`} accent={ACCENT} active={at(1)}>
                <Toggle on={o.mark} set={(v) => set({ mark: v })} label="Mark AI-filled fields, highlight unsure ones" />
              </FlowStep>
              <FlowArrow label="marked fields" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Make checking cheap" what="Put the part of the photo each value came from next to the field. Checking a marked field drops from finding it on the receipt to a glance, so people actually do it." accent={ACCENT} active={at(2)}>
                <Toggle on={o.source} set={(v) => set({ source: v })} label="Show the receipt crop beside each field" />
                <p className="font-mono text-xs text-[var(--muted)]">one check: {o.source ? SECONDS.checkWith : SECONDS.checkWithout} s</p>
              </FlowStep>
              <FlowArrow label="values" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Catch confident mistakes with plain rules" what="The model was 90% sure of 4 March. Confidence can't catch that; a rule can: a receipt for a 1–5 April trip can't be dated in March. Cheap checks on the values catch the errors the model doesn't know it made." accent={ACCENT} active={at(3)}>
                <Toggle on={o.rules} set={(v) => set({ rules: v })} label="Check the date falls within the trip" />
              </FlowStep>
              <FlowArrow label="submit" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Never leave a dead end" what="When the model times out or reads nothing, the feature has failed, not the task. Open the plain form with the photo beside it. “Something went wrong, try again” turns a model failure into an expense nobody claims." accent={ACCENT} active={at(4)}>
                <Toggle on={o.fallback} set={(v) => set({ fallback: v })} label="Fall back to the manual form" />
                <Summary o={o} />
                <p className="mt-2 text-[11px] text-[var(--faint)]">What the model returns is illustrative. The date rule and every outcome run for real, assuming people check what is marked and nothing else; seconds per action are estimates.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Toggle({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) {
  return (
    <label className="flex min-h-11 w-full items-center gap-2 text-sm">
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} className="h-4 w-4" style={{ accentColor: ACCENT }} />
      {label}
    </label>
  );
}

function Receipts({ o, pick, setPick }: { o: Options; pick: number; setPick: (n: number) => void }) {
  const all = run(o);
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Ten receipts and what happened to each">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">receipts · pick one</p>
        <p className="font-mono text-xs" style={{ color: all.wrongIn || all.stuck ? "var(--bad)" : "var(--good)" }}>
          {all.wrongIn} wrong in · {all.stuck} stuck
        </p>
      </div>
      <ul className="mt-3 space-y-0.5">
        {all.rows.map(({ r, outcome }) => (
          <li key={r.id}>
            <button type="button" aria-pressed={r.id === pick} onClick={() => setPick(r.id)} className="grid min-h-11 w-full grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-1.5 text-left text-xs" style={{ background: r.id === pick ? `color-mix(in srgb, ${ACCENT} 14%, transparent)` : "transparent" }}>
              <span className="font-mono text-[var(--faint)]">{r.id}</span>
              <span className="min-w-0">
                {r.merchant} · {r.amount}
              </span>
              <span className="text-right font-mono text-[11px]" style={{ color: TONE[outcome] }}>
                {ICON[outcome]} {OUTCOME_LABEL[outcome]}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Summary({ o }: { o: Options }) {
  const x = run(o);
  const cells = [
    { label: "wrong, submitted", v: x.wrongIn, bad: x.wrongIn > 0 },
    { label: "stuck", v: x.stuck, bad: x.stuck > 0 },
    { label: "corrected", v: x.fixed, bad: false },
    { label: "checked for nothing", v: x.falseAlarms, bad: false },
  ];
  return (
    <div className="mt-2 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
      {cells.map((c) => (
        <div key={c.label} className="rounded-md bg-[var(--inset)] p-2">
          <p className="font-mono text-lg" style={{ color: c.bad ? "var(--bad)" : "var(--text)" }}>
            {c.v}
          </p>
          <p className="text-[11px] text-[var(--muted)]">{c.label}</p>
        </div>
      ))}
      <p className="col-span-2 font-mono text-xs text-[var(--muted)] sm:col-span-4">
        employee time: {Math.floor(x.seconds / 60)} min {x.seconds % 60} s for 10 receipts
      </p>
    </div>
  );
}
