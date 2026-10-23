// Case study: an invoice extractor for accounts payable. A month of 30,000 invoices
// arrives by email; fields are extracted, checked against the company's own data and
// either posted to the ERP or sent to a person. Invoices and model errors are seeded and
// illustrative; every check, count, hour and cost really runs.

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const PER_MONTH = 30_000;
export type ErrKind = "total" | "vendor" | "po" | "date" | "subtle";
export const ERR_LABEL: Record<ErrKind, string> = {
  total: "misread an amount",
  vendor: "picked the wrong supplier",
  po: "wrong or missing PO number",
  date: "swapped day and month",
  subtle: "wrong cost centre",
};

type Inv = { scan: boolean; dup: boolean; u: number; kind: ErrKind; reviewerCatches: boolean };
export const INVOICES: Inv[] = (() => {
  const r = mulberry32(31);
  return Array.from({ length: PER_MONTH }, () => {
    const scan = r() < 0.3;
    const dup = r() < 0.015;
    const u = r();
    const k = r();
    const kind: ErrKind = k < 0.3 ? "total" : k < 0.5 ? "vendor" : k < 0.7 ? "po" : k < 0.85 ? "date" : "subtle";
    return { scan, dup, u, kind, reviewerCatches: r() < 0.9 };
  });
})();

export type ModelId = "small" | "large";
export const MODELS: { id: ModelId; label: string; errRate: number; pricePerMIn: number; pricePerMOut: number }[] = [
  { id: "small", label: "Small model", errRate: 0.06, pricePerMIn: 0.3, pricePerMOut: 1.2 },
  { id: "large", label: "Large model", errRate: 0.025, pricePerMIn: 3, pricePerMOut: 15 },
];
const SCAN_EXTRA = 0.04; // OCR adds misreads
const TOKENS_IN = 3_200; // two pages of text and the prompt
const TOKENS_OUT = 400;
const OCR_PER_INVOICE = 0.003; // two pages at $1.50 per 1,000

export type Checks = { dedupe: boolean; sums: boolean; vendor: boolean; po: boolean };
export type Review = "flagged" | "all";
export type Design = { model: ModelId; checks: Checks; review: Review };

// Which check notices which error.
const CATCHES: Record<ErrKind, keyof Checks | null> = { total: "sums", date: "sums", vendor: "vendor", po: "po", subtle: null };
export const MIN = { flagged: 3, glance: 1.5 };

export type Outcome = "posted" | "fixed" | "wrongPosted" | "duplicatePaid" | "duplicateCaught";

export function process(inv: Inv, d: Design) {
  const m = MODELS.find((x) => x.id === d.model)!;
  if (inv.dup) {
    if (d.checks.dedupe) return { outcome: "duplicateCaught" as Outcome, minutes: MIN.flagged };
    if (d.review === "all") return inv.reviewerCatches ? { outcome: "duplicateCaught" as Outcome, minutes: MIN.glance } : { outcome: "duplicatePaid" as Outcome, minutes: MIN.glance };
    return { outcome: "duplicatePaid" as Outcome, minutes: 0 };
  }
  const wrong = inv.u < m.errRate + (inv.scan ? SCAN_EXTRA : 0);
  const check = wrong ? CATCHES[inv.kind] : null;
  const flagged = wrong && check !== null && d.checks[check];
  if (flagged) return { outcome: "fixed" as Outcome, minutes: MIN.flagged };
  if (d.review === "all") return wrong ? (inv.reviewerCatches ? { outcome: "fixed" as Outcome, minutes: MIN.glance + MIN.flagged } : { outcome: "wrongPosted" as Outcome, minutes: MIN.glance }) : { outcome: "posted" as Outcome, minutes: MIN.glance };
  return wrong ? { outcome: "wrongPosted" as Outcome, minutes: 0 } : { outcome: "posted" as Outcome, minutes: 0 };
}

export function month(d: Design) {
  const m = MODELS.find((x) => x.id === d.model)!;
  const rows = INVOICES.map((inv) => process(inv, d));
  const n = (k: Outcome) => rows.filter((x) => x.outcome === k).length;
  const touchless = rows.filter((x) => x.minutes === 0).length;
  const modelCost = PER_MONTH * ((TOKENS_IN * m.pricePerMIn + TOKENS_OUT * m.pricePerMOut) / 1e6);
  const ocrCost = INVOICES.filter((i) => i.scan).length * OCR_PER_INVOICE;
  return {
    posted: n("posted"),
    fixed: n("fixed"),
    wrongPosted: n("wrongPosted"),
    duplicatePaid: n("duplicatePaid"),
    duplicateCaught: n("duplicateCaught"),
    touchless,
    hours: rows.reduce((s, x) => s + x.minutes, 0) / 60,
    cost: modelCost + ocrCost,
  };
}

export const NONE: Checks = { dedupe: false, sums: false, vendor: false, po: false };
export const ALL: Checks = { dedupe: true, sums: true, vendor: true, po: true };
export const MANUAL_HOURS = (PER_MONTH * 6) / 60; // keying an invoice by hand: about 6 minutes
export const REVIEWER_RATE = 40; // $ an hour, loaded
export const SCANS = INVOICES.filter((i) => i.scan).length;
export const DUPLICATES = INVOICES.filter((i) => i.dup).length;
