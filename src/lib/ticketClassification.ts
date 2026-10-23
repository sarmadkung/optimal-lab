// Classification as a product feature: sixteen support tickets labelled by keyword
// rules, by nearest labelled examples in embedding space, and by a model given only
// the label names or the labels with written definitions. The rules really run on the
// text below; the embedding and model answers are illustrative, chosen to show the
// usual failure of each approach.

export type Label = "billing" | "bug" | "account" | "sales" | "other";
export type Method = "rules" | "embed" | "names" | "defs";

export const LABELS: { id: Label; name: string; def: string; queue: QueueId }[] = [
  { id: "billing", name: "billing", def: "Money already charged or owed: charges, refunds, invoices, payment methods.", queue: "billing" },
  { id: "bug", name: "bug", def: "Something in the product does not work as it should.", queue: "eng" },
  { id: "account", name: "account", def: "Signing in, security, profile and deleting an account or its data.", queue: "support" },
  { id: "sales", name: "sales", def: "Buying more or changing plan: prices, seats, upgrades, demos.", queue: "sales" },
  { id: "other", name: "other", def: "Anything else, including praise and questions about events or content.", queue: "support" },
];

export type QueueId = "billing" | "eng" | "support" | "sales";
export const QUEUES: { id: QueueId; label: string }[] = [
  { id: "billing", label: "Billing team" },
  { id: "eng", label: "Engineering" },
  { id: "support", label: "Support desk" },
  { id: "sales", label: "Sales" },
];
export const queueOf = (l: Label) => LABELS.find((x) => x.id === l)!.queue;

// First matching rule wins, in this order.
export const RULES: { label: Label; re: RegExp; src: string }[] = [
  { label: "billing", re: /\b(invoice|refund|charged?|billing|bill|receipt|card)\b/i, src: "invoice|refund|charge|billing|receipt|card" },
  { label: "account", re: /\b(password|log ?in|sign ?in|2fa|locked out)\b/i, src: "password|log in|sign in|2fa|locked out" },
  { label: "bug", re: /\b(error|crash(es|ed)?|broken|bug|500)\b/i, src: "error|crash|broken|bug|500" },
  { label: "sales", re: /\b(pricing|price|quote|demo|upgrade|seats?)\b/i, src: "pricing|price|quote|demo|upgrade|seats" },
];

export function byRules(text: string): { label: Label; matched: string | null } {
  for (const r of RULES) {
    const m = text.match(r.re);
    if (m) return { label: r.label, matched: m[0] };
  }
  return { label: "other", matched: null };
}

type Ticket = { id: number; text: string; truth: Label; embed: Label; names: Label; defs: Label; why: string };

