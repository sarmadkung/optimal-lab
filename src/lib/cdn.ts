// A CDN in front of one origin server. Users in three cities ask for /logo.png once per tick.
// Each city's nearest edge keeps a copy for TTL ticks (Cache-Control: max-age). A hit is
// served from the edge; a miss goes to the origin in Virginia first. At DEPLOY_AT a new logo
// ships to the origin. Edges keep serving the old one until their copy expires, unless you
// purge on deploy or use versioned file names (logo.v2.png), which are new cache keys.

export const TICKS = 14;
export const DEPLOY_AT = 6;

export type Region = { id: string; city: string; edgeMs: number; originMs: number };

export const REGIONS: Region[] = [
  { id: "khi", city: "Karachi", edgeMs: 12, originMs: 240 },
  { id: "lon", city: "London", edgeMs: 10, originMs: 85 },
  { id: "nyc", city: "New York", edgeMs: 8, originMs: 15 },
];

export type Update = "wait" | "purge" | "versioned";

export const UPDATES: { id: Update; label: string; detail: string }[] = [
  { id: "wait", label: "Wait for the TTL", detail: "Do nothing. Each edge refetches when its copy expires." },
  { id: "purge", label: "Purge on deploy", detail: "Tell every edge to drop its copy the moment you ship." },
  { id: "versioned", label: "Versioned file name", detail: "The page links logo.v2.png: a new URL, so a new cache entry." },
];

export type Serve = { region: string; hit: boolean; version: 1 | 2; stale: boolean; ms: number };

export type CdnFrame = {
  tick: number;
  serves: Serve[];
  /** per region: cached version and the tick it expires (null when empty) */
  edges: Record<string, { version: 1 | 2; expires: number } | null>;
  originHits: number;
  event: string;
};

export function simulate(ttl: number, update: Update): CdnFrame[] {
  const edges: CdnFrame["edges"] = Object.fromEntries(REGIONS.map((r) => [r.id, null]));
  const frames: CdnFrame[] = [];
  let originHits = 0;
  for (let t = 0; t < TICKS; t++) {
    const current: 1 | 2 = t >= DEPLOY_AT ? 2 : 1;
    let event = "";
    if (t === DEPLOY_AT) {
      if (update === "purge") {
        for (const r of REGIONS) edges[r.id] = null;
        event = "New logo deployed. A purge empties every edge, so the next request goes to the origin.";
      } else if (update === "versioned") event = "New logo deployed as logo.v2.png. The page now asks for a URL no edge has cached yet.";
      else event = "New logo deployed to the origin. The edges don't know.";
    }
    const serves: Serve[] = REGIONS.map((r) => {
      const cached = edges[r.id];
      // a versioned URL is a different cache key: an old copy never matches it
      const usable = cached && cached.expires > t && (update !== "versioned" || cached.version === current);
      if (usable) return { region: r.id, hit: true, version: cached.version, stale: cached.version !== current, ms: r.edgeMs };
      originHits++;
      if (ttl > 0) edges[r.id] = { version: current, expires: t + ttl };
      else edges[r.id] = null;
      return { region: r.id, hit: false, version: current, stale: false, ms: r.edgeMs + r.originMs };
    });
    if (!event) {
      const stale = serves.filter((s) => s.stale).map((s) => REGIONS.find((r) => r.id === s.region)!.city);
      const misses = serves.filter((s) => !s.hit).length;
      event = stale.length
        ? `${listOf(stale)} still ${stale.length === 1 ? "gets" : "get"} the old logo from the edge.`
        : misses === 0
          ? "All three served from their nearest edge."
          : `${misses} ${misses === 1 ? "edge" : "edges"} had to go to the origin.`;
    }
    frames.push({ tick: t, serves, edges: JSON.parse(JSON.stringify(edges)), originHits, event });
  }
  return frames;
}

export function totals(frames: CdnFrame[]) {
  const all = frames.flatMap((f) => f.serves);
  const hits = all.filter((s) => s.hit).length;
  return {
    hitRatio: all.length ? hits / all.length : 0,
    originHits: frames.at(-1)?.originHits ?? 0,
    stale: all.filter((s) => s.stale).length,
    avgMs: Object.fromEntries(REGIONS.map((r) => {
      const mine = all.filter((s) => s.region === r.id);
      return [r.id, Math.round(mine.reduce((sum, s) => sum + s.ms, 0) / Math.max(1, mine.length))];
    })) as Record<string, number>,
  };
}

function listOf(items: string[]) {
  return items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}
