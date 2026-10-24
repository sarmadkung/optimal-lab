"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { BATCH, EVENTS, FIRST, FIXED, MONTHS, drift, judge, patchGrid, scorecard, type Design, type EventId, type Mode } from "@/lib/immutableInfra";

const ACCENT = "var(--ops)";

export default function ImmutableInfraDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [eid, setEid] = useState<EventId>("rebuild");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const v = judge(eid, d);
  const card = scorecard(d);
  const ev = EVENTS.find((x) => x.id === eid)!;
  const imm = d.mode === "immutable";
  const dr = drift(d);
  const grid = patchGrid(d);
  const tone = v.ok ? "good" : "bad";

  const nodes: MapNode[] = [
    { id: "source", label: imm ? "Image pipeline" : "Patch run (SSH)", sub: imm ? "Packer: build + test" : "apt upgrade on each", at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "images", label: imm ? "Image registry" : "Runbook", sub: imm ? `app-v${MONTHS - 1}, app-v${MONTHS}` : "steps people follow", at: [50, 18], mobileAt: [75, 12], state: imm ? "good" : "wait" },
    { id: "engineer", label: "On-call engineer", sub: d.noSsh ? "no shell access" : "can SSH in", at: [86, 18], mobileAt: [75, 45], state: d.noSsh ? "good" : "wait" },
    { id: "fleet", label: "8 servers", sub: imm ? `all app-v${MONTHS}` : `${dr.variants} configurations`, at: [86, 82], mobileAt: [25, 45], state: dr.variants === 1 ? "good" : "bad" },
    { id: "lb", label: "Load balancer", sub: d.gradual ? `health checks, ${BATCH} at a time` : "all at once", at: [50, 82], mobileAt: [25, 80], state: d.gradual ? "good" : "wait" },
    { id: "storage", label: "Object storage + logs", sub: d.stateOff ? "uploads, logs" : "unused", at: [14, 82], mobileAt: [75, 80], state: d.stateOff ? "good" : "dim" },
  ];

  const flow: Packet[][] = [
    hops("b", imm ? ["source", "images", "fleet"] : ["source", "fleet"], { label: imm ? "new image" : "patch" }),
    d.stateOff ? hops("s", ["fleet", "storage"], { label: "uploads" }) : [],
    d.noSsh ? hops("e", ["engineer", "source"], { label: "PR" }) : hops("e", ["engineer", "fleet"], { label: "ssh" }),
    hops("g", ["fleet", "lb"], { label: d.gradual ? `${BATCH} at a time` : "all 8" }),
    hops("r", [imm ? "images" : "source", "fleet"], { label: imm ? "relaunch" : "rebuild" }),
  ];
  const special: Packet[] =
    eid === "patches" ? hops("x", imm ? ["source", "images", "fleet"] : ["source", "fleet"], { label: imm ? `app-v${MONTHS}` : `${dr.unpatched} missed`, tone })
    : eid === "localData" ? hops("x", d.stateOff ? ["fleet", "storage"] : ["fleet", "lb"], { label: d.stateOff ? "stored" : imm ? "deleted" : "on disk", tone })
    : eid === "hotfix" ? hops("x", d.noSsh ? ["engineer", "source"] : ["engineer", "fleet"], { label: d.noSsh ? "PR" : "hand fix", tone })
    : eid === "badPatch" ? hops("x", ["fleet", "lb"], { label: d.gradual ? `${BATCH} fail checks` : "8 broken", tone })
    : hops("x", [imm ? "images" : "source", "fleet"], { label: imm ? "same image" : "different", tone });
  const packets: Packet[] = stage === null ? [] : stage === ev.step ? special : flow[stage];

  const captions = [
    imm ? "Step 1: each month a new image is built from scratch, tested, and every server is replaced with it." : "Step 1: each month a script SSHes into every server and upgrades packages in place.",
    d.stateOff ? "Step 2: nothing that matters lives on a server's disk." : "Step 2: uploads and logs are written to the server's own disk.",
    d.noSsh ? "Step 3: there's no hand access; every change goes through the pipeline." : "Step 3: engineers can SSH in and change things during an incident.",
    d.gradual ? `Step 4: changes roll out ${BATCH} servers at a time behind health checks.` : "Step 4: changes hit all 8 servers at once.",
    imm ? "Step 5: any server can be recreated from its image." : "Step 5: a server can only be rebuilt from the base image plus today's scripts.",
  ];
  const caption = stage !== null ? (stage === ev.step ? `${captions[stage]} ${ev.title}: ${v.text}.` : captions[stage]) : `${card.filter((c) => c.ok).length} of ${EVENTS.length} handled · ${ev.title}: ${v.text}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="Immutable infrastructure"
        blurb="Eight app servers, six months. Patch them in place and each one slowly becomes unique: a missed run here, a hand fix there. Or never change a running server at all: build a new image, replace the servers, throw the old ones away. Five things happen either way."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="A patch run or an image pipeline updates eight servers behind a load balancer; an engineer may change them by hand; uploads and logs may live in object storage"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "source", to: "images", label: "push", dim: !imm },
                  { from: "images", to: "fleet", label: "launch", dim: !imm },
                  { from: "source", to: "fleet", label: "ssh", dim: imm },
                  { from: "engineer", to: "fleet", label: "ssh", dim: d.noSsh },
                  { from: "fleet", to: "lb", label: "health" },
                  { from: "fleet", to: "storage", label: "data", dim: !d.stateOff },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Patch levels and five events">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">patches landed · month 1 → {MONTHS}</p>
                <div className="mt-2 grid gap-1" style={{ gridTemplateColumns: `4.5rem repeat(${MONTHS}, minmax(0, 1fr))` }} aria-hidden>
                  {grid.map((row, s) => (
                    <div key={s} className="contents">
                      <span className="font-mono text-[10px] text-[var(--muted)]">app-{s + 1}</span>
                      {row.map((ok, m) => (
                        <span key={m} className="h-3 rounded-sm" style={{ background: ok ? "color-mix(in srgb, var(--good) 55%, transparent)" : "var(--bad)" }} />
                      ))}
                    </div>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-[var(--faint)]">red: that month&apos;s patch run missed the server · {dr.variants} distinct configuration{dr.variants === 1 ? "" : "s"}</p>
                <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">five events · {card.filter((c) => c.ok).length}/{EVENTS.length}</p>
                <ul className="mt-1 space-y-1.5 text-xs">
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
                  Pets: patch in place
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Cattle: replace from images
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Running…">
                Play the event
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Build an image instead of patching" what="Patch runs over SSH miss servers that are rebooting or full, and each miss makes a server a little different. An image built from scratch, tested once, and launched everywhere means every server is the same by construction." accent={ACCENT} active={at(0)}>
                <Choices<Mode> label="Updates" accent={ACCENT} value={d.mode} onChange={(x) => set({ mode: x })} options={[{ id: "mutable", label: "Patch in place" }, { id: "immutable", label: "Replace from an image" }]} />
              </FlowStep>
              <FlowArrow label="servers" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Keep state off the server" what="Servers you replace can't hold anything you want to keep. Uploads go to object storage, logs to a central store, data to a managed database." accent={ACCENT} active={at(1)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.stateOff} onChange={(e) => set({ stateOff: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Uploads and logs leave the server
                </label>
              </FlowStep>
              <FlowArrow label="changes" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Change servers only through the pipeline" what="A fix typed into one server during an incident is invisible to everyone else. Take away hand access and every change becomes a reviewed change to the image or the code." accent={ACCENT} active={at(2)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.noSsh} onChange={(e) => set({ noSsh: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  No hand SSH into production
                </label>
              </FlowStep>
              <FlowArrow label="rollout" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Roll out gradually, roll back by image" what={`Replace ${BATCH} servers at a time and wait for them to pass health checks. If they don't, stop: the old servers are still running the old image, and rolling back is launching it again.`} accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.gradual} onChange={(e) => set({ gradual: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  {BATCH} at a time behind health checks
                </label>
              </FlowStep>
              <FlowArrow label="months later" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Rebuild anything from scratch" what="The real test: a server dies. Can you make an exact copy of the other seven? With images, it's the same launch the autoscaler does every day." accent={ACCENT} active={at(4)}>
                <p className="text-xs" style={{ color: judge("rebuild", d).ok ? "var(--good)" : "var(--bad)" }}>
                  {judge("rebuild", d).text}.
                </p>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The patch grid and drift count are computed here; which run misses which server is a fixed pattern.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
