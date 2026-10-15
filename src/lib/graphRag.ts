// GraphRAG on a tiny engineering wiki. At index time an LLM reads each note and
// extracts (entity, relation, entity) facts; the facts form a knowledge graph, and
// the graph is split into communities that get a summary each (as in Microsoft's
// GraphRAG). At query time there are three ways to fetch context:
//  - vector: the top notes by similarity (here: shared words, standing in for embeddings),
//  - graph:  find the entities named in the question and walk N hops of relations,
//  - global: read the community summaries, for questions about the whole dataset.

export type Doc = { id: string; title: string; text: string };

export const DOCS: Doc[] = [
  { id: "d1", title: "Checkout service", text: "The checkout service turns a cart into an order. It calls the payments service to charge the card. Team Storefront owns checkout." },
  { id: "d2", title: "Payments service", text: "The payments service charges cards through Stripe. Team Ledger owns payments." },
  { id: "d3", title: "On-call rota", text: "This week Priya is on call for Team Ledger and Marco is on call for Team Storefront." },
  { id: "d4", title: "Incident 112", text: "Incident 112: checkout errors after a payments deploy. Card charges timed out for 20 minutes. Rolled back." },
  { id: "d5", title: "Incident 118", text: "Incident 118: search was slow because the index ran out of memory. Team Discovery added nodes." },
  { id: "d6", title: "Incident 121", text: "Incident 121: payments retried after a timeout and charged some customers twice. Added idempotency keys." },
  { id: "d7", title: "Search service", text: "The search service indexes products in OpenSearch. Team Discovery owns search." },
  { id: "d8", title: "Incident 125", text: "Incident 125: a certificate expired on the payments gateway and card charges failed for 40 minutes." },
];

export type Entity = { id: string; label: string; kind: "service" | "team" | "person" | "incident" | "vendor"; at: [number, number]; aliases: string[] };

// `at` is the position in the graph picture, in a 100 × 60 box.
export const ENTITIES: Entity[] = [
  { id: "checkout", label: "checkout", kind: "service", at: [30, 30], aliases: ["checkout"] },
  { id: "payments", label: "payments", kind: "service", at: [55, 30], aliases: ["payments", "payment"] },
  { id: "search", label: "search", kind: "service", at: [86, 40], aliases: ["search"] },
  { id: "storefront", label: "Storefront", kind: "team", at: [9, 30], aliases: ["storefront"] },
  { id: "ledger", label: "Ledger", kind: "team", at: [64, 9], aliases: ["ledger"] },
  { id: "discovery", label: "Discovery", kind: "team", at: [86, 16], aliases: ["discovery"] },
  { id: "priya", label: "Priya", kind: "person", at: [40, 7], aliases: ["priya"] },
  { id: "marco", label: "Marco", kind: "person", at: [9, 8], aliases: ["marco"] },
  { id: "stripe", label: "Stripe", kind: "vendor", at: [72, 46], aliases: ["stripe"] },
  { id: "opensearch", label: "OpenSearch", kind: "vendor", at: [86, 56], aliases: ["opensearch"] },
  { id: "i112", label: "inc 112", kind: "incident", at: [40, 53], aliases: ["112"] },
  { id: "i121", label: "inc 121", kind: "incident", at: [56, 55], aliases: ["121"] },
  { id: "i125", label: "inc 125", kind: "incident", at: [24, 53], aliases: ["125"] },
  { id: "i118", label: "inc 118", kind: "incident", at: [72, 26], aliases: ["118"] },
];

export type Fact = { id: string; from: string; rel: string; to: string; doc: string };

export const FACTS: Fact[] = [
  { id: "f1", from: "checkout", rel: "calls", to: "payments", doc: "d1" },
  { id: "f2", from: "storefront", rel: "owns", to: "checkout", doc: "d1" },
  { id: "f3", from: "ledger", rel: "owns", to: "payments", doc: "d2" },
  { id: "f4", from: "payments", rel: "uses", to: "stripe", doc: "d2" },
  { id: "f5", from: "priya", rel: "on call for", to: "ledger", doc: "d3" },
  { id: "f6", from: "marco", rel: "on call for", to: "storefront", doc: "d3" },
  { id: "f7", from: "i112", rel: "broke", to: "checkout", doc: "d4" },
  { id: "f8", from: "i112", rel: "caused by", to: "payments", doc: "d4" },
  { id: "f9", from: "i118", rel: "slowed", to: "search", doc: "d5" },
  { id: "f10", from: "i121", rel: "hit", to: "payments", doc: "d6" },
  { id: "f11", from: "discovery", rel: "owns", to: "search", doc: "d7" },
  { id: "f12", from: "search", rel: "uses", to: "opensearch", doc: "d7" },
  { id: "f13", from: "i125", rel: "hit", to: "payments", doc: "d8" },
];

export type Community = { id: string; title: string; members: string[]; summary: string };

// Found by a clustering pass (Leiden in GraphRAG), then summarized by an LLM at index time.
export const COMMUNITIES: Community[] = [
  {
    id: "c1",
    title: "Payments and checkout",
    members: ["checkout", "payments", "storefront", "ledger", "priya", "marco", "stripe", "i112", "i121", "i125"],
    summary: "Checkout depends on payments, which Team Ledger owns. Three incidents hit card payments: a bad deploy (112), double charges on retry (121) and an expired certificate (125).",
  },
  {
    id: "c2",
    title: "Search",
    members: ["search", "discovery", "opensearch", "i118"],
    summary: "Team Discovery owns search on OpenSearch. One incident: the index ran out of memory and search slowed (118).",
  },
];

export type Mode = "vector" | "graph" | "global";
export const MODES: { id: Mode; label: string }[] = [
  { id: "vector", label: "Vector search" },
  { id: "graph", label: "Graph walk" },
  { id: "global", label: "Community summaries" },
];

