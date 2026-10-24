"use client";

import { useMemo, useState, type ReactNode } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { COST, FIRST, FIXED, SALES_MIN, WEEK, enrich, runWeek, type Design, type Source } from "@/lib/leadEnrichment";

const ACCENT = "var(--auto)";

// three sign-ups worth following
const SAMPLES = [
  { id: "a", label: "Company address, a good fit", lead: WEEK.find((l) => l.domain === "company" && l.fit && l.apiHas)! },
  { id: "b", label: "A founder on Gmail", lead: WEEK.find((l) => l.domain === "free" && l.fit)! },
  { id: "c", label: "Small company the API doesn't know", lead: WEEK.find((l) => l.domain === "company" && !l.fit && !l.apiHas && l.agentInvents)! },
];

export default function LeadEnrichmentDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [pick, setPick] = useState("c");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const w = useMemo(() => runWeek(d), [d]);
  const s = SAMPLES.find((x) => x.id === pick)!;
  const f = enrich(s.lead, d);
  const sent = f.scoredFit;

  const toggle = (k: "grounding" | "realtime", label: string, extra?: ReactNode) => (
    <>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={d[k]} onChange={(e) => set({ [k]: e.target.checked } as Partial<Design>)} className="h-4 w-4" style={{ accentColor: ACCENT }} />
        {label}
      </label>
      {extra}
    </>
  );

  const nodes: MapNode[] = [
    { id: "form", label: "Sign-up form", sub: `${WEEK.length} this week`, at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "api", label: "Enrichment API", sub: `$${COST.api} a lookup`, at: [50, 18], mobileAt: [75, 12], state: d.source === "agent" ? "dim" : f.looked === "api" ? "good" : "idle" },
    { id: "agent", label: "Research agent", sub: `$${COST.agent} · reads the web`, at: [86, 18], mobileAt: [75, 42], state: d.source === "api" ? "dim" : f.looked === "agent" ? (f.wrongFact ? "bad" : "good") : "idle" },
    { id: "score", label: "Fit score", sub: f.known ? (f.scoredFit ? "fits" : "doesn't fit") : "unknown", at: [50, 62], mobileAt: [25, 42], state: f.wrongFact ? "bad" : "active" },
    { id: "crm", label: "CRM", sub: `${w.wrongFacts} wrong facts`, at: [14, 86], mobileAt: [25, 76], state: w.wrongFacts ? "bad" : "good" },
    { id: "sales", label: "Sales rep", sub: `${w.goodSent} good · ${w.badSent} bad`, at: [86, 86], mobileAt: [75, 76], state: w.badSent ? "bad" : "good" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("s", ["form", "score"], { label: s.lead.domain === "free" ? "gmail.com" : s.lead.domain === "company" ? "company.com" : "throwaway" })
    : stage === 1 ? (f.looked === "api" ? hops("a", ["score", "api", "score"], { label: f.known ? "record" : "no record" }) : f.looked === "agent" ? hops("g", ["score", "agent", "score"], { label: "research" }) : [])
    : stage === 2 ? (f.looked === "agent" ? hops("c", ["agent", "score"], { label: d.grounding ? "facts with URLs" : "facts", tone: f.wrongFact ? "bad" : "good" }) : [])
    : stage === 3 ? hops("w", ["score", "crm"], { label: f.known ? "enriched" : "unknown" })
    : stage === 4 ? (sent ? hops("r", ["crm", "sales"], { label: d.realtime ? "now" : "tomorrow 09:00", tone: s.lead.fit ? "good" : "bad" }) : [])
    : [];

  const captions = [
    `Step 1: lead ${s.lead.id} signs up with ${s.lead.domain === "free" ? "a Gmail address" : s.lead.domain === "company" ? "a company address" : "a throwaway address"}.`,
    `Step 2: ${f.looked === "api" ? (f.known ? "the enrichment API has a record" : "the enrichment API has nothing") : f.looked === "agent" ? "a research agent searches the web" : "nothing is looked up"}.`,
    f.looked === "agent" ? (f.wrongFact ? `Step 3: ${f.why}.` : d.grounding && !f.known ? `Step 3: ${f.why}.` : "Step 3: every fact it keeps has a source.") : "Step 3: no agent research for this one.",
    `Step 4: written to the CRM as ${f.known ? (f.scoredFit ? "a fit" : "not a fit") : "unknown"}.`,
    sent ? `Step 5: sent to sales ${d.realtime ? "within minutes" : "in tomorrow's batch"}${s.lead.fit ? "" : ", where a rep spends 15 minutes finding it's not a fit"}.` : s.lead.fit ? "Step 5: not sent; a good lead sits unnoticed." : "Step 5: not sent to sales, correctly.",
  ];
  const caption = stage !== null ? captions[stage] : `${w.goodSent} of ${w.goodTotal} good leads reach sales · ${w.badSent} bad ones (${w.salesHoursWasted} h of reps' time) · ${w.wrongFacts} wrong facts in the CRM · $${w.cost.toFixed(2)} a week · median wait ${w.medianWaitH} h.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Automation · case study"
        title="Lead enrichment"
        blurb="200 people sign up a week. Sales wants the right ones fast, with their company, size and industry filled in. A research agent can find almost anything, at 40 cents a lead, and sometimes states a company size it never found. An enrichment API is cheap and exact but doesn't know small companies or Gmail founders. Build the pipeline and count the week."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="The sign-up form, an enrichment API, a research agent, the fit score, the CRM and a sales rep"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "form", to: "score", label: "sign-up" },
                  { from: "score", to: "api", label: "lookup", dim: d.source === "agent" },
                  { from: "score", to: "agent", label: "research", dim: d.source === "api" },
                  { from: "score", to: "crm", label: "write" },
                  { from: "crm", to: "sales", label: "route" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <Funnel d={d} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices label="Follow" accent={ACCENT} value={pick} onChange={setPick} options={SAMPLES.map((x) => ({ id: x.id, label: x.label }))} />
              </div>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  As first built
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Fixed
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Researching…">
                Follow this lead
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Decide what to do with Gmail sign-ups" what="A quarter of sign-ups use a free address. Guessing their company from the name finds a namesake more often than not. Asking one question (“your company's website?”) works for most; skipping them loses some good leads." accent={ACCENT} active={at(0)}>
                <Choices<Design["freeMail"]> label="Free-mail sign-ups" accent={ACCENT} value={d.freeMail} onChange={(v) => set({ freeMail: v })} options={[{ id: "guess", label: "Guess the company" }, { id: "ask", label: "Ask for a website" }, { id: "skip", label: "Skip them" }]} />
              </FlowStep>
              <FlowArrow label="a domain" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Look up cheap, exact data first" what={`An enrichment API returns a known company record for $${COST.api}. Send only what it doesn't know to the research agent at $${COST.agent}.`} accent={ACCENT} active={at(1)}>
                <Choices<Source> label="Where facts come from" accent={ACCENT} value={d.source} onChange={(v) => set({ source: v })} options={[{ id: "agent", label: "Research agent" }, { id: "api", label: "Enrichment API" }, { id: "both", label: "API, then the agent" }]} />
              </FlowStep>
              <FlowArrow label="facts" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Keep only facts with a source" what="Require a URL for every fact the agent returns and drop the rest. A company size it states without a source is a guess, and a guess in the CRM looks exactly like a fact to the next person who reads it." accent={ACCENT} active={at(2)}>
                {toggle("grounding", "Drop agent facts without a source URL")}
              </FlowStep>
              <FlowArrow label="fit or not" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Route good leads right away" what="A nightly batch means someone who signed up at 10:00 hears from sales the next morning. Score on sign-up and route fits within minutes; send the rest to a nurture list." accent={ACCENT} active={at(3)}>
                {toggle("realtime", "Score and route on each sign-up, not nightly")}
              </FlowStep>
              <FlowArrow label="leads" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Count the week from sales' side" what="Good leads that reach sales, bad ones that waste a rep's time, wrong facts left in the CRM, cost and waiting time." accent={ACCENT} active={at(4)}>
                <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-xs">
                  <dt>Good leads to sales</dt>
                  <dd className="text-right font-mono" style={{ color: w.goodSent < w.goodTotal ? "var(--c2)" : "var(--good)" }}>{w.goodSent} / {w.goodTotal}</dd>
                  <dt>Bad leads to sales</dt>
                  <dd className="text-right font-mono" style={{ color: w.badSent ? "var(--bad)" : "var(--good)" }}>{w.badSent} ({w.salesHoursWasted} h at {SALES_MIN} min)</dd>
                  <dt>Wrong facts in the CRM</dt>
                  <dd className="text-right font-mono" style={{ color: w.wrongFacts ? "var(--bad)" : "var(--good)" }}>{w.wrongFacts}</dd>
                  <dt>Cost this week</dt>
                  <dd className="text-right font-mono">${w.cost.toFixed(2)}</dd>
                  <dt>Median wait for a good lead</dt>
                  <dd className="text-right font-mono">{w.medianWaitH} h</dd>
                </dl>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Who signs up, what each source knows and how often the agent invents a fact are seeded and illustrative. Routing, grounding, scoring, costs and waits run here.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Funnel({ d }: { d: Design }) {
  const w = useMemo(() => runWeek(d), [d]);
  const by = (k: "company" | "free" | "disposable") => {
    const fs = w.fates.filter((f) => f.lead.domain === k);
    return { n: fs.length, good: fs.filter((f) => f.lead.fit).length, sentGood: fs.filter((f) => f.scoredFit && f.lead.fit).length, sentBad: fs.filter((f) => f.scoredFit && !f.lead.fit).length };
  };
  const rows = [
    { label: "Company address", ...by("company") },
    { label: "Free mail (Gmail…)", ...by("free") },
    { label: "Throwaway", ...by("disposable") },
  ];
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="The week's sign-ups by kind and what reached sales">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">the week&apos;s sign-ups</p>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-x-3 gap-y-1 text-xs">
        <span />
        <span className="text-right font-mono text-[11px] text-[var(--faint)]">signed up</span>
        <span className="text-right font-mono text-[11px] text-[var(--faint)]">good sent</span>
        <span className="text-right font-mono text-[11px] text-[var(--faint)]">bad sent</span>
        {rows.map((r) => (
          <div key={r.label} className="contents">
            <span>{r.label}</span>
            <span className="text-right font-mono">{r.n}</span>
            <span className="text-right font-mono" style={{ color: r.sentGood < r.good ? "var(--c2)" : "var(--good)" }}>
              {r.sentGood}/{r.good}
            </span>
            <span className="text-right font-mono" style={{ color: r.sentBad ? "var(--bad)" : "var(--good)" }}>
              {r.sentBad}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
