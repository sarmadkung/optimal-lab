"use client";

import { useState, type ReactNode } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { CRM_CHANGES, FIRST, FIXED, NEW_LEADS, NIGHTLY_ROWS, QUOTA_PER_MIN, asTyped, col, run, type Design, type Sheet } from "@/lib/sheetsCrms";

const ACCENT = "var(--auto)";

export default function SheetsCrmsDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const { stage, busy, run: walk } = useWalk(5, 1300);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const r = run(d);
  const snap = stage === null ? null : r.steps[Math.min(stage, 3)];

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
    { id: "form", label: "Web form", sub: "2 leads at once", at: [14, 16], mobileAt: [25, 12], state: "active" },
    { id: "add", label: "Form workflow", sub: d.append ? "append" : "read last row, write next", at: [14, 62], mobileAt: [25, 40], state: r.lost.length ? "bad" : "good" },
    { id: "sheet", label: "Leads sheet", sub: `${r.wrongCells} wrong · ${r.lost.length} lost`, at: [50, 40], mobileAt: [75, 40], state: r.wrongCells || r.lost.length ? "bad" : "good" },
    { id: "people", label: "Sales team", sub: "sorts, adds a column", at: [50, 88], mobileAt: [75, 12], state: "active" },
    { id: "sync", label: "CRM sync", sub: d.batch ? "1 batch request" : `${NIGHTLY_ROWS * 2} single writes`, at: [86, 62], mobileAt: [75, 70], state: d.batch ? "good" : "wait" },
    { id: "crm", label: "CRM", sub: `${CRM_CHANGES.length} changes tonight`, at: [86, 16], mobileAt: [25, 70], state: "active" },
  ];

  const packets: Packet[] =
    stage === 0 ? [...hops("a1", ["form", "add", "sheet"], { label: NEW_LEADS[0][0] }), ...hops("a2", ["form", "add", "sheet"], { label: NEW_LEADS[1][0], start: 0.15, tone: r.lost.length ? "bad" : undefined })]
    : stage === 1 ? hops("s", ["people", "sheet"], { label: "sort by company" })
    : stage === 2 ? hops("c", ["people", "sheet"], { label: "insert Owner column" })
    : stage === 3 ? hops("u", ["crm", "sync", "sheet"], { label: d.byId && d.byHeader ? "find L2 · Status" : "row 3 · column F", tone: d.byId && d.byHeader ? "good" : "bad" })
    : stage === 4 ? hops("b", ["sync", "sheet"], { label: d.batch ? "1 batchUpdate" : `${NIGHTLY_ROWS * 2} writes`, tone: d.batch ? "good" : "bad" })
    : [];

  const captions = [
    `Step 1: ${r.steps[0].notes[0]}`,
    "Step 2: a person sorts the sheet by company. Every row moves.",
    "Step 3: a person inserts an Owner column after Company. Every column after it moves.",
    `Step 4: the sync writes ${CRM_CHANGES.length} changes: ${r.steps[3].notes[0]}`,
    d.batch ? "Step 5: the real nightly sync sends all its changes in one batch request." : `Step 5: the real nightly sync writes ${NIGHTLY_ROWS * 2} cells one request at a time: ${r.minutes} minutes against a ${QUOTA_PER_MIN}-a-minute quota.`,
  ];
  const caption = stage !== null ? captions[stage] : `${r.lost.length} lead${r.lost.length === 1 ? "" : "s"} lost · ${r.wrongCells} wrong cells · ${r.calls} write requests for the nightly sync.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Automation · interactive"
        title="Spreadsheets and CRMs"
        blurb="A shared sheet of leads is written by two workflows, a form that adds leads and a CRM sync that updates them, and used by people, who sort it and add a column. Spreadsheets are easy to start with and easy to corrupt. Run one night through the sheet and see which way of writing survives the people using it."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="A web form, the form workflow, the leads sheet, the sales team, the CRM sync and the CRM"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "form", to: "add", label: "submit" },
                  { from: "add", to: "sheet", label: "new row" },
                  { from: "people", to: "sheet", label: "edits" },
                  { from: "crm", to: "sync", label: "changes" },
                  { from: "sync", to: "sheet", label: "updates" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <SheetView sheet={snap?.sheet ?? r.sheet} want={snap ? null : r.want} title={snap ? snap.title : "After the night"} />
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
              <RunButton busy={busy} onClick={walk} accent={ACCENT} running="Running the night…">
                Run the night
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Add rows with append" what="“Find the last row, write below it” is a race: two runs at the same moment pick the same row and one lead overwrites the other. The append call adds rows atomically, one after another." accent={ACCENT} active={at(0)}>
                {toggle("append", "Use the append call")}
                <p className="text-xs">{r.steps[0].notes[0]}</p>
              </FlowStep>
              <FlowArrow label="2 new rows" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Find rows by an ID, not a row number" what="Saving “this lead is row 8” works until someone sorts or deletes a row. Keep a unique ID column and look the row up by it each time you write." accent={ACCENT} active={at(1)}>
                {toggle("byId", "Look up the row by Lead ID")}
              </FlowStep>
              <FlowArrow label="the right row" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Find columns by header, not letter" what="People add columns. A workflow that writes “column F” starts filling the wrong field the day someone inserts one before it. Read the header row and find the column by name." accent={ACCENT} active={at(2)}>
                {toggle("byHeader", "Look up the column by its header")}
              </FlowStep>
              <FlowArrow label="the right cell" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Write values as text" what="Written “as if typed”, a phone number or a zip with a leading zero becomes a number and loses the zero, and something like 3-4 becomes a date. Write raw values, or format those columns as plain text." accent={ACCENT} active={at(3)}>
                {toggle("raw", "Write raw values (no parsing)")}
                <p className="font-mono text-[11px] text-[var(--muted)]">
                  {NEW_LEADS[1][3]} → {String(asTyped(NEW_LEADS[1][3]))} · {NEW_LEADS[1][4]} → {String(asTyped(NEW_LEADS[1][4]))} · 3-4 → {String(asTyped("3-4"))}
                </p>
                <ul className="mt-1 space-y-0.5 text-[11px]">
                  {r.steps[3].notes.map((n) => (
                    <li key={n} style={{ color: n.startsWith("Every") ? "var(--good)" : "var(--bad)" }}>
                      {n}
                    </li>
                  ))}
                </ul>
              </FlowStep>
              <FlowArrow label="values" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Batch the writes" what={`Spreadsheet APIs limit requests per minute (here ${QUOTA_PER_MIN}). The real sync updates ${NIGHTLY_ROWS} rows a night: cell by cell that's ${NIGHTLY_ROWS * 2} requests and a wall of 429s; one batch update is a single request.`} accent={ACCENT} active={at(4)}>
                {toggle("batch", "Send all changes in one batch update")}
                <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-xs">
                  <dt>Leads lost</dt>
                  <dd className="text-right font-mono" style={{ color: r.lost.length ? "var(--bad)" : "var(--good)" }}>{r.lost.length ? r.lost.join(", ") : 0}</dd>
                  <dt>Wrong cells</dt>
                  <dd className="text-right font-mono" style={{ color: r.wrongCells ? "var(--bad)" : "var(--good)" }}>{r.wrongCells}</dd>
                  <dt>Write requests a night</dt>
                  <dd className="text-right font-mono">{r.calls}</dd>
                  <dt>Requests over the quota</dt>
                  <dd className="text-right font-mono" style={{ color: r.rejected ? "var(--bad)" : "var(--good)" }}>{r.rejected}</dd>
                </dl>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The sheet, the people&apos;s edits, both ways of writing, value parsing and the scoring run here. When the sheet becomes the system of record, move it to a database or the CRM itself.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function SheetView({ sheet, want, title }: { sheet: Sheet; want: Sheet | null; title: string }) {
  const bad = (ri: number, ci: number) => {
    if (!want || ri === 0) return false;
    const w = want.find((row) => row[0] === sheet[ri][0]);
    const h = sheet[0][ci];
    const wi = want[0].indexOf(h);
    return !w || wi < 0 || String(w[wi]) !== String(sheet[ri][ci]);
  };
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="The leads sheet">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">{title}</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse font-mono text-[10px]">
          <thead>
            <tr>
              <th className="w-5" />
              {sheet[0].map((_, i) => (
                <th key={i} className="px-1 text-left font-normal text-[var(--faint)]">
                  {col(i)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.map((row, ri) => (
              <tr key={ri} className="border-t border-[var(--line)]">
                <td className="pr-1 text-[var(--faint)]">{ri + 1}</td>
                {row.map((c, ci) => (
                  <td key={ci} className="max-w-[7rem] truncate px-1 py-0.5" style={{ fontWeight: ri === 0 ? 600 : 400, color: bad(ri, ci) ? "var(--bad)" : typeof c === "number" ? "var(--c2)" : "var(--text)" }}>
                    {String(c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {want && <p className="mt-2 text-[11px] text-[var(--faint)]">Red: differs from what the sheet should hold. Amber: stored as a number.</p>}
    </section>
  );
}
