// Extracting fields from documents. A model reads an invoice, a résumé or a contract
// and returns each field as written, with the quote it came from. Code then does what
// code is good at: converting formats, checking the quote is really in the text, and
// checking fields against each other. The model's answers are illustrative; the
// conversions and every check below really run.

export type DocId = "invoice" | "resume" | "contract";
type FieldType = "text" | "name" | "date" | "money" | "int" | "email";

type Out = { raw: string | null; quote?: string; iso?: string | null };
type Field = {
  key: string;
  label: string;
  type: FieldType;
  truth: string | null; // in canonical form
  out: Out; // with each field described and "null when absent"
  loose?: Out; // what the model returns from bare field names, when different
};
type Check = { name: string; fields: string[]; pass: (v: Record<string, string | null>) => boolean };

export type Doc = { id: DocId; label: string; text: string; fields: Field[]; checks: Check[] };

const num = (s: string | null) => (s === null ? NaN : Number(s));
const addMonthsMinusDay = (iso: string, months: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + months, d) - 86_400_000);
  return t.toISOString().slice(0, 10);
};

export const DOCS: Doc[] = [
  {
    id: "invoice",
    label: "Invoice",
    text: `NORDWIND GmbH · Hafenstraße 12 · 20457 Hamburg
INVOICE  No. RE-2026-0412
Date: 03.03.2026        Due: 02.04.2026
Bill to: Optimal Lab Ltd, 4 King St, London

Item               Qty   Unit        Amount
Standing desks       4   €312,50   €1.250,00
Monitor arms         8    €43,75     €350,00
Delivery             1    €80,00      €80,00
Subtotal                           €1.680,00
VAT 19%                              €319,20
Total due                          €1.999,20`,
    fields: [
      { key: "supplier", label: "Supplier", type: "text", truth: "NORDWIND GmbH", out: { raw: "NORDWIND GmbH" } },
      { key: "number", label: "Invoice number", type: "text", truth: "RE-2026-0412", out: { raw: "RE-2026-0412" } },
      { key: "issued", label: "Invoice date", type: "date", truth: "2026-03-03", out: { raw: "03.03.2026", iso: "2026-03-03" }, loose: { raw: "02.04.2026", iso: "2026-04-02" } },
      { key: "due", label: "Due date", type: "date", truth: "2026-04-02", out: { raw: "02.04.2026", iso: "2026-02-04" } },
      { key: "desks", label: "Line: desks", type: "money", truth: "1250.00", out: { raw: "€1.250,00", iso: "1250.00" } },
      { key: "arms", label: "Line: monitor arms", type: "money", truth: "350.00", out: { raw: "€850,00", iso: "850.00" } },
      { key: "delivery", label: "Line: delivery", type: "money", truth: "80.00", out: { raw: "€80,00", iso: "80.00" } },
      { key: "subtotal", label: "Subtotal", type: "money", truth: "1680.00", out: { raw: "€1.680,00", iso: "1680.00" } },
      { key: "vat", label: "VAT", type: "money", truth: "319.20", out: { raw: "€319,20", iso: "319.20" } },
      { key: "total", label: "Total", type: "money", truth: "1999.20", out: { raw: "€1.999,20", iso: "1999.20" } },
      { key: "po", label: "PO number", type: "text", truth: null, out: { raw: null }, loose: { raw: "PO-7731" } },
    ],
    checks: [
      { name: "lines add up to the subtotal", fields: ["desks", "arms", "delivery", "subtotal"], pass: (v) => Math.abs(num(v.desks) + num(v.arms) + num(v.delivery) - num(v.subtotal)) < 0.005 },
      { name: "VAT is 19% of the subtotal", fields: ["subtotal", "vat"], pass: (v) => Math.abs(Math.round(num(v.subtotal) * 19) / 100 - num(v.vat)) < 0.005 },
      { name: "subtotal + VAT = total", fields: ["subtotal", "vat", "total"], pass: (v) => Math.abs(num(v.subtotal) + num(v.vat) - num(v.total)) < 0.005 },
      { name: "due date is after the invoice date", fields: ["issued", "due"], pass: (v) => (v.issued ?? "") < (v.due ?? "") },
    ],
  },
  {
    id: "resume",
    label: "Résumé",
    text: `PRIYA NAIR
Bristol, UK · priya.nair@example.com · +44 7700 900123

EXPERIENCE
Senior Data Engineer, Kestrel Analytics     Jun 2021 – present
Data Engineer, Brightline Retail            Sep 2017 – May 2021

EDUCATION
MSc Computer Science, University of Leeds

SKILLS
Python, Spark, Airflow, dbt, PostgreSQL`,
    fields: [
      { key: "name", label: "Name", type: "name", truth: "Priya Nair", out: { raw: "PRIYA NAIR", iso: "Priya Nair" } },
      { key: "email", label: "Email", type: "email", truth: "priya.nair@example.com", out: { raw: "priya.nair@example.com" } },
      { key: "title", label: "Current title", type: "text", truth: "Senior Data Engineer", out: { raw: "Senior Data Engineer" } },
      { key: "employer", label: "Current employer", type: "text", truth: "Kestrel Analytics", out: { raw: "Kestrel Analytics" }, loose: { raw: "Brightline Retail" } },
      { key: "start", label: "Current role since", type: "date", truth: "2021-06", out: { raw: "Jun 2021", iso: "2021-06" } },
      { key: "prevEnd", label: "Previous role until", type: "date", truth: "2021-05", out: { raw: "May 2021", iso: "2021-05" } },
      { key: "firstJob", label: "First role since", type: "date", truth: "2017-09", out: { raw: "Sep 2017", iso: "2017-09" } },
      { key: "degree", label: "Degree", type: "text", truth: "MSc Computer Science", out: { raw: "MSc Computer Science" } },
      { key: "gradYear", label: "Graduation year", type: "int", truth: null, out: { raw: "2016", iso: "2016" } },
      { key: "skills", label: "Skills", type: "text", truth: "Python, Spark, Airflow, dbt, PostgreSQL", out: { raw: "Python, Spark, Airflow, dbt, PostgreSQL" } },
    ],
    checks: [
      { name: "previous role ends before the current one starts", fields: ["prevEnd", "start"], pass: (v) => (v.prevEnd ?? "") < (v.start ?? "") },
      { name: "email is a valid address", fields: ["email"], pass: (v) => /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(v.email ?? "") },
      { name: "graduation comes before the first role", fields: ["gradYear", "firstJob"], pass: (v) => v.gradYear === null || Number(v.gradYear) <= Number((v.firstJob ?? "").slice(0, 4)) },
    ],
  },
  {
    id: "contract",
    label: "Contract",
    text: `SERVICES AGREEMENT
Between Halden Logistics AS ("Client") and Optimal Lab Ltd ("Provider").

1. Term. This Agreement starts on 1 February 2026 and runs for 24 months.
2. Fees. The Client pays £18,500 per month, invoiced monthly in arrears.
3. Renewal. It renews for further 12-month terms unless either party gives 90 days' written notice before the end of the current term.
4. Liability. Each party's total liability is capped at the fees paid in the 12 months before the claim.
5. Governing law. England and Wales.`,
    fields: [
      { key: "client", label: "Client", type: "text", truth: "Halden Logistics AS", out: { raw: "Halden Logistics AS" }, loose: { raw: "Optimal Lab Ltd" } },
      { key: "provider", label: "Provider", type: "text", truth: "Optimal Lab Ltd", out: { raw: "Optimal Lab Ltd" }, loose: { raw: "Halden Logistics AS" } },
      { key: "startDate", label: "Start date", type: "date", truth: "2026-02-01", out: { raw: "1 February 2026", iso: "2026-02-01" } },
      { key: "term", label: "Term (months)", type: "int", truth: "24", out: { raw: "24 months", iso: "24" } },
      { key: "endDate", label: "End date", type: "date", truth: "2028-01-31", out: { raw: "1 February 2028", quote: "runs for 24 months", iso: "2028-02-01" } },
      { key: "fee", label: "Monthly fee", type: "money", truth: "18500.00", out: { raw: "£18,500", iso: "18500.00" } },
      { key: "notice", label: "Notice to stop renewal (days)", type: "int", truth: "90", out: { raw: "30 days", quote: "30 days' written notice", iso: "30" } },
      { key: "law", label: "Governing law", type: "text", truth: "England and Wales", out: { raw: "England and Wales" } },
    ],
    checks: [{ name: "end date = start date + term − 1 day", fields: ["startDate", "term", "endDate"], pass: (v) => !!v.startDate && v.endDate === addMonthsMinusDay(v.startDate, Number(v.term)) }],
  },
];

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const p2 = (n: number | string) => String(n).padStart(2, "0");

