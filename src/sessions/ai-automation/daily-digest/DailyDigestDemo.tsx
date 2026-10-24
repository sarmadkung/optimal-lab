"use client";

import { useState, type ReactNode } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { BUDGET, DOWN_SOURCE, FIRST, FIXED, ITEMS, digest, type Design } from "@/lib/dailyDigest";

const ACCENT = "var(--auto)";
const clock = (h: number) => `${String(Math.floor(h)).padStart(2, "0")}:${h % 1 ? "30" : "00"}`;

export default function DailyDigestDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const r = digest(d);
  const totalTokens = ITEMS.filter((i) => d.retry || i.source !== DOWN_SOURCE).reduce((a, i) => a + i.tokens, 0);

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
    { id: "gh", label: "GitHub", sub: "50 updates", at: [14, 14], mobileAt: [20, 12], state: "active" },
    { id: "jira", label: "Jira", sub: d.retry ? "503, then OK on retry" : "503 at 07:00", at: [14, 50], mobileAt: [50, 12], state: d.retry ? "good" : "bad" },
    { id: "chat", label: "Slack + PagerDuty", sub: "50 updates", at: [14, 86], mobileAt: [80, 12], state: "active" },
    { id: "flow", label: "Digest workflow", sub: d.mapReduce ? `${r.calls} summary calls` : `1 call, ${BUDGET / 1000}k budget`, at: [50, 50], mobileAt: [50, 44], state: r.dropped ? "bad" : "good" },
    { id: "model", label: "Model", sub: `${r.invented} invented line${r.invented === 1 ? "" : "s"}`, at: [86, 18], mobileAt: [80, 76], state: r.invented ? "bad" : "good" },
    { id: "people", label: "12 people, 3 time zones", sub: `${r.onTime} get it at 08:00`, at: [86, 82], mobileAt: [20, 76], state: r.onTime === r.people ? "good" : "bad" },
  ];

  const packets: Packet[] =
    stage === 0 ? [...hops("g", ["gh", "flow"], { label: "PRs" }), ...hops("j", ["jira", "flow"], { label: d.retry ? "retry ok" : "503", tone: d.retry ? "good" : "bad", start: 0.1 }), ...hops("c", ["chat", "flow"], { label: "messages", start: 0.2 })]
    : stage === 1 ? hops("m", ["flow", "model", "flow"], { label: d.mapReduce ? "per source, then combine" : r.dropped ? `${r.dropped} items cut` : "one prompt", tone: r.dropped ? "bad" : "good" })
    : stage === 2 ? []
    : stage === 3 ? (r.invented ? hops("inv", ["model", "flow"], { label: "uncited line", tone: "bad" }) : [])
    : stage === 4 ? hops("p", ["flow", "people"], { label: d.localTime ? "08:00 local" : "08:00 UTC", tone: r.onTime === r.people ? "good" : "bad" })
    : [];

  const captions = [
    d.retry ? `Step 1: ${DOWN_SOURCE} returns 503 at 07:00; the workflow retries at 07:20 and gets it, and says so in the digest.` : `Step 1: ${DOWN_SOURCE} returns 503 at 07:00, and the digest goes out without it, saying nothing.`,
    d.mapReduce ? `Step 2: each source is summarised on its own, then the summaries are combined: ${r.calls} calls, nothing cut.` : `Step 2: ${totalTokens.toLocaleString("en-US")} tokens of updates go into one prompt that takes ${BUDGET.toLocaleString("en-US")}; ${r.dropped} items at the end are cut.`,
    d.dedupe ? "Step 3: the same incident from PagerDuty, Jira and Slack becomes one line with three links." : `Step 3: ${r.duplicates} lines repeat something another line already says.`,
    d.cite ? "Step 4: every line must link to items that exist; lines the model added on its own are dropped." : `Step 4: ${r.invented} line${r.invented === 1 ? "" : "s"} that no source says stay in.`,
    `Step 5: ${r.deliveries.map((p) => `${p.city} at ${clock(p.local)}`).join(", ")}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${r.covered} of ${r.importantTotal} things that mattered · ${r.invented} invented · ${r.duplicates} repeated · ${r.onTime} of ${r.people} people get it at 8:00${r.silentGap ? ` · ${DOWN_SOURCE} silently missing` : ""}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Automation · case study"
        title="A daily digest"
        blurb="Every morning a workflow gathers yesterday's updates from GitHub, Jira, PagerDuty and Slack, has a model summarise them, and sends 12 people in San Francisco, London and Bengaluru a digest at 8 a.m. Yesterday had 140 updates and 12 that mattered. Build the digest and read what it says."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="GitHub, Jira, Slack and PagerDuty feeding the digest workflow, a model, and twelve people in three time zones"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "gh", to: "flow", label: "fetch" },
                  { from: "jira", to: "flow", label: "fetch" },
                  { from: "chat", to: "flow", label: "fetch" },
                  { from: "flow", to: "model", label: "summarise" },
                  { from: "flow", to: "people", label: "deliver" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <Digest d={d} />
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
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Writing…">
                Run this morning
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Gather every source, and say when one fails" what="A source that's down at 07:00 is common. Retry it before giving up, and if it's still down, say “Jira unavailable” at the top. A digest that silently lacks a source is read as “nothing happened there”." accent={ACCENT} active={at(0)}>
                {toggle("retry", "Retry a failed source, and note any still missing")}
                {r.notice && <p className="text-[11px] text-[var(--muted)]">{r.notice}.</p>}
              </FlowStep>
              <FlowArrow label="140 updates" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Summarise per source, then combine" what="All updates in one prompt overflow the budget on a busy day, and whatever comes last is cut. Fetching more makes it worse. Summarise each source on its own, then combine the summaries." accent={ACCENT} active={at(1)}>
                {toggle("mapReduce", "One summary per source, then one to combine them", <p className="font-mono text-[11px] text-[var(--muted)]">{totalTokens.toLocaleString("en-US")} tokens of updates · budget {BUDGET.toLocaleString("en-US")} per call · {r.dropped} cut</p>)}
              </FlowStep>
              <FlowArrow label="summaries" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Merge what several sources say" what="An incident shows up in PagerDuty, in a Jira ticket and in #incidents. Group lines by the thing they're about (an incident id, a PR number) and keep one line with every link." accent={ACCENT} active={at(2)}>
                {toggle("dedupe", "Merge lines about the same incident or PR")}
              </FlowStep>
              <FlowArrow label="lines" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Link every line to its sources" what="Ask for the item ids behind each line, then check them in code. A line with no ids, or ids that don't exist, was written by the model, not by your team: drop it." accent={ACCENT} active={at(3)}>
                {toggle("cite", "Require item links on every line; drop lines without them")}
              </FlowStep>
              <FlowArrow label="digest" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Deliver at 8:00 where each person is" what="One cron at 08:00 UTC reaches London at breakfast, San Francisco at midnight and Bengaluru after lunch. Schedule per person, by their time zone." accent={ACCENT} active={at(4)}>
                {toggle("localTime", "Send at 08:00 in each person's time zone")}
                <ul className="space-y-0.5 font-mono text-[11px]">
                  {r.deliveries.map((p) => (
                    <li key={p.city} style={{ color: p.onTime ? "var(--good)" : "var(--bad)" }}>
                      {p.city} ({p.count}): {clock(p.local)}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Yesterday&apos;s items, which matter and what the model adds are seeded. Fetching, the retry, the budget cut, merging, the link check and delivery times run here.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Digest({ d }: { d: Design }) {
  const r = digest(d);
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="The digest as sent">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">the digest</p>
        <p className="font-mono text-xs" style={{ color: r.covered === r.importantTotal && !r.invented ? "var(--good)" : "var(--bad)" }}>
          {r.covered}/{r.importantTotal} that mattered
        </p>
      </div>
      {r.notice && <p className="mt-2 text-[11px] text-[var(--c2)]">Note: {r.notice}.</p>}
      <ul className="mt-2 space-y-1 text-xs">
        {r.bullets.map((b, i) => {
          const dupe = !d.dedupe && b.about && r.bullets.findIndex((x) => x.about === b.about) !== i;
          return (
            <li key={i} className="flex gap-2" style={{ color: b.invented ? "var(--bad)" : dupe ? "var(--c2)" : "var(--text)" }}>
              <span aria-hidden>•</span>
              <span className="min-w-0">
                {b.text}
                {b.cites.length > 0 && <span className="font-mono text-[10px] text-[var(--faint)]"> [{b.cites.join(", ")}]</span>}
                {b.invented && <span className="text-[10px]"> — no source says this</span>}
                {dupe && <span className="text-[10px]"> — said already</span>}
              </span>
            </li>
          );
        })}
      </ul>
      {r.missing.length > 0 && (
        <div className="mt-3 border-t border-[var(--line)] pt-2">
          <p className="font-mono text-[11px] text-[var(--faint)]">missing:</p>
          <ul className="space-y-0.5 text-[11px] text-[var(--muted)]">
            {r.missing.map((m) => (
              <li key={m.id}>
                {m.text} <span className="font-mono text-[10px]">({m.source})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
