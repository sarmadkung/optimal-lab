// Who approved what. Seven refund approvals go through a workflow with Approve buttons.
// Five go wrong in ways that show up months later: an amount edited after approval, a
// self-approval, a shared account, an approval over the approver's limit, and one link
// clicked twice. The requests are seeded; the controls, the records they leave, the
// payouts and the auditor's questions run.

export type Person = "Jo" | "Sam" | "Ravi" | "Maya" | "ops-team";
export const LIMIT: Record<Person, number> = { Jo: 500, Sam: 500, Ravi: 500, Maya: 2000, "ops-team": 500 };

export type Req = {
  id: number;
  amount: number;
  requester: Person | "bot";
  approver: Person; // who clicks Approve as things happen
  decision: "approve" | "reject";
  reason?: string;
  editedTo?: number; // amount changed after approval, before paying
  clickedTwice?: boolean;
  incident: string | null;
};

export const REQUESTS: Req[] = [
  { id: 1, amount: 120, requester: "bot", approver: "Jo", decision: "approve", incident: null },
  { id: 2, amount: 200, requester: "Sam", approver: "Jo", decision: "approve", editedTo: 2000, incident: "amount changed to $2,000 after approval" },
  { id: 3, amount: 350, requester: "Sam", approver: "Sam", decision: "approve", incident: "approved by the person who asked for it" },
  { id: 4, amount: 80, requester: "bot", approver: "ops-team", decision: "approve", incident: "approved from a shared account" },
  { id: 5, amount: 900, requester: "bot", approver: "Jo", decision: "approve", incident: "over the approver's $500 limit" },
  { id: 6, amount: 60, requester: "bot", approver: "Maya", decision: "reject", reason: "duplicate of #1", incident: null },
  { id: 7, amount: 150, requester: "bot", approver: "Jo", decision: "approve", clickedTwice: true, incident: "approve link clicked twice" },
];

export type Design = { identity: boolean; bind: boolean; rules: boolean; log: boolean };
export const FIRST: Design = { identity: false, bind: false, rules: false, log: false };
export const FIXED: Design = { identity: true, bind: true, rules: true, log: true };

const hash = (s: string) => {
  // FNV-1a, enough to show "same payload or not"
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16).padStart(8, "0").slice(0, 7);
};
const payload = (id: number, amount: number) => JSON.stringify({ request: id, action: "refund", amount });

export type Entry = { event: string; by: string; detail: string };
export type Outcome = {
  r: Req;
  approver: string; // as recorded
  actor: Person | null; // who really gave the approval that counted
  paid: number[]; // payouts actually made
  prevented: string | null;
  row: Record<string, string>; // the status row, last write wins
  log: Entry[]; // append-only events, only when the log is on
};

export function runRequest(r: Req, d: Design): Outcome {
  const log: Entry[] = [];
  const add = (event: string, by: string, detail: string) => d.log && log.push({ event, by, detail });
  add("requested", r.requester, `$${r.amount} · ${hash(payload(r.id, r.amount))}`);

  // who clicked: a shared login is refused when every click needs a named sign-in
  let clicker: Person = r.approver;
  let note: string | null = null;
  if (r.approver === "ops-team" && d.identity) {
    clicker = "Ravi";
    note = "shared login refused; Ravi signed in and approved";
  }
  const recordedAs = d.identity ? clicker : r.approver === "ops-team" ? "ops-team" : "someone with the link";

  // rules need to know who clicked
  if (d.rules && d.identity && r.decision === "approve") {
    if (clicker === r.requester) {
      add("refused", clicker, "can't approve your own request");
      return { r, approver: "—", actor: null, paid: [], prevented: "self-approval refused; sent to another approver", row: { status: "pending", decided_by: "", amount: `$${r.amount}` }, log };
    }
    if (r.amount > LIMIT[clicker]) {
      add("refused", clicker, `$${r.amount} is over ${clicker}'s $${LIMIT[clicker]} limit`);
      add("approved", "Maya", `limit $${LIMIT.Maya} · ${hash(payload(r.id, r.amount))}`);
      return finish(r, d, "Maya", "Maya", log, add, `over ${clicker}'s limit; Maya (limit $2,000) approved it`);
    }
  }
  if (r.decision === "reject") {
    add("rejected", recordedAs, d.log ? `reason: ${r.reason}` : "");
    return { r, approver: recordedAs, actor: clicker, paid: [], prevented: null, row: { status: "rejected", decided_by: recordedAs, amount: `$${r.amount}` }, log };
  }
  add("approved", recordedAs, `${hash(payload(r.id, r.amount))}`);
  return finish(r, d, recordedAs, clicker, log, add, note);
}

