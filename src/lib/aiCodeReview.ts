// AI code review. Twelve pull requests with ten real bugs planted in them. A model
// reviewer comments on each; most comments are noise. The comments are synthetic and
// seeded (what such a reviewer typically produces); the filters, precision and recall
// really run.

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Kind = "bug" | "security" | "style" | "nit";
export type Comment = { pr: number; kind: Kind; conf: number; real: boolean; evidence: boolean; text: string };

const BUGS = [
  "Off-by-one: the loop skips the last page of results.",
  "The refund amount is in pounds but the API expects pence.",
  "`await` missing: the email is sent before the order is saved.",
  "The cache key ignores the user id, so users can see each other's carts.",
  "SQL built by string concatenation from the search box.",
  "Timezone: `new Date(y, m, d)` uses the server's zone for a UTC date.",
  "The retry loop never increments its counter.",
  "Deleting a team leaves its invites behind.",
  "The feature flag check is inverted.",
  "An error is caught and swallowed, so the job reports success.",
];
const NOISE: Record<Kind, string[]> = {
  bug: ["Possible null dereference of `user` (it is checked two lines above).", "This could throw if the list is empty (it can't be, by the schema).", "Consider handling the error here (it is handled by the caller)."],
  security: ["Validate this input (it comes from a typed internal call).", "Potential injection risk (the value is a constant)."],
  style: ["Consider extracting this into a helper.", "This function is getting long.", "Prefer early returns here."],
  nit: ["Rename `x` to something descriptive.", "Missing trailing comma.", "Typo in comment: “recieve”."],
};

export const PRS = 12;
export const COMMENTS: Comment[] = (() => {
  const r = mulberry32(8);
  const out: Comment[] = [];
  // the ten real bugs, spread over the PRs; the reviewer notices eight of them
  BUGS.forEach((text, i) => {
    const pr = (i * 5) % PRS;
    const noticed = i !== 3 && i !== 7; // the cache-key leak and the orphaned invites need context the diff doesn't show
    if (noticed) out.push({ pr, kind: i === 4 || i === 3 ? "security" : "bug", conf: 0.6 + 0.35 * r(), real: true, evidence: r() < 0.85, text });
  });
  for (let pr = 0; pr < PRS; pr++) {
    const n = 3 + Math.floor(r() * 4);
    for (let k = 0; k < n; k++) {
      const u = r();
      const kind: Kind = u < 0.35 ? "style" : u < 0.6 ? "nit" : u < 0.9 ? "bug" : "security";
      const pool = NOISE[kind];
      const conf = kind === "style" || kind === "nit" ? 0.4 + 0.5 * r() : 0.3 + 0.5 * r();
      out.push({ pr, kind, conf, real: false, evidence: r() < 0.25, text: pool[Math.floor(r() * pool.length)] });
    }
  }
  return out;
})();
export const REAL_BUGS = BUGS.length;

export type Filters = { hideStyle: boolean; minConf: number; evidence: boolean };
export const THRESHOLDS = [0, 0.5, 0.7, 0.85];

export function review(f: Filters) {
  const shown = COMMENTS.filter((c) => (!f.hideStyle || (c.kind !== "style" && c.kind !== "nit")) && c.conf >= f.minConf && (!f.evidence || c.evidence));
  const caught = shown.filter((c) => c.real).length;
  return {
    shown,
    perPr: shown.length / PRS,
    caught,
    precision: shown.length ? caught / shown.length : 0,
    recall: caught / REAL_BUGS,
    noise: shown.length - caught,
  };
}
