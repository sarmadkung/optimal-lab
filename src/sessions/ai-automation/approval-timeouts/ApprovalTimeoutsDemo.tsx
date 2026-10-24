"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { BACKUP_HOURS, DEPLOY, FIRST, FIXED, HOLIDAY, REQUESTS, SMALL, TIMEOUTS, WEEK, resolve, runAll, type By, type Design, type OnTimeout } from "@/lib/approvalTimeouts";

const ACCENT = "var(--auto)";
const COLOR: Record<By, string> = { approver: "var(--good)", backup: "var(--c1)", "auto-approve": "var(--c2)", "auto-reject": "var(--c4)", stuck: "var(--bad)" };
const WORD: Record<By, string> = { approver: "approver", backup: "backup", "auto-approve": "auto-approved", "auto-reject": "auto-rejected", stuck: "stuck" };

export default function ApprovalTimeoutsDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [pick, setPick] = useState(12);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const req = REQUESTS.find((r) => r.id === pick)!;
  const x = resolve(req, d);
  const all = runAll(d);
  const answered = x.by === "approver";
  const timed = x.by !== "approver" && x.by !== "stuck";

  const nodes: MapNode[] = [
    { id: "flow", label: "Refund workflow", sub: `${REQUESTS.length} requests`, at: [14, 50], mobileAt: [50, 12], state: "active" },
    { id: "approver", label: "Approver", sub: `away from day ${Math.floor(HOLIDAY / 24) + 1}`, at: [50, 14], mobileAt: [20, 42], state: answered ? "good" : stage !== null && stage >= 2 ? "wait" : "idle" },
    { id: "timer", label: "Timer", sub: d.on === "wait" ? "none" : d.durable ? "durable store" : "in memory", at: [50, 86], mobileAt: [80, 42], state: d.on === "wait" ? "dim" : x.timerLost ? "bad" : timed ? "good" : "idle" },
    { id: "backup", label: "Backup approver", sub: `${all.byBackup} handed over`, at: [86, 14], mobileAt: [20, 82], state: x.by === "backup" ? "good" : d.on === "escalate" || d.on === "amount" ? "idle" : "dim" },
    { id: "pay", label: "Payments", sub: `$${all.unreviewedTotal} unreviewed`, at: [86, 86], mobileAt: [80, 82], state: x.approved ? (x.right ? "good" : "bad") : "idle" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("ask", ["flow", "approver"], { label: `approve $${req.amount}?` })
    : stage === 1 ? (d.on === "wait" ? [] : hops("t", ["flow", "timer"], { label: `wake in ${d.timeout} h` }))
    : stage === 2 ? (answered ? hops("a", ["approver", "flow"], { label: x.approved ? "approved" : "rejected", tone: "good" }) : x.timerLost ? hops("l", ["timer", "flow"], { label: "lost in deploy", tone: "bad" }) : [])
    : stage === 3 ? (timed ? [...hops("w", ["timer", "flow"], { label: "timeout" }), ...(x.by === "backup" ? hops("b", ["flow", "backup", "flow"], { label: "please decide", start: 0.6 }) : [])] : [])
    : stage === 4 ? (x.approved ? hops("p", ["flow", "pay"], { label: `refund $${req.amount}`, tone: x.right ? "good" : "bad" }) : [])
    : [];

  const captions = [
    `Step 1: request ${req.id}, a $${req.amount} refund at hour ${req.at}, goes to the approver.`,
    d.on === "wait" ? "Step 2: no timer is set; the workflow waits for an answer." : `Step 2: a timer is set for hour ${req.at + d.timeout}, kept ${d.durable ? "in the workflow engine's store" : "in the worker's memory"}.`,
    answered ? `Step 3: the approver answers after ${req.reply} h.` : x.timerLost ? `Step 3: the deploy at hour ${DEPLOY} restarts the worker and its timer is gone.` : req.reply === null ? `Step 3: no answer${req.at >= HOLIDAY ? ": the approver is on holiday" : ": the message is buried"}.` : `Step 3: no answer within ${d.timeout} h (it comes after ${req.reply} h).`,
    timed ? `Step 4: the timer fires: ${x.why}.` : "Step 4: no timer fires.",
    `Step 5: ${x.why}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${all.byApprover} answered · ${all.byBackup} to the backup · ${all.autoApproved} auto-approved · ${all.autoRejected} auto-rejected · ${all.stuck} stuck · ${all.avgWait} h average wait.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Automation · interactive"
        title="Approval timeouts"
        blurb="Twenty refunds wait for one approver over a week. One message gets buried, the approver goes on holiday on day 4, and a deploy restarts the workers an hour later. Choose how long to wait, what a timeout does, and where the timer lives, then see who decided each refund and how long customers waited."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Refund workflow, the approver, a timer, a backup approver and payments"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "flow", to: "approver", label: "ask" },
                  { from: "flow", to: "timer", label: "timer", dim: d.on === "wait" },
                  { from: "flow", to: "backup", label: "after timeout", dim: !(d.on === "escalate" || d.on === "amount") },
                  { from: "flow", to: "pay", label: "refund" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.95}
              />
              <Week d={d} pick={pick} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap items-end gap-2">
                <label className="flex flex-col text-xs text-[var(--muted)]">
                  Request
                  <select value={pick} onChange={(e) => setPick(Number(e.target.value))} className="mt-1 min-h-11 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 text-sm text-[var(--text)]">
                    {REQUESTS.map((r) => (
                      <option key={r.id} value={r.id}>
                        #{r.id} · ${r.amount} · hour {r.at}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  As first built
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Fixed
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Waiting…">
                {`Run request ${req.id}`}
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Ask, with everything needed to decide" what="The request goes to a person as a message with Approve and Reject buttons. The workflow then pauses on that request; it must not hold a thread or a connection open for days." accent={ACCENT} active={at(0)}>
                <p className="text-xs">
                  Request #{req.id}: refund ${req.amount}, asked at hour {req.at}
                  {req.suspicious ? " (a person would reject this one)" : ""}.
                </p>
              </FlowStep>
              <FlowArrow label="a question" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Set a deadline, somewhere that survives" what="Every wait for a person needs a timer. A timer in a worker's memory, a setTimeout or a sleeping thread, vanishes on the next deploy or crash. Workflow engines store timers durably and fire them after restarts." accent={ACCENT} active={at(1)}>
                <Choices label="Give up waiting after" accent={ACCENT} value={String(d.timeout)} onChange={(v) => set({ timeout: Number(v) })} options={TIMEOUTS.map((h) => ({ id: String(h), label: `${h} h` }))} />
                <label className="mt-2 flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.durable} onChange={(e) => set({ durable: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Keep timers in a durable store
                </label>
                <p className="text-[11px] text-[var(--faint)]">
                  {all.lostTimers ? `${all.lostTimers} timer${all.lostTimers > 1 ? "s" : ""} die in the deploy at hour ${DEPLOY}.` : d.on === "wait" ? "No timers are set while the timeout does nothing." : "No timers are lost in the deploy."}
                </p>
              </FlowStep>
              <FlowArrow label="silence" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Expect silence" what="People miss messages, take holidays, change teams. In this week the approver answers ten requests; one message is never seen, and nothing after hour 72 gets an answer until they're back." accent={ACCENT} active={at(2)}>
                <p className="text-xs">{req.reply === null ? `No answer this week${req.at >= HOLIDAY ? " (holiday)" : " (buried message)"}.` : `Answered after ${req.reply} h.`}</p>
              </FlowStep>
              <FlowArrow label="timeout" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Decide what a timeout means" what="Approving on silence pays out what nobody checked. Rejecting refuses customers for your own absence. Handing over to a backup keeps a person in the loop. Splitting by amount lets small refunds through and sends the rest up." accent={ACCENT} active={at(3)}>
                <Choices<OnTimeout>
                  label="On timeout"
                  accent={ACCENT}
                  value={d.on}
                  onChange={(v) => set({ on: v })}
                  options={[
                    { id: "wait", label: "Keep waiting" },
                    { id: "approve", label: "Approve" },
                    { id: "reject", label: "Reject" },
                    { id: "escalate", label: "Ask the backup" },
                    { id: "amount", label: `Approve ≤ $${SMALL}, else backup` },
                  ]}
                />
              </FlowStep>
              <FlowArrow label="a decision" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Count waits, risks and refusals" what="Stuck requests are customers with no answer. Auto-approved money had no review. Auto-rejections refused valid refunds. The backup's load is the cost of keeping a person on every decision." accent={ACCENT} active={at(4)}>
                <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-xs">
                  <dt>Stuck at the end of the week</dt>
                  <dd className="text-right font-mono" style={{ color: all.stuck ? "var(--bad)" : "var(--good)" }}>{all.stuck}</dd>
                  <dt>Average wait (stuck ones until day 7)</dt>
                  <dd className="text-right font-mono">{all.avgWait} h</dd>
                  <dt>Approved with no review</dt>
                  <dd className="text-right font-mono">${all.unreviewedTotal}</dd>
                  <dt>… of it suspicious</dt>
                  <dd className="text-right font-mono" style={{ color: all.unreviewedRisk ? "var(--bad)" : "var(--good)" }}>${all.unreviewedRisk}</dd>
                  <dt>Valid refunds refused</dt>
                  <dd className="text-right font-mono" style={{ color: all.wronglyRefused ? "var(--bad)" : "var(--good)" }}>{all.wronglyRefused}</dd>
                  <dt>Handed to the backup (answers in {BACKUP_HOURS} h)</dt>
                  <dd className="text-right font-mono">{all.byBackup}</dd>
                </dl>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Requests and reply times are seeded. The timers, the deploy, each policy and the counts run for real.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Week({ d, pick }: { d: Design; pick: number }) {
  const all = runAll(d);
  const W = 336;
  const sx = (h: number) => 8 + (h / WEEK) * (W - 16);
  const row = 7;
  const top = 6;
  const H = top + REQUESTS.length * row + 18;
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Each request's wait across the week">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">the week, hour 0 to {WEEK}</p>
        <p className="flex flex-wrap gap-x-3 font-mono text-[11px]">
          {(Object.keys(WORD) as By[]).map((b) => (
            <span key={b} style={{ color: COLOR[b] }}>
              ■ {WORD[b]}
            </span>
          ))}
        </p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label={`${all.stuck} requests stuck, ${all.byApprover} answered by the approver`}>
        <rect x={sx(HOLIDAY)} y={top - 2} width={sx(WEEK) - sx(HOLIDAY)} height={REQUESTS.length * row + 2} fill="var(--inset)" />
        <line x1={sx(DEPLOY)} x2={sx(DEPLOY)} y1={top - 2} y2={top + REQUESTS.length * row} stroke="var(--bad)" strokeDasharray="2 2" strokeWidth={0.8} />
        {all.results.map((x, i) => {
          const y = top + i * row;
          const end = x.doneAt ?? WEEK;
          return (
            <g key={x.r.id} opacity={x.r.id === pick ? 1 : 0.75}>
              <rect x={sx(x.r.at)} y={y} width={Math.max(1.5, sx(end) - sx(x.r.at))} height={row - 2.5} rx={1} fill={COLOR[x.by]} />
              {d.on !== "wait" && !x.timerLost && x.r.at + d.timeout < WEEK && <line x1={sx(x.r.at + d.timeout)} x2={sx(x.r.at + d.timeout)} y1={y - 0.5} y2={y + row - 2} stroke="var(--text)" strokeWidth={0.6} />}
              {x.r.id === pick && <rect x={2} y={y - 1} width={W - 4} height={row} fill="none" stroke={ACCENT} strokeWidth={0.6} rx={1.5} />}
            </g>
          );
        })}
        {[0, 24, 48, 72, 96, 120, 144, 168].map((h) => (
          <text key={h} x={sx(h)} y={H - 4} fontSize={6} textAnchor="middle" fill="var(--faint)" fontFamily="var(--font-mono)">
            {h === 0 ? "day 1" : h % 48 === 0 ? `${h} h` : ""}
          </text>
        ))}
        <text x={sx(HOLIDAY) + 2} y={H - 11} fontSize={5.5} fill="var(--faint)" fontFamily="var(--font-mono)">
          approver away · deploy at {DEPLOY} h
        </text>
      </svg>
    </section>
  );
}
