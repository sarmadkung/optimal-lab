"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { FIRST, FIXED, OWNER_LOOKUP, TASKS, days, fmtDays, schedule, type Design } from "@/lib/devPlatform";

const ACCENT = "var(--ops)";

export default function DevPlatformDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const s = schedule(d);
  const span = Math.max(s.total, 0.5);

  const nodes: MapNode[] = [
    { id: "team", label: "Your team", sub: "a new service", at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "portal", label: "Developer portal", sub: d.template || d.catalog ? `${[d.template && "templates", d.catalog && "catalog"].filter(Boolean).join(" + ")}` : "not built", at: [50, 18], mobileAt: [75, 12], state: d.template || d.catalog ? "good" : "dim" },
    { id: "infra", label: d.selfInfra ? "Self-service infra" : "Infra tickets", sub: d.selfInfra ? "namespace, DB, secrets" : "tickets to 3 teams", at: [86, 18], mobileAt: [75, 45], state: d.selfInfra ? "good" : "wait" },
    { id: "net", label: d.autoNet ? "Automatic DNS + TLS" : "Network team", sub: d.autoNet ? "from the ingress" : "6-day ticket", at: [86, 82], mobileAt: [75, 80], state: d.autoNet ? "good" : "wait" },
    { id: "obs", label: "Observability", sub: d.defaults ? "on by default" : "build your own", at: [50, 82], mobileAt: [25, 80], state: d.defaults ? "good" : "wait" },
    { id: "prod", label: "Production", sub: `first deploy after ${fmtDays(s.total)}`, at: [14, 82], mobileAt: [25, 45], state: s.total < 1 ? "good" : "bad" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("t", ["team", "portal"], { label: d.template ? "from template" : "copy an old repo", tone: d.template ? "good" : undefined })
    : stage === 1 ? hops("i", [d.selfInfra ? "portal" : "team", "infra"], { label: d.selfInfra ? "claim" : "3 tickets", tone: d.selfInfra ? "good" : "bad" })
    : stage === 2 ? hops("n", [d.autoNet ? "infra" : "team", "net"], { label: d.autoNet ? "automatic" : "ticket", tone: d.autoNet ? "good" : "bad" })
    : stage === 3 ? hops("o", ["obs", "prod"], { label: d.defaults ? "defaults" : "DIY", tone: d.defaults ? "good" : undefined })
    : stage === 4 ? hops("c", ["prod", "portal"], { label: "who owns this?", tone: d.catalog ? "good" : "bad" })
    : [];

  const captions = [
    d.template ? "Step 1: the template creates the repository with CI and the image build already working." : "Step 1: the team copies an old service's repository and spends two days making CI work.",
    d.selfInfra ? "Step 2: namespace, database and credentials come from the portal in minutes." : "Step 2: three tickets: platform team (3 days), DBAs (8 days), then security (3 days).",
    d.autoNet ? "Step 3: the ingress gets a DNS name and a certificate automatically." : "Step 3: a ticket to the network team for DNS and a certificate: 6 days, after the namespace exists.",
    d.defaults ? "Step 4: every service starts with standard dashboards and SLO alerts." : "Step 4: the team builds dashboards and alerts by hand.",
    d.catalog ? `Step 5: at 3 a.m. the catalog says who owns it: ${OWNER_LOOKUP.with} minutes.` : `Step 5: at 3 a.m. nobody knows who owns it: ${OWNER_LOOKUP.without} minutes of asking around.`,
  ];
  const caption = stage !== null ? captions[stage] : `First deploy after ${fmtDays(s.total)} · ${s.tickets.length} tickets to ${s.teams} team${s.teams === 1 ? "" : "s"} · critical path: ${s.critical.map((id) => TASKS.find((t) => t.id === id)!.title.toLowerCase()).join(" → ")}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="Internal developer platforms"
        blurb="A team wants to ship a new service. Without a platform, that means a repository copied from somewhere, tickets to four other teams and a week of waiting. A platform turns those tickets into self-service. The time to first deploy is the longest chain of waits; watch it shrink."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="A team creates a service through a developer portal, gets infrastructure, networking and observability, and deploys to production"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "team", to: "portal", label: "create" },
                  { from: "portal", to: "infra", label: "provision", dim: !d.selfInfra },
                  { from: "infra", to: "net", label: "ingress" },
                  { from: "obs", to: "prod", label: "watch" },
                  { from: "prod", to: "portal", label: "owner", dim: !d.catalog },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Schedule to first deploy">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">to first deploy · {fmtDays(s.total)}</p>
                <ul className="mt-2 space-y-1">
                  {TASKS.map((t) => {
                    const st = s.start.get(t.id)!;
                    const len = days(t, d);
                    const crit = s.critical.includes(t.id);
                    const ticket = t.team !== "you" && len === t.manualDays;
                    return (
                      <li key={t.id} className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-2 text-[11px]">
                        <span className="truncate text-[var(--muted)]" title={t.title}>
                          {t.title}
                        </span>
                        <span className="relative h-3 rounded-sm bg-[var(--inset)]">
                          <span className="absolute inset-y-0 rounded-sm" style={{ left: `${(st / span) * 100}%`, width: `${Math.max(1, (len / span) * 100)}%`, background: ticket ? "var(--bad)" : crit ? ACCENT : "var(--c1)", opacity: crit ? 1 : 0.6 }} />
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Red: waiting on another team&apos;s ticket. Bright: on the critical path.</p>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Tickets
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Self-service platform
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Shipping…">
                Ship the new service
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Start from a template, not a copy" what="Copying an old repository brings its old pipeline, old base image and old mistakes. A template creates a working repository with CI and the image build already wired." accent={ACCENT} active={at(0)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.template} onChange={(e) => set({ template: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Service template in the portal
                </label>
              </FlowStep>
              <FlowArrow label="infrastructure" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Turn tickets into self-service" what="Each ticket waits in another team's queue. The platform team builds the paved version once (a database claim, a namespace with sane quotas, credentials written to the secret store) and every team uses it without asking." accent={ACCENT} active={at(1)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.selfInfra} onChange={(e) => set({ selfInfra: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Namespace, database and secrets on request
                </label>
              </FlowStep>
              <FlowArrow label="networking" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Automate what nobody should ask for" what="A DNS record and a certificate follow from the service's name. Controllers can create both from the ingress, so there's nothing to request." accent={ACCENT} active={at(2)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.autoNet} onChange={(e) => set({ autoNet: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  DNS and TLS from the ingress
                </label>
              </FlowStep>
              <FlowArrow label="operations" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Give every service the basics by default" what="Dashboards, SLO alerts and log shipping are the same for most services. Built into the platform, they exist on day one instead of after the first incident." accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.defaults} onChange={(e) => set({ defaults: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Standard dashboards and alerts
                </label>
              </FlowStep>
              <FlowArrow label="later" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Know who owns what" what="A service catalog lists every service with its owner, on-call rotation, runbooks and dependencies. It's the first thing anyone opens during an incident." accent={ACCENT} active={at(4)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.catalog} onChange={(e) => set({ catalog: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Service catalog
                </label>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The schedule is the critical path of the task graph, computed here; task durations are illustrative.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
