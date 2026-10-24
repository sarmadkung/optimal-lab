// A load test against a product API with three app instances, a cache and Postgres. Each
// tier is modelled as a queue: utilisation ρ = load / capacity, mean time S / (1 - ρ), and
// p99 ≈ ln(100) × mean (an exponential response time). The test's method decides what
// capacity it reports, compared with what production can really take.

export type Design = { ramp: boolean; realData: boolean; prodLike: boolean; p99: boolean; watchAll: boolean };

export const FIRST: Design = { ramp: false, realData: false, prodLike: false, p99: false, watchAll: false };
export const FIXED: Design = { ramp: true, realData: true, prodLike: true, p99: true, watchAll: true };

export const SLO_MS = 500;
export const CONSTANT_RPS = 500;
export const REAL_HIT = 0.7; // product pages have a long tail
export const TEST_HIT = 0.99; // the script requests the same 20 products
export const APP = { instances: 3, cores: 4, hitMs: 8, missMs: 14 };
export const DB = { queriesPerSec: 700, perMiss: 2, ms: 4 };
export const STAGING = { instances: 1, dbQueriesPerSec: 1400 }; // one app server on a bigger, idle database

export type Env = { instances: number; dbQps: number; hit: number };

export function tiers(rps: number, env: Env) {
  const appCost = env.hit * APP.hitMs + (1 - env.hit) * APP.missMs; // ms of CPU per request
  const appCap = (env.instances * APP.cores * 1000) / appCost;
  const dbLoad = rps * (1 - env.hit) * DB.perMiss;
  const appRho = rps / appCap;
  const dbRho = dbLoad / env.dbQps;
  const mean = (s: number, rho: number) => (rho >= 1 ? Infinity : s / (1 - rho));
  const appMean = mean(appCost, appRho);
  const dbMean = (1 - env.hit) * DB.perMiss * mean(DB.ms, dbRho);
  const total = appMean + dbMean;
  return { appRho, dbRho, appCap, dbCap: env.dbQps / ((1 - env.hit) * DB.perMiss), mean: total, p99: Math.log(100) * total };
}

// The highest load whose latency stays within the SLO (measured as p99, or as the mean).
export function capacity(env: Env, useP99: boolean) {
  let best = 0;
  for (let rps = 50; rps <= 4000; rps += 10) {
    const t = tiers(rps, env);
    const v = useP99 ? t.p99 : t.mean;
    if (Number.isFinite(v) && v <= SLO_MS) best = rps;
    else break;
  }
  return best;
}

export const PROD: Env = { instances: APP.instances, dbQps: DB.queriesPerSec, hit: REAL_HIT };

export function testEnv(d: Design): Env {
  return { instances: d.prodLike ? APP.instances : STAGING.instances, dbQps: d.prodLike ? DB.queriesPerSec : STAGING.dbQueriesPerSec, hit: d.realData ? REAL_HIT : TEST_HIT };
}

export function run(d: Design) {
  const env = testEnv(d);
  const truth = capacity(PROD, true);
  const measured = capacity(env, d.p99);
  // From staging, people multiply by the number of production instances.
  const scale = d.prodLike ? 1 : APP.instances / STAGING.instances;
  const reported = d.ramp ? Math.round(measured * scale) : null;
  const atTruth = tiers(truth, PROD);
  const bottleneck = atTruth.dbRho > atTruth.appRho ? "database" : "app servers";
  const seen = d.watchAll ? bottleneck : "app servers";
  const curve = Array.from({ length: 40 }, (_, i) => {
    const rps = (i + 1) * 50;
    const t = tiers(rps, env);
    return { rps: Math.round(rps * scale), p99: t.p99, mean: t.mean };
  });
  let verdict: string;
  if (!d.ramp) verdict = `a constant ${CONSTANT_RPS} req/s passes; the test never looks for the limit`;
  else if (reported! > truth * 1.05) verdict = `the test says ${reported!.toLocaleString("en-US")} req/s; production misses its p99 target above ${truth.toLocaleString("en-US")}`;
  else if (seen !== bottleneck) verdict = `the number is right, but nobody watched the ${bottleneck}, so the fix goes to the wrong tier`;
  else verdict = `the test finds the limit at ${reported!.toLocaleString("en-US")} req/s and shows the ${bottleneck} saturating first`;
  const ok = d.ramp && reported! <= truth * 1.05 && seen === bottleneck;
  return { env, truth, reported, bottleneck, seen, curve, verdict, ok, atTruth };
}
