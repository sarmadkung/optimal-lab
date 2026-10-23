// Undo, edit and regenerate. An AI "tidy up contacts" action proposes seven changes to
// a small CRM table; two are wrong (it merges two different people and "fixes" a valid
// email). Afterwards you edit a row yourself, then notice the mistakes. The table, the
// operation log, the inverses and the conflict check really run.

export type Row = { id: string; name: string; email: string; company: string; alt?: string };
export type Table = Record<string, Row>;

export const ORIGINAL: Table = {
  r1: { id: "r1", name: "ana lopez", email: "ana@brightwell.io", company: "Brightwell" },
  r2: { id: "r2", name: "Ben Ito", email: "BEN.ITO@GMAIL.COM", company: "-" },
  r3: { id: "r3", name: "Chloe Martin", email: "chloe@halden.no", company: "Halden" },
  r4: { id: "r4", name: "Chloé Martin", email: "c.martin@nordwind.de", company: "Nordwind" },
  r5: { id: "r5", name: "dev patel", email: "dev@optimallab.dev", company: "optimal lab" },
  r6: { id: "r6", name: "Eve Stone", email: "eve@stone.studio", company: "Stone Studio" },
};
export const ROW_IDS = Object.keys(ORIGINAL);
type Field = "name" | "email" | "company" | "alt";

export type Op = { kind: "set"; row: string; field: Field; from: string | undefined; to: string | undefined } | { kind: "delete"; row: string; snapshot: Row } | { kind: "insert"; row: string; snapshot: Row };
export type Change = { id: string; by: "ai" | "you"; label: string; ok: boolean; ops: Op[] };

export const PROPOSAL: Change[] = [
  { id: "c1", by: "ai", label: "Capitalise “ana lopez”", ok: true, ops: [{ kind: "set", row: "r1", field: "name", from: "ana lopez", to: "Ana Lopez" }] },
  { id: "c2", by: "ai", label: "Lower-case Ben's email", ok: true, ops: [{ kind: "set", row: "r2", field: "email", from: "BEN.ITO@GMAIL.COM", to: "ben.ito@gmail.com" }] },
  { id: "c3", by: "ai", label: "Clear Ben's company “-”", ok: true, ops: [{ kind: "set", row: "r2", field: "company", from: "-", to: "" }] },
  {
    id: "c4",
    by: "ai",
    label: "Merge the two Chloe Martins",
    ok: false,
    ops: [
      { kind: "set", row: "r3", field: "alt", from: undefined, to: "c.martin@nordwind.de" },
      { kind: "delete", row: "r4", snapshot: ORIGINAL.r4 },
    ],
  },
  { id: "c5", by: "ai", label: "Capitalise “dev patel”", ok: true, ops: [{ kind: "set", row: "r5", field: "name", from: "dev patel", to: "Dev Patel" }] },
  { id: "c6", by: "ai", label: "Capitalise “optimal lab”", ok: true, ops: [{ kind: "set", row: "r5", field: "company", from: "optimal lab", to: "Optimal Lab" }] },
  { id: "c7", by: "ai", label: "“Fix” Eve's email domain", ok: false, ops: [{ kind: "set", row: "r6", field: "email", from: "eve@stone.studio", to: "eve@stone.studio.com" }] },
];
// What you do by hand after the AI change has gone in.
export const YOUR_EDIT: Change = { id: "u1", by: "you", label: "You rename Halden to Halden Logistics", ok: true, ops: [{ kind: "set", row: "r3", field: "company", from: "Halden", to: "Halden Logistics" }] };

const clone = (t: Table): Table => Object.fromEntries(Object.entries(t).map(([k, v]) => [k, { ...v }]));

export function apply(t: Table, op: Op): Table {
  const n = clone(t);
  if (op.kind === "set") {
    if (!n[op.row]) return n;
    if (op.to === undefined) delete n[op.row][op.field];
    else n[op.row][op.field] = op.to;
  } else if (op.kind === "delete") delete n[op.row];
  else n[op.row] = { ...op.snapshot };
  return n;
}
export function inverse(op: Op): Op {
  if (op.kind === "set") return { ...op, from: op.to, to: op.from };
  if (op.kind === "delete") return { kind: "insert", row: op.row, snapshot: op.snapshot };
  return { kind: "delete", row: op.row, snapshot: op.snapshot };
}
const touches = (op: Op) => (op.kind === "set" ? `${op.row}.${op.field}` : `${op.row}.*`);

