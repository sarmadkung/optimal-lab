"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { RunButton, useWalk } from "@/components/session/ui";
import { ANSWER, CALL, GUESS, QUESTION, RESULT } from "@/lib/toolCall";

const ACCENT = "var(--native)";

export default function ToolCallDemo() {
  const [tools, setTools] = useState(true);
  const { stage, busy, run, setStage } = useWalk(5, 450);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)]">AI native · interactive</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Call a tool, then answer</h1>
      <p className="mt-3 text-[var(--muted)]">
        The model does not have live weather. With a tool, it asks your app. Your app runs the tool and
        hands the result back. Without a tool, it can only guess.
      </p>

      <div className="mt-6">
        <FlowStep n={1} title="Read the question" what="Some questions can be answered from the prompt. This one cannot." accent={ACCENT} active={stage === 0}>
          <p>{QUESTION}</p>
          <button
            type="button"
            aria-pressed={tools}
            onClick={() => {
              setTools((v) => !v);
              setStage(null);
            }}
            className="mt-4 min-h-11 rounded-md border px-3 text-sm"
            style={{
              borderColor: tools ? ACCENT : "var(--line)",
              background: tools ? "color-mix(in srgb, var(--native) 16%, transparent)" : "transparent",
            }}
          >
            Tools {tools ? "on" : "off"}
          </button>
        </FlowStep>
        <FlowArrow label={tools ? "need a tool" : "no tool available"} accent={ACCENT} active={stage === 1} />

        <FlowStep
          n={2}
          title="Decide whether a tool is needed"
          what="The model picks a tool only if you gave it one. Otherwise it has to improvise."
          accent={ACCENT}
          active={stage === 1}
        >
          <p className="text-sm text-[var(--muted)]">
            {tools ? "get_weather can answer a city and a time of “now”." : "No tools were provided, so the model cannot look anything up."}
          </p>
        </FlowStep>
        <FlowArrow label={tools ? "tool call" : "a guess"} accent={ACCENT} active={stage === 2} />

        <FlowStep n={3} title="Write the tool call" what="This is data for your app, not the answer the user sees." accent={ACCENT} active={stage === 2 && tools}>
          {tools ? (
            <p className="break-words font-mono text-sm">{CALL}</p>
          ) : (
            <p className="text-sm text-[var(--faint)]">Skipped. There is nothing to call.</p>
          )}
        </FlowStep>
        <FlowArrow label={tools ? "your code runs it" : "nothing ran"} accent={ACCENT} active={stage === 3} />

        <FlowStep n={4} title="Run the tool in your app" what="The model does not fetch the weather. Your server does, then returns JSON." accent={ACCENT} active={stage === 3 && tools}>
          {tools ? (
            <p className="break-words font-mono text-sm">{RESULT}</p>
          ) : (
            <p className="text-sm text-[var(--faint)]">No request left the process.</p>
          )}
        </FlowStep>
        <FlowArrow label={tools ? "tool result" : "no result"} accent={ACCENT} active={stage === 4} />

        <FlowStep n={5} title="Answer from what came back" what="With a result, the sentence quotes it. Without one, the number is made up." accent={ACCENT} active={stage === 4 || stage === 5}>
          <p className="text-sm" style={{ color: tools ? "var(--text)" : "var(--bad)" }}>
            {tools ? ANSWER : GUESS}
          </p>
          <p className="mt-2 text-xs" style={{ color: tools ? "var(--good)" : "var(--bad)" }}>
            {tools ? "Grounded in the sample reading." : "Not grounded. The model invented a temperature."}
          </p>
          <div className="mt-4">
            <RunButton busy={busy} onClick={run} accent={ACCENT}>
              Ask the model
            </RunButton>
          </div>
        </FlowStep>
      </div>
    </div>
  );
}
