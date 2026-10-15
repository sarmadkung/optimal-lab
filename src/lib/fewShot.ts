// Zero-shot vs few-shot classification of support tickets into billing / bug / how-to.
// A teaching model, not a real LLM: each test ticket has a base lean per label
// (what the model would guess with no examples). Each example in the prompt then
//  - teaches the team's convention to tickets that look like it (+SIMILAR),
//  - nudges every ticket toward its own label (+MAJORITY: majority label bias),
// and the last example nudges once more (+RECENCY: recency bias).
// Both biases are measured effects (Zhao et al. 2021, "Calibrate Before Use").

export type Label = "billing" | "bug" | "how-to";
export const LABELS: Label[] = ["billing", "bug", "how-to"];

export const SIMILAR = 0.6;
export const MAJORITY = 0.15;
export const RECENCY = 0.2;

// What a ticket looks like. An example teaches tickets that share its trait.
export type Trait = "money" | "broken" | "cant-find" | "question";

export type Example = { id: string; text: string; label: Label; trait: Trait };

export const EXAMPLES: Example[] = [
  { id: "e1", text: "I was charged twice this month.", label: "billing", trait: "money" },
  { id: "e2", text: "The app crashes when I open settings.", label: "bug", trait: "broken" },
  { id: "e3", text: "I can't find where to change my password.", label: "how-to", trait: "cant-find" },
  { id: "e4", text: "Can I get an invoice with our VAT number?", label: "billing", trait: "money" },
  { id: "e5", text: "The export button does nothing on Safari.", label: "bug", trait: "broken" },
  { id: "e6", text: "How do I invite a teammate?", label: "how-to", trait: "question" },
];

export type Ticket = {
  id: string;
  text: string;
  label: Label; // what the team files it under
  traits: Trait[];
  lean: Record<Label, number>;
  loose: string; // the zero-shot reply: right or wrong, often not a bare label
};

export const TICKETS: Ticket[] = [
  { id: "t1", text: "Why was I billed after cancelling?", label: "billing", traits: ["money"], lean: { billing: 1.2, bug: 0.4, "how-to": 0.3 }, loose: "Billing" },
  { id: "t2", text: "The page goes blank after I log in.", label: "bug", traits: ["broken"], lean: { billing: 0.1, bug: 1.2, "how-to": 0.3 }, loose: "This looks like a bug." },
  { id: "t3", text: "I can't find the export to CSV option.", label: "how-to", traits: ["cant-find"], lean: { billing: 0.1, bug: 1.0, "how-to": 0.6 }, loose: "bug" },
  { id: "t4", text: "How do I change my billing email?", label: "how-to", traits: ["question"], lean: { billing: 1.0, bug: 0.2, "how-to": 0.85 }, loose: "Category: billing" },
  { id: "t5", text: "Uploads fail with error 413.", label: "bug", traits: ["broken"], lean: { billing: 0.1, bug: 1.3, "how-to": 0.2 }, loose: "bug" },
  { id: "t6", text: "Where can I download my invoices?", label: "how-to", traits: ["cant-find"], lean: { billing: 1.0, bug: 0.3, "how-to": 0.7 }, loose: "billing." },
  { id: "t7", text: "Is there a way to restore a deleted project?", label: "how-to", traits: ["question"], lean: { billing: 0.1, bug: 0.7, "how-to": 0.9 }, loose: "How-to question" },
  { id: "t8", text: "My card was declined but the money left my account.", label: "billing", traits: ["money"], lean: { billing: 1.0, bug: 0.8, "how-to": 0.1 }, loose: "Billing / payments" },
];

export const INSTRUCTION = "Classify the support ticket as billing, bug or how-to.";

export type Scores = { label: Label; base: number; similar: number; majority: number; recency: number; total: number }[];

// Score each label for one ticket, given the examples in the prompt (in order).
export function scores(ticket: Ticket, shots: Example[]): Scores {
  const last = shots.at(-1);
  return LABELS.map((label) => {
    const mine = shots.filter((e) => e.label === label);
    const base = ticket.lean[label];
    const similar = mine.filter((e) => ticket.traits.includes(e.trait)).length * SIMILAR;
    const majority = mine.length * MAJORITY;
    const recency = last && last.label === label ? RECENCY : 0;
    return { label, base, similar, majority, recency, total: base + similar + majority + recency };
  });
}

export type Result = { ticket: Ticket; output: string; parsed: Label | null; meant: Label; right: boolean };

// With no examples the model answers in its own words; with examples it copies their format.
export function classify(ticket: Ticket, shots: Example[]): Result {
  const s = scores(ticket, shots);
  const meant = s.reduce((a, b) => (b.total > a.total ? b : a)).label;
  const output = shots.length === 0 ? ticket.loose : meant;
  const clean = output.trim().toLowerCase();
  const parsed = (LABELS as string[]).includes(clean) ? (clean as Label) : null;
  return { ticket, output, parsed, meant: shots.length === 0 ? looseMeaning(ticket) : meant, right: parsed === ticket.label };
}

// What a loose zero-shot reply means, read by a person rather than a parser.
function looseMeaning(t: Ticket): Label {
  const l = t.loose.toLowerCase();
  return l.includes("bill") ? "billing" : l.includes("bug") ? "bug" : "how-to";
}

export function runAll(shots: Example[]) {
  const results = TICKETS.map((t) => classify(t, shots));
  return {
    results,
    parsed: results.filter((r) => r.parsed !== null).length,
    meaningRight: results.filter((r) => r.meant === r.ticket.label).length,
    right: results.filter((r) => r.right).length,
  };
}

export const PRESETS: { id: string; label: string; ids: string[]; note: string }[] = [
  { id: "zero", label: "Zero-shot", ids: [], note: "Only the instruction. The model answers, but in whatever words it likes." },
  { id: "one", label: "One example", ids: ["e1"], note: "One example fixes the format. The labels still follow the model's own idea of each word." },
  { id: "balanced", label: "One of each", ids: ["e1", "e2", "e3"], note: "A billing, a bug and a how-to example. The how-to example teaches the team's convention: “can't find” is a question, not a bug." },
  { id: "all", label: "All six", ids: ["e1", "e2", "e3", "e4", "e5", "e6"], note: "Two of each label, covering every kind of ticket." },
  { id: "skewed", label: "Only bug examples", ids: ["e2", "e5"], note: "Every example says bug. The model leans toward bug on everything, even where it would have been right." },
];

export const shotsFor = (ids: string[]) => ids.map((id) => EXAMPLES.find((e) => e.id === id)!).filter(Boolean);

// Rough prompt size in words: instruction + each example + the ticket.
export function promptWords(shots: Example[], ticket: Ticket): number {
  const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
  return words(INSTRUCTION) + shots.reduce((n, e) => n + words(e.text) + 3, 0) + words(ticket.text) + 2;
}
