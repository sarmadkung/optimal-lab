"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { FIRST, FIXED, INCIDENTS, PREVIEW, PROD_SIZE_STAGING, ROWS, ROWS_PER_SECOND, fmtDuration, judge, quarter, staging, type Design, type IncidentId } from "@/lib/environments";

const ACCENT = "var(--ops)";

export default function EnvironmentsDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [iid, setIid] = useState<IncidentId>("migration");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const q = quarter(d);
  const inc = INCIDENTS.find((x) => x.id === iid)!;
  const v = judge(iid, d);
  const s = staging(d);
  const toneAt = (i: number) => (inc.step === i ? (v.caught ? "good" : "bad") : undefined);

  const nodes: MapNode[] = [
    { id: "ci", label: "CI build", sub: d.buildOnce ? "one image per commit" : "builds per environment", at: [14, 18], mobileAt: [25, 12], state: inc.step === 0 ? (v.caught ? "good" : "bad") : "active" },
    { id: "registry", label: "Image registry", sub: d.buildOnce ? "sha256:9f2c…" : "tag :latest", at: [50, 18], mobileAt: [75, 12], state: "active" },
    { id: "preview", label: "Preview envs", sub: d.previews ? `~${PREVIEW.openPrs} live, one per PR` : "none", at: [86, 18], mobileAt: [75, 45], state: d.previews ? (inc.step === 4 ? "good" : "active") : "dim" },
    { id: "staging", label: "Staging", sub: `${d.prodData ? "prod-size copy" : `${ROWS.staging / 1000}k rows`} · ${d.sameModule ? "pg 14" : "pg 16"}`, at: [86, 82], mobileAt: [25, 45], state: !d.previews && inc.step === 4 ? "bad" : "active" },
    { id: "prod", label: "Production", sub: `${(ROWS.production / 1e6).toFixed(0)}M rows · pg 14`, at: [50, 82], mobileAt: [25, 80], state: v.caught ? "good" : "bad" },
    { id: "iac", label: "Terraform + config", sub: d.sameModule ? "one module, all envs" : "staging set up by hand", at: [14, 82], mobileAt: [75, 80], state: d.sameModule || d.configCheck ? "active" : "wait" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("b", ["ci", "registry"], { label: d.buildOnce ? "image digest" : "rebuild", tone: toneAt(0) })
    : stage === 1 ? [...hops("m1", ["iac", "staging"], { label: d.sameModule ? "module v3" : "by hand" }), ...hops("m2", ["iac", "prod"], { label: "module v3", tone: toneAt(1) })]
    : stage === 2 ? hops("c", ["staging", "prod"], { label: d.configCheck ? "config check" : "deploy", tone: toneAt(2) })
    : stage === 3 ? (d.prodData ? hops("d", ["prod", "staging"], { label: "masked snapshot", tone: toneAt(3) }) : hops("d", ["staging", "prod"], { label: "migration", tone: toneAt(3) }))
    : stage === 4 ? hops("p", ["registry", d.previews ? "preview" : "staging"], { label: d.previews ? "per PR" : "shared slot", tone: toneAt(4) })
    : [];

  const captions = [
    d.buildOnce ? "Step 1: CI builds one image and every environment pulls that exact digest." : "Step 1: each environment builds its own image from source at deploy time.",
    d.sameModule ? "Step 2: one Terraform module creates staging and production; only sizes differ." : "Step 2: staging was set up by hand a year ago and drifted from production.",
    d.configCheck ? "Step 3: config is checked against a schema before a deploy goes out." : "Step 3: config is whatever was set by hand in each environment.",
    d.prodData ? "Step 4: staging restores a masked copy of production data each week." : `Step 4: staging has ${ROWS.staging.toLocaleString("en-US")} rows; production has ${ROWS.production.toLocaleString("en-US")}.`,
    d.previews ? "Step 5: each pull request gets its own environment, deleted on merge." : `Step 5: ${s.demand} test slots wanted a day on one staging; ${s.fit} fit.`,
  ];
  const caption = stage !== null ? (stage === inc.step ? `${captions[stage]} ${v.text}.` : captions[stage]) : `${q.caught} of ${INCIDENTS.length} incidents caught before production · extra cost $${q.extraCost.toLocaleString("en-US")}/month · ${inc.title}: ${v.text}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="Dev, staging, production and preview environments"
        blurb="Staging exists to fail before production does. It only can when it's like production in the ways that matter: the same build, the same versions, the same config, real data sizes. Five incidents from one quarter, each caused by one difference. Remove the differences and see which ones staging catches."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="CI builds an image into a registry, which feeds preview environments, staging and production; Terraform and config set up the environments"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "ci", to: "registry", label: "push" },
                  { from: "registry", to: "preview", label: "per PR", dim: !d.previews },
                  { from: "registry", to: "staging", label: "deploy" },
                  { from: "staging", to: "prod", label: "promote" },
                  { from: "iac", to: "staging", label: "env", dim: !d.sameModule },
                  { from: "iac", to: "prod", label: "env" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Five incidents this quarter">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">
                  the quarter · {q.caught}/{INCIDENTS.length} caught before production
                </p>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {q.rows.map((r) => (
                    <li key={r.incident.id}>
                      <span style={{ color: r.caught ? "var(--good)" : "var(--bad)" }} aria-hidden>
                        {r.caught ? "✓ " : "✕ "}
                      </span>
                      {r.incident.title}
                      <span className="block text-[11px] text-[var(--muted)]">{r.text}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 font-mono text-[11px] text-[var(--muted)]">
                  extra cost ${q.extraCost.toLocaleString("en-US")}/month{q.previewCost ? ` (previews $${q.previewCost})` : ""}
                </p>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices<IncidentId> label="Incident" accent={ACCENT} value={iid} onChange={setIid} options={INCIDENTS.map((x) => ({ id: x.id, label: x.title }))} />
              </div>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Staging set up by hand
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Built for parity
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Releasing…">
                Release this change
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Build once, promote the same artifact" what="Build the image once per commit and deploy that exact digest to every environment. Rebuilding for production means production runs a build nobody tested." accent={ACCENT} active={at(0)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.buildOnce} onChange={(e) => set({ buildOnce: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Deploy by image digest, never rebuild
                </label>
              </FlowStep>
              <FlowArrow label="image" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Create every environment from the same code" what="One infrastructure module with variables for size; versions are pinned in the module, not chosen per environment. Staging then can't quietly run a newer database than production." accent={ACCENT} active={at(1)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.sameModule} onChange={(e) => set({ sameModule: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  One Terraform module for all environments
                </label>
              </FlowStep>
              <FlowArrow label="infrastructure" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Check config before it ships" what="Settings set by hand in one environment are the classic “works in staging”. Declare every setting in a schema and fail the deploy, not the first request, when one is missing." accent={ACCENT} active={at(2)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.configCheck} onChange={(e) => set({ configCheck: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Validate config against a schema on deploy
                </label>
              </FlowStep>
              <FlowArrow label="data" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Test migrations on production-sized data" what={`Building an index here runs at about ${ROWS_PER_SECOND.toLocaleString("en-US")} rows a second and blocks writes while it runs: ${fmtDuration(ROWS.staging / ROWS_PER_SECOND)} on staging, ${fmtDuration(ROWS.production / ROWS_PER_SECOND)} on production. A masked copy of production data shows the real time.`} accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.prodData} onChange={(e) => set({ prodData: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Masked production snapshot in staging (+${PROD_SIZE_STAGING}/month)
                </label>
              </FlowStep>
              <FlowArrow label="pull requests" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Give each pull request its own environment" what="One shared staging becomes a queue, and a broken change blocks every team. A preview environment per pull request, created from the same module and deleted on merge, removes the queue; it costs compute while PRs are open." accent={ACCENT} active={at(4)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.previews} onChange={(e) => set({ previews: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Preview environment per pull request
                </label>
                <p className="font-mono text-xs">
                  {s.demand} slots wanted · {s.fit} fit · {s.waiting} wait a day
                </p>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The migration time, the staging queue and the monthly cost are computed here; the incidents, rates and prices are illustrative.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
