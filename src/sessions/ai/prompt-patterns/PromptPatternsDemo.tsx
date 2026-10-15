"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMapPanel } from "@/components/system/SystemMap";
import { ALL, NONE, PATTERNS, buildPrompt, checks, reply, words, type PatternId, type Patterns, type PromptPart } from "@/lib/promptPatterns";

const ACCENT = "var(--ai)";
const PART_COLOR: Record<PromptPart["pattern"], string> = {
  persona: "var(--c5)",
  task: "var(--text)",
  delimiters: "var(--c1)",
  checklist: "var(--c2)",
  plan: "var(--c4)",
  data: "var(--muted)",
};

export default function PromptPatternsDemo() {
  const [p, setP] = useState<Patterns>(NONE);
  const { stage, busy, run } = useWalk(5, 1100);
  const prompt = buildPrompt(p);
  const r = reply(p);
  const cs = checks(r);
  const passed = cs.filter((c) => c.pass).length;
  const at = (n: number) => stage === n;
  const preset = Object.values(p).every(Boolean) ? "all" : Object.values(p).every((v) => !v) ? "none" : null;
  const set = (id: PatternId, v: boolean) => setP((cur) => ({ ...cur, [id]: v }));
  const failing = cs.filter((c) => !c.pass);

  const captions = [
    p.persona ? "Step 1: a persona and the task. The persona sets a voice; it doesn't add knowledge." : "Step 1: just the task, in one line.",
    p.delimiters ? "Step 2: the email is fenced in <email> tags and marked as data." : "Step 2: the email is pasted straight after the task, so its last line reads like an order.",
    p.checklist ? "Step 3: the reply has a fixed shape and a word limit." : "Step 3: no shape given, so the model writes free prose.",
    p.plan ? "Step 4: the model lists every problem in <plan> tags before summarizing." : "Step 4: no plan; the summary starts writing straight away.",
    `Step 5: ${passed} of ${cs.length} checks pass.`,
  ];
  const caption =
    stage !== null
      ? captions[stage]
      : failing.length
        ? `${passed} of ${cs.length} checks pass. Failing: ${failing[0].label.toLowerCase()}. ${failing[0].why}`
        : `All ${cs.length} checks pass. ${p.persona ? "Turn the persona off: the checks stay the same." : ""}`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Engineering · interactive"
        title="Prompt patterns"
        blurb="One task: summarize a customer email for the support team. The email hides a second complaint in the middle and an instruction aimed at the AI at the end. Add delimiters, an output checklist, a plan-first step and a persona one at a time, and see which checks each one fixes."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5" aria-label="The prompt, the reply and the checks">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">Prompt</p>
              <div className="mt-2 space-y-1.5 rounded-lg bg-[var(--inset)] p-3 font-mono text-[12px] leading-relaxed">
                {prompt.map((part, i) => (
                  <p key={i} className="whitespace-pre-wrap break-words" style={{ color: PART_COLOR[part.pattern], borderLeft: part.pattern === "task" || part.pattern === "data" ? undefined : `2px solid ${PART_COLOR[part.pattern]}`, paddingLeft: part.pattern === "task" || part.pattern === "data" ? undefined : 8 }}>
                    {part.text}
                  </p>
                ))}
              </div>

              <p className="mt-4 font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">Reply · {words(r.text)} words</p>
              {r.plan && (
                <div className="mt-2 rounded-lg border border-dashed px-3 py-2 font-mono text-[11px]" style={{ borderColor: PART_COLOR.plan, color: "var(--muted)" }}>
                  <p>&lt;plan&gt; (your app strips this before showing the summary)</p>
                  <ol className="mt-1 list-decimal pl-5">
                    {r.plan.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ol>
                  <p>&lt;/plan&gt;</p>
                </div>
              )}
              <p className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-[var(--inset)] p-3 text-sm">{r.text}</p>

              <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
                {cs.map((c) => (
                  <li key={c.id} className="flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-xs" style={{ borderColor: c.pass ? "var(--good)" : "var(--bad)" }}>
                    <span className="shrink-0 font-mono" style={{ color: c.pass ? "var(--good)" : "var(--bad)" }}>
                      {c.pass ? "✓" : "✗"}
                    </span>
                    <span className="min-w-0">{c.label}</span>
                  </li>
                ))}
              </ul>
            </section>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices label="Start from" accent={ACCENT} value={preset} onChange={(id) => setP(id === "all" ? ALL : NONE)} options={[{ id: "none", label: "A bare prompt" }, { id: "all", label: "Every pattern" }]} />
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Building the prompt…">
                Build and send
              </RunButton>
              <p className="w-full font-mono text-sm">
                {passed}/{cs.length} checks pass
              </p>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="State the task" what="One clear sentence of what you want. A persona (“You are a senior support lead”) can go on top; it changes the voice of the reply." accent={ACCENT} active={at(0)}>
                <Toggle id="persona" p={p} set={set} label="Add a persona" />
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Research on thousands of questions found personas in the system prompt don&rsquo;t make answers more accurate (Zheng et al. 2024). Watch the checks: none of them change.
                </p>
              </FlowStep>
              <FlowArrow label="the task" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Fence the input with delimiters" what="Wrap pasted text in tags and say it is data. The model can then tell your instructions from the text it is working on." accent={ACCENT} active={at(1)}>
                <Toggle id="delimiters" p={p} set={set} label="Wrap the email in <email> tags" />
                <p className="mt-1 text-xs text-[var(--muted)]">
                  This makes injected instructions much less likely to work, not impossible. Anything the model can do with them (refunds, emails) still needs a check outside the model.
                </p>
              </FlowStep>
              <FlowArrow label="task + fenced data" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Spell out the output" what="Name every field you need and the limits: which lines, in what order, how long. “Summarize” alone leaves all of that to chance." accent={ACCENT} active={at(2)}>
                <Toggle id="checklist" p={p} set={set} label="Ask for four named lines, under 60 words" />
              </FlowStep>
              <FlowArrow label="the full prompt" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Ask for a plan first" what="Have the model list what it found before it writes the answer. The second complaint sits mid-email; a list catches it, a summary that starts writing at once tends to skip it." accent={ACCENT} active={at(3)}>
                <Toggle id="plan" p={p} set={set} label="List the problems in <plan> tags first" />
                <p className="mt-1 text-xs text-[var(--muted)]">The plan costs output tokens. Your app keeps it for logs and shows only the summary.</p>
              </FlowStep>
              <FlowArrow label="reply" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Check the reply with code" what="Each check is a few lines of code run on the reply. Change the prompt, run the checks again: that is how you know a pattern helped." accent={ACCENT} active={at(4)}>
                <ul className="space-y-1.5 text-sm">
                  {cs.map((c) => (
                    <li key={c.id}>
                      <span className="font-mono" style={{ color: c.pass ? "var(--good)" : "var(--bad)" }}>
                        {c.pass ? "✓" : "✗"}
                      </span>{" "}
                      {c.label}
                      <span className="block pl-5 text-xs text-[var(--faint)]">fixed by: {PATTERNS.find((x) => x.id === c.fixedBy)!.label.toLowerCase()}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-[var(--faint)]">The replies are written to show what each pattern typically changes, not captured from one model.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Toggle({ id, p, set, label }: { id: PatternId; p: Patterns; set: (id: PatternId, v: boolean) => void; label: string }) {
  return (
    <label className="flex min-h-11 items-center gap-2 text-sm">
      <input type="checkbox" checked={p[id]} onChange={(e) => set(id, e.target.checked)} className="h-4 w-4" style={{ accentColor: ACCENT }} />
      {label}
    </label>
  );
}
