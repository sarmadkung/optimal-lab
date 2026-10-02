// Least-recently-used cache. A hit moves the key to the front of the recency list.
// A miss on a full cache drops the least recent key first.

export const REQUESTS = ["a", "b", "a", "c", "a", "b", "a"];

export type CacheFrame = {
  key: string;
  hit: boolean;
  evicted: string | null;
  cache: string[]; // index 0 is least recent
  hits: number;
};

export type LruStep = {
  cache: string[];
  hit: boolean;
  evicted: string | null;
};

// `cache` index 0 is least recent. The returned cache is a new array.
export function applyLru(cache: string[], size: number, key: string): LruStep {
  const next = [...cache];
  const at = next.indexOf(key);
  if (at >= 0) {
    next.splice(at, 1);
    next.push(key);
    return { cache: next, hit: true, evicted: null };
  }
  const evicted = next.length >= size ? (next.shift() ?? null) : null;
  next.push(key);
  return { cache: next, hit: false, evicted };
}

export function lru(size: number, requests = REQUESTS): CacheFrame[] {
  let cache: string[] = [];
  let hits = 0;
  return requests.map((key) => {
    const step = applyLru(cache, size, key);
    cache = step.cache;
    if (step.hit) hits += 1;
    return { key, hit: step.hit, evicted: step.evicted, cache: [...cache], hits };
  });
}

// Cache state after `history`, plus the frame produced by reading `key` next.
export function preview(size: number, history: string[], key: string) {
  const before = lru(size, history).at(-1);
  const after = lru(size, [...history, key]).at(-1)!;
  return {
    cache: before?.cache ?? [],
    hits: before?.hits ?? 0,
    seen: history.length,
    after,
  };
}
