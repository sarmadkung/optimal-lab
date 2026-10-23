"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type Packet } from "@/components/system/SystemMap";
import { ALL_OFF, ALL_ON, DOCS, extract, type DocId, type FieldResult, type Options } from "@/lib/documentExtraction";

const ACCENT = "var(--native)";
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

export default function ExtractionDemo() {
  const [docId, setDocId] = useState<DocId>("invoice");
  const [o, setO] = useState<Options>(ALL_OFF);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Options>) => setO((c) => ({ ...c, ...p }));
  const doc = DOCS.find((d) => d.id === docId)!;
  const r = extract(doc, o);
  const n = doc.fields.length;

  const packets: Packet[] =
    stage === 0 ? hops("pdf", ["upload", "ocr"], { label: "PDF" })
    : stage === 1 ? hops("txt", ["ocr", "model"], { label: o.describe ? "text + described schema" : "text + field names" })
    : stage === 2 ? hops("json", ["model", "checks"], { label: o.quotes ? `${n} fields + quotes` : `${n} fields` })
    : stage === 3 ? hops("ok", ["checks", "db"], { label: `${r.saved + r.silent} saved`, tone: r.silent ? "bad" : "good" })
    : stage === 4 ? (r.review ? hops("rev", ["checks", "review", "db"], { label: `${r.review} to check` }) : [])
    : [];

  const captions = [
    `Step 1: the ${doc.label.toLowerCase()} becomes plain text, with its layout kept as lines and columns.`,
    `Step 2: the model gets the text and ${o.describe ? "a schema that describes every field and says to return null when a field is absent" : "a list of bare field names"}.`,
    `Step 3: it returns ${n} fields${o.quotes ? `, each with the words it came from; ${r.results.filter((x) => x.quoteFound === false).length} of those quotes are not in the document` : ""}.`,
    o.checks ? `Step 4: code converts dates and amounts and runs ${plural(doc.checks.length, "check")}; ${r.checks.filter((c) => !c.pass).length} fail.` : "Step 4: no checks: the model's own conversions go straight into the database.",
    r.review ? `Step 5: ${plural(r.review, "field")} wait for a person; ${r.silent ? `${plural(r.silent, "wrong field")} went in unnoticed` : "nothing wrong slipped through"}.` : `Step 5: nothing flagged; ${r.silent ? `${plural(r.silent, "wrong field")} went in unnoticed` : "every field was right"}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${doc.label}: ${r.wrong} of ${n} values wrong before review · ${r.saved} saved · ${r.review} to a person · ${r.silent} wrong and saved without anyone knowing.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Native · interactive"
        title="Extracting data from documents"
        blurb="A model can read an invoice, a résumé or a contract and fill in fields. It also misreads digits, picks the wrong date, swaps the two parties and invents a field that isn't there. Let the model find each value and quote it; let code convert and check it; send what fails to a person."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Upload, text extraction, model, checks in code, review queue and database"
                accent={ACCENT}
                chrome="split"
                nodes={[
                  { id: "upload", label: "Upload", sub: doc.label.toLowerCase(), at: [10, 28], mobileAt: [50, 8], state: "active" },
                  { id: "ocr", label: "Text + layout", sub: "PDF text or OCR", at: [35, 28], mobileAt: [50, 28], state: "active" },
                  { id: "model", label: "Model", sub: o.describe ? "described schema" : "field names", at: [60, 28], mobileAt: [50, 48], state: "active" },
                  { id: "checks", label: "Checks in code", sub: o.checks || o.quotes ? `${r.review} flagged` : "off", at: [86, 28], mobileAt: [50, 68], state: o.checks || o.quotes ? "active" : "dim" },
                  { id: "review", label: "Person", sub: `${r.review} to check`, at: [60, 80], mobileAt: [22, 90], state: r.review ? "wait" : "idle" },
                  { id: "db", label: "Database", sub: r.silent ? `${r.silent} wrong` : "all right", at: [86, 80], mobileAt: [78, 90], state: r.silent ? "bad" : "good" },
                ]}
                links={[
                  { from: "upload", to: "ocr", label: "file" },
                  { from: "ocr", to: "model", label: "text" },
                  { from: "model", to: "checks", label: "JSON" },
                  { from: "checks", to: "db", label: "passed" },
                  { from: "checks", to: "review", label: "flagged", dim: !r.review },
                  { from: "review", to: "db", label: "corrected", dim: !r.review },
                ]}
                packets={packets}
                aspect={2}
                mobileAspect={0.78}
              />
              <Fields results={r.results} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices label="Document" accent={ACCENT} value={docId} onChange={setDocId} options={DOCS.map((d) => ({ id: d.id, label: d.label }))} />
              </div>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setO(ALL_OFF)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Model only
                </button>
                <button type="button" onClick={() => setO(ALL_ON)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Every safeguard
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Extracting…">
                {`Extract the ${doc.label.toLowerCase()}`}
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Get the text out, with its layout" what="A PDF with a text layer gives the words directly; a scan needs OCR first. Keep the lines and columns: “€350,00” only means something because it sits on the monitor-arms row." accent={ACCENT} active={at(0)}>
                <Highlighted text={doc.text} quotes={r.results.filter((x) => x.quoteFound).map((x) => x.quote!)} />
                <p className="mt-1 text-[11px] text-[var(--faint)]">Highlighted: words the model quoted that really appear in the document.</p>
              </FlowStep>
              <FlowArrow label="text" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Describe every field in a schema" what="Bare names leave the model guessing: which party is the client, which date is the invoice date, what to do when there is no PO number. A one-line description per field, and “null when the document doesn't say”, settles each of those before the model reads anything." accent={ACCENT} active={at(1)}>
                <Toggle on={o.describe} set={(v) => set({ describe: v })} label="Describe each field, null when absent" />
                <pre className="mt-1 overflow-x-auto rounded-md bg-[var(--inset)] p-2 font-mono text-[11px] leading-relaxed">
                  {o.describe ? DESCRIBED[docId] : `{ ${doc.fields.slice(0, 4).map((f) => `"${f.key}"`).join(", ")}, … }`}
                </pre>
              </FlowStep>
              <FlowArrow label="JSON" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Return each value with the words it came from" what="Ask for the value exactly as written plus a short quote. Code then searches the document for the quote: a misread digit or an invented field has no quote to point at. A real quote still doesn't prove it belongs to this field." accent={ACCENT} active={at(2)}>
                <Toggle on={o.quotes} set={(v) => set({ quotes: v })} label="Require a quote, and check it is in the text" />
                <ul className="space-y-0.5 font-mono text-[11px]">
                  {r.results
                    .filter((x) => x.quote !== null)
                    .slice(0, 12)
                    .map((x) => (
                      <li key={x.field.key} className="break-words" style={{ color: o.quotes && x.quoteFound === false ? "var(--bad)" : "var(--muted)" }}>
                        {x.field.key}: “{x.quote}” {o.quotes ? (x.quoteFound ? "found" : "not in the document") : ""}
                      </li>
                    ))}
                </ul>
              </FlowStep>
              <FlowArrow label="values as written" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Convert and cross-check in code" what="Turning “02.04.2026” into a date is a job for code, which knows this invoice is German and writes the day first. Code also checks fields against each other: lines add up to the subtotal, the end date matches the term. A model asked to convert formats itself gets the occasional date backwards." accent={ACCENT} active={at(3)}>
                <Toggle on={o.checks} set={(v) => set({ checks: v })} label="Convert formats and run checks in code" />
                <ul className="space-y-0.5 text-xs">
                  {r.checks.map((c) => (
                    <li key={c.name} style={{ color: !c.ran ? "var(--faint)" : c.pass ? "var(--good)" : "var(--bad)" }}>
                      {!c.ran ? "–" : c.pass ? "✓" : "✗"} {c.name}
                    </li>
                  ))}
                </ul>
              </FlowStep>
              <FlowArrow label="flagged fields" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Send what fails to a person" what="Fields that pass go straight in. Fields that fail a check wait in a review screen beside the document, with the reason. The number to watch is the last one: wrong values that passed every check and went in silently." accent={ACCENT} active={at(4)}>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Stat label="saved" value={r.saved} tone="var(--good)" />
                  <Stat label="to a person" value={r.review} tone="var(--c2)" />
                  <Stat label="wrong, unnoticed" value={r.silent} tone={r.silent ? "var(--bad)" : "var(--good)"} />
                </div>
                <AllDocs o={o} />
                <p className="mt-2 text-[11px] text-[var(--faint)]">The model&apos;s answers are illustrative. The format conversions, the quote search and every check run for real on these documents.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

const DESCRIBED: Record<DocId, string> = {
  invoice: `"issued": date the invoice was written ("Date"),\n"due":    date payment is due ("Due"),\n"po":     buyer's purchase-order number,\n          null if the invoice has none,\n…`,
  resume: `"employer":  employer of the role marked "present",\n"gradYear":  year the degree was awarded,\n             null if no year is written,\n…`,
  contract: `"client":   the party defined as ("Client"),\n"provider": the party defined as ("Provider"),\n"endDate":  last day of the first term,\n…`,
};

