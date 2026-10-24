"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { EVENTS, FIRST, FIXED, ZONES, effective, judge, manifestLines, scorecard, start, type Binding, type Design, type EventId, type Kind, type Storage } from "@/lib/statefulSets";

const ACCENT = "var(--ops)";

export default function StatefulSetDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [eid, setEid] = useState<EventId>("start");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const reps = start(d);
  const v = judge(eid, d);
  const card = scorecard(d);
  const ev = EVENTS.find((x) => x.id === eid)!;
  const storage = effective(d);
  const sts = d.kind === "statefulset";

  const nodes: MapNode[] = [
    { id: "ctrl", label: sts ? "StatefulSet" : "Deployment", sub: sts ? "pg-0, pg-1, pg-2" : "random names", at: [14, 18], mobileAt: [25, 10], state: "active" },
    { id: "svc", label: "Service", sub: sts ? "pg-0.pg, pg-1.pg …" : "one name for all", at: [50, 18], mobileAt: [75, 10], state: sts ? "good" : "wait" },
    { id: "sc", label: "StorageClass", sub: storage === "emptyDir" ? "not used" : d.binding === "Immediate" ? "disk first" : "disk after pod", at: [86, 18], mobileAt: [50, 36], state: storage === "emptyDir" ? "dim" : "active" },
    ...ZONES.map((z, i) => {
      const here = reps.filter((r) => r.zone === z);
      const disks = new Set(reps.filter((r) => r.diskZone === z && r.disk).map((r) => r.disk));
      const bad = here.some((r) => r.status !== "Running") || (eid === "zone" && z === "zone-a");
      return {
        id: z,
        label: z,
        sub: `${here.length === 1 && sts ? here[0].name : here.length ? `${here.length} pod${here.length === 1 ? "" : "s"}` : "no pods"}${disks.size ? ` · ${disks.size} disk${disks.size === 1 ? "" : "s"}` : ""}`,
        at: ([[16, 82], [50, 82], [84, 82]] as [number, number][])[i],
        mobileAt: ([[20, 66], [80, 66], [50, 92]] as [number, number][])[i],
        state: (eid === "zone" && z === "zone-a" ? "bad" : bad ? "bad" : here.length ? "good" : "idle") as MapNode["state"],
      };
    }),
  ];

  const tone = v.ok ? "good" : "bad";
  const flow: Packet[][] = [
    hops("n", ["ctrl", "svc"], { label: sts ? "stable names" : "new names" }),
    reps.flatMap((r, i) => hops(`p${i}`, ["ctrl", r.zone], { label: r.name.startsWith("pg-7") ? "pod" : r.name, start: sts ? i * 0.6 : 0 })),
    storage === "emptyDir" ? [] : reps.filter((r, i, a) => r.diskZone && a.findIndex((x) => x.disk === r.disk) === i).flatMap((r, i) => hops(`d${i}`, ["sc", r.diskZone!], { label: r.disk! })),
    hops("z", ["zone-a", "svc"], { label: "zone-a down", tone: "bad" }),
    hops("s", ["ctrl", "zone-b"], { label: "scale" }),
  ];
  const special: Packet[] =
    eid === "start" ? reps.flatMap((r, i) => hops(`x${i}`, ["ctrl", r.zone], { label: r.status === "Running" ? "Running" : r.status, tone: r.status === "Running" ? "good" : "bad", start: sts ? i * 0.6 : 0 }))
    : eid === "delete" ? hops("x", ["ctrl", reps[1].zone], { label: sts ? "pg-1 again" : "new name", tone })
    : eid === "zone" ? hops("x", ["zone-a", "svc"], { label: v.ok ? "2 serve" : "outage", tone })
    : hops("x", ["ctrl", reps[1].zone], { label: v.ok ? "reattach" : "empty", tone });
  const packets: Packet[] = stage === null ? [] : stage === ev.step ? special : flow[stage];

  const captions = [
    sts ? "Step 1: replicas get ordinal names, pg-0 to pg-2, and DNS names through the headless Service." : "Step 1: replicas get random names that change whenever a pod is replaced.",
    `Step 2: ${storage === "perPod" ? "each replica gets its own claim from the template: data-pg-0, data-pg-1, data-pg-2" : storage === "shared" ? "every replica mounts the same claim, pgdata" : "each replica gets an emptyDir that dies with the pod"}.`,
    storage === "emptyDir" ? "Step 3: no disks to place." : d.binding === "Immediate" ? "Step 3: each disk is created as soon as its claim exists, in whatever zone the cloud picks." : "Step 3: each disk waits for its pod to be scheduled, then is created in that pod's zone.",
    d.spread ? "Step 4: a spread constraint puts one replica in each zone." : "Step 4: nothing spreads the replicas across zones.",
    sts ? `Step 5: on scale-down, the claims are ${d.retain ? "kept" : "deleted"}.` : "Step 5: a Deployment has no per-replica claims to keep.",
  ];
  const caption = stage !== null ? (stage === ev.step ? `${captions[stage]} ${ev.title}: ${v.text}.` : captions[stage]) : `${card.filter((c) => c.ok).length} of ${EVENTS.length} events handled · ${ev.title}: ${v.text}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="StatefulSets and persistent volumes"
        blurb="A database replica isn't interchangeable: it has a name the others connect to and a disk that holds its data. Run a three-replica Postgres across three zones as a Deployment or a StatefulSet, then start it, delete a pod, lose a zone and scale it down and up."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="A StatefulSet or Deployment creates Postgres pods in three zones, a headless Service names them, and a StorageClass creates their disks"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "ctrl", to: "svc", label: "names" },
                  ...ZONES.map((z) => ({ from: "ctrl", to: z, label: "pods" })),
                  ...ZONES.map((z) => ({ from: "sc", to: z, label: "disks", dim: storage === "emptyDir" })),
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.75}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Replicas and four events">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">replicas</p>
                <ul className="mt-1 space-y-0.5 font-mono text-[10px]">
                  {reps.map((r) => (
                    <li key={r.name} className="break-words" style={{ color: r.status === "Running" ? "var(--muted)" : "var(--bad)" }}>
                      {r.name} {r.zone} {r.disk ? `${r.disk} (${r.diskZone})` : "emptyDir"} {r.status}
                      {r.why ? `: ${r.why}` : ""}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">four events · {card.filter((c) => c.ok).length}/{EVENTS.length}</p>
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
                  Deployment + one disk
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  StatefulSet, done right
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Running…">
                Play the event
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Give each replica a stable identity" what="A StatefulSet names pods pg-0, pg-1, pg-2, starts them in that order, and a headless Service gives each a DNS name. A replaced pod gets the same name back, so replicas can always find the primary." accent={ACCENT} active={at(0)}>
                <Choices<Kind> label="Run it as" accent={ACCENT} value={d.kind} onChange={(x) => set({ kind: x })} options={[{ id: "deployment", label: "Deployment" }, { id: "statefulset", label: "StatefulSet" }]} />
              </FlowStep>
              <FlowArrow label="pods" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Give each replica its own disk" what="A database needs its own data directory. volumeClaimTemplates make one claim per replica (data-pg-0 …) that follows the pod's name. One claim shared by every replica can't work: a ReadWriteOnce disk attaches to one node." accent={ACCENT} active={at(1)}>
                <Choices<Storage> label="Storage" accent={ACCENT} value={storage} onChange={(x) => set({ storage: x })} options={[{ id: "emptyDir", label: "emptyDir" }, { id: "shared", label: "One shared claim" }, ...(sts ? [{ id: "perPod" as Storage, label: "volumeClaimTemplates" }] : [])]} />
                {!sts && <p className="mt-1 text-[11px] text-[var(--faint)]">Deployments have no volumeClaimTemplates.</p>}
              </FlowStep>
              <FlowArrow label="claims" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Create the disk where the pod runs" what="Cloud disks live in one zone and can't be attached from another. With Immediate binding the disk is made before the pod is scheduled, maybe in the wrong zone; WaitForFirstConsumer waits for the pod's zone." accent={ACCENT} active={at(2)}>
                <Choices<Binding> label="volumeBindingMode" accent={ACCENT} value={d.binding} onChange={(x) => set({ binding: x })} options={[{ id: "Immediate", label: "Immediate" }, { id: "WaitForFirstConsumer", label: "WaitForFirstConsumer" }]} />
              </FlowStep>
              <FlowArrow label="placement" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Spread replicas across zones" what="A zone can go dark. A topology spread constraint keeps one replica per zone, so the database (with its own replication) keeps serving from the other two while the lost zone's pod waits for its disk." accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.spread} onChange={(e) => set({ spread: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  One replica per zone
                </label>
              </FlowStep>
              <FlowArrow label="scale" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Keep disks when scaling down" what="By default a StatefulSet keeps the claims of replicas it removes, so scaling back up reattaches the old data. You pay for idle disks; deleting them means the next replica copies everything again." accent={ACCENT} active={at(4)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.retain} onChange={(e) => set({ retain: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Retain claims on scale-down (default)
                </label>
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] leading-relaxed">{manifestLines(d).join("\n")}</pre>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Names, claims, binding and placement follow Kubernetes&apos; rules here; which zone an Immediate disk lands in is a fixed draw.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
