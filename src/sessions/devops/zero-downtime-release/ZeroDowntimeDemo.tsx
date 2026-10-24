"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { BUG_RATE, CANARY, FIRST, FIXED, LOCK_MIN, ROLLOUT_MIN, RPM, migrations, release, type Design } from "@/lib/zeroDowntime";

const ACCENT = "var(--ops)";

export default function ZeroDowntimeDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const r = release(d);
  const line = (label: string) => r.lines.find((l) => l.label.startsWith(label));
  const schemaBad = !d.expand;
  const lockBad = d.expand && !d.batched;
  const bug = line("The checkout bug")!;

  const nodes: MapNode[] = [
    { id: "pipe", label: "Release pipeline", sub: "v41 → v42", at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "lb", label: "Load balancer", sub: `${RPM} requests a minute`, at: [50, 18], mobileAt: [75, 12], state: "active" },
    { id: "db", label: "Postgres", sub: d.expand ? "name + full_name" : "renamed in place", at: [86, 18], mobileAt: [75, 45], state: schemaBad || lockBad ? "bad" : "good" },
    { id: "old", label: "v41 pods", sub: schemaBad ? "querying a missing column" : "still working", at: [86, 82], mobileAt: [75, 80], state: schemaBad ? "bad" : "good" },
    { id: "new", label: "v42 pods", sub: `${BUG_RATE * 100}% of checkouts fail`, at: [50, 82], mobileAt: [25, 80], state: "wait" },
    { id: "analysis", label: "Canary analysis", sub: d.canary ? `${CANARY.share * 100}% for ${CANARY.analyseMin} min` : "not used", at: [14, 82], mobileAt: [25, 45], state: d.canary ? "good" : "dim" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("m", ["pipe", "db"], { label: d.expand ? "ADD COLUMN" : "RENAME", tone: schemaBad ? "bad" : undefined })
    : stage === 1 ? (d.expand ? hops("b", ["pipe", "db"], { label: d.batched ? "batches" : "one UPDATE", tone: lockBad ? "bad" : undefined }) : hops("o", ["lb", "old"], { label: "SELECT name", tone: "bad" }))
    : stage === 2 ? hops("c", ["lb", "new"], { label: d.canary ? `${CANARY.share * 100}%` : "100%", tone: "bad" })
    : stage === 3 ? (d.canary ? hops("a", ["analysis", "lb"], { label: "pull canary", tone: "good" }) : hops("k", ["pipe", r.canRollBack ? "old" : "new"], { label: r.canRollBack ? "roll back" : "fix forward", tone: r.canRollBack ? "good" : "bad" }))
    : stage === 4 ? hops("x", ["pipe", "db"], { label: d.expand && d.contractLater ? "drop later" : "already gone", tone: d.expand && d.contractLater ? "good" : undefined })
    : [];

  const captions = [
    `Step 1: ${r.lines[0].note}.`,
    d.expand ? `Step 2: ${line("Backfill")!.note}.` : "Step 2: there's nothing to backfill; the data moved with the rename, and old pods can't find it.",
    d.canary ? `Step 3: v42 gets ${CANARY.share * 100}% of traffic while its error rate is compared with v41's.` : `Step 3: v42 rolls out to every pod over ${ROLLOUT_MIN} minutes.`,
    `Step 4: ${bug.note}.`,
    `Step 5: ${r.lines.at(-1)!.note}. ${r.failed.toLocaleString("en-US")} failed requests in total.`,
  ];
  const caption = stage !== null ? captions[stage] : `${r.failed.toLocaleString("en-US")} failed requests · ${r.canRollBack ? "rollback possible" : "no way back"}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · case study"
        title="A zero-downtime release"
        blurb="Release 42 renames a database column and, though nobody knows it yet, fails 2% of checkouts. A zero-downtime release is a plan for both: a migration that old and new code can share, a backfill that doesn't lock the table, a canary that catches the bug, and a rollback that still works."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="The release pipeline migrates Postgres and deploys v42 next to v41 behind the load balancer, with canary analysis comparing them"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "pipe", to: "db", label: "migrate" },
                  { from: "lb", to: "old", label: "v41" },
                  { from: "lb", to: "new", label: "v42" },
                  { from: "old", to: "db", label: "SQL" },
                  { from: "analysis", to: "lb", label: "weights", dim: !d.canary },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Failed requests by cause">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">failed requests · {r.failed.toLocaleString("en-US")}</p>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {r.lines.map((l) => (
                    <li key={l.label}>
                      <span className="font-mono" style={{ color: l.failed ? "var(--bad)" : "var(--good)" }}>
                        {l.failed.toLocaleString("en-US").padStart(5)}
                      </span>{" "}
                      {l.label}
                      <span className="block text-[11px] text-[var(--muted)]">{l.note}</span>
                    </li>
                  ))}
                </ul>
                <pre className="mt-3 overflow-x-auto whitespace-pre rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] leading-relaxed">{migrations(d).join("\n")}</pre>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Migrate and deploy
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Planned release
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Releasing…">
                Release v42
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Expand the schema first" what="During a rolling deploy old and new code run together, so the schema must suit both. Add the new column and write to both; don't rename in place." accent={ACCENT} active={at(0)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.expand} onChange={(e) => set({ expand: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Expand: add full_name, write both columns
                </label>
              </FlowStep>
              <FlowArrow label="existing rows" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Backfill without locking" what={`Copying 20 million rows in one statement holds row locks for minutes (${LOCK_MIN} here), and every write to those rows waits. Small batches in short transactions let normal traffic through.`} accent={ACCENT} active={at(1)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.batched} disabled={!d.expand} onChange={(e) => set({ batched: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Backfill in batches
                </label>
              </FlowStep>
              <FlowArrow label="new code" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Send a little traffic first, and measure it" what="A canary gets a slice of traffic while its error rate and latency are compared with the stable version. If it's worse, it's pulled automatically, before most users ever see it." accent={ACCENT} active={at(2)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.canary} onChange={(e) => set({ canary: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  {CANARY.share * 100}% canary with automated analysis
                </label>
              </FlowStep>
              <FlowArrow label="something's wrong" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Have a rollback that still works" what="Rolling back means running the previous version against today's schema. That works only if the schema still has what it reads, and only if someone has tried it before release day." accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.rollbackPlan} onChange={(e) => set({ rollbackPlan: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Rollback to v41 tested in staging
                </label>
                <p className="font-mono text-[11px]" style={{ color: r.canRollBack ? "var(--good)" : "var(--bad)" }}>
                  {r.canRollBack ? "v41 can run against the new schema" : "v41 can't run any more"}
                </p>
              </FlowStep>
              <FlowArrow label="later" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Contract only when nothing needs the old column" what="Drop users.name a week later, once no running version reads it. Dropping it on release day removes the way back." accent={ACCENT} active={at(4)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.contractLater} disabled={!d.expand} onChange={(e) => set({ contractLater: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Drop the old column a week later
                </label>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Failed requests are computed from {RPM} requests a minute, the rollout and lock times and the {BUG_RATE * 100}% bug; the timings are illustrative.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
