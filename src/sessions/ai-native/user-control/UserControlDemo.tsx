"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type Packet } from "@/components/system/SystemMap";
import { CONFLICT_EXAMPLE, HISTORIES, INTENDED, ORIGINAL, PROPOSAL, ROW_IDS, YOUR_EDIT, play, type History, type Table } from "@/lib/userControl";

const ACCENT = "var(--native)";

export default function UserControlDemo() {
  const [history, setHistory] = useState<History>("none");
  const [review, setReview] = useState(false);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const p = play(history, review);
  const bad = p.accepted.filter((c) => !c.ok);
  const clean = !p.wrongCells.length && !p.contactsLost && !p.yourEditLost;

  const packets: Packet[] =
    stage === 0 ? hops("req", ["you", "ai", "review"], { label: "tidy my contacts" })
    : stage === 1 ? hops("acc", ["review", "log"], { label: `${p.accepted.length} of ${PROPOSAL.length} accepted`, tone: bad.length ? "bad" : "good" })
    : stage === 2 ? hops("ap", ["log", "table"], { label: history === "log" ? "7 logged ops" : history === "snapshot" ? "copy saved, then apply" : "written in place" })
    : stage === 3 ? hops("ed", ["you", "log", "table"], { label: "Halden Logistics" })
    : stage === 4 ? (bad.length ? hops("un", ["you", "log", "table"], { label: history === "log" ? "undo 2 changes" : history === "snapshot" ? "restore the copy" : "nothing to undo", tone: clean ? "good" : "bad" }) : [])
    : [];

  const captions = [
    `Step 1: you click “Tidy up contacts”. The AI proposes ${PROPOSAL.length} changes as a list; 2 are wrong.`,
    review ? `Step 2: you read the list and reject the merge of two different Chloes and the broken email; ${p.accepted.length} go in.` : `Step 2: all ${PROPOSAL.length} changes go in without a look.`,
    `Step 3: ${HISTORIES.find((h) => h.id === history)!.one}`,
    "Step 4: you keep working and rename Halden to Halden Logistics.",
    !bad.length ? "Step 5: nothing wrong went in, so there is nothing to undo." : history === "log" ? "Step 5: you undo the merge and the email change; your rename and the five good fixes stay." : history === "snapshot" ? "Step 5: undo restores the copy: Chloé is back, but your rename and the five good fixes are gone too." : "Step 5: Chloé's row was deleted and nothing kept it. Her email survives only as an extra field on the wrong person.",
  ];
  const caption = stage !== null ? captions[stage] : clean ? `${HISTORIES.find((h) => h.id === history)!.label}${review ? " after review" : ""}: the table ends up as intended.` : `${HISTORIES.find((h) => h.id === history)!.label}: ${[p.contactsLost ? `${p.contactsLost} contact lost` : "", p.wrongCells.length ? `${p.wrongCells.length} wrong cells` : "", p.yourEditLost ? "your edit lost" : "", p.fixesLost ? `${p.fixesLost} good fixes lost` : ""].filter(Boolean).join(", ")}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Native · interactive"
        title="Undo, edit and regenerate"
        blurb="An AI action tidies a contact list: it fixes capitals and emails, merges two different people called Chloe Martin, and “fixes” an email that was fine. You keep working, then notice. Whether you can get back depends on how the change was applied, not on the model."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="You, the AI action, the review list, the change log and the contacts table"
                accent={ACCENT}
                chrome="split"
                nodes={[
                  { id: "you", label: "You", sub: "edit, undo", at: [11, 50], mobileAt: [50, 8], state: "active" },
                  { id: "ai", label: "Tidy action", sub: `${PROPOSAL.length} changes`, at: [38, 16], mobileAt: [24, 32], state: "active" },
                  { id: "review", label: "Review list", sub: review ? `${p.rejected.length} rejected` : "skipped", at: [38, 84], mobileAt: [76, 32], state: review ? "good" : "dim" },
                  { id: "log", label: history === "log" ? "Change log" : history === "snapshot" ? "Saved copy" : "No history", sub: history === "log" ? `${p.log.length} entries` : history === "snapshot" ? "1 copy" : "–", at: [64, 50], mobileAt: [50, 60], state: history === "none" ? "dim" : "active" },
                  { id: "table", label: "Contacts", sub: `${Object.keys(p.final).length} rows`, at: [88, 50], mobileAt: [50, 88], state: clean ? "good" : "bad" },
                ]}
                links={[
                  { from: "you", to: "ai", label: "request" },
                  { from: "ai", to: "review", label: "proposal" },
                  { from: "review", to: "log", label: "accepted" },
                  { from: "you", to: "log", label: "edit / undo" },
                  { from: "log", to: "table", label: "apply" },
                ]}
                packets={packets}
                aspect={1.5}
                mobileAspect={0.8}
              />
              <TableView t={stage !== null && stage < 3 ? p.afterAi : stage === 3 ? p.afterEdit : p.final} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices label="How changes are applied" accent={ACCENT} value={history} onChange={setHistory} options={HISTORIES.map((h) => ({ id: h.id, label: h.label }))} />
              </div>
              <Toggle on={review} set={setReview} label="Review each change before it goes in" />
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Tidying…">
                Tidy up contacts
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Propose changes, don't hand back a new table" what="Ask the model for a list of edits, each small and named, rather than a rewritten table. A list can be read, accepted one by one and undone one by one; a whole new table can only be taken or left." accent={ACCENT} active={at(0)}>
                <ul className="space-y-0.5 text-xs">
                  {PROPOSAL.map((c) => (
                    <li key={c.id} style={{ color: c.ok ? "var(--text)" : "var(--bad)" }}>
                      {c.ok ? "✓" : "✗"} {c.label}
                    </li>
                  ))}
                </ul>
              </FlowStep>
              <FlowArrow label={`${PROPOSAL.length} changes`} accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Let the user accept each change" what="Show the list as a diff with a checkbox per change, all ticked. Reviewing costs the user a few seconds per change, so it pays for actions that delete or merge, and can be skipped for capital letters." accent={ACCENT} active={at(1)}>
                <Toggle on={review} set={setReview} label="Review each change before it goes in" />
                <p className="font-mono text-xs text-[var(--muted)]">{review ? `rejected: ${p.rejected.map((c) => c.label).join("; ")}` : "every change is applied"}</p>
              </FlowStep>
              <FlowArrow label="accepted changes" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Apply each change with its inverse" what="Writing in place leaves nothing to go back to. A saved copy can bring everything back, including what you wanted to keep. Logging each change as an operation with its inverse (set → set back, delete → re-insert) lets you undo exactly one." accent={ACCENT} active={at(2)}>
                <Choices label="How changes are applied" accent={ACCENT} value={history} onChange={setHistory} options={HISTORIES.map((h) => ({ id: h.id, label: h.label }))} />
                {history === "log" && (
                  <ul className="mt-2 space-y-0.5 font-mono text-[11px] text-[var(--muted)]">
                    {PROPOSAL[3].ops.map((op, i) => (
                      <li key={i}>{op.kind === "set" ? `set ${op.row}.${op.field} = “${op.to}”   ⟲ set back to “${op.from ?? ""}”` : `delete ${op.row}   ⟲ re-insert ${op.snapshot.name}`}</li>
                    ))}
                  </ul>
                )}
              </FlowStep>
              <FlowArrow label="later" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="The user keeps working" what="People rarely notice a bad change straight away. By then they have made their own edits, and any undo must leave those alone. If a later edit touched the same field, undo should refuse and say why, not overwrite it." accent={ACCENT} active={at(3)}>
                <p className="text-xs">{YOUR_EDIT.label}.</p>
                <p className="mt-1 font-mono text-[11px] text-[var(--muted)]">e.g. undo “Capitalise ana lopez” after you typed “Ana López” → refused: {CONFLICT_EXAMPLE.join(", ")} changed since</p>
              </FlowStep>
              <FlowArrow label="undo" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Undo the one that was wrong, and keep every version" what="Undo by change, not by time, and keep the log as a version list the user can browse and restore from. “Regenerate” works the same way: a new proposal becomes another version next to the first, never a replacement of it." accent={ACCENT} active={at(4)}>
                <Outcomes review={review} history={history} />
                <p className="mt-2 text-[11px] text-[var(--faint)]">The table, the operation log, the inverses and the conflict check run for real. Which changes the reviewer rejects is assumed: the two a person would spot in a diff.</p>
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

function TableView({ t }: { t: Table }) {
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="The contacts table, with cells that differ from the intended result marked">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">contacts</p>
      <div className="mt-3 grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)_minmax(0,0.9fr)] gap-x-3 gap-y-1 text-xs">
        <span className="font-mono text-[var(--faint)]">name</span>
        <span className="font-mono text-[var(--faint)]">email</span>
        <span className="font-mono text-[var(--faint)]">company</span>
        {ROW_IDS.map((id) => {
          const row = t[id];
          if (!row)
            return (
              <span key={id} className="col-span-3 text-[var(--bad)] line-through">
                {ORIGINAL[id].name} · {ORIGINAL[id].email} (deleted)
              </span>
            );
          const cell = (f: "name" | "email" | "company") => {
            const off = (row[f] ?? "") !== (INTENDED[id][f] ?? "");
            return (
              <span key={`${id}${f}`} className="min-w-0 break-words" style={{ color: off ? "var(--bad)" : "var(--text)" }}>
                {row[f] || "–"}
                {f === "email" && row.alt && <span className="block text-[11px] text-[var(--bad)]">+ {row.alt}</span>}
              </span>
            );
          };
          return [cell("name"), cell("email"), cell("company")];
        })}
      </div>
    </section>
  );
}

function Outcomes({ review, history }: { review: boolean; history: History }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-x-3 gap-y-0.5 font-mono text-[11px]">
      <span className="text-[var(--faint)]">applied as</span>
      <span className="text-right text-[var(--faint)]">lost</span>
      <span className="text-right text-[var(--faint)]">wrong</span>
      <span className="text-right text-[var(--faint)]">work undone</span>
      {HISTORIES.map((h) => {
        const x = play(h.id, review);
        const on = h.id === history;
        return [
          <span key={`${h.id}a`} style={{ fontWeight: on ? 600 : 400, color: on ? "var(--text)" : "var(--muted)" }}>
            {h.label}
          </span>,
          <span key={`${h.id}b`} className="text-right" style={{ color: x.contactsLost ? "var(--bad)" : "var(--text)" }}>
            {x.contactsLost} contact{x.contactsLost === 1 ? "" : "s"}
          </span>,
          <span key={`${h.id}c`} className="text-right" style={{ color: x.wrongCells.length ? "var(--bad)" : "var(--text)" }}>
            {x.wrongCells.length} cells
          </span>,
          <span key={`${h.id}d`} className="text-right" style={{ color: x.fixesLost || x.yourEditLost ? "var(--bad)" : "var(--text)" }}>
            {x.fixesLost + (x.yourEditLost ? 1 : 0)} edits
          </span>,
        ];
      })}
    </div>
  );
}
