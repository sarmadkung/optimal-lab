"use client";

import { useState, type ReactNode } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { FIRST, FIXED, PAGE_AT, PER_DAY, PRICE_PER_CALL, SLACK_LOOK_MIN, THRESHOLDS, sweep, triage, type Design } from "@/lib/inboxTriage";

const ACCENT = "var(--auto)";

export default function InboxTriageDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const r = triage(d);
  const rows = sweep(d);

  const toggle = (k: "prefilter" | "perThread" | "quietHours" | "feedback", label: string, extra?: ReactNode) => (
    <>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={d[k]} onChange={(e) => set({ [k]: e.target.checked } as Partial<Design>)} className="h-4 w-4" style={{ accentColor: ACCENT }} />
        {label}
      </label>
      {extra}
    </>
  );

  const nodes: MapNode[] = [
    { id: "inbox", label: "ops@ inbox", sub: `${PER_DAY} emails a day`, at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "rules", label: "Header rules", sub: d.prefilter ? `${r.machineFiltered} machine mails out` : "off", at: [50, 18], mobileAt: [75, 12], state: d.prefilter ? "good" : "dim" },
    { id: "model", label: "Urgency model", sub: `${r.scoredCalls} calls a day`, at: [86, 18], mobileAt: [75, 42], state: "active" },
    { id: "slack", label: "#ops in Slack", sub: `${r.posts} posts a day`, at: [86, 80], mobileAt: [75, 74], state: r.falsePosts > r.caught ? "bad" : "good" },
    { id: "phone", label: "On-call phone", sub: `${r.nightPages} night pings`, at: [50, 80], mobileAt: [25, 74], state: r.nightPages > 10 ? "bad" : "good" },
    { id: "fb", label: "Feedback examples", sub: d.feedback ? "👍/👎 from posts" : "none", at: [14, 80], mobileAt: [25, 42], state: d.feedback ? "good" : "dim" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("i", ["inbox", "rules"], { label: "email" })
    : stage === 1 ? hops("s", ["rules", "model"], { label: d.prefilter ? "people's mail only" : "everything" })
    : stage === 2 ? hops("p", ["model", "slack"], { label: d.perThread ? "one post per thread" : "a post per message", tone: d.perThread ? "good" : "bad" })
    : stage === 3 ? hops("n", ["slack", "phone"], { label: d.quietHours ? `only ≥ ${PAGE_AT} at night` : "every post, all night", tone: d.quietHours ? "good" : "bad" })
    : stage === 4 ? (d.feedback ? hops("f", ["slack", "fb", "model"], { label: "👍 / 👎 → examples" }) : [])
    : [];

  const captions = [
    `Step 1: ${PER_DAY} emails arrive in a day; ${d.prefilter ? `${r.machineFiltered} carry Auto-Submitted or List-Id headers and never reach the model` : "every one goes to the model"}.`,
    `Step 2: ${r.scoredCalls} emails are scored; ${r.caught} of ${r.urgentThreads} urgent threads score ${d.threshold} or more.`,
    `Step 3: ${r.posts} posts in #ops, ${r.falsePosts} of them not urgent.`,
    d.quietHours ? `Step 4: at night only scores of ${PAGE_AT} or more ping the phone (${r.nightPages}); ${r.heldTillMorning} urgent threads wait until 07:00.` : `Step 4: ${r.nightPages} posts arrive between 22:00 and 07:00 and ping whoever is on call.`,
    d.feedback ? "Step 5: reactions on posts become examples in the prompt; scores separate a little better." : "Step 5: nobody's reactions feed back, so the model stays as it was.",
  ];
  const caption = stage !== null ? captions[stage] : `${r.caught} of ${r.urgentThreads} urgent threads posted · ${r.posts} posts a day (${r.falsePosts} not urgent) · ${r.nightPages} night pings · $${r.cost.toFixed(0)} a month.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Automation · case study"
        title="Triage an inbox into Slack"
        blurb="A shared ops@ inbox gets 600 emails a day: customers, suppliers, alerts, newsletters, receipts. A workflow should post only the urgent ones to #ops. Missing an urgent email is costly; posting too many trains everyone to ignore the channel. Build the triage and count both."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="The ops inbox, header rules, an urgency model, the #ops channel, the on-call phone and feedback examples"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "inbox", to: "rules", label: "push" },
                  { from: "rules", to: "model", label: "score" },
                  { from: "model", to: "slack", label: "urgent" },
                  { from: "slack", to: "phone", label: "notify" },
                  { from: "fb", to: "model", label: "examples", dim: !d.feedback },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <Sweep rows={rows} current={d.threshold} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  As first built
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Tuned
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Triaging…">
                Run the day
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Filter machine mail with rules first" what="Newsletters, alerts and receipts announce themselves in headers (Auto-Submitted, List-Id, Precedence). Rules are free and exact; spend model calls on mail people wrote." accent={ACCENT} active={at(0)}>
                {toggle("prefilter", "Drop mail with automatic or list headers before scoring", <p className="font-mono text-[11px] text-[var(--muted)]">{r.scoredCalls} scoring calls a day · ${(r.scoredCalls * PRICE_PER_CALL).toFixed(2)} a day</p>)}
              </FlowStep>
              <FlowArrow label="people's mail" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Score urgency, then choose the threshold on purpose" what="The threshold trades missed urgent mail against noise. Some urgent mail sounds calm (“quick question: invoices stopped syncing”). Look at both numbers at every threshold before picking one." accent={ACCENT} active={at(1)}>
                <Choices label="Post when the score is at least" accent={ACCENT} value={String(d.threshold)} onChange={(v) => set({ threshold: Number(v) })} options={THRESHOLDS.map((t) => ({ id: String(t), label: String(t) }))} />
              </FlowStep>
              <FlowArrow label="urgent emails" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Post once per thread" what="Urgent threads get replies fast, and each reply scores urgent too. Post the first one and put later messages in that post's thread, so one problem is one post." accent={ACCENT} active={at(2)}>
                {toggle("perThread", "One post per email thread")}
              </FlowStep>
              <FlowArrow label="posts" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Decide what wakes someone up" what={`Posting at night pings whoever has notifications on. Quiet hours page only for the surest cases (${PAGE_AT}+) and leave the rest for 07:00, which is a trade: some urgent threads wait.`} accent={ACCENT} active={at(3)}>
                {toggle("quietHours", `22:00–07:00: notify only for scores of ${PAGE_AT} or more`, <p className="text-[11px]" style={{ color: r.heldTillMorning ? "var(--c2)" : "var(--faint)" }}>{d.quietHours ? `${r.heldTillMorning} urgent threads wait until morning.` : `${r.nightPages} night pings.`}</p>)}
              </FlowStep>
              <FlowArrow label="reactions" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Learn from the channel" what="Put 👍 / 👎 buttons on each post. A month of reactions is a labelled set: use the best as examples in the prompt, and as the test set when you change it." accent={ACCENT} active={at(4)}>
                {toggle("feedback", "Use reactions as examples in the prompt")}
                <dl className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-xs">
                  <dt>Urgent threads posted</dt>
                  <dd className="text-right font-mono" style={{ color: r.missed ? "var(--bad)" : "var(--good)" }}>{r.caught} / {r.urgentThreads}</dd>
                  <dt>Posts a day (not urgent)</dt>
                  <dd className="text-right font-mono">{r.posts} ({r.falsePosts})</dd>
                  <dt>Minutes reading posts a day</dt>
                  <dd className="text-right font-mono">{r.minutesLooking} (at {SLACK_LOOK_MIN} each)</dd>
                  <dt>Model cost a month</dt>
                  <dd className="text-right font-mono">${r.cost.toFixed(0)}</dd>
                </dl>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The day&apos;s emails and the model&apos;s scores are seeded and illustrative. Rules, the threshold, threading, quiet hours, the counts and the cost run here.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Sweep({ rows, current }: { rows: ReturnType<typeof sweep>; current: number }) {
  const maxPosts = Math.max(...rows.map((x) => x.posts), 1);
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Urgent threads caught and posts per day at each threshold">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">every threshold, same day</p>
      <div className="mt-3 grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 text-[11px]">
        <span />
        <span className="font-mono text-[var(--faint)]">urgent caught</span>
        <span className="font-mono text-[var(--faint)]">posts a day</span>
        {rows.map((x) => (
          <div key={x.t} className="contents">
            <span className="font-mono" style={{ fontWeight: x.t === current ? 700 : 400, color: x.t === current ? ACCENT : "var(--muted)" }}>
              {x.t}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="block h-2 rounded-full" style={{ width: `${(x.caught / x.urgentThreads) * 100}%`, background: x.missed ? "var(--c2)" : "var(--good)" }} />
              <span className="shrink-0 font-mono">{x.caught}/{x.urgentThreads}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="block h-2 rounded-full" style={{ width: `${(x.posts / maxPosts) * 100}%`, background: "var(--c4)" }} />
              <span className="shrink-0 font-mono">{x.posts}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
