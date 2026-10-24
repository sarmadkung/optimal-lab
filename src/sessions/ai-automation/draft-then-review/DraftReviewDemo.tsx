"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { FIRST, FIXED, PER_DAY, PROBLEM_LABEL, TICKETS, check, decide, runAll, type Design, type Outcome, type Route } from "@/lib/draftReview";

const ACCENT = "var(--auto)";
const COLOR: Record<Outcome, string> = { sent: "var(--good)", "sent-bad": "var(--bad)", fixed: "var(--c2)", blocked: "var(--c2)" };
const WORD: Record<Outcome, string> = { sent: "sent", "sent-bad": "sent with a mistake", fixed: "fixed by a person", blocked: "stuck in the hold queue" };

export default function DraftReviewDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [pick, setPick] = useState(2);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const t = TICKETS.find((x) => x.id === pick)!;
  const r = decide(t, d);
  const all = runAll(d);
  const flags = check(t);

  const nodes: MapNode[] = [
    { id: "tickets", label: "Ticket queue", sub: `${PER_DAY} a day`, at: [13, 18], mobileAt: [25, 12], state: "active" },
    { id: "model", label: "Model", sub: "drafts a reply", at: [50, 18], mobileAt: [75, 12], state: "active" },
    { id: "checks", label: "Code checks", sub: d.checks ? `${all.results.filter((x) => x.flags.length).length} of ${TICKETS.length} flagged` : "off", at: [87, 18], mobileAt: [75, 44], state: d.checks ? (r.flags.length ? "bad" : "good") : "dim" },
    { id: "person", label: "Reviewer", sub: d.route === "none" ? "nobody" : `${all.read} of ${TICKETS.length} · ${all.hoursPerDay} h/day`, at: [80, 80], mobileAt: [75, 80], state: r.seen ? "wait" : d.route === "none" ? "dim" : "idle" },
    { id: "customer", label: "Customer", sub: `${all.bad} bad replies`, at: [22, 80], mobileAt: [25, 80], state: r.outcome === "sent-bad" ? "bad" : r.outcome === "blocked" ? "idle" : "good" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("in", ["tickets", "model"], { label: `ticket ${t.id}` })
    : stage === 1 ? hops("dr", ["model", "checks"], { label: "draft" })
    : stage === 2 ? (r.seen ? hops("p", ["checks", "person"], { label: r.flags.length ? `${r.flags.length} flag` : t.risky ? "risky topic" : "review" }) : r.outcome === "blocked" ? [] : hops("a", ["checks", "customer"], { label: "auto-send", tone: t.problem ? "bad" : "good" }))
    : stage === 3 ? []
    : stage === 4 ? (r.outcome === "blocked" ? [] : hops("s", [r.seen ? "person" : "checks", "customer"], { label: r.outcome === "fixed" ? "corrected reply" : "reply", tone: r.outcome === "sent-bad" ? "bad" : "good" }))
    : [];

  const captions = [
    `Step 1: ticket ${t.id} (${t.topic}) from ${t.customer} reaches the model.`,
    `Step 2: the model drafts a reply${t.problem ? ` with a mistake: ${PROBLEM_LABEL[t.problem]}` : ""}.`,
    d.checks ? (r.flags.length ? `Step 3: the checks flag it: ${r.flags.join("; ")}.` : "Step 3: every check passes.") : "Step 3: no checks run.",
    r.seen ? `Step 4: a person reads it${d.context ? " next to the ticket" : " without the ticket"}.` : `Step 4: no person sees this one${d.route === "risky" && !t.risky ? " (not a risky topic)" : ""}.`,
    `Step 5: ${r.why}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${all.bad} of ${TICKETS.length} replies sent with a mistake · ${all.fixed} fixed by a person · ${all.blocked} stuck · a person reads ${all.read} (${all.hoursPerDay} hours a day at ${PER_DAY} tickets).`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Automation · interactive"
        title="Draft, then review"
        blurb="A model drafts replies to support tickets. Most are fine. Some refund more than the order cost, quote the wrong order, leave a [Customer name] in, link to someone else's site, promise next-day delivery, lecture the customer, or get a date wrong. Decide what code checks, what a person reads, and what they see while reading."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Ticket queue, the model, code checks, a reviewer and the customer"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "tickets", to: "model", label: "ticket" },
                  { from: "model", to: "checks", label: "draft" },
                  { from: "checks", to: "person", label: "review", dim: d.route === "none" },
                  { from: "checks", to: "customer", label: "auto-send", dim: d.route === "all" },
                  { from: "person", to: "customer", label: "approved", dim: d.route === "none" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.78}
              />
              <DraftList d={d} pick={pick} setPick={setPick} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Send everything
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Checks + risky topics to a person
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Reviewing…">
                {`Run ticket ${t.id}`}
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Draft from the ticket and the account" what="The model gets the customer's message and the facts from the account (the order, its total, the renewal date) and writes a reply. It writes fluently either way, which is why mistakes are easy to miss." accent={ACCENT} active={at(0)}>
                <p className="font-mono text-[11px] text-[var(--faint)]">
                  ticket {t.id} · {t.topic}
                  {t.risky ? " · risky" : ""}
                </p>
                <p className="mt-1 text-xs">Account: {t.context}</p>
              </FlowStep>
              <FlowArrow label="ticket + facts" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Read the draft" what="Every draft here is plausible on its own. The mistakes only show against the ticket, against policy, or to someone who knows how the company talks to customers." accent={ACCENT} active={at(1)}>
                <p className="mb-1 font-mono text-[11px] text-[var(--faint)]">draft (illustrative)</p>
                <p className="rounded-md bg-[var(--inset)] p-2 text-xs break-words">{t.draft}</p>
              </FlowStep>
              <FlowArrow label="draft" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Check in code what code can check" what="Placeholders, link domains, order numbers against the ticket, refund amounts against the order total, words that commit the company. These checks are cheap and never get tired; they can't judge tone or know a date is wrong." accent={ACCENT} active={at(2)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.checks} onChange={(e) => set({ checks: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Run the five code checks
                </label>
                <ul className="space-y-0.5 text-xs">
                  {flags.length ? flags.map((f) => <li key={f} style={{ color: d.checks ? "var(--bad)" : "var(--faint)" }}>{f}</li>) : <li className="text-[var(--good)]">passes every check{t.problem ? ` (but: ${PROBLEM_LABEL[t.problem]})` : ""}</li>}
                </ul>
              </FlowStep>
              <FlowArrow label="flags" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Choose what a person reads, and show them the ticket" what="Reading every draft catches the most and costs a full-time job. Routing only flagged drafts and risky topics (money, contracts) to a person costs a fraction. A reviewer who sees only the draft can't tell a wrong order number or date: put the ticket next to it." accent={ACCENT} active={at(3)}>
                <Choices<Route> label="A person reads" accent={ACCENT} value={d.route} onChange={(v) => set({ route: v })} options={[{ id: "none", label: "Nothing" }, { id: "flagged", label: "Flagged drafts" }, { id: "risky", label: "Flagged + risky topics" }, { id: "all", label: "Every draft" }]} />
                <label className="mt-2 flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.context} onChange={(e) => set({ context: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Show the ticket and account beside the draft
                </label>
              </FlowStep>
              <FlowArrow label="approved replies" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Send, and count both kinds of cost" what="Count the bad replies customers received and the hours people spent reading. A tone problem in a routine topic is what no rule here catches; teams sample a share of auto-sent replies and track what reviewers change, to see where review can loosen or must tighten." accent={ACCENT} active={at(4)}>
                <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-xs">
                  <dt>Sent with a mistake</dt>
                  <dd className="text-right font-mono" style={{ color: all.bad ? "var(--bad)" : "var(--good)" }}>{all.bad} of {TICKETS.length}</dd>
                  <dt>Fixed by a person</dt>
                  <dd className="text-right font-mono">{all.fixed}</dd>
                  <dt>Stuck with nobody to look</dt>
                  <dd className="text-right font-mono" style={{ color: all.blocked ? "var(--c2)" : "var(--text)" }}>{all.blocked}</dd>
                  <dt>Reviewer time at {PER_DAY} tickets a day</dt>
                  <dd className="text-right font-mono">{all.hoursPerDay} h</dd>
                </dl>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Drafts are illustrative. The checks, routing and counts run for real; review takes an assumed 45 seconds a draft, or 90 with the ticket open.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function DraftList({ d, pick, setPick }: { d: Design; pick: number; setPick: (n: number) => void }) {
  const all = runAll(d);
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Twelve drafts and what happened to each">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">drafts · pick one</p>
        <p className="font-mono text-xs" style={{ color: all.bad ? "var(--bad)" : "var(--good)" }}>
          {all.bad} bad sent
        </p>
      </div>
      <ul className="mt-3 space-y-0.5">
        {all.results.map((r) => (
          <li key={r.t.id}>
            <button type="button" aria-pressed={r.t.id === pick} onClick={() => setPick(r.t.id)} className="grid min-h-11 w-full grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-1.5 text-left text-xs" style={{ background: r.t.id === pick ? `color-mix(in srgb, ${ACCENT} 14%, transparent)` : "transparent" }}>
              <span className="font-mono text-[var(--faint)]">{r.t.id}</span>
              <span className="min-w-0 truncate">
                {r.t.topic}
                {r.t.risky && <span className="text-[var(--faint)]"> · risky</span>}
              </span>
              <span className="text-right text-[11px]" style={{ color: COLOR[r.outcome] }}>
                {WORD[r.outcome]}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
