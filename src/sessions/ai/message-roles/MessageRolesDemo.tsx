"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMapPanel } from "@/components/system/SystemMap";
import {
  END_TOKEN,
  SCENARIOS,
  TEMPLATES,
  prefillFor,
  render,
  replyFor,
  sentMessages,
  specialCount,
  type Role,
  type TemplateId,
} from "@/lib/messageRoles";

const ACCENT = "var(--ai)";
const ROLE_COLOR: Record<Role, string> = { system: "var(--c1)", user: "var(--c2)", assistant: "var(--c3)" };

export default function MessageRolesDemo() {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const [template, setTemplate] = useState<TemplateId>("chatml");
  const [on, setOn] = useState(true);
  const { stage, busy, run } = useWalk(5, 1100);
  const s = SCENARIOS.find((x) => x.id === scenarioId) ?? SCENARIOS[0];
  const sent = sentMessages(s, on);
  const prefill = prefillFor(s, on);
  const pieces = render(sent, template, prefill);
  const reply = replyFor(s, on);
  const t = TEMPLATES.find((x) => x.id === template)!;
  const at = (n: number) => stage === n;
  const showReply = stage === null || stage >= 3;
  const dropped = s.messages.length - sent.length;

  const pick = (id: string) => {
    setScenarioId(id);
    setOn(true);
  };

  const captions = [
    `Your app sends ${sent.length} messages${dropped ? `, and leaves ${dropped} out` : ""}.`,
    `The ${t.label} template turns them into one string with ${specialCount(pieces)} special tokens.`,
    prefill ? `The assistant turn is opened and already starts with “${prefill}”.` : "The string ends with an open assistant turn, so the next token is the start of a reply.",
    `The model writes token by token until it writes ${END_TOKEN[template]}.`,
    "Your app turns the text back into an assistant message. Next turn, the whole list goes again.",
  ];
  const caption =
    stage !== null
      ? captions[stage]
      : on
        ? `${s.toggle.label}: on. ${s.toggle.what}`
        : `${s.toggle.label}: off. Same model, same question, different text in the window, so a different reply.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Engineering · interactive"
        title="System, user and assistant messages"
        blurb="Chat APIs take a list of messages with roles. The model never sees that list: a chat template flattens it into one string with special tokens between the turns, and the model just continues the string. Switch the template and flip each switch to see what changes."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5" aria-label="The messages your app sends and the string the model reads">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">What your app sends</p>
              <ul className="mt-2 space-y-1.5">
                {s.messages.map((m, i) => {
                  const gone = !sent.includes(m);
                  return (
                    <li key={i} className="flex items-start gap-2 text-sm" style={{ opacity: gone ? 0.4 : 1 }}>
                      <span className="mt-0.5 w-[4.75rem] shrink-0 rounded px-1.5 py-0.5 text-center font-mono text-[11px]" style={{ background: `color-mix(in srgb, ${ROLE_COLOR[m.role]} 20%, transparent)`, color: ROLE_COLOR[m.role] }}>
                        {m.role}
                      </span>
                      <span className="min-w-0 break-words" style={{ textDecoration: gone ? "line-through" : undefined }}>
                        {m.content}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <p className="mt-5 font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">What the model reads ({t.label})</p>
              <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-[var(--inset)] p-3 font-mono text-[12px] leading-relaxed">
                {pieces.map((p, i) =>
                  p.special ? (
                    <span key={i} className="rounded px-0.5" style={{ background: `color-mix(in srgb, ${ACCENT} 22%, transparent)`, color: "var(--text)" }}>
                      {p.text}
                    </span>
                  ) : (
                    <span key={i} style={{ color: p.role ? ROLE_COLOR[p.role] : "var(--muted)" }}>
                      {p.text}
                    </span>
                  ),
                )}
                {showReply && (
                  <>
                    <span className="border-b border-dashed" style={{ color: ROLE_COLOR.assistant, borderColor: ROLE_COLOR.assistant }}>
                      {reply}
                    </span>
                    <span className="rounded px-0.5" style={{ background: `color-mix(in srgb, ${ACCENT} 22%, transparent)` }}>
                      {END_TOKEN[template]}
                    </span>
                  </>
                )}
              </pre>
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
                <span>
                  <span className="rounded px-1" style={{ background: `color-mix(in srgb, ${ACCENT} 22%, transparent)` }}>
                    marked
                  </span>{" "}
                  special token (one token each)
                </span>
                <span>
                  <span className="border-b border-dashed border-[var(--c3)]">dashed</span> written by the model
                </span>
              </p>
            </section>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices label="Scenario" accent={ACCENT} value={s.id} onChange={pick} options={SCENARIOS.map((x) => ({ id: x.id, label: x.label }))} />
              </div>
              <label className="flex min-h-11 w-full items-center gap-2 text-sm">
                <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                {s.toggle.label}
              </label>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Sending…">
                Send the request
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Build the list of messages" what="Your app decides what goes in: the system prompt, the earlier turns and the new user message. Nothing else reaches the model." accent={ACCENT} active={at(0)}>
                <ul className="space-y-1 text-sm">
                  <li>
                    <span className="font-mono" style={{ color: ROLE_COLOR.system }}>system</span>: the job, the rules and the tone. Users don&rsquo;t see it.
                  </li>
                  <li>
                    <span className="font-mono" style={{ color: ROLE_COLOR.user }}>user</span>: what the person typed.
                  </li>
                  <li>
                    <span className="font-mono" style={{ color: ROLE_COLOR.assistant }}>assistant</span>: the model&rsquo;s earlier replies, sent back by your app.
                  </li>
                </ul>
                <p className="mt-2 font-mono text-xs text-[var(--faint)]">
                  this request: {sent.length} of {s.messages.length} messages sent
                </p>
              </FlowStep>
              <FlowArrow label={`${sent.length} messages`} accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Flatten them with the chat template" what="Each model was trained on one exact format. Special tokens mark where a turn starts, whose turn it is and where it ends." accent={ACCENT} active={at(1)}>
                <Choices label="Template" accent={ACCENT} value={template} onChange={setTemplate} options={TEMPLATES.map((x) => ({ id: x.id, label: x.label }))} />
                <p className="mt-2 text-sm">{t.note}</p>
                <p className="mt-1 font-mono text-xs text-[var(--faint)]">
                  used by {t.models} · {specialCount(pieces)} special tokens in this prompt
                </p>
              </FlowStep>
              <FlowArrow label="one string" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Leave the assistant turn open" what="The string ends with the start of an assistant turn and nothing after it. The most likely next text is a reply, so that is what the model writes." accent={ACCENT} active={at(2)}>
                <p className="break-words rounded-md bg-[var(--inset)] px-2 py-1.5 font-mono text-xs">
                  …{pieces.slice(-3).map((p) => p.text).join("").replace(/\n/g, "↵")}
                </p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {prefill
                    ? `Prefilled with “${prefill}”. The reply has to continue the JSON, so there is no room for “Sure! Here is…”.`
                    : "Some APIs let you prefill the start of this turn. With open models you can always do it, because you write the template yourself."}
                </p>
              </FlowStep>
              <FlowArrow label="next tokens" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Generate until the end-of-turn token" what="The model predicts one token at a time. When it predicts the end-of-turn token, the server stops and returns the text." accent={ACCENT} active={at(3)}>
                <p className="whitespace-pre-wrap break-words text-sm" style={{ color: ROLE_COLOR.assistant }}>
                  {prefill}
                  {reply}
                </p>
                <p className="mt-2 font-mono text-xs text-[var(--faint)]">stops at {END_TOKEN[template]}</p>
              </FlowStep>
              <FlowArrow label="reply text" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Save it as an assistant message" what="Your app adds the reply to the list as an assistant message. Next turn it sends the whole list again, back to step 1." accent={ACCENT} active={at(4)}>
                <p className="text-sm">
                  The roles are only tokens. Models are trained to give the system prompt more weight than the user, but it is a learned habit, not a hard rule, so a determined user message can still override it.
                </p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Hosted APIs hide the template: Anthropic takes the system prompt as a separate parameter, and OpenAI&rsquo;s newer models call it the developer message. Underneath, it is still one string.
                </p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
