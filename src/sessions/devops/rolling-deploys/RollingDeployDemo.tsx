"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, PlaybackControls, usePlayback } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMapPanel } from "@/components/system/SystemMap";
import { DEADLINE, REPLICAS, STARTUP, simulate, type Phase, type Pod } from "@/lib/rollingDeploy";

const ACCENT = "var(--ops)";
const PHASE: Record<Phase, { label: string; color: string }> = {
  starting: { label: "starting", color: "var(--auto)" },
  ready: { label: "Ready", color: "var(--good)" },
  failing: { label: "probe failing", color: "var(--bad)" },
  terminating: { label: "terminating", color: "var(--faint)" },
};

export default function RollingDeployDemo() {
  const [good, setGood] = useState(true);
  const [surge, setSurge] = useState(1);
  const [rollback, setRollback] = useState(false);
  const frames = simulate(good, surge, rollback);
  const playback = usePlayback(frames.length, 1200);
  const f = frames[playback.i];
  const total = f.ready.v1 + f.ready.v2;
  const newest = f.pods.filter((p) => p.version === "v2");
  const stalled = frames.at(-1)!.status === "stalled";

  const reset = () => {
    setRollback(false);
    playback.reset();
  };

  const caption = `Tick ${f.tick}: ${f.event}`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="Kubernetes rolling deploys"
        blurb="A rolling update swaps pods one at a time, and only sends traffic to a new pod once its readiness probe passes. Roll out a good version, then a broken one, and watch the old pods keep serving."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5" aria-label="Pods in the Deployment and where the Service sends traffic">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">Deployment “web” · replicas {REPLICAS}</p>
                <p className="font-mono text-xs" style={{ color: f.status === "stalled" ? "var(--bad)" : f.status === "complete" ? "var(--good)" : "var(--muted)" }}>
                  {f.status}
                </p>
              </div>

              <p className="mt-4 text-sm font-medium">Service traffic</p>
              <div className="mt-2 flex h-8 overflow-hidden rounded-md bg-[var(--track)] text-xs font-semibold text-[var(--on-accent)]">
                {total > 0 && (
                  <>
                    <div className="grid place-items-center transition-[width] duration-300" style={{ width: `${(f.ready.v1 / total) * 100}%`, background: "var(--c1)" }}>
                      {f.ready.v1 ? `v1 ${Math.round((f.ready.v1 / total) * 100)}%` : ""}
                    </div>
                    <div className="grid place-items-center transition-[width] duration-300" style={{ width: `${(f.ready.v2 / total) * 100}%`, background: "var(--c3)" }}>
                      {f.ready.v2 ? `v2 ${Math.round((f.ready.v2 / total) * 100)}%` : ""}
                    </div>
                  </>
                )}
              </div>
              <p className="mt-1 text-xs text-[var(--faint)]">Only Ready pods get requests. {total} of {f.pods.length} pods are Ready.</p>

              <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {f.pods.map((p) => (
                  <PodCard key={p.id} pod={p} />
                ))}
              </ul>
            </section>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <Choices
                label="New version"
                accent={ACCENT}
                value={good ? "good" : "bad"}
                onChange={(v) => {
                  setGood(v === "good");
                  reset();
                }}
                options={[
                  { id: "good", label: "v2 works" },
                  { id: "bad", label: "v2 is broken" },
                ]}
              />
              <Choices
                label="maxSurge"
                accent={ACCENT}
                value={String(surge)}
                onChange={(v) => {
                  setSurge(Number(v));
                  reset();
                }}
                options={[
                  { id: "1", label: "1 extra pod" },
                  { id: "2", label: "2 extra pods" },
                ]}
              />
              <PlaybackControls playback={playback} accent={ACCENT} nextLabel="Next tick" status={`maxUnavailable 0 · tick ${f.tick}`} />
              {stalled && !rollback && playback.atEnd && (
                <button
                  type="button"
                  onClick={() => setRollback(true)}
                  className="min-h-11 rounded-md border px-4 font-mono text-sm"
                  style={{ borderColor: "var(--bad)", color: "var(--text)" }}
                >
                  kubectl rollout undo
                </button>
              )}
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Start a new pod" what={`maxSurge lets the Deployment run up to ${REPLICAS + surge} pods for a moment, so it never has to stop an old one first.`} accent={ACCENT} active={f.event.includes("Started")}>
                <p className="text-sm">{newest.length} v2 {newest.length === 1 ? "pod" : "pods"} created so far.</p>
              </FlowStep>
              <FlowArrow label="container starting" accent={ACCENT} />

              <FlowStep n={2} title="Wait for its readiness probe" what={`Kubernetes polls the pod (GET /healthz) after it starts. Here that takes ${STARTUP} ticks. No probe pass, no traffic.`} accent={ACCENT} active={newest.some((p) => p.phase === "starting")}>
                <p className="text-sm">
                  {newest.filter((p) => p.phase === "starting").length} starting · {newest.filter((p) => p.phase === "failing").length} failing
                </p>
              </FlowStep>
              <FlowArrow label="probe passed" accent={ACCENT} />

              <FlowStep n={3} title="Add it to the Service" what="The Service's endpoints now include the new pod, and it takes its share of requests." accent={ACCENT} active={f.event.includes("passed")}>
                <p className="text-sm">v2 serves {total ? Math.round((f.ready.v2 / total) * 100) : 0}% of traffic.</p>
              </FlowStep>
              <FlowArrow label="one more Ready pod" accent={ACCENT} />

              <FlowStep n={4} title="Terminate one old pod" what="With maxUnavailable 0, an old pod is removed only after a new one is Ready, so capacity never drops below the replica count." accent={ACCENT} active={f.event.includes("terminated")}>
                <p className="text-sm">{f.ready.v1} v1 pods still serving.</p>
              </FlowStep>
              <FlowArrow label="repeat" accent={ACCENT} />

              <FlowStep n={5} title="Finish, or stall and roll back" what={`If no pod becomes Ready for ${DEADLINE} ticks (progressDeadlineSeconds), the rollout is marked failed. Kubernetes does not roll back on its own: you run kubectl rollout undo, or use a tool like Argo Rollouts.`} accent={ACCENT} active={f.status !== "progressing"}>
                <p className="text-sm" style={{ color: f.status === "complete" || f.status === "rolled-back" ? "var(--good)" : f.status === "stalled" ? "var(--bad)" : undefined }}>
                  {f.status === "complete"
                    ? "Complete: 4 pods of v2, zero downtime."
                    : f.status === "stalled"
                      ? "Stalled: v2 never became Ready, but v1 is still serving 100%. Press kubectl rollout undo."
                      : f.status === "rolled-back"
                        ? "Rolled back to v1."
                        : "In progress."}
                </p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function PodCard({ pod }: { pod: Pod }) {
  const look = PHASE[pod.phase];
  return (
    <li
      className="rounded-lg border px-3 py-2 transition-[border-color,opacity] duration-300"
      style={{ borderColor: look.color, opacity: pod.phase === "terminating" ? 0.45 : 1 }}
    >
      <p className="flex items-center justify-between gap-2 font-mono text-sm">
        <span>{pod.id}</span>
        <span className="rounded px-1.5 text-[10px] font-semibold text-[var(--on-accent)]" style={{ background: pod.version === "v1" ? "var(--c1)" : "var(--c3)" }}>
          {pod.version}
        </span>
      </p>
      <p className="mt-1 text-xs" style={{ color: look.color }}>
        {look.label}
      </p>
    </li>
  );
}
