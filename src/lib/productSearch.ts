// Search that understands meaning, as a product feature: an outdoor shop's catalogue
// and eight queries from its search log. Keyword scoring, filter parsing, reciprocal
// rank fusion and the no-match threshold really run; the embedding similarities are
// illustrative (a real system gets them from an embedding model).

export type Product = { sku: string; name: string; desc: string; price: number; people?: number };

export const CATALOG: Product[] = [
  { sku: "4401", name: "Stormline rain jacket", desc: "Waterproof, breathable shell with taped seams.", price: 180 },
  { sku: "4402", name: "Fleece midlayer", desc: "Warm fleece for cold mornings.", price: 65 },
  { sku: "4403", name: "Trail running vest", desc: "Lightweight hydration vest with 2 soft flasks.", price: 95 },
  { sku: "4404", name: "Merino running socks", desc: "Cushioned socks that don't blister.", price: 22 },
  { sku: "4471", name: "Ridge 2 tent", desc: "Two-person backpacking tent, 1.6 kg.", price: 189, people: 2 },
  { sku: "4472", name: "Basecamp 4 tent", desc: "Four-person family tent with a porch.", price: 340, people: 4 },
  { sku: "4473", name: "Summit 2 UL tent", desc: "Ultralight two-person tent, 1.1 kg.", price: 420, people: 2 },
  { sku: "4480", name: "Polar sleeping bag", desc: "Down bag rated to −10 °C.", price: 260 },
  { sku: "4481", name: "Summer sleeping bag", desc: "Light sleeping bag rated to +8 °C.", price: 90 },
  { sku: "4490", name: "Beam 400 headlamp", desc: "400 lumen rechargeable headlamp.", price: 45 },
  { sku: "4491", name: "Dry bag 20 L", desc: "Roll-top bag keeps gear dry on the water.", price: 28 },
  { sku: "4492", name: "Trail gaiters", desc: "Keep mud, rain and snow out of your boots.", price: 38 },
  { sku: "4493", name: "Pack rain cover", desc: "Waterproof cover for 30–50 L backpacks.", price: 24 },
  { sku: "4494", name: "Carbon trekking poles", desc: "Light poles for steep descents.", price: 110 },
];

export type Query = { id: string; text: string; want: string[]; why: string; sim: Record<string, number> };
export const DEFAULT_SIM = 0.15;
export const QUERIES: Query[] = [
  { id: "q1", text: "waterproof jacket", want: ["4401"], why: "The words are in the product. Everything works.", sim: { "4401": 0.82, "4493": 0.58, "4402": 0.52, "4492": 0.47 } },
  { id: "q2", text: "something to keep me dry on a hike", want: ["4401", "4493", "4492"], why: "The user describes a need, not a product. “Dry” and “keep” match the dry bag, which is for boats.", sim: { "4401": 0.71, "4493": 0.66, "4492": 0.62, "4491": 0.6 } },
  { id: "q3", text: "torch", want: ["4490"], why: "British for flashlight. No product says “torch”, so keyword search finds nothing.", sim: { "4490": 0.74, "4491": 0.31 } },
  { id: "q4", text: "2 person tent under $200", want: ["4471"], why: "A price limit and a size are filters, not meaning. Similarity alone ranks the $420 tent first.", sim: { "4473": 0.79, "4471": 0.77, "4472": 0.71 } },
  { id: "q5", text: "4471", want: ["4471"], why: "A product code. Embeddings place one number near any other; exact matching is what's needed.", sim: { "4472": 0.41, "4471": 0.4, "4473": 0.39, "4480": 0.33 } },
  { id: "q6", text: "gift for a trail runner", want: ["4403", "4404"], why: "Intent words like “gift” match nothing; “runner” isn't “running”.", sim: { "4403": 0.69, "4404": 0.63, "4494": 0.52 } },
  { id: "q7", text: "sleeping bag for winter camping", want: ["4480"], why: "Both bags say “sleeping bag”; only meaning connects “winter” to −10 °C.", sim: { "4480": 0.81, "4481": 0.72, "4402": 0.44 } },
  { id: "q8", text: "kayak", want: [], why: "The shop sells no kayaks. Semantic search still returns its nearest neighbour, the dry bag.", sim: { "4491": 0.46, "4493": 0.33, "4494": 0.29 } },
];

const STOP = new Set(["a", "an", "the", "to", "for", "on", "me", "my", "something", "under", "with", "of", "and", "that", "your", "out"]);
export function tokens(s: string) {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !STOP.has(t))
    .map((t) => (t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t));
}

