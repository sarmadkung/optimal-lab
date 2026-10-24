// One quarter of releases through dev, staging and production, and five incidents that
// come from environments being different. Each parity measure removes one difference;
// the migration timing scales with real row counts. Costs and rates are illustrative.

export type Design = { buildOnce: boolean; sameModule: boolean; configCheck: boolean; prodData: boolean; previews: boolean };
export type IncidentId = "artifact" | "version" | "config" | "migration" | "contention";

export const FIRST: Design = { buildOnce: false, sameModule: false, configCheck: false, prodData: false, previews: false };
export const FIXED: Design = { buildOnce: true, sameModule: true, configCheck: true, prodData: true, previews: true };

export const ROWS = { staging: 50_000, production: 90_000_000 };
export const ROWS_PER_SECOND = 40_000; // index build speed on this table
export const TEAMS = 6;
export const DEPLOYS_PER_TEAM = 2; // to staging, per day
export const SLOT_HOURS = 1.5; // one team testing on shared staging
export const WORK_HOURS = 10;
export const PREVIEW = { openPrs: 14, perHour: 0.09, hoursPerMonth: 730 };
export const PROD_SIZE_STAGING = 620; // extra $ a month for a production-sized staging database

export const INCIDENTS: { id: IncidentId; title: string; measure: keyof Design; step: number }[] = [
  { id: "artifact", title: "Production runs code staging never saw", measure: "buildOnce", step: 0 },
  { id: "version", title: "A query uses MERGE: fine in staging, error in production", measure: "sameModule", step: 1 },
  { id: "config", title: "A new setting exists only in staging", measure: "configCheck", step: 2 },
  { id: "migration", title: "An index migration takes 1 second in staging", measure: "prodData", step: 3 },
  { id: "contention", title: "Six teams share one staging", measure: "previews", step: 4 },
];

const secs = (rows: number) => rows / ROWS_PER_SECOND;
export function fmtDuration(s: number) {
  return s < 90 ? `${Math.round(s * 10) / 10} s` : `${Math.round(s / 60)} min`;
}

export function staging(d: Design) {
  const demand = TEAMS * DEPLOYS_PER_TEAM;
  const fit = Math.floor(WORK_HOURS / SLOT_HOURS);
  return d.previews ? { demand, fit: demand, waiting: 0 } : { demand, fit, waiting: Math.max(0, demand - fit) };
}

export function judge(id: IncidentId, d: Design): { caught: boolean; text: string } {
  switch (id) {
    case "artifact":
      return d.buildOnce
        ? { caught: true, text: "production pulls the exact image digest staging tested" }
        : { caught: false, text: "the deploy rebuilds from source and picks up a newer base image and a minor dependency update; nothing tested that build" };
    case "version":
      return d.sameModule
        ? { caught: true, text: "every environment comes from one Terraform module with Postgres pinned to 14, so staging fails first: MERGE needs 15" }
        : { caught: false, text: "staging was set up by hand on Postgres 16; production is 14, where MERGE doesn't exist" };
    case "config":
      return d.configCheck
        ? { caught: true, text: "the deploy checks production's config against the schema and stops: PAYMENT_WEBHOOK_SECRET is missing" }
        : { caught: false, text: "someone set PAYMENT_WEBHOOK_SECRET on staging by hand; production starts without it and fails on the first webhook" };
    case "migration":
      return d.prodData
        ? { caught: true, text: `on a masked copy of production data the index takes ${fmtDuration(secs(ROWS.production))} and locks writes; it is rewritten to build concurrently` }
        : { caught: false, text: `${fmtDuration(secs(ROWS.staging))} on staging's ${ROWS.staging.toLocaleString("en-US")} rows; ${fmtDuration(secs(ROWS.production))} of blocked writes on production's ${ROWS.production.toLocaleString("en-US")}` };
    case "contention": {
      const s = staging(d);
      return d.previews
        ? { caught: true, text: "each pull request gets its own short-lived copy; nobody waits and nobody tests on top of someone else's half-finished change" }
        : { caught: false, text: `${s.demand} test slots wanted a day, ${s.fit} fit; ${s.waiting} wait until tomorrow, and a broken change blocks everyone` };
    }
  }
}

export function quarter(d: Design) {
  const rows = INCIDENTS.map((i) => ({ incident: i, ...judge(i.id, d) }));
  const previewCost = d.previews ? Math.round(PREVIEW.openPrs * PREVIEW.perHour * PREVIEW.hoursPerMonth) : 0;
  return { rows, caught: rows.filter((r) => r.caught).length, extraCost: previewCost + (d.prodData ? PROD_SIZE_STAGING : 0), previewCost };
}
