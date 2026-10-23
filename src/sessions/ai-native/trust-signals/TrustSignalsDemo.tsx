"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type Packet } from "@/components/system/SystemMap";
import { BIN_ACCURACY, CALIBRATION, CHECK_MIN, DISPLAYS, SAMPLES, TEST, calibrated, ece, level, readers, type Display, type Level } from "@/lib/trustSignals";

const ACCENT = "var(--native)";
const pct = (x: number) => `${Math.round(x * 100)}%`;
const TONE: Record<Level, string> = { High: "var(--good)", Medium: "var(--c2)", Low: "var(--bad)" };

export default function TrustSignalsDemo() {
  const [display, setDisplay] = useState<Display>("raw");
  const [sources, setSources] = useState(false);
  const [pick, setPick] = useState(1);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const s = SAMPLES[pick];
  const lvl = level(display, s.raw);
  const r = readers(display, sources);
  const eceRaw = ece(TEST, (a) => a.raw);
  const eceCal = ece(TEST, (a) => calibrated(a.raw));

  const packets: Packet[] =
    stage === 0 ? hops("q", ["user", "app", "docs"], { label: "question" })
    : stage === 1 ? hops("m", ["docs", "app", "model"], { label: "question + passage" })
    : stage === 2 ? hops("c", ["model", "calib"], { label: `says ${pct(s.raw)}` })
    : stage === 3 ? hops("l", ["calib", "app"], { label: display === "none" ? "not shown" : `${lvl} (${pct(display === "raw" ? s.raw : calibrated(s.raw))})` })
    : stage === 4 ? hops("a", ["app", "user"], { label: lvl === "High" || !lvl ? "acts on it" : "checks it", tone: s.correct ? "good" : lvl === "High" || !lvl ? "bad" : "good" })
    : [];

  const captions = [
    `Step 1: an employee asks “${s.q}” and the assistant finds the matching passage in the handbook.`,
    `Step 2: the model answers from the passage and says it is ${pct(s.raw)} sure.`,
    `Step 3: answers that said ${pct(s.raw)} were right ${pct(calibrated(s.raw))} of the time when people checked them.`,
    display === "none" ? "Step 4: no signal is shown, so this answer looks as sure as every other." : `Step 4: the answer is shown as ${lvl}${sources ? ", with a link to the passage" : ""}.`,
    `Step 5: ${!lvl || lvl === "High" ? "the reader acts on it" : "the reader checks it"}; the answer is ${s.correct ? "right" : "wrong"}. Over 200 answers, ${r.wrongActed} wrong ones are acted on.`,
  ];
  const caption = stage !== null ? captions[stage] : `${DISPLAYS.find((d) => d.id === display)!.label}${sources ? " + sources" : ""}: of 200 answers, ${r.wrong} are wrong; readers act on ${r.wrongActed} of those and spend ${Math.round(r.minutes)} minutes checking ${r.checked}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Native · interactive"
        title="Showing sources and confidence"
        blurb="An HR assistant answers policy questions, and about one answer in four is wrong. With no signal, employees act on all of them. A confidence label only helps if it matches how often answers are actually right, and a link to the policy passage makes checking cheap enough to do."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Employee, assistant, policy handbook, model and calibration table"
                accent={ACCENT}
                chrome="split"
                nodes={[
                  { id: "user", label: "Employee", sub: !lvl || lvl === "High" ? "acts on it" : "checks it", at: [11, 50], mobileAt: [50, 8], state: "active" },
                  { id: "app", label: "HR assistant", sub: sources ? "links sources" : "answer only", at: [38, 50], mobileAt: [50, 33], state: "active" },
                  { id: "docs", label: "Policy handbook", sub: "40 pages", at: [64, 16], mobileAt: [22, 58], state: "active" },
                  { id: "model", label: "Model", sub: `says ${pct(s.raw)}`, at: [64, 84], mobileAt: [78, 58], state: "active" },
                  { id: "calib", label: "Calibration", sub: `right ${pct(calibrated(s.raw))}`, at: [88, 50], mobileAt: [50, 88], state: display === "calibrated" ? "good" : "dim" },
                ]}
                links={[
                  { from: "user", to: "app", label: "question" },
                  { from: "app", to: "docs", label: "search" },
                  { from: "app", to: "model", label: "prompt" },
                  { from: "model", to: "calib", label: "stated confidence" },
                  { from: "calib", to: "app", label: "label", dim: display === "none" },
                ]}
                packets={packets}
                aspect={1.5}
                mobileAspect={0.8}
              />
              <AnswerCard pick={pick} setPick={setPick} display={display} sources={sources} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices label="Show" accent={ACCENT} value={display} onChange={setDisplay} options={DISPLAYS.map((d) => ({ id: d.id, label: d.label }))} />
              </div>
              <Toggle on={sources} set={setSources} label="Link each answer to its policy passage" />
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Answering…">
                Ask the assistant
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Answer from the handbook, and keep the passage" what="The assistant retrieves the policy passage before answering. Keeping it is what makes a source link possible: checking an answer becomes opening one paragraph instead of searching a 40-page handbook." accent={ACCENT} active={at(0)}>
                <Toggle on={sources} set={setSources} label="Link each answer to its policy passage" />
                <p className="font-mono text-xs text-[var(--muted)]">
                  one check: {sources ? `${CHECK_MIN.withSource} min (open the passage)` : `${CHECK_MIN.without} min (search the handbook)`}
                </p>
              </FlowStep>
              <FlowArrow label="question + passage" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Ask how sure the model is, and don't believe it yet" what="A model can state a confidence, or you can read one from its token probabilities. Either way it tends to be too sure: answers it calls 90%+ are right far less often than that. Plot stated against actual on answers people checked." accent={ACCENT} active={at(1)}>
                <Reliability />
              </FlowStep>
              <FlowArrow label="stated confidence" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Calibrate on answers people checked" what={`Take ${CALIBRATION.length} past answers that people marked right or wrong. Within each band of stated confidence, count how many were right; that share is the calibrated confidence. Measure the gap between stated and actual on new answers.`} accent={ACCENT} active={at(2)}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-4 gap-y-0.5 font-mono text-[11px]">
                  <span className="text-[var(--faint)]">model says</span>
                  <span className="text-right text-[var(--faint)]">answers</span>
                  <span className="text-right text-[var(--faint)]">actually right</span>
                  {BIN_ACCURACY.map((b) => [
                    <span key={`${b.lo}a`}>
                      {pct(b.lo)}–{pct(b.hi)}
                    </span>,
                    <span key={`${b.lo}b`} className="text-right">
                      {b.n}
                    </span>,
                    <span key={`${b.lo}c`} className="text-right">
                      {pct(b.acc)}
                    </span>,
                  ])}
                </div>
                <p className="mt-2 font-mono text-xs">
                  calibration error on 200 new answers: <span style={{ color: "var(--bad)" }}>{pct(eceRaw)}</span> stated → <span style={{ color: "var(--good)" }}>{pct(eceCal)}</span> calibrated
                </p>
              </FlowStep>
              <FlowArrow label="calibrated confidence" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Say it in words the reader can act on" what="“87.3%” invites false precision; three levels with a plain meaning work better. Pair each with an action: High, act on it; Medium or Low, open the source first. The labels are only honest if the numbers behind them are calibrated." accent={ACCENT} active={at(3)}>
                <Choices label="Show" accent={ACCENT} value={display} onChange={setDisplay} options={DISPLAYS.map((d) => ({ id: d.id, label: d.label }))} />
                <p className="mt-2 text-xs">{DISPLAYS.find((d) => d.id === display)!.one}</p>
              </FlowStep>
              <FlowArrow label="answer + label + source" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Count what readers do with it" what="Assume each reader acts on High answers (or on everything, when there is no label) and checks the rest. Count wrong answers acted on, checks made, and minutes spent. Calibration moves wrong answers into the checked pile; sources make the pile cheap to work through." accent={ACCENT} active={at(4)}>
                <Outcomes display={display} sources={sources} />
                <p className="mt-2 text-[11px] text-[var(--faint)]">The 600 answers are synthetic, drawn so the model is overconfident. Calibration, the error measure and every count run for real on them.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Toggle({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) {
  return (
    <label className="flex min-h-11 w-full items-center gap-2 text-sm">
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} className="h-4 w-4" style={{ accentColor: ACCENT }} />
      {label}
    </label>
  );
}

function AnswerCard({ pick, setPick, display, sources }: { pick: number; setPick: (i: number) => void; display: Display; sources: boolean }) {
  const s = SAMPLES[pick];
  const lvl = level(display, s.raw);
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="The answer as the employee sees it">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">questions · pick one</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {SAMPLES.map((x, i) => (
          <button key={x.q} type="button" aria-pressed={i === pick} onClick={() => setPick(i)} className="min-h-11 rounded-md border px-2.5 text-left text-xs" style={{ borderColor: i === pick ? ACCENT : "var(--line)", background: i === pick ? `color-mix(in srgb, ${ACCENT} 14%, transparent)` : "transparent" }}>
            {x.q}
          </button>
        ))}
      </div>
      <div className="mt-3 rounded-md bg-[var(--inset)] p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm">{s.a}</p>
          {lvl && (
            <span className="rounded px-1.5 py-0.5 font-mono text-[11px]" style={{ color: TONE[lvl], border: `1px solid ${TONE[lvl]}` }}>
              {lvl} confidence
            </span>
          )}
        </div>
        {sources && <p className="mt-2 border-l-2 pl-2 text-xs text-[var(--muted)]" style={{ borderColor: ACCENT }}>{s.source}</p>}
        <p className="mt-2 text-xs" style={{ color: s.correct ? "var(--good)" : "var(--bad)" }}>
          {s.correct ? "The answer is right." : sources ? "The answer is wrong, and the linked passage shows it." : "The answer is wrong."}
        </p>
      </div>
    </section>
  );
}

// Stated confidence against actual accuracy, per band, before and after calibration.
function Reliability() {
  return (
    <div className="space-y-1.5">
      {BIN_ACCURACY.map((b) => {
        const mid = (b.lo + b.hi) / 2;
        return (
          <div key={b.lo} className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2 font-mono text-[11px]">
            <span className="text-[var(--muted)]">says {pct(mid)}</span>
            <div className="relative h-4 rounded bg-[var(--track)]">
              <div className="absolute inset-y-0 left-0 rounded" style={{ width: `${b.acc * 100}%`, background: ACCENT, opacity: 0.8 }} />
              <div className="absolute inset-y-[-3px] w-0.5" style={{ left: `${mid * 100}%`, background: "var(--text)" }} />
            </div>
          </div>
        );
      })}
      <p className="text-[11px] text-[var(--faint)]">Bar: share actually right. Line: what the model said. Every bar falls short of its line.</p>
    </div>
  );
}

function Outcomes({ display, sources }: { display: Display; sources: boolean }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-x-3 gap-y-0.5 font-mono text-[11px]">
      <span className="text-[var(--faint)]">shown</span>
      <span className="text-right text-[var(--faint)]">wrong acted on</span>
      <span className="text-right text-[var(--faint)]">checks</span>
      <span className="text-right text-[var(--faint)]">minutes</span>
      {DISPLAYS.map((d) => {
        const x = readers(d.id, sources);
        const on = d.id === display;
        return [
          <span key={`${d.id}a`} style={{ fontWeight: on ? 600 : 400, color: on ? "var(--text)" : "var(--muted)" }}>
            {d.label}
          </span>,
          <span key={`${d.id}b`} className="text-right" style={{ color: x.wrongActed > 20 ? "var(--bad)" : "var(--text)" }}>
            {x.wrongActed}/{x.wrong}
          </span>,
          <span key={`${d.id}c`} className="text-right">
            {x.checked}
          </span>,
          <span key={`${d.id}d`} className="text-right">
            {Math.round(x.minutes)}
          </span>,
        ];
      })}
    </div>
  );
}
