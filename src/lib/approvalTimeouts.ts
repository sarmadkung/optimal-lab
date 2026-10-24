// Approval timeouts. Twenty refund requests over a week wait for one approver, who
// ignores one message and goes on holiday on day 4. A timer decides what happens when
// nobody answers, and a deploy on day 4 wipes timers that live only in memory. The
// requests and reply times are seeded; the timers, the policies and the counts run.

export type Req = { id: number; at: number; amount: number; reply: number | null; suspicious: boolean };

// at: hour of the week it was requested; reply: hours until the approver answers (null: never this week)
export const REQUESTS: Req[] = [
  { id: 1, at: 1, amount: 25, reply: 2, suspicious: false },
  { id: 2, at: 3, amount: 180, reply: 5, suspicious: false },
  { id: 3, at: 6, amount: 40, reply: 20, suspicious: false },
  { id: 4, at: 10, amount: 15, reply: 14, suspicious: false },
  { id: 5, at: 22, amount: 300, reply: 3, suspicious: true },
  { id: 6, at: 26, amount: 60, reply: 30, suspicious: false },
  { id: 7, at: 29, amount: 35, reply: null, suspicious: false },
  { id: 8, at: 33, amount: 90, reply: 6, suspicious: false },
  { id: 9, at: 47, amount: 20, reply: 12, suspicious: false },
  { id: 10, at: 50, amount: 450, reply: 4, suspicious: true },
  { id: 11, at: 54, amount: 30, reply: 40, suspicious: false },
  { id: 12, at: 70, amount: 75, reply: null, suspicious: false },
  { id: 13, at: 74, amount: 25, reply: null, suspicious: false },
  { id: 14, at: 78, amount: 520, reply: null, suspicious: true },
  { id: 15, at: 82, amount: 45, reply: null, suspicious: false },
  { id: 16, at: 95, amount: 15, reply: null, suspicious: false },
  { id: 17, at: 99, amount: 130, reply: null, suspicious: false },
  { id: 18, at: 104, amount: 60, reply: null, suspicious: false },
  { id: 19, at: 110, amount: 40, reply: null, suspicious: true },
  { id: 20, at: 116, amount: 80, reply: null, suspicious: false },
];

export const WEEK = 168;
export const HOLIDAY = 72; // the approver is away from here on
export const DEPLOY = 75; // a deploy restarts the workflow workers
export const BACKUP_HOURS = 3; // the backup approver answers within this
export const SMALL = 50; // "small" refunds for the by-amount rule
export const TIMEOUTS = [4, 12, 24, 48];

export type OnTimeout = "wait" | "approve" | "reject" | "escalate" | "amount";
export type Design = { timeout: number; on: OnTimeout; durable: boolean };
export const FIRST: Design = { timeout: 24, on: "wait", durable: false };
export const FIXED: Design = { timeout: 24, on: "amount", durable: true };

export type By = "approver" | "backup" | "auto-approve" | "auto-reject" | "stuck";
export type Result = { r: Req; by: By; doneAt: number | null; approved: boolean | null; right: boolean; timerLost: boolean; why: string };

export function resolve(r: Req, d: Design): Result {
  const answer = r.reply === null ? null : r.at + r.reply;
  const deadline = r.at + d.timeout;
  const decision = !r.suspicious; // what a person decides
  // a timer kept in a process's memory dies with the deploy
  const timerLost = !d.durable && d.on !== "wait" && r.at < DEPLOY && deadline > DEPLOY && (answer === null || answer > DEPLOY);
  const timerFires = d.on !== "wait" && !timerLost && (answer === null || answer > deadline);

  if (!timerFires) {
    if (answer !== null && answer <= WEEK) return { r, by: "approver", doneAt: answer, approved: decision, right: true, timerLost, why: `the approver ${decision ? "approved" : "rejected"} it after ${r.reply} h` };
    return { r, by: "stuck", doneAt: null, approved: null, right: false, timerLost, why: timerLost ? `the timer died in the deploy at hour ${DEPLOY}; nobody answers` : "nobody answers, and nothing gives up waiting" };
  }
  const action = d.on === "amount" ? (r.amount <= SMALL ? "approve" : "escalate") : d.on;
  if (action === "approve") return { r, by: "auto-approve", doneAt: deadline, approved: true, right: decision, timerLost, why: `approved by the timer after ${d.timeout} h${r.suspicious ? `: a suspicious $${r.amount} refund nobody looked at` : ""}` };
  if (action === "reject") return { r, by: "auto-reject", doneAt: deadline, approved: false, right: !decision, timerLost, why: `rejected by the timer after ${d.timeout} h${decision ? ": a valid refund refused" : ""}` };
  return { r, by: "backup", doneAt: deadline + BACKUP_HOURS, approved: decision, right: true, timerLost, why: `sent to the backup approver after ${d.timeout} h, who ${decision ? "approved" : "rejected"} it` };
}

export function runAll(d: Design) {
  const results = REQUESTS.map((r) => resolve(r, d));
  const n = (b: By) => results.filter((x) => x.by === b).length;
  const waits = results.map((x) => (x.doneAt ?? WEEK) - x.r.at);
  return {
    results,
    byApprover: n("approver"),
    byBackup: n("backup"),
    autoApproved: n("auto-approve"),
    autoRejected: n("auto-reject"),
    stuck: n("stuck"),
    lostTimers: results.filter((x) => x.timerLost).length,
    unreviewedRisk: results.filter((x) => x.by === "auto-approve" && x.r.suspicious).reduce((a, x) => a + x.r.amount, 0),
    unreviewedTotal: results.filter((x) => x.by === "auto-approve").reduce((a, x) => a + x.r.amount, 0),
    wronglyRefused: results.filter((x) => x.by === "auto-reject" && !x.r.suspicious).length,
    avgWait: Math.round(waits.reduce((a, b) => a + b, 0) / waits.length),
  };
}
