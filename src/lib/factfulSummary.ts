// Summarization that keeps the facts. A support thread is summarized for the next
// agent at three lengths, either directly or by listing the facts first. The
// summaries are illustrative; the fact coverage and the check for numbers and names
// that are not in the source really run on their text.

export const THREAD = [
  { who: "Dana Ruiz, Brightwell Studio", when: "3 March", text: "Our card was charged £1,240 twice for the annual Team plan, order 48213. Please refund one charge. We also changed our company name and VAT number last month, so the invoice should show Brightwell Studio Ltd and VAT GB 123 4567 89." },
  { who: "Sam, support", when: "4 March", text: "Confirmed: the duplicate charge came from a payment retry during the outage on 2 March. A refund of £1,240 is approved; it takes 5 to 7 business days to reach the card. Finance will issue a corrected invoice." },
  { who: "Dana Ruiz", when: "4 March", text: "Thanks. Can you also confirm we keep the 20% loyalty discount on renewal?" },
  { who: "Sam, support", when: "5 March", text: "Yes, the 20% discount stays until the renewal on 1 April 2027. Lee in finance will send the corrected invoice by 7 March. Closing the refund part; the invoice part stays open until Lee confirms." },
];
export const SOURCE = THREAD.map((m) => `${m.who} ${m.when} ${m.text}`).join("\n");
export const SOURCE_WORDS = THREAD.reduce((n, m) => n + words(m.text), 0);

export type Fact = { id: string; label: string; must: RegExp[]; key: boolean };
// key: the next agent cannot act correctly without it.
export const FACTS: Fact[] = [
  { id: "who", label: "Who: Dana Ruiz, Brightwell Studio", must: [/Dana|Brightwell/i], key: false },
  { id: "twice", label: "Charged twice", must: [/twice|duplicate|double/i], key: true },
  { id: "amount", label: "Amount: £1,240", must: [/£1,240/], key: true },
  { id: "order", label: "Order 48213", must: [/48213/], key: false },
  { id: "refund", label: "Refund approved", must: [/refund/i], key: true },
  { id: "timing", label: "Lands in 5 to 7 business days", must: [/5 to 7 business days/i], key: true },
  { id: "cause", label: "Cause: payment retry in the 2 March outage", must: [/retry|outage/i], key: false },
  { id: "invoice", label: "Invoice needs the new name and VAT number", must: [/invoice/i, /VAT|name/i], key: true },
  { id: "deadline", label: "Lee sends it by 7 March", must: [/7 March/], key: true },
  { id: "discount", label: "20% discount kept until renewal", must: [/20%/, /discount/i], key: false },
  { id: "open", label: "Still open: the invoice", must: [/\bopen\b|pending|outstanding|waiting/i], key: true },
];

export type Strategy = "plain" | "facts";
export type Length = 80 | 40 | 20;
export const LENGTHS: Length[] = [80, 40, 20];
export const STRATEGIES: { id: Strategy; label: string; one: string }[] = [
  { id: "plain", label: "Just summarize", one: "“Summarize this thread in about N words.”" },
  { id: "facts", label: "Facts first", one: "First list amounts, dates, decisions, owners and open items; then write from that list, most important first." },
];

export const SUMMARIES: Record<Strategy, Record<Length, string>> = {
  plain: {
    80: "Dana Ruiz from Brightwell Studio reported being charged twice for the annual Team plan. Support confirmed the duplicate charge was caused by an outage and approved a refund of £1,240, which takes 5 to 7 business days. Dana also asked about the company's new name and VAT number and the 20% loyalty discount, which Sam confirmed stays until renewal. Finance will send a corrected invoice. The issue has been resolved.",
    40: "Brightwell Studio was charged twice after an outage on 2 March. Support approved a £2,480 refund and confirmed the 20% discount until renewal. Finance will send a corrected invoice. Case closed.",
    20: "Brightwell was double-charged; a £2,480 refund was approved within 3 days and the discount kept. Case closed.",
  },
  facts: {
    80: "Dana Ruiz (Brightwell Studio) was charged £1,240 twice for order 48213 after a payment retry during the 2 March outage. Sam approved a refund of £1,240, due on the card in 5 to 7 business days. The 20% discount stays until renewal on 1 April 2027. Still open: Lee in finance sends an invoice with the new company name and VAT number by 7 March.",
    40: "Brightwell Studio was charged £1,240 twice (order 48213). Refund of £1,240 approved, 5 to 7 business days. 20% discount kept. Open: invoice with the new name and VAT number, from finance by 7 March.",
    20: "Duplicate £1,240 charge: refund approved, 5 to 7 business days. Open: corrected invoice from finance by 7 March.",
  },
};

export function words(s: string) {
  return s.split(/\s+/).filter(Boolean).length;
}

export function covered(summary: string) {
  return FACTS.map((f) => ({ fact: f, kept: f.must.every((re) => re.test(summary)) }));
}

// Every amount, percentage, number, date and name in the summary must appear in the source.
const MONTH = "January|February|March|April|May|June|July|August|September|October|November|December";
export function unsupported(summary: string) {
  const claims = new Set<string>();
  // a number with a unit is checked whole, so "3 days" doesn't pass because the source has "3 March"
  const patterns = [
    new RegExp(`\\b\\d{1,2} (?:${MONTH})(?: \\d{4})?`, "g"),
    /£\d{1,3}(?:,\d{3})*(?:\.\d+)?/g,
    /\d+%/g,
    /\b\d+ (?:to \d+ )?(?:business )?(?:days|weeks|months|hours)\b/g,
    /\b\d[\d,]*\d\b|\b\d\b/g,
  ];
  let rest = summary;
  for (const re of patterns) {
    for (const m of rest.match(re) ?? []) claims.add(m);
    rest = rest.replace(re, " ");
  }
  // capitalised words that are not the first word of a sentence: names of people, companies, plans
  for (const m of rest.matchAll(/(?<![.:;!?]\s|^)\b([A-Z][a-z]+)\b/g)) claims.add(m[1]);
  return [...claims].map((c) => ({ claim: c, found: inSource(c) }));
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// whole-token match, so "4" is not found inside "48213"
const inSource = (c: string) => new RegExp(/^[\d£]/.test(c) ? `(?<![\\w,£])${esc(c)}(?![\\w,%])` : `\\b${esc(c)}\\b`, "i").test(SOURCE);

export function score(s: Strategy, len: Length) {
  const text = SUMMARIES[s][len];
  const facts = covered(text);
  const claims = unsupported(text);
  return {
    text,
    words: words(text),
    facts,
    kept: facts.filter((f) => f.kept).length,
    keyKept: facts.filter((f) => f.kept && f.fact.key).length,
    keyTotal: FACTS.filter((f) => f.key).length,
    claims,
    bad: claims.filter((c) => !c.found),
  };
}
