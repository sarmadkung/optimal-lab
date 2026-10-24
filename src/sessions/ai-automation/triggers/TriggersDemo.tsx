"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type Packet } from "@/components/system/SystemMap";
import { EVENTS, KINDS, OUTAGE, POLL_EVERY, simulate, type Kind } from "@/lib/triggers";

const ACCENT = "var(--auto)";
const clock = (m: number) => `10:${String(Math.floor(m)).padStart(2, "0")}`;
const mins = (m: number) => (m < 1 ? `${Math.round(m * 60)} s` : `${m.toFixed(1)} min`);

export default function TriggersDemo() {
  const [kind, setKind] = useState<Kind>("poll");
  const [dedupe, setDedupe] = useState(false);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const x = simulate(kind, dedupe);
  const k = KINDS.find((y) => y.id === kind)!;
  const ok = x.missed.length === 0 && x.duplicates === 0;

  const packets: Packet[] =
    stage === 0 ? hops("ch", ["user", "crm"], { label: `${EVENTS.length} changes in an hour` })
    : stage === 1 ? (kind === "poll" ? hops("p", ["trigger", "crm", "trigger"], { label: `every ${POLL_EVERY} min` }) : hops("w", ["crm", "trigger"], { label: "POST /hooks/crm" }))
    : stage === 2 ? hops("o", ["crm", "trigger"], { label: kind === "retries" ? "retry 1, 2, 4, 8 min" : kind === "webhook" ? "lost while down" : "polls fail while down", tone: kind === "retries" ? "good" : "bad" })
    : stage === 3 ? hops("d", ["trigger", "store", "trigger"], { label: dedupe ? "seen this event id?" : "no check", tone: dedupe ? "good" : "bad" })
    : stage === 4 ? hops("r", ["trigger", "flow"], { label: `${x.started.length} runs`, tone: ok ? "good" : "bad" })
    : [];

  const captions = [
    `Step 1: between 10:00 and 11:00, people change ${new Set(EVENTS.map((e) => e.deal)).size} deals ${EVENTS.length} times in the CRM.`,
    `Step 2: ${k.one}`,
    `Step 3: our endpoint is down from ${clock(OUTAGE[0])} to ${clock(OUTAGE[1])}: ${kind === "poll" ? "two polls fail and the next one catches up" : kind === "webhook" ? `${x.missed.length} webhooks are lost` : "the CRM keeps retrying and gets through after"}.`,
    dedupe ? "Step 4: each run is keyed on the event id; a delivery seen before is acknowledged and dropped." : "Step 4: every delivery starts a run, including the ones the CRM sent twice.",
    `Step 5: ${x.started.length} runs for ${EVENTS.length} changes: ${x.missed.length} missed, ${x.duplicates} duplicates, ${mins(x.avgDelayMin)} late on average.`,
  ];
  const caption = stage !== null ? captions[stage] : `${k.label}${dedupe ? " + dedupe" : ""}: ${x.missed.length} missed, ${x.duplicates} duplicate runs, ${mins(x.avgDelayMin)} average delay (worst ${mins(x.maxDelayMin)}), ${x.calls} calls an hour.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Automation · interactive"
        title="Triggers: webhooks, events and schedules"
        blurb="A workflow should run once for every change in the CRM. Polling is late and quietly skips a deal that changed twice between polls. Webhooks are instant and get lost when your endpoint is down. Retried webhooks arrive, sometimes twice. Replay one hour of changes through each, with a six-minute outage."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="People editing the CRM, the trigger, a store of seen event ids and the workflow"
                accent={ACCENT}
                chrome="split"
                nodes={[
                  { id: "user", label: "Sales team", sub: "edits deals", at: [10, 50], mobileAt: [50, 8], state: "active" },
                  { id: "crm", label: "CRM", sub: `${EVENTS.length} changes`, at: [36, 50], mobileAt: [50, 34], state: "active" },
                  { id: "trigger", label: kind === "poll" ? "Poller" : "Webhook endpoint", sub: `${x.calls} calls / h`, at: [62, 50], mobileAt: [50, 60], state: x.missed.length ? "bad" : "active" },
                  { id: "store", label: "Seen event ids", sub: dedupe ? "on" : "off", at: [86, 16], mobileAt: [22, 88], state: dedupe ? "good" : "dim" },
                  { id: "flow", label: "Workflow", sub: `${x.started.length} runs`, at: [86, 84], mobileAt: [78, 88], state: ok ? "good" : "bad" },
                ]}
                links={[
                  { from: "user", to: "crm", label: "change" },
                  { from: "crm", to: "trigger", label: kind === "poll" ? "poll" : "webhook" },
                  { from: "trigger", to: "store", label: "event id", dim: !dedupe },
                  { from: "trigger", to: "flow", label: "start run" },
                ]}
                packets={packets}
                aspect={1.6}
                mobileAspect={0.85}
              />
              <Timeline kind={kind} dedupe={dedupe} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices label="Trigger" accent={ACCENT} value={kind} onChange={setKind} options={KINDS.map((y) => ({ id: y.id, label: y.label }))} />
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Replaying…">
                Replay the hour
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Decide what counts as “something happened”" what="A trigger is a change in another system: a deal moved stage, a form was submitted, a file landed. Be specific about which change, and whether you need every change or only the latest state; it decides which trigger works." accent={ACCENT} active={at(0)}>
                <p className="font-mono text-xs">
                  {EVENTS.length} changes · {EVENTS.filter((e) => e.deal === "D-200").map((e) => e.change).join(", then ")} on D-200 within 2 minutes
                </p>
              </FlowStep>
              <FlowArrow label="a change" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Hear about it: poll, or be called" what="Polling asks on a schedule: simple, works with any API, always late, and it only sees the state at each poll. A webhook is a call from the other system the moment it happens: instant, but only if your endpoint is up." accent={ACCENT} active={at(1)}>
                <Choices label="Trigger" accent={ACCENT} value={kind} onChange={setKind} options={KINDS.map((y) => ({ id: y.id, label: y.label }))} />
                <p className="mt-2 text-xs">{k.one}</p>
              </FlowStep>
              <FlowArrow label="delivery" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Expect deliveries to fail and repeat" what="Endpoints go down for deploys and outages. A provider that retries makes sure nothing is lost, which is also why it sometimes delivers the same event twice: when your answer was slow, it can't tell you got it." accent={ACCENT} active={at(2)}>
                <ul className="space-y-0.5 font-mono text-[11px]">
                  {x.missed.length ? x.missed.map((m) => (
                    <li key={m.ev.id} className="text-[var(--bad)]">
                      missed {m.ev.deal} at {clock(m.ev.at)}: {m.why}
                    </li>
                  )) : <li className="text-[var(--good)]">nothing missed</li>}
                </ul>
              </FlowStep>
              <FlowArrow label="run request" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Start each run once" what="Every event carries an id. Store the ids you have started and drop a delivery you've seen before, after answering 200 so the sender stops retrying. With that, retries give you every event exactly once." accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={dedupe} onChange={(e) => setDedupe(e.target.checked)} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Drop deliveries whose event id has already started a run
                </label>
              </FlowStep>
              <FlowArrow label="runs" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Compare missed, duplicated and late" what="Retried webhooks plus a dedupe store is the usual answer: nothing missed, nothing twice, seconds late except during an outage. Keep a slow poll as a safety net for providers whose webhooks you don't trust." accent={ACCENT} active={at(4)}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-x-3 gap-y-0.5 font-mono text-[11px]">
                  <span className="text-[var(--faint)]">trigger</span>
                  <span className="text-right text-[var(--faint)]">missed</span>
                  <span className="text-right text-[var(--faint)]">twice</span>
                  <span className="text-right text-[var(--faint)]">avg delay</span>
                  {KINDS.map((y) => {
                    const s = simulate(y.id, dedupe);
                    return [
                      <span key={`${y.id}a`} style={{ fontWeight: y.id === kind ? 600 : 400 }}>
                        {y.label}
                      </span>,
                      <span key={`${y.id}b`} className="text-right" style={{ color: s.missed.length ? "var(--bad)" : "var(--text)" }}>
                        {s.missed.length}
                      </span>,
                      <span key={`${y.id}c`} className="text-right" style={{ color: s.duplicates ? "var(--bad)" : "var(--text)" }}>
                        {s.duplicates}
                      </span>,
                      <span key={`${y.id}d`} className="text-right">
                        {mins(s.avgDelayMin)}
                      </span>,
                    ];
                  })}
                </div>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The hour of changes is seeded. Polling, delivery, retries with backoff and deduplication run for real on it.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

// The hour from 10:00 to 11:00: changes on top, runs started below, the outage shaded.
function Timeline({ kind, dedupe }: { kind: Kind; dedupe: boolean }) {
  const x = simulate(kind, dedupe);
  const missed = new Set(x.missed.map((m) => m.ev.id));
  const pos = (m: number) => `${(m / 60) * 100}%`;
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="An hour of changes and the runs they started">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">10:00 – 11:00</p>
        <p className="font-mono text-[11px]">
          <span style={{ color: "var(--bad)" }}>● missed</span> <span style={{ color: "var(--c2)" }}>● twice</span>
        </p>
      </div>
      <div className="relative mt-3 h-24">
        <div className="absolute inset-y-0 rounded" style={{ left: pos(OUTAGE[0]), width: pos(OUTAGE[1] - OUTAGE[0]), background: "color-mix(in srgb, var(--bad) 14%, transparent)" }} />
        <span className="absolute top-0 left-0 font-mono text-[10px] text-[var(--faint)]">changes</span>
        {EVENTS.map((e) => (
          <span key={e.id} className="absolute top-5 h-2.5 w-2.5 -translate-x-1/2 rounded-full" style={{ left: pos(e.at), background: missed.has(e.id) ? "var(--bad)" : "var(--text)" }} title={`${e.deal} ${e.change} at ${clock(e.at)}`} />
        ))}
        <span className="absolute top-12 left-0 font-mono text-[10px] text-[var(--faint)]">runs started</span>
        {x.started.map((r, i) => (
          <span key={i} className="absolute top-[4.25rem] h-2.5 w-2.5 -translate-x-1/2 rounded-full" style={{ left: pos(Math.min(r.at, 60)), background: r.dup ? "var(--c2)" : ACCENT }} />
        ))}
      </div>
      <div className="flex justify-between font-mono text-[10px] text-[var(--faint)]">
        <span>10:00</span>
        <span>10:{OUTAGE[0]}–{OUTAGE[1]} down</span>
        <span>11:00</span>
      </div>
      <p className="mt-2 font-mono text-xs">
        {x.started.length} runs · {x.missed.length} missed · {x.duplicates} twice · worst delay {mins(x.maxDelayMin)}
      </p>
    </section>
  );
}
