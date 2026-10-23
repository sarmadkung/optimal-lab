// Upgrading the model under a live feature: meeting notes in, action items out as a JSON
// array of { owner, task, due }. The new model is cheaper, faster and catches more
// items, and also wraps its JSON in a markdown fence, renames a key and writes longer
// tasks. Model outputs are illustrative; parsing, every check and the totals really run.

type Item = { owner: string; task: string; due: string };
type Case = { id: string; notes: string; items: Item[]; oldMisses?: number; quirks: { fence?: boolean; assignee?: boolean; verbose?: boolean } };

export const CASES: Case[] = [
  { id: "m1", notes: "Ana will send the revised quote by Friday.", items: [{ owner: "Ana", task: "Send revised quote", due: "Fri" }], quirks: { fence: true } },
  { id: "m2", notes: "Ben books the venue; Chloe drafts the agenda for Monday.", items: [{ owner: "Ben", task: "Book the venue", due: "" }, { owner: "Chloe", task: "Draft the agenda", due: "Mon" }], quirks: { verbose: true } },
  { id: "m3", notes: "Dev to fix the export bug. Also Eve said she'd check the logs this week.", items: [{ owner: "Dev", task: "Fix the export bug", due: "" }, { owner: "Eve", task: "Check the logs", due: "this week" }], oldMisses: 1, quirks: {} },
  { id: "m4", notes: "No decisions today; we'll meet again next week.", items: [], quirks: { fence: true } },
  { id: "m5", notes: "Fay owns the launch email, due 12 May.", items: [{ owner: "Fay", task: "Write the launch email", due: "12 May" }], quirks: { assignee: true } },
  { id: "m6", notes: "Gil and Hana pair on the migration plan by end of month.", items: [{ owner: "Gil", task: "Migration plan (with Hana)", due: "end of month" }], quirks: { verbose: true } },
  { id: "m7", notes: "Ivan: renew the SSL certificate before it expires on the 3rd. Jo mentioned updating the runbook afterwards.", items: [{ owner: "Ivan", task: "Renew the SSL certificate", due: "3rd" }, { owner: "Jo", task: "Update the runbook", due: "" }], oldMisses: 1, quirks: { fence: true } },
  { id: "m8", notes: "Kai to chase the unpaid invoice.", items: [{ owner: "Kai", task: "Chase the unpaid invoice", due: "" }], quirks: { assignee: true } },
  { id: "m9", notes: "Lena presents Q3 numbers at the board meeting on Thursday.", items: [{ owner: "Lena", task: "Present Q3 numbers", due: "Thu" }], quirks: { verbose: true, fence: true } },
  { id: "m10", notes: "Mo will review the contract with legal.", items: [{ owner: "Mo", task: "Review the contract with legal", due: "" }], quirks: {} },
];

const VERBOSE: Record<string, string> = {
  "Book the venue": "Research, compare and book a suitable venue for the event",
  "Draft the agenda": "Draft a detailed agenda covering every topic for Monday's session",
  "Migration plan (with Hana)": "Work together with Hana to produce the complete migration plan",
  "Present Q3 numbers": "Prepare and present the third-quarter financial numbers to the board",
};

export type Fixes = { structured: boolean; brief: boolean };
export const MODELS = {
  old: { id: "model-2025-06-01", pricePerM: 3, latency: 2.1 },
  next: { id: "model-2026-09-15", pricePerM: 1.8, latency: 1.4 },
};

// What each model returns, as raw text.
export function output(c: Case, which: "old" | "next", f: Fixes): string {
  if (which === "old") {
    const items = c.oldMisses ? c.items.slice(0, c.items.length - c.oldMisses) : c.items;
    return JSON.stringify(items);
  }
  const items = c.items.map((it) => {
    const task = c.quirks.verbose && !f.brief ? (VERBOSE[it.task] ?? it.task) : it.task;
    return c.quirks.assignee && !f.structured ? { assignee: it.owner, task, due: it.due } : { owner: it.owner, task, due: it.due };
  });
  const json = JSON.stringify(items);
  return c.quirks.fence && !f.structured ? "```json\n" + json + "\n```" : json;
}

export type CheckName = "parses" | "keys" | "count" | "owners" | "short";
export const CHECK_LABEL: Record<CheckName, string> = { parses: "parses as JSON", keys: "keys are owner, task, due", count: "finds every item", owners: "right owners", short: "tasks fit the card (≤ 45 chars)" };

export function check(c: Case, raw: string) {
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  const arr = Array.isArray(parsed) ? (parsed as Record<string, string>[]) : null;
  const r: Record<CheckName, boolean> = {
    parses: arr !== null,
    keys: !!arr && arr.every((x) => Object.keys(x).sort().join() === "due,owner,task"),
    count: !!arr && arr.length === c.items.length,
    owners: !!arr && arr.map((x) => x.owner).sort().join() === c.items.map((x) => x.owner).sort().join(),
    short: !!arr && arr.every((x) => (x.task ?? "").length <= 45),
  };
  return { r, pass: Object.values(r).every(Boolean) };
}

export function evaluate(which: "old" | "next", f: Fixes) {
  const rows = CASES.map((c) => {
    const raw = output(c, which, f);
    return { c, raw, ...check(c, raw) };
  });
  // after "parses", count a failure only where the output parsed, so one broken output isn't counted five times
  const failsBy = Object.fromEntries((Object.keys(CHECK_LABEL) as CheckName[]).map((k) => [k, rows.filter((x) => !x.r[k] && (k === "parses" || x.r.parses)).length])) as Record<CheckName, number>;
  return { rows, passed: rows.filter((x) => x.pass).length, failsBy };
}

export type Pin = "alias" | "pinned";
export const PINS: { id: Pin; label: string; one: string }[] = [
  { id: "alias", label: "“latest” alias", one: "The app asks for model-latest. When the provider moves the alias, every request switches that day, with no eval run." },
  { id: "pinned", label: "Pinned snapshot", one: `The app asks for ${MODELS.old.id} by name. Nothing changes until you change it.` },
];
export const NO_FIXES: Fixes = { structured: false, brief: false };