// Code turns what was written into one canonical form. Returns null when it can't.
export function normalize(type: FieldType, raw: string | null): string | null {
  if (raw === null) return null;
  const s = raw.trim();
  if (type === "date") {
    let m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/); // day.month.year, as written in Germany
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    m = s.match(/^(\d{1,2}) ([A-Za-z]+) (\d{4})$/);
    if (m && MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()) >= 0) return `${m[3]}-${p2(MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()) + 1)}-${p2(m[1])}`;
    m = s.match(/^([A-Za-z]{3}) (\d{4})$/);
    if (m && MONTHS.indexOf(m[1].toLowerCase()) >= 0) return `${m[2]}-${p2(MONTHS.indexOf(m[1].toLowerCase()) + 1)}`;
    return /^\d{4}-\d{2}(-\d{2})?$/.test(s) ? s : null;
  }
  if (type === "money") {
    const bare = s.replace(/[^\d.,-]/g, "");
    const n = /,\d{2}$/.test(bare) ? Number(bare.replace(/\./g, "").replace(",", ".")) : Number(bare.replace(/,/g, ""));
    return Number.isFinite(n) ? n.toFixed(2) : null;
  }
  if (type === "int") {
    const m = s.match(/\d+/);
    return m ? String(Number(m[0])) : null;
  }
  if (type === "name") return s === s.toUpperCase() ? s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : s;
  return s;
}

