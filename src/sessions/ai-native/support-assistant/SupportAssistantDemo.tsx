"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type Packet } from "@/components/system/SystemMap";
import { ARTICLES, KIND_LABEL, MANUAL_HOURS, MIN, MIX, MODES, OUTCOME_LABEL, PER_DAY, RETRIEVALS, day, type Design, type Mode, type Outcome, type Retrieval } from "@/lib/supportAssistant";

const ACCENT = "var(--native)";
const COLOR: Record<Outcome, string> = { noDraft: "var(--muted)", goodDraft: "var(--good)", badCaught: "var(--c2)", badSent: "var(--bad)", autoGood: "var(--c1)", autoBad: "var(--c4)" };
const START: Design = { retrieval: "none", grounded: false, mode: "draft" };

export default function SupportAssistantDemo() {
  const [d, setD] = useState<Design>(START);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const x = day(d);
  const saved = MANUAL_HOURS - x.agentHours;

  const packets: Packet[] =
    stage === 0 ? hops("t", ["customer", "desk"], { label: `${PER_DAY.toLocaleString("en-US")} tickets` })
    : stage === 1 ? (d.retrieval === "none" ? [] : hops("r", ["desk", "index", "desk"], { label: "top 3 articles" }))
    : stage === 2 ? hops("m", ["desk", "model", "desk"], { label: d.grounded ? `${PER_DAY - x.by.noDraft} drafts` : "2,000 drafts", tone: d.grounded ? "good" : "bad" })
    : stage === 3 ? (d.mode === "auto" ? hops("a", ["desk", "customer"], { label: `${x.autoSent} auto-sent`, tone: x.by.autoBad > 20 ? "bad" : "good" }) : hops("ag", ["desk", "agent", "customer"], { label: "approved replies" }))
    : stage === 4 ? hops("s", ["agent", "desk"], { label: `${Math.round(x.agentHours)} agent hours`, tone: saved > 0 ? "good" : "bad" })
    : [];

  const captions = [
    `Step 1: ${PER_DAY.toLocaleString("en-US")} tickets a day: ${MIX.map((m) => `${m.n} ${KIND_LABEL[m.k]}`).join(", ")}.`,
    d.retrieval === "none" ? "Step 2: nothing is retrieved; the model knows nothing about this product." : `Step 2: ${RETRIEVALS.find((r) => r.id === d.retrieval)!.label.toLowerCase()} over ${ARTICLES} help articles returns the top 3 for each ticket.`,
    d.grounded ? `Step 3: drafts are written only from a retrieved article, with a link to it; ${x.by.noDraft} tickets get no draft.` : "Step 3: every ticket gets a draft, whether or not an article was found.",
    d.mode === "auto" ? `Step 4: ${x.autoSent} confident drafts go straight to customers, ${x.by.autoBad} of them wrong; account tickets always go to an agent.` : "Step 4: an agent reads every draft, approves, edits or rewrites it, and does any account action.",
    `Step 5: ${Math.round(x.agentHours)} agent hours a day against ${Math.round(MANUAL_HOURS)} by hand, ${x.wrongSent} wrong replies sent, $${Math.round(x.cost)} of model calls.`,
  ];
  const caption = stage !== null ? captions[stage] : `${Math.round(x.agentHours)} agent hours a day (${saved >= 0 ? `${Math.round(saved)} saved` : `${Math.round(-saved)} more than by hand`}) · ${x.wrongSent} wrong replies sent · $${Math.round(x.cost)} a day.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Native · case study"
        title="A support reply assistant"
        blurb={`Design an assistant that drafts replies to ${PER_DAY.toLocaleString("en-US")} support tickets a day from ${ARTICLES} help articles. Agents should spend less time, and customers should not get wrong answers. Drafts the agent has to throw away cost more than no draft at all, so retrieval and when to stay silent matter more than the model.`}
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Customers, helpdesk, help centre index, model and support agents"
                accent={ACCENT}
                chrome="split"
                nodes={[
                  { id: "customer", label: "Customers", sub: `${x.wrongSent} wrong replies`, at: [10, 50], mobileAt: [50, 8], state: x.wrongSent > 20 ? "bad" : "good" },
                  { id: "desk", label: "Helpdesk", sub: `${PER_DAY.toLocaleString("en-US")} / day`, at: [38, 50], mobileAt: [50, 36], state: "active" },
                  { id: "index", label: "Help centre index", sub: d.retrieval === "none" ? "not used" : `${ARTICLES} articles`, at: [66, 16], mobileAt: [24, 64], state: d.retrieval === "none" ? "dim" : "active" },
                  { id: "model", label: "Model", sub: d.grounded ? "sources only" : "answers anything", at: [66, 84], mobileAt: [76, 64], state: d.grounded ? "good" : "wait" },
                  { id: "agent", label: "Agents", sub: `${Math.round(x.agentHours)} h / day`, at: [88, 50], mobileAt: [50, 90], state: saved > 0 ? "good" : "bad" },
                ]}
                links={[
                  { from: "customer", to: "desk", label: "ticket" },
                  { from: "desk", to: "index", label: "search", dim: d.retrieval === "none" },
                  { from: "desk", to: "model", label: "ticket + articles" },
                  { from: "desk", to: "agent", label: "draft" },
                ]}
                packets={packets}
                aspect={1.6}
                mobileAspect={0.85}
              />
              <DayView d={d} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(START)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Model only
                </button>
                <button type="button" onClick={() => setD({ retrieval: "hybrid", grounded: true, mode: "draft" })} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Grounded drafts
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Running the day…">
                Run a day of tickets
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Know what kinds of ticket arrive" what="Sample a few hundred tickets and sort them: questions the help centre answers, requests that need someone to act on an account, and questions nothing covers. Each kind needs a different path, and only the first can be answered by a draft alone." accent={ACCENT} active={at(0)}>
                <ul className="space-y-0.5 font-mono text-xs">
                  {MIX.map((m) => (
                    <li key={m.k}>
                      {m.n} · {KIND_LABEL[m.k]} ({Math.round((m.n / PER_DAY) * 100)}%)
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  By hand: {MIN.manual} min a ticket, plus {MIN.action} min for an account action: {Math.round(MANUAL_HOURS)} agent hours a day.
                </p>
              </FlowStep>
              <FlowArrow label="ticket text" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Find the articles that answer it" what="The model knows nothing about your refund policy or your plans; the help centre does. Retrieval decides how many tickets can get a correct draft at all. Customers describe problems in their own words, so keyword search alone misses many." accent={ACCENT} active={at(1)}>
                <Choices label="Retrieval" accent={ACCENT} value={d.retrieval} onChange={(v: Retrieval) => set({ retrieval: v })} options={RETRIEVALS.map((r) => ({ id: r.id, label: r.label }))} />
                <p className="mt-2 text-xs">{RETRIEVALS.find((r) => r.id === d.retrieval)!.one}</p>
              </FlowStep>
              <FlowArrow label="ticket + top 3 articles" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Draft only from the articles, and say when you can't" what={`A wrong draft costs the agent more than no draft: ${MIN.rewrite} min to read and rewrite against ${MIN.manual} to just write it. Tell the model to answer only from the retrieved articles, cite the one it used, and return “no draft” when none covers the question.`} accent={ACCENT} active={at(2)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.grounded} onChange={(e) => set({ grounded: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Draft only from retrieved articles, with a citation
                </label>
              </FlowStep>
              <FlowArrow label="draft + source" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Decide who presses send" what="With an approve button, an agent reads every draft: slow, and agents still wave through a few wrong ones. Auto-sending confident drafts frees hours, and sends the wrong ones the model was sure of. Account requests always need a person to act." accent={ACCENT} active={at(3)}>
                <Choices label="Sending" accent={ACCENT} value={d.mode} onChange={(v: Mode) => set({ mode: v })} options={MODES.map((m) => ({ id: m.id, label: m.label }))} />
              </FlowStep>
              <FlowArrow label="replies" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Count agent hours, wrong replies and cost" what="The assistant is worth it if agent hours fall and wrong replies don't rise. Track both every day, by ticket kind, with the drafts agents rewrote as the next batch of eval cases." accent={ACCENT} active={at(4)}>
                <Compare d={d} />
                <p className="mt-2 text-[11px] text-[var(--faint)]">Tickets, retrieval hits and draft quality are seeded and illustrative; minutes per action and prices are estimates. Every count, the hours and the cost run for real.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function DayView({ d }: { d: Design }) {
  const x = day(d);
  const keys = (Object.keys(OUTCOME_LABEL) as Outcome[]).filter((k) => x.by[k] > 0);
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="What happened to a day of tickets">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">one day · {PER_DAY.toLocaleString("en-US")} tickets</p>
        <p className="font-mono text-xs">${Math.round(x.cost)} of model calls</p>
      </div>
      <div className="mt-3 flex h-5 overflow-hidden rounded">
        {keys.map((k) => (
          <div key={k} style={{ width: `${(x.by[k] / PER_DAY) * 100}%`, background: COLOR[k] }} />
        ))}
      </div>
      <ul className="mt-3 space-y-0.5 text-xs">
        {(Object.keys(OUTCOME_LABEL) as Outcome[]).map((k) => (
          <li key={k} className="flex justify-between gap-2" style={{ color: x.by[k] ? "var(--text)" : "var(--faint)" }}>
            <span>
              <span style={{ color: COLOR[k] }}>■</span> {OUTCOME_LABEL[k]}
            </span>
            <span className="font-mono">{x.by[k]}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-md bg-[var(--inset)] p-2">
          <p className="font-mono text-lg" style={{ color: x.agentHours < MANUAL_HOURS ? "var(--good)" : "var(--bad)" }}>
            {Math.round(x.agentHours)} h
          </p>
          <p className="text-[11px] text-[var(--muted)]">agent time (by hand: {Math.round(MANUAL_HOURS)} h)</p>
        </div>
        <div className="rounded-md bg-[var(--inset)] p-2">
          <p className="font-mono text-lg" style={{ color: x.wrongSent > 20 ? "var(--bad)" : "var(--good)" }}>
            {x.wrongSent}
          </p>
          <p className="text-[11px] text-[var(--muted)]">wrong replies sent</p>
        </div>
      </div>
    </section>
  );
}

function Compare({ d }: { d: Design }) {
  const rows: { label: string; d: Design }[] = [
    { label: "Model only, agent approves", d: { retrieval: "none", grounded: false, mode: "draft" } },
    { label: "Hybrid search, drafts everything", d: { retrieval: "hybrid", grounded: false, mode: "draft" } },
    { label: "Hybrid, grounded, agent approves", d: { retrieval: "hybrid", grounded: true, mode: "draft" } },
    { label: "Hybrid, grounded, auto-send", d: { retrieval: "hybrid", grounded: true, mode: "auto" } },
    { label: "Your design", d },
  ];
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-x-3 gap-y-0.5 font-mono text-[11px]">
      <span className="text-[var(--faint)]">design</span>
      <span className="text-right text-[var(--faint)]">hours</span>
      <span className="text-right text-[var(--faint)]">wrong</span>
      <span className="text-right text-[var(--faint)]">$/day</span>
      {rows.map((r) => {
        const x = day(r.d);
        return [
          <span key={`${r.label}a`} className="font-sans" style={{ fontWeight: r.label === "Your design" ? 600 : 400 }}>
            {r.label}
          </span>,
          <span key={`${r.label}b`} className="text-right">
            {Math.round(x.agentHours)}
          </span>,
          <span key={`${r.label}c`} className="text-right" style={{ color: x.wrongSent > 20 ? "var(--bad)" : "var(--text)" }}>
            {x.wrongSent}
          </span>,
          <span key={`${r.label}d`} className="text-right">
            {Math.round(x.cost)}
          </span>,
        ];
      })}
    </div>
  );
}
