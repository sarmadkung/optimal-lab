"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { CONNECTIONS, FIRST, FIXED, PODS, check, matrix, policies, type Design, type Policy } from "@/lib/networkPolicies";

const ACCENT = "var(--ops)";
const POS: Record<string, { at: [number, number]; mobileAt: [number, number]; sub: string }> = {
  frontend: { at: [12, 18], mobileAt: [25, 8], sub: "shop" },
  api: { at: [50, 18], mobileAt: [75, 8], sub: "shop" },
  db: { at: [88, 18], mobileAt: [75, 32], sub: "shop" },
  "kube-dns": { at: [12, 82], mobileAt: [25, 32], sub: "kube-system" },
  prometheus: { at: [50, 82], mobileAt: [25, 58], sub: "monitoring" },
  payments: { at: [88, 55], mobileAt: [75, 58], sub: "payments" },
  internet: { at: [88, 90], mobileAt: [50, 86], sub: "outside" },
};

function yaml(p: Policy) {
  const sel = Object.keys(p.selector).length ? `{ ${Object.entries(p.selector).map(([k, v]) => `${k}: ${v}`).join(", ")} }` : "{}";
  const rules = (p.ingress ?? p.egress ?? []).map((r) => `  - ${p.ingress ? "from" : "to"}: ${r.peers.map((x) => [x.namespaces ? `ns ${Object.values(x.namespaces)[0]}` : "", x.pods ? Object.entries(x.pods).map(([k, v]) => `${k}=${v}`).join(",") : ""].filter(Boolean).join(" / ")).join("; ")} · port ${r.ports.join(",")}`);
  return [`# ${p.ns}/${p.name}`, `podSelector: ${sel} · ${p.types.join(", ")}`, ...(rules.length ? rules : ["  (no rules: deny all)"])].join("\n");
}

