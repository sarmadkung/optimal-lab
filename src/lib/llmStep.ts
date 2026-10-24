// Adding an LLM step. Ten support emails go through a workflow step that asks a model
// for helpdesk ticket fields as JSON. The model's raw answers are illustrative; the
// parsing, validation, retry and the helpdesk's own checks really run on them.

export const CATEGORIES = ["billing", "bug", "account", "other"] as const;
export type Fields = { category: string; priority: number; summary: string; order_id: string | null };
export const SUMMARY_MAX = 120;

export type Item = {
  id: number;
  text: string;
  truth: Fields;
  raw: string;
  cutOff?: boolean; // the model stopped at max_tokens
  retry: string; // the answer when asked again with the error
  issue: string;
};

const j = (f: Partial<Fields>) => JSON.stringify(f);

export const ITEMS: Item[] = [
  {
    id: 1,
    text: "Hi, I was charged twice for order ORD-4821 this morning. Please refund one of them.",
    truth: { category: "billing", priority: 1, summary: "Charged twice for ORD-4821; wants one charge refunded.", order_id: "ORD-4821" },
    raw: j({ category: "billing", priority: 1, summary: "Charged twice for ORD-4821; wants one charge refunded.", order_id: "ORD-4821" }),
    retry: "",
    issue: "clean JSON",
  },
  {
    id: 2,
    text: "The app crashes every time I open the camera to scan a receipt. iPhone 15, latest version.",
    truth: { category: "bug", priority: 2, summary: "App crashes when opening the camera to scan a receipt (iPhone 15).", order_id: null },
    raw: "```json\n" + j({ category: "bug", priority: 2, summary: "App crashes when opening the camera to scan a receipt (iPhone 15).", order_id: null }) + "\n```",
    retry: j({ category: "bug", priority: 2, summary: "App crashes when opening the camera to scan a receipt (iPhone 15).", order_id: null }),
    issue: "wrapped in a ```json fence",
  },
  {
    id: 3,
    text: "How do I change the email address on my account?",
    truth: { category: "account", priority: 3, summary: "Asks how to change the account email address.", order_id: null },
    raw: "Sure! Here's the ticket:\n" + j({ category: "account", priority: 3, summary: "Asks how to change the account email address.", order_id: null }),
    retry: j({ category: "account", priority: 3, summary: "Asks how to change the account email address.", order_id: null }),
    issue: "a sentence before the JSON",
  },
  {
    id: 4,
    text: "My card was declined on order ORD-5108 but the money still left my account.",
    truth: { category: "billing", priority: 1, summary: "Card declined on ORD-5108 but the money was taken.", order_id: "ORD-5108" },
    raw: JSON.stringify({ category: "billing", priority: "high", summary: "Card declined on ORD-5108 but the money was taken.", order_id: "ORD-5108" }),
    retry: j({ category: "billing", priority: 1, summary: "Card declined on ORD-5108 but the money was taken.", order_id: "ORD-5108" }),
    issue: "priority is the word \"high\"",
  },
  {
    id: 5,
    text: "Order ORD-3377 arrived with a cracked screen protector. Can I get a replacement?",
    truth: { category: "other", priority: 2, summary: "ORD-3377 arrived with a cracked screen protector; wants a replacement.", order_id: "ORD-3377" },
    raw: j({ category: "other", priority: 2, summary: "ORD-3377 arrived with a cracked screen protector; wants a replacement." }),
    retry: j({ category: "other", priority: 2, summary: "ORD-3377 arrived with a cracked screen protector; wants a replacement.", order_id: "ORD-3377" }),
    issue: "order_id left out",
  },
  {
    id: 6,
    text: "Since the last update, syncing between my phone and laptop stops after about ten minutes and I have to log out and back in to make it work again.",
    truth: { category: "bug", priority: 2, summary: "Sync stops after ~10 minutes since the last update; needs a re-login.", order_id: null },
    raw: '{"category": "bug", "priority": 2, "summary": "Since the last update, syncing between the phone and the laptop stops after about ten minutes and the customer has to log',
    cutOff: true,
    retry: j({ category: "bug", priority: 2, summary: "Sync stops after ~10 minutes since the last update; needs a re-login.", order_id: null }),
    issue: "cut off at max_tokens",
  },
  {
    id: 7,
    text: "Please delete my account and all the data you hold about me, as is my right under GDPR. I have emailed about this twice already and had no reply, which is not acceptable.",
    truth: { category: "account", priority: 1, summary: "GDPR request to delete the account and all data; third time asking.", order_id: null },
    raw: j({ category: "account", priority: 1, summary: "The customer asks us to delete their account and all of the personal data we hold about them under GDPR, and says this is the third time they have asked without a reply.", order_id: null }),
    retry: j({ category: "account", priority: 1, summary: "GDPR request to delete the account and all data; third time asking.", order_id: null }),
    issue: "summary too long for the field",
  },
  {
    id: 8,
    text: "Where is my refund? It's been two weeks.",
    truth: { category: "billing", priority: 2, summary: "Refund not received after two weeks.", order_id: null },
    raw: j({ category: "billing", priority: 2, summary: "Refund not received after two weeks.", order_id: "ORD-1001" }),
    retry: j({ category: "billing", priority: 2, summary: "Refund not received after two weeks.", order_id: null }),
    issue: "an order id that isn't in the email",
  },
  {
    id: 9,
    text: "asdf test please ignore",
    truth: { category: "other", priority: 3, summary: "Test message.", order_id: null },
    raw: "I can't tell what this message is about, so I won't guess a category.",
    retry: "This looks like a test message; there is nothing to file.",
    issue: "no JSON at all",
  },
  {
    id: 10,
    text: "Could you add a dark mode to the web dashboard?",
    truth: { category: "other", priority: 3, summary: "Feature request: dark mode for the web dashboard.", order_id: null },
    raw: j({ category: "other", priority: 3, summary: "Feature request: dark mode for the web dashboard.", order_id: null }),
    retry: "",
    issue: "clean JSON",
  },
];

