"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { BOUNCE, CASES, DIG, FIRST, FIXED, LADDER, REASK, TEAM_LABEL, handle, runAll, type Design, type Route } from "@/lib/escalation";

const ACCENT = "var(--auto)";
const mins = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`);

export default function EscalationDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [pick, setPick] = useState(2);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const c = CASES.find((x) => x.id === pick)!;
  const r = handle(c, d);
  const all = runAll(d);
  const lost = r.done === null;

  const nodes: MapNode[] = [
    { id: "bot", label: "Support automation", sub: `${CASES.length} it can't decide`, at: [14, 16], mobileAt: [25, 12], state: "active" },
    { id: "router", label: "Escalation router", sub: d.route === "shared" ? "post to channel" : "owner by reason", at: [14, 56], mobileAt: [75, 12], state: "active" },
    { id: "channel", label: "#escalations", sub: "everyone, so no one", at: [52, 16], mobileAt: [25, 42], state: d.route === "shared" ? (r.c.shared === null ? "bad" : "wait") : "dim" },
    { id: "owner", label: TEAM_LABEL[c.owner], sub: c.ack === null ? "away today" : `answers in ${c.ack} min`, at: [52, 56], mobileAt: [75, 42], state: lost ? "bad" : r.paged ? "wait" : "good" },
    { id: "backup", label: "Next level", sub: d.ladder ? `paged after ${LADDER} min` : "never paged", at: [86, 56], mobileAt: [75, 74], state: r.paged ? "good" : d.ladder ? "idle" : "dim" },
    { id: "customer", label: "Customer", sub: r.reasked ? "asked again" : lost ? "still waiting" : `answer in ${mins(r.done!)}`, at: [14, 90], mobileAt: [25, 74], state: lost || r.reasked ? "bad" : "good" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("s", ["bot", "router"], { label: c.reason.split(":")[0] })
    : stage === 1 ? (d.route === "shared" ? [...hops("c", ["router", "channel"], { label: "posted" }), ...(r.bounced ? hops("b", ["channel", "owner"], { label: "not ours", tone: "bad", start: 0.7 }) : [])] : hops("o", ["router", "owner"], { label: TEAM_LABEL[c.owner] }))
    : stage === 2 ? (lost && d.route === "shared" && c.shared === null ? [] : hops("h", ["router", "owner"], { label: d.context ? "handoff note" : "link only", tone: d.context ? "good" : "bad" }))
    : stage === 3 ? (r.paged ? hops("p", ["owner", "backup", "owner"], { label: "page" }) : [])
    : stage === 4 ? (lost ? [] : r.reasked ? hops("q", ["owner", "customer", "owner"], { label: "explain again?", tone: "bad" }) : hops("a", ["owner", "customer"], { label: "answer", tone: "good" }))
    : [];

  const captions = [
    `Step 1: the automation stops on case ${c.id}: ${c.reason}.`,
    d.route === "shared" ? (c.shared === null ? "Step 2: posted in the shared channel, where nobody takes it." : `Step 2: posted in the shared channel; ${TEAM_LABEL.support} takes it after ${c.shared} min${r.bounced ? `, then passes it on to ${TEAM_LABEL[c.owner]} (${BOUNCE} min)` : ""}.`) : `Step 2: sent straight to ${TEAM_LABEL[c.owner]}, the owner of this reason.`,
    d.context ? "Step 3: a handoff note goes with it: the conversation, what the bot tried, and why it stopped." : `Step 3: only a link goes with it; they spend ${DIG} min working out what happened${c.needsHistory ? " and still need the customer's story" : ""}.`,
    r.paged ? `Step 4: no acknowledgement in ${LADDER} min, so the next level is paged.` : c.ack === null ? `Step 4: ${TEAM_LABEL[c.owner]} is away and nobody else is paged.` : "Step 4: acknowledged in time; no page needed.",
    lost ? "Step 5: nobody ever picks it up." : `Step 5: resolved after ${mins(r.done!)}${r.reasked ? `, including ${REASK / 60} h waiting for the customer to repeat themselves` : ""}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${all.lost} lost · ${all.bounces} bounced · ${all.reasks} customers asked again · ${mins(all.avgDone)} average to resolve the rest.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Automation · interactive"
        title="Escalation paths"
        blurb="A support automation stops on eight cases it shouldn't decide: a big refund, a legal threat, a likely account takeover, a provider outage, a language it doesn't speak. Escalating is easy. Reaching the right person quickly, with what they need, when the owner is away, is the design."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Support automation, an escalation router, a shared channel, the owning team, the next level and the customer"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "bot", to: "router", label: "can't decide" },
                  { from: "router", to: "channel", label: "post", dim: d.route !== "shared" },
                  { from: "router", to: "owner", label: "route" },
                  { from: "channel", to: "owner", label: "bounce", dim: d.route !== "shared" },
                  { from: "owner", to: "backup", label: "page", dim: !d.ladder },
                  { from: "owner", to: "customer", label: "reply" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <Cases d={d} pick={pick} setPick={setPick} />
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
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Escalating…">
                {`Run case ${c.id}`}
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Stop, and say why" what="An automation should escalate on named reasons: over a limit, a topic it must never handle, low confidence, a dependency down, a language it can't serve. The reason is what decides who should get it." accent={ACCENT} active={at(0)}>
                <p className="text-xs">
                  Case {c.id}: {c.what}. <span className="text-[var(--muted)]">Reason: {c.reason}.</span>
                </p>
              </FlowStep>
              <FlowArrow label="a reason" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Route by reason to an owner" what="A shared channel feels safe and works like a bystander test: generalists pick up what they can, specialists' cases bounce, and some posts nobody takes. A table from reason to owning team sends each case to someone whose job it is." accent={ACCENT} active={at(1)}>
                <Choices<Route> label="Escalate to" accent={ACCENT} value={d.route} onChange={(v) => set({ route: v })} options={[{ id: "shared", label: "A shared channel" }, { id: "owner", label: "The owner of the reason" }]} />
                <p className="mt-2 text-xs text-[var(--muted)]">Owner for this reason: {TEAM_LABEL[c.owner]}.</p>
              </FlowStep>
              <FlowArrow label="a case" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Hand over the whole story" what="The person should start where the automation stopped: the conversation, what it tried, its confidence, why it stopped and a suggested next step. A bare link means digging through logs, and asking the customer to repeat themselves." accent={ACCENT} active={at(2)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.context} onChange={(e) => set({ context: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Send a handoff note with the case
                </label>
              </FlowStep>
              <FlowArrow label="handoff" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Climb a level when nobody answers" what="Owners are in court, in meetings, asleep. Ask for an acknowledgement, and if none comes within a set time, page the next level automatically, the way on-call tools escalate an alert." accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.ladder} onChange={(e) => set({ ladder: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Page the next level after {LADDER} min without an acknowledgement
                </label>
              </FlowStep>
              <FlowArrow label="acknowledged" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Resolve, and count the path" what="Measure time to reach the right person and time to resolve, plus the cases lost, bounced and re-asked. Lost cases don't show up in an average, so count them first." accent={ACCENT} active={at(4)}>
                <ol className="space-y-0.5 font-mono text-[11px]">
                  {r.events.map((e, i) => (
                    <li key={i} style={{ color: e.text.includes("nobody") || e.text.includes("away") || e.text.includes("assumes") ? "var(--bad)" : "var(--text)" }}>
                      {mins(e.t)} · {e.text}
                    </li>
                  ))}
                </ol>
                <p className="mt-2 font-mono text-xs">
                  {all.lost} lost · {all.bounces} bounced · {all.reasks} re-asked · {all.pages} paged · {mins(all.avgReach)} to the right person · {mins(all.avgDone)} to resolve (resolved cases)
                </p>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Response times are seeded. Routing, the ladder and every timing run for real.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Cases({ d, pick, setPick }: { d: Design; pick: number; setPick: (n: number) => void }) {
  const all = runAll(d);
  const max = Math.max(480, all.worst);
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Eight escalated cases and how long each took">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">cases · pick one</p>
        <p className="font-mono text-xs" style={{ color: all.lost ? "var(--bad)" : "var(--good)" }}>
          {all.lost} lost
        </p>
      </div>
      <ul className="mt-3 space-y-0.5">
        {all.results.map((r) => (
          <li key={r.c.id}>
            <button type="button" aria-pressed={r.c.id === pick} onClick={() => setPick(r.c.id)} className="grid min-h-11 w-full grid-cols-[1.25rem_minmax(0,1fr)_4.5rem] items-center gap-2 rounded-md px-1.5 text-left text-xs" style={{ background: r.c.id === pick ? `color-mix(in srgb, ${ACCENT} 14%, transparent)` : "transparent" }}>
              <span className="font-mono text-[var(--faint)]">{r.c.id}</span>
              <span className="min-w-0">
                <span className="block truncate">{r.c.what}</span>
                <span className="mt-1 block h-1.5 w-full rounded-full bg-[var(--track)]">
                  <span className="block h-full rounded-full" style={{ width: `${((r.done ?? max) / max) * 100}%`, background: r.done === null ? "var(--bad)" : r.reasked || r.bounced ? "var(--c2)" : "var(--good)" }} />
                </span>
              </span>
              <span className="text-right font-mono text-[11px]" style={{ color: r.done === null ? "var(--bad)" : "var(--muted)" }}>
                {r.done === null ? "lost" : mins(r.done)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
