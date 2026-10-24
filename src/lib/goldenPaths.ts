// Thirty services created over a year while the company's standards change twice: in month 4
// every image must carry an SBOM and a signature; in month 9 the old base image reaches end of
// life. Services start from a template or by copying a recent repository; template changes can
// reach existing services as pull requests. Which PRs get merged is a fixed draw.

export type Design = { template: boolean; observability: boolean; security: boolean; updates: boolean; scorecards: boolean };
export const FIRST: Design = { template: false, observability: false, security: false, updates: false, scorecards: false };
export const FIXED: Design = { template: true, observability: true, security: true, updates: true, scorecards: true };

export const SERVICES = 30;
export const MONTHS = 12;
export const CHANGES = [
  { month: 4, version: 2, what: "images must ship an SBOM and a signature" },
  { month: 9, version: 3, what: "the old base image is end-of-life; move to the new one" },
];
export const MERGE_RATE = { plain: 0.6, scorecards: 0.95 };
export const CREATE_HOURS = { copy: 16, template: 1 };

const versionAt = (month: number) => CHANGES.filter((c) => month >= c.month).reduce((v, c) => Math.max(v, c.version), 1);

export type Svc = { i: number; created: number; version: number; obs: boolean; sec: boolean; viaTemplate: boolean; prsMissed: number };

export function simulate(d: Design) {
  const svcs: Svc[] = [];
  for (let i = 0; i < SERVICES; i++) {
    const created = Math.floor((i * MONTHS) / SERVICES);
    let s: Svc;
    if (d.template) s = { i, created, version: versionAt(created), obs: d.observability, sec: d.security && versionAt(created) >= 2, viaTemplate: true, prsMissed: 0 };
    else {
      // A copy of a recent service. Half the teams read the wiki and apply the current
      // standard by hand; dashboards live outside the repo, so a third build their own.
      const src = svcs[Math.max(0, i - 3)];
      const followsWiki = i % 2 === 0;
      const version = followsWiki ? versionAt(created) : (src?.version ?? 1);
      s = { i, created, version, obs: i % 3 === 0, sec: version >= 2 && followsWiki, viaTemplate: false, prsMissed: 0 };
    }
    svcs.push(s);
  }
  // Each standards change opens a PR on every template-made service that existed by then.
  const rate = d.scorecards ? MERGE_RATE.scorecards : MERGE_RATE.plain;
  for (const c of CHANGES) {
    for (const s of svcs.filter((x) => x.created < c.month && x.viaTemplate)) {
      if (!d.updates) {
        s.prsMissed++;
        continue;
      }
      const merged = ((s.i * 37 + c.month * 11) % 100) / 100 < rate;
      if (merged && s.version < c.version) {
        s.version = c.version;
        if (c.version >= 2 && d.security) s.sec = true;
      } else if (!merged) s.prsMissed++;
    }
  }
  const current = svcs.filter((s) => s.version === 3).length;
  const signed = svcs.filter((s) => s.sec && s.version >= 2).length;
  const observed = svcs.filter((s) => s.obs).length;
  const variants = new Set(svcs.map((s) => `${s.version}${s.obs}${s.sec}`)).size;
  const hours = SERVICES * (d.template ? CREATE_HOURS.template : CREATE_HOURS.copy);
  return { svcs, current, signed, observed, variants, hours };
}
