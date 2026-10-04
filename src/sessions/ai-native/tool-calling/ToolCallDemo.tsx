"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionSplitLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type NodeState, type Packet } from "@/components/system/SystemMap";
import { ANSWER, CALL, GUESS, QUESTION, RESULT } from "@/lib/toolCall";

const ACCENT = "var(--native)";

export default function ToolCallDemo() {
  const [tools, setTools] = useState(true);
  const { stage, busy, run, setStage } = useWalk(5, 1000);
  const lit = (...at: number[]): NodeState => (!tools ? "dim" : stage !== null && at.includes(stage) ? "active" : "idle");

  const packets: Packet[] =
    stage === 0 ? hops("q", ["user", "model"], { label: "question" })
    : stage === 2 && tools ? hops("call", ["model", "app"], { label: "get_weather" })
    : stage === 3 && tools ? [...hops("get", ["app", "api"], { label: "GET" }), ...hops("json", ["api", "app"], { label: "JSON", start: 0.5 })]
    : stage === 4 ? tools
      ? [...hops("res", ["app", "model"], { label: "result" }), ...hops("ans", ["model", "user"], { label: "answer", tone: "good", start: 0.5 })]
      : hops("guess", ["model", "user"], { label: "guess", tone: "bad" })
    : [];
  const captions = tools
    ? [
        "The question reaches the model.",
        "The model sees it needs live weather it does not have.",
        "It writes a tool call. Your app receives it, not the user.",
        "Your app calls the weather API and gets JSON back.",
        "The result goes back to the model, which writes the answer from it.",
      ]
    : [
        "The question reaches the model.",
        "The model needs live weather, but no tool was given.",
        "There is nothing to call, so your app and the API stay idle.",
        "No request leaves the process.",
        "The model answers anyway. The number is a guess.",
      ];

  const liveCaption = stage === null ? "Ask the model and watch where the request goes." : captions[stage];

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI native · interactive"
        title="Call a tool, then answer"
        blurb="The model does not have live weather. With a tool, it asks your app. Your app runs the tool and hands the result back. Without a tool, it can only guess."
      />

      <div className="mt-6">
        <SessionSplitLayout
          visual={
            <SystemMap
              chrome="split"
          title="The user, the model, your app and a weather API"
          accent={ACCENT}
          nodes={[
            { id: "user", label: "User", at: [12, 72], mobileAt: [25, 15], state: stage === 0 || stage === 4 ? "active" : "idle" },
            {
              id: "model",
              label: "Model",
              sub: tools ? "has 1 tool" : "no tools",
              at: [38, 26],
              mobileAt: [75, 15],
              state: stage === 4 && !tools ? "bad" : stage !== null && stage <= 4 && stage !== 3 ? "active" : "idle",
            },
            { id: "app", label: "Your app", sub: "runs the tool", at: [64, 72], mobileAt: [75, 85], state: lit(2, 3, 4) },
            { id: "api", label: "Weather API", sub: "live data", at: [88, 26], mobileAt: [25, 85], state: lit(3) },
          ]}
          links={[
            { from: "user", to: "model", label: stage === 4 ? (tools ? "answer" : "a guess") : "question" },
            { from: "model", to: "app", label: stage === 4 ? "tool result" : "tool call", dim: !tools },
            { from: "app", to: "api", label: "HTTP", dim: !tools },
          ]}
          packets={packets}
          aspect={2.1}
          mobileAspect={1}
            />
          }
          panel={
            <SystemMapPanel caption={liveCaption}>
              <button
                type="button"
                aria-pressed={tools}
                onClick={() => {
                  setTools((v) => !v);
                  setStage(null);
                }}
                className="min-h-11 w-full rounded-md border px-3 text-sm"
                style={{
                  borderColor: tools ? ACCENT : "var(--line)",
                  background: tools ? "color-mix(in srgb, var(--native) 16%, transparent)" : "transparent",
                }}
              >
                Tools {tools ? "on" : "off"}
              </button>
              <RunButton busy={busy} onClick={run} accent={ACCENT}>
                Ask the model
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
        <FlowStep n={1} title="Read the question" what="Some questions can be answered from the prompt. This one cannot." accent={ACCENT} active={stage === 0}>
          <p>{QUESTION}</p>
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
        </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