export default function NetworkPoliciesDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [cid, setCid] = useState("exfil");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const r = check(cid, d);
  const m = matrix(d);
  const ps = policies(d);

  const nodes: MapNode[] = PODS.map((p) => {
    const involved = p.id === r.c.from || p.id === r.c.to || (p.id === "kube-dns" && r.c.byName);
    return { id: p.id, label: p.id, sub: POS[p.id].sub, at: POS[p.id].at, mobileAt: POS[p.id].mobileAt, state: (!involved ? "idle" : r.good ? "good" : "bad") as MapNode["state"] };
  });

  const dnsStep = r.steps.find((s) => s.what.includes("DNS"));
  const egress = r.steps.find((s) => s.what.endsWith("egress"));
  const ingress = r.steps.find((s) => s.what.endsWith("ingress"));
  const tone = (ok: boolean | undefined) => (ok === undefined ? undefined : ok ? (r.c.want ? "good" : "bad") : r.c.want ? "bad" : "good");
  const packets: Packet[] =
    stage === 0 ? (r.c.byName ? hops("d", [r.c.from, "kube-dns"], { label: dnsStep!.ok ? "DNS ok" : "DNS blocked", tone: dnsStep!.ok ? undefined : tone(false) }) : [])
    : stage === 1 ? (egress ? hops("e", [r.c.from, r.c.to], { label: egress.ok ? `:${r.c.port}` : "egress denied", tone: egress.ok ? undefined : tone(false) }) : [])
    : stage === 2 ? (ingress ? hops("i", [r.c.from, r.c.to], { label: ingress.ok ? "ingress ok" : "ingress denied", tone: tone(ingress.ok) }) : [])
    : stage === 3 ? hops("r", [r.c.from, r.c.to], { label: r.ok ? "connected" : "blocked", tone: r.good ? "good" : "bad" })
    : stage === 4 ? m.flatMap((x, i) => (x.ok ? hops(`m${i}`, [x.c.from, x.c.to], { label: x.good ? "ok" : "!", tone: x.good ? "good" : "bad" }) : []))
    : [];

  const captions = [
    r.c.byName ? `Step 1: ${r.c.from} resolves ${r.c.to} through kube-dns: ${dnsStep!.ok ? "allowed" : "blocked"} (${dnsStep!.by}).` : `Step 1: ${r.c.from} connects by address; no DNS lookup.`,
    egress ? `Step 2: leaving ${r.c.from}: ${egress.ok ? "allowed" : "blocked"} (${egress.by}).` : "Step 2: the connection never gets this far.",
    ingress ? `Step 3: arriving at ${r.c.to}: ${ingress.ok ? "allowed" : "blocked"} (${ingress.by}).` : "Step 3: the connection never gets this far.",
    `Step 4: ${r.c.title}: ${r.reason}${r.good ? ", as intended" : r.c.want ? ", but it should work" : ", but it should be blocked"}.`,
    `Step 5: ${m.filter((x) => x.good).length} of ${m.length} connections behave as intended.`,
  ];
  const caption = stage !== null ? captions[stage] : `${m.filter((x) => x.good).length} of ${m.length} as intended · ${r.c.title}: ${r.reason}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="Kubernetes network policies"
        blurb="By default every pod in a cluster can reach every other pod. If an attacker gets into the frontend, the database and the payments service are one connection away. Network policies say who may talk to whom; they're evaluated here the way Kubernetes evaluates them, egress and ingress, DNS included."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Pods frontend, api and db in the shop namespace, payments, prometheus, kube-dns and the internet, with the connections between them"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={CONNECTIONS.map((c) => ({ from: c.from, to: c.to, label: `:${c.port}`, dim: c.id !== cid }))}
                packets={packets}
                aspect={1.3}
                mobileAspect={0.7}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Seven connections">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">seven connections · {m.filter((x) => x.good).length}/{m.length} as intended</p>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {m.map((x) => (
                    <li key={x.c.id}>
                      <span style={{ color: x.good ? "var(--good)" : "var(--bad)" }} aria-hidden>
                        {x.good ? "✓ " : "✕ "}
                      </span>
                      {x.c.title} <span className="font-mono text-[10px] text-[var(--faint)]">{x.ok ? "open" : "blocked"}</span>
                      <span className="block text-[11px] text-[var(--muted)]">{x.reason}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices<string> label="Connection" accent={ACCENT} value={cid} onChange={setCid} options={CONNECTIONS.map((c) => ({ id: c.id, label: c.title }))} />
              </div>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  No policies
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Default deny, explicit allows
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Connecting…">
                Try the connection
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Deny incoming traffic by default" what="A policy with an empty pod selector and no ingress rules selects every pod in its namespace and allows nothing in. Once any policy selects a pod, only what some policy allows gets through." accent={ACCENT} active={at(0)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.denyIngress} onChange={(e) => set({ denyIngress: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  default-deny-ingress in shop and payments
                </label>
              </FlowStep>
              <FlowArrow label="allows" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Allow each real path" what="Then add one policy per path the app needs: the api accepts the frontend on 8080, the database accepts the api on 5432, payments accepts the shop's api on 443, matched by labels, not IPs." accent={ACCENT} active={at(1)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.allows} onChange={(e) => set({ allows: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Allow frontend→api, api→db, api→payments
                </label>
              </FlowStep>
              <FlowArrow label="other namespaces" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Let monitoring in" what="Prometheus lives in another namespace. A podSelector alone only matches pods in the policy's own namespace, so cross-namespace traffic needs a namespaceSelector." accent={ACCENT} active={at(2)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.metrics} onChange={(e) => set({ metrics: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Allow :9090 from namespace monitoring
                </label>
              </FlowStep>
              <FlowArrow label="outgoing" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Deny outgoing traffic too" what="Ingress rules stop strangers getting in; egress rules stop a hijacked pod reaching out, to other services or to an attacker's server on the internet." accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.denyEgress} onChange={(e) => set({ denyEgress: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  default-deny-egress in shop, plus the app&apos;s paths
                </label>
              </FlowStep>
              <FlowArrow label="names" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Don't forget DNS" what="Services are reached by name, and names are resolved by kube-dns on port 53. Deny egress without allowing DNS and every connection by name fails, even the allowed ones." accent={ACCENT} active={at(4)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.dns} onChange={(e) => set({ dns: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Allow egress to kube-dns :53
                </label>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] leading-relaxed">{ps.length ? ps.map(yaml).join("\n\n") : "# no NetworkPolicies: everything can reach everything"}</pre>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Every connection is evaluated here with NetworkPolicy semantics: selectors, namespaces, ports, egress then ingress.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