function Toggle({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) {
  return (
    <label className="flex min-h-11 items-center gap-2 text-sm">
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} className="h-4 w-4" style={{ accentColor: ACCENT }} />
      {label}
    </label>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-md bg-[var(--inset)] p-2">
      <p className="font-mono text-lg" style={{ color: tone }}>
        {value}
      </p>
      <p className="text-[11px] text-[var(--muted)]">{label}</p>
    </div>
  );
}

function AllDocs({ o }: { o: Options }) {
  return (
    <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-x-3 gap-y-0.5 font-mono text-[11px]">
      <span className="text-[var(--faint)]">document</span>
      <span className="text-right text-[var(--faint)]">saved</span>
      <span className="text-right text-[var(--faint)]">person</span>
      <span className="text-right text-[var(--faint)]">silent</span>
      {DOCS.map((d) => {
        const x = extract(d, o);
        return [
          <span key={`${d.id}-l`}>{d.label}</span>,
          <span key={`${d.id}-s`} className="text-right">
            {x.saved}
          </span>,
          <span key={`${d.id}-r`} className="text-right">
            {x.review}
          </span>,
          <span key={`${d.id}-x`} className="text-right" style={{ color: x.silent ? "var(--bad)" : "var(--good)" }}>
            {x.silent}
          </span>,
        ];
      })}
    </div>
  );
}

