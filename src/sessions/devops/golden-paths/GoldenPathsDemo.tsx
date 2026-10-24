"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { CHANGES, CREATE_HOURS, FIRST, FIXED, MERGE_RATE, MONTHS, SERVICES, simulate, type Design } from "@/lib/goldenPaths";

const ACCENT = "var(--ops)";

export default function GoldenPathsDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const r = simulate(d);
  const pct = (n: number) => `${Math.round((n / SERVICES) * 100)}%`;

  const nodes: MapNode[] = [
    { id: "platform", label: "Platform team", sub: "owns the path", at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "template", label: d.template ? "Service template" : "An old repo to copy", sub: d.template ? `CI${d.observability ? " + telemetry" : ""}${d.security ? " + SBOM, signing" : ""}` : "whatever it had", at: [50, 18], mobileAt: [75, 12], state: d.template ? "good" : "wait" },
    { id: "new", label: "New services", sub: `${SERVICES} in ${MONTHS} months`, at: [86, 18], mobileAt: [75, 45], state: "active" },
    { id: "existing", label: "Existing services", sub: `${r.current} of ${SERVICES} current`, at: [86, 82], mobileAt: [75, 80], state: r.current >= SERVICES * 0.9 ? "good" : "bad" },
    { id: "scores", label: "Scorecards", sub: d.scorecards ? "standards per service" : "none", at: [50, 82], mobileAt: [25, 80], state: d.scorecards ? "good" : "dim" },
    { id: "security", label: "New standards", sub: `months ${CHANGES.map((c) => c.month).join(" and ")}`, at: [14, 82], mobileAt: [25, 45], state: "wait" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("t", ["template", "new"], { label: d.template ? "1 hour" : "2 days + fixes" })
    : stage === 1 ? hops("o", ["template", "new"], { label: d.observability && d.template ? "telemetry" : "none", tone: d.observability && d.template ? "good" : undefined })
    : stage === 2 ? hops("s", ["security", "platform", "template"], { label: "SBOM + signing" })
    : stage === 3 ? (d.template && d.updates ? hops("u", ["template", "existing"], { label: "update PRs" }) : hops("u", ["security", "existing"], { label: "an email", tone: "bad" }))
    : stage === 4 ? hops("c", ["scores", "existing"], { label: d.scorecards ? "who's behind" : "nobody tracks", tone: d.scorecards ? "good" : "bad" })
    : [];

  const captions = [
    d.template ? `Step 1: new services come from the template in about ${CREATE_HOURS.template} hour.` : `Step 1: each team copies a recent repository and spends about ${CREATE_HOURS.copy} hours making it theirs.`,
    `Step 2: ${pct(r.observed)} of services start with metrics, logs and traces.`,
    `Step 3: when signing becomes mandatory, ${pct(r.signed)} of services end up signing their images.`,
    d.template && d.updates ? "Step 4: each standards change becomes a pull request on every service made from the template." : "Step 4: standards changes go out as an email and a wiki page.",
    `Step 5: after a year, ${r.current} of ${SERVICES} services are on the current standard; ${r.variants} different setups exist.`,
  ];
  const caption = stage !== null ? captions[stage] : `After ${MONTHS} months: ${r.current}/${SERVICES} current · ${r.signed} signed · ${r.observed} with telemetry · ${r.variants} different setups · ${r.hours} hours spent creating services.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="Golden paths and templates"
        blurb="A golden path is the supported way to build a service: a template with CI, telemetry and security already wired in, kept current by the platform team. Thirty services get created over a year while the standards change twice. Watch how many end up where they should be."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="The platform team keeps a template that new services start from and existing services receive updates from; new standards arrive twice a year; scorecards track who is current"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "platform", to: "template", label: "maintains" },
                  { from: "template", to: "new", label: "create" },
                  { from: "template", to: "existing", label: "update PRs", dim: !(d.template && d.updates) },
                  { from: "security", to: "platform", label: "new rule" },
                  { from: "scores", to: "existing", label: "track", dim: !d.scorecards },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Thirty services after a year">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">{SERVICES} services after a year</p>
                <div className="mt-2 grid grid-cols-10 gap-1" aria-hidden>
                  {r.svcs.map((s) => (
                    <div key={s.i} className="flex h-7 flex-col justify-between rounded-sm p-0.5" style={{ background: s.version === 3 ? "color-mix(in srgb, var(--good) 45%, transparent)" : s.version === 2 ? "color-mix(in srgb, var(--c2) 45%, transparent)" : "color-mix(in srgb, var(--bad) 45%, transparent)" }} title={`service ${s.i + 1}, made in month ${s.created + 1}: standard v${s.version}`}>
                      <span className="text-[8px] leading-none">{s.obs ? "◉" : ""}</span>
                      <span className="text-right text-[8px] leading-none">{s.sec ? "✓" : ""}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-[var(--faint)]">Green: current standard (v3). Amber: v2. Red: v1. ◉ telemetry, ✓ signed images. Services are in order of creation.</p>
                <ul className="mt-2 space-y-0.5 font-mono text-[11px]">
                  <li>{r.current}/{SERVICES} on the current base image</li>
                  <li>{r.signed}/{SERVICES} signing images</li>
                  <li>{r.observed}/{SERVICES} with telemetry</li>
                  <li>{r.variants} different setups · {r.hours} hours creating services</li>
                </ul>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Copy an old repo
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  A maintained golden path
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Running the year…">
                Run the year
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Start every service from a template" what="Copying a repository copies its age: an older base image, an older pipeline, whatever its team skipped. A template is the current best version, and creating a service takes an hour instead of days." accent={ACCENT} active={at(0)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.template} onChange={(e) => set({ template: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  New services come from the template
                </label>
              </FlowStep>
              <FlowArrow label="batteries" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Include the things teams skip" what="Telemetry is the first thing missed under a deadline and the first thing needed in an incident. In the template, every service has metrics, logs and traces from its first deploy." accent={ACCENT} active={at(1)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.observability} disabled={!d.template} onChange={(e) => set({ observability: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Telemetry built into the template
                </label>
              </FlowStep>
              <FlowArrow label="standards" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Build the security standard in" what={`In month ${CHANGES[0].month}, ${CHANGES[0].what}. If the template's pipeline already does it, new services comply without anyone reading a policy.`} accent={ACCENT} active={at(2)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.security} disabled={!d.template} onChange={(e) => set({ security: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  SBOM and signing in the template&apos;s pipeline
                </label>
              </FlowStep>
              <FlowArrow label="changes" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Carry changes to existing services" what={`A template only helps new services, unless its changes flow back. Tools that track which template a repo came from can open a pull request on each one when the template changes, as happens in month ${CHANGES[1].month}: ${CHANGES[1].what}.`} accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.updates} disabled={!d.template} onChange={(e) => set({ updates: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Template updates as pull requests
                </label>
              </FlowStep>
              <FlowArrow label="adoption" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Show who is behind" what={`A pull request nobody merges changes nothing. Scorecards that show each service against the current standard (and a date) take merges from ${Math.round(MERGE_RATE.plain * 100)}% to ${Math.round(MERGE_RATE.scorecards * 100)}% here.`} accent={ACCENT} active={at(4)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.scorecards} onChange={(e) => set({ scorecards: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Scorecards per service
                </label>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The year is simulated here service by service; which teams follow the wiki and which pull requests merge are fixed draws.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