// Undo one change: apply its inverse, unless something later changed the same field.
export function undoOne(t: Table, log: Change[], id: string) {
  const i = log.findIndex((c) => c.id === id);
  const later = log.slice(i + 1).flatMap((c) => c.ops.map(touches));
  const conflicts = log[i].ops.map(touches).filter((k) => later.includes(k) || later.some((l) => l.endsWith(".*") && k.startsWith(l.slice(0, -1))));
  if (conflicts.length) return { table: t, conflicts };
  return { table: [...log[i].ops].reverse().reduce((acc, op) => apply(acc, inverse(op)), t), conflicts };
}

export type History = "none" | "snapshot" | "log";
export const HISTORIES: { id: History; label: string; one: string }[] = [
  { id: "none", label: "Apply in place", one: "The AI writes straight into the table. There is nothing to go back to." },
  { id: "snapshot", label: "Undo all", one: "A copy of the table is saved before the AI runs; undo puts the whole copy back." },
  { id: "log", label: "Undo per change", one: "Every change is logged with its inverse. Undo one change; later edits stay." },
];

// The table everyone wanted: the five good fixes, plus your own edit.
export const INTENDED: Table = [...PROPOSAL.filter((c) => c.ok), YOUR_EDIT].flatMap((c) => c.ops).reduce(apply, ORIGINAL);

export function play(history: History, review: boolean) {
  const accepted = review ? PROPOSAL.filter((c) => c.ok) : PROPOSAL;
  const rejected = review ? PROPOSAL.filter((c) => !c.ok) : [];
  const log: Change[] = [...accepted, YOUR_EDIT];
  const afterAi = accepted.flatMap((c) => c.ops).reduce(apply, ORIGINAL);
  const afterEdit = YOUR_EDIT.ops.reduce(apply, afterAi);
  const bad = accepted.filter((c) => !c.ok);
  let final = afterEdit;
  const undone: string[] = [];
  let conflicts: string[] = [];
  if (bad.length && history === "snapshot") final = ORIGINAL; // the copy from before the AI ran
  if (bad.length && history === "log")
    for (const c of bad) {
      const u = undoOne(final, log, c.id);
      conflicts = conflicts.concat(u.conflicts);
      if (!u.conflicts.length) {
        final = u.table;
        undone.push(c.id);
      }
    }
  return { accepted, rejected, log, afterAi, afterEdit, final, undone, conflicts, ...compare(final) };
}

// Cell by cell against the intended table.
export function compare(t: Table) {
  const cells: { row: string; field: string; want: string; got: string }[] = [];
  for (const id of Object.keys(INTENDED)) {
    if (!t[id]) continue; // counted once, as a lost contact
    for (const f of ["name", "email", "company", "alt"] as Field[]) {
      const want = INTENDED[id][f] ?? "";
      const got = t[id][f] ?? "";
      if (want !== got) cells.push({ row: id, field: f, want, got });
    }
  }
  return {
    wrongCells: cells,
    contactsLost: Object.keys(INTENDED).filter((id) => !t[id]).length,
    yourEditLost: t.r3?.company !== "Halden Logistics",
    fixesLost: PROPOSAL.filter((c) => c.ok && c.ops.some((op) => op.kind === "set" && t[op.row] && t[op.row][op.field] !== op.to)).length,
  };
}

// Undo is refused when a later edit touched the same field: undoing the AI's capitalisation
// of Ana's name after you changed it to "Ana López" would throw your accent away.
export const CONFLICT_EXAMPLE = undoOne(
  ORIGINAL,
  [...PROPOSAL, { id: "u2", by: "you", label: "You add an accent: Ana López", ok: true, ops: [{ kind: "set", row: "r1", field: "name", from: "Ana Lopez", to: "Ana López" }] }],
  "c1",
).conflicts;
