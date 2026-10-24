"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, Slider, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { FIRST, QUOTA_CPU, SCENARIOS, apply, freeCpu, manifest, type Design, type Scenario } from "@/lib/k8sApply";

const ACCENT = "var(--ops)";
const PHASE_COLOR = { Running: "var(--good)", Pending: "var(--c2)", ImagePullBackOff: "var(--bad)", Forbidden: "var(--bad)" } as const;

export default function K8sApplyDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [s, setS] = useState<Scenario>("ok");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const r = apply(s, d);
  const reached = (i: number) => r.stoppedAt === null || i <= r.stoppedAt;
  const st = (i: number) => (!reached(i) ? "dim" : r.stages[i] && !r.stages[i].ok ? "bad" : "good");
  const pending = r.pods.filter((p) => p.phase === "Pending").length;

  const nodes: MapNode[] = [
    { id: "kubectl", label: "kubectl apply", sub: "deploy.yaml", at: [14, 20], mobileAt: [25, 12], state: "active" },
    { id: "api", label: "API server", sub: s === "apiDown" ? "unreachable" : "validates, admits", at: [50, 20], mobileAt: [75, 12], state: s === "apiDown" ? "bad" : st(0) },
    { id: "etcd", label: "etcd", sub: reached(1) && s !== "apiDown" && s !== "typo" ? "Deployment stored" : "unchanged", at: [86, 20], mobileAt: [75, 45], state: st(1) },
    { id: "ctrl", label: "Controllers", sub: `${r.pods.filter((p) => p.phase !== "Forbidden").length} pods created`, at: [86, 80], mobileAt: [25, 45], state: st(2) },
    { id: "sched", label: "Scheduler", sub: pending ? `${pending} unschedulable` : "binds pods", at: [50, 80], mobileAt: [25, 80], state: st(3) },
    { id: "kubelet", label: "Kubelets", sub: `${r.running} running`, at: [14, 80], mobileAt: [75, 80], state: st(4) },
  ];

  const hop = (i: number, path: string[], label: string): Packet[] => (reached(i) ? hops(`s${i}`, path, { label, tone: r.stages[i] && !r.stages[i].ok ? "bad" : undefined }) : []);
  const packets: Packet[] =
    stage === 0 ? hop(0, ["kubectl", "api"], "POST")
    : stage === 1 ? hop(1, ["api", "etcd"], "write")
    : stage === 2 ? hop(2, ["ctrl", "api"], "create pods")
    : stage === 3 ? hop(3, ["sched", "api"], "bind")
    : stage === 4 ? hop(4, ["api", "kubelet"], "start")
    : [];

  const captions = r.stages.map((x, i) => `Step ${i + 1}: ${x.text}.`);
  const caption = stage !== null ? captions[stage] ?? `Step ${stage + 1}: nothing gets this far.` : `${SCENARIOS.find((x) => x.id === s)!.label}: ${r.running} of ${d.replicas} pods running.${r.note ? ` ${r.note[0].toUpperCase()}${r.note.slice(1)}.` : ""}`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="Control plane, nodes and pods"
        blurb="kubectl apply only talks to the API server. Everything else happens because other components watch the API server and act: controllers create pods, the scheduler picks nodes, kubelets start containers. Apply one Deployment and see where each kind of mistake surfaces."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="kubectl sends the manifest to the API server, which stores it in etcd; controllers, the scheduler and kubelets watch the API server and act"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "kubectl", to: "api", label: "HTTPS" },
                  { from: "api", to: "etcd", label: "only writer" },
                  { from: "ctrl", to: "api", label: "watch" },
                  { from: "sched", to: "api", label: "watch" },
                  { from: "kubelet", to: "api", label: "watch" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Pods and events">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">kubectl get pods</p>
                <ul className="mt-1 space-y-0.5 font-mono text-[10px]">
                  {r.pods.length === 0 && <li className="text-[var(--muted)]">No resources found in team-a namespace.</li>}
                  {r.pods.map((p) => (
                    <li key={p.name} className="flex flex-wrap gap-x-2">
                      <span>{p.phase === "Forbidden" ? "(not created)" : p.name}</span>
                      <span style={{ color: PHASE_COLOR[p.phase] }}>{p.phase === "Forbidden" ? "quota" : p.phase}</span>
                      <span className="text-[var(--faint)]">{p.node ?? "<none>"}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">kubectl get events</p>
                <ul className="mt-1 max-h-40 space-y-0.5 overflow-auto font-mono text-[10px]">
                  {r.events.map((e, i) => (
                    <li key={i} className="break-words" style={{ color: e.bad ? "var(--bad)" : "var(--muted)" }}>
                      {e.who}: {e.text}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices<Scenario> label="Apply" accent={ACCENT} value={s} onChange={setS} options={SCENARIOS} />
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Applying…">
                kubectl apply
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="The API server checks the request" what="It authenticates you, checks RBAC, validates the object against its schema and runs admission (defaults, quotas, policies). Only errors from this step show up in kubectl's own output." accent={ACCENT} active={at(0)}>
                <pre className="max-h-48 overflow-auto whitespace-pre rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] leading-relaxed">{manifest(s, d).join("\n")}</pre>
              </FlowStep>
              <FlowArrow label="object" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="etcd stores the desired state" what="etcd is the cluster's only database, and only the API server talks to it. What's stored is a wish (three replicas of this image), not a result; nothing is running yet." accent={ACCENT} active={at(1)}>
                <p className="text-xs">{r.stages[1]?.text ?? "nothing stored"}</p>
              </FlowStep>
              <FlowArrow label="watch event" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Controllers create what's missing" what={`The Deployment controller sees a Deployment without a ReplicaSet and makes one; the ReplicaSet controller sees too few pods and creates them. Admission still applies: this namespace's quota allows ${QUOTA_CPU} CPU of requests.`} accent={ACCENT} active={at(2)}>
                <Slider label="Replicas" value={d.replicas} min={1} max={8} step={1} format={(v) => String(v)} onChange={(v) => setD((c) => ({ ...c, replicas: v }))} accent={ACCENT} />
                <p className="mt-1 font-mono text-[11px] text-[var(--muted)]">
                  {d.replicas} × {d.cpu} CPU = {(d.replicas * d.cpu).toFixed(2)} of {QUOTA_CPU} CPU quota
                </p>
              </FlowStep>
              <FlowArrow label="unscheduled pods" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="The scheduler picks a node" what="For each pod without a node, the scheduler filters out nodes that can't fit its CPU request, scores the rest (here: the most free CPU wins) and writes the choice back. A pod no node fits stays Pending." accent={ACCENT} active={at(3)}>
                <Slider label="CPU request per pod" value={d.cpu} min={0.25} max={3} step={0.25} format={(v) => `${v} CPU`} onChange={(v) => setD((c) => ({ ...c, cpu: v }))} accent={ACCENT} />
                <ul className="mt-1 space-y-0.5 font-mono text-[11px] text-[var(--muted)]">
                  {freeCpu().map((n) => (
                    <li key={n.id}>
                      {n.id}: {n.free} of {n.capacity} CPU free before this apply
                    </li>
                  ))}
                </ul>
              </FlowStep>
              <FlowArrow label="pod bound to a node" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="The kubelet starts the containers" what="The kubelet on each node watches for pods bound to it, pulls the image through the container runtime, starts the containers and reports their status. If the control plane goes down, running pods keep running." accent={ACCENT} active={at(4)}>
                <p className="text-xs" style={{ color: r.stages[4]?.ok ? "var(--good)" : "var(--bad)" }}>
                  {r.stages[4]?.text ?? "nothing to start"}
                </p>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Validation, quota, scheduling and pod states are computed here; node usage is illustrative.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
