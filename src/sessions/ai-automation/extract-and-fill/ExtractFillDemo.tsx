"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { EMAILS, FIELDS, FIRST, FIXED, parseAmount, parseDate, prepare, runAll, type Design, type Merge } from "@/lib/extractFill";

const ACCENT = "var(--auto)";
const show = (v: string | number | null) => (v === null ? "—" : typeof v === "number" ? v.toLocaleString("en-US") : v);

export default function ExtractFillDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [pick, setPick] = useState(1);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const email = EMAILS.find((e) => e.id === pick)!;
  const prep = prepare(email, d);
  const all = runAll(d);
  const entry = all.log.find((l) => l.email === pick)!;
  const recordBad = all.wrongCells.some((w) => w.record === entry.record) || all.duplicateKeys.has(entry.record);

  const nodes: MapNode[] = [
    { id: "inbox", label: "Sales inbox", sub: `${EMAILS.length} emails`, at: [13, 16], mobileAt: [25, 12], state: "active" },
    { id: "model", label: "Model", sub: "fields + quotes", at: [50, 16], mobileAt: [75, 12], state: "active" },
    { id: "check", label: "Checks in code", sub: [d.ground && "grounding", d.normalize && "parsing"].filter(Boolean).join(" · ") || "none", at: [87, 16], mobileAt: [75, 40], state: d.ground || d.normalize ? "good" : "dim" },
    { id: "review", label: "Review queue", sub: `${all.flagged.length} values`, at: [87, 62], mobileAt: [25, 40], state: prep.flagged.length ? "wait" : d.ground ? "idle" : "dim" },
    { id: "match", label: "Find the record", sub: d.match ? "by email, lower-cased" : "always create", at: [50, 62], mobileAt: [75, 68], state: d.match ? "good" : "bad" },
    { id: "crm", label: "CRM", sub: `${all.crm.length} contacts · ${all.duplicates} dupes`, at: [13, 62], mobileAt: [25, 90], state: all.wrong || all.duplicates ? "bad" : "good" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("in", ["inbox", "model"], { label: `email ${email.id}` })
    : stage === 1 ? hops("x", ["model", "check"], { label: "6 fields + quotes" })
    : stage === 2 ? (prep.flagged.length ? hops("r", ["check", "review"], { label: `${prep.flagged.length} held back`, tone: "bad" }) : [])
    : stage === 3 ? hops("n", ["check", "match"], { label: prep.values.close ? `close ${prep.values.close}` : prep.values.amount !== null ? `amount ${show(prep.values.amount)}` : "fields" })
    : stage === 4 ? hops("w", ["match", "crm"], { label: `${entry.action} #${entry.record}`, tone: recordBad ? "bad" : "good" })
    : [];

  const captions = [
    `Step 1: email ${email.id} from ${email.from}, sent ${email.sent} (${email.locale}).`,
    `Step 2: the model returns six fields, each with the words it took them from.`,
    d.ground ? (prep.flagged.length ? `Step 3: ${prep.flagged.map((f) => `${f.field}: ${f.why}`).join("; ")}. Held for a person.` : "Step 3: every value is in the email.") : `Step 3: not checked${prep.invented.length ? `, so ${prep.invented.join(" and ")} go through though the email never says them` : ""}.`,
    d.normalize ? `Step 4: code reads the quotes with the sender's format and the sent date: amount ${show(prep.values.amount)}, close ${show(prep.values.close)}.` : `Step 4: the model's own reading is kept: amount ${show(prep.values.amount)}, close ${show(prep.values.close)}.`,
    `Step 5: ${entry.action} contact #${entry.record}${entry.changes.length ? ` (${entry.changes.join(", ")})` : ", nothing changed"}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${all.right} of ${all.total} CRM fields right · ${all.wrong} wrong · ${all.review} held for review · ${all.duplicates} duplicate contacts · ${all.lostEdits} edits by people lost.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Automation · interactive"
        title="Extract and fill"
        blurb="Six sales emails become contact fields in a CRM that already holds three contacts, some edited by sales reps. The model reads well, but it guesses dates without knowing the sender's format, reads €40.000 as forty, makes up a surname, and knows nothing about the records already there. Add the checks and the merge rules, and see what the CRM ends up holding."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Sales inbox, the model, checks in code, a review queue, record matching and the CRM"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "inbox", to: "model", label: "email" },
                  { from: "model", to: "check", label: "fields" },
                  { from: "check", to: "review", label: "not in email", dim: !d.ground },
                  { from: "check", to: "match", label: "values" },
                  { from: "match", to: "crm", label: "create / update" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.78}
              />
              <EmailList d={d} pick={pick} setPick={setPick} />
              <CrmBoard d={d} highlight={entry.record} />
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
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Filling…">
                {`Run email ${email.id}`}
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Read the email with its context" what="The body is only part of the input. The sender's address, the date it was sent and where the sender is all change what “03/07” and “this Friday” mean." accent={ACCENT} active={at(0)}>
                <p className="font-mono text-[11px] text-[var(--faint)]">
                  From: {email.from} · sent {email.sent} · {email.locale}
                </p>
                <p className="mt-1 whitespace-pre-line text-xs">{email.body}</p>
              </FlowStep>
              <FlowArrow label="email + context" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Extract each field with its quote" what="Ask for every field as a value plus the exact words it came from, and null when the email doesn't say. The quote is what lets code check the value afterwards." accent={ACCENT} active={at(1)}>
                <p className="mb-1 font-mono text-[11px] text-[var(--faint)]">model output (illustrative)</p>
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-xs">
                  {FIELDS.map((f) => (
                    <div key={f} className="contents">
                      <dt className="font-mono text-[11px] text-[var(--faint)]">{f}</dt>
                      <dd className="min-w-0 break-words">
                        {show(email.model[f].value)}
                        {email.model[f].quote && email.model[f].quote !== email.model[f].value && <span className="text-[var(--faint)]"> ← “{email.model[f].quote}”</span>}
                      </dd>
                    </div>
                  ))}
                </dl>
              </FlowStep>
              <FlowArrow label="values + quotes" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Check every value is in the email" what="A value the email doesn't contain was made up: a surname built from the company name, an amount worked out from 25 seats. Hold it back for a person instead of writing a guess into the system everyone trusts." accent={ACCENT} active={at(2)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.ground} onChange={(e) => set({ ground: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Drop values not found in the email
                </label>
                <ul className="space-y-0.5 text-xs">
                  {FIELDS.filter((f) => email.model[f].value !== null).map((f) => {
                    const held = prep.flagged.find((x) => x.field === f);
                    const made = prep.invented.includes(f);
                    return (
                      <li key={f} style={{ color: held ? "var(--c2)" : made ? "var(--bad)" : "var(--good)" }}>
                        <span className="font-mono text-[11px]">{f}</span>: {held ? `held: ${held.why}` : made ? "not in the email, written anyway" : "found in the email"}
                      </li>
                    );
                  })}
                </ul>
              </FlowStep>
              <FlowArrow label="grounded values" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Turn amounts and dates into values in code" what="The model doesn't know when the email was sent, and reads number formats by habit. Code that parses the quote with the sender's locale and the sent date gets “€40.000”, “03/07/2026” and “this Friday” right every time." accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.normalize} onChange={(e) => set({ normalize: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Parse amounts and dates from the quote in code
                </label>
                <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-xs">
                  <span />
                  <span className="font-mono text-[11px] text-[var(--faint)]">model</span>
                  <span className="font-mono text-[11px] text-[var(--faint)]">code</span>
                  {(["amount", "close"] as const).map((f) => {
                    const q = email.model[f].quote;
                    const code = q ? (f === "amount" ? parseAmount(q, email.locale) : parseDate(q, email.sent, email.locale)) : null;
                    return (
                      <div key={f} className="contents">
                        <span className="font-mono text-[11px] text-[var(--faint)]">{f}</span>
                        <span style={{ color: email.model[f].value === null ? "var(--faint)" : email.model[f].value === code ? "var(--text)" : "var(--bad)" }}>{show(email.model[f].value)}</span>
                        <span style={{ color: code === null ? "var(--faint)" : "var(--good)" }}>{show(code)}</span>
                      </div>
                    );
                  })}
                </div>
              </FlowStep>
              <FlowArrow label="clean values" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Find the record, then merge with care" what="Look the contact up by a normalised key before creating one, or every follow-up becomes a duplicate. When updating, skip empty values and never overwrite a field a person set: the rep who fixed the phone number knew something the email doesn't." accent={ACCENT} active={at(4)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.match} onChange={(e) => set({ match: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Match existing contacts by email, lower-cased
                </label>
                <Choices<Merge> label="When updating a contact" accent={ACCENT} value={d.merge} onChange={(v) => set({ merge: v })} options={[{ id: "overwrite", label: "Overwrite every field" }, { id: "empty", label: "Only fill empty fields" }, { id: "careful", label: "Skip blanks and people's edits" }]} />
                <p className="mt-2 font-mono text-xs">
                  {all.right}/{all.total} right · {all.wrong} wrong · {all.review} for review · {all.duplicates} dupes · {all.lostEdits} edits lost · {all.inventedWritten} made-up values written
                </p>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The model output is illustrative. Grounding, parsing, matching and the merge run for real, and the CRM is scored against what it should hold.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function EmailList({ d, pick, setPick }: { d: Design; pick: number; setPick: (n: number) => void }) {
  const all = runAll(d);
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Six emails and what each did to the CRM">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">emails · pick one</p>
      <ul className="mt-3 space-y-0.5">
        {EMAILS.map((e) => {
          const l = all.log.find((x) => x.email === e.id)!;
          return (
            <li key={e.id}>
              <button type="button" aria-pressed={e.id === pick} onClick={() => setPick(e.id)} className="grid min-h-11 w-full grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-1.5 text-left text-xs" style={{ background: e.id === pick ? `color-mix(in srgb, ${ACCENT} 14%, transparent)` : "transparent" }}>
                <span className="font-mono text-[var(--faint)]">{e.id}</span>
                <span className="min-w-0">
                  <span className="block truncate font-mono text-[11px]">{e.from}</span>
                  <span className="block truncate text-[11px] text-[var(--faint)]">{e.note}</span>
                </span>
                <span className="text-right font-mono text-[11px]" style={{ color: all.duplicateKeys.has(l.record) ? "var(--bad)" : "var(--muted)" }}>
                  {l.action} #{l.record}
                  {all.duplicateKeys.has(l.record) && <span className="block">duplicate</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CrmBoard({ d, highlight }: { d: Design; highlight: number }) {
  const all = runAll(d);
  const isWrong = (rec: number, f: string) => all.wrongCells.some((w) => w.record === rec && w.field === f);
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="The CRM after all six emails">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">CRM after all six</p>
        <p className="font-mono text-xs" style={{ color: all.right === all.total ? "var(--good)" : "var(--bad)" }}>
          {all.right}/{all.total} fields right
        </p>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {all.crm.map((c) => {
          const dupe = all.duplicateKeys.has(c.key);
          return (
            <div key={c.key} className="rounded-md border p-2 text-[11px]" style={{ borderColor: c.key === highlight ? ACCENT : dupe ? "var(--bad)" : "var(--line)" }}>
              <p className="font-mono text-[var(--faint)]">
                #{c.key}
                {dupe && <span className="text-[var(--bad)]"> · duplicate</span>}
              </p>
              <dl className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-2">
                {FIELDS.map((f) => (
                  <div key={f} className="contents">
                    <dt className="font-mono text-[var(--faint)]">{f}</dt>
                    <dd className="min-w-0 truncate" style={{ color: !dupe && isWrong(c.key, f) ? "var(--bad)" : "var(--text)" }}>
                      {show(c.fields[f].value)}
                      {c.fields[f].by === "person" && <span className="text-[var(--faint)]"> · rep</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
      </div>
    </section>
  );
}
