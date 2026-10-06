// A Kubernetes Deployment rolling from v1 to v2 with maxUnavailable = 0.
// Each tick the controller may start new pods (up to replicas + maxSurge in total), a new
// pod takes STARTUP ticks before its readiness probe runs, and only a Ready pod gets traffic
// from the Service. Every time a v2 pod turns Ready, one v1 pod is terminated.
// A bad v2 never passes its probe, so the rollout stalls with all v1 pods still serving,
// until someone runs `kubectl rollout undo`.

export type Phase = "starting" | "ready" | "failing" | "terminating";
export type Pod = { id: string; version: "v1" | "v2"; phase: Phase; age: number };

export const REPLICAS = 4;
export const STARTUP = 2;
/** Ticks without progress before Kubernetes marks the rollout as failed (progressDeadlineSeconds). */
export const DEADLINE = 4;

export type RolloutFrame = {
  tick: number;
  pods: Pod[];
  event: string;
  /** pods receiving traffic */
  ready: { v1: number; v2: number };
  status: "progressing" | "complete" | "stalled" | "rolled-back";
};

export function simulate(good: boolean, surge: number, rollback = false): RolloutFrame[] {
  let pods: Pod[] = Array.from({ length: REPLICAS }, (_, i) => ({ id: `v1-${i + 1}`, version: "v1", phase: "ready", age: 9 }));
  let made = 0;
  let stuck = 0;
  const frames: RolloutFrame[] = [];
  const snap = (tick: number, event: string, status: RolloutFrame["status"]) => {
    const ready = { v1: 0, v2: 0 };
    for (const p of pods) if (p.phase === "ready") ready[p.version]++;
    frames.push({ tick, pods: pods.map((p) => ({ ...p })), event, ready, status });
  };
  snap(0, "4 pods of v1 are Ready and serving.", "progressing");

  for (let tick = 1; tick <= 20; tick++) {
    const events: string[] = [];
    // terminating pods are gone after one tick
    pods = pods.filter((p) => p.phase !== "terminating");

    // age starting pods, run readiness probes
    for (const p of pods) {
      if (p.phase !== "starting") continue;
      p.age++;
      if (p.age >= STARTUP) {
        p.phase = good ? "ready" : "failing";
        events.push(good ? `${p.id} passed its readiness probe.` : `${p.id} failed its readiness probe.`);
        if (good) {
          const old = pods.find((o) => o.version === "v1" && o.phase === "ready");
          if (old) {
            old.phase = "terminating";
            events.push(`${old.id} is terminated.`);
          }
        }
      }
    }

    // start new pods while there is surge room and v2 is short of replicas
    const live = pods.filter((p) => p.phase !== "terminating").length;
    const v2 = pods.filter((p) => p.version === "v2").length;
    let room = Math.min(REPLICAS + surge - live, REPLICAS - v2);
    while (room-- > 0) {
      made++;
      pods.push({ id: `v2-${made}`, version: "v2", phase: "starting", age: 0 });
      events.push(`Started v2-${made}.`);
    }

    const allNew = pods.filter((p) => p.version === "v2" && p.phase === "ready").length === REPLICAS && !pods.some((p) => p.version === "v1");
    stuck = events.some((e) => e.includes("passed") || e.includes("Started")) ? 0 : stuck + 1;
    const status = allNew ? "complete" : stuck >= DEADLINE ? "stalled" : "progressing";
    const event =
      status === "complete"
        ? "All 4 pods run v2. The rollout is complete."
        : status === "stalled"
          ? "No progress. The rollout passed its deadline and is marked failed."
          : events.join(" ") || "Waiting on readiness probes.";
    snap(tick, event, status);
    if (status === "complete" || status === "stalled") break;
  }

  const last = frames.at(-1)!;
  if (rollback && last.status === "stalled") {
    for (const p of pods) if (p.version === "v2") p.phase = "terminating";
    snap(last.tick + 1, "kubectl rollout undo: the v2 pods are removed. v1 never stopped serving.", "rolled-back");
    pods = pods.filter((p) => p.phase !== "terminating");
    snap(last.tick + 2, "Back on v1. 4 pods Ready, and no request was dropped.", "rolled-back");
  }
  return frames;
}
