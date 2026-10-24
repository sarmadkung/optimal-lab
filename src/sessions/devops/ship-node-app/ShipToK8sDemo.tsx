"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { COMMIT, FIRST, FIXED, POD_START_S, dockerfile, manifests, rolloutErrors, scorecard, trace, type Design } from "@/lib/shipToK8s";

const ACCENT = "var(--ops)";

export default function ShipToK8sDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const t = trace(d);
  const card = scorecard(d);
  const errs = rolloutErrors(d);

  const nodes: MapNode[] = [
    { id: "git", label: "Laptop → Git", sub: `commit ${COMMIT}`, at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "ci", label: "CI", sub: "build, test, push", at: [50, 18], mobileAt: [75, 12], state: "active" },
    { id: "registry", label: "Registry", sub: `webapp:${d.shaTag ? COMMIT : "latest"}`, at: [86, 18], mobileAt: [75, 45], state: d.shaTag ? "good" : "wait" },
    { id: "ingress", label: "Ingress + TLS", sub: d.tls ? "cert-manager" : "no certificate", at: [86, 82], mobileAt: [75, 80], state: d.tls ? "good" : "bad" },
    { id: "svc", label: "Service", sub: d.labelsMatch ? "3 endpoints" : "0 endpoints", at: [50, 82], mobileAt: [25, 80], state: d.labelsMatch ? "good" : "bad" },
    { id: "pods", label: "Pods × 3", sub: !d.bindAll ? "listening on 127.0.0.1" : d.shaTag ? `${COMMIT}, ready` : "old release", at: [14, 82], mobileAt: [25, 45], state: d.bindAll && d.shaTag ? "good" : "bad" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("p", ["git", "ci"], { label: "git push" })
    : stage === 1 ? hops("b", ["ci", "registry"], { label: d.shaTag ? `:${COMMIT}` : ":latest" })
    : stage === 2 ? hops("d", ["registry", "pods"], { label: d.shaTag ? "new pods" : "no change", tone: d.shaTag ? undefined : "bad" })
    : stage === 3 ? hops("s", ["ingress", "svc", ...(d.labelsMatch ? ["pods"] : [])], { label: d.labelsMatch ? "request" : "503", tone: d.labelsMatch ? undefined : "bad" })
    : stage === 4 ? (d.tls ? hops("r", d.labelsMatch ? ["ingress", "svc", "pods"] : ["ingress", "svc"], { label: t.served.split(":")[0], tone: t.ok ? "good" : "bad" }) : [])
    : [];

  const captions = [
    d.bindAll ? "Step 1: the image runs the server listening on 0.0.0.0:8080, reachable from the pod's network." : "Step 1: the server listens on 127.0.0.1, as it did on the laptop; inside a container that only accepts connections from the container itself.",
    d.shaTag ? `Step 2: CI tags the image with the commit, ${COMMIT}, and the manifest names that tag.` : "Step 2: CI pushes :latest again; the manifest doesn't change.",
    d.shaTag ? `Step 3: a new image tag means a new pod template, so Kubernetes rolls out new pods${d.readiness ? ", sending traffic only once /healthz answers" : `; each gets traffic during its ${POD_START_S} s startup: ${errs} failed requests`}.` : "Step 3: kubectl apply sees nothing new; the cached image keeps running the previous release.",
    d.labelsMatch ? "Step 4: the Service's selector app=webapp finds the three pods." : "Step 4: the Service selects app=web, the pods are labelled app=webapp: no endpoints, so every request gets a 503.",
    `Step 5: ${t.hops.at(-1)!.note}. The visitor gets ${t.served}.`,
  ];
  const caption = stage !== null ? captions[stage] : `A visitor gets: ${t.served} · ${card.filter((c) => c.ok).length} of ${card.length} right${errs ? ` · ${errs} failed requests per rollout` : ""}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · case study"
        title="Ship an app from laptop to Kubernetes"
        blurb="A web app works on a laptop. Getting it to https://shop.example.com takes a container image, a CI build, a Deployment, a Service, an Ingress and a certificate, and each has one classic mistake that leaves the page blank. Ship it, then follow a visitor's request hop by hop."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="A commit goes from the laptop through CI to the registry and onto pods; a visitor's request comes in through the ingress and the Service to the pods"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "git", to: "ci", label: "push" },
                  { from: "ci", to: "registry", label: "image" },
                  { from: "registry", to: "pods", label: "pull" },
                  { from: "ingress", to: "svc", label: "route" },
                  { from: "svc", to: "pods", label: "endpoints", dim: !d.labelsMatch },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="A visitor's request, hop by hop">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">GET https://shop.example.com/ → {t.served}</p>
                <ol className="mt-2 space-y-1 text-xs">
                  {t.hops.map((h) => (
                    <li key={h.name}>
                      <span style={{ color: h.ok ? "var(--good)" : "var(--bad)" }} aria-hidden>
                        {h.ok ? "✓ " : "✕ "}
                      </span>
                      {h.name}
                      <span className="block text-[11px] text-[var(--muted)]">{h.note}</span>
                    </li>
                  ))}
                </ol>
                <ul className="mt-3 space-y-0.5 text-[11px]">
                  {card.map((c) => (
                    <li key={c.id} style={{ color: c.ok ? "var(--muted)" : "var(--bad)" }}>
                      {c.ok ? "✓" : "✕"} {c.title}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  First attempt
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Shipped properly
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Shipping…">
                Ship it
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Containerize the app" what="On a laptop, listening on localhost is safe and normal. In a container, localhost is the container itself; anything arriving from the pod network is refused unless the server binds to 0.0.0.0." accent={ACCENT} active={at(0)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.bindAll} onChange={(e) => set({ bindAll: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Listen on 0.0.0.0:8080
                </label>
                <pre className="mt-2 overflow-x-auto whitespace-pre rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] leading-relaxed">{dockerfile(d).join("\n")}</pre>
              </FlowStep>
              <FlowArrow label="image" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Build in CI, tag by commit" what="If every build is pushed as :latest, the Deployment's manifest never changes, so applying it does nothing, and nodes that already have :latest keep it. A tag per commit makes every release a real change and every rollback a known image." accent={ACCENT} active={at(1)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.shaTag} onChange={(e) => set({ shaTag: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Tag images with the commit hash
                </label>
              </FlowStep>
              <FlowArrow label="pods" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Deploy, and only send traffic when ready" what={`The app takes about ${POD_START_S} seconds to start. Without a readiness probe, each new pod is added to the Service at once and fails requests until it can answer.`} accent={ACCENT} active={at(2)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.readiness} onChange={(e) => set({ readiness: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  readinessProbe on /healthz
                </label>
                <p className="font-mono text-[11px] text-[var(--muted)]">{errs} failed requests per rollout</p>
              </FlowStep>
              <FlowArrow label="a Service" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Expose it with a Service and an Ingress" what="A Service finds pods by label, not by name. One mismatched character between the selector and the pod template, and the Service has no endpoints." accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.labelsMatch} onChange={(e) => set({ labelsMatch: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Service selector matches the pod labels
                </label>
                <pre className="mt-2 max-h-56 overflow-auto whitespace-pre rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] leading-relaxed">{manifests(d).join("\n")}</pre>
              </FlowStep>
              <FlowArrow label="the visitor" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Add TLS" what="cert-manager watches Ingresses with an issuer annotation, gets a certificate from Let's Encrypt and renews it. Without it there's no valid certificate, and browsers refuse the page." accent={ACCENT} active={at(4)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.tls} onChange={(e) => set({ tls: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  cert-manager issuer on the Ingress
                </label>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The request trace and rollout errors are computed here from the manifests above; startup time and traffic are illustrative.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
