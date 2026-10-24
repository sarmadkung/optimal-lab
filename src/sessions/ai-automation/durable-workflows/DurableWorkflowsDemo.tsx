"use client";

import { useMemo, useState, type ReactNode } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { DEPLOYS, EMAILS, EMAIL_LABEL, FIRST, FIXED, POPULATION, SLOW_SCAN_DAY, USERS, runUser, simulate, type Design, type Impl } from "@/lib/durableWorkflows";

const ACCENT = "var(--auto)";
const IMPL_LABEL: Record<Impl, string> = { sleep: "sleep() in a worker", cron: "Hourly cron + status table", engine: "Workflow engine" };

// three sample trials to follow
const SAMPLES = [
  { id: "a", label: "Signs up day 1, connects next day", user: POPULATION.find((u) => u.signup >= 1 && u.connected !== null && u.connected - u.signup < 2)! },
  { id: "b", label: "Signs up day 3, never connects", user: POPULATION.find((u) => u.signup >= 3 && u.connected === null)! },
  { id: "c", label: "Signs up day 5, connects late", user: POPULATION.find((u) => u.signup >= 5 && u.connected !== null && u.connected - u.signup > 3)! },
];
const day = (t: number) => `day ${Math.floor(t)} ${String(Math.round((t % 1) * 24)).padStart(2, "0")}:00`;

