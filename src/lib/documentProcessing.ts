// Document processing. Eight supplier documents arrive as PDFs and pictures: a clean
// digital PDF, scans, a skewed phone photo, a fax, a PDF whose hidden text layer is
// garbage, a locked PDF, a two-page invoice and a handwritten note. How text is read,
// cleaned and checked decides what reaches accounting. Recognition quality per
// document is illustrative; choosing the path, the garbage detector, the confidence
// gate, the arithmetic checks and the page costs run here.

export type Fields = { number: string; total: string; lines: string[] };
export type Doc = {
  id: number;
  name: string;
  pages: number;
  textLayer: "good" | "none" | "garbage" | "locked";
  layerText?: string; // what the embedded text layer says
  ocr: { raw: number; cleaned: number }; // OCR confidence before and after deskew + upscale
  read: { good: Fields; poor: Fields; bad: Fields }; // what comes out at each quality
  truth: Fields;
  multiPage?: boolean;
};

const F = (number: string, total: string, lines: string[]): Fields => ({ number, total, lines });

export const DOCS: Doc[] = [
  { id: 1, name: "Digital PDF from a supplier's system", pages: 1, textLayer: "good", layerText: "Invoice INV-4471 Total 1,284.50", ocr: { raw: 0.99, cleaned: 0.99 }, truth: F("INV-4471", "1284.50", ["850.00", "434.50"]), read: { good: F("INV-4471", "1284.50", ["850.00", "434.50"]), poor: F("INV-4471", "1234.50", ["850.00", "434.50"]), bad: F("INV-447I", "I284.5O", ["85O.OO"]) } },
  { id: 2, name: "Scan at 300 dpi", pages: 1, textLayer: "none", ocr: { raw: 0.98, cleaned: 0.99 }, truth: F("A-2093", "96.00", ["60.00", "36.00"]), read: { good: F("A-2093", "96.00", ["60.00", "36.00"]), poor: F("A-2093", "98.00", ["60.00", "36.00"]), bad: F("A-2O93", "9G.00", ["6O.00"]) } },
  { id: 3, name: "Phone photo, tilted 12°", pages: 1, textLayer: "none", ocr: { raw: 0.71, cleaned: 0.93 }, truth: F("77120", "412.80", ["400.00", "12.80"]), read: { good: F("77120", "412.80", ["400.00", "12.80"]), poor: F("77120", "472.80", ["400.00", "12.80"]), bad: F("7712O", "4l2.8", ["4OO.0O"]) } },
  { id: 4, name: "Fax at 100 dpi", pages: 1, textLayer: "none", ocr: { raw: 0.84, cleaned: 0.95 }, truth: F("F-588", "2310.00", ["2100.00", "210.00"]), read: { good: F("F-588", "2310.00", ["2100.00", "210.00"]), poor: F("F-588", "2310.00", ["2100.00", "210.00"]), bad: F("F-5BB", "23IO.00", ["2l00.00"]) } },
  { id: 5, name: "Scanner PDF with a bad hidden text layer", pages: 1, textLayer: "garbage", layerText: "lnv0ice N° 5O19 T0ta1 l,O2O.OO ~~ .,;;", ocr: { raw: 0.98, cleaned: 0.99 }, truth: F("5019", "1020.00", ["1000.00", "20.00"]), read: { good: F("5019", "1020.00", ["1000.00", "20.00"]), poor: F("5019", "1020.00", ["1000.00", "20.00"]), bad: F("5O19", "l,O2O.OO", []) } },
  { id: 6, name: "Password-protected PDF", pages: 1, textLayer: "locked", ocr: { raw: 0, cleaned: 0 }, truth: F("P-12", "75.00", ["75.00"]), read: { good: F("", "", []), poor: F("", "", []), bad: F("", "", []) } },
  { id: 7, name: "Two-page invoice, lines continue on page 2", pages: 2, textLayer: "good", layerText: "Invoice 9930 … continued", multiPage: true, ocr: { raw: 0.99, cleaned: 0.99 }, truth: F("9930", "640.00", ["200.00", "200.00", "240.00"]), read: { good: F("9930", "640.00", ["200.00", "200.00", "240.00"]), poor: F("9930", "640.00", ["200.00", "200.00"]), bad: F("993O", "64O", []) } },
  { id: 8, name: "Handwritten delivery note", pages: 1, textLayer: "none", ocr: { raw: 0.52, cleaned: 0.61 }, truth: F("DN-3", "180.00", ["180.00"]), read: { good: F("DN-3", "180.00", ["180.00"]), poor: F("DN-3", "130.00", ["180.00"]), bad: F("DN-8", "130.00", ["130.00"]) } },
];

