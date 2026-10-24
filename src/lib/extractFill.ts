// Extract and fill. Six sales emails are turned into CRM fields by a model, then written
// into a CRM that already holds three contacts, some fields set by a person. The model's
// extractions are illustrative; the grounding check, the date and amount parsing, record
// matching and the merge policy really run on them.

export type Field = "name" | "email" | "company" | "phone" | "amount" | "close";
export const FIELDS: Field[] = ["name", "email", "company", "phone", "amount", "close"];
type Value = string | number | null;
export type Locale = "US" | "UK" | "DE";

export type Email = {
  id: number;
  from: string;
  sent: string; // ISO date
  locale: Locale;
  body: string;
  model: Record<Field, { value: Value; quote: string | null }>; // what the model returned
  note: string;
};

const m = (value: Value, quote: string | null = typeof value === "string" ? value : null) => ({ value, quote });

export const EMAILS: Email[] = [
  {
    id: 1,
    from: "priya@northwind.io",
    sent: "2026-05-12",
    locale: "UK",
    body: "Hi, we'd now like to go ahead with the larger plan, around £32k, and sign by 03/07/2026.\nPriya Shah, Northwind · +44 20 7946 0000",
    model: { name: m("Priya Shah"), email: m("priya@northwind.io"), company: m("Northwind"), phone: m("+44 20 7946 0000"), amount: m(32000, "around £32k"), close: m("2026-03-07", "03/07/2026") },
    note: "UK date; an old phone in the signature",
  },
  {
    id: 2,
    from: "tom.becker@kranich.de",
    sent: "2026-05-12",
    locale: "DE",
    body: "We have a budget of €40.000 and want to decide by the end of June.\nTom Becker, Kranich GmbH, +49 30 1234567",
    model: { name: m("Tom Becker"), email: m("tom.becker@kranich.de"), company: m("Kranich GmbH"), phone: m("+49 30 1234567"), amount: m(40, "€40.000"), close: m("2026-06-30", "end of June") },
    note: "German number format",
  },
  {
    id: 3,
    from: "sam@quillco.com",
    sent: "2026-05-12",
    locale: "US",
    body: "Hey! Sam from Quill & Co here. Can you send pricing for 25 seats? We'd like to start this Friday.",
    model: { name: m("Sam Quill", "Sam from Quill"), email: m("sam@quillco.com"), company: m("Quill & Co"), phone: m(null), amount: m(2500, null), close: m("2024-06-14", "this Friday") },
    note: "a made-up surname and amount; a relative date",
  },
  {
    id: 4,
    from: "lena@brightpath.com",
    sent: "2026-05-13",
    locale: "US",
    body: "Quick update: legal approved, we can sign on 06/05/2026. Lena",
    model: { name: m("Lena"), email: m("lena@brightpath.com"), company: m(null), phone: m(null), amount: m(null), close: m("2026-06-05", "06/05/2026") },
    note: "a short note with most fields empty",
  },
  {
    id: 5,
    from: "j.okafor@harbor.co",
    sent: "2026-05-13",
    locale: "UK",
    body: "Hello, Jide Okafor from Harbor Logistics. We're comparing vendors; budget is roughly 1.2M over three years. Decision due 12/09/2026. Call me on 07700 900123.",
    model: { name: m("Jide Okafor"), email: m("j.okafor@harbor.co"), company: m("Harbor Logistics"), phone: m("07700 900123"), amount: m(1200000, "roughly 1.2M"), close: m("2026-12-09", "12/09/2026") },
    note: "a new lead, UK date",
  },
  {
    id: 6,
    from: "Tom.Becker@Kranich.de",
    sent: "2026-05-14",
    locale: "DE",
    body: "Correction: our budget is €45.000, not €40.000.",
    model: { name: m(null), email: m("Tom.Becker@Kranich.de"), company: m(null), phone: m(null), amount: m(45, "€45.000"), close: m(null) },
    note: "same person, address in capitals",
  },
];

type Cell = { value: Value; by: "person" | "automation" | null };
export type Contact = { key: number; fields: Record<Field, Cell> };

