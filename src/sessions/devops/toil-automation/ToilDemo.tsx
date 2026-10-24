"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { FIRST, FIXED, QUARTER_WEEKS, SWITCH_MIN, TASKS, TEAM_HOURS, TOIL_CAP, hours, week, type Choice, type Design, type TaskId } from "@/lib/toilAutomation";

const ACCENT = "var(--ops)";

function TaskChoice({ id, d, set }: { id: TaskId; d: Design; set: (p: Partial<Design>) => void }) {
  const t = TASKS.find((x) => x.id === id)!;
  const opts: { id: Choice; label: string }[] = [{ id: "manual", label: "By hand" }, ...(t.automate ? [{ id: "automate" as Choice, label: "Automate" }] : []), ...(t.eliminate ? [{ id: "eliminate" as Choice, label: "Fix the cause" }] : [])];
  const r = week(d).rows.find((x) => x.t.id === id)!;
  return (
    <div className="mt-2">
      <Choices<Choice> label={`${t.title} · ${t.perWeek}× a week, ${t.minutes} min`} accent={ACCENT} value={d[id]} onChange={(x) => set({ [id]: x } as Partial<Design>)} options={opts} />
      <p className="mt-1 text-[11px] text-[var(--muted)]">
        {r.choice === "manual" ? `${hours(r.before)} h a week` : `${r.choice === "automate" ? t.automate!.how : t.eliminate!.how}: ${r.build} h to build, saves ${hours(r.saved)} h a week, pays back in ${r.payback < 1 ? "under a week" : `${Math.ceil(r.payback)} weeks`}`}
      </p>
      {r.impact && <p className="text-[11px] text-[var(--bad)]">{r.impact}</p>}
    </div>
  );
}

