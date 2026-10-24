"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { BUMP_DAYS, CHANGES, FIRST, FIXED, PKGS, all, evaluate, type ChangeId, type Design, type Layout } from "@/lib/repoLayout";

const ACCENT = "var(--ops)";
const SERVICES = ["web", "api", "billing"];

export default function RepoLayoutDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [cid, setCid] = useState<ChangeId>("lib");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const r = evaluate(cid, d);
  const rows = all(d);
  const mono = d.layout === "mono";
  const hit = (s: string) => r.affected.includes(s);

  const nodes: MapNode[] = [
    { id: "dev", label: "Developer", sub: r.change.title.split(" ").slice(0, 3).join(" "), at: [14, 18], mobileAt: [25, 10], state: "active" },
    { id: "repo", label: mono ? "Monorepo" : `${PKGS.length} repos`, sub: `${r.prs} PR${r.prs === 1 ? "" : "s"} in ${r.repos} repo${r.repos === 1 ? "" : "s"}`, at: [50, 18], mobileAt: [75, 10], state: r.prs > 1 ? "wait" : "active" },
    { id: "ci", label: "CI", sub: `${r.built.length} packages · ${r.ciMinutes} min`, at: [86, 18], mobileAt: [50, 38], state: mono && !d.affected ? "wait" : "active" },
    ...SERVICES.map((s, i) => ({
      id: s,
      label: s,
      sub: !hit(s) ? "not affected" : r.rolloutDays && !r.change.touches.includes(s) ? `on it after ${d.renovate ? 1 : BUMP_DAYS[PKGS.find((p) => p.id === s)!.team]} days` : r.errorMinutes && s === "web" ? `${r.errorMinutes} min of errors` : "same day",
      at: ([[86, 82], [50, 82], [14, 82]] as [number, number][])[i],
      mobileAt: ([[20, 68], [80, 68], [50, 92]] as [number, number][])[i],
      state: (!hit(s) ? "dim" : r.errorMinutes && s === "web" ? "bad" : r.rolloutDays > 7 && !r.change.touches.includes(s) ? "wait" : "good") as MapNode["state"],
    })),
  ];

  const affectedServices = SERVICES.filter(hit);
  const packets: Packet[] =
    stage === 0 ? hops("p", ["dev", "repo"], { label: `${r.prs} PR${r.prs === 1 ? "" : "s"}` })
    : stage === 1 ? hops("b", ["repo", "ci"], { label: `${r.ciMinutes} min` })
    : stage === 2 ? affectedServices.flatMap((s) => hops(`t${s}`, ["ci", s], { label: "build" }))
    : stage === 3 ? affectedServices.flatMap((s) => hops(`r${s}`, ["ci", s], { label: r.rolloutDays && !r.change.touches.includes(s) ? (d.renovate ? "bot bump" : "manual bump") : "same commit", tone: r.rolloutDays > 7 && !r.change.touches.includes(s) ? "bad" : undefined }))
    : stage === 4 ? (r.change.breaking ? [...hops("da", ["ci", "api"], { label: "deploy 1" }), ...hops("dw", ["ci", "web"], { label: "deploy 2", start: 1.2, tone: r.errorMinutes ? "bad" : "good" })] : affectedServices.flatMap((s) => hops(`d${s}`, ["ci", s], { label: "deploy", tone: "good" })))
    : [];

  const captions = [
    `Step 1: ${mono ? "everything lives in one repository" : "each package has its own repository and versions"}.`,
    `Step 2: “${r.change.title}” takes ${r.prs} pull request${r.prs === 1 ? "" : "s"} in ${r.repos} repositor${r.repos === 1 ? "y" : "ies"}.`,
    `Step 3: CI builds ${r.built.join(", ")}: ${r.ciMinutes} minutes.`,
    r.rolloutDays ? `Step 4: ${r.drift}.` : `Step 4: every affected service gets the change from the same commit.`,
    r.change.breaking ? (r.errorMinutes ? `Step 5: ${r.notes.at(-1)}: ${r.errorMinutes} minutes of errors.` : `Step 5: ${r.notes.at(-1)}; no errors.`) : "Step 5: each affected service deploys on its own.",
  ];
  const caption = stage !== null ? captions[stage] : `${r.change.title}: ${r.prs} PR${r.prs === 1 ? "" : "s"}, ${r.ciMinutes} CI minutes, ${r.rolloutDays ? `${r.rolloutDays} days to reach every service` : "same day everywhere"}${r.errorMinutes ? `, ${r.errorMinutes} minutes of errors` : ""}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="Monorepo vs polyrepo"
        blurb="Three services (web, api, billing) share three libraries. Keep them in one repository or one repository each, then make three ordinary changes: fix a shared library, change one app, rename an API field. The dependency graph decides what each change touches."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="A developer, the repository or repositories, CI, and the web, api and billing services"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "dev", to: "repo", label: "PR" },
                  { from: "repo", to: "ci", label: "build" },
                  ...SERVICES.map((s) => ({ from: "ci", to: s, label: "deploy", dim: !hit(s) })),
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.8}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Three changes compared">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">three changes · {mono ? "monorepo" : "polyrepo"}</p>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[20rem] text-left text-[11px]">
                    <thead>
                      <tr className="text-[var(--faint)]">
                        <th className="py-0.5 pr-2 font-normal">change</th>
                        <th className="py-0.5 pr-2 font-normal">PRs</th>
                        <th className="py-0.5 pr-2 font-normal">CI min</th>
                        <th className="py-0.5 pr-2 font-normal">everywhere</th>
                        <th className="py-0.5 font-normal">errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((x) => (
                        <tr key={x.change.id} className="border-t border-[var(--line)]">
                          <td className="py-1 pr-2">{x.change.title}</td>
                          <td className="py-1 pr-2 font-mono">{x.prs}</td>
                          <td className="py-1 pr-2 font-mono">{x.ciMinutes}</td>
                          <td className="py-1 pr-2 font-mono" style={{ color: x.rolloutDays > 7 ? "var(--bad)" : "var(--text)" }}>
                            {x.rolloutDays ? `${x.rolloutDays} d` : "same day"}
                          </td>
                          <td className="py-1 font-mono" style={{ color: x.errorMinutes ? "var(--bad)" : "var(--good)" }}>
                            {x.errorMinutes ? `${x.errorMinutes} min` : "none"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-[11px] text-[var(--muted)]">
                  {mono
                    ? "What a monorepo costs instead: one large clone, a build tool that understands the graph, and everyone can read everything (CODEOWNERS controls approvals, not access)."
                    : "What a polyrepo buys: each team owns its repo, its CI and its access rules, and a small clone. It pays with versions to publish and bump, and six copies of CI and lint config."}
                </p>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices<ChangeId> label="Change" accent={ACCENT} value={cid} onChange={setCid} options={CHANGES.map((c) => ({ id: c.id, label: c.title }))} />
              </div>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Polyrepo, by hand
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Monorepo with a build graph
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Shipping…">
                Ship this change
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Decide where the code lives" what="One repository for everything, or one per service and library. Neither is free: the costs just land in different places." accent={ACCENT} active={at(0)}>
                <Choices<Layout> label="Layout" accent={ACCENT} value={d.layout} onChange={(x) => set({ layout: x })} options={[{ id: "poly", label: "One repo per package" }, { id: "mono", label: "One repo" }]} />
                <pre className="mt-2 overflow-x-auto rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] leading-relaxed">
                  {mono ? "repo/\n  apps/web  apps/api  apps/billing\n  libs/auth  libs/ui  libs/api-types" : "web/  api/  billing/          (services)\nauth/  ui/  api-types/        (published as versions)"}
                </pre>
              </FlowStep>
              <FlowArrow label="pull requests" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Make the change" what="In one repository, a change to a library and to every caller is one pull request, reviewed and tested together. Across repositories, the library is released first and each consumer is changed separately." accent={ACCENT} active={at(1)}>
                <p className="text-xs">
                  {r.prs} pull request{r.prs === 1 ? "" : "s"} · affects {r.affected.join(", ")}
                </p>
              </FlowStep>
              <FlowArrow label="build" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Build only what the change affects" what="A monorepo's CI has to be told what depends on what, or it builds everything on every change. Build tools such as Nx, Turborepo and Bazel walk the graph and rebuild only the affected packages." accent={ACCENT} active={at(2)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.affected} disabled={!mono} onChange={(e) => set({ affected: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Build affected packages only
                </label>
                <p className="font-mono text-[11px] text-[var(--muted)]">
                  built: {r.built.join(", ")} · {r.ciMinutes} min
                </p>
              </FlowStep>
              <FlowArrow label="new version" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Get every service onto the fix" what="With separate repositories, each team bumps a library when they get to it, so production runs several versions at once. A bot such as Renovate or Dependabot opens the bump pull requests the day a version is published." accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.renovate} disabled={mono} onChange={(e) => set({ renovate: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Automated bump pull requests
                </label>
                <p className="text-xs">{r.drift}</p>
              </FlowStep>
              <FlowArrow label="deploys" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Deploy in a safe order" what="An atomic commit isn't an atomic deploy: services still roll out one at a time. A breaking change between services needs expand and contract, in either layout: add the new field, move callers over, remove the old one." accent={ACCENT} active={at(4)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.expand} onChange={(e) => set({ expand: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Expand and contract breaking API changes
                </label>
                <ul className="mt-1 space-y-0.5 text-[11px] text-[var(--muted)]">
                  {r.notes.map((n) => (
                    <li key={n}>· {n}</li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The dependency graph and affected sets run here; build minutes and how long teams take to bump are illustrative.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
