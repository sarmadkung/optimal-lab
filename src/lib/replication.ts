// Leader–follower replication, one write and one read.
// The client changes its display name from "Sam" to "Sara". The leader applies it and ships
// the change to two followers through its replication log, which takes LAG ticks.
//   async  the leader confirms the write at once; followers catch up later
//   sync   the leader waits for follower 1 before confirming
// Then the client reads its profile. Reading from a follower that hasn't caught up returns
// the old name. Optionally the leader crashes right after the write, before it replicates.

export type Mode = "async" | "sync";
export type ReadFrom = "follower" | "leader" | "ryw";

export const OLD = "Sam";
export const NEW = "Sara";

export const READS: { id: ReadFrom; label: string; detail: string }[] = [
  { id: "follower", label: "Any follower", detail: "Spread reads over replicas. Cheapest, can be stale." },
  { id: "leader", label: "Always the leader", detail: "Always fresh, but the leader takes every read." },
  { id: "ryw", label: "Read your writes", detail: "Your own reads go to the leader for a short time after you write." },
];

export type NodeId = "client" | "leader" | "f1" | "f2";

export type ReplicaFrame = {
  tick: number;
  values: { leader: string | null; f1: string; f2: string };
  /** which node is the leader now (a follower after failover) */
  primary: "leader" | "f1";
  acked: boolean;
  /** the client saw an error instead of a confirmation */
  failed: boolean;
  read: { from: NodeId; value: string } | null;
  hops: { from: NodeId; to: NodeId; label: string; tone?: "good" | "bad" }[];
  event: string;
};

export function simulate(mode: Mode, readFrom: ReadFrom, lag: number, crash: boolean): ReplicaFrame[] {
  const frames: ReplicaFrame[] = [];
  const v = { leader: OLD as string | null, f1: OLD, f2: OLD };
  let acked = false;
  let failed = false;
  let primary: "leader" | "f1" = "leader";
  const push = (tick: number, event: string, hops: ReplicaFrame["hops"] = [], read: ReplicaFrame["read"] = null) =>
    frames.push({ tick, values: { ...v }, primary, acked, failed, read, hops, event });

  // tick 0: the write
  v.leader = NEW;
  if (mode === "async") {
    acked = true;
    push(0, `The leader writes “${NEW}” and confirms at once. The followers still say “${OLD}”.`, [
      { from: "client", to: "leader", label: `name=${NEW}` },
      { from: "leader", to: "client", label: "OK", tone: "good" },
    ]);
  } else push(0, `The leader writes “${NEW}” and waits for follower 1 before saying OK.`, [{ from: "client", to: "leader", label: `name=${NEW}` }]);

  if (crash) {
    // the leader dies at tick 1, before its log reaches anyone (lag ≥ 1)
    v.leader = null;
    primary = "f1";
    if (mode === "sync") failed = true;
    push(
      1,
      mode === "async"
        ? `The leader crashes before shipping its log. Follower 1 is promoted, still holding “${OLD}”. The client was told OK, but the write is gone.`
        : `The leader crashes before follower 1 confirmed. The client gets a timeout, not an OK, so it knows to retry. Follower 1 is promoted.`,
      [{ from: "f1", to: "f2", label: "I'm leader" }],
    );
    const reader: NodeId = readFrom === "follower" ? "f2" : "f1";
    push(2, `The client reads its name and gets “${OLD}”.`, [{ from: "client", to: reader, label: "GET name" }], { from: reader, value: OLD });
    return frames;
  }

  for (let t = 1; t <= lag + 1; t++) {
    const hops: ReplicaFrame["hops"] = [];
    const events: string[] = [];
    if (t === lag) {
      v.f1 = NEW;
      hops.push({ from: "leader", to: "f1", label: "log #42" });
      events.push(`Follower 1 applies the change.`);
      if (mode === "sync") {
        acked = true;
        hops.push({ from: "leader", to: "client", label: "OK", tone: "good" });
        events.push("Now the leader confirms.");
      }
    }
    if (t === lag + 1) {
      v.f2 = NEW;
      hops.push({ from: "leader", to: "f2", label: "log #42" });
      events.push("Follower 2 applies the change. Every replica agrees.");
    }
    // the client reads as soon as it has its confirmation (tick 1 for async)
    const readNow = (mode === "async" && t === 1) || (mode === "sync" && t === lag);
    let read: ReplicaFrame["read"] = null;
    if (readNow) {
      const from: NodeId = readFrom === "follower" ? "f2" : "leader";
      const value = v[from as "leader" | "f2"] as string;
      read = { from, value };
      hops.push({ from: "client", to: from, label: "GET name" });
      events.push(
        value === NEW
          ? `The client reads from ${from === "leader" ? "the leader" : "follower 2"} and sees “${NEW}”.`
          : `The client reads from follower 2 and sees “${OLD}”: its own change seems to have vanished.`,
      );
    }
    if (!events.length) events.push(`The change is still in the replication log (lag ${lag} ticks).`);
    push(t, events.join(" "), hops, read);
  }
  return frames;
}

/** The first read the client made, and whether it was stale. */
export function firstRead(frames: ReplicaFrame[]) {
  const f = frames.find((x) => x.read);
  return f ? { ...f.read!, stale: f.read!.value !== NEW } : null;
}
