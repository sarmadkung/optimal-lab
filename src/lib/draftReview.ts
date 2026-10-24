// Draft, then review. A model drafts replies to twelve support tickets. Code checks, a
// routing rule and a person decide what is sent. The drafts are illustrative; the
// checks, the routing and the counts really run on them.

export type Problem = "refund" | "order" | "placeholder" | "link" | "promise" | "tone" | "fact";
export const PROBLEM_LABEL: Record<Problem, string> = {
  refund: "refund larger than the order",
  order: "wrong order number",
  placeholder: "template placeholder left in",
  link: "link to a site that isn't ours",
  promise: "a promise nobody approved",
  tone: "blames the customer",
  fact: "wrong renewal date",
};

export type Ticket = {
  id: number;
  topic: string;
  risky: boolean; // money or contract changes
  customer: string;
  order: { id: string; total: number } | null;
  context: string; // what the account shows
  draft: string;
  problem: Problem | null; // the planted mistake, used only for scoring
};

export const ALLOWED_HOSTS = ["shop.example", "help.shop.example"];

export const TICKETS: Ticket[] = [
  { id: 1, topic: "password reset", risky: false, customer: "Ana", order: null, context: "Account active", draft: "Hi Ana, you can reset your password from the sign-in page: https://help.shop.example/reset. The link is valid for an hour.", problem: null },
  { id: 2, topic: "refund", risky: true, customer: "Ben", order: { id: "ORD-2207", total: 80 }, context: "ORD-2207 · blender · $80 · delivered damaged", draft: "Hi Ben, I'm sorry the blender arrived broken. I've issued a full refund of $120 for ORD-2207; you'll see it in 3–5 days.", problem: "refund" },
  { id: 3, topic: "return status", risky: false, customer: "Chloe", order: { id: "ORD-2213", total: 45 }, context: "ORD-2213 · return received Monday", draft: "Hi Chloe, your return for ORD-2231 was received on Monday and the refund is on its way.", problem: "order" },
  { id: 4, topic: "address change", risky: false, customer: "Dev", order: { id: "ORD-2240", total: 64 }, context: "ORD-2240 · not shipped yet", draft: "Hi [Customer name], I've updated the delivery address on ORD-2240 to the one you sent.", problem: "placeholder" },
  { id: 5, topic: "return label", risky: false, customer: "Eva", order: { id: "ORD-2251", total: 39 }, context: "ORD-2251 · return requested", draft: "Hi Eva, you can print your return label here: https://returns.shopfast.example/label/2251", problem: "link" },
  { id: 6, topic: "invoice copy", risky: false, customer: "Femi", order: { id: "ORD-2266", total: 120 }, context: "ORD-2266 · paid", draft: "Hi Femi, I've attached a copy of the invoice for ORD-2266.", problem: null },
  { id: 7, topic: "setup help", risky: false, customer: "Gus", order: null, context: "Hub bought last week", draft: "Hi Gus, as the quick-start guide explains on page 1, the hub must be plugged in before pairing. Please read the instructions before contacting us.", problem: "tone" },
  { id: 8, topic: "late delivery", risky: false, customer: "Hana", order: { id: "ORD-2290", total: 58 }, context: "ORD-2290 · carrier delay, no new date", draft: "Hi Hana, sorry for the delay on ORD-2290. I guarantee it will arrive by tomorrow.", problem: "promise" },
  { id: 9, topic: "feature question", risky: false, customer: "Ivan", order: null, context: "Account active", draft: "Hi Ivan, yes: you can export your order history as CSV from Account → Orders.", problem: null },
  { id: 10, topic: "plan renewal", risky: true, customer: "Jun", order: null, context: "Plan renews 3 April · $96 a year", draft: "Hi Jun, your plan renews on 3 March for $96, and you can cancel any time before then from Account → Plan.", problem: "fact" },
  { id: 11, topic: "sign-in link", risky: false, customer: "Kim", order: null, context: "Account active", draft: "Hi Kim, I've sent a new sign-in link to your email; it expires in an hour.", problem: null },
  { id: 12, topic: "data export", risky: false, customer: "Lea", order: null, context: "Export finished today", draft: "Hi Lea, your data export is ready; download it from Account → Privacy within 7 days.", problem: null },
];