export const TICKETS: Ticket[] = [
  { id: 1, text: "I was charged twice for March, please refund one of them.", truth: "billing", embed: "billing", names: "billing", defs: "billing", why: "Clear money question; every method gets it." },
  { id: 2, text: "The app crashes when I open the reports tab.", truth: "bug", embed: "bug", names: "bug", defs: "bug", why: "Clear bug report." },
  { id: 3, text: "Forgot my password and the reset email never arrives.", truth: "account", embed: "account", names: "account", defs: "account", why: "Clear sign-in problem." },
  { id: 4, text: "Can we get a demo for our team of 40?", truth: "sales", embed: "sales", names: "sales", defs: "sales", why: "Clear sales request." },
  { id: 5, text: "Can't log in since I updated my card details.", truth: "account", embed: "billing", names: "account", defs: "account", why: "“card” fires the billing rule first; the nearest examples are card updates." },
  { id: 6, text: "This isn't a billing question: how do I add 20 seats?", truth: "sales", embed: "billing", names: "sales", defs: "sales", why: "The rule sees “billing” and ignores the “isn't”." },
  { id: 7, text: "The export button does nothing when I click it.", truth: "bug", embed: "bug", names: "bug", defs: "bug", why: "No keyword from any list, so the rules fall through to other." },
  { id: 8, text: "Je n'arrive plus à me connecter à mon compte.", truth: "account", embed: "account", names: "account", defs: "account", why: "French: the English keywords never match; multilingual models and embeddings do." },
  { id: 9, text: "How much would it cost to move to the yearly plan?", truth: "sales", embed: "sales", names: "billing", defs: "sales", why: "About money, but no charge has happened yet: the definition says changing plan is sales." },
  { id: 10, text: "Upgraded to Pro yesterday but I'm still being charged the old price.", truth: "billing", embed: "sales", names: "sales", defs: "billing", why: "“Upgraded” and “price” read like sales; the definition says money already charged is billing." },
  { id: 11, text: "Your API returns 500 on every request since 9am.", truth: "bug", embed: "bug", names: "bug", defs: "bug", why: "Clear outage report." },
  { id: 12, text: "Please delete my account and all my data.", truth: "account", embed: "account", names: "account", defs: "account", why: "“account” is not a keyword in the account rule, so it falls through." },
  { id: 13, text: "Love the new dashboard, great work!", truth: "other", embed: "other", names: "other", defs: "other", why: "Praise; nothing to route except a thank-you." },
  { id: 14, text: "Is there a recording of last week's webinar?", truth: "other", embed: "sales", names: "sales", defs: "other", why: "Webinars sound like marketing; the definition puts events and content in other." },
  { id: 15, text: "Two-factor codes stopped working on my new phone.", truth: "account", embed: "account", names: "account", defs: "bug", why: "“Stopped working” pulls the defined model to bug: definitions help, and still leave a few." },
  { id: 16, text: "We need an invoice with our VAT number for last month's payment.", truth: "billing", embed: "billing", names: "billing", defs: "billing", why: "Clear invoice request." },
];

export const METHODS: { id: Method; label: string; one: string }[] = [
  { id: "rules", label: "Keyword rules", one: "Regular expressions checked in order; the first match wins, otherwise other." },
  { id: "embed", label: "Embeddings + examples", one: "Embed the ticket and take the label of the closest of 200 labelled past tickets." },
  { id: "names", label: "Model, label names", one: "A small model is told the five label names and must answer with one." },
  { id: "defs", label: "Model, labels defined", one: "The same model is given a one-line definition of each label, written by the support team." },
];

export function predict(m: Method, t: Ticket): Label {
  return m === "rules" ? byRules(t.text).label : t[m];
}

// Illustrative per-ticket cost and speed: a small model at $0.15 per million input
// tokens, an embedding model at $0.02 per million.
export const TICKET_TOKENS = 60;
const PROMPT_TOKENS: Record<Method, number> = { rules: 0, embed: 0, names: 150, defs: 650 };
const PRICE_PER_M: Record<Method, number> = { rules: 0, embed: 0.02, names: 0.15, defs: 0.15 };
export const LATENCY_MS: Record<Method, number> = { rules: 1, embed: 40, names: 350, defs: 400 };
export const costPer10k = (m: Method) => (10_000 * (PROMPT_TOKENS[m] + (m === "rules" ? 0 : TICKET_TOKENS)) * PRICE_PER_M[m]) / 1e6;
export const promptTokens = (m: Method) => PROMPT_TOKENS[m];

export function evaluate(m: Method) {
  const rows = TICKETS.map((t) => ({ t, p: predict(m, t) }));
  const correct = rows.filter((r) => r.p === r.t.truth).length;
  const perLabel = LABELS.map((l) => {
    const truly = rows.filter((r) => r.t.truth === l.id);
    const said = rows.filter((r) => r.p === l.id);
    return {
      label: l.id,
      recall: truly.length ? truly.filter((r) => r.p === l.id).length / truly.length : 1,
      precision: said.length ? said.filter((r) => r.t.truth === l.id).length / said.length : 1,
      n: truly.length,
    };
  });
  const misrouted = rows.filter((r) => queueOf(r.p) !== queueOf(r.t.truth)).length;
  return { rows, correct, total: rows.length, perLabel, misrouted };
}
