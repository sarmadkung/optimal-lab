"use client";

import { useState, type ReactNode } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { FIRST, FIXED, LOOP_MINUTES, MAILS, automatic, failsDmarc, handle, runAll, type Design } from "@/lib/emailAutomation";

const ACCENT = "var(--auto)";

export default function EmailAutomationDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [pick, setPick] = useState(2);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const m = MAILS.find((x) => x.id === pick)!;
  const r = handle(m, d);
  const all = runAll(d);
  const auto = automatic(m);

  const toggle = (k: keyof Design, label: string, extra?: ReactNode) => (
    <>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={d[k]} onChange={(e) => set({ [k]: e.target.checked } as Partial<Design>)} className="h-4 w-4" style={{ accentColor: ACCENT }} />
        {label}
      </label>
      {extra}
    </>
  );

  const nodes: MapNode[] = [
    { id: "sender", label: m.kind === "list" ? "Mailing list" : m.kind === "bounce" ? "Mail server" : "Sender", sub: m.from.length > 22 ? m.from.slice(0, 21) + "…" : m.from, at: [14, 18], mobileAt: [25, 12], state: m.kind === "spoofed" ? "bad" : "active" },
    { id: "inbox", label: "support@ inbox", sub: d.dedupe ? "label: processed" : "unread = new", at: [50, 18], mobileAt: [75, 12], state: "active" },
    { id: "flow", label: "Auto-reply workflow", sub: r.replied ? "replies" : "skips", at: [86, 18], mobileAt: [75, 42], state: r.replied ? (r.harm ? "bad" : "good") : "good" },
    { id: "desk", label: "Helpdesk", sub: r.where === "new-ticket" ? "a second ticket" : r.where === "thread" ? "same ticket" : "ticket #", at: [86, 80], mobileAt: [25, 42], state: r.where === "new-ticket" ? "bad" : r.replied ? "active" : "dim" },
    { id: "smtp", label: "Outgoing mail", sub: d.dkim ? "SPF · DKIM · DMARC" : "unsigned", at: [50, 80], mobileAt: [75, 72], state: r.replied ? (d.dkim ? "good" : "wait") : "dim" },
    { id: "to", label: "Recipient", sub: r.where === "spam" ? "spam folder" : r.where === "list" ? "4,000 people" : r.replied ? (r.harm ? "shouldn't get it" : "inbox") : "nothing sent", at: [14, 80], mobileAt: [25, 72], state: !r.replied ? "dim" : r.harm ? "bad" : "good" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("in", ["sender", "inbox", "flow"], { label: m.subject.length > 18 ? m.subject.slice(0, 17) + "…" : m.subject })
    : stage === 1 ? (r.skipReason ? hops("s", ["flow", "inbox"], { label: "skip", tone: "good" }) : hops("a", ["flow", "desk"], { label: "new ticket" }))
    : stage === 2 ? (m.kind === "ooo" && r.replied ? hops("loop", ["flow", "smtp", "to", "sender", "inbox", "flow"], { label: d.perSender ? "1 reply, then capped" : "reply → auto-reply →", tone: "bad" }) : [])
    : stage === 3 ? (r.replied ? hops("t", ["desk", "flow"], { label: d.threads ? "In-Reply-To set" : "no thread headers", tone: d.threads ? "good" : undefined }) : [])
    : stage === 4 ? (r.replied ? hops("o", ["flow", "smtp", "to"], { label: r.sent > 1 ? `${r.sent} replies` : "reply", tone: r.harm ? "bad" : "good" }) : [])
    : [];

  const captions = [
    `Step 1: email ${m.id} arrives from ${m.from}${m.redelivered && !d.dedupe ? "; after a crash it will be read a second time" : ""}.`,
    r.skipReason ? `Step 2: not answered: ${r.skipReason}.` : auto ? `Step 2: it's automatic mail (${auto}) but nothing checks.` : failsDmarc(m) ? "Step 2: it fails DMARC, but nothing checks." : "Step 2: a person wrote it; it gets an answer.",
    m.kind === "ooo" && r.replied ? (d.perSender ? "Step 3: one reply goes out; the per-sender limit stops the next." : `Step 3: their responder answers ours, ours answers theirs: ${LOOP_MINUTES} replies in an hour.`) : "Step 3: no loop risk for this one.",
    !r.replied ? "Step 4: nothing to thread." : d.threads ? "Step 4: the reply carries In-Reply-To and References, so it joins the thread and the ticket." : "Step 4: no thread headers: a follow-up opens a new ticket and the reply starts a new thread.",
    !r.replied ? "Step 5: nothing sent." : `Step 5: ${r.harm ?? "the reply lands in the customer's inbox, in the right thread"}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${all.good} of ${all.shouldReply} customers answered properly · ${all.wrongReplies} replies to machines or forgeries · ${all.sent} emails sent · ${all.spam} in spam.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Automation · interactive"
        title="Email in and out"
        blurb="A support inbox auto-acknowledges every email with a ticket number. Ten messages arrive with real headers: customers, but also an out-of-office reply, a newsletter, a no-reply notice, a bounce, a forged sender and a follow-up in a thread. Reading headers decides who gets an answer, and authentication decides whether it arrives."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="A sender, the support inbox, the auto-reply workflow, the helpdesk, the outgoing mail server and the recipient"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "sender", to: "inbox", label: "mail" },
                  { from: "inbox", to: "flow", label: "new" },
                  { from: "flow", to: "desk", label: "ticket" },
                  { from: "flow", to: "smtp", label: "reply", dim: !r.replied },
                  { from: "smtp", to: "to", label: "delivers", dim: !r.replied },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <MailList d={d} pick={pick} setPick={setPick} />
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
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Delivering…">
                {`Run email ${m.id}`}
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Read each message once" what="“Unread” is not a queue: a crash after replying and before marking leaves the mail unread, and the next run answers it again. Record each Message-ID you've handled, or label the mail processed in the same step as the reply." accent={ACCENT} active={at(0)}>
                <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-[var(--inset)] p-2 font-mono text-[11px]">
                  {[`From: ${m.from}`, `Subject: ${m.subject}`, ...Object.entries(m.headers).map(([k, v]) => `${k}: ${v}`)].join("\n")}
                </pre>
                {toggle("dedupe", "Skip Message-IDs already handled")}
              </FlowStep>
              <FlowArrow label="new mail" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Don't answer machines or forgeries" what="RFC 3834 says automatic replies must skip mail marked Auto-Submitted, list mail (List-Id, Precedence: list or bulk), bounces and no-reply senders. Mail that fails DMARC claims a sender it isn't from; replying sends your mail to the victim." accent={ACCENT} active={at(1)}>
                {toggle("skipAuto", "Skip automatic, list, bounce and no-reply mail", <p className="text-[11px] text-[var(--faint)]">{auto ? `This one is: ${auto}.` : "This one looks written by a person."}</p>)}
                {toggle("dmarc", "Skip mail that fails DMARC", <p className="text-[11px] text-[var(--faint)]">{m.headers["Authentication-Results"] ?? "No authentication failure recorded."}</p>)}
              </FlowStep>
              <FlowArrow label="mail worth answering" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Limit replies per sender" what="Two auto-responders answering each other is a mail loop. Header checks catch most; a limit of one automatic reply per sender per day catches the rest, as RFC 3834 recommends." accent={ACCENT} active={at(2)}>
                {toggle("perSender", "At most one automatic reply per sender per day")}
                <p className="font-mono text-xs">{all.loop ? `${all.loop} replies to the out-of-office in an hour` : "no loop"}</p>
              </FlowStep>
              <FlowArrow label="one reply" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Reply inside the thread" what="Mail clients thread by the In-Reply-To and References headers, not by subject. Set them from the message you're answering, and match follow-ups to their ticket by the same headers." accent={ACCENT} active={at(3)}>
                {toggle("threads", "Set In-Reply-To and References; match tickets by them")}
              </FlowStep>
              <FlowArrow label="reply" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Send from an authenticated domain" what="Gmail and Yahoo want every sender to pass SPF or DKIM, and bulk senders to have all three with DMARC; unauthenticated mail goes to spam or is refused. Send replies through a domain that signs them, and count where they land." accent={ACCENT} active={at(4)}>
                {toggle("dkim", "Send through a domain with SPF, DKIM and DMARC")}
                <p className="font-mono text-xs">
                  {all.good}/{all.shouldReply} answered well · {all.wrongReplies} wrong replies · {all.duplicates} doubled · {all.broken} broken threads · {all.spam} in spam · {all.sent} sent
                </p>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The messages are made up; their headers are real. The checks, the loop, threading, the dedupe and where replies land run here.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function MailList({ d, pick, setPick }: { d: Design; pick: number; setPick: (n: number) => void }) {
  const all = runAll(d);
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Ten incoming emails and what the workflow did">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">inbox · pick one</p>
        <p className="font-mono text-xs" style={{ color: all.sent > all.shouldReply ? "var(--bad)" : "var(--good)" }}>
          {all.sent} emails sent
        </p>
      </div>
      <ul className="mt-3 space-y-0.5">
        {all.results.map((r) => (
          <li key={r.m.id}>
            <button type="button" aria-pressed={r.m.id === pick} onClick={() => setPick(r.m.id)} className="grid min-h-11 w-full grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-1.5 text-left text-xs" style={{ background: r.m.id === pick ? `color-mix(in srgb, ${ACCENT} 14%, transparent)` : "transparent" }}>
              <span className="font-mono text-[var(--faint)]">{r.m.id}</span>
              <span className="min-w-0">
                <span className="block truncate">{r.m.subject}</span>
                <span className="block truncate text-[11px] text-[var(--faint)]">{r.m.note}</span>
              </span>
              <span className="text-right text-[11px]" style={{ color: r.harm ? "var(--bad)" : r.replied ? "var(--good)" : "var(--muted)" }}>
                {!r.replied ? "skipped" : r.harm ? (r.sent > 1 ? `${r.sent} replies` : "bad reply") : "answered"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
