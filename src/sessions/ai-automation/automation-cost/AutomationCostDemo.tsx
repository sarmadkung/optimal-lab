"use client";

import { useMemo, useState, type ReactNode } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { CALLS, CAPS, DAYS, FIRST, FIXED, LOOP_DAY, LOOP_HOURS, LOOP_RUNS_PER_HOUR, PER_DAY, PRICE, REPEAT_SHARE, SPAM, SPAM_DAY, callCost, simulate, type Design } from "@/lib/automationCost";

const ACCENT = "var(--auto)";
const usd = (n: number) => (n >= 100 ? `$${Math.round(n).toLocaleString("en-US")}` : n >= 1 ? `$${n.toFixed(2)}` : `$${n.toFixed(4)}`);

export default function AutomationCostDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const r = useMemo(() => simulate(d), [d]);
  const loopDay = r.days[LOOP_DAY - 1];
  const spamDay = r.days[SPAM_DAY - 1];

  const toggle = (k: "smallClassifier" | "skipJunk" | "cache" | "loopGuard", label: string, extra?: ReactNode) => (
    <>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={d[k]} onChange={(e) => set({ [k]: e.target.checked } as Partial<Design>)} className="h-4 w-4" style={{ accentColor: ACCENT }} />
        {label}
      </label>
      {extra}
    </>
  );

  const nodes: MapNode[] = [
    { id: "desk", label: "Helpdesk", sub: `${PER_DAY} tickets a day`, at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "flow", label: "Ticket workflow", sub: `${usd(r.perTicket)} a ticket`, at: [50, 18], mobileAt: [75, 12], state: "active" },
    { id: "small", label: "Small model", sub: d.smallClassifier ? "classifies" : "unused", at: [86, 18], mobileAt: [75, 42], state: d.smallClassifier ? "good" : "dim" },
    { id: "large", label: "Large model", sub: d.smallClassifier ? "drafts only" : "classifies + drafts", at: [86, 80], mobileAt: [75, 74], state: "active" },
    { id: "cache", label: "Answer cache", sub: d.cache ? `${Math.round(REPEAT_SHARE * 100)}% repeats` : "off", at: [50, 80], mobileAt: [25, 42], state: d.cache ? "good" : "dim" },
    { id: "budget", label: "Budget guard", sub: d.dailyCap === null ? "no cap" : `${usd(d.dailyCap)} a day`, at: [14, 80], mobileAt: [25, 74], state: d.dailyCap === null ? "dim" : r.capped ? "wait" : "good" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("t", ["desk", "flow"], { label: "ticket" })
    : stage === 1 ? hops("c", ["flow", d.smallClassifier ? "small" : "large", "flow"], { label: "classify" })
    : stage === 2 ? (d.cache ? hops("k", ["flow", "cache"], { label: "seen it?" }) : hops("dr", ["flow", "large"], { label: "draft" }))
    : stage === 3 ? (d.loopGuard ? [] : hops("l", ["flow", "desk", "flow"], { label: "update → trigger", tone: "bad" }))
    : stage === 4 ? hops("b", ["flow", "budget"], { label: usd(r.total), tone: r.total > 300 ? "bad" : "good" })
    : [];

  const captions = [
    `Step 1: a ticket arrives; ${PER_DAY} a day, ${DAYS} days.`,
    `Step 2: it's classified by the ${d.smallClassifier ? "small" : "large"} model for ${usd(callCost(d.smallClassifier ? "small" : "large", "classify"))}; a draft costs ${usd(callCost("large", "draft"))}.`,
    d.cache ? "Step 3: a repeat of an answered question reuses the answer; junk gets no draft." : "Step 3: every ticket gets a large-model draft, junk and repeats included.",
    d.loopGuard ? `Step 4: on day ${LOOP_DAY} the workflow ignores updates it made itself.` : `Step 4: on day ${LOOP_DAY} the workflow's own update triggers it again: ${(LOOP_RUNS_PER_HOUR * LOOP_HOURS).toLocaleString("en-US")} runs before anyone notices.`,
    `Step 5: the month costs ${usd(r.total)}; the worst day is day ${r.worst.day} at ${usd(r.worst.spend)}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${usd(r.total)} for the month · normal day ${usd(r.normalDay)} · worst day ${r.worst.day}: ${usd(r.worst.spend)}${r.customersHeld ? ` · ${r.customersHeld} real tickets held by the cap` : ""}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Automation · interactive"
        title="Controlling cost per run"
        blurb="A support workflow classifies each ticket and drafts a reply with a model: about 2 cents a ticket, 400 tickets a day. Then a change on day 12 makes it trigger itself, and a spam wave on day 20 sends 6,000 junk tickets. Cut the cost of a normal run, stop the runaway ones, and see a month's bill."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Helpdesk, the ticket workflow, a small and a large model, an answer cache and a budget guard"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "desk", to: "flow", label: "ticket" },
                  { from: "flow", to: "small", label: "classify", dim: !d.smallClassifier },
                  { from: "flow", to: "large", label: "draft" },
                  { from: "flow", to: "cache", label: "lookup", dim: !d.cache },
                  { from: "flow", to: "budget", label: "spend", dim: d.dailyCap === null },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <Month days={r.days} cap={d.dailyCap} />
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
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Running…">
                Run one ticket
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Know what one run costs" what="Price a run from its calls: tokens in and out for each model call, times the price. Everything else is that number times how many runs happen." accent={ACCENT} active={at(0)}>
                <p className="font-mono text-[11px]">
                  classify {CALLS.classify.in.toLocaleString("en-US")} in / {CALLS.classify.out} out · draft {CALLS.draft.in.toLocaleString("en-US")} in / {CALLS.draft.out} out
                </p>
                <p className="font-mono text-[11px] text-[var(--muted)]">
                  large ${PRICE.large.in}/${PRICE.large.out} · small ${PRICE.small.in}/${PRICE.small.out} per million tokens (illustrative)
                </p>
              </FlowStep>
              <FlowArrow label="a ticket" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Use a small model for the easy call" what="Picking one of five categories doesn't need the largest model. A small one costs a quarter as much for the same answer on easy calls; keep the large model for writing." accent={ACCENT} active={at(1)}>
                {toggle("smallClassifier", "Classify with the small model")}
              </FlowStep>
              <FlowArrow label="a category" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Don't draft what doesn't need it" what={`Junk needs no reply, and ${Math.round(REPEAT_SHARE * 100)}% of tickets ask something already answered. Skip drafts for junk and reuse answers for repeats.`} accent={ACCENT} active={at(2)}>
                {toggle("skipJunk", "No draft for spam and junk", <p className="text-[11px] text-[var(--faint)]">Day {SPAM_DAY}: {SPAM.toLocaleString("en-US")} spam tickets cost {usd(spamDay.spend)}.</p>)}
                {toggle("cache", "Reuse the answer for repeated questions")}
              </FlowStep>
              <FlowArrow label="drafts" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Stop runaway loops at the source" what="A workflow that writes to the record that triggers it will trigger itself. Ignore events caused by the workflow's own account, or carry a depth counter and stop at 1." accent={ACCENT} active={at(3)}>
                {toggle("loopGuard", "Ignore updates made by the workflow itself", <p className="text-[11px]" style={{ color: d.loopGuard ? "var(--good)" : "var(--bad)" }}>Day {LOOP_DAY}: {usd(loopDay.spend)}{loopDay.note ? ` (${loopDay.note})` : ""}.</p>)}
              </FlowStep>
              <FlowArrow label="spend" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Cap the day as a backstop" what="A daily budget stops the bill from running away when something you didn't foresee happens. It doesn't know which runs matter, so real tickets wait too: fix causes first, cap last." accent={ACCENT} active={at(4)}>
                <Choices label="Daily spend cap" accent={ACCENT} value={String(d.dailyCap)} onChange={(v) => set({ dailyCap: v === "null" ? null : Number(v) })} options={CAPS.map((c) => ({ id: String(c), label: c === null ? "None" : `$${c}` }))} />
                <dl className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-xs">
                  <dt>The month</dt>
                  <dd className="text-right font-mono" style={{ color: r.total > 300 ? "var(--bad)" : "var(--good)" }}>{usd(r.total)}</dd>
                  <dt>A normal day</dt>
                  <dd className="text-right font-mono">{usd(r.normalDay)}</dd>
                  <dt>Worst day</dt>
                  <dd className="text-right font-mono">day {r.worst.day}: {usd(r.worst.spend)}</dd>
                  <dt>Real tickets held by the cap</dt>
                  <dd className="text-right font-mono" style={{ color: r.customersHeld ? "var(--bad)" : "var(--text)" }}>{r.customersHeld}</dd>
                </dl>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Prices and the incidents are illustrative. Every run, the loop, the controls and the bill are computed here.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Month({ days, cap }: { days: ReturnType<typeof simulate>["days"]; cap: number | null }) {
  const W = 340;
  const H = 110;
  const max = Math.max(20, ...days.map((x) => x.spend));
  const bw = (W - 16) / days.length;
  const y = (v: number) => (v / max) * (H - 26);
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Spend per day over the month">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">spend per day</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label={`Highest day ${Math.round(max)} dollars`}>
        {days.map((x, i) => (
          <rect key={x.day} x={8 + i * bw + 0.5} y={H - 16 - y(x.spend)} width={bw - 1} height={Math.max(0.5, y(x.spend))} fill={x.day === LOOP_DAY || x.day === SPAM_DAY ? "var(--bad)" : "var(--good)"} />
        ))}
        {cap !== null && cap < max && <line x1={8} x2={W - 8} y1={H - 16 - y(cap)} y2={H - 16 - y(cap)} stroke="var(--c2)" strokeDasharray="3 2" strokeWidth={0.8} />}
        <text x={8 + (LOOP_DAY - 1) * bw + bw / 2} y={H - 5} fontSize={7} textAnchor="middle" fill="var(--faint)" fontFamily="var(--font-mono)">loop</text>
        <text x={8 + (SPAM_DAY - 1) * bw + bw / 2} y={H - 5} fontSize={7} textAnchor="middle" fill="var(--faint)" fontFamily="var(--font-mono)">spam</text>
        <text x={W - 8} y={10} fontSize={7} textAnchor="end" fill="var(--faint)" fontFamily="var(--font-mono)">{usd(max)}</text>
      </svg>
    </section>
  );
}