export type Options = { describe: boolean; quotes: boolean; checks: boolean };
export type Status = "saved" | "review" | "silent";
export type FieldResult = { field: Field; raw: string | null; quote: string | null; value: string | null; right: boolean; quoteFound: boolean | null; failed: string[]; status: Status };

export function extract(doc: Doc, o: Options) {
  const pre = doc.fields.map((f) => {
    const out = !o.describe && f.loose ? f.loose : f.out;
    const quote = out.raw === null ? null : (out.quote ?? out.raw);
    // without code checks, the model's own conversion is stored; with them, code converts the quote's value
    const value = o.checks ? normalize(f.type, out.raw) : out.raw === null ? null : (out.iso ?? out.raw);
    return { field: f, raw: out.raw, quote, value };
  });
  const values = Object.fromEntries(pre.map((r) => [r.field.key, r.value]));
  const failedChecks = o.checks ? doc.checks.filter((c) => !c.pass(values)) : [];
  const results: FieldResult[] = pre.map((r) => {
    const quoteFound = r.quote === null ? null : doc.text.includes(r.quote);
    const failed = failedChecks.filter((c) => c.fields.includes(r.field.key)).map((c) => c.name);
    const right = r.value === r.field.truth;
    const flagged = (o.quotes && quoteFound === false) || failed.length > 0;
    return { ...r, right, quoteFound, failed, status: flagged ? "review" : right ? "saved" : "silent" };
  });
  return {
    results,
    checks: doc.checks.map((c) => ({ name: c.name, ran: o.checks, pass: c.pass(values) })),
    saved: results.filter((r) => r.status === "saved").length,
    review: results.filter((r) => r.status === "review").length,
    silent: results.filter((r) => r.status === "silent").length,
    wrong: results.filter((r) => !r.right).length,
  };
}

export const ALL_ON: Options = { describe: true, quotes: true, checks: true };
export const ALL_OFF: Options = { describe: false, quotes: false, checks: false };
