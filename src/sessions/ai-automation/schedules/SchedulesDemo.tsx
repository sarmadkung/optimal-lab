"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, PlaybackControls, Slider, usePlayback } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type Packet } from "@/components/system/SystemMap";
import { CRON, HOURS, POLICIES, label, simulate, totals, type Policy } from "@/lib/schedules";

const ACCENT = "var(--auto)";

export default function SchedulesDemo() {
  const [policy, setPolicy] = useState<Policy>("skip");
  const [downFrom, setDownFrom] = useState(3);
  const [downFor, setDownFor] = useState(4);
  const frames = simulate(downFrom, downFor, policy);
  const playback = usePlayback(frames.length, 1000);
  const f = frames[playback.i];
  const sum = totals(frames.slice(0, playback.i + 1));
  const late = f.runs.filter((r) => r.late).length;

  const packets: Packet[] = f.up
    ? [
        ...hops(`fire-${f.hour}`, ["clock", "runner", "flow", "slack"], { label: f.runs.length > 1 ? `${f.runs.length} runs` : "run" }),
      ]
    : [{ id: `miss-${f.hour}`, from: "clock", to: "runner", label: "missed", tone: "bad" }];

  const reset = () => playback.reset();

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI automation · interactive"
        title="Run it on a schedule"
        blurb={`A daily-digest workflow runs on cron “${CRON}”: the top of every hour. The clock keeps firing when the runner is down. Choose what happens to the runs it missed.`}
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-4">
              <SystemMap
                title="The scheduler clock, the runner, the workflow and Slack"
                accent={ACCENT}
                chrome="split"
                nodes={[
                  { id: "clock", label: "Scheduler", sub: CRON, at: [12, 50], mobileAt: [26, 14], state: "active" },
                  { id: "runner", label: "Runner", sub: f.up ? "up" : "down", at: [38, 50], mobileAt: [74, 14], state: f.up ? (late ? "wait" : "good") : "bad" },
                  { id: "flow", label: "Workflow", sub: "summarize inbox", at: [64, 50], mobileAt: [26, 82], state: f.up ? "active" : "dim" },
                  { id: "slack", label: "Slack", sub: `${sum.onTime + sum.late} digests`, at: [89, 50], mobileAt: [74, 82], state: f.up ? "active" : "dim" },
                ]}
                links={[
                  { from: "clock", to: "runner", label: f.up ? label(f.hour) : "missed" },
                  { from: "runner", to: "flow", label: "start", dim: !f.up },
                  { from: "flow", to: "slack", label: "post", dim: !f.up },
                ]}
                packets={packets}
                aspect={2.8}
                mobileAspect={1.3}
              />
              <Timeline frames={frames} at={playback.i} downFrom={downFrom} downFor={downFor} />
            </div>
          }
          panel={
            <SystemMapPanel caption={f.event}>
              <Choices
                label="Missed runs"
                accent={ACCENT}
                value={policy}
                onChange={(p) => {
                  setPolicy(p);
                  reset();
                }}
                options={POLICIES.map((p) => ({ id: p.id, label: p.label }))}
              />
              <p className="w-full text-xs text-[var(--faint)]">{POLICIES.find((p) => p.id === policy)!.real}</p>
              <div className="grid w-full gap-3 sm:grid-cols-2">
                <Slider label="Runner goes down at" value={downFrom} min={1} max={8} step={1} format={(v) => label(v)} accent={ACCENT} onChange={(v) => { setDownFrom(v); reset(); }} />
                <Slider label="Down for" value={downFor} min={1} max={4} step={1} format={(v) => `${v} h`} accent={ACCENT} onChange={(v) => { setDownFor(v); reset(); }} />
              </div>
              <PlaybackControls playback={playback} accent={ACCENT} nextLabel="Next hour" status={label(f.hour)} />
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="The clock fires" what={`“${CRON}” means minute 0 of every hour. The scheduler fires whether or not anything can run.`} accent={ACCENT} active={f.up && late === 0}>
                <p className="font-mono text-sm">{label(f.hour)} · slot {f.hour + 1} of {HOURS}</p>
              </FlowStep>
              <FlowArrow label="a job for this slot" accent={ACCENT} />

              <FlowStep n={2} title="A runner picks up the job" what="A worker process, a CI runner, a pod. If none is up, the job has nowhere to go." accent={ACCENT} active={!f.up}>
                <p className="text-sm" style={{ color: f.up ? "var(--good)" : "var(--bad)" }}>
                  {f.up ? "Runner is up." : "Runner is down. This slot is missed."}
                </p>
              </FlowStep>
              <FlowArrow label="missed slots pile up" accent={ACCENT} />

              <FlowStep n={3} title="On recovery, apply the policy" what="Skip loses data. One catch-up run is usually right for a digest. Backfilling every slot fires a burst of runs at once, which can hit rate limits or spam a channel." accent={ACCENT} active={late > 0 || (f.up && f.event.includes("dropped"))}>
                <p className="text-sm">
                  {POLICIES.find((p) => p.id === policy)!.label}: {late ? `${late} late ${late === 1 ? "run" : "runs"} now.` : "nothing to catch up this hour."}
                </p>
              </FlowStep>
              <FlowArrow label="run the workflow" accent={ACCENT} />

              <FlowStep n={4} title="Make each run idempotent" what="A late run must cover its own time window (an idempotency key like the slot time), so a retry or catch-up never posts the same digest twice." accent={ACCENT}>
                <p className="font-mono text-xs">{f.runs.map((r) => `digest:${label(r.slot)}`).join(" · ") || "—"}</p>
              </FlowStep>
              <FlowArrow label="results" accent={ACCENT} />

              <FlowStep n={5} title="Watch the misses" what="Alert when a scheduled run doesn't happen. A silent cron is the classic failure: nobody notices until the data is days old." accent={ACCENT} active={playback.atEnd}>
                <p className="text-sm">
                  {sum.onTime} on time · {sum.late} late · <span style={{ color: f.missed.length ? "var(--bad)" : undefined }}>{f.missed.length} missed for good</span> · busiest hour {sum.burst} runs
                </p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Timeline({ frames, at, downFrom, downFor }: { frames: ReturnType<typeof simulate>; at: number; downFrom: number; downFor: number }) {
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Every hourly slot and what ran in it">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">Today</p>
      <ol className="mt-3 grid grid-cols-6 gap-1.5 sm:grid-cols-12">
        {frames.map((fr) => {
          const down = fr.hour >= downFrom && fr.hour < downFrom + downFor;
          const seen = fr.hour <= at;
          const lost = seen && frames[at].missed.includes(fr.hour);
          const waiting = seen && frames[at].pending.includes(fr.hour);
          const folded = seen && frames[at].covered.includes(fr.hour) && !fr.runs.length;
          return (
            <li
              key={fr.hour}
              className="flex min-h-16 flex-col items-center justify-between rounded-md border px-0.5 py-1"
              style={{
                borderColor: fr.hour === at ? ACCENT : "var(--line)",
                background: down ? "color-mix(in srgb, var(--bad) 10%, transparent)" : "transparent",
                opacity: seen ? 1 : 0.45,
              }}
            >
              <span className="font-mono text-[10px] text-[var(--muted)]">{label(fr.hour).slice(0, 2)}</span>
              <span className="flex flex-wrap justify-center gap-0.5">
                {seen &&
                  fr.runs.map((r, i) => (
                    <span key={i} title={r.late ? `late run for ${label(r.slot)}` : "on time"} className="h-2.5 w-2.5 rounded-full" style={{ background: r.late ? "var(--auto)" : "var(--good)" }} />
                  ))}
                {lost && <span className="font-mono text-xs" style={{ color: "var(--bad)" }}>✗</span>}
                {waiting && <span className="font-mono text-xs text-[var(--faint)]">…</span>}
                {folded && <span className="font-mono text-xs" style={{ color: "var(--auto)" }}>↷</span>}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 flex flex-wrap gap-x-4 text-[11px] text-[var(--muted)]">
        <span style={{ color: "var(--good)" }}>● on time</span>
        <span style={{ color: "var(--auto)" }}>● late (catch-up)</span>
        <span>… waiting for the runner</span>
        <span style={{ color: "var(--auto)" }}>↷ covered by the catch-up run</span>
        <span style={{ color: "var(--bad)" }}>✗ missed for good</span>
      </p>
    </section>
  );
}
