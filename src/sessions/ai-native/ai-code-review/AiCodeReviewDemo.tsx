"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type Packet } from "@/components/system/SystemMap";
import { COMMENTS, PRS, REAL_BUGS, THRESHOLDS, review, type Filters } from "@/lib/aiCodeReview";

const ACCENT = "var(--native)";
const pct = (x: number) => `${Math.round(x * 100)}%`;
const RAW: Filters = { hideStyle: false, minConf: 0, evidence: false };

export default function AiCodeReviewDemo() {
  const [f, setF] = useState<Filters>(RAW);
  const [pr, setPr] = useState(0);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Filters>) => setF((c) => ({ ...c, ...p }));
  const r = review(f);
  const raw = review(RAW);

  const packets: Packet[] =
    stage === 0 ? hops("pr", ["pr", "ci", "model"], { label: `${PRS} pull requests` })
    : stage === 1 ? hops("c", ["model", "filter"], { label: `${raw.shown.length} comments` })
    : stage === 2 ? hops("f", ["filter", "pr"], { label: `${r.shown.length} posted`, tone: r.precision >= 0.5 ? "good" : "bad" })
    : stage === 3 ? hops("h", ["pr", "human"], { label: `${r.perPr.toFixed(1)} per PR` })
    : stage === 4 ? hops("s", ["human", "filter"], { label: `${r.caught}/${REAL_BUGS} bugs · ${pct(r.precision)} useful`, tone: r.precision >= 0.5 ? "good" : "bad" })
    : [];

  const captions = [
    `Step 1: every pull request runs the AI reviewer in CI; ${REAL_BUGS} real bugs are hidden across the ${PRS} PRs.`,
    `Step 2: it writes ${raw.shown.length} comments, about ${raw.perPr.toFixed(0)} per PR; ${raw.caught} point at real bugs.`,
    `Step 3: the filter posts ${r.shown.length}${f.hideStyle ? ", with style and nits left to the linter" : ""}${f.minConf ? `, only at ${pct(f.minConf)}+ confidence` : ""}${f.evidence ? ", only with a line or test as evidence" : ""}.`,
    `Step 4: reviewers see ${r.perPr.toFixed(1)} AI comments per PR, ${pct(r.precision)} of them worth reading.`,
    `Step 5: ${r.caught} of ${REAL_BUGS} bugs flagged, ${r.noise} comments that waste a reviewer's time. 2 bugs need context the diff doesn't show and are never flagged.`,
  ];
  const caption = stage !== null ? captions[stage] : `${r.shown.length} comments over ${PRS} PRs (${r.perPr.toFixed(1)} each): ${r.caught} of ${REAL_BUGS} bugs, precision ${pct(r.precision)}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Native · interactive"
        title="AI code review"
        blurb="A model reviewer on every pull request finds real bugs, and buries them under five comments a PR about naming, “possible” nulls and trailing commas. People stop reading it within a week. Filter by kind, confidence and evidence until most of what it says is worth reading, and see what that costs in bugs."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Pull request, CI, model reviewer, comment filter and the human reviewer"
                accent={ACCENT}
                chrome="split"
                nodes={[
                  { id: "pr", label: "Pull request", sub: `${r.perPr.toFixed(1)} AI comments`, at: [12, 50], mobileAt: [50, 8], state: r.precision >= 0.5 ? "good" : "bad" },
                  { id: "ci", label: "CI", sub: "on every push", at: [38, 16], mobileAt: [24, 34], state: "active" },
                  { id: "model", label: "Model reviewer", sub: `${raw.shown.length} comments`, at: [66, 16], mobileAt: [76, 34], state: "active" },
                  { id: "filter", label: "Filter", sub: `${r.shown.length} kept`, at: [88, 50], mobileAt: [76, 66], state: r.shown.length < raw.shown.length ? "active" : "dim" },
                  { id: "human", label: "Human reviewer", sub: `${pct(r.precision)} useful`, at: [38, 84], mobileAt: [24, 66], state: r.precision >= 0.5 ? "good" : "wait" },
                ]}
                links={[
                  { from: "pr", to: "ci", label: "push" },
                  { from: "ci", to: "model", label: "diff" },
                  { from: "model", to: "filter", label: "comments" },
                  { from: "filter", to: "pr", label: "posted" },
                  { from: "pr", to: "human", label: "review" },
                ]}
                packets={packets}
                aspect={1.6}
                mobileAspect={0.85}
              />
              <PrView pr={pr} setPr={setPr} f={f} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setF(RAW)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Post everything
                </button>
                <button type="button" onClick={() => setF({ hideStyle: true, minConf: 0.5, evidence: true })} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  All three filters
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Reviewing…">
                Review the pull requests
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Run the reviewer on every pull request" what="It sees the diff and a little surrounding code, in CI, before a person looks. That is its strength (it never gets tired) and its limit: bugs that depend on code outside the diff are invisible to it." accent={ACCENT} active={at(0)}>
                <p className="font-mono text-xs">
                  {PRS} PRs · {REAL_BUGS} real bugs hidden in them
                </p>
              </FlowStep>
              <FlowArrow label="the diff" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Leave style to the linter" what="Naming, length and trailing commas are a third of what a model reviewer says and none of what you need it for. A linter and a formatter already enforce them, with no false alarms." accent={ACCENT} active={at(1)}>
                <Toggle on={f.hideStyle} set={(v) => set({ hideStyle: v })} label="Drop style and nit comments" />
              </FlowStep>
              <FlowArrow label="bug and security comments" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Post only what it's confident about" what="Ask the reviewer to rate each finding and post only above a threshold. Too low and the noise stays; too high and real bugs go with it, because the model is also unsure about some of what it gets right." accent={ACCENT} active={at(2)}>
                <Choices label="Minimum confidence" accent={ACCENT} value={String(f.minConf)} onChange={(v) => set({ minConf: Number(v) })} options={THRESHOLDS.map((t) => ({ id: String(t), label: t ? pct(t) : "any" }))} />
              </FlowStep>
              <FlowArrow label="confident comments" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Ask for evidence" what="Require each finding to point at the exact line and say how it fails, ideally with an input or a failing test. Real bugs usually come with one; vague worries usually don't, and drop out." accent={ACCENT} active={at(3)}>
                <Toggle on={f.evidence} set={(v) => set({ evidence: v })} label="Only post findings with a line and a failing case" />
              </FlowStep>
              <FlowArrow label="posted comments" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Measure precision, not just bugs found" what="Precision decides whether anyone keeps reading: below about half, people learn to skip the bot. Track both numbers over real pull requests, and keep human review for what needs context the diff doesn't show." accent={ACCENT} active={at(4)}>
                <Table f={f} />
                <p className="mt-2 text-[11px] text-[var(--faint)]">The comments are synthetic and seeded to look like a typical model reviewer&apos;s. The filters, precision and recall run for real.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Toggle({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) {
  return (
    <label className="flex min-h-11 w-full items-center gap-2 text-sm">
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} className="h-4 w-4" style={{ accentColor: ACCENT }} />
      {label}
    </label>
  );
}

function PrView({ pr, setPr, f }: { pr: number; setPr: (n: number) => void; f: Filters }) {
  const shown = new Set(review(f).shown);
  const list = COMMENTS.filter((c) => c.pr === pr);
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="The AI reviewer's comments on one pull request">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">pull request · pick one</p>
      <div className="mt-2 grid grid-cols-6 gap-1 sm:grid-cols-12">
        {Array.from({ length: PRS }, (_, i) => (
          <button key={i} type="button" aria-pressed={i === pr} onClick={() => setPr(i)} className="min-h-11 rounded-md border font-mono text-xs" style={{ borderColor: i === pr ? ACCENT : "var(--line)", background: i === pr ? `color-mix(in srgb, ${ACCENT} 14%, transparent)` : "transparent" }}>
            #{i + 101}
          </button>
        ))}
      </div>
      <ul className="mt-3 space-y-1">
        {list.map((c, i) => {
          const on = shown.has(c);
          return (
            <li key={i} className="grid grid-cols-[4.25rem_minmax(0,1fr)_auto] items-baseline gap-2 text-xs" style={{ opacity: on ? 1 : 0.4 }}>
              <span className="font-mono text-[11px]" style={{ color: c.real ? "var(--good)" : "var(--muted)" }}>
                {c.kind}
              </span>
              <span className={on ? "" : "line-through"}>{c.text}</span>
              <span className="font-mono text-[10px] text-[var(--faint)]">
                {pct(c.conf)}
                {c.evidence ? " · line" : ""}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11px] text-[var(--faint)]">Green: a real bug. Struck through: removed by the filters.</p>
    </section>
  );
}

function Table({ f }: { f: Filters }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-x-3 gap-y-0.5 font-mono text-[11px]">
      <span className="text-[var(--faint)]">min confidence</span>
      <span className="text-right text-[var(--faint)]">per PR</span>
      <span className="text-right text-[var(--faint)]">bugs</span>
      <span className="text-right text-[var(--faint)]">precision</span>
      {THRESHOLDS.map((t) => {
        const x = review({ ...f, minConf: t });
        const on = t === f.minConf;
        return [
          <span key={`${t}a`} style={{ fontWeight: on ? 600 : 400 }}>
            {t ? pct(t) : "any"}
          </span>,
          <span key={`${t}b`} className="text-right">
            {x.perPr.toFixed(1)}
          </span>,
          <span key={`${t}c`} className="text-right">
            {x.caught}/{REAL_BUGS}
          </span>,
          <span key={`${t}d`} className="text-right" style={{ color: x.precision >= 0.5 ? "var(--good)" : "var(--bad)" }}>
            {pct(x.precision)}
          </span>,
        ];
      })}
    </div>
  );
}
