"use client";

import { useRef, useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, wait } from "@/components/session/ui";
import { STAGES, type StageId } from "@/lib/pipeline";

const ACCENT = "var(--ops)";

type Look = "idle" | "active" | "pass" | "fail" | "skip";

export default function PipelineDemo() {
  const [broken, setBroken] = useState<StageId | "none">("test");
  const [cursor, setCursor] = useState(-1);
  const [settled, setSettled] = useState(false);
  const [busy, setBusy] = useState(false);
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
    for (let i = 0; i < STAGES.length; i++) {
      if (cancel.current) return;
      setCursor(i);
      await wait(520);
      if (i === brokenIndex) {
        setSettled(true);
        setBusy(false);
        return;
      }
    }
    setSettled(true);
    setBusy(false);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)]">DevOps · interactive</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">A CI/CD pipeline, stage by stage</h1>
      <p className="mt-3 text-[var(--muted)]">
        Lint, test, build, then deploy. Break one stage and watch the rest never start.
      </p>

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
                {index === STAGES.length - 1 && (
                  <div className="mt-4">
                    <RunButton busy={busy} onClick={run} accent={ACCENT} running="Pipeline running…">
                      Run the pipeline
                    </RunButton>
                  </div>
                )}
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
