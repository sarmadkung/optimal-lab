// Spreadsheets and CRMs. A shared sheet of leads is written by two workflows (a form
// that appends new leads, and a CRM sync that updates them) and edited by people, who
// sort it and insert a column. The sheet, the edits, the two ways of writing each thing,
// the Sheets-style value parsing and the scoring all run here.

export type Cell = string | number;
export type Sheet = Cell[][]; // row 0 holds the headers

export const HEADERS = ["Lead ID", "Company", "Email", "Phone", "Zip", "Status"];
const START: Sheet = [
  HEADERS,
  ["L1", "Northwind", "priya@northwind.io", "+44 20 7946 0321", "EC1A 1BB", "New"],
  ["L2", "Kranich GmbH", "tom@kranich.de", "+49 30 1234567", "10115", "New"],
  ["L3", "BrightPath", "lena@brightpath.com", "+1 415 555 0142", "94107", "Contacted"],
  ["L4", "Acme Tools", "ops@acmetools.example", "+1 212 555 0100", "10001", "New"],
  ["L5", "Harbor Logistics", "jide@harbor.co", "07700 900123", "SW1A 1AA", "Qualified"],
  ["L6", "Quill & Co", "sam@quillco.com", "+1 617 555 0199", "02134", "New"],
];

// two form submissions arrive in the same second
export const NEW_LEADS: string[][] = [
  ["L7", "Delta Farms", "ana@deltafarms.example", "+1 503 555 0188", "97201", "New"],
  ["L8", "Evergreen Dental", "raj@evergreen.example", "02079460000", "02108", "New"],
];
// the CRM sync, later that night: what changed in the CRM
export const CRM_CHANGES: { id: string; field: string; value: string }[] = [
  { id: "L2", field: "Status", value: "Won" },
  { id: "L6", field: "Status", value: "Lost" },
  { id: "L7", field: "Status", value: "Contacted" },
  { id: "L8", field: "Phone", value: "02079460001" },
  { id: "L8", field: "Status", value: "Contacted" },
];
export const NIGHTLY_ROWS = 300; // the real sync touches this many rows a night
export const QUOTA_PER_MIN = 60; // write requests a minute

export type Design = { append: boolean; byId: boolean; byHeader: boolean; raw: boolean; batch: boolean };
export const FIRST: Design = { append: false, byId: false, byHeader: false, raw: false, batch: false };
export const FIXED: Design = { append: true, byId: true, byHeader: true, raw: true, batch: true };

// what a spreadsheet does with a value written "as if typed"
export function asTyped(v: string): Cell {
  if (/^\d+$/.test(v)) return Number(v); // drops leading zeros
  const md = v.match(/^(\d{1,2})[-/](\d{1,2})$/);
  if (md) return `2026-${md[1].padStart(2, "0")}-${md[2].padStart(2, "0")}`; // read as a date
  return v;
}

const clone = (s: Sheet) => s.map((r) => [...r]);
export const col = (i: number) => String.fromCharCode(65 + i);

export type Step = { title: string; sheet: Sheet; notes: string[] };

