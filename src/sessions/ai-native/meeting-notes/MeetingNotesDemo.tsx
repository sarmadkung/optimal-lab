"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type Packet } from "@/components/system/SystemMap";
import { ASR, ATTENDEES, DIRECTORY, LINES, MEETINGS_PER_MONTH, MINUTES, MODELS, REAL_ITEMS, nameOf, run, type Design, type ModelId } from "@/lib/meetingNotes";

const ACCENT = "var(--native)";
const START: Design = { diarize: false, model: "small", resolve: false, confirm: false };
const STATUS = {
  right: { label: "right owner", color: "var(--good)" },
  wrong: { label: "wrong person", color: "var(--bad)" },
  unassigned: { label: "no owner", color: "var(--c2)" },
  false: { label: "not an action", color: "var(--c4)" },
} as const;

export default function MeetingNotesDemo() {
  const [d, setD] = useState<Design>(START);
  const { stage, busy, run: walk } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const x = run(d);
  const good = x.right === REAL_ITEMS && !x.falseTasks;

  const packets: Packet[] =
    stage === 0 ? hops("a", ["audio", "asr"], { label: `${MINUTES} min audio` })
    : stage === 1 ? hops("t", ["asr", "model"], { label: d.diarize ? "transcript + speakers" : "transcript, no speakers", tone: d.diarize ? "good" : "bad" })
    : stage === 2 ? hops("i", ["model", "dir"], { label: `${x.tasks.length + (d.confirm ? x.falseTasks : 0)} items` })
    : stage === 3 ? hops("o", ["dir", "model"], { label: d.resolve ? "attendees first" : "first name match", tone: x.wrong ? "bad" : "good" })
    : stage === 4 ? hops("k", ["model", "tracker"], { label: `${x.tasks.length} tasks`, tone: good ? "good" : "bad" })
    : [];

  const captions = [
    `Step 1: a ${MINUTES}-minute meeting is transcribed in about ${Math.round(MINUTES * ASR.realtimeFactor)} minutes, for $${(MINUTES * ASR.perMin).toFixed(2)}.`,
    d.diarize ? "Step 2: speaker labels say who said each line, so “I'll draft it” has an owner." : "Step 2: no speaker labels: the transcript says “I'll draft the launch email” and not who said it.",
    `Step 3: the ${MODELS.find((m) => m.id === d.model)!.label.toLowerCase()} pulls out action items: ${REAL_ITEMS - x.missed.length} of ${REAL_ITEMS} real ones, plus ${LINES.filter((l) => !l.real && (d.model === "small" ? l.small : l.large)).length} remarks that only sound like actions.`,
    d.resolve ? "Step 4: names are matched against the meeting's attendees first, so “Sam” is the Sam who was there." : "Step 4: names are matched against the whole directory, and “Sam” becomes the first Sam in it, who wasn't in the meeting.",
    `Step 5: ${d.confirm ? "the host ticks the list in the recap, then " : ""}${x.tasks.length} tasks are created: ${x.right} right, ${x.wrong} for the wrong person, ${x.unassigned} without an owner, ${x.falseTasks} that aren't actions.`,
  ];
  const caption = stage !== null ? captions[stage] : `${x.right} of ${REAL_ITEMS} action items reach the right person · ${x.missed.length} missed · ${x.wrong + x.unassigned + x.falseTasks} wrong, ownerless or not real · $${x.perMeeting.toFixed(2)} a meeting.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Native · case study"
        title="Meeting notes and action items"
        blurb={`Design the feature that turns a recorded meeting into a recap and tasks in the tracker, for ${MEETINGS_PER_MONTH.toLocaleString("en-US")} meetings a month. A summary is easy to get roughly right. A task is not: it needs the right owner, and “I'll do it” or “Sam, can you…” only become one with speaker labels, the attendee list and a quick human check.`}
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Meeting audio, speech recognition, model, people directory and task tracker"
                accent={ACCENT}
                chrome="split"
                nodes={[
                  { id: "audio", label: "Audio", sub: `${MINUTES} min · ${ATTENDEES.length} people`, at: [10, 50], mobileAt: [50, 11], state: "active" },
                  { id: "asr", label: "Speech to text", sub: d.diarize ? "+ speaker labels" : "text only", at: [36, 16], mobileAt: [24, 34], state: d.diarize ? "good" : "wait" },
                  { id: "model", label: "Model", sub: `${x.tokensIn.toLocaleString("en-US")} tokens in`, at: [62, 50], mobileAt: [76, 34], state: "active" },
                  { id: "dir", label: "Directory", sub: d.resolve ? "attendees first" : "everyone", at: [36, 84], mobileAt: [24, 66], state: x.wrong ? "bad" : "good" },
                  { id: "tracker", label: "Task tracker", sub: `${x.tasks.length} tasks`, at: [88, 50], mobileAt: [76, 66], state: good ? "good" : "bad" },
                ]}
                links={[
                  { from: "audio", to: "asr", label: "audio" },
                  { from: "asr", to: "model", label: "transcript" },
                  { from: "model", to: "dir", label: "names" },
                  { from: "model", to: "tracker", label: "tasks" },
                ]}
                packets={packets}
                aspect={1.6}
                mobileAspect={0.95}
              />
              <Tasks d={d} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(START)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Transcript + small model
                </button>
                <button type="button" onClick={() => setD({ diarize: true, model: "large", resolve: true, confirm: true })} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Every step
                </button>
              </div>
              <RunButton busy={busy} onClick={walk} accent={ACCENT} running="Processing…">
                End the meeting
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Record and transcribe" what={`Speech recognition runs faster than real time: a ${MINUTES}-minute meeting is text in a few minutes. The transcript is about ${(MINUTES * 150).toLocaleString("en-US")} words, which fits in one model call; a three-hour workshop would need to be split.`} accent={ACCENT} active={at(0)}>
                <p className="font-mono text-xs">
                  ${(MINUTES * ASR.perMin).toFixed(2)} a meeting · ~{Math.round(MINUTES * ASR.realtimeFactor)} min to transcribe
                </p>
              </FlowStep>
              <FlowArrow label="audio" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Label who said what" what="Diarization splits the audio by voice and, matched with the calendar invite, names the speakers. Without it, every “I'll take that” is an action with no owner." accent={ACCENT} active={at(1)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.diarize} onChange={(e) => set({ diarize: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Label speakers
                </label>
                <ul className="space-y-0.5 text-xs">
                  {LINES.slice(0, 5).map((l) => (
                    <li key={l.id} className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-2">
                      <span className="font-mono text-[11px]" style={{ color: d.diarize ? ACCENT : "var(--faint)" }}>
                        {d.diarize ? l.speaker : "?"}
                      </span>
                      <span>{l.said}</span>
                    </li>
                  ))}
                </ul>
              </FlowStep>
              <FlowArrow label="transcript" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Pull out the action items" what="Ask for items with an owner, a task and a due date, quoting the line each came from. Smaller models miss actions that aren't phrased as one (“I can take triage this week”) and keep wishes that are (“we should revisit the logo someday”)." accent={ACCENT} active={at(2)}>
                <Choices label="Model" accent={ACCENT} value={d.model} onChange={(v: ModelId) => set({ model: v })} options={MODELS.map((m) => ({ id: m.id, label: m.label }))} />
                {x.missed.length > 0 && <p className="mt-2 text-xs text-[var(--bad)]">Missed: {x.missed.map((l) => `“${l.said}”`).join(" ")}</p>}
              </FlowStep>
              <FlowArrow label="items with names" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Turn names into people" what="“Sam” is a name; a task needs a user. The directory has two Sams, and the first one wasn't in the meeting. Look among the attendees from the invite before searching everyone." accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.resolve} onChange={(e) => set({ resolve: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Match names against the attendees first
                </label>
                <p className="font-mono text-[11px] text-[var(--muted)]">directory: {DIRECTORY.map((p) => p.name).join(" · ")}</p>
              </FlowStep>
              <FlowArrow label="tasks" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Let the host confirm, then create tasks" what="Send the recap to the meeting host with the items ticked; one tap removes a wish that isn't a task or fixes an owner. It adds a couple of minutes, once, instead of someone finding a task assigned to them that nobody gave them." accent={ACCENT} active={at(4)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.confirm} onChange={(e) => set({ confirm: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Host confirms the list before tasks are created
                </label>
                <p className="font-mono text-xs">
                  ${x.perMeeting.toFixed(2)} a meeting · ${Math.round(x.perMonth).toLocaleString("en-US")} a month · recap ~{x.minutesToRecap.toFixed(0)} min after the meeting
                </p>
                <p className="mt-2 text-[11px] text-[var(--faint)]">What each model extracts is illustrative; prices are typical list prices. Speaker attribution, the directory lookup, task creation, timing and cost run for real.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Tasks({ d }: { d: Design }) {
  const x = run(d);
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Tasks created in the tracker">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">tasks created</p>
        <p className="font-mono text-xs" style={{ color: x.right === REAL_ITEMS ? "var(--good)" : "var(--bad)" }}>
          {x.right}/{REAL_ITEMS} right
        </p>
      </div>
      <ul className="mt-3 space-y-1">
        {x.tasks.map((t) => (
          <li key={t.l.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2 text-xs">
            <span className="min-w-0">{t.l.said}</span>
            <span className="text-right font-mono text-[11px]" style={{ color: STATUS[t.status].color }}>
              {t.owners.length ? t.owners.map(nameOf).join(" + ") : "—"} · {STATUS[t.status].label}
            </span>
          </li>
        ))}
        {x.missed.map((l) => (
          <li key={l.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2 text-xs text-[var(--faint)] line-through">
            <span className="min-w-0">{l.said}</span>
            <span className="font-mono text-[11px] no-underline">missed</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
