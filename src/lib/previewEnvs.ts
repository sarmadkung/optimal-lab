// A month of pull requests, each getting its own preview environment (app, database, URL).
// Environments are counted hour by hour: created when a PR opens, deleted on merge or close,
// on an idle TTL, and asleep when nobody's using them. PR arrival and lifetimes are a fixed
// pattern; prices are illustrative.

export type Design = { teardown: boolean; ttl: boolean; sleep: boolean; seeded: boolean; ownCreds: boolean };
export const FIRST: Design = { teardown: false, ttl: false, sleep: false, seeded: false, ownCreds: false };
export const FIXED: Design = { teardown: true, ttl: true, sleep: true, seeded: true, ownCreds: true };

export const DAYS = 30;
export const PER_HOUR = 0.12; // app pods + a small database
export const TTL_DAYS = 3;
export const AWAKE_SHARE = 0.25; // working hours on weekdays

export type Pr = { n: number; opened: number; lastPush: number; closed: number | null };

export function prs(): Pr[] {
  const list: Pr[] = [];
  let n = 0;
  for (let day = 0; day < DAYS; day++) {
    if (day % 7 >= 5) continue; // weekends
    for (let k = 0; k < 4; k++) {
      const opened = day * 24 + 9 + k * 2;
      const life = ((n * 17) % 5) + 1; // 1–5 days open
      const abandoned = n % 7 === 3; // never merged or closed
      list.push({ n: 101 + n, opened, lastPush: opened + Math.min(life, 2) * 24, closed: abandoned ? null : opened + life * 24 });
      n++;
    }
  }
  return list;
}

export function simulate(d: Design) {
  const list = prs();
  const hours = DAYS * 24;
  const live: number[] = [];
  let envHours = 0;
  for (let h = 0; h < hours; h += 1) {
    let count = 0;
    for (const p of list) {
      if (h < p.opened) continue;
      const closedGone = d.teardown && p.closed !== null && h >= p.closed;
      const ttlGone = d.ttl && h >= p.lastPush + TTL_DAYS * 24;
      if (closedGone || ttlGone) continue;
      count++;
    }
    live.push(count);
    envHours += count;
  }
  const billed = envHours * (d.sleep ? AWAKE_SHARE : 1);
  const created = list.length;
  return {
    list,
    live,
    peak: Math.max(...live),
    end: live[live.length - 1],
    cost: Math.round(billed * PER_HOUR),
    created,
    prodDataEnvs: d.seeded ? 0 : created,
    prodCredEnvs: d.ownCreds ? 0 : created,
    abandoned: list.filter((p) => p.closed === null).length,
  };
}
