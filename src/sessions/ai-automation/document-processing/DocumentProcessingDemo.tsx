"use client";

import { useState, type ReactNode } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { DOCS, FIRST, FIXED, GATE, OCR_PER_1000_PAGES, checks, layerScore, processDoc, runAll, type Design, type Outcome, type TextPath } from "@/lib/documentProcessing";

const ACCENT = "var(--auto)";
const COLOR: Record<Outcome, string> = { right: "var(--good)", wrong: "var(--bad)", person: "var(--c2)" };
const WORD: Record<Outcome, string> = { right: "booked", wrong: "booked wrong", person: "to a person" };

export default function DocumentProcessingDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [pick, setPick] = useState(5);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const doc = DOCS.find((x) => x.id === pick)!;
  const r = processDoc(doc, d);
  const all = runAll(d);
  const score = doc.layerText ? layerScore(doc.layerText) : null;

  const toggle = (k: Exclude<keyof Design, "path">, label: string, extra?: ReactNode) => (
    <>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={d[k]} onChange={(e) => set({ [k]: e.target.checked } as Partial<Design>)} className="h-4 w-4" style={{ accentColor: ACCENT }} />
        {label}
      </label>
      {extra}
    </>
  );

  const nodes: MapNode[] = [
    { id: "inbox", label: "Supplier inbox", sub: `${DOCS.length} documents`, at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "router", label: "Text layer or OCR", sub: r.source === "none" ? "can't open" : r.source, at: [50, 18], mobileAt: [75, 12], state: r.source === "none" ? "bad" : "active" },
    { id: "ocr", label: "OCR service", sub: r.confidence === null ? "not used" : `confidence ${r.confidence.toFixed(2)}`, at: [86, 18], mobileAt: [75, 42], state: r.source === "OCR" ? (r.confidence! < GATE ? "wait" : "good") : "dim" },
    { id: "check", label: "Extract + check", sub: d.checks ? (r.problems.length ? `${r.problems.length} problem` : "adds up") : "no checks", at: [50, 62], mobileAt: [25, 42], state: r.problems.length ? "bad" : d.checks ? "good" : "idle" },
    { id: "books", label: "Accounting", sub: `${all.right} right · ${all.wrong} wrong`, at: [14, 86], mobileAt: [25, 76], state: r.outcome === "right" ? "good" : r.outcome === "wrong" ? "bad" : "idle" },
    { id: "review", label: "Review queue", sub: `${all.person} documents`, at: [86, 86], mobileAt: [75, 76], state: r.outcome === "person" ? "wait" : "idle" },
  ];

  const dest = r.outcome === "person" ? "review" : "books";
  const packets: Packet[] =
    stage === 0 ? hops("in", ["inbox", "router"], { label: `${doc.pages} page${doc.pages > 1 ? "s" : ""}` })
    : stage === 1 ? (r.source === "OCR" ? hops("o", ["router", "ocr"], { label: "page images" }) : r.source === "text layer" ? hops("t", ["router", "check"], { label: "embedded text" }) : [])
    : stage === 2 ? (r.source === "OCR" ? hops("o2", ["ocr", "check"], { label: `text · ${r.confidence!.toFixed(2)}`, tone: r.confidence! < GATE ? "bad" : "good" }) : [])
    : stage === 3 ? []
    : stage === 4 ? hops("w", [r.source === "none" ? "router" : "check", dest], { label: r.outcome === "person" ? "needs a person" : `total ${r.fields.total}`, tone: r.outcome === "wrong" ? "bad" : r.outcome === "right" ? "good" : undefined })
    : [];

  const captions = [
    `Step 1: ${doc.name}, ${doc.pages} page${doc.pages > 1 ? "s" : ""}.`,
    r.source === "none" ? "Step 2: the PDF is encrypted; nothing can read it." : r.source === "text layer" ? `Step 2: the PDF's own text layer is used${doc.textLayer === "garbage" ? ", though it's garbage" : ""}.` : `Step 2: the page images go to OCR${doc.textLayer === "garbage" ? " because the text layer looks like garbage" : ""}.`,
    r.source === "OCR" ? `Step 3: OCR confidence ${r.confidence!.toFixed(2)}${d.clean ? " after deskewing and upscaling" : ""}.` : "Step 3: no OCR needed.",
    `Step 4: extracted number ${r.fields.number || "—"}, total ${r.fields.total || "—"}, ${r.fields.lines.length} line${r.fields.lines.length === 1 ? "" : "s"}.`,
    `Step 5: ${WORD[r.outcome]}: ${r.why}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${all.right} of ${DOCS.length} booked right · ${all.wrong} booked wrong · ${all.person} to a person · ${all.ocrPages} of ${all.totalPages} pages through OCR.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Automation · interactive"
        title="Document processing"
        blurb="Eight supplier documents arrive: a clean digital PDF, scans, a tilted phone photo, a fax, a PDF with a garbage hidden text layer, a locked PDF, a two-page invoice and a handwritten note. Getting from pixels to booked numbers is a chain of choices: where the text comes from, how the image is cleaned, and what is checked before anything is booked."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Supplier inbox, a text-layer-or-OCR router, an OCR service, extraction with checks, accounting and a review queue"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "inbox", to: "router", label: "PDF / image" },
                  { from: "router", to: "ocr", label: "images", dim: r.source !== "OCR" },
                  { from: "router", to: "check", label: "text layer", dim: r.source !== "text layer" },
                  { from: "ocr", to: "check", label: "text", dim: r.source !== "OCR" },
                  { from: "check", to: "books", label: "book" },
                  { from: "check", to: "review", label: "unsure" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <DocList d={d} pick={pick} setPick={setPick} />
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
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Reading…">
                {`Run document ${doc.id}`}
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Use the text layer when it's real" what="A PDF exported from software already contains its text, exactly. Reading it is free and perfect; sending it through OCR costs money and can only add errors. Scans and photos have no text layer and need OCR." accent={ACCENT} active={at(0)}>
                <Choices<TextPath> label="Where text comes from" accent={ACCENT} value={d.path} onChange={(v) => set({ path: v })} options={[{ id: "layer-first", label: "Text layer if present, else OCR" }, { id: "ocr-all", label: "OCR every page" }]} />
                <p className="mt-2 font-mono text-xs">
                  {all.ocrPages} of {all.totalPages} pages through OCR · ${((all.ocrPages / all.totalPages) * 10 * OCR_PER_1000_PAGES).toFixed(2)} per 10,000 pages at ${OCR_PER_1000_PAGES} per 1,000
                </p>
              </FlowStep>
              <FlowArrow label="text or images" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Check the text layer isn't garbage" what="Some scanners embed their own poor OCR as a hidden text layer. It looks like text to a program. Score it (what share of tokens are words or numbers) and OCR the page again when it's low." accent={ACCENT} active={at(1)}>
                {toggle("detectGarbage", "OCR again when under 60% of tokens are words or numbers", doc.layerText ? <p className="font-mono text-[11px] text-[var(--muted)]">“{doc.layerText}” → {Math.round((score ?? 0) * 100)}% words</p> : <p className="text-[11px] text-[var(--faint)]">This document has no text layer.</p>)}
              </FlowStep>
              <FlowArrow label="page images" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Clean the image before OCR" what="OCR is trained on straight, sharp, black-on-white text. Deskewing a tilted photo and upscaling a 100 dpi fax move confidence far more than switching OCR engines." accent={ACCENT} active={at(2)}>
                {toggle("clean", "Deskew, upscale and binarize first", doc.textLayer === "none" || doc.textLayer === "garbage" ? <p className="font-mono text-[11px] text-[var(--muted)]">confidence {doc.ocr.raw.toFixed(2)} raw → {doc.ocr.cleaned.toFixed(2)} cleaned</p> : null)}
              </FlowStep>
              <FlowArrow label="text + confidence" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Extract from the whole document" what="Tables run onto the next page. Extracting page by page treats page 2 as a different document and loses its lines; extract over all pages together." accent={ACCENT} active={at(3)}>
                {toggle("wholeDoc", "Extract across all pages at once")}
                <p className="font-mono text-[11px]">
                  number {r.fields.number || "—"} · total {r.fields.total || "—"} · lines {r.fields.lines.join(" + ") || "—"}
                </p>
              </FlowStep>
              <FlowArrow label="fields" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Check before booking, and send doubt to a person" what="Arithmetic catches most misreads: lines must add up to the total and amounts must parse. A misread that is consistent (130 for 180 everywhere) passes arithmetic; low OCR confidence is what flags it." accent={ACCENT} active={at(4)}>
                {toggle("checks", "Check numbers parse and lines add up to the total", <p className="text-[11px]" style={{ color: checks(r.fields).length ? "var(--bad)" : "var(--good)" }}>{checks(r.fields).join("; ") || "adds up"}</p>)}
                {toggle("gate", `Send OCR confidence under ${GATE} to a person`)}
                <p className="mt-1 font-mono text-xs">
                  {all.right} booked right · {all.wrong} booked wrong · {all.person} to a person
                </p>
                <p className="mt-2 text-[11px] text-[var(--faint)]">OCR confidence and what it reads at each quality are illustrative. Choosing the path, the garbage score, the gate, the arithmetic and the page cost run here.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function DocList({ d, pick, setPick }: { d: Design; pick: number; setPick: (n: number) => void }) {
  const all = runAll(d);
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Eight documents and where each ended up">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">documents · pick one</p>
        <p className="font-mono text-xs" style={{ color: all.wrong ? "var(--bad)" : "var(--good)" }}>
          {all.wrong} booked wrong
        </p>
      </div>
      <ul className="mt-3 space-y-0.5">
        {all.results.map((r) => (
          <li key={r.doc.id}>
            <button type="button" aria-pressed={r.doc.id === pick} onClick={() => setPick(r.doc.id)} className="grid min-h-11 w-full grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-1.5 text-left text-xs" style={{ background: r.doc.id === pick ? `color-mix(in srgb, ${ACCENT} 14%, transparent)` : "transparent" }}>
              <span className="font-mono text-[var(--faint)]">{r.doc.id}</span>
              <span className="min-w-0 truncate">{r.doc.name}</span>
              <span className="text-right text-[11px]" style={{ color: COLOR[r.outcome] }}>
                {WORD[r.outcome]}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
