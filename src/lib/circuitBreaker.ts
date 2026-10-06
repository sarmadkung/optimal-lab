// Service A calls service B. B goes down for a while. What A does about it decides whether
// B can recover and whether A's users wait.
//   retries      each failed call is tried again (up to RETRIES more times)
//   backoff      retries wait longer each time, with jitter, instead of firing at once
//   breaker      after FAIL_THRESHOLD failures in a row the circuit opens: A fails fast
//                without calling B. After COOLDOWN ticks it lets one trial call through
//                (half-open). Success closes it; failure opens it again.
// B can serve CAPACITY calls per tick. Extra calls (retries included) pile up and time out,
// which keeps B down even after it is healthy again: a retry storm.

export const TICKS = 24;
export const USERS_PER_TICK = 10;
export const CAPACITY = 20;
export const RETRIES = 3;
export const FAIL_THRESHOLD = 5;
export const COOLDOWN = 3;
export const OUTAGE = { from: 4, to: 9 }; // B is broken in [from, to)
export const TIMEOUT_MS = 1000;

export type Settings = { retries: boolean; backoff: boolean; breaker: boolean };
export type BreakerState = "closed" | "open" | "half-open";

export type TickFrame = {
  tick: number;
  /** calls B received this tick (first tries + retries) */
  load: number;
  bHealthy: boolean;
  /** B is up but drowning in load */
  overloaded: boolean;
  ok: number;
  failed: number;
  /** calls that never reached B because the circuit was open */
  shortCircuited: number;
  breaker: BreakerState;
  /** average time a user waited this tick */
  waitMs: number;
};

export function simulate(s: Settings): TickFrame[] {
  const frames: TickFrame[] = [];
  let breaker: BreakerState = "closed";
  let failStreak = 0;
  let openedAt = -1;
  // retries scheduled for future ticks
  const scheduled: number[] = Array.from({ length: TICKS + RETRIES * 4 }, () => 0);

  for (let t = 0; t < TICKS; t++) {
    const broken = t >= OUTAGE.from && t < OUTAGE.to;
    if (breaker === "open" && t - openedAt >= COOLDOWN) breaker = "half-open";

    const fresh = USERS_PER_TICK;
    let attempts = fresh + scheduled[t];
    let shortCircuited = 0;
    if (breaker === "open") {
      shortCircuited = fresh;
      attempts = 0; // fail fast: no call, no retries
    } else if (breaker === "half-open") {
      shortCircuited = fresh - 1;
      attempts = 1; // one trial call
    }

    const overloaded = !broken && attempts > CAPACITY;
    const healthy = !broken && !overloaded;
    const ok = healthy ? attempts : broken ? 0 : Math.floor(CAPACITY * 0.3); // overload: most calls time out
    const failed = attempts - ok;

    // schedule retries for failed calls
    if (s.retries && breaker === "closed" && failed > 0) {
      const share = Math.min(failed, fresh); // only first tries spawn retries in this toy model
      for (let r = 1; r <= RETRIES; r++) {
        const delay = s.backoff ? 2 ** r + (r % 2) : 1; // 3, 4, 9 ticks with jitter-ish spread vs every tick
        const at = t + (s.backoff ? delay : r);
        if (at < scheduled.length) scheduled[at] += s.backoff ? Math.ceil(share / (r + 1)) : share;
      }
    }

    // breaker bookkeeping
    if (s.breaker) {
      if (breaker === "half-open") {
        if (ok > 0) {
          breaker = "closed";
          failStreak = 0;
        } else {
          breaker = "open";
          openedAt = t;
        }
      } else if (breaker === "closed") {
        failStreak = ok > 0 && failed === 0 ? 0 : failStreak + failed;
        if (failStreak >= FAIL_THRESHOLD) {
          breaker = "open";
          openedAt = t;
        }
      }
    }

    const waitMs = Math.round(
      ((ok * 80 + failed * TIMEOUT_MS + shortCircuited * 2) / Math.max(1, ok + failed + shortCircuited)) * (s.retries && failed && !s.breaker ? 1.6 : 1),
    );
    frames.push({ tick: t, load: attempts, bHealthy: !broken, overloaded, ok, failed, shortCircuited, breaker: s.breaker ? breaker : "closed", waitMs });
  }
  return frames;
}

/** First tick after the outage where B served every call it got. */
export function recoveredAt(frames: TickFrame[]) {
  return frames.find((f) => f.tick >= OUTAGE.to && f.failed === 0 && f.breaker === "closed")?.tick ?? null;
}