export type ParseMode = "strict" | "tolerant";
export type OnInvalid = "fail" | "retry" | "person";
export type Design = { parse: ParseMode; validate: boolean; onInvalid: OnInvalid };
export const FIRST: Design = { parse: "strict", validate: false, onInvalid: "fail" };
export const FIXED: Design = { parse: "tolerant", validate: true, onInvalid: "retry" };

export function parse(raw: string, mode: ParseMode): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  let s = raw.trim();
  if (mode === "tolerant") {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const a = s.indexOf("{");
    const b = s.lastIndexOf("}");
    if (a < 0) return { ok: false, error: "no JSON object in the answer" };
    if (b < a) return { ok: false, error: "the JSON object never closes" };
    s = s.slice(a, b + 1);
  }
  try {
    const v = JSON.parse(s);
    if (typeof v !== "object" || v === null || Array.isArray(v)) return { ok: false, error: "not a JSON object" };
    return { ok: true, value: v };
  } catch {
    return { ok: false, error: s.startsWith("{") ? "the JSON object never closes" : `not JSON: it starts with ${JSON.stringify(s.split("\n")[0].slice(0, 10) + "…")}` };
  }
}

const ORDER = /ORD-\d{4}/;

// Schema checks plus one business rule only code can know: the order id must be the one in the email.
export function validate(v: Record<string, unknown>, text: string): string[] {
  const errs: string[] = [];
  if (!CATEGORIES.includes(v.category as (typeof CATEGORIES)[number])) errs.push(`category must be one of ${CATEGORIES.join(", ")}`);
  if (!(typeof v.priority === "number" && [1, 2, 3].includes(v.priority))) errs.push(`priority must be 1, 2 or 3, got ${JSON.stringify(v.priority)}`);
  if (typeof v.summary !== "string" || !v.summary) errs.push("summary is missing");
  else if (v.summary.length > SUMMARY_MAX) errs.push(`summary is ${v.summary.length} characters; the field holds ${SUMMARY_MAX}`);
  if (!("order_id" in v)) errs.push("order_id is missing (use null when there is none)");
  else {
    const inText = text.match(ORDER)?.[0] ?? null;
    if (v.order_id !== inText) errs.push(v.order_id ? `order_id ${v.order_id} is not the one in the email (${inText ?? "none"})` : `the email mentions ${inText} but order_id is null`);
  }
  return errs;
}

// The helpdesk API: rejects a non-integer priority, silently cuts a long summary.
function writeTicket(v: Record<string, unknown>): { ok: true; ticket: Fields; cut: boolean } | { ok: false; error: string } {
  if (!(typeof v.priority === "number" && Number.isInteger(v.priority))) return { ok: false, error: "422 from the helpdesk: priority must be an integer" };
  const summary = String(v.summary ?? "");
  return {
    ok: true,
    cut: summary.length > SUMMARY_MAX,
    ticket: { category: String(v.category), priority: v.priority, summary: summary.slice(0, SUMMARY_MAX), order_id: (v.order_id as string | null | undefined) ?? null },
  };
}

export type Outcome = "right" | "wrong" | "failed" | "person";
export type Trace = { attempt: number; answer: string; cutOff: boolean; problem: string | null };
export type Result = { item: Item; outcome: Outcome; retried: boolean; calls: number; trace: Trace[]; why: string; ticket?: Fields };

export function run(item: Item, d: Design): Result {
  const trace: Trace[] = [];
  let answer = item.raw;
  let cutOff = !!item.cutOff;
  for (let attempt = 1; ; attempt++) {
    const p = parse(answer, d.parse);
    const problems = p.ok ? (d.validate ? validate(p.value, item.text) : []) : [cutOff ? `${p.error} (stopped at max_tokens)` : p.error];
    trace.push({ attempt, answer, cutOff, problem: problems.length ? problems.join("; ") : null });
    const calls = attempt;
    const retried = attempt > 1;
    if (problems.length) {
      if (d.onInvalid === "retry" && attempt === 1) {
        answer = item.retry;
        cutOff = false;
        continue;
      }
      if (d.onInvalid === "fail") return { item, outcome: "failed", retried, calls, trace, why: `the step threw: ${problems[0]}` };
      return { item, outcome: "person", retried, calls, trace, why: `sent to the review queue: ${problems[0]}` };
    }
    const w = writeTicket((p as { ok: true; value: Record<string, unknown> }).value);
    if (!w.ok) return { item, outcome: "failed", retried, calls, trace, why: w.error };
    const t = w.ticket;
    const wrongs = [
      t.category !== item.truth.category && "category",
      t.priority !== item.truth.priority && "priority",
      t.order_id !== item.truth.order_id && (t.order_id ? `order ${t.order_id} (made up)` : "no order linked"),
      w.cut && "summary cut off",
    ].filter(Boolean) as string[];
    if (wrongs.length) return { item, outcome: "wrong", retried, calls, trace, ticket: t, why: `written, but ${wrongs.join(", ")}` };
    return { item, outcome: "right", retried, calls, trace, ticket: t, why: retried ? "written correctly after one retry" : "written correctly" };
  }
}

export function runAll(d: Design) {
  const results = ITEMS.map((it) => run(it, d));
  const n = (o: Outcome) => results.filter((r) => r.outcome === o).length;
  return { results, right: n("right"), wrong: n("wrong"), failed: n("failed"), person: n("person"), calls: results.reduce((a, r) => a + r.calls, 0), retried: results.filter((r) => r.retried).length };
}