export function run(d: Design) {
  let sheet = clone(START);
  const steps: Step[] = [];
  const write = (v: string): Cell => (d.raw ? v : asTyped(v));
  const rowOf: Record<string, number> = {};
  sheet.slice(1).forEach((r, i) => (rowOf[String(r[0])] = i + 1));

  // 1. two runs add a lead each, at the same moment
  const n1: string[] = [];
  if (d.append) {
    for (const lead of NEW_LEADS) {
      sheet.push(lead.map(write));
      rowOf[lead[0]] = sheet.length - 1;
    }
    n1.push("Each run calls append; the sheet adds both rows one after the other.");
  } else {
    const lastSeen = sheet.length - 1; // both runs read the last row at the same time
    for (const lead of NEW_LEADS) {
      sheet[lastSeen + 1] = lead.map(write);
      rowOf[lead[0]] = lastSeen + 1;
    }
    n1.push(`Both runs read “last row is ${lastSeen + 1}” and write row ${lastSeen + 2}: ${NEW_LEADS[1][0]} overwrites ${NEW_LEADS[0][0]}.`);
  }
  if (!d.raw) n1.push(`Written as typed: ${NEW_LEADS[1][3]} becomes ${asTyped(NEW_LEADS[1][3])} and zip ${NEW_LEADS[1][4]} becomes ${asTyped(NEW_LEADS[1][4])}.`);
  steps.push({ title: "Append two new leads", sheet: clone(sheet), notes: n1 });

  // 2. a person sorts by company
  const body = sheet.slice(1).sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  sheet = [sheet[0], ...body];
  steps.push({ title: "A person sorts by company", sheet: clone(sheet), notes: ["Rows move; the row numbers the workflow saved don't."] });

  // 3. a person inserts an Owner column after Company
  sheet = sheet.map((r, i) => [r[0], r[1], i === 0 ? "Owner" : "", ...r.slice(2)]);
  steps.push({ title: "A person inserts an Owner column", sheet: clone(sheet), notes: ["Email, Phone, Zip and Status each move one column right."] });

  // 4. the CRM sync writes its changes
  const n4: string[] = [];
  for (const c of CRM_CHANGES) {
    const r = d.byId ? sheet.findIndex((row, i) => i > 0 && row[0] === c.id) : rowOf[c.id];
    const ci = d.byHeader ? sheet[0].indexOf(c.field) : HEADERS.indexOf(c.field);
    if (r < 0 || r >= sheet.length) {
      n4.push(`${c.id}: not found`);
      continue;
    }
    const before = sheet[r][ci];
    sheet[r][ci] = write(c.value);
    const hit = `${col(ci)}${r + 1}`;
    if (sheet[r][0] !== c.id || sheet[0][ci] !== c.field) n4.push(`${c.id} ${c.field} → wrote ${hit}, which is ${sheet[r][0]}'s ${sheet[0][ci]} (was “${before}”)`);
  }
  if (!n4.length) n4.push("Every change landed in its own lead's row and column.");
  steps.push({ title: "The CRM sync writes changes", sheet: clone(sheet), notes: n4 });

  // the sheet it should be: append both, sort, insert, apply changes by id and header, as text
  const want = expected();
  let wrongCells = 0;
  const lost: string[] = [];
  const wrong: { id: string; field: string; got: Cell; want: Cell }[] = [];
  for (const row of want.slice(1)) {
    const got = sheet.find((r, i) => i > 0 && r[0] === row[0]);
    if (!got) {
      lost.push(String(row[0]));
      continue;
    }
    for (let i = 0; i < row.length; i++) {
      const h = String(want[0][i]);
      const gi = sheet[0].indexOf(h);
      const g = gi < 0 ? undefined : got[gi];
      if (String(g) !== String(row[i])) {
        wrongCells++;
        wrong.push({ id: String(row[0]), field: h, got: g ?? "—", want: row[i] });
      }
    }
  }
  const calls = d.batch ? 1 : NIGHTLY_ROWS * 2;
  const minutes = d.batch ? 0 : Math.ceil(calls / QUOTA_PER_MIN);
  return { steps, sheet, want, lost, wrongCells, wrong, calls, minutes, rejected: d.batch ? 0 : Math.max(0, calls - QUOTA_PER_MIN) };
}

function expected(): Sheet {
  let s = clone(START);
  NEW_LEADS.forEach((l) => s.push([...l]));
  s = [s[0], ...s.slice(1).sort((a, b) => String(a[1]).localeCompare(String(b[1])))];
  s = s.map((r, i) => [r[0], r[1], i === 0 ? "Owner" : "", ...r.slice(2)]);
  for (const c of CRM_CHANGES) {
    const r = s.findIndex((row, i) => i > 0 && row[0] === c.id);
    s[r][s[0].indexOf(c.field)] = c.value;
  }
  return s;
}
