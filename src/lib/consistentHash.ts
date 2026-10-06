// Consistent hashing vs plain modulo. Servers and keys are hashed onto the same ring of
// 2^32 points. A key belongs to the first server clockwise from it. Adding or removing a
// server only moves the keys in that server's slice. With `hash(key) % n`, changing n
// moves almost every key. Virtual nodes put each server on the ring many times, so the
// slices even out.

/** 32-bit FNV-1a: small, deterministic, good enough to spread short strings. */
export function hash(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  // final avalanche so similar strings land far apart
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  return h >>> 0;
}

export const RING = 2 ** 32;
export const ALL_SERVERS = ["A", "B", "C", "D", "E"];
export const KEYS = Array.from({ length: 60 }, (_, i) => `user:${i + 1}`);

export type Point = { server: string; pos: number; vnode: number };

export function ringPoints(servers: string[], vnodes: number): Point[] {
  return servers
    .flatMap((server) => Array.from({ length: vnodes }, (_, v) => ({ server, vnode: v, pos: hash(`${server}#${v}`) })))
    .sort((a, b) => a.pos - b.pos);
}

/** First point clockwise from the key; wraps to the start of the ring. */
export function ownerOnRing(key: string, points: Point[]) {
  const pos = hash(key);
  return (points.find((p) => p.pos >= pos) ?? points[0]).server;
}

export function ownerByModulo(key: string, servers: string[]) {
  return servers[hash(key) % servers.length];
}

export type Strategy = "ring" | "modulo";

export function assign(servers: string[], vnodes: number, strategy: Strategy) {
  const points = ringPoints(servers, vnodes);
  const owner: Record<string, string> = {};
  for (const k of KEYS) owner[k] = strategy === "ring" ? ownerOnRing(k, points) : ownerByModulo(k, servers);
  const load: Record<string, number> = Object.fromEntries(servers.map((s) => [s, 0]));
  for (const k of KEYS) load[owner[k]]++;
  return { points, owner, load };
}

/** Keys whose server changed between two assignments. */
export function moved(before: Record<string, string>, after: Record<string, string>) {
  return KEYS.filter((k) => before[k] !== after[k]);
}

export const angle = (pos: number) => (pos / RING) * 360;
