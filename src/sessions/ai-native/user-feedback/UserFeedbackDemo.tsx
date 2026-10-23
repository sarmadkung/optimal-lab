"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type Packet } from "@/components/system/SystemMap";
import { EXAMPLES, SIGNALS, TRUE_GOOD, analyse, editRatio, type Signal } from "@/lib/userFeedback";

const ACCENT = "var(--native)";
const NS = [200, 1000, 2000, 5000];
const pct = (x: number, d = 0) => `${(x * 100).toFixed(d)}%`;

export default function UserFeedbackDemo() {
  const [n, setN] = useState(1000);
  const [sig, setSig] = useState<Signal>("thumbs");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const x = analyse(sig, n);
  const s = SIGNALS.find((k) => k.id === sig)!;
  const thumbs = analyse("thumbs", n);
  const found = SIGNALS.filter((k) => analyse(k.id, n).detected).map((k) => k.label.toLowerCase());

  const packets: Packet[] =
    stage === 0 ? hops("d", ["user", "ui"], { label: "draft shown" })
    : stage === 1 ? hops("t", ["ui", "log"], { label: `thumbs on ${pct(thumbs.coverage, 1)}`, tone: "bad" })
    : stage === 2 ? hops("e", ["ui", "log"], { label: "sent text vs draft", tone: "good" })
    : stage === 3 ? hops("r", ["ui", "log"], { label: "regenerate · abandon" })
    : stage === 4 ? hops("a", ["log", "stats", "exp"], { label: found.length ? `B wins on ${found.length}` : "no clear winner", tone: found.length ? "good" : "bad" })
    : [];

  const captions = [
    `Step 1: ${n.toLocaleString("en-US")} people per version get an AI draft of their reply; version B's drafts are truly a little better (${pct(TRUE_GOOD.B)} good vs ${pct(TRUE_GOOD.A)}).`,
    `Step 2: ${pct(thumbs.coverage, 1)} of sessions get a thumb, mostly down: ${thumbs.nA + thumbs.nB} votes in total.`,
    "Step 3: the text people actually send is compared with the draft, word by word.",
    "Step 4: every session also records whether people regenerated or gave up and sent nothing.",
    found.length ? `Step 5: at ${n.toLocaleString("en-US")} sessions per version, B is significantly better on ${found.join(", ")}.` : `Step 5: at ${n.toLocaleString("en-US")} sessions per version, no signal can tell A and B apart yet.`,
  ];
  const caption = stage !== null ? captions[stage] : `${s.label}: on ${pct(x.coverage, 1)} of sessions, tracks real quality at r = ${x.quality.toFixed(2)}; ${x.detected ? `shows B is better (p = ${x.p.toFixed(3)})` : `can't separate A and B (p = ${x.p.toFixed(2)})`} at ${n.toLocaleString("en-US")} per version.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Native · interactive"
        title="Collecting user feedback"
        blurb="A reply drafter ships with thumbs up and down. Two people in a hundred click them, mostly when annoyed. Meanwhile everyone edits the draft, regenerates it or gives up, and those actions say more. Log them all, then see which signal can tell a better prompt from a worse one, and how many sessions it needs."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="User, draft interface, event log, analysis and the A/B experiment"
                accent={ACCENT}
                chrome="split"
                nodes={[
                  { id: "user", label: "Support agent", sub: "edits, sends", at: [10, 50], mobileAt: [50, 8], state: "active" },
                  { id: "ui", label: "Draft box", sub: "thumbs · retry · send", at: [36, 50], mobileAt: [50, 33], state: "active" },
                  { id: "log", label: "Event log", sub: "every action", at: [62, 16], mobileAt: [24, 60], state: "active" },
                  { id: "stats", label: "Analysis", sub: `${n.toLocaleString("en-US")} / version`, at: [88, 50], mobileAt: [76, 60], state: "active" },
                  { id: "exp", label: "A vs B", sub: found.length ? "B wins" : "undecided", at: [62, 84], mobileAt: [50, 88], state: found.length ? "good" : "wait" },
                ]}
                links={[
                  { from: "user", to: "ui", label: "draft" },
                  { from: "ui", to: "log", label: "events" },
                  { from: "log", to: "stats", label: "sessions" },
                  { from: "stats", to: "exp", label: "result" },
                ]}
                packets={packets}
                aspect={1.5}
                mobileAspect={0.8}
              />
              <Signals n={n} sig={sig} setSig={setSig} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices label="Sessions per version" accent={ACCENT} value={String(n)} onChange={(v) => setN(Number(v))} options={NS.map((k) => ({ id: String(k), label: k.toLocaleString("en-US") }))} />
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Collecting…">
                Run the experiment
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Log every action, not just the rating" what="Record each draft with its prompt version, and every action on it: shown, thumbed, regenerated, edited, sent, closed. Store the sent text next to the draft. Signals you didn't log can't be analysed later." accent={ACCENT} active={at(0)}>
                <ul className="space-y-0.5 font-mono text-[11px] text-[var(--muted)]">
                  <li>draft_shown {"{ id, version, text }"}</li>
                  <li>thumb {"{ id, up | down }"}</li>
                  <li>regenerate {"{ id }"}</li>
                  <li>sent {"{ id, text }"}  ·  closed {"{ id }"}</li>
                </ul>
              </FlowStep>
              <FlowArrow label="events" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Thumbs are rare and lopsided" what="Most people never click. Those who do are mostly unhappy, so the share of thumbs-down says little about the average draft. Keep the buttons for the comments people leave with them; don't steer by them alone." accent={ACCENT} active={at(1)}>
                <p className="font-mono text-xs">
                  {pct(thumbs.coverage, 1)} of sessions · {thumbs.nA + thumbs.nB} votes from {(n * 2).toLocaleString("en-US")} sessions
                </p>
              </FlowStep>
              <FlowArrow label="sent text" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Measure what people changed" what="Edit distance between the draft and what was sent, as a share of the words, shows up on nearly every session. A draft sent unchanged was right; one rewritten from scratch wasn't, whether or not anyone clicked a thumb." accent={ACCENT} active={at(2)}>
                <ul className="space-y-2 text-xs">
                  {EXAMPLES.map((e, i) => {
                    const r = editRatio(e.draft, e.sent);
                    return (
                      <li key={i} className="rounded-md bg-[var(--inset)] p-2">
                        <span className="block text-[var(--muted)]">draft: {e.draft}</span>
                        <span className="block">sent: {e.sent}</span>
                        <span className="mt-1 block font-mono text-[11px]" style={{ color: r.ratio < 0.2 ? "var(--good)" : "var(--bad)" }}>
                          {r.distance} words changed · {pct(r.ratio)} edited
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </FlowStep>
              <FlowArrow label="regenerate · abandon" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Count regenerations and abandons" what="A regenerate means “not this one”; closing without sending means “none of this helped”. Both are recorded for every session and need no effort from anyone; both are noisier than edits, because people also regenerate out of curiosity." accent={ACCENT} active={at(3)}>
                <p className="font-mono text-xs">
                  regenerate: A {pct(analyse("regen", n).a, 1)} · B {pct(analyse("regen", n).b, 1)} &nbsp; abandon: A {pct(analyse("abandon", n).a, 1)} · B {pct(analyse("abandon", n).b, 1)}
                </p>
              </FlowStep>
              <FlowArrow label="per version" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Compare versions on the signals you have" what="For each signal: how many sessions carry it, how well it tracks real quality, and whether B beats A by more than chance. Dense, implicit signals decide with a fifth of the traffic that thumbs need." accent={ACCENT} active={at(4)}>
                <Choices label="Sessions per version" accent={ACCENT} value={String(n)} onChange={(v) => setN(Number(v))} options={NS.map((k) => ({ id: String(k), label: k.toLocaleString("en-US") }))} />
                <p className="mt-2 text-[11px] text-[var(--faint)]">Sessions are synthetic: each draft has a hidden quality, and click, regenerate, edit and send rates depend on it. Edit distance, coverage, correlation and the tests (p &lt; 0.05) run for real.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Signals({ n, sig, setSig }: { n: number; sig: Signal; setSig: (s: Signal) => void }) {
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Each feedback signal: coverage, link to quality, and whether it can tell A from B">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">signals · {n.toLocaleString("en-US")} sessions per version</p>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-x-3 gap-y-1 text-xs">
        <span className="font-mono text-[11px] text-[var(--faint)]">signal</span>
        <span className="text-right font-mono text-[11px] text-[var(--faint)]">present</span>
        <span className="text-right font-mono text-[11px] text-[var(--faint)]">tracks quality</span>
        <span className="text-right font-mono text-[11px] text-[var(--faint)]">B better?</span>
        {SIGNALS.map((k) => {
          const x = analyse(k.id, n);
          const on = k.id === sig;
          return [
            <button key={`${k.id}a`} type="button" aria-pressed={on} onClick={() => setSig(k.id)} className="min-h-11 rounded px-1 text-left" style={{ background: on ? `color-mix(in srgb, ${ACCENT} 14%, transparent)` : "transparent" }}>
              {k.label}
              <span className="block text-[11px] text-[var(--muted)]">{k.one}</span>
            </button>,
            <span key={`${k.id}b`} className="self-center text-right font-mono">
              {pct(x.coverage, x.coverage < 0.1 ? 1 : 0)}
            </span>,
            <span key={`${k.id}c`} className="self-center text-right font-mono">
              r {x.quality.toFixed(2)}
            </span>,
            <span key={`${k.id}d`} className="self-center text-right font-mono" style={{ color: x.detected ? "var(--good)" : "var(--muted)" }}>
              {x.detected ? `yes, p ${x.p < 0.001 ? "< 0.001" : x.p.toFixed(3)}` : "can't tell"}
            </span>,
          ];
        })}
      </div>
    </section>
  );
}
