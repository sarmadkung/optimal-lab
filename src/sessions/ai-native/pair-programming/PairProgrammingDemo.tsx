"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, Slider, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type Packet } from "@/components/system/SystemMap";
import { PHASES, STUDIES, TASKS, WEEK_HOURS, total, week, type Phase } from "@/lib/pairProgramming";

const ACCENT = "var(--native)";
const signed = (x: number) => `${x > 0 ? "+" : ""}${Math.round(x * 100)}%`;

export default function PairProgrammingDemo() {
  const [tid, setTid] = useState("bug");
  const [fam, setFam] = useState(50);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const t = TASKS.find((x) => x.id === tid)!;
  const hand = total(t.hand);
  const ai = total(t.ai);
  const w = week(fam / 100);
  const added = (["prompt", "wait", "review", "fix"] as Phase[]).reduce((s, p) => s + (t.ai[p] ?? 0), 0);
  const saved = (t.hand.write ?? 0) - (t.ai.write ?? 0) + ((t.hand.understand ?? 0) - (t.ai.understand ?? 0)) + ((t.hand.test ?? 0) - (t.ai.test ?? 0));

  const packets: Packet[] =
    stage === 0 ? hops("u", ["dev", "code"], { label: `${t.ai.understand} min reading` })
    : stage === 1 ? hops("p", ["dev", "editor", "ai"], { label: `${t.ai.prompt} min explaining` })
    : stage === 2 ? hops("o", ["ai", "editor", "dev"], { label: `${(t.ai.review ?? 0) + (t.ai.fix ?? 0)} min checking` })
    : stage === 3 ? hops("t", ["editor", "tests"], { label: `${t.ai.test} min testing` })
    : stage === 4 ? hops("r", ["tests", "dev"], { label: `${ai} vs ${hand} min`, tone: ai < hand ? "good" : "bad" })
    : [];

  const captions = [
    `Step 1: “${t.label}”: ${t.ai.understand} min understanding the code first${(t.hand.understand ?? 0) > (t.ai.understand ?? 0) ? `, instead of ${t.hand.understand} by hand` : ""}.`,
    `Step 2: ${t.ai.prompt} min explaining what is needed and what matters, then ${t.ai.wait} min waiting.`,
    `Step 3: ${t.ai.review} min reading the output and ${t.ai.fix} min fixing it, against ${t.hand.write} min writing it yourself.`,
    `Step 4: ${t.ai.test} min testing, as with hand-written code.`,
    `Step 5: ${ai} min with the assistant vs ${hand} by hand: ${signed(ai / hand - 1)}. ${t.why}`,
  ];
  const caption = stage !== null ? captions[stage] : `“${t.label}”: ${ai} min with AI vs ${hand} by hand (${signed(ai / hand - 1)}). A week that is ${fam}% familiar code: ${signed(w.change)}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Native · interactive"
        title="Pair programming with AI"
        blurb="An assistant writes code faster than you type. It also needs the context explained, makes you wait, and hands back code you must read and sometimes fix. Split five kinds of task into those phases and see which way each one tips, then weigh them by what your week is actually made of."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Developer, editor, assistant model, codebase and tests"
                accent={ACCENT}
                chrome="split"
                nodes={[
                  { id: "dev", label: "You", sub: `${ai} min with AI`, at: [10, 50], mobileAt: [50, 8], state: ai < hand ? "good" : "bad" },
                  { id: "editor", label: "Editor", sub: "AI chat + edits", at: [38, 50], mobileAt: [50, 36], state: "active" },
                  { id: "ai", label: "Assistant", sub: `${t.ai.wait} min waiting`, at: [66, 16], mobileAt: [24, 64], state: "active" },
                  { id: "code", label: "Codebase", sub: t.familiar ? "you know it well" : "new to you", at: [66, 84], mobileAt: [76, 64], state: "active" },
                  { id: "tests", label: "Tests", sub: `${t.ai.test} min`, at: [88, 50], mobileAt: [50, 90], state: "active" },
                ]}
                links={[
                  { from: "dev", to: "editor", label: "prompt / edits" },
                  { from: "editor", to: "ai", label: "context" },
                  { from: "dev", to: "code", label: "read" },
                  { from: "editor", to: "tests", label: "run" },
                  { from: "tests", to: "dev", label: "results" },
                ]}
                packets={packets}
                aspect={1.6}
                mobileAspect={0.85}
              />
              <TaskBars tid={tid} setTid={setTid} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices label="Task" accent={ACCENT} value={tid} onChange={setTid} options={TASKS.map((x) => ({ id: x.id, label: x.label }))} />
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Working…">
                Do it with the assistant
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Split the task into phases" what="Writing code is one phase of several. Understanding the problem, testing and, with an assistant, explaining, waiting, reading and fixing all take time too. Time saved typing only counts after the others are paid for." accent={ACCENT} active={at(0)}>
                <Choices label="Task" accent={ACCENT} value={tid} onChange={setTid} options={TASKS.map((x) => ({ id: x.id, label: x.label }))} />
              </FlowStep>
              <FlowArrow label="the request" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Pay to explain the context" what="The assistant knows common code, not your code. In a codebase you know well, describing the conventions, the edge cases and where things live can take longer than the fix itself." accent={ACCENT} active={at(1)}>
                <p className="font-mono text-xs">
                  explaining {t.ai.prompt} min · waiting {t.ai.wait} min
                </p>
              </FlowStep>
              <FlowArrow label="generated code" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Read and fix what comes back" what="Generated code looks finished, which is what makes it slow to review: the error is a missing convention, a wrong edge case, an invented helper. Reading carefully is the price of not writing; skipping the reading moves the cost to production." accent={ACCENT} active={at(2)}>
                <p className="font-mono text-xs">
                  adds {added} min (explain, wait, read, fix) · saves {saved} min (write, understand, test)
                </p>
              </FlowStep>
              <FlowArrow label="tests" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Weigh it by your week" what="New services, unfamiliar libraries and test writing tip towards the assistant; deep work in a mature codebase you know tips against it. The answer depends on the mix, so it differs between people on the same team." accent={ACCENT} active={at(3)}>
                <Slider label="Share of the week in familiar, mature code" value={fam} min={0} max={100} step={25} format={(v) => `${v}%`} onChange={setFam} accent={ACCENT} />
                <p className="mt-1 font-mono text-xs" style={{ color: w.change < 0 ? "var(--good)" : "var(--bad)" }}>
                  {WEEK_HOURS} hours of work by hand → {(w.ai / 60).toFixed(1)} hours with the assistant ({signed(w.change)})
                </p>
              </FlowStep>
              <FlowArrow label="measure" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Measure it, don't estimate it" what="Two randomized trials point in opposite directions, and their settings explain why. In the slower one, developers still felt faster afterwards. Time a few of your own tasks both ways before deciding where the assistant helps you." accent={ACCENT} active={at(4)}>
                <ul className="space-y-2 text-xs">
                  {STUDIES.map((s) => (
                    <li key={s.name} className="rounded-md bg-[var(--inset)] p-2">
                      <a href={s.href} className="font-semibold underline" target="_blank" rel="noreferrer">
                        {s.name}
                      </a>
                      <span className="block text-[var(--muted)]">{s.setting}</span>
                      <span className="mt-0.5 block" style={{ color: s.change > 0 ? "var(--bad)" : "var(--good)" }}>
                        {s.result}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Phase minutes are illustrative, chosen to fall between the two trials. Totals and the weekly mix are computed from them.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function TaskBars({ tid, setTid }: { tid: string; setTid: (id: string) => void }) {
  const max = Math.max(...TASKS.flatMap((t) => [total(t.hand), total(t.ai)]));
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Minutes per task by hand and with the assistant, by phase">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">minutes per task · pick one</p>
      <ul className="mt-3 space-y-2">
        {TASKS.map((t) => {
          const on = t.id === tid;
          return (
            <li key={t.id}>
              <button type="button" aria-pressed={on} onClick={() => setTid(t.id)} className="w-full rounded-md px-1.5 py-1.5 text-left" style={{ background: on ? `color-mix(in srgb, ${ACCENT} 12%, transparent)` : "transparent" }}>
                <span className="flex items-baseline justify-between gap-2 text-xs">
                  <span>{t.label}</span>
                  <span className="font-mono text-[11px]" style={{ color: total(t.ai) < total(t.hand) ? "var(--good)" : "var(--bad)" }}>
                    {total(t.hand)} → {total(t.ai)} min
                  </span>
                </span>
                <Stack parts={t.hand} max={max} label="by hand" />
                <Stack parts={t.ai} max={max} label="with AI" />
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px]">
        {PHASES.map((p) => (
          <span key={p.id}>
            <span style={{ color: p.color }}>■</span> {p.label}
          </span>
        ))}
      </p>
    </section>
  );
}

function Stack({ parts, max, label }: { parts: Partial<Record<Phase, number>>; max: number; label: string }) {
  return (
    <span className="mt-1 grid grid-cols-[3.75rem_minmax(0,1fr)] items-center gap-2">
      <span className="font-mono text-[10px] text-[var(--faint)]">{label}</span>
      <span className="flex h-2.5 overflow-hidden rounded bg-[var(--track)]">
        {PHASES.map((p) => (parts[p.id] ? <span key={p.id} className="block h-full" style={{ width: `${((parts[p.id] ?? 0) / max) * 100}%`, background: p.color }} /> : null))}
      </span>
    </span>
  );
}
