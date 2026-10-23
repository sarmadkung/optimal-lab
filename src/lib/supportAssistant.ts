// Case study: a support reply assistant. A day of 2,000 tickets, a help centre of 300
// articles, and agents who approve or edit drafts. Tickets and how each design treats
// them are seeded and illustrative; every count, the agent time and the cost really run.

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const PER_DAY = 2000;
export const ARTICLES = 300;
export type TicketKind = "docs" | "account" | "uncovered";
export const KIND_LABEL: Record<TicketKind, string> = {
  docs: "answered in the help centre",
  account: "needs an action on the account",
  uncovered: "no article covers it",
};

type Ticket = { kind: TicketKind; kwFound: boolean; hybridFound: boolean; draftRight: boolean; conf: number; agentMisses: boolean };
export const TICKETS: Ticket[] = (() => {
  const r = mulberry32(17);
  return Array.from({ length: PER_DAY }, () => {
    const u = r();
    const kind: TicketKind = u < 0.6 ? "docs" : u < 0.85 ? "account" : "uncovered";
    const f = r();
    // an account ticket can still find the article describing the procedure
    const kwFound = kind === "docs" ? f < 0.65 : kind === "account" ? f < 0.5 : false;
    const hybridFound = kind === "docs" ? f < 0.88 : kind === "account" ? f < 0.8 : false;
    const draftRight = r() < 0.93;
    return { kind, kwFound, hybridFound, draftRight, conf: r(), agentMisses: r() < 0.06 };
  });
})();

export type Retrieval = "none" | "keyword" | "hybrid";
export const RETRIEVALS: { id: Retrieval; label: string; one: string }[] = [
  { id: "none", label: "No retrieval", one: "The model answers from what it learned in training, which knows nothing about your product." },
  { id: "keyword", label: "Keyword search", one: "Top 3 articles by keyword match: misses tickets that use different words from the article." },
  { id: "hybrid", label: "Hybrid search", one: "Keyword and embedding search merged: finds the right article for most answerable tickets." },
];
export type Mode = "draft" | "auto";
export const MODES: { id: Mode; label: string }[] = [
  { id: "draft", label: "Agent approves every reply" },
  { id: "auto", label: "Auto-send confident replies" },
];
export type Design = { retrieval: Retrieval; grounded: boolean; mode: Mode };

// Minutes of agent time, and the model's price.
export const MIN = { manual: 8, approve: 2.5, rewrite: 9, action: 6 };
const COST_PER_TICKET = (3_000 * 3 + 350 * 15) / 1e6; // 3k tokens of articles and ticket in, 350 out, at $3 / $15 per million

export type Outcome = "noDraft" | "goodDraft" | "badCaught" | "badSent" | "autoGood" | "autoBad";
export const OUTCOME_LABEL: Record<Outcome, string> = {
  noDraft: "no draft: agent writes it",
  goodDraft: "good draft, approved",
  badCaught: "wrong draft, agent rewrites",
  badSent: "wrong draft, approved anyway",
  autoGood: "auto-sent, right",
  autoBad: "auto-sent, wrong",
};

export function handle(t: Ticket, d: Design): { outcome: Outcome; minutes: number } {
  const found = d.retrieval === "keyword" ? t.kwFound : d.retrieval === "hybrid" ? t.hybridFound : false;
  // grounded: draft only when an article was found and it covers the question
  const act = t.kind === "account" ? MIN.action : 0; // an account ticket needs someone to act; a draft can only describe it
  if (d.grounded && !found) return { outcome: "noDraft", minutes: MIN.manual + act };
  const right = found && t.draftRight;
  const confident = right ? t.conf > 0.25 : t.conf > 0.7; // the model is sure of most right drafts and some wrong ones
  if (d.mode === "auto" && confident && t.kind !== "account") return { outcome: right ? "autoGood" : "autoBad", minutes: 0 };
  if (right) return { outcome: "goodDraft", minutes: MIN.approve + act };
  return t.agentMisses ? { outcome: "badSent", minutes: MIN.approve + act } : { outcome: "badCaught", minutes: MIN.rewrite + act };
}

export function day(d: Design) {
  const rows = TICKETS.map((t) => ({ t, ...handle(t, d) }));
  const by = Object.fromEntries((Object.keys(OUTCOME_LABEL) as Outcome[]).map((k) => [k, rows.filter((x) => x.outcome === k).length])) as Record<Outcome, number>;
  const drafted = rows.filter((x) => x.outcome !== "noDraft").length;
  return {
    by,
    agentHours: rows.reduce((s, x) => s + x.minutes, 0) / 60,
    wrongSent: by.badSent + by.autoBad,
    autoSent: by.autoGood + by.autoBad,
    cost: drafted * COST_PER_TICKET + (d.retrieval === "none" ? 0 : PER_DAY * 0.0001),
  };
}
export const MANUAL_HOURS = (PER_DAY * MIN.manual + TICKETS.filter((t) => t.kind === "account").length * MIN.action) / 60;
export const MIX = (["docs", "account", "uncovered"] as TicketKind[]).map((k) => ({ k, n: TICKETS.filter((t) => t.kind === k).length }));
