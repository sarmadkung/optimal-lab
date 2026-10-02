"use client";

import { useRef, useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, wait } from "@/components/session/ui";
import { SystemMap, hops, type NodeState, type Packet } from "@/components/system/SystemMap";
import { STAGES, type StageId } from "@/lib/pipeline";

const ACCENT = "var(--ops)";

type Look = "idle" | "active" | "pass" | "fail" | "skip";

const LOOK_STATE: Record<Look, NodeState> = { idle: "idle", active: "active", pass: "good", fail: "bad", skip: "dim" };
const LOOK_SUB: Record<Look, string> = { idle: "waiting", active: "running…", pass: "passed", fail: "failed", skip: "skipped" };
// Snake layout: the top row runs left to right, the bottom row comes back to production.
const STAGE_AT: [number, number][] = [[50, 25], [85, 25], [85, 75], [50, 75]];

export default function PipelineDemo() {
  const [broken, setBroken] = useState<StageId | "none">("test");
  const [cursor, setCursor] = useState(-1);
  const [settled, setSettled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [runId, setRunId] = useState(0);
  const cancel = useRef(false);
  const brokenIndex = broken === "none" ? -1 : STAGES.findIndex((s) => s.id === broken);

  function look(index: number): Look {
    if (cursor < 0) return "idle";
    if (brokenIndex >= 0 && index > brokenIndex && cursor >= brokenIndex) return "skip";
    if (index < cursor) return "pass";
    if (index === cursor) {
      if (settled && index === brokenIndex) return "fail";
      if (settled) return "pass";
      return "active";
    }
    return "idle";
  }

  async function run() {
    if (busy) return;
    setBusy(true);
    setSettled(false);
    setRunId((n) => n + 1);
    for (let i = 0; i < STAGES.length; i++) {
      if (cancel.current) return;
      setCursor(i);
      await wait(900);
      if (i === brokenIndex) {
        setSettled(true);
        setBusy(false);
        return;
      }
    }
    setSettled(true);
    setBusy(false);
  }

  const shipped = settled && brokenIndex < 0;
  const stopped = settled && brokenIndex >= 0;
  const packets: Packet[] = [];
  if (cursor >= 0) {
    const from = cursor === 0 ? "repo" : STAGES[cursor - 1].id;
    packets.push(...hops(`${runId}-${cursor}`, [from, STAGES[cursor].id], { label: cursor < 3 ? "commit" : "artifact" }));
  }
  if (shipped) packets.push(...hops(`${runId}-live`, ["deploy", "prod"], { label: "v2", tone: "good", start: 0.1 }));

  const caption =
    cursor < 0 ? "Choose what breaks, then run the pipeline."
    : stopped ? `${STAGES[brokenIndex].title} failed. Nothing after it runs, and production keeps the old version.`
    : shipped ? "Every stage passed. The new version is live."
    : `${STAGES[cursor].title} is running on this commit.`;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)]">DevOps · interactive</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">A CI/CD pipeline, stage by stage</h1>
      <p className="mt-3 text-[var(--muted)]">
        Lint, test, build, then deploy. Break one stage and watch the rest never start.
      </p>

      <div className="mt-6">
        <SystemMap
          title="A commit moving from the repo through the pipeline to production"
          accent={ACCENT}
          nodes={[
            { id: "repo", label: "Repo", sub: "git push", at: [15, 25], state: cursor === 0 ? "active" : "idle" },
            ...STAGES.map((s, index) => ({
              id: s.id,
              label: s.title,
              sub: LOOK_SUB[look(index)],
              at: STAGE_AT[index],
              state: LOOK_STATE[look(index)],
            })),
            { id: "prod", label: "Production", sub: shipped ? "v2 live" : "v1 live", at: [15, 75], state: shipped ? "good" : stopped ? "dim" : "idle" },
          ]}
          links={[
            { from: "repo", to: "lint" },
            { from: "lint", to: "test" },
            { from: "test", to: "build" },
            { from: "build", to: "deploy" },
            { from: "deploy", to: "prod", dim: stopped },
          ]}
          packets={packets}
          aspect={2}
          mobileAspect={1.2}
          caption={caption}
        >
          <RunButton busy={busy} onClick={run} accent={ACCENT} running="Pipeline running…">
            Run the pipeline
          </RunButton>
        </SystemMap>
      </div>

      <div className="mt-6">
        <FlowStep n={1} title="Choose what breaks" what="A healthy pipeline passes every stage. One failure is enough to stop the line." accent={ACCENT} active={cursor < 0}>
          <Choices
            accent={ACCENT}
            value={broken}
            onChange={(id) => {
              setBroken(id);
              setCursor(-1);
              setSettled(false);
            }}
            options={[
              { id: "none", label: "Nothing breaks" },
              ...STAGES.map((s) => ({ id: s.id, label: `Break ${s.title.toLowerCase()}` })),
            ]}
          />
        </FlowStep>
        <FlowArrow label="commit" accent={ACCENT} active={cursor === 0} />

        {STAGES.map((stage, index) => {
          const state = look(index);
          const copy =
            state === "fail" ? stage.fail : state === "skip" ? "Skipped. An earlier stage failed." : state === "pass" ? stage.pass : stage.pass;
          return (
            <div key={stage.id}>
              <FlowStep
                n={index + 2}
                title={stage.title}
                what={index === 0 ? "Check the code before any tests run." : index === 1 ? "Run the test suite." : index === 2 ? "Produce the artifact you will ship." : "Put that artifact in front of users."}
                accent={ACCENT}
                active={state === "active"}
              >
                <p
                  className="text-sm"
                  style={{
                    color: state === "fail" ? "var(--bad)" : state === "pass" ? "var(--good)" : "var(--muted)",
                  }}
                >
                  {state === "idle" && "Waiting."}
                  {state === "active" && "Running…"}
                  {state !== "idle" && state !== "active" && copy}
                </p>
              </FlowStep>
              {index < STAGES.length - 1 && (
                <FlowArrow label={state === "fail" ? "stopped" : "next stage"} accent={ACCENT} active={cursor === index + 1} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
