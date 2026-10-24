// What happens after `kubectl apply -f deploy.yaml`: the API server validates and admits
// the object, etcd stores it, the Deployment and ReplicaSet controllers create pods, the
// scheduler filters and scores nodes for each pod, and each node's kubelet starts it.
// Quota, scheduling and the object counts are computed; node usage is illustrative.

export type Scenario = "ok" | "typo" | "image" | "apiDown";
export type Design = { replicas: number; cpu: number };

export const FIRST: Design = { replicas: 3, cpu: 0.5 };
export const QUOTA_CPU = 4; // ResourceQuota requests.cpu for the namespace
export const NODES = [
  { id: "node-a", capacity: 4, used: 2.5 },
  { id: "node-b", capacity: 4, used: 1.5 },
  { id: "node-c", capacity: 4, used: 3 },
];

export const SCENARIOS: { id: Scenario; label: string }[] = [
  { id: "ok", label: "A valid manifest" },
  { id: "typo", label: "replica: 3 (a typo)" },
  { id: "image", label: "An image tag that doesn't exist" },
  { id: "apiDown", label: "The control plane is down" },
];

export type Pod = { name: string; node: string | null; phase: "Running" | "Pending" | "ImagePullBackOff" | "Forbidden" };
export type Event = { who: string; text: string; bad?: boolean };

export function manifest(s: Scenario, d: Design) {
  return [
    "apiVersion: apps/v1",
    "kind: Deployment",
    "metadata: { name: shop, namespace: team-a }",
    "spec:",
    `  ${s === "typo" ? "replica" : "replicas"}: ${d.replicas}`,
    "  selector: { matchLabels: { app: shop } }",
    "  template:",
    "    metadata: { labels: { app: shop } }",
    "    spec:",
    "      containers:",
    `      - image: shop:${s === "image" ? "1.9.9" : "1.4.2"}`,
    `        resources: { requests: { cpu: ${d.cpu} } }`,
  ];
}

const podName = (i: number) => `shop-7d9f8-${["x2k4p", "b8r1m", "q5t7c", "m3n6v", "z9w2d", "h4j8s", "k1l5f", "p7g3a"][i]}`;

export function apply(s: Scenario, d: Design) {
  const events: Event[] = [];
  const stages: { ok: boolean; text: string }[] = [];
  const pods: Pod[] = [];

  if (s === "apiDown") {
    stages.push({ ok: false, text: "The connection to the server was refused: nothing was stored" });
    events.push({ who: "kubectl", text: "dial tcp 10.0.0.1:6443: connect: connection refused", bad: true });
    return { stages, pods, events, stoppedAt: 0, running: 0, note: "pods already running keep serving: kubelets and containers don't need the control plane to keep going" };
  }
  if (s === "typo") {
    stages.push({ ok: false, text: 'strict field validation rejects it: unknown field "spec.replica"' });
    events.push({ who: "kubectl", text: 'Error from server (BadRequest): strict decoding error: unknown field "spec.replica"', bad: true });
    return { stages, pods, events, stoppedAt: 0, running: 0, note: "with validation off, the field would be dropped and the Deployment would run 1 replica, the default" };
  }
  stages.push({ ok: true, text: "authenticated, authorized (RBAC), validated and admitted; deployment.apps/shop created" });
  events.push({ who: "kubectl", text: "deployment.apps/shop created" });

  stages.push({ ok: true, text: "the Deployment is written to etcd; watchers are notified" });

  // ReplicaSet controller creates pods until the namespace quota refuses one.
  let used = 0;
  for (let i = 0; i < d.replicas; i++) {
    if (used + d.cpu > QUOTA_CPU + 1e-9) {
      pods.push({ name: podName(i), node: null, phase: "Forbidden" });
      continue;
    }
    used += d.cpu;
    pods.push({ name: podName(i), node: null, phase: "Pending" });
  }
  const forbidden = pods.filter((p) => p.phase === "Forbidden").length;
  stages.push({ ok: forbidden === 0, text: `the Deployment controller creates ReplicaSet shop-7d9f8, which creates ${d.replicas - forbidden} pod${d.replicas - forbidden === 1 ? "" : "s"}${forbidden ? `; ${forbidden} refused by the ResourceQuota (${QUOTA_CPU} CPU)` : ""}` });
  events.push({ who: "deployment-controller", text: "Scaled up replica set shop-7d9f8" });
  if (forbidden) events.push({ who: "replicaset-controller", text: `Error creating: pods "${podName(d.replicas - forbidden)}" is forbidden: exceeded quota: requests.cpu=${(used + d.cpu).toFixed(2)}, limited: ${QUOTA_CPU}`, bad: true });

  // Scheduler: filter nodes with room for the request, score by most free CPU, bind.
  const free = NODES.map((n) => ({ id: n.id, free: n.capacity - n.used }));
  let unscheduled = 0;
  for (const p of pods.filter((x) => x.phase === "Pending")) {
    const fits = free.filter((n) => n.free + 1e-9 >= d.cpu).sort((a, b) => b.free - a.free);
    if (!fits.length) {
      unscheduled++;
      continue;
    }
    fits[0].free -= d.cpu;
    p.node = fits[0].id;
  }
  stages.push({ ok: unscheduled === 0, text: unscheduled ? `${unscheduled} pod${unscheduled === 1 ? " stays" : "s stay"} Pending: 0/${NODES.length} nodes are available: ${NODES.length} Insufficient cpu` : `each pod is bound to the node with the most free CPU` });
  if (unscheduled) events.push({ who: "default-scheduler", text: `0/${NODES.length} nodes are available: ${NODES.length} Insufficient cpu`, bad: true });
  for (const p of pods.filter((x) => x.node)) events.push({ who: "default-scheduler", text: `Successfully assigned team-a/${p.name} to ${p.node}` });

  // Kubelet on each node pulls the image and starts the container.
  for (const p of pods.filter((x) => x.node)) p.phase = s === "image" ? "ImagePullBackOff" : "Running";
  const running = pods.filter((p) => p.phase === "Running").length;
  stages.push({ ok: s !== "image" && running > 0, text: s === "image" ? 'kubelet: Failed to pull image "shop:1.9.9": not found; backing off' : `kubelet pulls shop:1.4.2 and starts ${running} container${running === 1 ? "" : "s"}` });
  if (s === "image" && pods.some((p) => p.node)) events.push({ who: "kubelet", text: 'Failed to pull image "shop:1.9.9": manifest unknown', bad: true });

  const stoppedAt = stages.findIndex((x) => !x.ok);
  return { stages, pods, events, stoppedAt: stoppedAt < 0 ? null : stoppedAt, running, note: forbidden || unscheduled || s === "image" ? "kubectl said “created”: problems after the API server only show in kubectl get events and kubectl describe" : "" };
}

export function freeCpu() {
  return NODES.map((n) => ({ ...n, free: n.capacity - n.used }));
}
