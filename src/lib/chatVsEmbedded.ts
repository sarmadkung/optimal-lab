// Chat vs embedded AI in an expense app, timed with the Keystroke-Level Model (Card,
// Moran and Newell): a task is a sequence of operators, each with a standard time.
// The sequences are written out per task; the timing really runs. Frequencies are
// illustrative.

export const OPERATORS = {
  K: { s: 0.28, what: "press a key (average typist)" },
  P: { s: 1.1, what: "point at something with the mouse" },
  B: { s: 0.1, what: "press or release the mouse button" },
  H: { s: 0.4, what: "move a hand between keyboard and mouse" },
  M: { s: 1.35, what: "think or decide what to do next" },
} as const;
type Op = keyof typeof OPERATORS;

// "K*40" is forty keystrokes; "R3" is waiting three seconds for the system; "W20" is reading for twenty.
// In a chat sequence, TYPE stands for typing the request, one keystroke per character.
export const chatSeq = (t: Task) => t.chat.seq.replace("TYPE", `K*${t.chat.typed.length}`);
export function time(seq: string) {
  let total = 0;
  const parts: { op: string; n: number; s: number }[] = [];
  for (const tok of seq.trim().split(/\s+/)) {
    const m = tok.match(/^([KPBHM])(?:\*(\d+))?$|^([RW])(\d+(?:\.\d+)?)$/);
    if (!m) throw new Error(`bad operator ${tok}`);
    if (m[1]) {
      const n = Number(m[2] ?? 1);
      const s = OPERATORS[m[1] as Op].s * n;
      parts.push({ op: m[1], n, s });
      total += s;
    } else {
      const s = Number(m[4]);
      parts.push({ op: m[3], n: 1, s });
      total += s;
    }
  }
  // merge counts per operator for display
  const by: Record<string, { n: number; s: number }> = {};
  for (const p of parts) {
    by[p.op] = by[p.op] ?? { n: 0, s: 0 };
    by[p.op].n += p.n;
    by[p.op].s += p.s;
  }
  return { total, by };
}

export type Task = {
  id: string;
  label: string;
  perWeek: number;
  chat: { typed: string; seq: string; note: string };
  embedded: { control: string | null; seq: string; note: string };
};

export const TASKS: Task[] = [
  {
    id: "categorize",
    label: "Categorize an expense",
    perWeek: 40,
    chat: { typed: "What category is the £18.40 Pret receipt from 12 May?", seq: "M H P B B H TYPE R2 M P B B P B B", note: "Open the chat, describe the receipt, read the answer, then pick that category in the form yourself." },
    embedded: { control: "Category field, pre-filled as the receipt uploads", seq: "M P B B", note: "The suggestion is already in the field; glance and confirm." },
  },
  {
    id: "justify",
    label: "Write a justification",
    perWeek: 10,
    chat: { typed: "Write a one-line business reason for a £230 train to Leeds for the Halden client meeting", seq: "M H P B B H TYPE R3 M W5 P B B H K*2 P B B K*2", note: "Type the context the chat can't see, then copy the answer into the expense form." },
    embedded: { control: "“Draft reason” button beside the field", seq: "M P B B R3 W5 M P B B", note: "The button already knows the amount, trip and client." },
  },
  {
    id: "travel",
    label: "Ask what travel cost this quarter",
    perWeek: 2,
    chat: { typed: "How much did I spend on travel this quarter?", seq: "M H P B B H TYPE R2 W4", note: "One question, one answer." },
    embedded: { control: null, seq: "M P B B M P B B P B B M P B B P B B W8", note: "No button for this, so it's the reports page: open it, set the dates, filter to travel, read the total." },
  },
  {
    id: "policy",
    label: "Check if a hotel minibar is allowed",
    perWeek: 1,
    chat: { typed: "Can I expense a hotel minibar?", seq: "M H P B B H TYPE R2 W6", note: "The chat answers from the policy, with the passage." },
    embedded: { control: null, seq: "M P B B H K*8 M P B B W30", note: "No control can anticipate this: search the policy PDF and read." },
  },
  {
    id: "vat",
    label: "Fix 5 receipts missing a VAT number",
    perWeek: 1,
    chat: { typed: "Which of my receipts are missing a VAT number?", seq: "M H P B B H TYPE R4 W6 M P B B W3 P B B H K*12 M P B B W3 P B B H K*12 M P B B W3 P B B H K*12 M P B B W3 P B B H K*12 M P B B W3 P B B H K*12", note: "The chat finds them, but you open and fix each receipt yourself." },
    embedded: { control: "“Fill missing VAT from receipts” on the filtered list", seq: "M P B B R4 W6 M P B B", note: "A bulk action where the list is; review five filled values, confirm." },
  },
];

export type Design = "chat" | "embedded" | "both";
export const DESIGNS: { id: Design; label: string }[] = [
  { id: "chat", label: "Chat panel only" },
  { id: "embedded", label: "Embedded only" },
  { id: "both", label: "Both" },
];

export function taskTime(t: Task, d: Design) {
  const c = time(chatSeq(t)).total;
  const e = time(t.embedded.seq).total;
  // with both, people use the inline control when there is one, and the chat for the rest
  const s = d === "chat" ? c : d === "embedded" ? e : t.embedded.control ? e : c;
  return { chat: c, embedded: e, chosen: s, via: d === "chat" ? "chat" : d === "embedded" ? (t.embedded.control ? "inline" : "by hand") : t.embedded.control ? "inline" : "chat" };
}

export function weekly(d: Design) {
  return TASKS.reduce((s, t) => s + t.perWeek * taskTime(t, d).chosen, 0) / 60;
}
