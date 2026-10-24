// Escalation paths. Eight things a support automation can't decide are handed to people.
// Who gets them, what they're given and what happens when nobody answers decide how fast
// each one reaches the right person. Response times are seeded; the routing, the
// escalation ladder and the timings run.

export type Team = "support" | "billing" | "legal" | "security" | "on-call" | "sales";
export const TEAM_LABEL: Record<Team, string> = { support: "Support tier 2", billing: "Billing", legal: "Legal", security: "Security", "on-call": "On-call engineer", sales: "Account manager" };

export type Case = {
  id: number;
  what: string;
  reason: string; // why the automation stopped
  owner: Team;
  ack: number | null; // minutes for the owner to pick it up (null: away)
  backupAck: number; // minutes for the next level once paged
  shared: number | null; // minutes until someone in the shared channel takes it (null: nobody)
  work: number; // minutes of work once the right person has it
  needsHistory: boolean; // without the conversation, they must ask the customer again
};

export const CASES: Case[] = [
  { id: 1, what: "$900 refund", reason: "over the bot's $200 limit", owner: "billing", ack: 15, backupAck: 20, shared: 40, work: 10, needsHistory: false },
  { id: 2, what: "Threat of legal action", reason: "legal topic: never answered by the bot", owner: "legal", ack: null, backupAck: 25, shared: 90, work: 30, needsHistory: false },
  { id: 3, what: "Bug or billing?", reason: "classifier unsure (0.41)", owner: "support", ack: 10, backupAck: 15, shared: 25, work: 10, needsHistory: true },
  { id: 4, what: "New device, new password, new payout account", reason: "account takeover signals", owner: "security", ack: 5, backupAck: 10, shared: 35, work: 15, needsHistory: false },
  { id: 5, what: "Payment provider returning errors", reason: "a system the bot depends on is down", owner: "on-call", ack: 45, backupAck: 10, shared: null, work: 20, needsHistory: false },
  { id: 6, what: "Message in Polish", reason: "language the bot doesn't support", owner: "support", ack: 20, backupAck: 15, shared: null, work: 15, needsHistory: false },
  { id: 7, what: "Fourth contact about the same order", reason: "repeat contact, rising frustration", owner: "support", ack: 15, backupAck: 15, shared: 30, work: 20, needsHistory: true },
  { id: 8, what: "Enterprise customer wants to change the contract", reason: "contract terms: needs the account owner", owner: "sales", ack: 60, backupAck: 15, shared: 70, work: 20, needsHistory: true },
];

export const SHARED_PICKER: Team = "support"; // whoever answers in a shared channel is usually a generalist
export const BOUNCE = 45; // finding the right team after picking up the wrong case
export const LADDER = 30; // page the next level if nobody acknowledges within this
export const DIG = 20; // reconstructing what happened without a handoff note
export const REASK = 240; // waiting for the customer to explain again

export type Route = "shared" | "owner";
export type Design = { route: Route; context: boolean; ladder: boolean };
export const FIRST: Design = { route: "shared", context: false, ladder: false };
export const FIXED: Design = { route: "owner", context: true, ladder: true };

export type Event = { t: number; text: string };
export type Result = { c: Case; reached: number | null; done: number | null; bounced: boolean; reasked: boolean; paged: boolean; events: Event[] };

export function handle(c: Case, d: Design): Result {
  const events: Event[] = [{ t: 0, text: d.route === "shared" ? "posted in #support-escalations" : `sent to ${TEAM_LABEL[c.owner]}` }];
  let t = 0;
  let bounced = false;
  let paged = false;
  const stuck = (text: string): Result => ({ c, reached: null, done: null, bounced, reasked: false, paged, events: [...events, { t, text }] });

  if (d.route === "shared") {
    if (c.shared === null) return stuck("everyone assumes someone else has it");
    t += c.shared;
    events.push({ t, text: `picked up by ${TEAM_LABEL[SHARED_PICKER]}` });
    if (c.owner !== SHARED_PICKER) {
      bounced = true;
      t += BOUNCE;
      events.push({ t, text: `not theirs: passed on to ${TEAM_LABEL[c.owner]}` });
    }
  }
  if (!(d.route === "shared" && c.owner === SHARED_PICKER)) {
    if (d.ladder && (c.ack === null || c.ack > LADDER)) {
      t += LADDER;
      paged = true;
      events.push({ t, text: "no acknowledgement: paging the next level" });
      t += c.backupAck;
    } else if (c.ack === null) {
      return stuck(`${TEAM_LABEL[c.owner]} is away and nothing pages anyone else`);
    } else t += c.ack;
    events.push({ t, text: paged ? "the backup acknowledges" : `${TEAM_LABEL[c.owner]} acknowledges` });
  }
  const reached = t;
  let reasked = false;
  if (!d.context) {
    t += DIG;
    events.push({ t, text: "reads logs to work out what the bot did" });
    if (c.needsHistory) {
      reasked = true;
      t += REASK;
      events.push({ t, text: "asks the customer to explain again and waits" });
    }
  }
  t += c.work;
  events.push({ t, text: "resolved" });
  return { c, reached, done: t, bounced, reasked, paged, events };
}

export function runAll(d: Design) {
  const results = CASES.map((c) => handle(c, d));
  const ok = results.filter((r) => r.done !== null);
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
  return {
    results,
    lost: results.length - ok.length,
    bounces: results.filter((r) => r.bounced).length,
    reasks: results.filter((r) => r.reasked).length,
    pages: results.filter((r) => r.paged).length,
    avgReach: avg(ok.map((r) => r.reached!)),
    avgDone: avg(ok.map((r) => r.done!)),
    worst: Math.max(0, ...ok.map((r) => r.done!)),
  };
}