export type TextPath = "ocr-all" | "layer-first";
export type Design = { path: TextPath; detectGarbage: boolean; clean: boolean; gate: boolean; checks: boolean; wholeDoc: boolean };
export const FIRST: Design = { path: "layer-first", detectGarbage: false, clean: false, gate: false, checks: false, wholeDoc: false };
export const FIXED: Design = { path: "layer-first", detectGarbage: true, clean: true, gate: true, checks: true, wholeDoc: true };
export const GATE = 0.9;
export const OCR_PER_1000_PAGES = 1.5; // dollars, a typical cloud OCR price

// a text layer is garbage when few of its tokens look like words or numbers
export function layerScore(text: string): number {
  const tokens = text.split(/\s+/).filter(Boolean);
  const ok = tokens.filter((t) => /^[A-Za-z]{2,}$/.test(t) || /^[\d.,-]+$/.test(t) || /^[A-Z]+-\d+$/.test(t) || t === "…" || t === "N°");
  return tokens.length ? ok.length / tokens.length : 0;
}

const num = (s: string) => (/^\d+(\.\d+)?$/.test(s.replace(/,/g, "")) ? Number(s.replace(/,/g, "")) : NaN);

export function checks(f: Fields): string[] {
  const out: string[] = [];
  const total = num(f.total);
  const lines = f.lines.map(num);
  if (!f.number) out.push("no invoice number");
  if (Number.isNaN(total)) out.push(`total “${f.total}” is not a number`);
  if (lines.some(Number.isNaN)) out.push("a line amount is not a number");
  if (!Number.isNaN(total) && !lines.some(Number.isNaN)) {
    const sum = Math.round(lines.reduce((a, b) => a + b, 0) * 100) / 100;
    if (Math.abs(sum - total) > 0.005) out.push(`lines add up to ${sum.toFixed(2)}, total says ${total.toFixed(2)}`);
  }
  return out;
}

export type Outcome = "right" | "wrong" | "person";
export type Result = { doc: Doc; source: "text layer" | "OCR" | "none"; confidence: number | null; fields: Fields; problems: string[]; outcome: Outcome; why: string; ocrPages: number };

const same = (a: Fields, b: Fields) => a.number === b.number && num(a.total) === num(b.total) && a.lines.length === b.lines.length && a.lines.every((l, i) => num(l) === num(b.lines[i]));

export function processDoc(doc: Doc, d: Design): Result {
  if (doc.textLayer === "locked") return { doc, source: "none", confidence: null, fields: doc.read.good, problems: ["the PDF is encrypted"], outcome: "person", why: "can't open it: ask the supplier for an unlocked copy", ocrPages: 0 };

  const garbage = doc.textLayer === "garbage";
  const useLayer = d.path === "layer-first" && (doc.textLayer === "good" || (garbage && !(d.detectGarbage && layerScore(doc.layerText ?? "") < 0.6)));
  let fields: Fields;
  let confidence: number | null = null;
  let ocrPages = 0;
  if (useLayer) {
    fields = garbage ? doc.read.bad : doc.multiPage && !d.wholeDoc ? doc.read.poor : doc.read.good;
  } else {
    ocrPages = doc.pages;
    confidence = d.clean ? doc.ocr.cleaned : doc.ocr.raw;
    const quality = confidence >= 0.97 ? "good" : confidence >= 0.9 ? "poor" : "bad";
    fields = doc.multiPage && !d.wholeDoc && quality === "good" ? doc.read.poor : doc.read[quality];
  }
  const problems = d.checks ? checks(fields) : [];
  const source = useLayer ? "text layer" : "OCR";
  if (d.gate && confidence !== null && confidence < GATE) return { doc, source, confidence, fields, problems, outcome: "person", why: `OCR confidence ${confidence.toFixed(2)} is under ${GATE}`, ocrPages };
  if (problems.length) return { doc, source, confidence, fields, problems, outcome: "person", why: problems[0], ocrPages };
  if (same(fields, doc.truth)) return { doc, source, confidence, fields, problems, outcome: "right", why: `read from the ${source}`, ocrPages };
  const diffs = [
    fields.number !== doc.truth.number && `number ${fields.number || "—"} for ${doc.truth.number}`,
    num(fields.total) !== num(doc.truth.total) && `total ${fields.total || "—"} for ${doc.truth.total}`,
    fields.lines.length < doc.truth.lines.length && `${doc.truth.lines.length - fields.lines.length} line${doc.truth.lines.length - fields.lines.length > 1 ? "s" : ""} missing`,
  ].filter(Boolean);
  return { doc, source, confidence, fields, problems, outcome: "wrong", why: `written wrong: ${diffs.join(", ")}`, ocrPages };
}

export function runAll(d: Design) {
  const results = DOCS.map((doc) => processDoc(doc, d));
  const n = (o: Outcome) => results.filter((r) => r.outcome === o).length;
  const pages = results.reduce((a, r) => a + r.ocrPages, 0);
  return { results, right: n("right"), wrong: n("wrong"), person: n("person"), ocrPages: pages, totalPages: DOCS.reduce((a, x) => a + x.pages, 0) };
}
