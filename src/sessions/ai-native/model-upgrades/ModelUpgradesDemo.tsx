"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type Packet } from "@/components/system/SystemMap";
import { CASES, CHECK_LABEL, MODELS, NO_FIXES, PINS, check, evaluate, output, type CheckName, type Fixes, type Pin } from "@/lib/modelUpgrade";

const ACCENT = "var(--native)";
const CANARY = 0.05;

export default function ModelUpgradesDemo() {
  const [pin, setPin] = useState<Pin>("alias");
  const [f, setF] = useState<Fixes>(NO_FIXES);
  const [cid, setCid] = useState("m1");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Fixes>) => setF((c) => ({ ...c, ...p }));
  const old = evaluate("old", NO_FIXES);
  const raw = evaluate("next", NO_FIXES);
  const next = evaluate("next", f);
  // with an alias, the switch happens on the provider's date, with no eval and none of your fixes
  const live = pin === "alias" ? raw : next;
  const failShare = (CASES.length - live.passed) / CASES.length;
  const traffic = pin === "alias" ? 1 : CANARY;
  const brokenPer10k = Math.round(10_000 * traffic * failShare);
  const c = CASES.find((x) => x.id === cid)!;

  const packets: Packet[] =
    stage === 0 ? hops("p", ["app", "config", pin === "alias" ? "next" : "old"], { label: pin === "alias" ? "model-latest → new" : MODELS.old.id, tone: pin === "alias" ? "bad" : "good" })
    : stage === 1 ? [...hops("eo", ["old", "evals"], { label: `old ${old.passed}/10` }), ...hops("en", ["next", "evals"], { label: `new ${raw.passed}/10`, start: 0.2, tone: "bad" })]
    : stage === 2 ? hops("d", ["evals", "config"], { label: `${raw.failsBy.parses} fenced, ${raw.failsBy.keys} renamed, ${raw.failsBy.short} long` })
    : stage === 3 ? hops("f", ["config", "next", "evals"], { label: `new ${next.passed}/10`, tone: next.passed >= old.passed ? "good" : "bad" })
    : stage === 4 ? hops("c", ["app", "config", "next"], { label: pin === "alias" ? "100% switched" : `${CANARY * 100}% canary`, tone: brokenPer10k > 50 ? "bad" : "good" })
    : [];

  const captions = [
    pin === "alias" ? "Step 1: the app asks for “model-latest”; the provider points it at the new model one morning." : `Step 1: the app asks for ${MODELS.old.id} by name, so the upgrade waits until you are ready.`,
    `Step 2: the same ${CASES.length} meeting notes go to both models: old ${old.passed}/10, new ${raw.passed}/10 as it is.`,
    `Step 3: the new model wraps ${raw.failsBy.parses} answers in a markdown fence, calls the owner “assignee” in ${raw.failsBy.keys}, writes longer tasks, and finds the 2 items the old one missed.`,
    `Step 4: ${f.structured ? "structured output enforces the schema" : "no schema enforcement"}${f.brief ? " and the prompt asks for tasks of 8 words or fewer" : ""}: new model ${next.passed}/10.`,
    pin === "alias" ? `Step 5: there is no canary: 100% of traffic switched with no fixes, about ${brokenPer10k.toLocaleString("en-US")} broken answers per 10,000 requests until someone notices.` : `Step 5: ${CANARY * 100}% of traffic tries the new model first: about ${brokenPer10k} broken per 10,000; ${next.passed === CASES.length ? "clean, so ramp up and keep the old id for rollback" : "not clean yet, so roll back with one config change"}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${PINS.find((p) => p.id === pin)!.label}: old ${old.passed}/10, new ${pin === "alias" ? raw.passed : next.passed}/10; about ${brokenPer10k.toLocaleString("en-US")} broken answers per 10,000 requests during the switch.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Native · interactive"
        title="Upgrading the model under a live feature"
        blurb="The new model is 40% cheaper, a third faster and finds action items the old one missed. It also wraps its JSON in a markdown fence, renames a key and writes tasks too long for the card. Switch on the provider's schedule, or on yours: pin the version, run both on the evals, fix what changed, canary, then switch."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="The app, model config, old model, new model and the eval set"
                accent={ACCENT}
                chrome="split"
                nodes={[
                  { id: "app", label: "Action items", sub: `${brokenPer10k.toLocaleString("en-US")} broken / 10k`, at: [11, 50], mobileAt: [50, 11], state: brokenPer10k > 50 ? "bad" : "good" },
                  { id: "config", label: "Model config", sub: pin === "alias" ? "model-latest" : "pinned id", at: [37, 50], mobileAt: [50, 34], state: pin === "alias" ? "bad" : "active" },
                  { id: "old", label: "Old model", sub: `$${MODELS.old.pricePerM}/M · ${MODELS.old.latency} s`, at: [64, 16], mobileAt: [24, 62], state: pin === "alias" ? "dim" : "active" },
                  { id: "next", label: "New model", sub: `$${MODELS.next.pricePerM}/M · ${MODELS.next.latency} s`, at: [64, 84], mobileAt: [76, 62], state: "active" },
                  { id: "evals", label: "Eval set", sub: `old ${old.passed} · new ${next.passed}`, at: [88, 50], mobileAt: [50, 88], state: next.passed === CASES.length ? "good" : "wait" },
                ]}
                links={[
                  { from: "app", to: "config", label: "request" },
                  { from: "config", to: "old", label: "pinned", dim: pin === "alias" },
                  { from: "config", to: "next", label: pin === "alias" ? "latest" : "canary" },
                  { from: "old", to: "evals", label: "outputs" },
                  { from: "next", to: "evals", label: "outputs" },
                ]}
                packets={packets}
                aspect={1.5}
                mobileAspect={0.8}
              />
              <Cases f={f} cid={cid} setCid={setCid} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices label="The app asks for" accent={ACCENT} value={pin} onChange={setPin} options={PINS.map((p) => ({ id: p.id, label: p.label }))} />
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Upgrading…">
                Upgrade the model
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Pin the exact model version" what="Providers publish dated snapshots and a moving alias. With the alias, your feature changes the day they move it, tested or not. Pin the snapshot in config and treat an upgrade like any other change: on your schedule, with a way back." accent={ACCENT} active={at(0)}>
                <Choices label="The app asks for" accent={ACCENT} value={pin} onChange={setPin} options={PINS.map((p) => ({ id: p.id, label: p.label }))} />
                <p className="mt-2 text-xs">{PINS.find((p) => p.id === pin)!.one}</p>
              </FlowStep>
              <FlowArrow label="same inputs" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Run old and new on the same evals" what="The feature's eval set is the contract. Run both models on it and compare case by case: an upgrade that is better on average can still break the format every downstream parser relies on." accent={ACCENT} active={at(1)}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-4 gap-y-0.5 font-mono text-[11px]">
                  <span className="text-[var(--faint)]">check</span>
                  <span className="text-right text-[var(--faint)]">old fails</span>
                  <span className="text-right text-[var(--faint)]">new fails</span>
                  {(Object.keys(CHECK_LABEL) as CheckName[]).map((k) => [
                    <span key={`${k}a`} className="font-sans">
                      {CHECK_LABEL[k]}
                    </span>,
                    <span key={`${k}b`} className="text-right">
                      {old.failsBy[k]}
                    </span>,
                    <span key={`${k}c`} className="text-right" style={{ color: raw.failsBy[k] ? "var(--bad)" : "var(--text)" }}>
                      {raw.failsBy[k]}
                    </span>,
                  ])}
                </div>
              </FlowStep>
              <FlowArrow label="differences" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Read what actually changed" what="Most upgrade breakage is format, not intelligence: a fence around the JSON, a renamed key, longer text. Look at the raw outputs side by side for a failing case before deciding what to fix." accent={ACCENT} active={at(2)}>
                <p className="text-xs">
                  <span className="font-mono text-[var(--faint)]">{c.id}</span> {c.notes}
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <Raw label={`old · ${MODELS.old.id}`} text={output(c, "old", NO_FIXES)} ok={check(c, output(c, "old", NO_FIXES)).pass} />
                  <Raw label={`new · ${MODELS.next.id}`} text={output(c, "next", NO_FIXES)} ok={check(c, output(c, "next", NO_FIXES)).pass} />
                </div>
              </FlowStep>
              <FlowArrow label="fixes" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Adjust the settings and prompt for the new model" what="Turn on structured output so the schema is enforced, not requested: no fences, no renamed keys. Then tighten the prompt for the new model's habits. Re-run the evals after each change." accent={ACCENT} active={at(3)}>
                <Toggle on={f.structured} set={(v) => set({ structured: v })} label="Structured output: enforce the JSON schema" />
                <Toggle on={f.brief} set={(v) => set({ brief: v })} label="Prompt: tasks in 8 words or fewer" />
                <p className="font-mono text-xs">
                  new model: {next.passed}/10 · old model: {old.passed}/10
                </p>
              </FlowStep>
              <FlowArrow label="5% of traffic" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Canary, switch, keep the way back" what={`Send ${CANARY * 100}% of real requests to the new model and watch parse failures, length and user edits. If they hold, ramp up; if not, one config change sends everything back to the pinned old version.`} accent={ACCENT} active={at(4)}>
                <p className="font-mono text-xs" style={{ color: brokenPer10k > 50 ? "var(--bad)" : "var(--good)" }}>
                  ~{brokenPer10k.toLocaleString("en-US")} broken answers per 10,000 requests while switching
                </p>
                <p className="mt-1 font-mono text-xs text-[var(--muted)]">
                  after the switch: {Math.round((1 - MODELS.next.pricePerM / MODELS.old.pricePerM) * 100)}% cheaper, {MODELS.old.latency} s → {MODELS.next.latency} s
                </p>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Model outputs, prices and latencies are illustrative. Parsing, every check and the totals run for real; broken answers assume live traffic fails like the eval set.</p>
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

function Raw({ label, text, ok }: { label: string; text: string; ok: boolean }) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-[11px]" style={{ color: ok ? "var(--good)" : "var(--bad)" }}>
        {ok ? "✓" : "✗"} {label}
      </p>
      <pre className="mt-1 overflow-x-auto rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] whitespace-pre-wrap break-all">{text}</pre>
    </div>
  );
}

function Cases({ f, cid, setCid }: { f: Fixes; cid: string; setCid: (id: string) => void }) {
  const old = evaluate("old", NO_FIXES);
  const next = evaluate("next", f);
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Each eval case on the old and the new model">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">eval set · pick a case</p>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_2.5rem_2.5rem] gap-x-1 gap-y-0.5 text-xs">
        <span />
        <span className="text-center font-mono text-[11px] text-[var(--faint)]">old</span>
        <span className="text-center font-mono text-[11px] text-[var(--faint)]">new</span>
        {CASES.map((c, k) => [
          <button key={`${c.id}a`} type="button" aria-pressed={c.id === cid} onClick={() => setCid(c.id)} className="min-h-11 min-w-0 rounded px-1 text-left" style={{ background: c.id === cid ? `color-mix(in srgb, ${ACCENT} 14%, transparent)` : "transparent" }}>
            <span className="font-mono text-[var(--faint)]">{c.id}</span> {c.notes}
          </button>,
          <span key={`${c.id}b`} className="grid place-items-center font-mono" style={{ color: old.rows[k].pass ? "var(--good)" : "var(--bad)" }}>
            {old.rows[k].pass ? "✓" : "✗"}
          </span>,
          <span key={`${c.id}c`} className="grid place-items-center font-mono" style={{ color: next.rows[k].pass ? "var(--good)" : "var(--bad)" }}>
            {next.rows[k].pass ? "✓" : "✗"}
          </span>,
        ])}
        <span className="font-mono text-[var(--faint)]">passed</span>
        <span className="text-center font-mono">{old.passed}</span>
        <span className="text-center font-mono">{next.passed}</span>
      </div>
    </section>
  );
}
