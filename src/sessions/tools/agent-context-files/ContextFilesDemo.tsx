"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { BLOATED, FIRST, FIXED, MISTAKES, PRICE_PER_M, SECTIONS, TURNS, evaluate, type SectionId } from "@/lib/contextFiles";

const ACCENT = "var(--tools)";

export default function ContextFilesDemo() {
  const [on, setOn] = useState<Set<SectionId>>(new Set(FIRST));
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const flip = (id: SectionId, v: boolean) =>
    setOn((cur) => {
      const next = new Set(cur);
      if (v) next.add(id);
      else next.delete(id);
      return next;
    });
  const r = evaluate(on);

  const toggle = (id: SectionId) => {
    const s = SECTIONS.find((x) => x.id === id)!;
    return (
      <div key={id}>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={on.has(id)} onChange={(e) => flip(id, e.target.checked)} className="h-4 w-4" style={{ accentColor: ACCENT }} />
          {s.title} <span className="font-mono text-[11px] text-[var(--faint)]">{s.tokens} tokens</span>
        </label>
        <p className="text-[11px] text-[var(--muted)]">
          {s.text}
          {s.note ? <span className="text-[var(--faint)]"> ({s.note})</span> : null}
        </p>
      </div>
    );
  };

  const nodes: MapNode[] = [
    { id: "repo", label: "pnpm monorepo", sub: "apps/web · packages/*", at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "file", label: "AGENTS.md", sub: `${r.tokens.toLocaleString("en-US")} tokens`, at: [50, 18], mobileAt: [75, 12], state: on.size === 0 ? "dim" : r.tokens > 2000 ? "wait" : "good" },
    { id: "nested", label: "Nested AGENTS.md", sub: on.has("nested") ? "in apps/web" : "none", at: [86, 18], mobileAt: [75, 42], state: on.has("nested") ? "good" : "dim" },
    { id: "agent", label: "Coding agent", sub: `${r.made.length} mistakes`, at: [50, 62], mobileAt: [25, 42], state: r.made.length ? "bad" : "good" },
    { id: "model", label: "Model", sub: `${(r.perSession / 1000).toFixed(0)}k extra tokens a session`, at: [14, 86], mobileAt: [25, 74], state: "active" },
    { id: "ci", label: "CI", sub: r.made.some((m) => m.n === 6 || m.n === 8) ? "fails" : "passes", at: [86, 86], mobileAt: [75, 74], state: r.made.some((m) => m.n === 6 || m.n === 8) ? "bad" : "good" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("s", ["repo", "file", "agent"], { label: on.size ? "read at start" : "nothing to read" })
    : stage === 1 ? hops("l", ["agent", "repo"], { label: on.has("layout") ? "packages/ui" : "guesses a folder", tone: on.has("layout") ? "good" : "bad" })
    : stage === 2 ? hops("c", ["file", "agent"], { label: on.has("styleguide") && on.has("conventions") ? "two rules disagree" : on.has("conventions") ? "named exports" : "no conventions", tone: on.has("conventions") && !on.has("styleguide") ? "good" : "bad" })
    : stage === 3 ? hops("t", ["agent", "model"], { label: `${r.tokens} tokens × ${TURNS} turns` })
    : stage === 4 ? [...(on.has("nested") ? hops("n", ["nested", "agent"], { label: "server components" }) : []), ...hops("ci", ["agent", "ci"], { label: "PR", tone: r.made.length ? "bad" : "good", start: 0.3 })]
    : [];

  const captions = [
    on.size ? `Step 1: the agent reads AGENTS.md (${r.tokens} tokens) before its first step.` : "Step 1: there's no context file; the agent learns the repo by guessing.",
    on.has("layout") && on.has("donttouch") ? "Step 2: it knows where shared components go and that the API client is generated." : "Step 2: it puts files where it guesses, and edits generated code.",
    on.has("styleguide") && on.has("conventions") ? "Step 3: the 2021 style guide says default exports and moment; Conventions says the opposite. It follows either." : on.has("conventions") ? "Step 3: it uses named exports and the existing date helper." : "Step 3: it follows whatever it saw last.",
    `Step 4: the file is sent with every request: ${r.perSession.toLocaleString("en-US")} extra tokens over a ${TURNS}-turn session.`,
    `Step 5: ${r.prevented} of ${MISTAKES.length} likely mistakes prevented.`,
  ];
  const caption = stage !== null ? captions[stage] : `${r.prevented} of ${MISTAKES.length} mistakes prevented · ${r.tokens.toLocaleString("en-US")} tokens on every turn · ${r.contradicted.length ? "two rules contradicted by old docs" : "no contradictions"}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="Tools · interactive"
        title="Rules and context files"
        blurb="Coding agents read a file at the start of every session (AGENTS.md, CLAUDE.md, .cursor/rules) to learn how your repo works. Nine mistakes are likely in a monorepo the agent has never seen. Write the file section by section and see which mistakes each one prevents, what each costs on every turn, and what happens when you paste in old docs."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="The monorepo, its AGENTS.md, a nested AGENTS.md, the coding agent, the model and CI"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "repo", to: "file", label: "root" },
                  { from: "file", to: "agent", label: "every session" },
                  { from: "nested", to: "agent", label: "in apps/web", dim: !on.has("nested") },
                  { from: "agent", to: "model", label: "every turn" },
                  { from: "agent", to: "ci", label: "PR" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <Mistakes on={on} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setOn(new Set(FIRST))} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  No file
                </button>
                <button type="button" onClick={() => setOn(new Set(BLOATED))} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Everything pasted in
                </button>
                <button type="button" onClick={() => setOn(new Set(FIXED))} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Short and specific
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Working…">
                Run a session
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Start with the commands" what="How to install, test one package, and check the work is done. These are the instructions an agent needs on every task, and the ones it otherwise guesses from the most popular tool." accent={ACCENT} active={at(0)}>
                {toggle("commands")}
              </FlowStep>
              <FlowArrow label="how to run things" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Say where things live, and what not to edit" what="A short map of the repo, and the files that are generated or owned elsewhere. Agents happily edit a generated file; the next generation step undoes it." accent={ACCENT} active={at(1)}>
                {toggle("layout")}
                {toggle("donttouch")}
              </FlowStep>
              <FlowArrow label="where to work" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Write conventions once, and only current ones" what="The rules a reviewer would otherwise repeat on every PR. Pasting an old style guide alongside adds contradictions: two rules that disagree are followed at random." accent={ACCENT} active={at(2)}>
                {toggle("conventions")}
                {toggle("workflow")}
                {toggle("styleguide")}
              </FlowStep>
              <FlowArrow label="every turn" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Cut what doesn't change behaviour" what={`The file is sent with every request. History and background cost tokens on every turn and prevent nothing. Prompt caching makes repeats cheaper (here $${PRICE_PER_M.cached} instead of $${PRICE_PER_M.fresh} per million) but not free, and long files still crowd the context.`} accent={ACCENT} active={at(3)}>
                {toggle("history")}
                <p className="mt-1 font-mono text-[11px]">
                  {r.perSession.toLocaleString("en-US")} tokens a session · ${r.cost.fresh.toFixed(3)} fresh, ${r.cost.cached.toFixed(3)} cached
                </p>
              </FlowStep>
              <FlowArrow label="per package" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Put package rules next to the package" what="Rules that only apply in one folder go in a file in that folder; agents load it when they work there. The root file stays short." accent={ACCENT} active={at(4)}>
                {toggle("nested")}
                <p className="mt-1 text-xs">
                  {r.prevented} of {MISTAKES.length} mistakes prevented
                </p>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Which mistakes an unguided agent makes is illustrative. Which section covers which mistake, the contradiction and the token counts run here.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Mistakes({ on }: { on: Set<SectionId> }) {
  const r = evaluate(on);
  const made = new Set(r.made.map((m) => m.n));
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Likely mistakes and which are prevented">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">likely mistakes</p>
        <p className="font-mono text-xs" style={{ color: made.size ? "var(--bad)" : "var(--good)" }}>
          {r.prevented}/{MISTAKES.length} prevented
        </p>
      </div>
      <ul className="mt-3 space-y-1 text-xs">
        {MISTAKES.map((m) => {
          const by = SECTIONS.find((s) => on.has(s.id) && s.covers.includes(m.n));
          const contradicted = r.contradicted.includes(m.n);
          return (
            <li key={m.n} className="flex gap-2">
              <span className="font-mono" style={{ color: made.has(m.n) ? "var(--bad)" : "var(--good)" }} aria-hidden>
                {made.has(m.n) ? "✕" : "✓"}
              </span>
              <span className="min-w-0">
                {m.text}
                <span className="text-[11px] text-[var(--faint)]">{contradicted ? " · old style guide says otherwise" : by ? ` · ${by.title}` : ""}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
