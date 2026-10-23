"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type Packet } from "@/components/system/SystemMap";
import { DESIGNS, OPERATORS, TASKS, chatSeq, taskTime, time, weekly, type Design } from "@/lib/chatVsEmbedded";

const ACCENT = "var(--native)";
const sec = (s: number) => `${s.toFixed(1)} s`;

export default function ChatVsEmbeddedDemo() {
  const [design, setDesign] = useState<Design>("chat");
  const [tid, setTid] = useState("categorize");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const t = TASKS.find((x) => x.id === tid)!;
  const tt = taskTime(t, design);
  const via = tt.via;
  const path = via === "inline" ? ["app", "inline", "model"] : via === "chat" ? ["app", "chat", "model"] : ["app"];

  const packets: Packet[] =
    stage === 0 ? hops("j", ["user", "app"], { label: t.label.toLowerCase() })
    : stage === 1 ? (via === "chat" ? hops("c", ["user", "app", "chat"], { label: `types ${t.chat.typed.length} chars` }) : via === "inline" ? hops("i", ["user", "app", "inline"], { label: "one click" }) : hops("h", ["user", "app"], { label: "by hand" }))
    : stage === 2 ? (path.length > 1 ? hops("m", path.slice(1), { label: via === "inline" ? "context included" : "only what was typed" }) : [])
    : stage === 3 ? (path.length > 1 ? hops("r", [...path].reverse(), { label: via === "inline" ? "in the field" : "answer to copy" }) : hops("r", ["app", "user"], { label: "reports page" }))
    : stage === 4 ? hops("d", ["app", "user"], { label: sec(tt.chosen), tone: tt.chosen <= Math.min(tt.chat, tt.embedded) + 0.05 ? "good" : "bad" })
    : [];

  const captions = [
    `Step 1: the job is “${t.label}”, about ${t.perWeek} times a week.`,
    via === "chat" ? `Step 2: in the chat panel the user types “${t.chat.typed}”.` : via === "inline" ? `Step 2: the user uses the ${t.embedded.control}.` : "Step 2: there is no AI control for this job, so the user does it by hand.",
    via === "chat" ? "Step 3: the model sees only what was typed." : via === "inline" ? "Step 3: the control sends the record it sits next to; the user typed nothing." : "Step 3: no model call.",
    via === "chat" ? "Step 4: the answer arrives in the chat panel; anything that belongs in the form, the user carries back by hand." : via === "inline" ? "Step 4: the result lands where it is used." : "Step 4: the user reads the result off the page.",
    `Step 5: ${sec(tt.chosen)} each time, ${((t.perWeek * tt.chosen) / 60).toFixed(1)} min a week for this job.`,
  ];
  const caption = stage !== null ? captions[stage] : `${DESIGNS.find((d) => d.id === design)!.label}: ${weekly(design).toFixed(1)} min a week across the five jobs; “${t.label.toLowerCase()}” takes ${sec(tt.chosen)} (${via}).`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Native · interactive"
        title="Chat vs embedded AI"
        blurb="An expense app adds AI. A chat panel can take any question, but the user has to describe the receipt they are looking at and copy the answer back. A button next to the field already knows the receipt. Time five real jobs both ways with the keystroke-level model, then weigh them by how often they happen."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="User, expense app, inline control, chat panel and model"
                accent={ACCENT}
                chrome="split"
                nodes={[
                  { id: "user", label: "User", sub: `${t.perWeek}× a week`, at: [11, 50], mobileAt: [50, 8], state: "active" },
                  { id: "app", label: "Expense app", sub: via === "by hand" ? "by hand" : "screen", at: [36, 50], mobileAt: [50, 32], state: "active" },
                  { id: "inline", label: "Inline control", sub: t.embedded.control ? "exists" : "none for this", at: [64, 16], mobileAt: [22, 60], state: via === "inline" ? "good" : design === "chat" || !t.embedded.control ? "dim" : "idle" },
                  { id: "chat", label: "Chat panel", sub: design === "embedded" ? "not built" : "any question", at: [64, 84], mobileAt: [78, 60], state: via === "chat" ? "active" : design === "embedded" ? "dim" : "idle" },
                  { id: "model", label: "Model", sub: via === "inline" ? "gets the record" : via === "chat" ? "gets the text" : "not used", at: [88, 50], mobileAt: [50, 88], state: via === "by hand" ? "dim" : "active" },
                ]}
                links={[
                  { from: "user", to: "app", label: "job" },
                  { from: "app", to: "inline", label: "record", dim: via !== "inline" },
                  { from: "app", to: "chat", label: "typed", dim: via !== "chat" },
                  { from: "inline", to: "model", label: "record + action", dim: via !== "inline" },
                  { from: "chat", to: "model", label: "message", dim: via !== "chat" },
                ]}
                packets={packets}
                aspect={1.5}
                mobileAspect={0.8}
              />
              <Jobs tid={tid} setTid={setTid} design={design} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices label="The app has" accent={ACCENT} value={design} onChange={setDesign} options={DESIGNS.map((d) => ({ id: d.id, label: d.label }))} />
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Working…">
                Do the job
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="List the jobs people come with, and how often" what="Start from what users already do in the app, not from what a model can do. A few jobs happen dozens of times a week; a long tail of questions happens once. That split decides the design more than the model does." accent={ACCENT} active={at(0)}>
                <Choices label="Job" accent={ACCENT} value={tid} onChange={setTid} options={TASKS.map((x) => ({ id: x.id, label: x.label }))} />
                <p className="mt-2 font-mono text-xs text-[var(--muted)]">about {t.perWeek} times a week</p>
              </FlowStep>
              <FlowArrow label="the job" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="In a chat, the user carries the context" what="The chat can't see the screen, so the user describes what they're looking at, waits, reads, and copies the answer back into the form. That is fine for a question nobody predicted, and slow for a job done forty times a week." accent={ACCENT} active={at(1)}>
                <p className="rounded-md bg-[var(--inset)] p-2 text-xs">“{t.chat.typed}”</p>
                <p className="mt-2 text-xs text-[var(--muted)]">{t.chat.note}</p>
              </FlowStep>
              <FlowArrow label="request" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Embedded, the context is already there" what="A control next to the data sends the record it belongs to, and puts the result where it is used. It only exists for jobs someone designed it for; for the rest the user is back to doing it by hand, or to a chat." accent={ACCENT} active={at(2)}>
                <p className="text-xs">{t.embedded.control ? <>Control: {t.embedded.control}.</> : <span className="text-[var(--bad)]">No control for this job.</span>}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{t.embedded.note}</p>
              </FlowStep>
              <FlowArrow label="result" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Time both with the keystroke-level model" what="Write each way down as operators: think (M), point (P), click (B), move a hand (H), type a key (K), plus waiting (R) and reading (W). Each has a standard time from the HCI literature, so two designs can be compared before anything is built." accent={ACCENT} active={at(3)}>
                <OpTable task={tid} />
              </FlowStep>
              <FlowArrow label="seconds × times a week" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Weigh by frequency, then decide" what="Inline controls win the frequent, well-defined jobs by a wide margin; a chat wins the questions nobody built a button for. Most products end up with both: controls for the top jobs, a chat for the long tail, and the chat's questions as the list of controls to build next." accent={ACCENT} active={at(4)}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 font-mono text-[11px]">
                  {DESIGNS.map((d) => [
                    <span key={`${d.id}a`} style={{ fontWeight: d.id === design ? 600 : 400, color: d.id === design ? "var(--text)" : "var(--muted)" }}>
                      {d.label}
                    </span>,
                    <span key={`${d.id}b`} className="text-right">
                      {weekly(d.id).toFixed(1)} min a week
                    </span>,
                  ])}
                </div>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Operator times from Card, Moran and Newell&apos;s keystroke-level model; the sequences and the frequencies are illustrative.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Jobs({ tid, setTid, design }: { tid: string; setTid: (id: string) => void; design: Design }) {
  const max = Math.max(...TASKS.map((t) => Math.max(taskTime(t, design).chat, taskTime(t, design).embedded)));
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Seconds per job, by chat and embedded">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">seconds per job</p>
        <p className="font-mono text-[11px]">
          <span style={{ color: "var(--c1)" }}>■ chat</span> <span style={{ color: ACCENT }}>■ embedded</span> <span className="text-[var(--faint)]">* by hand</span>
        </p>
      </div>
      <ul className="mt-3 space-y-1">
        {TASKS.map((t) => {
          const x = taskTime(t, design);
          const on = t.id === tid;
          return (
            <li key={t.id}>
              <button type="button" aria-pressed={on} onClick={() => setTid(t.id)} className="w-full rounded-md px-1.5 py-1.5 text-left" style={{ background: on ? `color-mix(in srgb, ${ACCENT} 12%, transparent)` : "transparent" }}>
                <span className="flex items-baseline justify-between gap-2 text-xs">
                  <span>{t.label}</span>
                  <span className="font-mono text-[11px] text-[var(--faint)]">{t.perWeek}×/wk</span>
                </span>
                <Bar v={x.chat} max={max} color="var(--c1)" />
                <Bar v={x.embedded} max={max} color={ACCENT} label={t.embedded.control ? undefined : "by hand"} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Bar({ v, max, color, label }: { v: number; max: number; color: string; label?: string }) {
  return (
    <span className="mt-1 grid grid-cols-[minmax(0,1fr)_4.5rem] items-center gap-2">
      <span className="h-2.5 rounded bg-[var(--track)]">
        <span className="block h-full rounded" style={{ width: `${(v / max) * 100}%`, background: color, opacity: label ? 0.45 : 1 }} />
      </span>
      <span className="text-right font-mono text-[11px]">
        {sec(v)}
        {label ? "*" : ""}
      </span>
    </span>
  );
}

function OpTable({ task }: { task: string }) {
  const t = TASKS.find((x) => x.id === task)!;
  const c = time(chatSeq(t));
  const e = time(t.embedded.seq);
  const ops = ["M", "P", "B", "H", "K", "R", "W"];
  const what: Record<string, string> = { ...Object.fromEntries(Object.entries(OPERATORS).map(([k, v]) => [k, `${v.what}, ${v.s} s`])), R: "wait for the system", W: "read the result" };
  return (
    <div className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto_auto] gap-x-3 gap-y-0.5 font-mono text-[11px]">
      <span />
      <span className="text-[var(--faint)]">operator</span>
      <span className="text-right text-[var(--faint)]">chat</span>
      <span className="text-right text-[var(--faint)]">{t.embedded.control ? "embedded" : "by hand"}</span>
      {ops.map((o) => [
        <span key={`${o}a`} style={{ color: ACCENT }}>
          {o}
        </span>,
        <span key={`${o}b`} className="min-w-0 font-sans text-[var(--muted)]">
          {what[o]}
        </span>,
        <span key={`${o}c`} className="text-right">
          {c.by[o] ? `${o === "R" || o === "W" ? "" : `${c.by[o].n}× `}${sec(c.by[o].s)}` : "–"}
        </span>,
        <span key={`${o}d`} className="text-right">
          {e.by[o] ? `${o === "R" || o === "W" ? "" : `${e.by[o].n}× `}${sec(e.by[o].s)}` : "–"}
        </span>,
      ])}
      <span />
      <span className="font-sans font-semibold">total</span>
      <span className="text-right font-semibold">{sec(c.total)}</span>
      <span className="text-right font-semibold">{sec(e.total)}</span>
    </div>
  );
}
