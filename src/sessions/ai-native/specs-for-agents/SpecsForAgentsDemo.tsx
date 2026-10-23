"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type Packet } from "@/components/system/SystemMap";
import { EMPTY, FULL, GOAL, PARTS, lint, outcome, specText, type Part, type Spec } from "@/lib/agentSpecs";

const ACCENT = "var(--native)";

export default function SpecsForAgentsDemo() {
  const [s, setS] = useState<Spec>(EMPTY);
  const [own, setOwn] = useState("Add rate limiting to login. Make it secure.");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (k: Part, v: boolean) => setS((c) => ({ ...c, [k]: v }));
  const o = outcome(s);
  const text = specText(s);
  const part = (id: Part) => PARTS.find((p) => p.id === id)!;

  const packets: Packet[] =
    stage === 0 ? hops("g", ["you", "agent"], { label: `${text.split(/\s+/).length}-word spec` })
    : stage === 1 ? hops("c", ["agent", "repo"], { label: s.context ? "opens login.ts" : "searches “login”", tone: s.context ? "good" : "bad" })
    : stage === 2 ? hops("t", ["agent", "tests"], { label: s.done ? "6th attempt → 429" : "it compiles", tone: s.done ? "good" : "bad" })
    : stage === 3 ? hops("d", ["agent", "repo"], { label: `${o.files} files, ${o.lines} lines`, tone: s.constraints && s.scope ? "good" : "bad" })
    : stage === 4 ? hops("r", ["repo", "review", "you"], { label: o.rounds > 1 ? `${o.rounds} review rounds` : "approved first time", tone: o.rounds > 1 ? "bad" : "good" })
    : [];

  const captions = [
    `Step 1: the agent gets the goal${PARTS.filter((p) => s[p.id]).length ? ` and ${PARTS.filter((p) => s[p.id]).map((p) => p.label.toLowerCase()).join(", ")}` : " and nothing else"}.`,
    s.context ? "Step 2: it opens the two files named in the spec." : `Step 2: ${part("context").missing}`,
    s.done ? "Step 3: it writes the test for the 6th attempt first, then makes it pass." : `Step 3: ${part("done").missing}`,
    s.constraints && s.scope ? "Step 4: it reuses the existing middleware and leaves everything else alone." : `Step 4: ${[!s.constraints && part("constraints").missing, !s.scope && part("scope").missing].filter(Boolean).join(" ")}`,
    o.rounds > 1 ? `Step 5: review sends it back ${o.rounds - 1} time${o.rounds > 2 ? "s" : ""}: ${o.reviewMin} min of your time on a ${o.lines}-line diff.` : `Step 5: approved first time: ${o.reviewMin} min reviewing a ${o.lines}-line diff.`,
  ];
  const caption = stage !== null ? captions[stage] : `${PARTS.filter((p) => s[p.id]).length} of 4 parts written: ${o.files} files, ${o.lines} lines, ${o.deps} new dependenc${o.deps === 1 ? "y" : "ies"}, ${o.rounds} review round${o.rounds === 1 ? "" : "s"}, ${o.works ? "works" : "doesn't do what you meant"}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Native · interactive"
        title="Writing specs for agents"
        blurb="“Add rate limiting to login” is a complete thought to you and an open question to a coding agent: which login, how strict, with what, and what else may it touch? Each gap gets filled with a guess. Add the four parts of a spec one at a time and watch the guesses disappear from the diff."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="You, the coding agent, the repository, the tests and code review"
                accent={ACCENT}
                chrome="split"
                nodes={[
                  { id: "you", label: "You", sub: `${o.reviewMin} min reviewing`, at: [10, 50], mobileAt: [50, 8], state: o.rounds > 1 ? "bad" : "good" },
                  { id: "agent", label: "Coding agent", sub: `${PARTS.filter((p) => s[p.id]).length}/4 spec parts`, at: [38, 50], mobileAt: [50, 36], state: "active" },
                  { id: "repo", label: "Repository", sub: `${o.files} files · ${o.lines} lines`, at: [66, 16], mobileAt: [24, 64], state: s.context && s.scope ? "good" : "bad" },
                  { id: "tests", label: "Tests", sub: o.test ? "new test passes" : "none written", at: [66, 84], mobileAt: [76, 64], state: o.test ? "good" : "bad" },
                  { id: "review", label: "Code review", sub: `${o.rounds} round${o.rounds === 1 ? "" : "s"}`, at: [88, 50], mobileAt: [50, 90], state: o.rounds > 1 ? "bad" : "good" },
                ]}
                links={[
                  { from: "you", to: "agent", label: "spec" },
                  { from: "agent", to: "repo", label: "edits" },
                  { from: "agent", to: "tests", label: "runs" },
                  { from: "repo", to: "review", label: "pull request" },
                  { from: "review", to: "you", label: "your time" },
                ]}
                packets={packets}
                aspect={1.6}
                mobileAspect={0.85}
              />
              <SpecCard s={s} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setS(EMPTY)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  One line
                </button>
                <button type="button" onClick={() => setS(FULL)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Full spec
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Agent working…">
                Hand it to the agent
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="State the goal, and why" what="One sentence on what should be true afterwards and the reason for it. The reason matters: “to stop password guessing” tells the agent that a limit per IP on failed attempts is the point, not a general request cap." accent={ACCENT} active={at(0)}>
                <p className="rounded-md bg-[var(--inset)] p-2 text-xs">{GOAL}</p>
              </FlowStep>
              <FlowArrow label="the spec" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Point at the code" what="Name the files and the existing pieces to reuse. Without them the agent searches, and the first file called login is as likely to be the admin login as the one you meant." accent={ACCENT} active={at(1)}>
                <PartToggle id="context" s={s} set={set} />
              </FlowStep>
              <FlowArrow label="where to work" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Say when it's done" what="Give the check that decides it: a behaviour and a command that proves it. An agent without one stops when the code compiles, with a limit it picked itself." accent={ACCENT} active={at(2)}>
                <PartToggle id="done" s={s} set={set} />
              </FlowStep>
              <FlowArrow label="a test to pass" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Say what not to do" what="Rules (reuse this, no new dependencies, keep the response shape) stop it solving the problem a different way. An out-of-scope line stops it improving things on the way, which turns a small diff into a long review." accent={ACCENT} active={at(3)}>
                <PartToggle id="constraints" s={s} set={set} />
                <PartToggle id="scope" s={s} set={set} />
              </FlowStep>
              <FlowArrow label="pull request" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Check the spec before you send it" what="The four parts are easy to spot in text: a file path, a “done when”, a “don't”, an “out of scope”. Paste a spec of your own; the checklist below reads the text you type." accent={ACCENT} active={at(4)}>
                <textarea value={own} onChange={(e) => setOwn(e.target.value)} rows={4} aria-label="Your spec" className="w-full rounded-md border border-[var(--line)] bg-[var(--inset)] p-2 text-xs" />
                <ul className="mt-2 grid gap-x-3 gap-y-0.5 text-xs sm:grid-cols-2">
                  {lint(own).map((x) => (
                    <li key={x.part.id} style={{ color: x.found ? "var(--good)" : "var(--bad)" }}>
                      {x.found ? "✓" : "✗"} {x.part.label.toLowerCase()}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-[var(--faint)]">What the agent does without each part is illustrative but typical; diff sizes and review minutes are estimates. The spec text and the checklist run for real.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function PartToggle({ id, s, set }: { id: Part; s: Spec; set: (k: Part, v: boolean) => void }) {
  const p = PARTS.find((x) => x.id === id)!;
  return (
    <div className="mt-1">
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={s[id]} onChange={(e) => set(id, e.target.checked)} className="h-4 w-4" style={{ accentColor: ACCENT }} />
        {p.label}
      </label>
      <p className="text-xs" style={{ color: s[id] ? "var(--text)" : "var(--bad)" }}>
        {s[id] ? p.text : `Without it: ${p.missing}`}
      </p>
    </div>
  );
}

function SpecCard({ s }: { s: Spec }) {
  const o = outcome(s);
  const full = outcome(FULL);
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="The spec the agent receives and what it produced">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">the spec</p>
      <pre className="mt-2 rounded-md bg-[var(--inset)] p-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words">{specText(s)}</pre>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-4 gap-y-0.5 font-mono text-[11px]">
        <span className="text-[var(--faint)]">result</span>
        <span className="text-right text-[var(--faint)]">this spec</span>
        <span className="text-right text-[var(--faint)]">full spec</span>
        {[
          ["files touched", o.files, full.files],
          ["lines changed", o.lines, full.lines],
          ["new dependencies", o.deps, full.deps],
          ["review rounds", o.rounds, full.rounds],
          ["your review time", `${o.reviewMin} min`, `${full.reviewMin} min`],
          ["does what you meant", o.works ? "yes" : "no", "yes"],
        ].map(([k, a, b]) => [
          <span key={`${k}a`} className="font-sans">
            {k}
          </span>,
          <span key={`${k}b`} className="text-right" style={{ color: String(a) === String(b) ? "var(--text)" : "var(--bad)" }}>
            {a}
          </span>,
          <span key={`${k}c`} className="text-right text-[var(--muted)]">
            {b}
          </span>,
        ])}
      </div>
    </section>
  );
}
