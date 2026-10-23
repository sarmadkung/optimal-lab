// Writing and rewriting inside a product: a trial-ending email template rewritten four
// ways. Placeholders, the product name, numbers and the link must come back exactly.
// The model's rewrites are illustrative; masking, restoring, the survival check, the
// word diff and the template rendering really run.

export const ORIGINAL =
  "Hi {first_name}, your Optimal Pro trial ends on {trial_end}. Upgrade before then to keep your 3 projects and 12 GB of files. It's $49/month. Questions? Reply here or visit https://optimallab.dev/pricing.";

// What must survive any rewrite, in the order it appears.
export const PROTECTED = ["{first_name}", "Optimal Pro", "{trial_end}", "3", "12 GB", "$49", "https://optimallab.dev/pricing"];
// Values the template engine fills in. They come from the app, so they need their own locale.
export const SAMPLE: Record<string, Record<string, string>> = {
  en: { first_name: "Ana", trial_end: "12 May" },
  de: { first_name: "Ana", trial_end: "12. Mai" },
};

export type Op = "friendly" | "shorter" | "formal" | "german";
export const OPS: { id: Op; label: string; instruction: string }[] = [
  { id: "friendly", label: "Friendlier", instruction: "Make this warmer and more casual." },
  { id: "shorter", label: "Shorter", instruction: "Cut this to about half the length." },
  { id: "formal", label: "More formal", instruction: "Make this formal and polite." },
  { id: "german", label: "German", instruction: "Translate this into German." },
];

// What the model returns from the raw text…
const RAW: Record<Op, string> = {
  friendly: "Hey there! Your Optimal Pro trial wraps up on {trial_end}. Upgrade before then and keep all your projects and files, just $49 a month. Got questions? Just reply, or visit https://optimallab.dev/pricing.",
  shorter: "Hi {first_name}, your trial ends {trial_end}. Keep your projects for $49/mo: optimallab.dev/pricing",
  formal: "Dear {first_name}, your Optimal Pro trial will end on {trial_end}. To retain your 3 projects and 12 GB of files, please upgrade before that date, at $49 per month. Should you have any questions, please reply to this message or visit https://optimallab.dev/pricing.",
  german: "Hallo {vorname}, Ihre Optimal-Profi-Testphase endet am {testende}. Führen Sie vorher ein Upgrade durch, um Ihre 3 Projekte und 12 GB an Dateien zu behalten. Es kostet 49 $/Monat. Fragen? Antworten Sie hier oder besuchen Sie https://optimallab.dev/pricing.",
};
// …and from the masked text, where each protected part is a numbered marker.
const MASKED_OUT: Record<Op, string> = {
  friendly: "Hey ⟦1⟧! Your ⟦2⟧ trial wraps up on ⟦3⟧. Upgrade before then to keep your ⟦4⟧ projects and ⟦5⟧ of files, just ⟦6⟧ a month. Got questions? Just reply, or visit ⟦7⟧.",
  shorter: "Hi ⟦1⟧, your ⟦2⟧ trial ends ⟦3⟧. Keep your ⟦4⟧ projects for ⟦6⟧/month: ⟦7⟧",
  formal: "Dear ⟦1⟧, your ⟦2⟧ trial will end on ⟦3⟧. To retain your ⟦4⟧ projects and ⟦5⟧ of files, please upgrade before that date, at ⟦6⟧ per month. Should you have any questions, please reply to this message or visit ⟦7⟧.",
  german: "Hallo ⟦1⟧, Ihre ⟦2⟧-Testphase endet am ⟦3⟧. Upgraden Sie vorher, um Ihre ⟦4⟧ Projekte und ⟦5⟧ an Dateien zu behalten. Es kostet ⟦6⟧ pro Monat. Fragen? Antworten Sie hier oder besuchen Sie ⟦7⟧.",
};

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// a bare number only counts as a whole token
const tokenRe = (p: string) => new RegExp(/^\d+$/.test(p) ? `(?<![\\d.,])${p}(?![\\d.,])` : esc(p));

// One pass over the original, so a marker like ⟦3⟧ is never itself matched as "3".
export function mask(text: string) {
  const all = new RegExp(PROTECTED.map((p) => `(${tokenRe(p).source})`).join("|"), "g");
  return text.replace(all, (...m) => `⟦${m.slice(1, PROTECTED.length + 1).findIndex((g) => g !== undefined) + 1}⟧`);
}

export function unmask(text: string) {
  return text.replace(/⟦(\d+)⟧/g, (_, n) => PROTECTED[Number(n) - 1] ?? "");
}

export function survived(text: string) {
  return PROTECTED.map((p) => ({ part: p, ok: tokenRe(p).test(text) }));
}

export function render(text: string, lang: "en" | "de") {
  return text.replace(/\{(\w+)\}/g, (m, k) => SAMPLE[lang][k] ?? m);
}

export function rewrite(op: Op, protect: boolean) {
  const sent = protect ? mask(ORIGINAL) : ORIGINAL;
  const returned = protect ? MASKED_OUT[op] : RAW[op];
  const result = protect ? unmask(returned) : returned;
  const parts = survived(result);
  const lang = op === "german" ? "de" : "en";
  const leftover = [...render(result, lang).matchAll(/\{(\w+)\}/g)].map((m) => m[0]);
  return {
    sent,
    returned,
    result,
    parts,
    lost: parts.filter((p) => !p.ok).map((p) => p.part),
    rendered: render(result, lang),
    leftover, // placeholders the template engine doesn't know, shown to the customer as-is
    lengthChange: result.length / ORIGINAL.length - 1,
  };
}

// Word-level diff (longest common subsequence), for an accept / reject view.
export type DiffPart = { kind: "same" | "del" | "ins"; text: string };
export function diff(a: string, b: string): DiffPart[] {
  const x = a.split(/(\s+)/).filter(Boolean);
  const y = b.split(/(\s+)/).filter(Boolean);
  const L = Array.from({ length: x.length + 1 }, () => new Array<number>(y.length + 1).fill(0));
  for (let i = x.length - 1; i >= 0; i--) for (let j = y.length - 1; j >= 0; j--) L[i][j] = x[i] === y[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out: DiffPart[] = [];
  const push = (kind: DiffPart["kind"], text: string) => {
    const last = out[out.length - 1];
    if (last && last.kind === kind) last.text += text;
    else out.push({ kind, text });
  };
  let i = 0;
  let j = 0;
  while (i < x.length && j < y.length) {
    if (x[i] === y[j]) {
      push("same", x[i]);
      i++;
      j++;
    } else if (L[i + 1][j] >= L[i][j + 1]) push("del", x[i++]);
    else push("ins", y[j++]);
  }
  while (i < x.length) push("del", x[i++]);
  while (j < y.length) push("ins", y[j++]);
  return out;
}
