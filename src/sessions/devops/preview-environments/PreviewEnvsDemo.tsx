"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { AWAKE_SHARE, DAYS, FIRST, FIXED, PER_HOUR, TTL_DAYS, simulate, type Design } from "@/lib/previewEnvs";

const ACCENT = "var(--ops)";

export default function PreviewEnvsDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const s = simulate(d);
  const daily = Array.from({ length: DAYS }, (_, day) => Math.max(...s.live.slice(day * 24, day * 24 + 24)));
  const max = Math.max(...daily, 1);

  const nodes: MapNode[] = [
    { id: "pr", label: "Pull request #142", sub: "opened, then merged", at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "ci", label: "CI", sub: "build + deploy preview", at: [50, 18], mobileAt: [75, 12], state: "active" },
    { id: "env", label: "pr-142.preview", sub: `${s.end} environments alive on day ${DAYS}`, at: [86, 18], mobileAt: [75, 45], state: s.end > 20 ? "bad" : "good" },
    { id: "data", label: "Preview database", sub: d.seeded ? "seeded test data" : "copy of production", at: [86, 82], mobileAt: [75, 80], state: d.seeded ? "good" : "bad" },
    { id: "secrets", label: "Credentials", sub: d.ownCreds ? "preview-only, sandbox keys" : "production keys", at: [50, 82], mobileAt: [25, 80], state: d.ownCreds ? "good" : "bad" },
    { id: "janitor", label: "Cleanup", sub: d.teardown || d.ttl ? [d.teardown && "on close", d.ttl && `${TTL_DAYS}-day TTL`].filter(Boolean).join(" + ") : "none", at: [14, 82], mobileAt: [25, 45], state: d.teardown && d.ttl ? "good" : d.teardown || d.ttl ? "wait" : "dim" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("o", ["pr", "ci", "env"], { label: "URL on the PR" })
    : stage === 1 ? hops("c", ["pr", "janitor", "env"], { label: d.teardown ? "merged: delete" : "merged: nothing", tone: d.teardown ? "good" : "bad" })
    : stage === 2 ? hops("t", ["janitor", "env"], { label: d.ttl ? `idle ${TTL_DAYS} days: delete` : "abandoned: kept", tone: d.ttl ? "good" : "bad" })
    : stage === 3 ? hops("d", ["data", "env"], { label: d.seeded ? "seed data" : "prod snapshot", tone: d.seeded ? undefined : "bad" })
    : stage === 4 ? hops("k", ["secrets", "env"], { label: d.ownCreds ? "sandbox keys" : "prod keys", tone: d.ownCreds ? "good" : "bad" })
    : [];

  const captions = [
    "Step 1: opening a PR builds its image and deploys a full copy of the app at its own URL.",
    d.teardown ? "Step 2: merging or closing the PR deletes its environment." : "Step 2: merging the PR changes nothing; its environment keeps running.",
    d.ttl ? `Step 3: ${s.abandoned} abandoned PRs never close; their environments go after ${TTL_DAYS} days without a push.` : `Step 3: ${s.abandoned} abandoned PRs never close, and their environments run forever.`,
    d.sleep ? `Step 4: environments sleep outside working hours, running ${AWAKE_SHARE * 100}% of the time.` : "Step 4: every environment runs around the clock.",
    `Step 5: ${d.seeded ? "seeded data" : "a production copy"} and ${d.ownCreds ? "sandbox credentials" : "production credentials"} in ${s.created} environments: $${s.cost.toLocaleString("en-US")} this month.`,
  ];
  const caption = stage !== null ? captions[stage] : `${s.created} previews this month · peak ${s.peak} at once · $${s.cost.toLocaleString("en-US")} · ${s.prodDataEnvs} held production data · ${s.prodCredEnvs} had production keys.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · case study"
        title="Preview environments for every pull request"
        blurb="Every pull request gets its own running copy of the app, with a link reviewers can click. It's one of the best things a team can have, and one of the easiest to let run away: forgotten environments, real customer data and production keys in places nobody watches. One month, about 90 pull requests."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="A pull request triggers CI to deploy a preview environment with its own database and credentials; a cleanup job deletes it"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "pr", to: "ci", label: "opened" },
                  { from: "ci", to: "env", label: "deploy" },
                  { from: "data", to: "env", label: "data" },
                  { from: "secrets", to: "env", label: "keys" },
                  { from: "janitor", to: "env", label: "delete", dim: !(d.teardown || d.ttl) },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Environments alive each day">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">environments alive · ${s.cost.toLocaleString("en-US")} this month</p>
                <div className="mt-2 flex h-24 items-end gap-px" aria-hidden>
                  {daily.map((n, i) => (
                    <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${Math.max(2, (n / max) * 100)}%`, background: n > 20 ? "var(--bad)" : ACCENT, opacity: 0.8 }} />
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-[var(--faint)]">
                  Day 1 to {DAYS}; the most alive at once each day. Peak {s.peak}, {s.end} on the last day.
                </p>
                <ul className="mt-2 space-y-0.5 text-xs">
                  <li style={{ color: s.prodDataEnvs ? "var(--bad)" : "var(--good)" }}>{s.prodDataEnvs ? `${s.prodDataEnvs} environments held a copy of customer data` : "no environment held customer data"}</li>
                  <li style={{ color: s.prodCredEnvs ? "var(--bad)" : "var(--good)" }}>{s.prodCredEnvs ? `${s.prodCredEnvs} environments could charge real cards` : "every environment used sandbox keys"}</li>
                </ul>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Previews, quickly
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Previews, done right
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Running…">
                Open a pull request
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Tear it down when the PR closes" what="Creating environments is the easy half. The pipeline needs a matching job on merge or close that deletes the namespace, the database and the DNS record." accent={ACCENT} active={at(0)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.teardown} onChange={(e) => set({ teardown: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Delete on merge or close
                </label>
              </FlowStep>
              <FlowArrow label="forgotten PRs" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Expire the ones nobody closes" what={`Some pull requests are never merged or closed: abandoned experiments, drafts. A TTL removes any environment with no push for ${TTL_DAYS} days; pushing again brings it back.`} accent={ACCENT} active={at(1)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.ttl} onChange={(e) => set({ ttl: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Delete after {TTL_DAYS} idle days
                </label>
              </FlowStep>
              <FlowArrow label="nights" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Let them sleep" what={`Reviewers use previews during working hours. Scaling to zero outside them (or until the first request) cuts the compute bill to about ${AWAKE_SHARE * 100}%.`} accent={ACCENT} active={at(2)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.sleep} onChange={(e) => set({ sleep: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Scale to zero when idle
                </label>
                <p className="font-mono text-[11px] text-[var(--muted)]">${PER_HOUR} per environment-hour · ${s.cost.toLocaleString("en-US")} this month</p>
              </FlowStep>
              <FlowArrow label="data" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Seed data, don't copy production" what="A snapshot of production is the quickest realistic data, and it puts customer records into dozens of short-lived environments with weaker access controls. Seed scripts or a masked dataset give realism without the risk." accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.seeded} onChange={(e) => set({ seeded: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Seeded or masked data
                </label>
              </FlowStep>
              <FlowArrow label="credentials" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Give previews their own credentials" what="A preview with production keys can send real emails and charge real cards, from code that hasn't been reviewed yet. Previews get sandbox keys and their own callback URLs." accent={ACCENT} active={at(4)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.ownCreds} onChange={(e) => set({ ownCreds: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Sandbox keys for previews
                </label>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Environments are counted hour by hour here; pull request arrivals and lifetimes are a fixed pattern and the price is illustrative.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
