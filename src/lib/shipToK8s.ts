// One web app's first trip from a laptop to a Kubernetes cluster, with the five mistakes
// that most often break it. A browser request is then traced hop by hop (DNS and TLS,
// ingress, Service, pod, container) and stops at the first hop that can't pass.

export type Design = { bindAll: boolean; shaTag: boolean; readiness: boolean; labelsMatch: boolean; tls: boolean };
export const FIRST: Design = { bindAll: false, shaTag: false, readiness: false, labelsMatch: false, tls: false };
export const FIXED: Design = { bindAll: true, shaTag: true, readiness: true, labelsMatch: true, tls: true };

export const COMMIT = "4f2a9c1";
export const POD_START_S = 8; // until the app answers
export const RPS = 40;

export function dockerfile(d: Design) {
  return [
    "FROM gcr.io/distroless/base-debian12",
    "COPY build/server /app/server",
    `ENV LISTEN_ADDR=${d.bindAll ? "0.0.0.0" : "127.0.0.1"}:8080`,
    "EXPOSE 8080",
    'ENTRYPOINT ["/app/server"]',
  ];
}

export function manifests(d: Design) {
  return [
    "kind: Deployment",
    "spec:",
    "  replicas: 3",
    "  template:",
    "    metadata: { labels: { app: webapp } }",
    "    spec:",
    "      containers:",
    `      - image: registry.example.com/webapp:${d.shaTag ? COMMIT : "latest"}`,
    ...(d.shaTag ? [] : ["        imagePullPolicy: IfNotPresent"]),
    ...(d.readiness ? ["        readinessProbe: { httpGet: { path: /healthz, port: 8080 } }"] : []),
    "---",
    "kind: Service",
    `spec: { selector: { app: ${d.labelsMatch ? "webapp" : "web"} }, ports: [{ port: 80, targetPort: 8080 }] }`,
    "---",
    "kind: Ingress",
    ...(d.tls ? ["metadata: { annotations: { cert-manager.io/cluster-issuer: letsencrypt } }", "spec: { tls: [{ hosts: [shop.example.com], secretName: shop-tls }], …"] : ["spec: { rules: [{ host: shop.example.com, … }] }"]),
  ];
}

export type Hop = { name: string; ok: boolean; note: string };

// The request a visitor makes, after the second release (where tags matter).
export function trace(d: Design) {
  const hops: Hop[] = [];
  hops.push(d.tls ? { name: "DNS + TLS", ok: true, note: "https://shop.example.com: valid Let's Encrypt certificate" } : { name: "DNS + TLS", ok: false, note: "no certificate for shop.example.com; browsers show a full-page warning and https fails" });
  if (!d.tls) return { hops, served: "nothing (certificate error)", ok: false };
  hops.push({ name: "Ingress", ok: true, note: "host shop.example.com → Service webapp:80" });
  if (!d.labelsMatch) {
    hops.push({ name: "Service", ok: false, note: "selector app=web matches no pods: 0 endpoints, so the ingress returns 503" });
    return { hops, served: "503 Service Unavailable", ok: false };
  }
  hops.push({ name: "Service", ok: true, note: "selector app=webapp → 3 ready endpoints" });
  hops.push(d.shaTag ? { name: "Pod", ok: true, note: `running webapp:${COMMIT}, the commit just merged` } : { name: "Pod", ok: false, note: "the manifest still says :latest, so nothing changed and the nodes keep their cached image: the old release is still running" });
  if (!d.bindAll) {
    hops.push({ name: "Container", ok: false, note: "the server listens on 127.0.0.1 inside the container; traffic arriving on the pod IP is refused" });
    return { hops, served: "502 Bad Gateway", ok: false };
  }
  hops.push({ name: "Container", ok: true, note: "listening on 0.0.0.0:8080" });
  return { hops, served: d.shaTag ? "200: the new release" : "200, but the old release", ok: d.shaTag };
}

// Errors during a rolling update: without a readiness probe each new pod gets traffic for
// the seconds it spends starting.
export function rolloutErrors(d: Design) {
  if (d.readiness) return 0;
  const podsReplaced = 3;
  return Math.round(podsReplaced * POD_START_S * (RPS / 3));
}

export function scorecard(d: Design) {
  const t = trace(d);
  return [
    { id: "bind", title: "The app accepts connections from outside its container", ok: d.bindAll },
    { id: "tag", title: "Each release is a new, immutable image tag", ok: d.shaTag },
    { id: "ready", title: "Pods get traffic only once they can serve it", ok: d.readiness },
    { id: "labels", title: "The Service finds the pods", ok: d.labelsMatch },
    { id: "tls", title: "Visitors get HTTPS with a valid certificate", ok: d.tls },
    { id: "result", title: `A visitor's request gets: ${t.served}`, ok: t.ok },
  ];
}
