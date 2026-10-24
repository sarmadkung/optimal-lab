// A Deployment's control loop: compare the pods that match the ReplicaSet's selector with
// the replica count, then create or delete pods until they agree. Each action changes the
// cluster; the controllers' response is computed. Timings are approximate defaults.

export type Owner = "bare" | "deployment";
export type Action = "delete" | "node" | "image" | "undo" | "relabel";
export type Design = { owner: Owner; replicas: number; toleration: 300 | 30; history: 10 | 0 };

export const FIRST: Design = { owner: "bare", replicas: 3, toleration: 300, history: 0 };
export const FIXED: Design = { owner: "deployment", replicas: 3, toleration: 30, history: 10 };
export const NOT_READY_AFTER = 40; // seconds before an unreachable node is marked NotReady
export const NODES = ["node-a", "node-b", "node-c"];

export const ACTIONS: { id: Action; label: string; cmd: string }[] = [
  { id: "delete", label: "Delete a pod", cmd: "kubectl delete pod shop-…-1" },
  { id: "node", label: "node-b loses power", cmd: "(node-b stops reporting)" },
  { id: "image", label: "Ship image 1.5", cmd: "kubectl set image deploy/shop app=shop:1.5" },
  { id: "undo", label: "Roll back", cmd: "kubectl rollout undo deploy/shop" },
  { id: "relabel", label: "Pull a pod out to debug", cmd: "kubectl label pod shop-…-0 app=debug --overwrite" },
];

export type Pod = { name: string; node: string; image: string; app: string; owner: string | null; phase: "Running" | "Unknown" | "Gone" };
export type Rs = { name: string; revision: number; image: string; replicas: number };
export type State = { pods: Pod[]; sets: Rs[] };

const hash = { "1.4": "7d9f8", "1.5": "c41b2" } as const;

export function initial(d: Design): State {
  const owner = d.owner === "deployment" ? `shop-${hash["1.4"]}` : null;
  const pods: Pod[] = Array.from({ length: d.replicas }, (_, i) => ({
    name: d.owner === "deployment" ? `shop-${hash["1.4"]}-${i}` : `shop-${i}`,
    node: NODES[i % NODES.length],
    image: "1.4",
    app: "shop",
    owner,
    phase: "Running",
  }));
  return { pods, sets: d.owner === "deployment" ? [{ name: `shop-${hash["1.4"]}`, revision: 1, image: "1.4", replicas: d.replicas }] : [] };
}

// The ReplicaSet controller: count matching, live pods; create on the least-loaded node.
function reconcile(st: State, rs: Rs, down: string[]) {
  const live = () => st.pods.filter((p) => p.app === "shop" && p.owner === rs.name && p.phase === "Running");
  let created = 0;
  let n = st.pods.length;
  while (live().length < rs.replicas) {
    const load = NODES.filter((x) => !down.includes(x)).map((x) => ({ x, c: st.pods.filter((p) => p.node === x && p.phase === "Running").length })).sort((a, b) => a.c - b.c);
    st.pods.push({ name: `${rs.name}-${n++}`, node: load[0].x, image: rs.image, app: "shop", owner: rs.name, phase: "Running" });
    created++;
  }
  let removed = 0;
  while (live().length > rs.replicas) {
    live()[0].phase = "Gone";
    removed++;
  }
  return { created, removed };
}

export function act(a: Action, d: Design) {
  const st = initial(d);
  const log: string[] = [];
  let ok = true;
  let downtime = 0;
  const dep = d.owner === "deployment";
  const current = () => st.sets.find((s) => s.replicas > 0) ?? st.sets[0];

  if (a === "delete") {
    st.pods[1].phase = "Gone";
    log.push(`${st.pods[1].name} deleted`);
    if (dep) {
      const r = reconcile(st, current(), []);
      log.push(`ReplicaSet sees ${d.replicas - 1} of ${d.replicas} and creates ${r.created} pod within seconds`);
    } else {
      ok = false;
      log.push("no controller owns it; it stays gone");
    }
  } else if (a === "node") {
    const lost = st.pods.filter((p) => p.node === "node-b");
    for (const p of lost) p.phase = "Unknown";
    downtime = NOT_READY_AFTER + d.toleration;
    log.push(`node-b stops reporting; after ~${NOT_READY_AFTER} s it is NotReady and its ${lost.length} pod${lost.length === 1 ? " is" : "s are"} Unknown`);
    if (dep && lost.length) {
      for (const p of lost) p.phase = "Gone";
      const r = reconcile(st, current(), ["node-b"]);
      log.push(`their ${d.toleration} s toleration runs out: they are evicted and ${r.created} replacement${r.created === 1 ? " starts" : "s start"} on the other nodes after ~${downtime} s`);
      ok = d.toleration <= 60;
    } else if (lost.length) {
      ok = false;
      log.push("bare pods are never rescheduled; capacity stays down until someone recreates them");
    } else log.push("no pods ran there");
  } else if (a === "image" || a === "undo") {
    if (!dep) {
      ok = false;
      log.push("bare pods can't be updated in place: delete and recreate each by hand, with nothing tracking the old version");
    } else {
      const old = current();
      const next: Rs = { name: `shop-${hash["1.5"]}`, revision: 2, image: "1.5", replicas: 0 };
      st.sets.push(next);
      // A rolling update: the new ReplicaSet grows as the old one shrinks.
      next.replicas = d.replicas;
      reconcile(st, next, []);
      old.replicas = 0;
      reconcile(st, old, []);
      log.push(`a changed pod template means a new ReplicaSet (${next.name}, revision 2); it scales up to ${d.replicas} while ${old.name} scales to 0`);
      if (d.history === 0) {
        st.sets = st.sets.filter((s) => s !== old);
        log.push("revisionHistoryLimit: 0 deletes the old ReplicaSet right away");
      } else log.push(`the old ReplicaSet is kept at 0 replicas as revision 1 (limit ${d.history})`);
      if (a === "undo") {
        if (d.history === 0) {
          ok = false;
          log.push("rollout undo: no rollout history found; the only way back is another release");
        } else {
          old.replicas = d.replicas;
          reconcile(st, old, []);
          next.replicas = 0;
          reconcile(st, next, []);
          old.revision = 3;
          log.push(`rollout undo scales ${old.name} back to ${d.replicas} (now revision 3) and ${next.name} to 0: no rebuild, no new image`);
        }
      }
    }
  } else if (a === "relabel") {
    const p = st.pods[0];
    p.app = "debug";
    log.push(`${p.name} no longer matches app=shop`);
    if (dep) {
      const r = reconcile(st, current(), []);
      log.push(`the ReplicaSet counts ${d.replicas - 1}, creates ${r.created} replacement, and leaves ${p.name} running, out of the Service, for you to inspect`);
    } else {
      ok = false;
      log.push("nothing replaces it: the Service now has one pod fewer");
    }
  }
  const serving = st.pods.filter((p) => p.app === "shop" && p.phase === "Running").length;
  return { st, log, ok, downtime, serving };
}

export function scorecard(d: Design) {
  return ACTIONS.map((x) => ({ action: x, ...act(x.id, d) }));
}
