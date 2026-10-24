"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { EVENTS, FIRST, FIXED, LOG_UPLOAD_MIN, bill, judge, scorecard, type Design, type EventId, type Mode, type Window } from "@/lib/managedDb";

const ACCENT = "var(--ops)";

export default function ManagedDbDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [eid, setEid] = useState<EventId>("drop");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const v = judge(eid, d);
  const card = scorecard(d);
  const ev = EVENTS.find((x) => x.id === eid)!;
  const b = bill(d);
  const managed = d.mode === "managed";
  const tone = v.ok ? "good" : "bad";

  const nodes: MapNode[] = [
    { id: "app", label: "Checkout app", sub: "writes orders", at: [14, 18], mobileAt: [25, 12], state: eid === "reports" && !d.replica ? "bad" : "active" },
    { id: "primary", label: "Primary", sub: managed ? "managed Postgres · zone a" : "your VM · zone a", at: [50, 18], mobileAt: [75, 12], state: eid === "host" ? "bad" : "active" },
    { id: "standby", label: "Standby", sub: d.standby ? "zone b, in sync" : "none", at: [86, 18], mobileAt: [75, 45], state: d.standby ? (eid === "host" ? "good" : "active") : "dim" },
    { id: "logs", label: d.pitr ? "WAL archive" : "Nightly snapshot", sub: d.pitr ? `every ~${LOG_UPLOAD_MIN} min` : "00:00 only", at: [86, 82], mobileAt: [25, 80], state: eid === "drop" ? tone : d.pitr ? "active" : "wait" },
    { id: "replica", label: "Read replica", sub: d.replica ? "reports read here" : "none", at: [50, 82], mobileAt: [75, 80], state: d.replica ? (eid === "reports" ? "good" : "active") : "dim" },
    { id: "ops", label: managed ? "Provider" : "You, on call", sub: managed ? `window: ${d.window === "chosen" ? "Sun 04:00" : "their pick"}` : `~${b.ops} h a month`, at: [14, 82], mobileAt: [25, 45], state: managed ? "good" : "wait" },
  ];

  const flow: Packet[][] = [
    hops("w", ["app", "primary"], { label: "INSERT" }),
    d.standby ? hops("s", ["primary", "standby"], { label: "replicate" }) : [],
    hops("l", ["primary", "logs"], { label: d.pitr ? "WAL" : "snapshot" }),
    hops("p", ["ops", "primary"], { label: "patch" }),
    d.replica ? hops("r", ["primary", "replica"], { label: "stream" }) : [],
  ];
  const special: Packet[] =
    eid === "host" ? (d.standby ? hops("x", ["standby", "app"], { label: "promoted", tone }) : hops("x", ["ops", "primary"], { label: "rebuild", tone }))
    : eid === "drop" ? hops("x", ["logs", "primary"], { label: d.pitr ? "restore 14:29" : "restore 00:00", tone })
    : eid === "patch" ? hops("x", ["ops", "primary"], { label: managed ? (d.window === "chosen" ? "Sun 04:00" : "Tue 11:00") : "by hand", tone })
    : eid === "reports" ? hops("x", ["app", d.replica ? "replica" : "primary"], { label: "report", tone })
    : hops("x", ["ops", "primary"], { label: "CREATE EXTENSION", tone });
  const packets: Packet[] = stage === null ? [] : stage === ev.step ? special : flow[stage];

  const captions = [
    managed ? "Step 1: the provider runs Postgres: installs, backups, patches and failover; you get a connection string and no superuser." : "Step 1: Postgres runs on your VM; everything about it is yours.",
    d.standby ? "Step 2: a standby in another zone receives every change." : "Step 2: there is one copy, in one zone.",
    d.pitr ? `Step 3: write-ahead logs are archived every ~${LOG_UPLOAD_MIN} minutes, so you can restore to any moment.` : "Step 3: one snapshot a night is all there is to restore.",
    managed ? `Step 4: updates are applied in a maintenance window ${d.window === "chosen" ? "you chose" : "the provider picked"}.` : "Step 4: updates are applied by you.",
    d.replica ? "Step 5: a read replica takes the reporting load." : "Step 5: reports run on the primary.",
  ];
  const caption = stage !== null ? (stage === ev.step ? `${captions[stage]} ${ev.title}: ${v.text}.` : captions[stage]) : `${card.filter((c) => c.ok).length} of ${EVENTS.length} handled · $${b.dollars} a month + ~${b.ops} ops hours · ${ev.title}: ${v.text}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="Managed databases"
        blurb="Running Postgres yourself means owning backups, failover, patches and replicas. A managed database does those for a premium and takes some control away. Set up a shop's database either way and see five things that happen to it. Prices and times are illustrative."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="The checkout app writes to a primary, with an optional standby in another zone, a log archive or nightly snapshot, a read replica, and whoever operates it"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "app", to: "primary", label: "SQL" },
                  { from: "primary", to: "standby", label: "sync", dim: !d.standby },
                  { from: "primary", to: "logs", label: d.pitr ? "WAL" : "nightly" },
                  { from: "primary", to: "replica", label: "stream", dim: !d.replica },
                  { from: "ops", to: "primary", label: "operates" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Five events">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">
                  five events · {card.filter((c) => c.ok).length}/{EVENTS.length} · ${b.dollars}/mo · {b.instances} instance{b.instances === 1 ? "" : "s"} · ~{b.ops} h ops
                </p>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {card.map((c) => (
                    <li key={c.event.id}>
                      <span style={{ color: c.ok ? "var(--good)" : "var(--bad)" }} aria-hidden>
                        {c.ok ? "✓ " : "✕ "}
                      </span>
                      {c.event.title}
                      <span className="block text-[11px] text-[var(--muted)]">{c.text}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices<EventId> label="Event" accent={ACCENT} value={eid} onChange={setEid} options={EVENTS.map((x) => ({ id: x.id, label: x.title }))} />
              </div>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  One VM, nightly dump
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Managed, Multi-AZ, PITR, replica
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Running…">
                Play the event
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Decide who runs the database" what="A managed service such as RDS or Cloud SQL handles installation, backups, patching and failover, for a higher price per hour. You give up the superuser, the OS, and anything outside its list of supported extensions and settings." accent={ACCENT} active={at(0)}>
                <Choices<Mode> label="Run by" accent={ACCENT} value={d.mode} onChange={(x) => set({ mode: x })} options={[{ id: "self", label: "You, on a VM" }, { id: "managed", label: "A managed service" }]} />
              </FlowStep>
              <FlowArrow label="copies" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Keep a standby in another zone" what="A synchronous standby in a second zone takes over when the primary's host or zone fails. Managed services do the promotion and DNS switch for you; doing it yourself means running a tool like Patroni and testing it." accent={ACCENT} active={at(1)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.standby} onChange={(e) => set({ standby: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Standby in a second zone
                </label>
              </FlowStep>
              <FlowArrow label="history" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Restore to a moment, not a night" what="A standby faithfully copies a dropped table too. Point-in-time recovery keeps the write-ahead log, so you can restore to one minute before the mistake instead of to last midnight." accent={ACCENT} active={at(2)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.pitr} onChange={(e) => set({ pitr: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Point-in-time recovery (7 days of logs)
                </label>
                <p className="font-mono text-[11px] text-[var(--muted)]">table dropped at 14:30 → {judge("drop", d).lost} min of orders lost</p>
              </FlowStep>
              <FlowArrow label="updates" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Choose when updates happen" what="Managed services restart the database for minor updates in a weekly maintenance window. If you don't pick one, they pick one for you." accent={ACCENT} active={at(3)}>
                <Choices<Window> label="Maintenance window" accent={ACCENT} value={d.window} onChange={(x) => set({ window: x })} options={[{ id: "auto", label: "Provider's choice" }, { id: "chosen", label: "Sunday 04:00" }]} />
                {!managed && <p className="mt-1 text-[11px] text-[var(--faint)]">Self-run: there is no window; patches happen when you do them.</p>}
              </FlowStep>
              <FlowArrow label="read load" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Send reads somewhere else" what="Heavy reporting queries compete with checkout for the same CPU and disk. A read replica receives every change a little later and takes the read-only work." accent={ACCENT} active={at(4)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.replica} onChange={(e) => set({ replica: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Read replica for reports
                </label>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Data lost and the bill are computed from the setup; prices, failover times and operations hours are illustrative.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