export default function ToilDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const w = week(d);
  const automated = w.rows.filter((r) => r.choice !== "manual").length;
  const over = w.share > TOIL_CAP;

  const nodes: MapNode[] = [
    { id: "devs", label: "Developers", sub: `${Math.round(w.interrupts)} asks a week`, at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "queue", label: "Slack + tickets", sub: "interrupts", at: [50, 18], mobileAt: [75, 12], state: w.interrupts > 40 ? "bad" : "active" },
    { id: "eng", label: "Platform team", sub: `${hours(w.toil)} of ${TEAM_HOURS} h on toil`, at: [86, 18], mobileAt: [75, 45], state: over ? "bad" : "good" },
    { id: "auto", label: "Automation", sub: `${automated} of ${TASKS.length} tasks`, at: [86, 82], mobileAt: [75, 80], state: automated ? "good" : "dim" },
    { id: "systems", label: "Production", sub: "deploys, disks, certs", at: [50, 82], mobileAt: [25, 80], state: "active" },
    { id: "projects", label: "Engineering work", sub: `${hours(TEAM_HOURS - w.toil)} h a week left`, at: [14, 82], mobileAt: [25, 45], state: over ? "wait" : "good" },
  ];

  const route = (id: TaskId, i: number): Packet[] => {
    const r = w.rows.find((x) => x.t.id === id)!;
    return r.choice === "manual" ? hops(`m${i}`, ["devs", "queue", "eng", "systems"], { label: "by hand" }) : hops(`a${i}`, ["devs", "auto", "systems"], { label: r.choice === "eliminate" ? "gone" : "automated", tone: "good" });
  };
  const packets: Packet[] =
    stage === 0 ? hops("c", ["devs", "queue", "eng"], { label: `${Math.round(w.interrupts)}/wk` })
    : stage === 1 ? route("deploy", 1)
    : stage === 2 ? [...route("restart", 2), ...route("disk", 3)]
    : stage === 3 ? [...route("access", 4), ...route("envs", 5)]
    : stage === 4 ? hops("p", ["eng", "projects"], { label: `${hours(TEAM_HOURS - w.toil)} h`, tone: over ? "bad" : "good" })
    : [];

  const captions = [
    `Step 1: ${Math.round(w.interrupts)} interruptions a week${d.switching ? `, each costing ${SWITCH_MIN} extra minutes to get back into real work` : ""}.`,
    `Step 2: deploys are ${d.deploy === "manual" ? "still run by hand" : "a pipeline now"}.`,
    `Step 3: the stuck worker is ${d.restart === "manual" ? "restarted by hand" : d.restart === "automate" ? "restarted by a probe" : "fixed"}; full disks are ${d.disk === "manual" ? "cleared by hand" : d.disk === "automate" ? "rotated automatically" : "gone"}.`,
    `Step 4: access requests, status questions and new services ${[d.access, d.status, d.envs].filter((x) => x !== "manual").length} of 3 handled by self-service.`,
    `Step 5: toil is ${Math.round(w.share * 100)}% of the team's week${over ? ", over the 50% cap" : ""}.`,
  ];
  const caption = stage !== null ? captions[stage] : `Toil ${hours(w.toil)} h a week (${Math.round(w.share * 100)}%) · ${w.build} h of building · net ${w.quarterNet >= 0 ? "+" : ""}${Math.round(w.quarterNet)} h over a quarter.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="Toil and automation"
        blurb="Toil is the manual, repetitive work that grows with the service and leaves nothing behind: deploys by hand, restarts, access requests, “is it down?”. Google's SRE teams cap it at half their time. A two-person platform team's week, and what each fix costs to build and gives back."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Developers' requests reach the platform team through Slack and tickets, or go straight to automation; whatever time is left goes to engineering work"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "devs", to: "queue", label: "asks" },
                  { from: "queue", to: "eng", label: "interrupts" },
                  { from: "eng", to: "systems", label: "by hand" },
                  { from: "devs", to: "auto", label: "self-service", dim: !automated },
                  { from: "auto", to: "systems", label: "does it" },
                  { from: "eng", to: "projects", label: "time left" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="The week">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">the week · {Math.round(w.share * 100)}% toil</p>
                <div className="relative mt-2 h-4 w-full overflow-hidden rounded bg-[var(--inset)]" aria-hidden>
                  <div className="h-full" style={{ width: `${Math.min(100, w.share * 100)}%`, background: over ? "var(--bad)" : ACCENT }} />
                  <div className="absolute inset-y-0 border-l-2 border-dashed border-[var(--text)]" style={{ left: `${TOIL_CAP * 100}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-[var(--faint)]">dashed line: the 50% cap</p>
                <ul className="mt-2 space-y-0.5 text-[11px]">
                  {w.rows.map((r) => (
                    <li key={r.t.id} className="flex justify-between gap-2">
                      <span className="text-[var(--muted)]">{r.t.title}</span>
                      <span className="shrink-0 font-mono" style={{ color: r.after < r.before ? "var(--good)" : "var(--text)" }}>
                        {hours(r.before)} → {hours(r.after)} h
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 font-mono text-xs">
                  {w.build} h to build · net {w.quarterNet >= 0 ? "+" : ""}
                  {Math.round(w.quarterNet)} h after {QUARTER_WEEKS} weeks
                </p>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Everything by hand
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Automated and fixed
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Running the week…">
                Run the week
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Count it honestly" what="A five-minute question isn't five minutes: getting back into the work it interrupted takes longer than answering it. Count the interruptions, not just the task time." accent={ACCENT} active={at(0)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.switching} onChange={(e) => set({ switching: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Include {SWITCH_MIN} min of context switching per interruption
                </label>
              </FlowStep>
              <FlowArrow label="biggest first" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Remove the biggest first" what="Rank by hours a week, not by how annoying a task is. Manual deploys usually top the list, and automating them also makes them safer." accent={ACCENT} active={at(1)}>
                <TaskChoice id="deploy" d={d} set={set} />
              </FlowStep>
              <FlowArrow label="recurring problems" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Fix causes, not just symptoms" what="Automating a restart makes the toil vanish and keeps the bug. Fixing the leak costs more once and removes the problem for users too." accent={ACCENT} active={at(2)}>
                <TaskChoice id="restart" d={d} set={set} />
                <TaskChoice id="disk" d={d} set={set} />
                <TaskChoice id="cert" d={d} set={set} />
              </FlowStep>
              <FlowArrow label="requests" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Let people serve themselves" what="Requests that need a human only to click “approve” can be a form; questions that need a human only to look at a graph can be a status page; new services can come from a template." accent={ACCENT} active={at(3)}>
                <TaskChoice id="access" d={d} set={set} />
                <TaskChoice id="status" d={d} set={set} />
                <TaskChoice id="envs" d={d} set={set} />
              </FlowStep>
              <FlowArrow label="the week" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Keep toil under half" what="Payback is build hours divided by hours saved a week. Most fixes here pay back within a quarter; a rare task like certificate renewal pays back slowly in hours, and fast the first time a forgotten renewal would have caused an outage." accent={ACCENT} active={at(4)}>
                <p className="font-mono text-xs" style={{ color: over ? "var(--bad)" : "var(--good)" }}>
                  {hours(w.toil)} of {TEAM_HOURS} h a week · {Math.round(w.share * 100)}%
                </p>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Hours, payback and the quarter&apos;s net are computed here; the task counts, minutes and build estimates are illustrative.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
