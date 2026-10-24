// Search engines. A shop indexes 2 million products in Elasticsearch / OpenSearch. How
// each field is mapped (analysed text or an exact keyword), how the index is split into
// shards and copied into replicas, and how often it refreshes decide whether an exact
// SKU search works, whether facets work, and how the cluster holds up. The analyzer,
// term and match queries, and the sizing arithmetic run here.

// the standard analyzer: split on anything that isn't a letter or digit, lower-case
export const analyze = (s: string) => s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);

export type Doc = { id: number; name: string; sku: string; brand: string };
export const DOCS: Doc[] = [
  { id: 1, name: "Trail running shoe, waterproof", sku: "AB-1234-X", brand: "Northpeak" },
  { id: 2, name: "Road running shoe", sku: "AB-1234-Y", brand: "Northpeak" },
  { id: 3, name: "Hiking boot", sku: "CD-1234-X", brand: "Stonefield" },
  { id: 4, name: "Running socks, 3 pack", sku: "AB-5678-X", brand: "Northpeak" },
];

export type Mapping = "text" | "keyword" | "both";
export type Design = { skuMapping: Mapping; shards: number; replicas: number; refreshS: number; alias: boolean };
export const FIRST: Design = { skuMapping: "text", shards: 1, replicas: 0, refreshS: 1, alias: false };
export const FIXED: Design = { skuMapping: "both", shards: 3, replicas: 1, refreshS: 30, alias: true };
export const INDEX_GB = 60;
export const NODES = 3;
export const SEARCH_QPS_PER_SHARD_COPY = 400;
export const WRITES_PER_S = 2000; // during the nightly price update

// what's stored for the sku field under each mapping
export function terms(sku: string, m: Mapping) {
  return m === "text" ? analyze(sku) : m === "keyword" ? [sku] : [sku, ...analyze(sku)];
}

// a term query looks for the exact stored term; a match query runs the input through the
// field's own analyzer first (none for a keyword field). With "both", term queries hit the
// keyword field sku and match queries the analysed sub-field sku.text
export function searchSku(q: string, m: Mapping, kind: "term" | "match") {
  const keywordField = m === "keyword" || (m === "both" && kind === "term");
  const needles = kind === "term" || keywordField ? [q] : analyze(q);
  return DOCS.map((d) => {
    const stored = keywordField ? [d.sku] : analyze(d.sku);
    const hits = needles.filter((n) => stored.includes(n)).length;
    return { d, hits };
  })
    .filter((x) => (kind === "term" ? x.hits === needles.length : x.hits > 0))
    .sort((a, b) => b.hits - a.hits)
    .map((x) => x.d);
}

export function sizing(d: Design) {
  const shardGb = INDEX_GB / d.shards;
  const copies = d.shards * (1 + d.replicas);
  // searches spread over every copy; one node lost takes its shards' copies with it
  const searchQps = copies * SEARCH_QPS_PER_SHARD_COPY;
  const survivesNode = d.replicas >= 1 && NODES >= 2;
  // refreshing makes new writes searchable; each refresh writes a new small segment
  const segmentsPerHour = Math.round(3600 / d.refreshS) * d.shards;
  const shardOk = shardGb >= 10 && shardGb <= 50;
  return { shardGb, copies, searchQps, survivesNode, segmentsPerHour, shardOk, visibleAfterS: d.refreshS };
}

// changing the sku mapping means a new index; with an alias the app never notices
export function mappingChange(d: Design) {
  return d.alias
    ? { downtime: 0, steps: ["create products_v2 with the new mapping", "reindex products_v1 → products_v2", "move the alias products → products_v2 in one atomic call"] }
    : { downtime: 25, steps: ["the app queries the index products by name", "delete it, recreate it with the new mapping", "reindex 2 million documents while search returns nothing"] };
}
