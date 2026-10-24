"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { PAGES_PER_MONTH, PARSERS, TWO_COLUMN, monthly, parse, type Parser } from "@/lib/documentParsers";

const ACCENT = "var(--tools)";

export default function DocumentParsersDemo() {
  const [p, setP] = useState<Parser>("plain");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const r = parse(p);
  const m = monthly(p);
  const ok = [r.columnsOk, r.tableOk, r.boilerplateOk, r.chartOk].filter(Boolean).length;

  const nodes: MapNode[] = [
    { id: "pdf", label: "PDFs and slides", sub: `${PAGES_PER_MONTH.toLocaleString("en-US")} pages a month`, at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "parser", label: PARSERS.find((x) => x.id === p)!.label, sub: p === "vision" ? "a model reads each page image" : p === "layout" ? "finds columns, tables, headers" : "text in drawing order", at: [50, 50], mobileAt: [75, 12], state: ok >= 3 ? "good" : "wait" },
    { id: "chunks", label: "Chunker", sub: r.boilerplateOk ? "clean sections" : "headers in every chunk", at: [86, 18], mobileAt: [75, 44], state: r.boilerplateOk ? "good" : "bad" },
    { id: "index", label: "Search index", sub: r.columnsOk ? "readable text" : "scrambled sentences", at: [86, 82], mobileAt: [75, 76], state: r.columnsOk ? "good" : "bad" },
    { id: "model", label: "Vision model", sub: p === "vision" ? `$${m.dollars.toLocaleString("en-US")} a month` : "not used", at: [14, 82], mobileAt: [25, 44], state: p === "vision" ? "active" : "dim" },
    { id: "tables", label: "Tables", sub: r.tableOk ? "rows and columns kept" : "a run of numbers", at: [50, 92], mobileAt: [25, 76], state: r.tableOk ? "good" : "bad" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("c", ["pdf", "parser"], { label: "2-column page" })
    : stage === 1 ? hops("t", ["parser", "tables"], { label: r.tableOk ? "| Item | Qty |" : "Item Qty Unit…", tone: r.tableOk ? "good" : "bad" })
    : stage === 2 ? hops("h", ["parser", "chunks"], { label: r.boilerplateOk ? "header removed" : "header × 12", tone: r.boilerplateOk ? "good" : "bad" })
    : stage === 3 ? (p === "vision" ? hops("v", ["parser", "model", "parser"], { label: "page image" }) : hops("g", ["pdf", "parser"], { label: "chart: no text", tone: "bad" }))
    : stage === 4 ? hops("i", ["chunks", "index"], { label: `${ok}/4 right` })
    : [];

  const captions = [
    r.columnsOk ? "Step 1: the two columns come out one after the other, each in order." : "Step 1: lines from the two columns alternate: every sentence is cut in half.",
    r.tableOk ? "Step 2: the invoice table comes out as rows and columns." : "Step 2: the table comes out as words in a row, and the wrapped description breaks the first row in two.",
    r.boilerplateOk ? `Step 3: lines repeated on most pages are removed: ${r.report.removed.join("; ")}.` : "Step 3: the header and the page number end up in every chunk, and in every search result.",
    p === "vision" ? `Step 4: the chart's values are read from the image: ${r.chart}.` : `Step 4: the chart is an image: ${r.chart || "nothing"} comes out.`,
    `Step 5: ${ok} of 4 checks pass · $${m.dollars.toLocaleString("en-US")} and ${m.hours} machine-hours a month.`,
  ];
  const caption = stage !== null ? captions[stage] : `${PARSERS.find((x) => x.id === p)!.label}: ${ok} of 4 checks pass · $${m.dollars.toLocaleString("en-US")} a month for ${PAGES_PER_MONTH.toLocaleString("en-US")} pages · ${m.hours} machine-hours.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="Tools · interactive"
        title="Document parsers"
        blurb="A PDF doesn't store sentences, tables or headings; it stores pieces of text at positions on a page. Everything a RAG system retrieves depends on putting them back together. Parse a two-column paper, an invoice table, a report with headers and footers, and a chart, three ways."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="PDFs and slides, a parser, an optional vision model, tables, a chunker and the search index"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "pdf", to: "parser", label: "pages" },
                  { from: "parser", to: "model", label: "images", dim: p !== "vision" },
                  { from: "parser", to: "tables", label: "tables" },
                  { from: "parser", to: "chunks", label: "text" },
                  { from: "chunks", to: "index", label: "chunks" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="What each part of the documents became">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">two-column page, as extracted</p>
                <ol className="mt-2 space-y-0.5 text-xs">
                  {r.columns.map((l, i) => (
                    <li key={i} style={{ color: r.columnsOk ? "var(--text)" : TWO_COLUMN.find((b) => b.text === l)!.x > 200 ? "var(--c2)" : "var(--text)" }}>
                      {l}
                    </li>
                  ))}
                </ol>
                <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">invoice table</p>
                <pre className="mt-1 overflow-x-auto whitespace-pre rounded-md bg-[var(--inset)] p-2 font-mono text-[10px]">{r.table.join("\n")}</pre>
                <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">report page 2, as chunked</p>
                <p className="mt-1 text-xs">{r.report.kept[1].join(" · ")}</p>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices<Parser> label="Parser" accent={ACCENT} value={p} onChange={setP} options={PARSERS.map((x) => ({ id: x.id, label: x.label }))} />
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Parsing…">
                Parse the documents
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Put the reading order back" what="Text is drawn line by line across the page. A plain extractor sorted by position interleaves two columns; a layout-aware parser finds the gap between columns and reads each one down." accent={ACCENT} active={at(0)}>
                <p className="text-xs" style={{ color: r.columnsOk ? "var(--good)" : "var(--bad)" }}>{r.columnsOk ? "Reading order correct." : "Columns interleaved."}</p>
              </FlowStep>
              <FlowArrow label="text" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Keep tables as tables" what="A table flattened to words loses which number belongs to which column, and a wrapped cell becomes a fake row. Parsers that detect table structure output rows and cells, as Markdown or HTML, which models read well." accent={ACCENT} active={at(1)}>
                <p className="text-xs" style={{ color: r.tableOk ? "var(--good)" : "var(--bad)" }}>{r.tableOk ? "Table structure kept." : "Table flattened."}</p>
              </FlowStep>
              <FlowArrow label="pages" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Drop what repeats on every page" what="Running headers, footers and page numbers end up in every chunk and match every query about the company name. Lines that repeat on most pages (numbers aside) can be found and removed." accent={ACCENT} active={at(2)}>
                <p className="text-xs" style={{ color: r.boilerplateOk ? "var(--good)" : "var(--bad)" }}>{r.boilerplateOk ? `Removed: ${r.report.removed.join("; ")}` : "Kept in every chunk."}</p>
              </FlowStep>
              <FlowArrow label="images" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Send pages a parser can't read to a vision model" what="Charts, diagrams and scans have no text to extract. A multimodal model reading the page image handles them, at a cost per page and with the occasional misread number. Use it for the pages that need it, not all of them." accent={ACCENT} active={at(3)}>
                <p className="text-xs" style={{ color: r.chartOk ? "var(--good)" : "var(--bad)" }}>{r.chart || "Nothing extracted from the chart."}</p>
                {r.misread && <p className="text-[11px] text-[var(--c2)]">{r.misread} (illustrative)</p>}
              </FlowStep>
              <FlowArrow label="chunks" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Compare quality, cost and time" what="Run a sample of your own documents through two or three parsers and read the output. The cheapest parser that gets your layouts right wins; route the hard pages to the expensive one." accent={ACCENT} active={at(4)}>
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="text-[var(--faint)]">
                      <th className="py-0.5 font-normal" />
                      <th className="py-0.5 text-right font-normal">checks</th>
                      <th className="py-0.5 text-right font-normal">$ / month</th>
                      <th className="py-0.5 text-right font-normal">hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PARSERS.map((x) => {
                      const rr = parse(x.id);
                      const mm = monthly(x.id);
                      return (
                        <tr key={x.id} className="border-t border-[var(--line)]" style={{ color: x.id === p ? ACCENT : undefined }}>
                          <td className="py-1">{x.label}</td>
                          <td className="py-1 text-right font-mono">{[rr.columnsOk, rr.tableOk, rr.boilerplateOk, rr.chartOk].filter(Boolean).length}/4</td>
                          <td className="py-1 text-right font-mono">{mm.dollars.toLocaleString("en-US")}</td>
                          <td className="py-1 text-right font-mono">{mm.hours}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Page layouts are made up. Reading order, table rebuilding and header removal run here; vision cost and error rate are illustrative.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