export default function DurableWorkflowsDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [pick, setPick] = useState("b");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const r = useMemo(() => simulate(d), [d]);
  const sample = SAMPLES.find((s) => s.id === pick)!;
  const u = sample.user;
  const sent = runUser(u, d);
  const lost = sent.filter((x) => !x.sentAt.length);
  const twice = sent.filter((x) => x.sentAt.length > 1);

  const toggle = (k: "lock" | "deterministic", label: string, extra?: ReactNode) => (
    <>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={d[k]} onChange={(e) => set({ [k]: e.target.checked } as Partial<Design>)} className="h-4 w-4" style={{ accentColor: ACCENT }} />
        {label}
      </label>
      {extra}
    </>
  );

  const nodes: MapNode[] = [
    { id: "app", label: "Signup API", sub: `${USERS} trials over a week`, at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "flow", label: IMPL_LABEL[d.impl], sub: d.impl === "sleep" ? "state in memory" : d.impl === "cron" ? "state in columns" : "state in history", at: [50, 50], mobileAt: [75, 42], state: r.missed || r.doubled ? "bad" : "good" },
    { id: "events", label: "Product events", sub: "“data connected”", at: [14, 82], mobileAt: [25, 42], state: "active" },
    { id: "store", label: d.impl === "sleep" ? "Worker memory" : d.impl === "cron" ? "Status table" : "Timer + event store", sub: d.impl === "sleep" ? "gone at each deploy" : "survives deploys", at: [86, 18], mobileAt: [75, 12], state: d.impl === "sleep" ? "bad" : "good" },
    { id: "deploy", label: "Deploys", sub: `${DEPLOYS.length} in three weeks`, at: [86, 82], mobileAt: [75, 74], state: lost.length ? "bad" : "idle" },
    { id: "mail", label: "Email service", sub: `${r.delivered.toLocaleString("en-US")} sent`, at: [50, 92], mobileAt: [25, 74], state: "active" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("s", ["app", "flow", "mail"], { label: "welcome" })
    : stage === 1 ? hops("w", ["flow", "store"], { label: "wait 3 days or event" })
    : stage === 2 ? (lost.length ? hops("k", ["deploy", "flow"], { label: d.impl === "engine" ? "replay diverges" : "restart", tone: "bad" }) : hops("k2", ["deploy", "flow"], { label: "restart", tone: "good" }))
    : stage === 3 ? (twice.length ? hops("dup", ["store", "flow", "mail"], { label: "sent again", tone: "bad" }) : hops("t", ["store", "flow"], { label: "timer fires" }))
    : stage === 4 ? hops("m", ["flow", "mail"], { label: `${sent.length - lost.length} of ${sent.length} emails`, tone: lost.length || twice.length ? "bad" : "good" })
    : [];

  const captions = [
    `Step 1: trial ${u.id} starts at ${day(u.signup)}; the welcome email goes out.`,
    u.connected !== null && u.connected <= u.signup + 3 ? `Step 2: they connect their data at ${day(u.connected)}, inside 3 days, so no nudge.` : `Step 2: no connection within 3 days, so a nudge is due at ${day(u.signup + 3)}.`,
    d.impl === "sleep" ? `Step 3: the deploy at ${day(DEPLOYS.find((t) => t > u.signup) ?? 0)} restarts the worker, and the sleeping flow is gone.` : d.impl === "cron" ? "Step 3: the waits are rows in a table; the hourly job finds them after any deploy." : d.deterministic ? "Step 3: after each deploy the engine replays the flow's history and carries on." : "Step 3: after a deploy the engine replays history, but the code reads the real clock, so the replay disagrees with what happened and the run stops.",
    twice.length ? `Step 4: the slow scan at ${day(SLOW_SCAN_DAY)} hasn't marked its rows when the next one starts, so “${EMAIL_LABEL[twice[0].email]}” goes twice.` : d.impl === "cron" ? "Step 4: each email goes out at the next hourly scan, up to an hour late." : "Step 4: each timer fires on time.",
    `Step 5: ${sent.length - lost.length} of ${sent.length} emails sent${lost.length ? `; lost: ${lost.map((x) => EMAIL_LABEL[x.email]).join(", ")}` : ""}${twice.length ? "; one sent twice" : ""}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${r.perfect} of ${USERS} trials got every email exactly once · ${r.missed} emails lost · ${r.doubled} sent twice · ${r.avgLateMin} min late on average.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Automation · interactive"
        title="Durable workflows"
        blurb="700 people start a 14-day trial over a week. Each trial is a flow that waits: up to 3 days for them to connect their data, then until day 12, then day 14. Over three weeks the team deploys four times and one database scan runs slow. Choose where the waiting lives and count the emails that arrive, go missing, or arrive twice."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Signup API, the trial flow, where its waits are stored, product events, deploys and the email service"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "app", to: "flow", label: "start" },
                  { from: "events", to: "flow", label: "event" },
                  { from: "flow", to: "store", label: "wait" },
                  { from: "deploy", to: "flow", label: "restart" },
                  { from: "flow", to: "mail", label: "send" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <Emails d={d} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices label="Follow" accent={ACCENT} value={pick} onChange={setPick} options={SAMPLES.map((s) => ({ id: s.id, label: s.label }))} />
              </div>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  As first built
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Fixed
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Waiting…">
                Follow this trial
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="One flow per trial, from signup to day 14" what="Writing the whole trial as one flow (send, wait, check, send) is the clearest code. The question is where it lives while it waits for days." accent={ACCENT} active={at(0)}>
                <p className="font-mono text-[11px]">{EMAILS.map((e) => EMAIL_LABEL[e]).join(" → ")}</p>
              </FlowStep>
              <FlowArrow label="wait" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Wait for an event or a timer, whichever comes first" what="“Did they connect within 3 days?” is a race between an event and a timer. Both have to be recorded somewhere, and the event may arrive while nothing is running." accent={ACCENT} active={at(1)}>
                <p className="text-xs">
                  Trial {u.id}: {u.connected === null ? "never connects" : `connects ${Math.round((u.connected - u.signup) * 10) / 10} days in`}.
                </p>
              </FlowStep>
              <FlowArrow label="days pass" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Keep the waiting outside the process" what="A sleep in a worker dies at the next deploy. A cron job over a status table survives, at the price of an hour's lateness and state spread across columns. A workflow engine stores timers and events and resumes the code where it stopped." accent={ACCENT} active={at(2)}>
                <Choices<Impl> label="Where the waiting lives" accent={ACCENT} value={d.impl} onChange={(v) => set({ impl: v })} options={[{ id: "sleep", label: "sleep() in a worker" }, { id: "cron", label: "Cron + status table" }, { id: "engine", label: "Workflow engine" }]} />
                <p className="mt-2 text-[11px] text-[var(--faint)]">Deploys at days {DEPLOYS.join(", ")}.</p>
              </FlowStep>
              <FlowArrow label="resume" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Make resuming safe" what="Each approach has its own trap. Overlapping cron scans send the same rows twice unless each row is claimed first. An engine resumes by replaying history, so workflow code must not read the real clock or random numbers; use the engine's own." accent={ACCENT} active={at(3)}>
                {toggle("lock", "Cron: claim rows before sending (no overlapping scans)", d.impl !== "cron" ? <p className="text-[11px] text-[var(--faint)]">Only matters for cron.</p> : null)}
                {toggle("deterministic", "Engine: use the engine's clock, not Date.now()", d.impl !== "engine" ? <p className="text-[11px] text-[var(--faint)]">Only matters for the engine.</p> : null)}
              </FlowStep>
              <FlowArrow label="emails" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Count every email for every trial" what="Lost emails are silent; duplicates get noticed by customers. Check both, and how late the ones that went out were." accent={ACCENT} active={at(4)}>
                <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-xs">
                  <dt>Trials with every email, once</dt>
                  <dd className="text-right font-mono" style={{ color: r.perfect === USERS ? "var(--good)" : "var(--bad)" }}>{r.perfect} / {USERS}</dd>
                  <dt>Emails lost</dt>
                  <dd className="text-right font-mono" style={{ color: r.missed ? "var(--bad)" : "var(--good)" }}>{r.missed}</dd>
                  <dt>Sent twice</dt>
                  <dd className="text-right font-mono" style={{ color: r.doubled ? "var(--bad)" : "var(--good)" }}>{r.doubled}</dd>
                  <dt>Average lateness</dt>
                  <dd className="text-right font-mono">{r.avgLateMin} min</dd>
                  {d.impl === "engine" && (
                    <>
                      <dt>Runs stopped by a replay mismatch</dt>
                      <dd className="text-right font-mono" style={{ color: r.stuck ? "var(--bad)" : "var(--good)" }}>{r.stuck}</dd>
                    </>
                  )}
                </dl>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Signups, connections and deploys are seeded. All three ways of running the flow, and every email, run here.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Emails({ d }: { d: Design }) {
  const r = useMemo(() => simulate(d), [d]);
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Each trial email: due, sent, lost and doubled">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">trial emails, all {USERS} trials</p>
      <ul className="mt-3 space-y-2">
        {EMAILS.map((e) => {
          const x = r.byEmail[e];
          return (
            <li key={e} className="text-xs">
              <div className="flex flex-wrap justify-between gap-2">
                <span>{EMAIL_LABEL[e]}</span>
                <span className="font-mono text-[11px]" style={{ color: x.missed || x.doubled ? "var(--bad)" : "var(--good)" }}>
                  {x.sent}/{x.due}
                  {x.doubled ? ` · ${x.doubled} twice` : ""}
                </span>
              </div>
              <span className="mt-1 block h-1.5 w-full rounded-full bg-[var(--track)]">
                <span className="block h-full rounded-full" style={{ width: `${(x.sent / Math.max(1, x.due)) * 100}%`, background: x.missed ? "var(--c2)" : "var(--good)" }} />
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
