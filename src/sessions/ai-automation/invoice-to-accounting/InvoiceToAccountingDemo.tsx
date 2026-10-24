"use client";

import { useMemo, useState, type ReactNode } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { CLERK_MIN, FIRST, FIXED, ISSUE_LABEL, LATE_FEE, MONTH, TOLERANCES, normalizeNumber, runMonth, type Design, type Dup, type Issue, type Match } from "@/lib/invoiceToAccounting";

const ACCENT = "var(--auto)";
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export default function InvoiceToAccountingDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [pick, setPick] = useState<Issue>("unreceived");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const m = useMemo(() => runMonth(d), [d]);
  const row = m.byIssue.find((x) => x.issue === pick)!;
  const fate = row.stuck ? "stuck" : row.clerk === row.count ? "clerk" : row.overpaid ? "overpaid" : "booked";

  const toggle = (k: "period" | "idempotent", label: string, extra?: ReactNode) => (
    <>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={d[k]} onChange={(e) => set({ [k]: e.target.checked } as Partial<Design>)} className="h-4 w-4" style={{ accentColor: ACCENT }} />
        {label}
      </label>
      {extra}
    </>
  );

  const nodes: MapNode[] = [
    { id: "in", label: "Extracted invoices", sub: `${MONTH.length.toLocaleString("en-US")} this month`, at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "match", label: "Matching", sub: d.match === "none" ? "off" : d.match === "two" ? "invoice ↔ PO" : "invoice ↔ PO ↔ receipt", at: [50, 18], mobileAt: [75, 12], state: d.match === "none" ? "dim" : "good" },
    { id: "po", label: "POs + goods receipts", sub: "in the ERP", at: [86, 18], mobileAt: [75, 42], state: d.match === "none" ? "dim" : "active" },
    { id: "dup", label: "Paid-invoice index", sub: d.dup === "off" ? "not checked" : d.dup === "exact" ? "exact numbers" : "normalised numbers", at: [14, 80], mobileAt: [25, 42], state: d.dup === "off" ? "dim" : "good" },
    { id: "erp", label: "ERP ledger", sub: `${m.booked.toLocaleString("en-US")} handled · ${m.stuck} stuck`, at: [50, 80], mobileAt: [25, 74], state: m.overpaid || m.stuck ? "bad" : "good" },
    { id: "clerk", label: "AP clerk", sub: `${m.clerk} to review · ${m.clerkHours} h`, at: [86, 80], mobileAt: [75, 74], state: m.clerk ? "wait" : "idle" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("i", ["in", "dup"], { label: pick.startsWith("dup") || pick === "duplicate" ? "seen before?" : "new invoice" })
    : stage === 1 ? (d.match === "none" ? [] : hops("m", ["in", "match", "po"], { label: d.match === "three" ? "PO + receipt" : "PO" }))
    : stage === 2 ? (fate === "clerk" ? hops("c", ["match", "clerk"], { label: "exception" }) : [])
    : stage === 3 ? (fate === "clerk" ? [] : hops("b", ["match", "erp"], { label: fate === "stuck" ? "closed period" : "book", tone: fate === "stuck" || fate === "overpaid" ? "bad" : "good" }))
    : stage === 4 ? (fate === "clerk" ? [] : hops("p", ["erp", "in"], { label: row.overpaid ? `${usd(row.overpaid)} too much` : fate === "stuck" ? "late fee" : "paid right", tone: row.overpaid || fate === "stuck" ? "bad" : "good" }))
    : [];

  const captions = [
    `Step 1: ${row.count} invoices this month are ${ISSUE_LABEL[pick]}.`,
    d.match === "none" ? "Step 2: nothing is matched; the amount on the invoice is the amount paid." : `Step 2: each is matched against its purchase order${d.match === "three" ? " and the goods receipt" : ""}.`,
    `Step 3: ${row.clerk ? `${row.clerk} go to the AP clerk` : "none need a person"}.`,
    `Step 4: ${row.clerk && row.clerk < row.count ? `${row.count - row.clerk} within the ${d.tolerance}% tolerance are booked; ${row.clerk} go to the clerk` : row.why}.`,
    `Step 5: ${row.overpaid ? `${usd(row.overpaid)} paid that wasn't owed` : row.stuck ? `${row.stuck} never booked; ${usd(row.stuck * LATE_FEE)} in late fees` : "paid what was owed"}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${usd(m.overpaid)} overpaid · ${m.clerk} to the clerk (${m.clerkHours} h) · ${m.stuck} stuck (${usd(m.lateFees)} late fees) · ${Math.round((m.booked / MONTH.length) * 100)}% handled without a person.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Automation · case study"
        title="Invoice to accounting"
        blurb="2,000 supplier invoices a month have already been read into fields. Now they have to be booked and paid, and that's where money goes missing: overcharges, goods never delivered, the same invoice sent twice, a closed month, an ERP that times out after booking. Match, check and book a month of invoices."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Extracted invoices, matching against purchase orders and goods receipts, a paid-invoice index, the ERP ledger and the AP clerk"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "in", to: "match", label: "invoice" },
                  { from: "match", to: "po", label: "lookup", dim: d.match === "none" },
                  { from: "in", to: "dup", label: "seen?", dim: d.dup === "off" },
                  { from: "match", to: "erp", label: "book" },
                  { from: "match", to: "clerk", label: "exception", dim: d.match === "none" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <Issues m={m} pick={pick} setPick={setPick} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  As first built
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Fixed
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Booking…">
                Book these invoices
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Match to what was ordered and received" what="Two-way matching checks the invoice against the purchase order: right supplier, price and quantity ordered. Three-way adds the goods receipt: was it actually delivered? Only the third catches a bill for goods that never all arrived." accent={ACCENT} active={at(0)}>
                <Choices<Match> label="Matching" accent={ACCENT} value={d.match} onChange={(v) => set({ match: v })} options={[{ id: "none", label: "None" }, { id: "two", label: "2-way: PO" }, { id: "three", label: "3-way: PO + receipt" }]} />
              </FlowStep>
              <FlowArrow label="matched invoice" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Allow a small, explicit tolerance" what="Freight and rounding make many invoices a little off the PO. With no tolerance the clerk checks every one; too wide and real overcharges pass. Set it, write it down, and count what each setting lets through." accent={ACCENT} active={at(1)}>
                <Choices label="Price tolerance" accent={ACCENT} value={String(d.tolerance)} onChange={(v) => set({ tolerance: Number(v) })} options={TOLERANCES.map((t) => ({ id: String(t), label: `${t}%` }))} />
              </FlowStep>
              <FlowArrow label="within tolerance" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Catch the same invoice twice" what="Suppliers resend invoices by email and portal, and the number gets written differently: “INV-0042”, “inv 42”, “42”. Normalise the number and check supplier, number and amount against everything already booked." accent={ACCENT} active={at(2)}>
                <Choices<Dup> label="Duplicate check" accent={ACCENT} value={d.dup} onChange={(v) => set({ dup: v })} options={[{ id: "off", label: "Off" }, { id: "exact", label: "Exact number" }, { id: "normalized", label: "Normalised number" }]} />
                <p className="mt-2 font-mono text-[11px] text-[var(--muted)]">
                  “INV-0042” → {normalizeNumber("INV-0042")} · “inv 42” → {normalizeNumber("inv 42")} · “42” → {normalizeNumber("42")}
                </p>
              </FlowStep>
              <FlowArrow label="new invoices" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Book once, into an open period" what="Late invoices dated in a closed month are refused by the ERP; post them to the current period and keep the invoice date. Send a booking key with each request, so a retry after a timeout returns the first booking instead of making a second." accent={ACCENT} active={at(3)}>
                {toggle("period", "Post invoices from closed months into the open period")}
                {toggle("idempotent", "Send a booking key; a retry returns the first booking")}
              </FlowStep>
              <FlowArrow label="payments" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Count the month in money and hours" what="An automated AP process is judged by money paid that wasn't owed, invoices nobody booked, and the hours people spent on exceptions." accent={ACCENT} active={at(4)}>
                <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-xs">
                  <dt>Paid but not owed</dt>
                  <dd className="text-right font-mono" style={{ color: m.overpaid ? "var(--bad)" : "var(--good)" }}>{usd(m.overpaid)}</dd>
                  <dt>Booked with no PO or approver</dt>
                  <dd className="text-right font-mono" style={{ color: m.unapproved ? "var(--bad)" : "var(--good)" }}>{m.unapproved}</dd>
                  <dt>Never booked (late fees)</dt>
                  <dd className="text-right font-mono" style={{ color: m.stuck ? "var(--bad)" : "var(--good)" }}>{m.stuck} ({usd(m.lateFees)})</dd>
                  <dt>Exceptions for the clerk</dt>
                  <dd className="text-right font-mono">{m.clerk} · {m.clerkHours} h at {CLERK_MIN} min</dd>
                </dl>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The month&apos;s invoices and their problems are seeded. Matching, tolerances, duplicate checks, period handling, booking keys and the totals run here.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Issues({ m, pick, setPick }: { m: ReturnType<typeof runMonth>; pick: Issue; setPick: (i: Issue) => void }) {
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="The month's invoices by problem, and where they went">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">the month · pick a kind</p>
        <p className="font-mono text-xs" style={{ color: m.overpaid ? "var(--bad)" : "var(--good)" }}>
          {usd(m.overpaid)} overpaid
        </p>
      </div>
      <ul className="mt-3 space-y-0.5">
        {m.byIssue.map((x) => (
          <li key={x.issue}>
            <button type="button" aria-pressed={x.issue === pick} onClick={() => setPick(x.issue)} className="grid min-h-11 w-full grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-1.5 text-left text-xs" style={{ background: x.issue === pick ? `color-mix(in srgb, ${ACCENT} 14%, transparent)` : "transparent" }}>
              <span className="text-right font-mono text-[var(--faint)]">{x.count.toLocaleString("en-US")}</span>
              <span className="min-w-0 truncate">{ISSUE_LABEL[x.issue]}</span>
              <span className="text-right font-mono text-[11px]" style={{ color: x.overpaid || x.stuck || (x.issue === "noPO" && x.booked) ? "var(--bad)" : x.clerk ? "var(--c2)" : "var(--good)" }}>
                {x.stuck ? "stuck" : x.overpaid ? `−${usd(x.overpaid)}` : x.clerk === x.count ? "to clerk" : x.clerk ? `${x.clerk} to clerk` : x.issue === "noPO" ? "booked, no approver" : "booked"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
