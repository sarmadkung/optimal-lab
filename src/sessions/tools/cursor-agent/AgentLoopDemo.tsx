"use client";

import { useRef, useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { RunButton, wait } from "@/components/session/ui";
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
      await wait(480);
    }
    setStage(4);
    await wait(360);
    setStage(null);
    setBusy(false);
  }

  const visible = plan.slice(0, shown);
  const last = visible[visible.length - 1];
  const passed = last?.action === "Check" && last.ok;
  const failed = last?.action === "Check" && !last.ok;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)]">Tools · interactive</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">A coding agent&apos;s loop</h1>
      <p className="mt-3 text-[var(--muted)]">
        Cursor, Claude Code, and tools like them do not write the whole answer in one shot. They
        search, edit, run a check, and repeat until the check passes.
      </p>

      <div className="mt-6">
        {STEPS.map((step, index) => (
          <div key={step.title}>
            <FlowStep n={index + 1} title={step.title} what={step.what} accent={ACCENT} active={stage === index}>
              {index === 0 && (
                <button
                  type="button"
                  aria-pressed={failOnce}
                  onClick={() => {
                    setFailOnce((v) => !v);
                    setShown(0);
                    setStage(null);
                  }}
                  className="min-h-11 rounded-md border px-3 text-sm"
                  style={{
                    borderColor: failOnce ? ACCENT : "var(--line)",
                    background: failOnce ? "color-mix(in srgb, var(--tools) 16%, transparent)" : "transparent",
                  }}
                >
                  First check {failOnce ? "fails once" : "passes immediately"}
                </button>
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
                  <div className="mt-4">
                    <RunButton busy={busy} onClick={run} accent={ACCENT} running="Working…">
                      Run the agent
                    </RunButton>
                  </div>
                </>
              )}
            </FlowStep>
            {index < STEPS.length - 1 && (
              <FlowArrow label={index === 3 ? "check result" : "next"} accent={ACCENT} active={stage === index + 1} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