function finish(r: Req, d: Design, approver: string, actor: Person, log: Entry[], add: (e: string, b: string, x: string) => void, note: string | null): Outcome {
  const approvedHash = hash(payload(r.id, r.amount));
  let amount = r.amount;
  let prevented = note;
  if (r.editedTo) {
    amount = r.editedTo;
    add("edited", r.requester, `$${r.amount} → $${amount} · ${hash(payload(r.id, amount))}`);
  }
  const paid: number[] = [];
  const attempts = r.clickedTwice ? 2 : 1;
  for (let i = 0; i < attempts; i++) {
    if (d.bind && hash(payload(r.id, amount)) !== approvedHash) {
      add("blocked", "payments", `payload ${hash(payload(r.id, amount))} ≠ approved ${approvedHash}`);
      prevented = "payout blocked: it no longer matches what was approved";
      break;
    }
    if (d.bind && i > 0) {
      add("blocked", "payments", "approval already used");
      prevented = "second click ignored: each approval pays once";
      break;
    }
    paid.push(amount);
    add("paid", "payments", `$${amount}`);
  }
  return { r, approver, actor, paid, prevented, row: { status: paid.length ? "paid" : "approved", decided_by: approver, amount: `$${amount}` }, log };
}

export type Question = { id: string; q: string; answer: (o: Outcome[], d: Design) => string | null };
const byId = (o: Outcome[], id: number) => o.find((x) => x.r.id === id)!;

export const QUESTIONS: Question[] = [
  { id: "who", q: "Who approved #4?", answer: (o, d) => (d.identity ? `${byId(o, 4).approver}, signed in` : null) },
  { id: "saw", q: "Did the approver of #2 see the amount that was paid?", answer: (o, d) => (d.log || d.bind ? (byId(o, 2).paid.length ? "No: approved $200, then edited to $2,000" : "Nothing was paid: the edit broke the approval") : null) },
  { id: "self", q: "Did anyone approve their own request?", answer: (o, d) => (d.identity ? (o.some((x) => x.approver === x.r.requester) ? "Yes: #3, Sam" : "No: the rule refused it") : null) },
  { id: "limit", q: "Was every approval within the approver's limit?", answer: (o, d) => (d.identity ? (o.some((x) => x.paid.length && x.actor && x.r.amount > LIMIT[x.actor]) ? "No: #5, Jo approved $900 on a $500 limit" : "Yes") : null) },
  { id: "why", q: "Why was #6 rejected?", answer: (o, d) => (d.log ? `“${byId(o, 6).r.reason}”` : null) },
  { id: "twice", q: "How many times was #7 paid?", answer: (o, d) => (d.log ? `${byId(o, 7).paid.length} time${byId(o, 7).paid.length > 1 ? "s" : ""}` : null) },
];

export function runAll(d: Design) {
  const outcomes = REQUESTS.map((r) => runRequest(r, d));
  const answers = QUESTIONS.map((q) => ({ q, a: q.answer(outcomes, d) }));
  const incidents = REQUESTS.filter((r) => r.incident);
  const prevented = outcomes.filter((o) => o.r.incident && o.prevented).length;
  // money that left without a valid, matching, single approval by someone allowed to give it
  const bad = outcomes.reduce((sum, o) => {
    const extra = o.paid.slice(1).reduce((a, b) => a + b, 0);
    const edited = o.r.editedTo && o.paid.length ? o.paid[0] - o.r.amount : 0;
    const unauth = o.paid.length && o.actor && (o.actor === o.r.requester || o.r.amount > LIMIT[o.actor]) ? o.r.amount : 0;
    return sum + extra + edited + unauth;
  }, 0);
  return { outcomes, answers, answered: answers.filter((x) => x.a !== null).length, incidents: incidents.length, prevented, bad };
}
