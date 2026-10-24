// Connecting APIs. A nightly job copies 18,000 contacts out of a CRM's API while people
// keep adding and deleting contacts. The API sorts newest first, allows 10 requests a
// second, and issues access tokens that last 30 minutes. The API, the rate limiter, the
// token, the changes during the run and the client all run here, request by request.

export const CONTACTS = 18_000;
export const PAGE = 100;
export const LIMIT_PER_SEC = 10;
export const CLIENT_PER_SEC = 16; // how fast the job sends when nothing stops it
export const TOKEN_MIN = 30;
export const ADD_EVERY = 30; // seconds between contacts added during the run
export const DELETE_EVERY = 40; // seconds between contacts deleted during the run
export const MAX_RETRIES = 3;

export type Auth = "static" | "refresh";
export type Paging = "offset" | "cursor";
export type Details = "each" | "batch";
export type On429 = "fail" | "immediate" | "retry-after";
export type Design = { auth: Auth; paging: Paging; details: Details; on429: On429 };
export const FIRST: Design = { auth: "static", paging: "offset", details: "each", on429: "fail" };
export const FIXED: Design = { auth: "refresh", paging: "cursor", details: "batch", on429: "retry-after" };

export type Result = {
  ok: boolean;
  stoppedBy: string | null;
  seconds: number;
  requests: number;
  rejected429: number;
  refreshes: number;
  synced: number; // contacts that existed at the start, weren't deleted, and were copied
  expected: number;
  duplicates: number;
  skipped: number; // missed by paging
  gaveUp: number; // missed after too many retries
  timeline: { t: number; ok: number; r429: number }[]; // per 10-second bucket
};

// a small seeded generator so every run is the same
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x6d2b79f5) >>> 0) / 2 ** 32);
}

export function simulate(d: Design): Result {
  const rand = rng(7);
  // newest first: index 0 is the newest contact; ids grow with creation time
  let list: number[] = Array.from({ length: CONTACTS }, (_, i) => CONTACTS - i);
  const atStart = new Set(list);
  const deleted = new Set<number>();
  let nextId = CONTACTS + 1;
  let lastAdd = 0;
  let lastDelete = 0;

  let t = 0;
  let windowStart = 0;
  let used = 0;
  let requests = 0;
  let r429 = 0;
  let refreshes = 0;
  let tokenExpires = TOKEN_MIN * 60;
  const seen = new Map<number, number>();
  const copied = new Set<number>();
  let gaveUp = 0;
  const buckets = new Map<number, { ok: number; r429: number }>();
  const bucket = (k: "ok" | "r429") => {
    const b = Math.floor(t / 10) * 10;
    const cur = buckets.get(b) ?? { ok: 0, r429: 0 };
    cur[k]++;
    buckets.set(b, cur);
  };

  // the world changes while the job runs
  const advance = (to: number) => {
    while (lastAdd + ADD_EVERY <= to) {
      lastAdd += ADD_EVERY;
      list.unshift(nextId++);
    }
    while (lastDelete + DELETE_EVERY <= to) {
      lastDelete += DELETE_EVERY;
      const i = Math.floor(rand() * list.length);
      deleted.add(list[i]);
      list = [...list.slice(0, i), ...list.slice(i + 1)];
    }
    t = to;
  };

  // one HTTP request through auth and the rate limiter; returns false if the run must stop
  let stop: string | null = null;
  const send = (): "ok" | "gave-up" | "stop" => {
    for (let attempt = 0; ; attempt++) {
      if (t >= tokenExpires) {
        if (d.auth === "static") {
          stop = `401 Unauthorized: the access token expired after ${TOKEN_MIN} minutes`;
          return "stop";
        }
        refreshes++;
        requests++;
        advance(t + 0.3);
        tokenExpires = t + TOKEN_MIN * 60;
      }
      if (t - windowStart >= 1) {
        windowStart = Math.floor(t);
        used = 0;
      }
      requests++;
      if (used < LIMIT_PER_SEC) {
        used++;
        bucket("ok");
        advance(t + 1 / CLIENT_PER_SEC);
        return "ok";
      }
      r429++;
      bucket("r429");
      if (d.on429 === "fail") {
        stop = "429 Too Many Requests: the job treats it as an error";
        return "stop";
      }
      if (d.on429 === "retry-after") {
        advance(windowStart + 1); // Retry-After: 1
        continue;
      }
      advance(t + 1 / CLIENT_PER_SEC);
      if (attempt + 1 > MAX_RETRIES) return "gave-up";
    }
  };

  let offset = 0;
  let cursor = Infinity; // ids below this are still to come
  for (;;) {
    // list one page of ids
    const s = send();
    if (s === "stop") break;
    if (s === "gave-up") {
      offset += PAGE; // a whole page of contacts is never listed
      continue;
    }
    const page = d.paging === "offset" ? list.slice(offset, offset + PAGE) : list.filter((id) => id < cursor).slice(0, PAGE);
    if (!page.length) break;
    offset += PAGE;
    cursor = page[page.length - 1];
    page.forEach((id) => seen.set(id, (seen.get(id) ?? 0) + 1));

    // read the details: one call per contact, or one batch call for the page
    if (d.details === "batch") {
      const b = send();
      if (b === "stop") break;
      if (b === "gave-up") gaveUp += page.length;
      else page.forEach((id) => copied.add(id));
    } else {
      for (const id of page) {
        const b = send();
        if (b === "stop") break;
        if (b === "gave-up") gaveUp++;
        else copied.add(id);
      }
      if (stop) break;
    }
  }

  const expected = [...atStart].filter((id) => !deleted.has(id)).length;
  const synced = [...copied].filter((id) => atStart.has(id) && !deleted.has(id)).length;
  const duplicates = [...seen.values()].reduce((a, n) => a + Math.max(0, n - 1), 0);
  const skipped = stop ? 0 : [...atStart].filter((id) => !deleted.has(id) && !seen.has(id)).length;
  return {
    ok: !stop,
    stoppedBy: stop,
    seconds: Math.round(t),
    requests,
    rejected429: r429,
    refreshes,
    synced,
    expected,
    duplicates,
    skipped,
    gaveUp,
    timeline: [...buckets.entries()].sort((a, b) => a[0] - b[0]).map(([bt, v]) => ({ t: bt, ...v })),
  };
}
