"use client";

import { Fragment, useRef, useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { RunButton, wait } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionSplitLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type Packet } from "@/components/system/SystemMap";
import { STEP_FOR, turns } from "@/lib/agentLoop";

const ACCENT = "var(--tools)";

const STEPS = [
  { title: "Read the task", what: "The task is one sentence: make the failing test pass." },
  { title: "Search the repo", what: "The agent opens the files that mention the failure." },
  { title: "Edit a file", what: "It changes the code, then leaves the test in place so the check still means something." },
  { title: "Run the check", what: "A red check is not the end. It is the reason to search again." },
  { title: "Stop, or go back to search", what: "Green means stop. Red means another loop, with the error as the new clue." },
];

export default function AgentLoopDemo() {
  const [failOnce, setFailOnce] = useState(true);
  const [shown, setShown] = useState(0);
  const [stage, setStage] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const cancel = useRef(false);
  const plan = turns(failOnce);

  async function run() {
    if (busy) return;
    setBusy(true);
    setShown(0);
    const script = turns(failOnce);
    for (let i = 0; i < script.length; i++) {
      if (cancel.current) return;
      setStage(STEP_FOR[script[i].action]);
      setShown(i + 1);
      await wait(1000);
    }
    setStage(4);
    await wait(900);
    setStage(null);
    setBusy(false);
  }

  const visible = plan.slice(0, shown);
  const last = visible[visible.length - 1];
  const passed = last?.action === "Check" && last.ok;
  const failed = last?.action === "Check" && !last.ok;

  const turn = stage !== null && stage < 4 ? last : undefined;
  const id = `${failOnce}-${shown}`;
  const packets: Packet[] =
    stage === 4 ? hops(`${id}-done`, ["agent", "task"], { label: "done", tone: "good" })
    : turn?.action === "Search" ? [...hops(`${id}-s`, ["agent", "repo"], { label: "search" }), ...hops(`${id}-f`, ["repo", "agent"], { label: "files", start: 0.45 })]
    : turn?.action === "Edit" ? hops(`${id}-e`, ["agent", "repo"], { label: "edit" })
    : turn?.action === "Check" ? [...hops(`${id}-c`, ["agent", "tests"], { label: "run test" }), ...hops(`${id}-r`, ["tests", "agent"], { label: turn.ok ? "green" : "red", tone: turn.ok ? "good" : "bad", start: 0.45 })]
    : [];
  const caption =
    stage === null ? (passed ? "Done. The loop stopped on a green check." : "Run the agent and watch it move between the repo and the test runner.")
    : stage === 4 ? "Green. The agent stops and reports back."
    : turn ? `Round ${turn.round}. ${turn.action}: ${turn.detail}`
    : "";

  return (
    <SessionPage>
      <SessionHeader
        kicker="Tools · interactive"
        title="A coding agent's loop"
        blurb="Cursor, Claude Code, and tools like them do not write the whole answer in one shot. They search, edit, run a check, and repeat until the check passes."
      />

      <div className="mt-6">
        <SessionSplitLayout
          visual={
            <SystemMap
              chrome="split"
          title="The task, the agent, the repo and the test runner"
          accent={ACCENT}
          nodes={[
            { id: "task", label: "Task", sub: "make the test pass", at: [12, 50], mobileAt: [50, 11], state: stage === 4 ? "good" : "idle" },
            { id: "agent", label: "Agent", sub: turn ? `round ${turn.round}` : "idle", at: [44, 50], mobileAt: [50, 46], state: stage !== null ? "active" : "idle" },
            { id: "repo", label: "Repo files", sub: "sum.ts", at: [84, 20], mobileAt: [22, 86], state: turn?.action === "Search" || turn?.action === "Edit" ? "active" : "idle" },
            {
              id: "tests",
              label: "Test runner",
              sub: last?.action === "Check" ? (last.ok ? "green" : "red") : "not run",
              at: [84, 80],
              mobileAt: [78, 86],
              state: turn?.action === "Check" ? (turn.ok ? "good" : "bad") : "idle",
            },
          ]}
          links={[
            { from: "task", to: "agent", label: "task" },
            { from: "agent", to: "repo", label: turn?.action === "Edit" ? "edit" : "search" },
            { from: "agent", to: "tests", label: "check" },
          ]}
          packets={packets}
          aspect={2.1}
          mobileAspect={0.95}
            />
          }
          panel={
            <SystemMapPanel caption={caption}>
              <button
                type="button"
                aria-pressed={failOnce}
                onClick={() => {
                  setFailOnce((v) => !v);
                  setShown(0);
                  setStage(null);
                }}
                className="min-h-11 w-full rounded-md border px-3 text-sm"
                style={{
                  borderColor: failOnce ? ACCENT : "var(--line)",
                  background: failOnce ? "color-mix(in srgb, var(--tools) 16%, transparent)" : "transparent",
                }}
              >
                First check {failOnce ? "fails once" : "passes immediately"}
              </button>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Working…">
                Run the agent
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
        {STEPS.map((step, index) => (
          <Fragment key={step.title}>
            <FlowStep n={index + 1} title={step.title} what={step.what} accent={ACCENT} active={stage === index}>
              {index === 0 && (
                <p className="text-xs text-[var(--faint)]">Toggle the first-check behaviour in the panel.</p>
              )}
              {index === 4 && (
                <>
                  <ol className="space-y-2 text-sm">
                    {visible.length === 0 && <li className="text-[var(--faint)]">The loop log shows up here.</li>}
                    {visible.map((turn, idx) => (
                      <li key={`${turn.round}-${turn.action}-${idx}`} className="rounded-md border border-[var(--line)] px-3 py-2">
                        <span className="font-mono text-xs text-[var(--faint)]">round {turn.round}</span>
                        <p>
                          {turn.action}: {turn.detail}
                        </p>
                      </li>
                    ))}
                  </ol>
                  {last?.action === "Check" && (
                    <p className="mt-3 text-sm" style={{ color: passed ? "var(--good)" : "var(--bad)" }}>
                      {failed ? "Still red. Back to search." : "Stopped. The test is green."}
                    </p>
                  )}
                </>
              )}
            </FlowStep>
            {index < STEPS.length - 1 && (
              <FlowArrow label={index === 3 ? "check result" : "next"} accent={ACCENT} active={stage === index + 1} />
            )}
          </Fragment>
        ))}
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