// ---- code checks: things a program can decide every time
export function check(t: Ticket): string[] {
  const out: string[] = [];
  if (/\[[A-Z][^\]]*\]|\{\{[^}]*\}\}/.test(t.draft)) out.push("placeholder left in the text");
  for (const u of t.draft.match(/https?:\/\/[^\s)]+/g) ?? []) {
    const host = new URL(u.replace(/[.,]$/, "")).hostname;
    if (!ALLOWED_HOSTS.includes(host)) out.push(`link to ${host}, not on the allowlist`);
  }
  for (const id of t.draft.match(/ORD-\d{4}/g) ?? []) if (id !== t.order?.id) out.push(`mentions ${id}; the ticket is about ${t.order?.id ?? "no order"}`);
  const refund = t.draft.match(/refund of \$(\d+(?:\.\d+)?)/i);
  if (refund && (!t.order || Number(refund[1]) > t.order.total)) out.push(`refund $${refund[1]} is more than the order total ($${t.order?.total ?? 0})`);
  if (/\b(guarantee|promise|compensat\w*|by tomorrow)\b/i.test(t.draft)) out.push("makes a commitment that needs approval");
  return out;
}

export type Route = "none" | "flagged" | "risky" | "all";
export type Design = { checks: boolean; route: Route; context: boolean };
export const FIRST: Design = { checks: false, route: "none", context: false };
export const FIXED: Design = { checks: true, route: "risky", context: true };

// A person sees what the text shows; numbers and facts need the ticket beside the draft.
const VISIBLE: Problem[] = ["placeholder", "link", "promise", "tone"];
export const NEEDS_CONTEXT: Problem[] = ["refund", "order", "fact"];

export const PER_DAY = 500;
export const MIN_PER_READ = { bare: 0.75, context: 1.5 };

export type Outcome = "sent" | "sent-bad" | "fixed" | "blocked";
export type Result = { t: Ticket; flags: string[]; seen: boolean; outcome: Outcome; why: string };

export function decide(t: Ticket, d: Design): Result {
  const flags = d.checks ? check(t) : [];
  const seen = d.route === "all" || (d.route !== "none" && flags.length > 0) || (d.route === "risky" && t.risky);
  if (seen) {
    const catches = flags.length > 0 || (t.problem !== null && (VISIBLE.includes(t.problem) || (d.context && NEEDS_CONTEXT.includes(t.problem))));
    if (t.problem && catches) return { t, flags, seen, outcome: "fixed", why: flags.length ? `a person fixed it: ${flags[0]}` : `a person caught it: ${PROBLEM_LABEL[t.problem]}` };
    if (t.problem) return { t, flags, seen, outcome: "sent-bad", why: `a person approved it without the ticket: ${PROBLEM_LABEL[t.problem]}` };
    return { t, flags, seen, outcome: "sent", why: "a person approved it" };
  }
  if (flags.length) return { t, flags, seen, outcome: "blocked", why: `held by the checks and nobody looks at held drafts: ${flags[0]}` };
  if (t.problem) return { t, flags, seen, outcome: "sent-bad", why: `sent to the customer: ${PROBLEM_LABEL[t.problem]}` };
  return { t, flags, seen, outcome: "sent", why: "sent automatically" };
}

export function runAll(d: Design) {
  const results = TICKETS.map((t) => decide(t, d));
  const n = (o: Outcome) => results.filter((r) => r.outcome === o).length;
  const read = results.filter((r) => r.seen).length;
  const minutes = ((read / TICKETS.length) * PER_DAY * (d.context ? MIN_PER_READ.context : MIN_PER_READ.bare));
  return { results, sent: n("sent"), bad: n("sent-bad"), fixed: n("fixed"), blocked: n("blocked"), read, hoursPerDay: Math.round((minutes / 60) * 10) / 10 };
}