function Fields({ results }: { results: FieldResult[] }) {
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Each extracted field, its stored value and what happened to it">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">extracted fields</p>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] gap-x-3 gap-y-1 text-xs">
        <span className="font-mono text-[var(--faint)]">field</span>
        <span className="font-mono text-[var(--faint)]">stored</span>
        <span className="text-right font-mono text-[var(--faint)]" />
        {results.map((x) => (
          <Line key={x.field.key} x={x} />
        ))}
      </div>
    </section>
  );
}

function Line({ x }: { x: FieldResult }) {
  const tone = x.status === "saved" ? "var(--good)" : x.status === "review" ? "var(--c2)" : "var(--bad)";
  const why = x.status === "review" ? (x.quoteFound === false ? "quote not found" : x.failed[0]) : x.status === "silent" ? `should be ${x.field.truth ?? "empty"}` : "";
  return (
    <>
      <span className="min-w-0 break-words">{x.field.label}</span>
      <span className="min-w-0 break-words font-mono">
        {x.value ?? "null"}
        {why && (
          <span className="block font-sans text-[11px]" style={{ color: tone }}>
            {why}
          </span>
        )}
      </span>
      <span className="text-right font-mono" style={{ color: tone }}>
        {x.status === "saved" ? "✓" : x.status === "review" ? "⚑" : "✗"}
      </span>
    </>
  );
}

// The document with every quote that was found marked.
function Highlighted({ text, quotes }: { text: string; quotes: string[] }) {
  const marks: [number, number][] = [];
  for (const q of quotes) {
    const i = text.indexOf(q);
    if (i >= 0) marks.push([i, i + q.length]);
  }
  marks.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const m of marks) {
    const last = merged[merged.length - 1];
    if (last && m[0] <= last[1]) last[1] = Math.max(last[1], m[1]);
    else merged.push([m[0], m[1]]);
  }
  const parts: { s: string; on: boolean }[] = [];
  let pos = 0;
  for (const [a, b] of merged) {
    if (a > pos) parts.push({ s: text.slice(pos, a), on: false });
    parts.push({ s: text.slice(a, b), on: true });
    pos = b;
  }
  parts.push({ s: text.slice(pos), on: false });
  return (
    <pre className="overflow-x-auto rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] leading-relaxed sm:text-[11px]">
      {parts.map((p, i) =>
        p.on ? (
          <mark key={i} className="rounded-sm text-[var(--text)]" style={{ background: `color-mix(in srgb, ${ACCENT} 28%, transparent)` }}>
            {p.s}
          </mark>
        ) : (
          <span key={i}>{p.s}</span>
        ),
      )}
    </pre>
  );
}
