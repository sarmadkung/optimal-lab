"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type Packet } from "@/components/system/SystemMap";
import { ALL, DUPLICATES, ERR_LABEL, MANUAL_HOURS, MIN, MODELS, NONE, PER_MONTH, REVIEWER_RATE, SCANS, month, type Checks, type Design, type ModelId, type Review } from "@/lib/invoiceExtractor";

const ACCENT = "var(--native)";
const n = (x: number) => Math.round(x).toLocaleString("en-US");
const START: Design = { model: "small", checks: NONE, review: "flagged" };
const CHECK_LABEL: Record<keyof Checks, string> = {
  dedupe: "Reject a supplier + invoice number seen before",
  sums: "Lines add up to the total; due date after invoice date",
  vendor: "Supplier matches one in the vendor list (name, VAT number, bank)",
  po: "PO number exists, is open and the amount fits it",
};

export default function InvoiceExtractorDemo() {
  const [d, setD] = useState<Design>(START);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const setCheck = (k: keyof Checks, v: boolean) => setD((c) => ({ ...c, checks: { ...c.checks, [k]: v } }));
  const x = month(d);
  const total = x.cost + x.hours * REVIEWER_RATE;
  const m = MODELS.find((k) => k.id === d.model)!;
  const anyCheck = Object.values(d.checks).some(Boolean);

  const packets: Packet[] =
    stage === 0 ? hops("in", ["inbox", "extract"], { label: `${n(PER_MONTH)} PDFs` })
    : stage === 1 ? hops("ocr", ["inbox", "extract"], { label: `${n(SCANS)} scans → OCR` })
    : stage === 2 ? hops("ex", ["extract", "checks"], { label: `${m.label.toLowerCase()}` })
    : stage === 3 ? hops("ck", ["checks", "erp", "checks"], { label: anyCheck ? "vendors, POs, history" : "no checks", tone: anyCheck ? "good" : "bad" })
    : stage === 4 ? [...hops("post", ["checks", "erp"], { label: `${n(x.touchless)} posted`, tone: x.wrongPosted + x.duplicatePaid > 300 ? "bad" : "good" }), ...hops("rev", ["checks", "review"], { label: `${n(x.hours)} h review`, start: 0.2 })]
    : [];

  const captions = [
    `Step 1: ${n(PER_MONTH)} invoices a month arrive in the AP inbox; ${n(DUPLICATES)} are the same invoice sent twice.`,
    `Step 2: ${n(PER_MONTH - SCANS)} PDFs have a text layer; ${n(SCANS)} are scans that go through OCR first, which adds misreads.`,
    `Step 3: the ${m.label.toLowerCase()} extracts supplier, number, dates, lines, total and PO; about ${Math.round(m.errRate * 100)}% of invoices come out with a wrong field, more for scans.`,
    anyCheck ? `Step 4: code checks the fields against the ERP: ${(Object.keys(d.checks) as (keyof Checks)[]).filter((k) => d.checks[k]).length} checks on; ${n(x.fixed + x.duplicateCaught)} invoices flagged.` : "Step 4: no checks: whatever the model read is what gets posted.",
    `Step 5: ${n(x.touchless)} posted untouched, ${n(x.hours)} reviewer hours, ${n(x.wrongPosted)} wrong invoices and ${n(x.duplicatePaid)} duplicates posted.`,
  ];
  const caption = stage !== null ? captions[stage] : `${n(x.touchless)} of ${n(PER_MONTH)} posted untouched · ${n(x.hours)} reviewer hours · ${n(x.wrongPosted)} wrong + ${n(x.duplicatePaid)} paid twice · $${n(total)} a month with review time.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Native · case study"
        title="An invoice extractor"
        blurb={`Accounts payable keys ${n(PER_MONTH)} invoices a month by hand: about ${n(MANUAL_HOURS)} hours. Design the system that reads them, posts the clean ones to the ERP untouched, and sends only the doubtful ones to a person. The checks against your own supplier and order data catch more than a better model does.`}
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="AP inbox, text extraction and model, checks against ERP data, review queue and ERP"
                accent={ACCENT}
                chrome="split"
                nodes={[
                  { id: "inbox", label: "AP inbox", sub: `${n(PER_MONTH)} / month`, at: [10, 50], mobileAt: [50, 8], state: "active" },
                  { id: "extract", label: "OCR + model", sub: m.label.toLowerCase(), at: [36, 50], mobileAt: [50, 34], state: "active" },
                  { id: "checks", label: "Checks", sub: anyCheck ? `${(Object.keys(d.checks) as (keyof Checks)[]).filter((k) => d.checks[k]).length} of 4 on` : "none", at: [62, 50], mobileAt: [50, 60], state: anyCheck ? "active" : "dim" },
                  { id: "erp", label: "ERP", sub: `${n(x.wrongPosted + x.duplicatePaid)} bad postings`, at: [88, 18], mobileAt: [24, 88], state: x.wrongPosted + x.duplicatePaid > 300 ? "bad" : "good" },
                  { id: "review", label: "Review queue", sub: `${n(x.hours)} h / month`, at: [88, 82], mobileAt: [76, 88], state: x.hours > 400 ? "wait" : "active" },
                ]}
                links={[
                  { from: "inbox", to: "extract", label: "PDF" },
                  { from: "extract", to: "checks", label: "fields" },
                  { from: "checks", to: "erp", label: "post / look up" },
                  { from: "checks", to: "review", label: "flagged" },
                ]}
                packets={packets}
                aspect={1.6}
                mobileAspect={0.85}
              />
              <MonthView d={d} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(START)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Model straight to ERP
                </button>
                <button type="button" onClick={() => setD({ model: "large", checks: ALL, review: "flagged" })} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Checked, review flagged
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Processing…">
                Process a month
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Take invoices in, and drop duplicates first" what="Suppliers email the same invoice twice, resend reminders with it attached, and send it to two addresses. Paying twice is the most expensive error in accounts payable, and the cheapest to stop: the same supplier and invoice number seen before." accent={ACCENT} active={at(0)}>
                <CheckToggle k="dedupe" d={d} set={setCheck} />
                <p className="font-mono text-xs text-[var(--muted)]">{n(DUPLICATES)} duplicates in the month</p>
              </FlowStep>
              <FlowArrow label="unique invoices" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Get the text out" what={`PDFs from accounting software carry their text; ${Math.round((SCANS / PER_MONTH) * 100)}% are scans or phone photos that need OCR, which misreads a 1 as a 7. Keep the page layout so the model can tell a line amount from a total.`} accent={ACCENT} active={at(1)}>
                <p className="font-mono text-xs">
                  {n(PER_MONTH - SCANS)} with text · {n(SCANS)} scans through OCR
                </p>
              </FlowStep>
              <FlowArrow label="text + layout" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Extract the fields with a model" what="A larger model reads more invoices right and costs about ten times as much per call. At this volume both are cheap next to an hour of a person's time, which is how the choice should be priced." accent={ACCENT} active={at(2)}>
                <Choices label="Model" accent={ACCENT} value={d.model} onChange={(v: ModelId) => setD((c) => ({ ...c, model: v }))} options={MODELS.map((k) => ({ id: k.id, label: k.label }))} />
                <p className="mt-2 font-mono text-xs">
                  ~{Math.round(m.errRate * 100)}% of invoices with a wrong field (+4% for scans) · ${n(x.cost)} a month
                </p>
                <ul className="mt-2 space-y-0.5 text-[11px] text-[var(--muted)]">
                  {Object.entries(ERR_LABEL).map(([k, v]) => (
                    <li key={k}>· {v}</li>
                  ))}
                </ul>
              </FlowStep>
              <FlowArrow label="fields" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Check the fields against your own data" what="The ERP already knows the suppliers, their VAT numbers and bank details, and every open purchase order. Matching against them catches most extraction errors and some fraud; a wrong cost centre still gets through every check." accent={ACCENT} active={at(3)}>
                <CheckToggle k="sums" d={d} set={setCheck} />
                <CheckToggle k="vendor" d={d} set={setCheck} />
                <CheckToggle k="po" d={d} set={setCheck} />
              </FlowStep>
              <FlowArrow label="post or review" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Post the clean ones, review the rest" what={`Reviewing only flagged invoices takes ${MIN.flagged} minutes each; glancing at every invoice adds ${MIN.glance} minutes to all ${n(PER_MONTH)}. Price the design with review time included, at $${REVIEWER_RATE} an hour.`} accent={ACCENT} active={at(4)}>
                <Choices label="People review" accent={ACCENT} value={d.review} onChange={(v: Review) => setD((c) => ({ ...c, review: v }))} options={[{ id: "flagged", label: "Only flagged invoices" }, { id: "all", label: "Every invoice" }]} />
                <Compare d={d} />
                <p className="mt-2 text-[11px] text-[var(--faint)]">Invoices, error rates and which errors reviewers catch are seeded and illustrative; prices and minutes are estimates. Every check, count, hour and cost runs for real.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function CheckToggle({ k, d, set }: { k: keyof Checks; d: Design; set: (k: keyof Checks, v: boolean) => void }) {
  return (
    <label className="flex min-h-11 items-center gap-2 text-sm">
      <input type="checkbox" checked={d.checks[k]} onChange={(e) => set(k, e.target.checked)} className="h-4 w-4" style={{ accentColor: ACCENT }} />
      {CHECK_LABEL[k]}
    </label>
  );
}

function MonthView({ d }: { d: Design }) {
  const x = month(d);
  const parts = [
    { label: "posted, right", v: x.posted, color: "var(--good)" },
    { label: "flagged and corrected", v: x.fixed + x.duplicateCaught, color: "var(--c2)" },
    { label: "wrong, posted to the ERP", v: x.wrongPosted, color: "var(--bad)" },
    { label: "paid twice", v: x.duplicatePaid, color: "var(--c4)" },
  ];
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="A month of invoices by outcome">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">one month</p>
        <p className="font-mono text-xs">{Math.round((x.touchless / PER_MONTH) * 100)}% touchless</p>
      </div>
      <div className="mt-3 flex h-5 overflow-hidden rounded">
        {parts.map((p) => (p.v > 0 ? <div key={p.label} style={{ width: `${(p.v / PER_MONTH) * 100}%`, background: p.color }} /> : null))}
      </div>
      <ul className="mt-3 space-y-0.5 text-xs">
        {parts.map((p) => (
          <li key={p.label} className="flex justify-between gap-2">
            <span>
              <span style={{ color: p.color }}>■</span> {p.label}
            </span>
            <span className="font-mono">{n(p.v)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat label="reviewer hours" value={n(x.hours)} sub={`by hand: ${n(MANUAL_HOURS)}`} />
        <Stat label="model + OCR" value={`$${n(x.cost)}`} />
        <Stat label="with review time" value={`$${n(x.cost + x.hours * REVIEWER_RATE)}`} />
      </div>
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md bg-[var(--inset)] p-2">
      <p className="font-mono text-base">{value}</p>
      <p className="text-[11px] text-[var(--muted)]">{label}</p>
      {sub && <p className="text-[10px] text-[var(--faint)]">{sub}</p>}
    </div>
  );
}

function Compare({ d }: { d: Design }) {
  const rows: { label: string; d: Design }[] = [
    { label: "Small model → ERP", d: { model: "small", checks: NONE, review: "flagged" } },
    { label: "Small model + checks", d: { model: "small", checks: ALL, review: "flagged" } },
    { label: "Large model + checks", d: { model: "large", checks: ALL, review: "flagged" } },
    { label: "Large + checks + review all", d: { model: "large", checks: ALL, review: "all" } },
    { label: "Your design", d },
  ];
  return (
    <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-x-3 gap-y-0.5 font-mono text-[11px]">
      <span className="text-[var(--faint)]">design</span>
      <span className="text-right text-[var(--faint)]">bad postings</span>
      <span className="text-right text-[var(--faint)]">hours</span>
      <span className="text-right text-[var(--faint)]">$/month</span>
      {rows.map((r) => {
        const x = month(r.d);
        return [
          <span key={`${r.label}a`} className="font-sans" style={{ fontWeight: r.label === "Your design" ? 600 : 400 }}>
            {r.label}
          </span>,
          <span key={`${r.label}b`} className="text-right" style={{ color: x.wrongPosted + x.duplicatePaid > 300 ? "var(--bad)" : "var(--text)" }}>
            {n(x.wrongPosted + x.duplicatePaid)}
          </span>,
          <span key={`${r.label}c`} className="text-right">
            {n(x.hours)}
          </span>,
          <span key={`${r.label}d`} className="text-right">
            {n(x.cost + x.hours * REVIEWER_RATE)}
          </span>,
        ];
      })}
    </div>
  );
}
