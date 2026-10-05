// Burst traffic → load balancer → backends with capacity, health checks, and LB queue timeouts.

export type Strategy = "roundRobin" | "least" | "weighted";

export const SERVERS = [
  { name: "A", rate: 1 },
  { name: "B", rate: 1 },
  { name: "C", rate: 3 },
];

export type BalancePhase = "assign" | "finish";

export type BalanceFrame = {
  tick: number;
  phase: BalancePhase;
  inflight: number[];
  /** Requests routed to a backend this step (includes draining the LB queue). */
  assigned: number[];
  /** Requests that could not be placed and wait at the load balancer. */
  lbQueue: number;
  /** Oldest wait time in the LB queue (finish steps only). */
  oldestLbWait: number;
  /** New arrivals that had to wait at the LB this tick. */
  queuedThisTick: number;
  /** Requests pulled off the LB queue onto a backend this tick. */
  drainedFromLb: number;
  failedThisTick: number;
  failedTotal: number;
  /** Requests each backend finished this tick (finish phase only). */
  completed: number[];
  healthy: boolean[];
  queueCap: number;
};

export type SimConfig = {
  strategy: Strategy;
  arrivals?: number;
  ticks?: number;
  queueCap?: number;
  /** Ticks a request may wait at the LB before it is rejected (503). */
  lbTimeout?: number;
  healthy?: boolean[];
};

export type BalanceSummary = {
  peakSlowQueue: number;
  peakTotal: number;
  peakLbQueue: number;
  totalFailed: number;
  /** Requests that reached a backend across the whole run. */
  totalPlaced: number;
};

export type ScenarioId = "baseline" | "saturated" | "degraded" | "sparse";

export const SCENARIOS: Record<
  ScenarioId,
  { label: string; hint: string; arrivals: number; queueCap: number; lbTimeout: number; ticks: number; healthy: boolean[] }
> = {
  baseline: {
    label: "Uneven speed",
    hint: "All backends up, generous queues — compare how each strategy uses fast Server C.",
    arrivals: 4,
    queueCap: 4,
    lbTimeout: 99,
    ticks: 6,
    healthy: [true, true, true],
  },
  saturated: {
    label: "Full queues",
    hint: "Small per-server caps and a heavy burst — the LB backlog grows and requests time out.",
    arrivals: 6,
    queueCap: 2,
    lbTimeout: 2,
    ticks: 6,
    healthy: [true, true, true],
  },
  degraded: {
    label: "B unhealthy",
    hint: "Health checks mark B down. Traffic must skip it or wait.",
    arrivals: 5,
    queueCap: 2,
    lbTimeout: 3,
    ticks: 6,
    healthy: [true, false, true],
  },
  sparse: {
    label: "Only C up",
    hint: "A and B failed — one fast backend must carry everything.",
    arrivals: 5,
    queueCap: 3,
    lbTimeout: 2,
    ticks: 5,
    healthy: [false, false, true],
  },
};

export const STRATEGY_LABEL: Record<Strategy, string> = {
  roundRobin: "Round robin",
  least: "Least connections",
  weighted: "Weighted (by speed)",
};

function loadScore(strategy: Strategy, inflight: number[], i: number): number {
  if (strategy === "weighted") return inflight[i] / SERVERS[i].rate;
  return inflight[i];
}

function pickServer(
  strategy: Strategy,
  inflight: number[],
  healthy: boolean[],
  queueCap: number,
  cursor: { n: number },
): number | null {
  const up = SERVERS.map((_, i) => i).filter((i) => healthy[i] && inflight[i] < queueCap);
  if (up.length === 0) return null;

  if (strategy === "least" || strategy === "weighted") {
    return up.reduce((best, i) => (loadScore(strategy, inflight, i) < loadScore(strategy, inflight, best) ? i : best), up[0]);
  }

  for (let step = 0; step < SERVERS.length; step++) {
    const i = (cursor.n + step) % SERVERS.length;
    if (healthy[i] && inflight[i] < queueCap) {
      cursor.n = i + 1;
      return i;
    }
  }
  return null;
}

function placeOne(
  strategy: Strategy,
  inflight: number[],
  healthy: boolean[],
  queueCap: number,
  cursor: { n: number },
  assigned: number[],
): "placed" | "queued" {
  const pick = pickServer(strategy, inflight, healthy, queueCap, cursor);
  if (pick === null) return "queued";
  inflight[pick]++;
  assigned.push(pick);
  return "placed";
}

