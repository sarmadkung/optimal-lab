"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { ALLOWANCE, AVG_DELAY_MIN, CHECKS_PER_MONTH, FIRST, FIXED, LIMITS, ORDER_OPTIONS, VIP_SHARE, count, type Design, type Trigger } from "@/lib/zapierMake";

const ACCENT = "var(--tools)";
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

export default function ZapierMakeDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [yes, setYes] = useState<Set<string>>(new Set());
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const c = count(d);
  const itemCalls = d.batchItems ? 1 : d.items;

  const nodes: MapNode[] = [
    { id: "shop", label: "Shop", sub: `${fmt(d.orders)} orders a month`, at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "flow", label: "No-code workflow", sub: d.trigger === "webhook" ? "instant trigger" : `checks every ${d.trigger === "poll15" ? 15 : 1} min`, at: [50, 40], mobileAt: [75, 12], state: "active" },
    { id: "crm", label: "CRM", sub: "look up customer", at: [86, 14], mobileAt: [75, 42], state: "active" },
    { id: "sheet", label: "Stock sheet", sub: `${itemCalls} update${itemCalls > 1 ? "s" : ""} an order`, at: [86, 50], mobileAt: [25, 42], state: d.batchItems ? "good" : "wait" },
    { id: "slack", label: "Slack", sub: `VIP orders (${VIP_SHARE * 100}%)`, at: [86, 86], mobileAt: [75, 74], state: "active" },
    { id: "mail", label: "Email", sub: "confirmation", at: [14, 86], mobileAt: [25, 74], state: "active" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("t", ["shop", "flow"], { label: d.trigger === "webhook" ? "webhook" : "new since last check?" })
    : stage === 1 ? hops("c", ["flow", "crm", "flow"], { label: "lookup" })
    : stage === 2 ? Array.from({ length: Math.min(itemCalls, 4) }, (_, i) => hops(`i${i}`, ["flow", "sheet"], { label: d.batchItems ? "bulk update" : `item ${i + 1}`, start: i * 0.2 })).flat()
    : stage === 3 ? [...hops("s", ["flow", "slack"], { label: "VIP?" }), ...hops("m", ["flow", "mail"], { label: "confirm", start: 0.2 })]
    : stage === 4 ? hops("bill", ["flow", "shop"], { label: `${fmt(c.make)} ops / ${fmt(c.zapier)} tasks`, tone: c.over.zapier > 1 ? "bad" : "good" })
    : [];

  const captions = [
    d.trigger === "webhook" ? "Step 1: the shop calls the workflow's webhook the moment an order is placed." : `Step 1: the workflow checks for new orders every ${d.trigger === "poll15" ? 15 : 1} minutes: ${fmt(CHECKS_PER_MONTH[d.trigger])} checks a month, each one an operation on Make even when nothing is new.`,
    "Step 2: one CRM lookup per order.",
    d.batchItems ? "Step 3: one bulk update covers every line item." : `Step 3: a loop updates the stock sheet once per line item: ${d.items} steps per order.`,
    "Step 4: a Slack message for VIPs, then the confirmation email.",
    `Step 5: ${fmt(c.zapier)} Zapier tasks, ${fmt(c.make)} Make operations or ${fmt(c.n8n)} n8n executions a month.`,
  ];
  const caption = stage !== null ? captions[stage] : `${fmt(c.zapier)} tasks (${c.zapPerRun.toFixed(1)} a run) · ${fmt(c.make)} operations (${c.makePerRun.toFixed(1)} a run + ${fmt(c.pollingOps)} for polling) · ${fmt(c.n8n)} executions · ${c.delayMin < 1 ? "seconds" : `${c.delayMin} min`} average delay.`;
  const reasons = LIMITS.filter((l) => yes.has(l.id)).length;

  return (
    <SessionPage>
      <SessionHeader
        kicker="Tools · interactive"
        title="Zapier and Make"
        blurb="No-code builders connect the shop, the CRM, a sheet, Slack and email in an afternoon, and bill by how much runs. One order workflow: look up the customer, update stock for each line item, ping Slack for VIPs, send a confirmation. Count what each platform charges for, see what changes the count, and decide when a workflow has outgrown no-code."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="The shop, a no-code workflow, the CRM, a stock sheet, Slack and email"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "shop", to: "flow", label: d.trigger === "webhook" ? "webhook" : "poll" },
                  { from: "flow", to: "crm", label: "lookup" },
                  { from: "flow", to: "sheet", label: "per item" },
                  { from: "flow", to: "slack", label: "VIP" },
                  { from: "flow", to: "mail", label: "confirm" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <Usage c={c} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  As first built
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Webhook + bulk update
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Running…">
                Run one order
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Use an instant trigger when the app offers one" what="Polling triggers check on a schedule: orders wait until the next check, and on Make every check is an operation, new data or not. A webhook trigger runs the moment the order exists and costs nothing while idle." accent={ACCENT} active={at(0)}>
                <Choices<Trigger> label="Trigger" accent={ACCENT} value={d.trigger} onChange={(v) => set({ trigger: v })} options={[{ id: "poll15", label: "Poll every 15 min" }, { id: "poll1", label: "Poll every minute" }, { id: "webhook", label: "Instant (webhook)" }]} />
                <p className="mt-2 font-mono text-[11px] text-[var(--muted)]">
                  average wait {AVG_DELAY_MIN[d.trigger] < 1 ? "a few seconds" : `${AVG_DELAY_MIN[d.trigger]} min`} · {fmt(CHECKS_PER_MONTH[d.trigger])} checks a month
                </p>
              </FlowStep>
              <FlowArrow label="an order" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Know what counts as a unit" what="Zapier counts each action step that runs (the trigger and filters are free). Make counts every module that runs, trigger, router and iterator included. n8n counts one execution per run, however many steps it has." accent={ACCENT} active={at(1)}>
                <p className="font-mono text-[11px]">
                  per order: {c.zapPerRun.toFixed(1)} tasks · {c.makePerRun.toFixed(1)} operations · 1 execution
                </p>
              </FlowStep>
              <FlowArrow label="line items" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Watch loops: they multiply everything" what="A loop over line items runs its steps once per item, and each one is billed. Where the target app has a bulk endpoint, one call per order replaces the loop." accent={ACCENT} active={at(2)}>
                <Choices label="Line items per order" accent={ACCENT} value={String(d.items)} onChange={(v) => set({ items: Number(v) })} options={[{ id: "1", label: "1" }, { id: "4", label: "4" }, { id: "10", label: "10" }]} />
                <label className="mt-2 flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.batchItems} onChange={(e) => set({ batchItems: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  One bulk stock update instead of a loop
                </label>
              </FlowStep>
              <FlowArrow label="units" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Multiply by your volume" what="Units per run times runs per month is the bill. The same workflow that fits a small plan at 300 orders needs many times the allowance at 30,000." accent={ACCENT} active={at(3)}>
                <Choices label="Orders a month" accent={ACCENT} value={String(d.orders)} onChange={(v) => set({ orders: Number(v) })} options={ORDER_OPTIONS.map((o) => ({ id: String(o), label: fmt(o) }))} />
              </FlowStep>
              <FlowArrow label="the month" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Know when it has outgrown no-code" what="No-code is right for most glue. When two or more of these are true, the workflow usually belongs in code or a workflow engine." accent={ACCENT} active={at(4)}>
                <ul className="space-y-1">
                  {LIMITS.map((l) => (
                    <li key={l.id}>
                      <label className="flex min-h-11 items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={yes.has(l.id)}
                          onChange={(e) =>
                            setYes((cur) => {
                              const next = new Set(cur);
                              if (e.target.checked) next.add(l.id);
                              else next.delete(l.id);
                              return next;
                            })
                          }
                          className="mt-1 h-4 w-4"
                          style={{ accentColor: ACCENT }}
                        />
                        <span>
                          {l.q}
                          <span className="block text-[11px] text-[var(--faint)]">{l.why}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-xs" style={{ color: reasons >= 2 ? "var(--c2)" : "var(--good)" }}>
                  {reasons >= 2 ? `${reasons} reasons: consider moving this one to code or a workflow engine.` : "No-code still fits this workflow."}
                </p>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The counting rules, polling checks and delays run here; plan allowances are illustrative, so check each vendor&apos;s current pricing.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Usage({ c }: { c: ReturnType<typeof count> }) {
  const rows = [
    { name: "Zapier tasks", used: c.zapier, allowance: ALLOWANCE.zapier },
    { name: "Make operations", used: c.make, allowance: ALLOWANCE.make },
    { name: "n8n executions", used: c.n8n, allowance: ALLOWANCE.n8n },
  ];
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Units a month on each platform against an entry plan's allowance">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">a month, against an entry plan</p>
      <ul className="mt-3 space-y-2 text-xs">
        {rows.map((r) => {
          const ratio = r.used / r.allowance;
          return (
            <li key={r.name}>
              <div className="flex flex-wrap justify-between gap-2">
                <span>{r.name}</span>
                <span className="font-mono text-[11px]" style={{ color: ratio > 1 ? "var(--bad)" : "var(--good)" }}>
                  {fmt(r.used)} / {fmt(r.allowance)} {ratio > 1 ? `(${ratio.toFixed(1)}×)` : ""}
                </span>
              </div>
              <span className="mt-1 block h-2 w-full rounded-full bg-[var(--track)]">
                <span className="block h-full rounded-full" style={{ width: `${Math.min(100, ratio * 100)}%`, background: ratio > 1 ? "var(--bad)" : "var(--good)" }} />
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11px] text-[var(--faint)]">Self-hosted n8n has no execution limit; you pay for the server and its upkeep instead.</p>
    </section>
  );
}