const cell = (value: Value, by: Cell["by"] = value === null ? null : "person"): Cell => ({ value, by });
const contact = (key: number, f: Record<Field, Value>, auto: Field[] = []): Contact => ({
  key,
  fields: Object.fromEntries(FIELDS.map((k) => [k, cell(f[k], f[k] === null ? null : auto.includes(k) ? "automation" : "person")])) as Record<Field, Cell>,
});

export const START: Contact[] = [
  contact(101, { name: "Priya Shah", email: "priya@northwind.io", company: "Northwind", phone: "+44 20 7946 0321", amount: 20000, close: "2026-06-30" }, ["amount", "close"]),
  contact(102, { name: "Tom Becker", email: "tom.becker@kranich.de", company: "Kranich GmbH", phone: null, amount: null, close: null }),
  contact(103, { name: "Lena Ortiz", email: "lena@brightpath.com", company: "BrightPath", phone: "+1 415 555 0142", amount: 15000, close: null }, ["phone"]),
];

// What the CRM should hold once all six emails are in.
export const EXPECTED: Record<string, Record<Field, Value>> = {
  "priya@northwind.io": { name: "Priya Shah", email: "priya@northwind.io", company: "Northwind", phone: "+44 20 7946 0321", amount: 32000, close: "2026-07-03" },
  "tom.becker@kranich.de": { name: "Tom Becker", email: "tom.becker@kranich.de", company: "Kranich GmbH", phone: "+49 30 1234567", amount: 45000, close: "2026-06-30" },
  "lena@brightpath.com": { name: "Lena Ortiz", email: "lena@brightpath.com", company: "BrightPath", phone: "+1 415 555 0142", amount: 15000, close: "2026-06-05" },
  "sam@quillco.com": { name: "Sam", email: "sam@quillco.com", company: "Quill & Co", phone: null, amount: null, close: "2026-05-15" },
  "j.okafor@harbor.co": { name: "Jide Okafor", email: "j.okafor@harbor.co", company: "Harbor Logistics", phone: "07700 900123", amount: 1200000, close: "2026-09-12" },
};

export type Merge = "overwrite" | "empty" | "careful";
export type Design = { ground: boolean; normalize: boolean; match: boolean; merge: Merge };
export const FIRST: Design = { ground: false, normalize: false, match: false, merge: "overwrite" };
export const FIXED: Design = { ground: true, normalize: true, match: true, merge: "careful" };

