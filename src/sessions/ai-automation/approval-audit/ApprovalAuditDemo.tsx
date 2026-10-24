"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { FIRST, FIXED, LIMIT, REQUESTS, runAll, runRequest, type Design, type Person } from "@/lib/approvalAudit";

const ACCENT = "var(--auto)";

export default function ApprovalAuditDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [pick, setPick] = useState(2);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const req = REQUESTS.find((r) => r.id === pick)!;
  const o = runRequest(req, d);
  const all = runAll(d);
  const person: Person = d.identity && req.approver === "ops-team" ? "Ravi" : req.approver;
  const clicked = d.identity ? person : req.approver === "ops-team" ? "ops-team" : "someone with the link";
  const refusal = !(d.rules && d.identity && req.decision === "approve") ? null : person === req.requester ? "you can't approve your own request" : req.amount > LIMIT[person] ? `$${req.amount} is over ${person}'s $${LIMIT[person]} limit; Maya approves it instead` : null;
  const refused = refusal !== null;
  const blocked = o.prevented !== null && o.paid.length < (req.clickedTwice ? 2 : 1) && req.decision === "approve" && !refused;

  const toggle = (k: keyof Design, label: string, note: string) => (
    <>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={d[k]} onChange={(e) => set({ [k]: e.target.checked } as Partial<Design>)} className="h-4 w-4" style={{ accentColor: ACCENT }} />
        {label}
      </label>
      <p className="text-[11px] text-[var(--faint)]">{note}</p>
    </>
  );

  const nodes: MapNode[] = [
    { id: "flow", label: "Refund workflow", sub: `${REQUESTS.length} requests`, at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "button", label: "Approve button", sub: d.identity ? "sign-in required" : "anyone with the link", at: [50, 18], mobileAt: [75, 12], state: d.identity ? "good" : "wait" },
    { id: "person", label: clicked, sub: req.requester === person ? "also the requester" : `limit $${LIMIT[person]}`, at: [86, 18], mobileAt: [75, 42], state: d.identity ? "active" : "wait" },
    { id: "rules", label: "Policy check", sub: d.rules ? (d.identity ? "own request · limit" : "no idea who clicked") : "off", at: [86, 72], mobileAt: [25, 42], state: d.rules && d.identity ? (refused ? "bad" : "good") : "dim" },
    { id: "store", label: "Records", sub: d.log ? "row + append-only log" : "a status row", at: [50, 72], mobileAt: [25, 72], state: d.log ? "good" : "wait" },
    { id: "pay", label: "Payments", sub: d.bind ? "checks the approved hash" : "pays what it's given", at: [14, 72], mobileAt: [75, 72], state: o.paid.length > 1 || (req.editedTo && o.paid.length) ? "bad" : o.paid.length ? "good" : "idle" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("q", ["flow", "button"], { label: `#${req.id} · $${req.amount}` })
    : stage === 1 ? hops("c", ["button", "person"], { label: req.decision === "reject" ? "Reject" : "Approve" })
    : stage === 2 ? (refused ? hops("r", ["person", "rules", "person"], { label: "refused", tone: "bad" }) : hops("r", ["person", "rules"], { label: d.rules && d.identity ? "allowed" : "unchecked", tone: d.rules && d.identity ? "good" : undefined }))
    : stage === 3 ? hops("s", ["rules", "store"], { label: d.bind ? "decision + hash" : "status = approved" })
    : stage === 4 ? (req.decision === "reject" || (refused && !o.paid.length) ? [] : hops("p", ["store", "pay"], { label: o.paid.length ? o.paid.map((x) => `$${x}`).join(" + ") : "blocked", tone: blocked && !o.paid.length ? "good" : o.paid.length > 1 || (req.editedTo && o.paid.length) ? "bad" : "good" }))
    : [];

  const captions = [
    `Step 1: request #${req.id}, $${req.amount} from ${req.requester}, goes out as a message with Approve and Reject.`,
    `Step 2: ${clicked} clicks ${req.decision === "reject" ? "Reject" : "Approve"}${d.identity ? "" : "; the click carries no verified identity"}.`,
    d.rules ? (d.identity ? (refused ? `Step 3: refused: ${refusal}.` : "Step 3: the policy check passes.") : "Step 3: the policy check can't run without knowing who clicked.") : "Step 3: nothing checks whether this person may approve this.",
    d.log ? `Step 4: ${o.log.length} events are appended to the log.` : `Step 4: the row is overwritten: ${Object.entries(o.row).map(([k, v]) => `${k} ${v}`).join(", ")}.`,
    req.decision === "reject" ? "Step 5: rejected; nothing is paid." : `Step 5: ${o.paid.length ? `paid ${o.paid.map((x) => `$${x}`).join(" and ")}` : "nothing paid"}${o.prevented ? ` — ${o.prevented}` : ""}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${all.prevented} of ${all.incidents} incidents prevented · ${all.answered} of ${all.answers.length} audit questions answerable · $${all.bad.toLocaleString("en-US")} paid without a valid approval.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Automation · interactive"
        title="Who approved what"
        blurb="Seven refunds pass through an Approve button. Months later an auditor asks who approved what, whether they saw the amount that was paid, and why one was rejected. Meanwhile an amount was edited after approval, someone approved their own request, a shared login clicked, a limit was ignored and a link was clicked twice. Add the controls and see what is prevented and what can be answered."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Refund workflow, an approve button, the person who clicks, a policy check, the records and payments"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "flow", to: "button", label: "request" },
                  { from: "button", to: "person", label: "click" },
                  { from: "person", to: "rules", label: "decision", dim: !d.rules },
                  { from: "rules", to: "store", label: "record" },
                  { from: "store", to: "pay", label: "execute" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <Requests d={d} pick={pick} setPick={setPick} />
              <Questions d={d} />
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
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Approving…">
                {`Run request #${req.id}`}
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Send the exact thing to approve" what="The message shows what will happen: the action, the amount, who asked. Its payload, not a link to a record that can still change, is what the approval should be about." accent={ACCENT} active={at(0)}>
                <p className="text-xs">
                  #{req.id}: refund ${req.amount}, requested by {req.requester}.{req.incident ? <span className="text-[var(--bad)]"> Goes wrong: {req.incident}.</span> : ""}
                </p>
                <p className="mt-1 font-mono text-[11px] text-[var(--faint)]">{`{"request":${req.id},"action":"refund","amount":${req.amount}}`}</p>
              </FlowStep>
              <FlowArrow label="Approve / Reject" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Know who clicked" what="A button anyone in a channel can press, or a link in a forwarded email, records a click, not a person. Require a named sign-in on every decision; refuse shared logins." accent={ACCENT} active={at(1)}>
                {toggle("identity", "Named sign-in on every decision", `Recorded as: ${clicked}.`)}
              </FlowStep>
              <FlowArrow label="a person's decision" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Check the rules at the moment of the click" what="Separation of duties and limits: you can't approve your own request, and you can't approve more than your limit. These checks need to know who clicked, so they do nothing without the step above." accent={ACCENT} active={at(2)}>
                {toggle("rules", "Refuse self-approval and amounts over the approver's limit", d.rules && !d.identity ? "Turned on, but it can't tell who clicked, so it never fires." : `Limits: Jo, Sam and Ravi $500 · Maya $2,000.`)}
              </FlowStep>
              <FlowArrow label="an allowed decision" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Record events, not just a status" what="A status column keeps only the last write: approved, by whom, maybe. An append-only log keeps every event (requested, approved, edited, paid, refused) with the actor, the payload's hash and a required reason." accent={ACCENT} active={at(3)}>
                {toggle("log", "Append-only log with a reason for every decision", "")}
                <div className="mt-1 rounded-md bg-[var(--inset)] p-2 font-mono text-[11px]">
                  <p className="text-[var(--faint)]">status row</p>
                  <p className="break-words">{Object.entries(o.row).map(([k, v]) => `${k}: ${v || "—"}`).join(" · ")}</p>
                  {d.log && (
                    <>
                      <p className="mt-2 text-[var(--faint)]">log</p>
                      <ol>
                        {o.log.map((e, i) => (
                          <li key={i} className="break-words" style={{ color: e.event === "blocked" || e.event === "refused" ? "var(--c2)" : e.event === "edited" ? "var(--bad)" : "var(--text)" }}>
                            {e.event} · {e.by} · {e.detail}
                          </li>
                        ))}
                      </ol>
                    </>
                  )}
                </div>
              </FlowStep>
              <FlowArrow label="approved hash" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Execute only what was approved, once" what="Before paying, recompute the payload's hash and compare it with the approved one: an edit after approval no longer matches. Mark the approval used when it pays, so a second click or a retried webhook does nothing." accent={ACCENT} active={at(4)}>
                {toggle("bind", "Approve a hash of the payload; check it and use it once", "")}
                <p className="mt-1 text-xs">{req.decision === "reject" ? "Rejected: nothing to pay." : o.paid.length ? `Paid ${o.paid.map((x) => `$${x}`).join(" and ")}.` : "Nothing paid."}{o.prevented ? ` ${o.prevented[0].toUpperCase()}${o.prevented.slice(1)}.` : ""}</p>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The requests are seeded. Sign-in, the rules, the hash check, the records and the auditor&apos;s answers run for real on them.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Requests({ d, pick, setPick }: { d: Design; pick: number; setPick: (n: number) => void }) {
  const all = runAll(d);
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Seven requests and what was paid">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">requests · pick one</p>
        <p className="font-mono text-xs" style={{ color: all.bad ? "var(--bad)" : "var(--good)" }}>
          ${all.bad.toLocaleString("en-US")} paid wrongly
        </p>
      </div>
      <ul className="mt-3 space-y-0.5">
        {all.outcomes.map((o) => {
          const bad = o.paid.length > 1 || (o.r.editedTo && o.paid.length) || (o.actor && o.paid.length && (o.actor === o.r.requester || o.r.amount > LIMIT[o.actor]));
          return (
            <li key={o.r.id}>
              <button type="button" aria-pressed={o.r.id === pick} onClick={() => setPick(o.r.id)} className="grid min-h-11 w-full grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-1.5 text-left text-xs" style={{ background: o.r.id === pick ? `color-mix(in srgb, ${ACCENT} 14%, transparent)` : "transparent" }}>
                <span className="font-mono text-[var(--faint)]">#{o.r.id}</span>
                <span className="min-w-0">
                  <span className="block truncate">
                    ${o.r.amount} · {o.r.requester}
                  </span>
                  {o.r.incident && <span className="block truncate text-[11px] text-[var(--faint)]">{o.r.incident}</span>}
                </span>
                <span className="text-right font-mono text-[11px]" style={{ color: bad ? "var(--bad)" : o.prevented ? "var(--good)" : "var(--muted)" }}>
                  {o.r.decision === "reject" ? "rejected" : o.paid.length ? `paid ${o.paid.map((x) => `$${x}`).join("+")}` : "not paid"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Questions({ d }: { d: Design }) {
  const all = runAll(d);
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="The auditor's questions">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">the auditor asks, months later</p>
        <p className="font-mono text-xs" style={{ color: all.answered === all.answers.length ? "var(--good)" : "var(--bad)" }}>
          {all.answered}/{all.answers.length} answerable
        </p>
      </div>
      <ul className="mt-3 space-y-1.5 text-xs">
        {all.answers.map(({ q, a }) => (
          <li key={q.id}>
            <p>{q.q}</p>
            <p className="text-[11px]" style={{ color: a ? "var(--good)" : "var(--bad)" }}>
              {a ?? "Can't tell from the records."}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
