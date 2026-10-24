// Case study: invoice to accounting. A month of 2,000 supplier invoices, already
// extracted, must be matched to purchase orders and goods receipts and booked in the
// ERP for payment. The invoices and their problems are seeded; matching, tolerances,
// duplicate detection, period handling, idempotent booking, the clerk's queue and the
// money paid out run here.

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x6d2b79f5) >>> 0) / 2 ** 32);
}

export type Issue = "clean" | "rounding" | "overcharge" | "unreceived" | "duplicate" | "dupFormatted" | "noPO" | "closedPeriod" | "retryTimeout";
export const ISSUE_LABEL: Record<Issue, string> = {
  clean: "matches PO and receipt",
  rounding: "price within 2% of the PO (freight, rounding)",
  overcharge: "price 3–12% over the PO",
  unreceived: "billed for more than was received",
  duplicate: "sent twice, same number",
  dupFormatted: "sent twice, number written differently",
  noPO: "no purchase order",
  closedPeriod: "dated in last month, which is closed",
  retryTimeout: "the ERP times out after booking it",
};
const MIX: [Issue, number][] = [
  ["clean", 1680],
  ["rounding", 80],
  ["overcharge", 30],
  ["unreceived", 50],
  ["duplicate", 15],
  ["dupFormatted", 25],
  ["noPO", 60],
  ["closedPeriod", 40],
  ["retryTimeout", 20],
];

export type Invoice = { id: number; issue: Issue; amount: number; excess: number; overPct: number };
export const MONTH: Invoice[] = (() => {
  const r = rng(3);
  const out: Invoice[] = [];
  let id = 0;
  for (const [issue, n] of MIX) {
    for (let i = 0; i < n; i++) {
      const amount = Math.round(200 + r() * 2800);
      const overPct = issue === "rounding" ? r() * 2 : issue === "overcharge" ? 3 + r() * 9 : 0;
      const excess = issue === "overcharge" || issue === "rounding" ? Math.round((amount * overPct) / (100 + overPct)) : issue === "unreceived" ? Math.round(amount * (0.2 + r() * 0.4)) : 0;
      out.push({ id: ++id, issue, amount, excess, overPct: Math.round(overPct * 10) / 10 });
    }
  }
  return out;
})();

export type Match = "none" | "two" | "three";
export type Dup = "off" | "exact" | "normalized";
export type Design = { match: Match; tolerance: number; dup: Dup; period: boolean; idempotent: boolean };
export const FIRST: Design = { match: "none", tolerance: 0, dup: "off", period: false, idempotent: false };
export const FIXED: Design = { match: "three", tolerance: 2, dup: "normalized", period: true, idempotent: true };
export const TOLERANCES = [0, 2, 5];
export const CLERK_MIN = 8;
export const LATE_FEE = 25;

export type Fate = "booked" | "clerk" | "stuck";
export type Result = { inv: Invoice; fate: Fate; paid: number; overpaid: number; why: string };

// normalise an invoice number: "INV-0042", "inv 42" and "42" are the same invoice
export const normalizeNumber = (s: string) => s.toUpperCase().replace(/^INV[-\s]*/, "").replace(/^0+/, "");

export function route(inv: Invoice, d: Design): Result {
  const book = (why: string, overpaid = 0, times = 1): Result => ({ inv, fate: "booked", paid: inv.amount * times, overpaid, why });
  const clerk = (why: string): Result => ({ inv, fate: "clerk", paid: 0, overpaid: 0, why });

  if (inv.issue === "duplicate" || inv.issue === "dupFormatted") {
    const caught = d.dup === "normalized" || (d.dup === "exact" && inv.issue === "duplicate");
    if (caught) return { inv, fate: "booked", paid: 0, overpaid: 0, why: "recognised as a copy of an invoice already booked; not paid again" };
    return book(inv.issue === "dupFormatted" ? `“INV-00${inv.id}” and “${inv.id}” look different to an exact check: paid twice` : "nobody checks for duplicates: paid twice", inv.amount);
  }
  if (inv.issue === "noPO") return d.match === "none" ? book("booked with no purchase order and no approver") : clerk("no purchase order to match: sent for approval");
  if (inv.issue === "overcharge" || inv.issue === "rounding") {
    if (d.match === "none") return book(`price ${inv.overPct}% over the PO, paid in full`, inv.issue === "overcharge" ? inv.excess : 0);
    if (inv.overPct <= d.tolerance) return book(`within the ${d.tolerance}% tolerance`, inv.issue === "overcharge" ? inv.excess : 0);
    return clerk(`price ${inv.overPct}% over the PO`);
  }
  if (inv.issue === "unreceived") {
    if (d.match === "three") return clerk("goods receipt shows fewer items than billed: held");
    return book(d.match === "two" ? "matches the PO, but the goods never all arrived: paid in full" : "paid for goods that never all arrived", inv.excess);
  }
  if (inv.issue === "closedPeriod") {
    if (d.period) return book("posted to the current open period, with the invoice date kept");
    return { inv, fate: "stuck", paid: 0, overpaid: 0, why: "the ERP refuses postings to a closed period; the run fails every night and a late fee follows" };
  }
  if (inv.issue === "retryTimeout") {
    if (d.idempotent) return book("the retry carries the same booking key; the ERP returns the first booking");
    return book("the ERP booked it, timed out, and the retry booked it again", inv.amount, 2);
  }
  return book("matched and booked");
}

export function runMonth(d: Design) {
  const results = MONTH.map((i) => route(i, d));
  const n = (f: Fate) => results.filter((x) => x.fate === f).length;
  return {
    results,
    booked: n("booked"),
    clerk: n("clerk"),
    stuck: n("stuck"),
    overpaid: results.reduce((a, x) => a + x.overpaid, 0),
    clerkHours: Math.round((n("clerk") * CLERK_MIN) / 6) / 10,
    lateFees: n("stuck") * LATE_FEE,
    unapproved: results.filter((x) => x.inv.issue === "noPO" && x.fate === "booked").length,
    byIssue: MIX.map(([issue]) => {
      const rs = results.filter((x) => x.inv.issue === issue);
      return { issue, count: rs.length, booked: rs.filter((x) => x.fate === "booked").length, clerk: rs.filter((x) => x.fate === "clerk").length, stuck: rs.filter((x) => x.fate === "stuck").length, overpaid: rs.reduce((a, x) => a + x.overpaid, 0), why: rs[0].why };
    }),
  };
}
