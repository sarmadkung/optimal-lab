"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { FIRST, FIXED, INCIDENTS, respond, runbookText, scorecard, type Design, type IncidentId } from "@/lib/runbooks";

const ACCENT = "var(--ops)";

export default function RunbooksDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [iid, setIid] = useState<IncidentId>("disk");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const r = respond(iid, d);
  const card = scorecard(d);
  const max = Math.max(...card.map((c) => c.total), 60);

  const nodes: MapNode[] = [
    { id: "pager", label: "Page at 03:04", sub: r.inc.alert.split(":")[0], at: [14, 18], mobileAt: [25, 12], state: "bad" },
    { id: "runbook", label: "Runbook", sub: d.linked ? "linked from the alert" : "somewhere in the wiki", at: [50, 18], mobileAt: [75, 12], state: d.current ? "good" : "wait" },
    { id: "eng", label: "On-call (new)", sub: `${r.total} min to mitigate`, at: [86, 18], mobileAt: [75, 45], state: r.total <= 20 ? "good" : "bad" },
    { id: "sys", label: "Production", sub: r.harm ? "made worse first" : "fixed", at: [86, 82], mobileAt: [75, 80], state: r.harm ? "bad" : "good" },
    { id: "senior", label: "Senior engineer", sub: r.woke ? "woken up" : "asleep", at: [50, 82], mobileAt: [25, 80], state: r.woke ? "bad" : "dim" },
    { id: "repo", label: "Runbook repo", sub: d.current ? "updated after each use" : "last edit 14 months ago", at: [14, 82], mobileAt: [25, 45], state: d.current ? "good" : "wait" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("f", d.linked ? ["pager", "runbook", "eng"] : ["pager", "eng"], { label: d.linked ? "link" : "search…", tone: d.linked ? "good" : "bad" })
    : stage === 1 ? hops("c", ["eng", "sys"], { label: d.diagnose ? "check" : "guess", tone: d.diagnose ? "good" : "bad" })
    : stage === 2 ? (d.current ? hops("x", ["eng", "sys"], { label: d.automated ? "script" : "commands" }) : hops("x", ["eng", "senior"], { label: "commands fail", tone: "bad" }))
    : stage === 3 ? hops("v", ["sys", "eng"], { label: d.verify ? "verified" : "looks quiet", tone: d.verify ? "good" : "bad" })
    : stage === 4 ? hops("u", ["eng", "repo"], { label: d.current ? "update" : "nothing", tone: d.current ? "good" : undefined })
    : [];

  const phase = (name: string) => r.phases.find((p) => p.name === name);
  const captions = [
    `Step 1: ${phase("Find the runbook")!.note} (${phase("Find the runbook")!.minutes} min).`,
    `Step 2: ${phase("Diagnose")!.note}.`,
    `Step 3: ${phase("Fix")!.note} (${phase("Fix")!.minutes} min).`,
    `Step 4: ${phase("Verify")!.note}.`,
    d.current ? `Step 5: the runbook is updated with what was learned; mitigated after ${r.total} min.` : `Step 5: nobody updates the page; mitigated after ${r.total} min.`,
  ];
  const caption = stage !== null ? captions[stage] : `${r.inc.title}: mitigated after ${r.total} minutes${r.woke ? ", with a second engineer woken" : ""}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="Runbooks"
        blurb="It's 3 a.m. and the engineer on call joined last month. A runbook is the senior engineer's knowledge, written down before it's needed: where to look, what it means, what to run, how to know it worked. Three real pages, and what each part of a runbook is worth in minutes."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="A page reaches the on-call engineer, who follows a runbook to check and fix production, may wake a senior engineer, and updates the runbook afterwards"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "pager", to: "runbook", label: "link", dim: !d.linked },
                  { from: "runbook", to: "eng", label: "steps" },
                  { from: "eng", to: "sys", label: "check, fix" },
                  { from: "eng", to: "senior", label: "escalate", dim: !r.woke },
                  { from: "eng", to: "repo", label: "update", dim: !d.current },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Time to mitigate">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">minutes to mitigate</p>
                <ul className="mt-2 space-y-2">
                  {card.map((c) => (
                    <li key={c.i.id}>
                      <p className="flex justify-between text-xs">
                        <span>{c.i.title}</span>
                        <span className="font-mono" style={{ color: c.total <= 20 ? "var(--good)" : "var(--bad)" }}>
                          {c.total} min
                        </span>
                      </p>
                      <div className="mt-1 flex h-3 w-full overflow-hidden rounded-sm" aria-hidden>
                        {c.phases.map((p, i) => (
                          <span key={i} title={`${p.name}: ${p.minutes} min`} style={{ width: `${(p.minutes / max) * 100}%`, background: p.bad ? "var(--bad)" : i % 2 ? "var(--c1)" : ACCENT, opacity: p.bad ? 0.85 : 0.7 }} />
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
                <ul className="mt-3 space-y-0.5 text-[11px]">
                  {r.phases.map((p, i) => (
                    <li key={i} style={{ color: p.bad ? "var(--bad)" : "var(--muted)" }}>
                      <span className="font-mono">{p.minutes} min</span> {p.name}: {p.note}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices<IncidentId> label="The page" accent={ACCENT} value={iid} onChange={setIid} options={INCIDENTS.map((x) => ({ id: x.id, label: x.title }))} />
              </div>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  An old wiki page
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  A runbook that works
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Responding…">
                Answer the page
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Link the runbook from the alert" what="The first minutes go on finding the right page. Put its URL in the alert itself, so the page arrives with instructions." accent={ACCENT} active={at(0)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.linked} onChange={(e) => set({ linked: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  runbook_url annotation on the alert
                </label>
              </FlowStep>
              <FlowArrow label="what's wrong" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Check before you act" what="Most alerts have an obvious fix that's wrong. A runbook starts with commands to run and what their output means, so the responder fixes the cause and not the symptom." accent={ACCENT} active={at(1)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.diagnose} onChange={(e) => set({ diagnose: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  A “check first” section
                </label>
                <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-words rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] leading-relaxed">{runbookText(iid, d).join("\n")}</pre>
              </FlowStep>
              <FlowArrow label="the fix" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Script the safe steps" what="At 3 a.m. people mistype. A reviewed script that's safe to run twice turns a page of commands into one, and is the first step toward the alert fixing itself." accent={ACCENT} active={at(2)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.automated} onChange={(e) => set({ automated: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  mitigate.sh instead of typed commands
                </label>
              </FlowStep>
              <FlowArrow label="did it work" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Say how to know it worked" what="An alert going quiet isn't proof. The runbook names the signal that shows recovery, and what to do if it doesn't come: roll back, then escalate." accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.verify} onChange={(e) => set({ verify: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  A “verify” section with a rollback
                </label>
              </FlowStep>
              <FlowArrow label="afterwards" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Keep it current" what="Hosts get renamed, namespaces move, tools change. Runbooks live next to the code, get updated after every use, and get run in drills, or they fail exactly when needed." accent={ACCENT} active={at(4)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.current} onChange={(e) => set({ current: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Reviewed after each use and in drills
                </label>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The response is added up phase by phase here; the phase times are illustrative.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
