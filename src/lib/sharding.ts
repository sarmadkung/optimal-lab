// Splitting one big table over four database shards. The shard key decides where each row
// lives, which shards get the writes, and how many shards a query has to ask.
// Table: orders, 48 rows, from customers in four countries, placed over the last 12 months.
//   hash(customer_id) % 4   spreads rows evenly; a query by country asks every shard
//   country                 one shard per country; a busy country becomes a hot shard
//   month (range)           shard 4 holds the newest months, so it takes every new write

export const SHARDS = 4;

export type Order = { id: number; customer: number; country: string; month: number };

const COUNTRIES = ["PK", "PK", "PK", "PK", "PK", "AE", "AE", "GB", "GB", "US"]; // PK is the busy market

// Deterministic sample so every reader sees the same table.
export const ORDERS: Order[] = Array.from({ length: 48 }, (_, i) => ({
  id: 1001 + i,
  customer: 7 + ((i * 37) % 41),
  country: COUNTRIES[(i * 7) % COUNTRIES.length],
  month: 1 + Math.floor(i / 4),
}));

export type Key = "hash" | "country" | "month";

export const KEYS: { id: Key; label: string; rule: string }[] = [
  { id: "hash", label: "hash(customer_id)", rule: "shard = hash(customer_id) % 4" },
  { id: "country", label: "country", rule: "PK → 1, AE → 2, GB → 3, US → 4" },
  { id: "month", label: "month (range)", rule: "months 1–3 → 1, 4–6 → 2, 7–9 → 3, 10–12 → 4" },
];

const COUNTRY_SHARD: Record<string, number> = { PK: 0, AE: 1, GB: 2, US: 3 };

// Knuth multiplicative hash with a final mix, so neighbouring ids land on different shards.
const mix = (n: number) => {
  let h = Math.imul(n, 0x9e3779b1) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  return h >>> 0;
};

export function shardOf(o: Pick<Order, "customer" | "country" | "month">, key: Key) {
  if (key === "hash") return mix(o.customer) % SHARDS;
  if (key === "country") return COUNTRY_SHARD[o.country];
  return Math.min(SHARDS - 1, Math.floor((o.month - 1) / 3));
}

export type Query = { id: string; label: string; sql: string; match: (o: Order) => boolean; /** shards the router can pick without asking all */ target: (key: Key) => number[] | null };

export const QUERIES: Query[] = [
  {
    id: "customer",
    label: "One customer's orders",
    sql: "WHERE customer_id = 19",
    match: (o) => o.customer === 19,
    target: (key) => (key === "hash" ? [shardOf({ customer: 19, country: "PK", month: 1 }, "hash")] : null),
  },
  {
    id: "country",
    label: "Orders from the UAE",
    sql: "WHERE country = 'AE'",
    match: (o) => o.country === "AE",
    target: (key) => (key === "country" ? [COUNTRY_SHARD.AE] : null),
  },
  {
    id: "recent",
    label: "Last month's orders",
    sql: "WHERE month = 12",
    match: (o) => o.month === 12,
    target: (key) => (key === "month" ? [SHARDS - 1] : null),
  },
];

/** New orders arriving this month, for the write-load bars. */
export const NEW_WRITES: Pick<Order, "customer" | "country" | "month">[] = Array.from({ length: 20 }, (_, i) => ({
  customer: 100 + i * 13,
  country: COUNTRIES[(i * 3) % COUNTRIES.length],
  month: 12,
}));

export function layout(key: Key) {
  const rows = Array.from({ length: SHARDS }, () => [] as Order[]);
  for (const o of ORDERS) rows[shardOf(o, key)].push(o);
  const writes = Array.from({ length: SHARDS }, () => 0);
  for (const w of NEW_WRITES) writes[shardOf(w, key)]++;
  return { rows, writes };
}

export function route(query: Query, key: Key) {
  const target = query.target(key);
  const asked = target ?? Array.from({ length: SHARDS }, (_, i) => i);
  const { rows } = layout(key);
  const hits = rows.map((r) => r.filter(query.match).length);
  return { asked, scatter: target === null, hits, total: hits.reduce((s, x) => s + x, 0) };
}