function oldestAge(ages: number[]) {
  return ages.length === 0 ? 0 : Math.max(...ages);
}

export function simulate(config: SimConfig): BalanceFrame[] {
  const strategy = config.strategy;
  const arrivals = config.arrivals ?? 4;
  const ticks = config.ticks ?? 6;
  const queueCap = config.queueCap ?? 4;
  const lbTimeout = config.lbTimeout ?? 99;
  const healthy = config.healthy ?? [true, true, true];

  const inflight = SERVERS.map(() => 0);
  let lbAges: number[] = [];
  let failedTotal = 0;
  const cursor = { n: 0 };
  const frames: BalanceFrame[] = [];

  for (let t = 0; t < ticks; t++) {
    const assigned: number[] = [];
    let drainedFromLb = 0;
    let queuedThisTick = 0;

    while (lbAges.length > 0) {
      const before = assigned.length;
      const placed = placeOne(strategy, inflight, healthy, queueCap, cursor, assigned);
      if (placed === "queued") break;
      lbAges.shift();
      if (assigned.length > before) drainedFromLb++;
    }

    for (let a = 0; a < arrivals; a++) {
      const result = placeOne(strategy, inflight, healthy, queueCap, cursor, assigned);
      if (result === "queued") {
        lbAges.push(0);
        queuedThisTick++;
      }
    }

    frames.push({
      tick: t + 1,
      phase: "assign",
      inflight: [...inflight],
      assigned,
      lbQueue: lbAges.length,
      oldestLbWait: oldestAge(lbAges),
      queuedThisTick,
      drainedFromLb,
      failedThisTick: 0,
      failedTotal,
      completed: SERVERS.map(() => 0),
      healthy: [...healthy],
      queueCap,
    });

    const completed = SERVERS.map((s, idx) => (healthy[idx] ? Math.min(inflight[idx], s.rate) : 0));
    for (let i = 0; i < SERVERS.length; i++) inflight[i] = Math.max(0, inflight[i] - SERVERS[i].rate);

    let failedThisTick = 0;
    if (lbAges.length > 0) {
      lbAges = lbAges.map((age) => age + 1);
      const keep: number[] = [];
      for (const age of lbAges) {
        if (age >= lbTimeout) failedThisTick++;
        else keep.push(age);
      }
      lbAges = keep;
      failedTotal += failedThisTick;
    }

    frames.push({
      tick: t + 1,
      phase: "finish",
      inflight: [...inflight],
      assigned,
      lbQueue: lbAges.length,
      oldestLbWait: oldestAge(lbAges),
      queuedThisTick,
      drainedFromLb,
      failedThisTick,
      failedTotal,
      completed,
      healthy: [...healthy],
      queueCap,
    });
  }

  return frames;
}

export function summarize(frames: BalanceFrame[]): BalanceSummary {
  let peakSlowQueue = 0;
  let peakTotal = 0;
  let peakLbQueue = 0;
  let totalFailed = 0;
  let totalPlaced = 0;
  for (const f of frames) {
    if (f.phase === "assign") totalPlaced += f.assigned.length;
    const slow = f.inflight[0] + f.inflight[1];
    const total = f.inflight.reduce((a, n) => a + n, 0);
    if (slow > peakSlowQueue) peakSlowQueue = slow;
    if (total > peakTotal) peakTotal = total;
    if (f.lbQueue > peakLbQueue) peakLbQueue = f.lbQueue;
    if (f.failedTotal > totalFailed) totalFailed = f.failedTotal;
  }
  return { peakSlowQueue, peakTotal, peakLbQueue, totalFailed, totalPlaced };
}

export function compareStrategies(config: Omit<SimConfig, "strategy">) {
  return {
    roundRobin: summarize(simulate({ ...config, strategy: "roundRobin" })),
    least: summarize(simulate({ ...config, strategy: "least" })),
    weighted: summarize(simulate({ ...config, strategy: "weighted" })),
  } satisfies Record<Strategy, BalanceSummary>;
}

export function configFromScenario(scenario: ScenarioId, strategy: Strategy): SimConfig {
  const s = SCENARIOS[scenario];
  return {
    strategy,
    arrivals: s.arrivals,
    ticks: s.ticks,
    queueCap: s.queueCap,
    lbTimeout: s.lbTimeout,
    healthy: s.healthy,
  };
}
