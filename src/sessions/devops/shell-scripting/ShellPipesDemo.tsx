"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { FIRST, FIXED, LOGS, run, scorecard, type Design, type Field, type LogId } from "@/lib/shellPipes";

const ACCENT = "var(--ops)";

function Out({ lines, empty = "(no output)" }: { lines: string[]; empty?: string }) {
  return (
    <pre className="mt-2 max-h-40 overflow-auto whitespace-pre rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] leading-relaxed">
      {lines.length ? lines.join("\n") : empty}
    </pre>
  );
}

export default function ShellPipesDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [log, setLog] = useState<LogId>("today");
  const { stage, busy, run: walk } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const r = run(log, d);
  const [filter, cutS, count, rank] = r.stages;
  const card = scorecard(d);
  const fileErr = filter.stderr.length > 0;

  const nodes: MapNode[] = [
    { id: "cron", label: "cron → bash", sub: `$LOG → ${r.args.length} argument${r.args.length === 1 ? "" : "s"}`, at: [14, 18], mobileAt: [25, 12], state: r.args.length > 1 ? "bad" : "active" },
    { id: "filter", label: d.awk ? "awk" : "grep", sub: fileErr ? `exit ${filter.status}: no file` : `${filter.out.length} lines · exit ${filter.status}`, at: [50, 18], mobileAt: [75, 12], state: fileErr ? "bad" : filter.status ? "wait" : "active" },
    { id: "cut", label: "cut", sub: `field ${d.field}: ${d.field === 1 ? "client IP" : "path"}`, at: [86, 18], mobileAt: [75, 42], state: "active" },
    { id: "count", label: "count", sub: `${d.sortFirst ? "sort | uniq -c" : "uniq -c"} · ${count.out.length} rows`, at: [86, 82], mobileAt: [25, 42], state: d.sortFirst ? "active" : "bad" },
    { id: "rank", label: "rank", sub: `sort -rn | head · $? = ${r.exit}`, at: [50, 82], mobileAt: [25, 76], state: r.aborted ? "wait" : "active" },
    { id: "mail", label: "Report email", sub: r.aborted ? "not sent: script stopped" : rank.out.length ? `${rank.out.length} lines` : "empty", at: [14, 82], mobileAt: [75, 76], state: r.verdict.good ? "good" : "bad" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("x", ["cron", "filter"], { label: r.args.length > 1 ? "2 paths" : "$LOG", tone: r.args.length > 1 ? "bad" : undefined })
    : stage === 1 ? hops("f", ["filter", "cut"], { label: fileErr ? "nothing" : `${filter.out.length} lines`, tone: fileErr ? "bad" : undefined })
    : stage === 2 ? hops("c", ["cut", "count"], { label: `${cutS.out.length} values` })
    : stage === 3 ? hops("u", ["count", "rank"], { label: `${count.out.length} counts`, tone: d.sortFirst ? undefined : "bad" })
    : stage === 4 ? hops("m", ["rank", "mail"], { label: r.aborted ? `exit ${r.exit}` : `${rank.out.length} lines`, tone: r.verdict.good ? "good" : "bad" })
    : [];

  const captions = [
    `Step 1: cron runs the script; bash expands $LOG into ${r.args.map((a) => `“${a}”`).join(" and ")}.`,
    fileErr ? `Step 2: ${filter.stderr[0]}. It exits ${filter.status} and writes nothing to the pipe.` : `Step 2: ${filter.cmd} keeps ${filter.out.length} lines and exits ${filter.status}.`,
    `Step 3: cut keeps field ${d.field}, the ${d.field === 1 ? "client IP" : "path"}, from each line.`,
    d.sortFirst ? `Step 4: sort puts equal values next to each other, so uniq -c counts each once: ${count.out.length} rows.` : `Step 4: uniq -c without sort only merges neighbours: ${count.out.length} rows for ${new Set(cutS.out).size} distinct values.`,
    `Step 5: ${r.verdict.text}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${card.filter((c) => c.good).length} of ${LOGS.length} days handled · ${LOGS.find((l) => l.id === log)!.label}: ${r.verdict.text}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="Shell scripting and pipes"
        blurb="A nightly cron job emails the clients that got the most 500 errors. Each command in the pipe does one small job and passes lines to the next. The one-liner works on the day it's written; run it against four real days and see where it lies, fails silently, or cries wolf."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="cron starts bash, which runs grep or awk, cut, sort and uniq, sort and head, then sends the report email"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "cron", to: "filter", label: "args" },
                  { from: "filter", to: "cut", label: "pipe" },
                  { from: "cut", to: "count", label: "pipe" },
                  { from: "count", to: "rank", label: "pipe" },
                  { from: "rank", to: "mail", label: r.aborted ? "set -e stops" : "stdout", dim: r.aborted },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="The script and four days of runs">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">report.sh</p>
                <pre className="mt-2 overflow-x-auto whitespace-pre rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] leading-relaxed">{r.script.join("\n")}</pre>
                <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">four days · {card.filter((c) => c.good).length}/{LOGS.length} handled</p>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {card.map((c) => (
                    <li key={c.log.id}>
                      <span style={{ color: c.good ? "var(--good)" : "var(--bad)" }} aria-hidden>
                        {c.good ? "✓ " : "✕ "}
                      </span>
                      {c.log.label}
                      <span className="block text-[11px] text-[var(--muted)]">{c.text}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices<LogId> label="Which day" accent={ACCENT} value={log} onChange={setLog} options={LOGS.map((l) => ({ id: l.id, label: l.label }))} />
                <p className="mt-1 text-[11px] text-[var(--faint)]">{LOGS.find((l) => l.id === log)!.one}</p>
              </div>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Quick one-liner
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Careful script
                </button>
              </div>
              <RunButton busy={busy} onClick={walk} accent={ACCENT} running="Running…">
                Run the cron job
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Expand the variables" what="Before any command runs, bash replaces $LOG with its value. Unquoted, the value is then split on spaces, so one path with a space becomes two arguments that don't exist." accent={ACCENT} active={at(0)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.quote} onChange={(e) => set({ quote: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Quote it: &quot;$LOG&quot;
                </label>
                <p className="break-words font-mono text-[11px]">
                  argv: {r.args.map((a) => `[${a}]`).join(" ")}
                </p>
              </FlowStep>
              <FlowArrow label="lines" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Keep only the error lines" what="grep '500' matches 500 anywhere in the line: in a path like /orders/1500 or a time like 1.500 s. awk splits the line into fields and compares the status field exactly. grep also exits 1 when nothing matched; awk exits 0." accent={ACCENT} active={at(1)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.awk} onChange={(e) => set({ awk: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Match the status field: awk &apos;$5 == 500&apos;
                </label>
                <Out lines={[...filter.stderr, ...filter.out]} />
                <p className="mt-1 font-mono text-[11px] text-[var(--muted)]">exit {filter.status}</p>
              </FlowStep>
              <FlowArrow label="one field" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Cut out one field" what="cut -d' ' -f1 keeps the first space-separated field of each line. Each program reads lines from the pipe and writes lines to the next one; none of them knows about the others." accent={ACCENT} active={at(2)}>
                <Choices<string> label="Report on" accent={ACCENT} value={String(d.field)} onChange={(v) => set({ field: Number(v) as Field })} options={[{ id: "1", label: "Client IP (field 1)" }, { id: "4", label: "Path (field 4)" }]} />
                <Out lines={cutS.out} />
              </FlowStep>
              <FlowArrow label="sorted values" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Count each value" what="uniq -c collapses runs of identical neighbouring lines and prints how many there were. It never looks further back, so the input must be sorted first, or the same value is counted in pieces." accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.sortFirst} onChange={(e) => set({ sortFirst: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  sort before uniq -c
                </label>
                <Out lines={count.out} />
              </FlowStep>
              <FlowArrow label="exit status" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Rank, then decide what failure means" what="A pipeline's exit status is the last command's: head succeeds even when grep failed. set -o pipefail reports the rightmost failure instead, and set -e stops the script there, so cron emails the error instead of an empty report." accent={ACCENT} active={at(4)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.pipefail} onChange={(e) => set({ pipefail: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  set -euo pipefail
                </label>
                <Out lines={rank.out} empty={r.aborted ? `(script stopped, exit ${r.exit})` : "(empty report)"} />
                <p className="mt-1 text-xs" style={{ color: r.verdict.good ? "var(--good)" : "var(--bad)" }}>
                  $? = {r.exit} · {r.verdict.text}.
                </p>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Every command here really runs on the sample log, with GNU behaviour for uniq -c padding and sort -rn ties.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
