"use client";

import { useState } from "react";
import { FlowArrow, FlowSequence, FlowStep } from "@/components/flow/Flow";
import { useWalk } from "@/components/session/ui";
import { SessionControlBar } from "@/components/session/SessionControlBar";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { FREE, GUIDED, JSON_RESULT, PROSE_RESULT, QUESTION, SCHEMA } from "@/lib/structured";

const ACCENT = "var(--native)";

export default function StructuredDemo() {
  const [schemaOn, setSchemaOn] = useState(true);
  const { stage, busy, run } = useWalk(4, 480);
  const tokens = schemaOn ? GUIDED : FREE;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI native · interactive"
        title="Force valid JSON"
        blurb={'A schema does not ask the model to "please return JSON". It refuses any next token that would break the shape.'}
      />

      <SessionControlBar
        label={schemaOn ? "Schema on — only legal tokens emit" : "Schema off — any token allowed"}
        busy={busy}
        onRun={run}
        runLabel="Generate"
        accent={ACCENT}
      >
        <button
          type="button"
          aria-pressed={schemaOn}
          onClick={() => setSchemaOn((v) => !v)}
          className="min-h-11 rounded-md border px-3 text-sm"
          style={{
            borderColor: schemaOn ? ACCENT : "var(--line)",
            background: schemaOn ? "color-mix(in srgb, var(--native) 16%, transparent)" : "transparent",
          }}
        >
          Schema {schemaOn ? "on" : "off"}
        </button>
      </SessionControlBar>

      <div className="mt-6">
        <FlowSequence accent={ACCENT}>
        <FlowStep n={1} title="Ask for the facts" what="The question is ordinary. The constraint comes next." accent={ACCENT} active={stage === 0}>
          <p>{QUESTION}</p>
        </FlowStep>
        <FlowArrow label="the question" accent={ACCENT} active={stage === 1} />

        <FlowStep n={2} title="Attach a schema, or don't" what="With a schema, the only legal output is an object with city and country. Without one, a sentence is fine." accent={ACCENT} active={stage === 1}>
          {schemaOn && (
            <pre className="mt-3 overflow-x-hidden whitespace-pre-wrap rounded-md bg-[var(--inset)] p-3 font-mono text-xs">
              {SCHEMA}
            </pre>
          )}
        </FlowStep>
        <FlowArrow label={schemaOn ? "allowed tokens only" : "any token"} accent={ACCENT} active={stage === 2} />

        <FlowStep n={3} title="Propose the next token" what="The model still scores tokens. The schema decides which of those scores are even legal." accent={ACCENT} active={stage === 2}>
          <ul className="flex flex-wrap gap-2">
            {tokens.map((token, index) => (
              <li
                key={`${token.token}-${index}`}
                className="rounded-md border px-2 py-1 font-mono text-sm"
                style={{
                  borderColor: token.ok ? "var(--line-strong)" : "var(--bad)",
                  color: token.ok ? "var(--text)" : "var(--bad)",
                  textDecoration: token.ok ? undefined : "line-through",
                }}
                title={token.why}
              >
                {token.token}
              </li>
            ))}
          </ul>
          {schemaOn && (
            <p className="mt-3 text-sm text-[var(--muted)]">
              &quot;The&quot; is the token a sentence wants. It is crossed out because an object cannot start that way.
            </p>
          )}
        </FlowStep>
        <FlowArrow label={schemaOn ? "legal tokens" : "the sentence"} accent={ACCENT} active={stage === 3} />

        <FlowStep n={4} title="Emit only what the schema allows" what="Your code can parse the result. A sentence would have thrown." accent={ACCENT} active={stage === 3}>
          <p className="break-words font-mono text-sm">{schemaOn ? JSON_RESULT : PROSE_RESULT}</p>
          <p className="mt-2 text-sm" style={{ color: schemaOn ? "var(--good)" : "var(--bad)" }}>
            {schemaOn ? "Parses as JSON." : "Reads well. JSON.parse would throw."}
          </p>
          <p className="mt-2 text-xs text-[var(--faint)]">Use Generate in the bar above to walk the steps.</p>
        </FlowStep>
        </FlowSequence>
      </div>
    </SessionPage>
  );
}
