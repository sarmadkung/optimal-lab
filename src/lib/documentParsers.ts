// Document parsers. Text that looks fine on a page comes out of a PDF as positioned
// fragments. A plain extractor reads them top to bottom, a layout-aware parser finds
// columns, tables and repeated headers first, and a vision model reads the page image.
// The page layouts are made up; plain ordering, column detection, table rebuilding and
// header/footer removal run here, and vision-model cost and error rates are illustrative.

export type Box = { x: number; y: number; text: string };

// a two-column page: each column reads top to bottom
export const TWO_COLUMN: Box[] = [
  { x: 50, y: 100, text: "Results. Retrieval with" },
  { x: 50, y: 120, text: "smaller chunks raised" },
  { x: 50, y: 140, text: "recall from 0.61 to 0.83." },
  { x: 320, y: 100, text: "Cost rose 40% because" },
  { x: 320, y: 120, text: "more chunks are sent" },
  { x: 320, y: 140, text: "with every question." },
];

// an invoice table: the first item's description wraps onto a second line
export const TABLE = {
  header: ["Item", "Qty", "Unit", "Total"],
  rows: [
    ["Blue widget (large, ships in two boxes)", "2", "4.50", "9.00"],
    ["Cable", "10", "1.20", "12.00"],
  ],
};

// three pages of a report with the same header and a page-number footer
export const REPORT_PAGES = [1, 2, 3].map((n) => [
  "ACME Corp · Annual Report 2025",
  n === 1 ? "Revenue grew 12% to €48m." : n === 2 ? "Headcount reached 310." : "Outlook: margins stable.",
  `Page ${n} of 12`,
]);

export function plainOrder(boxes: Box[]) {
  // sort by line, then left to right: lines from both columns interleave
  return [...boxes].sort((a, b) => a.y - b.y || a.x - b.x).map((b) => b.text);
}

export function layoutOrder(boxes: Box[]) {
  // split into columns at the widest horizontal gap, then read each column down
  const xs = [...new Set(boxes.map((b) => b.x))].sort((a, b) => a - b);
  let cut = Infinity;
  let gap = 0;
  for (let i = 1; i < xs.length; i++) if (xs[i] - xs[i - 1] > gap) [gap, cut] = [xs[i] - xs[i - 1], xs[i]];
  const cols = gap > 100 ? [boxes.filter((b) => b.x < cut), boxes.filter((b) => b.x >= cut)] : [boxes];
  return cols.flatMap((c) => [...c].sort((a, b) => a.y - b.y).map((b) => b.text));
}

export function tablePlain() {
  // a text dump: cells joined by spaces, the wrapped description split over two lines
  const wrap = (s: string) => {
    const at = s.lastIndexOf(" ", 24);
    return s.length > 24 && at > 0 ? [s.slice(0, at), s.slice(at + 1)] : [s];
  };
  const lines: string[] = [TABLE.header.join(" ")];
  for (const r of TABLE.rows) {
    const [first, rest] = wrap(r[0]);
    lines.push([first, ...r.slice(1)].join(" "));
    if (rest) lines.push(rest);
  }
  return lines;
}

export function tableMarkdown() {
  const row = (r: string[]) => `| ${r.join(" | ")} |`;
  return [row(TABLE.header), row(TABLE.header.map(() => "---")), ...TABLE.rows.map(row)];
}

// a line that appears (numbers aside) on most pages is a header or footer
export function stripRepeated(pages: string[][]) {
  const norm = (s: string) => s.replace(/\d+/g, "#");
  const counts = new Map<string, number>();
  pages.forEach((p) => new Set(p.map(norm)).forEach((l) => counts.set(l, (counts.get(l) ?? 0) + 1)));
  const repeated = new Set([...counts].filter(([, n]) => n >= Math.ceil(pages.length / 2)).map(([l]) => l));
  return { kept: pages.map((p) => p.filter((l) => !repeated.has(norm(l)))), removed: [...repeated] };
}

export type Parser = "plain" | "layout" | "vision";
export const PARSERS: { id: Parser; label: string; centsPerPage: number; secPerPage: number }[] = [
  { id: "plain", label: "Plain text extraction", centsPerPage: 0, secPerPage: 0.02 },
  { id: "layout", label: "Layout-aware parser", centsPerPage: 0, secPerPage: 0.6 },
  { id: "vision", label: "Vision model per page", centsPerPage: 1.0, secPerPage: 4 },
];

export function parse(p: Parser) {
  const columns = p === "plain" ? plainOrder(TWO_COLUMN) : layoutOrder(TWO_COLUMN);
  const columnsOk = columns.join(" ") === layoutOrder(TWO_COLUMN).join(" ");
  const table = p === "plain" ? tablePlain() : tableMarkdown();
  const tableOk = p !== "plain";
  const report = p === "plain" ? { kept: REPORT_PAGES, removed: [] as string[] } : stripRepeated(REPORT_PAGES);
  const boilerplateOk = report.removed.length > 0;
  // a bar chart is an image: only a model that looks at the page can read its values
  const chart = p === "vision" ? "Revenue by quarter: Q1 €10.8m, Q2 €11.5m, Q3 €12.4m, Q4 €13.3m" : p === "layout" ? "[image: Figure 3]" : "";
  // vision models read layout well and occasionally misread a number (illustrative)
  const misread = p === "vision" ? "about one digit misread per 200 pages" : null;
  return { columns, columnsOk, table, tableOk, report, boilerplateOk, chart, chartOk: p === "vision", misread };
}

export const PAGES_PER_MONTH = 20000;
export function monthly(p: Parser) {
  const x = PARSERS.find((y) => y.id === p)!;
  return { dollars: (PAGES_PER_MONTH * x.centsPerPage) / 100, hours: Math.round((PAGES_PER_MONTH * x.secPerPage) / 360) / 10 };
}
