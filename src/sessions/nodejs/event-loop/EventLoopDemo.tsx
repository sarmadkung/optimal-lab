"use client";

import { useRef, useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { RunButton, wait } from "@/components/session/ui";
import { JOBS, PHASES, script, type Job, type PhaseId } from "@/lib/eventLoop";

const ACCENT = "var(--node)";

const EMPTY: Record<Job, boolean> = {
  nextTick: true,
  promise: true,
  timeout: true,
  io: true,
  immediate: true,
};

export default function EventLoopDemo() {
  const [on, setOn] = useState(EMPTY);
  const [stage, setStage] = useState<number | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const cancel = useRef(false);

  const toggle = (id: Job) => {
    setOn((prev) => ({ ...prev, [id]: !prev[id] }));
    setLog([]);
    setStage(null);
  };

  async function run() {
    if (busy) return;
    setBusy(true);
    setLog([]);
    const lines = script(on);
    for (let i = 0; i < lines.length; i++) {
      if (cancel.current) return;
      setStage(PHASES.findIndex((p) => p.id === lines[i].phase));
      if (lines[i].line) setLog((prev) => [...prev, lines[i].line as string]);
      await wait(420);
    }
    setStage(null);
    setBusy(false);
  }

  const phaseOn = (id: PhaseId) => stage === PHASES.findIndex((p) => p.id === id);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)]">Node.js · interactive</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">The event loop, phase by phase</h1>
      <p className="mt-3 text-[var(--muted)]">
        Synchronous code finishes first. Queued callbacks then run in a fixed order. Turn some off and
        run the loop again.
      </p>

      <div className="mt-6">
        <FlowStep n={1} title="Run synchronous code" what={PHASES[0].what} accent={ACCENT} active={phaseOn("sync")}>
          <p className="font-mono text-sm">
            console.log(&quot;start&quot;)
            <br />
            console.log(&quot;end&quot;)
          </p>
        </FlowStep>
        <FlowArrow label="call stack empty" accent={ACCENT} active={stage === 1} />

        <FlowStep n={2} title="Drain nextTick" what={PHASES[1].what} accent={ACCENT} active={phaseOn("nextTick")}>
          <JobToggle id="nextTick" on={on} toggle={toggle} />
        </FlowStep>
        <FlowArrow label="nextTick queue" accent={ACCENT} active={stage === 2} />

        <FlowStep n={3} title="Drain promise reactions" what={PHASES[2].what} accent={ACCENT} active={phaseOn("micro")}>
          <JobToggle id="promise" on={on} toggle={toggle} />
        </FlowStep>
        <FlowArrow label="microtask queue" accent={ACCENT} active={stage === 3} />

        <FlowStep n={4} title="Timers phase" what={PHASES[3].what} accent={ACCENT} active={phaseOn("timers")}>
          <JobToggle id="timeout" on={on} toggle={toggle} />
        </FlowStep>
        <FlowArrow label="due timers" accent={ACCENT} active={stage === 4} />

        <FlowStep n={5} title="Poll for I/O" what={PHASES[4].what} accent={ACCENT} active={phaseOn("poll")}>
          <JobToggle id="io" on={on} toggle={toggle} />
        </FlowStep>
        <FlowArrow label="ready I/O" accent={ACCENT} active={stage === 5} />

        <FlowStep n={6} title="Check phase" what={PHASES[5].what} accent={ACCENT} active={phaseOn("check")}>
          <JobToggle id="immediate" on={on} toggle={toggle} />
          <div className="mt-4">
            <RunButton busy={busy} onClick={run} accent={ACCENT} running="Running the loop…">
              Run one turn
            </RunButton>
          </div>
          <ol className="mt-4 space-y-1 font-mono text-sm">
            {log.length === 0 && <li className="text-[var(--faint)]">The print order shows up here.</li>}
            {log.map((line, idx) => (
              <li key={`${line}-${idx}`}>
                <span className="text-[var(--faint)]">{idx + 1}.</span> {line}
              </li>
            ))}
          </ol>
        </FlowStep>
      </div>

      <p className="mt-8 text-sm leading-relaxed text-[var(--muted)]">
        This is the order when the timer is already due and the file callback is already ready. If the
        timer is still waiting, poll can run first.
      </p>
    </div>
  );
}

function JobToggle({ id, on, toggle }: { id: Job; on: Record<Job, boolean>; toggle: (id: Job) => void }) {
  const job = JOBS.find((j) => j.id === id)!;
  const enabled = on[id];
  return (
    <button
      type="button"
      aria-pressed={enabled}
      onClick={() => toggle(id)}
      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border px-3 text-left text-sm"
      style={{
        borderColor: enabled ? ACCENT : "var(--line)",
        background: enabled ? "color-mix(in srgb, var(--node) 14%, transparent)" : "transparent",
      }}
    >
      <span className="font-mono">{job.label}</span>
      <span className="text-xs" style={{ color: enabled ? "var(--good)" : "var(--faint)" }}>
        {enabled ? "queued" : "off"}
      </span>
    </button>
  );
}