// ---- code that knows things the model doesn't: number formats, calendars, the sent date
export function parseAmount(quote: string, locale: Locale): number | null {
  const x = quote.match(/([\d][\d.,]*)\s*([kKmM])?/);
  if (!x) return null;
  const digits = locale === "DE" ? x[1].replace(/\./g, "").replace(",", ".") : x[1].replace(/,/g, "");
  const n = Number(digits) * (x[2] ? (x[2].toLowerCase() === "k" ? 1e3 : 1e6) : 1);
  return Number.isFinite(n) ? Math.round(n) : null;
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const iso = (y: number, mo: number, d: number) => `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export function parseDate(quote: string, sent: string, locale: Locale): string | null {
  const q = quote.toLowerCase();
  const [sy, sm, sd] = sent.split("-").map(Number);
  const slash = q.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) {
    const [a, b, y] = [Number(slash[1]), Number(slash[2]), Number(slash[3])];
    return locale === "US" ? iso(y, a, b) : iso(y, b, a);
  }
  const end = q.match(/end of (\w+)/);
  if (end && MONTHS.includes(end[1])) {
    const mo = MONTHS.indexOf(end[1]) + 1;
    const y = mo < sm ? sy + 1 : sy;
    return iso(y, mo, new Date(Date.UTC(y, mo, 0)).getUTCDate());
  }
  const day = DAYS.findIndex((dname) => q.includes(dname));
  if (day >= 0) {
    const base = new Date(Date.UTC(sy, sm - 1, sd));
    base.setUTCDate(base.getUTCDate() + ((day - base.getUTCDay() + 7) % 7));
    return base.toISOString().slice(0, 10);
  }
  return null;
}

const source = (e: Email) => `From: ${e.from}\n${e.body}`.toLowerCase();

// One email's extraction after the checks the design turns on.
export function prepare(e: Email, d: Design) {
  const out = {} as Record<Field, Value>;
  const flagged: { field: Field; why: string }[] = [];
  const invented: Field[] = [];
  for (const f of FIELDS) {
    const { value, quote } = e.model[f];
    if (value === null) {
      out[f] = null;
      continue;
    }
    const numericOrDate = f === "amount" || f === "close";
    const grounded = numericOrDate ? quote !== null && source(e).includes(quote.toLowerCase()) : source(e).includes(String(value).toLowerCase());
    if (!grounded) {
      if (d.ground) {
        out[f] = null;
        flagged.push({ field: f, why: numericOrDate ? "no quote from the email" : `“${value}” is not in the email` });
        continue;
      }
      invented.push(f);
    }
    if (numericOrDate && d.normalize && quote) {
      const parsed = f === "amount" ? parseAmount(quote, e.locale) : parseDate(quote, e.sent, e.locale);
      out[f] = parsed;
      continue;
    }
    out[f] = value;
  }
  return { values: out, flagged, invented };
}

const keyOf = (v: Value) => String(v ?? "").toLowerCase();

export function runAll(d: Design, upTo = EMAILS.length) {
  const crm: Contact[] = START.map((c) => ({ key: c.key, fields: { ...c.fields } }));
  let next = 201;
  const log: { email: number; action: string; record: number; changes: string[] }[] = [];
  let lostEdits = 0;
  let inventedWritten = 0;
  const flagged: { email: number; field: Field; why: string }[] = [];

  for (const e of EMAILS.slice(0, upTo)) {
    const p = prepare(e, d);
    p.flagged.forEach((f) => flagged.push({ email: e.id, ...f }));
    const found = d.match ? crm.find((c) => keyOf(c.fields.email.value) === keyOf(p.values.email)) : undefined;
    if (!found) {
      const c: Contact = { key: next++, fields: Object.fromEntries(FIELDS.map((f) => [f, cell(p.values[f], p.values[f] === null ? null : "automation")])) as Record<Field, Cell> };
      crm.push(c);
      inventedWritten += p.invented.length;
      log.push({ email: e.id, action: "created", record: c.key, changes: FIELDS.filter((f) => p.values[f] !== null) });
      continue;
    }
    const changes: string[] = [];
    for (const f of FIELDS) {
      const now = found.fields[f];
      const v = p.values[f];
      if (v === now.value) continue;
      const write =
        d.merge === "overwrite" ? true
        : d.merge === "empty" ? now.value === null && v !== null
        : v !== null && now.by !== "person";
      if (!write) continue;
      if (now.by === "person") lostEdits++;
      if (p.invented.includes(f)) inventedWritten++;
      found.fields[f] = cell(v, v === null ? null : "automation");
      changes.push(v === null ? `${f} blanked` : f);
    }
    log.push({ email: e.id, action: "updated", record: found.key, changes });
  }

  // score against what the CRM should hold
  let right = 0;
  let wrong = 0;
  let review = 0;
  const wrongCells: { record: number; field: Field; got: Value; want: Value }[] = [];
  let duplicates = 0;
  for (const [email, want] of Object.entries(EXPECTED)) {
    const matches = crm.filter((c) => keyOf(c.fields.email.value) === email);
    duplicates += Math.max(0, matches.length - 1);
    const c = matches[0];
    for (const f of FIELDS) {
      const got = c ? c.fields[f].value : null;
      if (got === want[f]) right++;
      else if (flagged.some((x) => x.field === f && keyOf(EMAILS.find((em) => em.id === x.email)!.from) === email)) review++;
      else {
        wrong++;
        wrongCells.push({ record: c?.key ?? 0, field: f, got, want: want[f] });
      }
    }
  }
  const total = Object.keys(EXPECTED).length * FIELDS.length;
  // every contact after the first with the same email is a duplicate
  const seen = new Set<string>();
  const duplicateKeys = new Set<number>();
  for (const c of crm) {
    const k = keyOf(c.fields.email.value);
    if (seen.has(k)) duplicateKeys.add(c.key);
    seen.add(k);
  }
  return { crm, log, right, wrong, review, wrongCells, flagged, total, duplicates, duplicateKeys, lostEdits, inventedWritten };
}