// BM25-style keyword score over name (counted twice) and description, plus an exact SKU match.
export function keywordScores(q: string, pool: Product[]) {
  const qt = tokens(q);
  const docs = pool.map((p) => [...tokens(p.name), ...tokens(p.name), ...tokens(p.desc)]);
  const avg = docs.reduce((n, d) => n + d.length, 0) / Math.max(1, docs.length);
  const N = CATALOG.length;
  return pool.map((p, i) => {
    let s = qt.includes(p.sku) ? 10 : 0;
    for (const t of qt) {
      const tf = docs[i].filter((x) => x === t).length;
      if (!tf) continue;
      const df = CATALOG.filter((c) => [...tokens(c.name), ...tokens(c.desc)].includes(t)).length;
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
      s += (idf * tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * (docs[i].length / avg)));
    }
    return { p, score: s };
  });
}

export type Filters = { maxPrice?: number; people?: number };
const WORDNUM: Record<string, number> = { one: 1, two: 2, three: 3, four: 4 };
export function parseFilters(q: string): Filters {
  const f: Filters = {};
  const price = q.match(/under \$?(\d+)/i);
  if (price) f.maxPrice = Number(price[1]);
  const ppl = q.match(/\b(\d+|one|two|three|four)[ -]person\b/i);
  if (ppl) f.people = WORDNUM[ppl[1].toLowerCase()] ?? Number(ppl[1]);
  return f;
}
// The words that only expressed a filter are removed from the text that gets matched.
const stripFilters = (q: string) => q.replace(/under \$?\d+/i, "").replace(/\b(\d+|one|two|three|four)[ -]person\b/i, "").trim();

export type Method = "keyword" | "semantic" | "hybrid";
export const METHODS: { id: Method; label: string; ms: number }[] = [
  { id: "keyword", label: "Keyword", ms: 5 },
  { id: "semantic", label: "Semantic", ms: 25 },
  { id: "hybrid", label: "Hybrid", ms: 30 },
];
export const THRESHOLD = 0.5;
export const RRF_K = 60;

export type Options = { method: Method; filters: boolean; threshold: boolean };
export type Hit = { p: Product; score: number; kw: number; sem: number; kwRank: number | null; semRank: number | null };

export function search(q: Query, o: Options) {
  const filters = o.filters ? parseFilters(q.text) : {};
  const pool = CATALOG.filter((p) => (filters.maxPrice === undefined || p.price <= filters.maxPrice) && (filters.people === undefined || p.people === filters.people));
  const text = o.filters ? stripFilters(q.text) : q.text;
  const kwAll = keywordScores(text, pool);
  const kwRanked = kwAll.filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  const semRanked = pool.map((p) => ({ p, score: q.sim[p.sku] ?? DEFAULT_SIM })).sort((a, b) => b.score - a.score);
  const rank = (list: { p: Product }[], sku: string) => {
    const i = list.findIndex((x) => x.p.sku === sku);
    return i < 0 ? null : i + 1;
  };
  const hits: Hit[] = pool.map((p) => {
    const kwRank = rank(kwRanked, p.sku);
    const semRank = rank(semRanked, p.sku);
    const kw = kwAll.find((x) => x.p.sku === p.sku)!.score;
    const sem = q.sim[p.sku] ?? DEFAULT_SIM;
    const score =
      o.method === "keyword" ? kw
      : o.method === "semantic" ? sem
      : (kwRank ? 1 / (RRF_K + kwRank) : 0) + (semRank ? 1 / (RRF_K + semRank) : 0);
    return { p, score, kw, sem, kwRank, semRank };
  });
  let results = hits.filter((h) => (o.method === "keyword" ? h.kw > 0 : true)).sort((a, b) => b.score - a.score);
  const bestSem = Math.max(0, ...hits.map((h) => h.sem));
  const noKeyword = kwRanked.length === 0;
  // below the threshold, say so instead of showing the nearest thing
  const noMatch = o.method !== "keyword" && o.threshold && bestSem < THRESHOLD && noKeyword;
  if (noMatch) results = [];
  const top = results.slice(0, 3);
  const success = q.want.length === 0 ? top.length === 0 : !!top[0] && q.want.includes(top[0].p.sku);
  return { filters, pool: pool.length, text, top, noMatch, empty: top.length === 0, success, bestSem };
}

export function scoreAll(o: Omit<Options, "method">, method: Method) {
  const rows = QUERIES.map((q) => ({ q, r: search(q, { ...o, method }) }));
  return {
    rows,
    right: rows.filter((x) => x.r.success).length,
    zero: rows.filter((x) => x.r.empty && x.q.want.length > 0).length,
    junk: rows.filter((x) => !x.r.empty && x.q.want.length === 0).length,
  };
}
