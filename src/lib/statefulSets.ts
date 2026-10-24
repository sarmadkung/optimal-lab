// A three-replica Postgres cluster on Kubernetes across three zones, run as a Deployment
// or a StatefulSet. Pod names, which disk each pod gets, which zone each disk is created
// in and what survives each event follow Kubernetes' rules; the zone draws are fixed.

export type Kind = "deployment" | "statefulset";
export type Storage = "emptyDir" | "shared" | "perPod";
export type Binding = "Immediate" | "WaitForFirstConsumer";
export type Design = { kind: Kind; storage: Storage; binding: Binding; spread: boolean; retain: boolean };
export type EventId = "start" | "delete" | "zone" | "scale";

export const FIRST: Design = { kind: "deployment", storage: "shared", binding: "Immediate", spread: false, retain: true };
export const FIXED: Design = { kind: "statefulset", storage: "perPod", binding: "WaitForFirstConsumer", spread: true, retain: true };

export const ZONES = ["zone-a", "zone-b", "zone-c"];
// Where the cloud happens to create a disk when nobody says which zone (Immediate binding).
const IMMEDIATE_ZONES = ["zone-a", "zone-c", "zone-c"];
const RANDOM = ["7f9c2-xk2lp", "7f9c2-m8q4r", "7f9c2-t1v6n", "7f9c2-b3w9z"];

export const EVENTS: { id: EventId; title: string; step: number }[] = [
  { id: "start", title: "Start 3 replicas", step: 1 },
  { id: "delete", title: "Delete the second pod", step: 0 },
  { id: "zone", title: "zone-a goes dark", step: 3 },
  { id: "scale", title: "Scale 3 → 1 → 3", step: 4 },
];

export function effective(d: Design): Storage {
  return d.kind === "deployment" && d.storage === "perPod" ? "shared" : d.storage;
}

export type Replica = { name: string; zone: string; disk: string | null; diskZone: string | null; status: "Running" | "Pending" | "Multi-Attach"; why?: string };

export function start(d: Design): Replica[] {
  const storage = effective(d);
  return [0, 1, 2].map((i) => {
    const name = d.kind === "statefulset" ? `pg-${i}` : `pg-${RANDOM[i]}`;
    // Spread pins one replica per zone; otherwise the scheduler follows an existing disk's zone,
    // or with no disk yet puts everything in the emptiest zone (zone-a here).
    const zone = d.spread ? ZONES[i] : storage === "perPod" && d.binding === "Immediate" ? IMMEDIATE_ZONES[i] : "zone-a";
    if (storage === "emptyDir") return { name, zone, disk: null, diskZone: null, status: "Running" };
    if (storage === "shared") {
      const diskZone = d.binding === "Immediate" ? IMMEDIATE_ZONES[0] : "zone-a";
      if (i === 0) return { name, zone, disk: "pgdata", diskZone, status: zone === diskZone ? "Running" : "Pending", why: zone === diskZone ? undefined : "volume node affinity conflict" };
      return { name, zone, disk: "pgdata", diskZone, status: "Multi-Attach", why: "Multi-Attach error: pgdata (ReadWriteOnce) is already attached to another node" };
    }
    const diskZone = d.binding === "Immediate" ? IMMEDIATE_ZONES[i] : zone;
    const ok = diskZone === zone;
    return { name, zone, disk: `data-pg-${i}`, diskZone, status: ok ? "Running" : "Pending", why: ok ? undefined : `volume node affinity conflict: the disk is in ${diskZone}` };
  });
}

export function judge(e: EventId, d: Design): { ok: boolean; text: string } {
  const storage = effective(d);
  const reps = start(d);
  const running = reps.filter((r) => r.status === "Running").length;
  switch (e) {
    case "start": {
      if (storage === "shared") return { ok: false, text: "all three claim one ReadWriteOnce disk: one starts, the others fail with Multi-Attach errors, and they would corrupt one data directory if they didn't" };
      if (running < 3) return { ok: false, text: `${3 - running} replica stays Pending: Immediate binding created its disk before the scheduler chose a zone` };
      if (storage === "emptyDir") return { ok: true, text: "all three start, each with an empty scratch directory" };
      return { ok: true, text: `pg-0 starts, then pg-1, then pg-2, each with its own disk${d.spread ? " in its own zone" : ""}` };
    }
    case "delete":
      if (d.kind === "deployment") return { ok: false, text: `the replacement is ${`pg-${RANDOM[3]}`}: a new name and${storage === "emptyDir" ? " an empty data directory" : " no identity"}; replicas can't find their primary by name` };
      return storage === "perPod" ? { ok: true, text: "pg-1 comes back as pg-1, reattaches data-pg-1 and rejoins at pg-1.pg.db.svc" } : { ok: false, text: "pg-1 comes back as pg-1, but its data directory is empty" };
    case "zone": {
      if (storage === "shared") return { ok: false, text: "the one shared disk was in zone-a: nothing can mount it until the zone returns" };
      const alive = reps.filter((r) => r.status === "Running" && r.zone !== "zone-a").length;
      if (alive === 0) return { ok: false, text: "every replica was in zone-a: the whole database is down until the zone returns" };
      if (!d.spread) return { ok: false, text: `${alive} replica${alive === 1 ? "" : "s"} keep serving, but only because the cloud happened to create disks in other zones` };
      if (alive < 2) return { ok: false, text: "the cluster never fully started, so losing zone-a leaves one replica" };
      if (storage === "emptyDir") return { ok: true, text: "two replicas keep serving; the third's data is gone and has to be rebuilt from scratch" };
      return { ok: true, text: "pg-0 waits for zone-a (its disk can't leave the zone); pg-1 and pg-2 keep serving" };
    }
    case "scale":
      if (storage === "emptyDir") return { ok: false, text: "pg-1 and pg-2 come back empty and copy the whole database again" };
      if (d.kind === "deployment") return { ok: false, text: "new pods, new names; a Deployment has no per-replica disks to return to" };
      if (storage !== "perPod") return { ok: false, text: "pg-1 and pg-2 return without their own data" };
      return d.retain
        ? { ok: true, text: "data-pg-1 and data-pg-2 were kept on scale-down; pg-1 and pg-2 reattach them and catch up from the WAL" }
        : { ok: false, text: "whenScaled: Delete removed data-pg-1 and data-pg-2; the replicas start empty and copy everything again" };
  }
}

export function scorecard(d: Design) {
  return EVENTS.map((x) => ({ event: x, ...judge(x.id, d) }));
}

export function manifestLines(d: Design) {
  const l = [`kind: ${d.kind === "statefulset" ? "StatefulSet" : "Deployment"}`, "spec:", "  replicas: 3"];
  if (d.kind === "statefulset") l.push("  serviceName: pg   # headless: pg-0.pg, pg-1.pg …");
  if (d.kind === "statefulset" && !d.retain) l.push("  persistentVolumeClaimRetentionPolicy: { whenScaled: Delete }");
  if (d.spread) l.push("  # topologySpreadConstraints: one per zone");
  const s = effective(d);
  if (s === "perPod") l.push("  volumeClaimTemplates:", "  - metadata: { name: data }", `    spec: { storageClassName: ssd, accessModes: [ReadWriteOnce] }`);
  if (s === "shared") l.push("  # volumes: [{ persistentVolumeClaim: { claimName: pgdata } }]");
  if (s === "emptyDir") l.push("  # volumes: [{ emptyDir: {} }]");
  l.push("---", `kind: StorageClass  # ssd`, `volumeBindingMode: ${d.binding}`);
  return l;
}
