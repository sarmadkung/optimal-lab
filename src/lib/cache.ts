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

export function lru(size: number, requests = REQUESTS): CacheFrame[] {
  const cache: string[] = [];
  const frames: CacheFrame[] = [];
  let hits = 0;
  for (const key of requests) {
    const at = cache.indexOf(key);
    let evicted: string | null = null;
    if (at >= 0) {
      cache.splice(at, 1);
      cache.push(key);
      hits++;
      frames.push({ key, hit: true, evicted, cache: [...cache], hits });
      continue;
    }
    if (cache.length >= size) evicted = cache.shift() ?? null;
    cache.push(key);
    frames.push({ key, hit: false, evicted, cache: [...cache], hits });
  }
  return frames;
}
