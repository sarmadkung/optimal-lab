"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, Slider, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { ACTIONS, FIRST, FIXED, NODES, NOT_READY_AFTER, act, scorecard, type Action, type Design, type Owner } from "@/lib/deployReconcile";

const ACCENT = "var(--ops)";

export default function DeployReconcileDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [a, setA] = useState<Action>("node");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const r = act(a, d);
  const card = scorecard(d);
  const dep = d.owner === "deployment";
  const action = ACTIONS.find((x) => x.id === a)!;
  const live = r.st.pods.filter((p) => p.phase !== "Gone");
  const current = r.st.sets.find((s) => s.replicas > 0);
  const created = r.st.pods.filter((p) => p.phase === "Running" && Number(p.name.split("-").at(-1)) >= d.replicas && p.app === "shop");

  const nodes: MapNode[] = [
    { id: "you", label: "You", sub: action.label.toLowerCase(), at: [14, 18], mobileAt: [25, 10], state: "active" },
    { id: "deploy", label: dep ? "Deployment" : "No controller", sub: dep ? `wants ${d.replicas}` : "pods made by hand", at: [50, 18], mobileAt: [75, 10], state: dep ? "active" : "dim" },
    { id: "rs", label: "ReplicaSet", sub: current ? `${current.name} · ${current.replicas}` : "none", at: [86, 18], mobileAt: [50, 38], state: dep ? (r.ok ? "good" : "bad") : "dim" },
    ...NODES.map((n, i) => {
      const here = live.filter((p) => p.node === n);
      const unknown = here.some((p) => p.phase === "Unknown") || (a === "node" && n === "node-b");
      return {
        id: n,
        label: n,
        sub: unknown && a === "node" ? "NotReady" : `${here.filter((p) => p.app === "shop").length} pods${here.some((p) => p.app === "debug") ? " + 1 debug" : ""}`,
        at: ([[14, 82], [50, 82], [86, 82]] as [number, number][])[i],
        mobileAt: ([[20, 70], [80, 70], [50, 94]] as [number, number][])[i],
        state: (a === "node" && n === "node-b" ? "bad" : "active") as MapNode["state"],
      };
    }),
  ];

  const packets: Packet[] =
    stage === 0 ? (a === "node" ? hops("n", ["node-b", "rs"], { label: "silent", tone: "bad" }) : hops("c", ["you", dep ? "deploy" : "node-a"], { label: action.label.split(" ")[0] }))
    : stage === 1 ? (dep ? NODES.filter((n) => !(a === "node" && n === "node-b")).flatMap((n) => hops(`w${n}`, [n, "rs"], { label: "watch" })) : [])
    : stage === 2 ? (dep && (a === "image" || a === "undo") ? hops("t", ["deploy", "rs"], { label: a === "undo" ? "old RS" : "new RS" }) : [])
    : stage === 3 ? (dep ? created.flatMap((p, i) => hops(`p${i}`, ["rs", p.node], { label: "create", tone: "good", start: i * 0.3 })) : [])
    : stage === 4 ? (dep ? hops("s", ["rs", "deploy"], { label: `${r.serving}/${d.replicas} ready`, tone: r.ok ? "good" : "bad" }) : [])
    : [];

  const captions = [
    a === "node" ? `Step 1: node-b stops reporting; after ~${NOT_READY_AFTER} s it is marked NotReady.` : `Step 1: ${action.cmd}.`,
    dep ? `Step 2: the ReplicaSet counts pods with app=shop that it owns: ${r.serving} serving.` : "Step 2: nothing is counting.",
    dep && (a === "image" || a === "undo") ? `Step 3: ${r.log[0]}.` : dep ? "Step 3: the template is unchanged, so the same ReplicaSet handles it." : "Step 3: nothing to compare.",
    dep ? `Step 4: ${r.log.at(-1)}.` : `Step 4: ${r.log.at(-1)}.`,
    `Step 5: ${r.serving} of ${d.replicas} pods serving${r.downtime ? ` after ~${r.downtime} s` : ""}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${card.filter((c) => c.ok).length} of ${ACTIONS.length} actions handled · ${action.label}: ${r.log.at(-1)}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="Deployments and ReplicaSets"
        blurb="You don't start pods; you declare how many you want, and a controller keeps making it true. A ReplicaSet counts the pods matching its labels and creates or deletes the difference; a Deployment manages ReplicaSets, one per version. Break things and watch the loop answer."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="You change the Deployment, which manages a ReplicaSet, which keeps pods running on three nodes"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "you", to: "deploy", label: "kubectl" },
                  { from: "deploy", to: "rs", label: "owns", dim: !dep },
                  ...NODES.map((n) => ({ from: "rs", to: n, label: "pods", dim: !dep })),
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.75}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Five actions and the result">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">five actions · {card.filter((c) => c.ok).length}/{ACTIONS.length} handled</p>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {card.map((c) => (
                    <li key={c.action.id}>
                      <span style={{ color: c.ok ? "var(--good)" : "var(--bad)" }} aria-hidden>
                        {c.ok ? "✓ " : "✕ "}
                      </span>
                      {c.action.label}
                      <span className="block text-[11px] text-[var(--muted)]">{c.log.at(-1)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">kubectl get rs,pods after: {action.label.toLowerCase()}</p>
                <ul className="mt-1 space-y-0.5 font-mono text-[10px]">
                  {r.st.sets.map((s) => (
                    <li key={s.name}>
                      replicaset/{s.name} rev {s.revision} image {s.image} desired {s.replicas}
                    </li>
                  ))}
                  {live.map((p) => (
                    <li key={p.name} style={{ color: p.phase === "Unknown" ? "var(--bad)" : p.app !== "shop" ? "var(--c2)" : "var(--muted)" }}>
                      pod/{p.name} {p.node} {p.phase} app={p.app}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices<Action> label="Action" accent={ACCENT} value={a} onChange={setA} options={ACTIONS.map((x) => ({ id: x.id, label: x.label }))} />
              </div>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Pods made by hand
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Deployment, tuned
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Reconciling…">
                Do it
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Declare what you want" what="A pod created by hand is a one-off: when it dies, it's gone. A Deployment states a count and a pod template, and controllers keep the cluster matching it." accent={ACCENT} active={at(0)}>
                <Choices<Owner> label="Pods come from" accent={ACCENT} value={d.owner} onChange={(x) => set({ owner: x })} options={[{ id: "bare", label: "kubectl run, by hand" }, { id: "deployment", label: "A Deployment" }]} />
                <div className="mt-2">
                  <Slider label="replicas" value={d.replicas} min={2} max={6} step={1} format={(v) => String(v)} onChange={(v) => set({ replicas: v })} accent={ACCENT} />
                </div>
              </FlowStep>
              <FlowArrow label="watch" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Count the pods that match" what="The ReplicaSet doesn't remember pods; it counts the ones whose labels match its selector. Change a pod's label and it stops counting: a replacement starts, and the old pod keeps running outside the Service, handy for debugging." accent={ACCENT} active={at(1)}>
                <p className="font-mono text-[11px]">selector: app=shop · {r.serving} match now</p>
              </FlowStep>
              <FlowArrow label="difference" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="A new template means a new ReplicaSet" what="Changing the image changes the pod template, so the Deployment creates a ReplicaSet named after the template's hash and moves replicas from the old one to the new one, a few at a time." accent={ACCENT} active={at(2)}>
                <ul className="space-y-0.5 font-mono text-[11px] text-[var(--muted)]">
                  {r.st.sets.length ? r.st.sets.map((s) => <li key={s.name}>{s.name}: revision {s.revision}, image {s.image}, {s.replicas} replicas</li>) : <li>no ReplicaSets</li>}
                </ul>
              </FlowStep>
              <FlowArrow label="create / delete" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Replace pods on a lost node" what={`A dead node can't report that its pods died. After ~${NOT_READY_AFTER} s it's marked NotReady; its pods are evicted only when their toleration for that runs out (300 s by default), and then replaced elsewhere.`} accent={ACCENT} active={at(3)}>
                <Choices<string> label="tolerationSeconds for not-ready / unreachable" accent={ACCENT} value={String(d.toleration)} onChange={(x) => set({ toleration: Number(x) as 300 | 30 })} options={[{ id: "300", label: "300 s (default)" }, { id: "30", label: "30 s" }]} />
              </FlowStep>
              <FlowArrow label="status" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Keep old ReplicaSets to roll back" what="A rollback just scales an old ReplicaSet back up, using the image it already names. revisionHistoryLimit decides how many old ones are kept; set it to 0 and there's nothing to go back to." accent={ACCENT} active={at(4)}>
                <Choices<string> label="revisionHistoryLimit" accent={ACCENT} value={String(d.history)} onChange={(x) => set({ history: Number(x) as 10 | 0 })} options={[{ id: "10", label: "10 (default)" }, { id: "0", label: "0" }]} />
                <p className="mt-2 text-[11px] text-[var(--faint)]">The controllers&apos; counting, creating and scaling run here; the timings are approximate Kubernetes defaults.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