export type Question = { id: string; label: string; text: string; kind: string };

export const QUESTIONS: Question[] = [
  { id: "owner", label: "One hop", text: "Who owns the payments service?", kind: "The answer sits in one note." },
  { id: "page", label: "Multi-hop", text: "Checkout is failing on card charges. Who should I page?", kind: "Checkout calls payments, Ledger owns payments, Priya is on call for Ledger: three notes, linked only by names." },
  { id: "themes", label: "Whole dataset", text: "What keeps causing our incidents?", kind: "No single note has the answer. It is a pattern across every incident." },
];

export const TOP_K = 3;
const STOP = new Set(["the", "a", "an", "is", "on", "our", "who", "what", "should", "i", "for", "to", "of", "and", "it", "this", "in", "after", "was", "by", "through", "into"]);

export const terms = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w))
    .map((w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w));

export type Hit = { doc: Doc; score: number; shared: string[] };

export function vectorSearch(question: string): Hit[] {
  const q = new Set(terms(question));
  return DOCS.map((doc) => {
    const shared = [...new Set(terms(doc.title + " " + doc.text))].filter((w) => q.has(w));
    return { doc, score: shared.length, shared };
  })
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K);
}

export function linkEntities(question: string): string[] {
  const words = new Set(question.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/));
  return ENTITIES.filter((e) => e.aliases.some((a) => words.has(a))).map((e) => e.id);
}

export type Walk = { seeds: string[]; reached: string[][]; facts: Fact[] };

// Breadth-first: hop 1 takes every fact touching a seed, hop 2 every fact touching those, …
export function walk(question: string, hopsN: number): Walk {
  const seeds = linkEntities(question);
  const seen = new Set(seeds);
  const facts: Fact[] = [];
  const reached: string[][] = [seeds];
  let frontier = seeds;
  for (let h = 0; h < hopsN && frontier.length; h++) {
    const next: string[] = [];
    for (const f of FACTS) {
      if (facts.includes(f)) continue;
      if (!frontier.includes(f.from) && !frontier.includes(f.to)) continue;
      facts.push(f);
      for (const n of [f.from, f.to]) {
        if (seen.has(n)) continue;
        seen.add(n);
        next.push(n);
      }
    }
    reached.push(next);
    frontier = next;
  }
  return { seeds, reached, facts };
}

export const entity = (id: string) => ENTITIES.find((e) => e.id === id)!;
export const factText = (f: Fact) => `${entity(f.from).label} ${f.rel} ${entity(f.to).label}`;

export type Context = { kind: Mode; lines: string[]; facts: Set<string>; docs: Set<string>; communities: boolean; seeds: string[] };

export function retrieve(q: Question, mode: Mode, hopsN: number): Context {
  if (mode === "vector") {
    const hits = vectorSearch(q.text);
    const docs = new Set(hits.map((h) => h.doc.id));
    // A note carries every fact extracted from it.
    const facts = new Set(FACTS.filter((f) => docs.has(f.doc)).map((f) => f.id));
    return { kind: mode, lines: hits.map((h) => h.doc.text), facts, docs, communities: false, seeds: [] };
  }
  if (mode === "graph") {
    const w = walk(q.text, hopsN);
    return { kind: mode, lines: w.facts.map(factText), facts: new Set(w.facts.map((f) => f.id)), docs: new Set(w.facts.map((f) => f.doc)), communities: false, seeds: w.seeds };
  }
  // The summaries keep the big relations (checkout calls payments, Ledger owns it)
  // and drop the details, such as who is on call this week.
  return { kind: mode, lines: COMMUNITIES.map((c) => `${c.title}: ${c.summary}`), facts: new Set(["f1", "f3"]), docs: new Set(), communities: true, seeds: [] };
}

const INCIDENTS = [
  { id: "112", doc: "d4", cause: "a deploy" },
  { id: "118", doc: "d5", cause: "memory" },
  { id: "121", doc: "d6", cause: "retries" },
  { id: "125", doc: "d8", cause: "a certificate" },
];

export type Answer = { text: string; right: boolean };

// The model answers only from the context it was given.
export function answer(q: Question, ctx: Context): Answer {
  const has = (...ids: string[]) => ids.every((id) => ctx.facts.has(id));
  if (q.id === "owner") {
    return has("f3") ? { text: "Team Ledger owns the payments service.", right: true } : { text: "I can't find who owns payments in these notes.", right: false };
  }
  if (q.id === "page") {
    if (has("f1", "f3", "f5")) return { text: "Card charges go through the payments service, which Team Ledger owns. Priya is on call for Ledger this week: page Priya.", right: true };
    if (has("f2", "f6")) return { text: "Checkout is owned by Team Storefront, and Marco is on call for them: page Marco.", right: false };
    if (has("f3")) return { text: "The payments service, owned by Team Ledger, is the likely cause. I can't see who is on call for Ledger.", right: false };
    if (has("f2")) return { text: "Checkout belongs to Team Storefront. I can't see who is on call.", right: false };
    return { text: "These notes describe the failures but don't say who to page.", right: false };
  }
  if (ctx.communities) return { text: "Payments. Three of the four incidents hit card payments: a bad deploy, double charges on retry and an expired certificate. Search had one, unrelated.", right: true };
  const found = INCIDENTS.filter((i) => ctx.docs.has(i.doc));
  if (!found.length) return { text: "Nothing in the question names a service, team or person, so I have nothing to go on.", right: false };
  return { text: `Incidents ${found.map((i) => i.id).join(", ")} had different causes: ${found.map((i) => i.cause).join(", ")}. I don't see one pattern.`, right: false };
}

export const HOPS = [1, 2, 3];
