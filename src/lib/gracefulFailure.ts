// When the model is wrong: receipt autofill in an expense app, for a trip to Leeds on
// 1–5 April 2026. Ten receipts: most read correctly, some misread with high or low
// confidence, one times out and one is unreadable. What the model returns is
// illustrative; the date rule, the outcome of each design and the timing really run,
// under the stated assumptions about what a person does.

export const TRIP = { from: "2026-04-01", to: "2026-04-05" };

type Kind = "ok" | "wrong" | "timeout" | "unreadable";
export type Receipt = {
  id: number;
  merchant: string;
  date: string; // what is printed, as ISO
  amount: string;
  kind: Kind;
  field?: "merchant" | "date" | "amount"; // the field the model is unsure of or gets wrong
  read?: string; // what the model put in that field
  conf: number; // the model's confidence in that field (or its lowest field)
  note: string;
};

export const RECEIPTS: Receipt[] = [
  { id: 1, merchant: "Pret A Manger", date: "2026-04-01", amount: "£8.40", kind: "ok", conf: 0.95, note: "Clear print." },
  { id: 2, merchant: "LNER", date: "2026-04-01", amount: "£86.20", kind: "ok", conf: 0.97, note: "Train ticket, clear." },
  { id: 3, merchant: "Premier Inn", date: "2026-04-04", amount: "£312.00", kind: "ok", conf: 0.93, note: "Hotel folio, clear." },
  { id: 4, merchant: "Uber", date: "2026-04-02", amount: "£14.75", kind: "ok", conf: 0.9, note: "App receipt." },
  { id: 5, merchant: "Pret A Manger", date: "2026-04-03", amount: "£6.10", kind: "ok", field: "merchant", read: "Pret A Manger", conf: 0.5, note: "Crumpled: read correctly, but the model is unsure." },
  { id: 6, merchant: "Caffè Nero", date: "2026-04-03", amount: "£4.20", kind: "wrong", field: "date", read: "2026-03-04", conf: 0.9, note: "Printed 03/04/26; read the American way as 4 March, and sure of it." },
  { id: 7, merchant: "Caffè Nero", date: "2026-04-02", amount: "£3.90", kind: "wrong", field: "merchant", read: "Caffè Hero", conf: 0.4, note: "Faded logo; the model guesses and knows it." },
  { id: 8, merchant: "Dishoom", date: "2026-04-02", amount: "£47.25", kind: "wrong", field: "amount", read: "£42.00", conf: 0.55, note: "Took the subtotal, not the total with service." },
  { id: 9, merchant: "Trainline", date: "2026-04-05", amount: "£91.60", kind: "timeout", conf: 0, note: "The model call times out after 30 s." },
  { id: 10, merchant: "Taxi", date: "2026-04-05", amount: "£22.00", kind: "unreadable", conf: 0, note: "A blurred photo; the model returns nothing." },
];

export type Options = { mark: boolean; source: boolean; rules: boolean; fallback: boolean };
export const NONE: Options = { mark: false, source: false, rules: false, fallback: false };
export const ALL: Options = { mark: true, source: true, rules: true, fallback: true };

// Seconds a person spends, by assumption.
export const SECONDS = { glance: 3, checkWithout: 15, checkWith: 4, fix: 10, manual: 60, deadEnd: 45 };
export const UNSURE = 0.7; // fields below this confidence are marked

export type Outcome = "auto" | "checked" | "fixed" | "wrongIn" | "manual" | "stuck";
export const OUTCOME_LABEL: Record<Outcome, string> = {
  auto: "filled, submitted",
  checked: "flagged, was fine",
  fixed: "flagged, corrected",
  wrongIn: "wrong, submitted",
  manual: "typed by hand",
  stuck: "stuck",
};

const inTrip = (iso: string) => iso >= TRIP.from && iso <= TRIP.to;

export function handle(r: Receipt, o: Options) {
  if (r.kind === "timeout" || r.kind === "unreadable") {
    return o.fallback ? { outcome: "manual" as Outcome, seconds: SECONDS.manual, why: "Opens the manual form with the photo beside it." } : { outcome: "stuck" as Outcome, seconds: SECONDS.deadEnd, why: "“Something went wrong. Try again.” Retrying fails the same way." };
  }
  const shownDate = r.field === "date" ? r.read! : r.date;
  const markedUnsure = o.mark && r.conf < UNSURE;
  const ruleFails = o.rules && !inTrip(shownDate);
  const flagged = markedUnsure || ruleFails;
  const check = o.source ? SECONDS.checkWith : SECONDS.checkWithout;
  if (!flagged) {
    return r.kind === "wrong" ? { outcome: "wrongIn" as Outcome, seconds: SECONDS.glance, why: "Nothing looked wrong, so it went in." } : { outcome: "auto" as Outcome, seconds: SECONDS.glance, why: "Filled and submitted." };
  }
  const reason = ruleFails ? `date ${shownDate} is outside the trip` : `${r.field} marked unsure (${Math.round(r.conf * 100)}%)`;
  return r.kind === "wrong" ? { outcome: "fixed" as Outcome, seconds: SECONDS.glance + check + SECONDS.fix, why: `Flagged: ${reason}; corrected.` } : { outcome: "checked" as Outcome, seconds: SECONDS.glance + check, why: `Flagged: ${reason}; it was right.` };
}

export function run(o: Options) {
  const rows = RECEIPTS.map((r) => ({ r, ...handle(r, o) }));
  const n = (k: Outcome) => rows.filter((x) => x.outcome === k).length;
  return { rows, seconds: rows.reduce((s, x) => s + x.seconds, 0), wrongIn: n("wrongIn"), stuck: n("stuck"), fixed: n("fixed"), falseAlarms: n("checked"), manual: n("manual") };
}
