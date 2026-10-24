// Kubernetes NetworkPolicy evaluated the way the API defines it: a pod selected by any policy
// for a direction only allows traffic some rule of those policies matches; a peer with only a
// podSelector means pods in the policy's own namespace; a namespaceSelector matches namespace
// labels. A connection needs the source's egress and the destination's ingress to allow it,
// and a connection by service name first needs a DNS lookup to kube-dns.

type Labels = Record<string, string>;
type Peer = { pods?: Labels; namespaces?: Labels; cidr?: string };
type Rule = { peers: Peer[]; ports: number[] };
export type Policy = { ns: string; name: string; selector: Labels; types: ("Ingress" | "Egress")[]; ingress?: Rule[]; egress?: Rule[] };
export type Pod = { id: string; ns: string; labels: Labels; external?: boolean };
export type Design = { denyIngress: boolean; allows: boolean; metrics: boolean; denyEgress: boolean; dns: boolean };

export const FIRST: Design = { denyIngress: false, allows: false, metrics: false, denyEgress: false, dns: false };
export const FIXED: Design = { denyIngress: true, allows: true, metrics: true, denyEgress: true, dns: true };

export const PODS: Pod[] = [
  { id: "frontend", ns: "shop", labels: { app: "frontend" } },
  { id: "api", ns: "shop", labels: { app: "api" } },
  { id: "db", ns: "shop", labels: { app: "db" } },
  { id: "payments", ns: "payments", labels: { app: "payments" } },
  { id: "prometheus", ns: "monitoring", labels: { app: "prometheus" } },
  { id: "kube-dns", ns: "kube-system", labels: { "k8s-app": "kube-dns" } },
  { id: "internet", ns: "", labels: {}, external: true },
];
const NS_LABELS = (ns: string): Labels => ({ "kubernetes.io/metadata.name": ns });

export const CONNECTIONS: { id: string; from: string; to: string; port: number; want: boolean; title: string; byName: boolean }[] = [
  { id: "fe-api", from: "frontend", to: "api", port: 8080, want: true, title: "frontend → api :8080", byName: true },
  { id: "api-db", from: "api", to: "db", port: 5432, want: true, title: "api → db :5432", byName: true },
  { id: "api-pay", from: "api", to: "payments", port: 443, want: true, title: "api → payments :443", byName: true },
  { id: "scrape", from: "prometheus", to: "api", port: 9090, want: true, title: "prometheus → api :9090 (metrics)", byName: false },
  { id: "fe-db", from: "frontend", to: "db", port: 5432, want: false, title: "a hijacked frontend → db :5432", byName: true },
  { id: "fe-pay", from: "frontend", to: "payments", port: 443, want: false, title: "a hijacked frontend → payments :443", byName: true },
  { id: "exfil", from: "api", to: "internet", port: 443, want: false, title: "a hijacked api → attacker's server :443", byName: false },
];

export function policies(d: Design): Policy[] {
  const p: Policy[] = [];
  if (d.denyIngress) {
    p.push({ ns: "shop", name: "default-deny-ingress", selector: {}, types: ["Ingress"], ingress: [] });
    p.push({ ns: "payments", name: "default-deny-ingress", selector: {}, types: ["Ingress"], ingress: [] });
  }
  if (d.allows) {
    p.push({ ns: "shop", name: "api-from-frontend", selector: { app: "api" }, types: ["Ingress"], ingress: [{ peers: [{ pods: { app: "frontend" } }], ports: [8080] }] });
    p.push({ ns: "shop", name: "db-from-api", selector: { app: "db" }, types: ["Ingress"], ingress: [{ peers: [{ pods: { app: "api" } }], ports: [5432] }] });
    p.push({ ns: "payments", name: "payments-from-shop-api", selector: { app: "payments" }, types: ["Ingress"], ingress: [{ peers: [{ namespaces: NS_LABELS("shop"), pods: { app: "api" } }], ports: [443] }] });
  }
  if (d.metrics) p.push({ ns: "shop", name: "metrics-from-monitoring", selector: {}, types: ["Ingress"], ingress: [{ peers: [{ namespaces: NS_LABELS("monitoring") }], ports: [9090] }] });
  if (d.denyEgress) {
    p.push({ ns: "shop", name: "default-deny-egress", selector: {}, types: ["Egress"], egress: [] });
    p.push({ ns: "shop", name: "egress-app-traffic", selector: {}, types: ["Egress"], egress: [{ peers: [{ pods: { app: "api" } }], ports: [8080] }, { peers: [{ pods: { app: "db" } }], ports: [5432] }, { peers: [{ namespaces: NS_LABELS("payments"), pods: { app: "payments" } }], ports: [443] }] });
  }
  if (d.dns) p.push({ ns: "shop", name: "egress-dns", selector: {}, types: ["Egress"], egress: [{ peers: [{ namespaces: NS_LABELS("kube-system"), pods: { "k8s-app": "kube-dns" } }], ports: [53] }] });
  return p;
}

const matches = (sel: Labels, labels: Labels) => Object.entries(sel).every(([k, v]) => labels[k] === v);

function peerMatches(peer: Peer, policyNs: string, other: Pod) {
  if (other.external) return !!peer.cidr;
  if (peer.cidr) return false;
  const nsOk = peer.namespaces ? matches(peer.namespaces, NS_LABELS(other.ns)) : other.ns === policyNs;
  const podOk = peer.pods ? matches(peer.pods, other.labels) : true;
  return nsOk && podOk;
}

function allowed(dir: "Ingress" | "Egress", pod: Pod, other: Pod, port: number, ps: Policy[]) {
  if (pod.external) return { ok: true, by: "outside the cluster" };
  const selecting = ps.filter((p) => p.ns === pod.ns && p.types.includes(dir) && matches(p.selector, pod.labels));
  if (!selecting.length) return { ok: true, by: `no ${dir.toLowerCase()} policy selects ${pod.id}` };
  for (const p of selecting) {
    for (const r of (dir === "Ingress" ? p.ingress : p.egress) ?? []) {
      const peerOk = r.peers.length === 0 || r.peers.some((x) => peerMatches(x, p.ns, other));
      const portOk = r.ports.length === 0 || r.ports.includes(port);
      if (peerOk && portOk) return { ok: true, by: `${p.ns}/${p.name}` };
    }
  }
  return { ok: false, by: `${pod.ns}/${selecting.map((p) => p.name).join(", ")} selects ${pod.id} and no rule matches` };
}

export function check(connId: string, d: Design) {
  const c = CONNECTIONS.find((x) => x.id === connId)!;
  const ps = policies(d);
  const pod = (id: string) => PODS.find((p) => p.id === id)!;
  const src = pod(c.from);
  const dst = pod(c.to);
  const steps: { what: string; ok: boolean; by: string }[] = [];
  if (c.byName) {
    const dnsOut = allowed("Egress", src, pod("kube-dns"), 53, ps);
    steps.push({ what: `${src.id} looks up ${dst.id} in DNS`, ok: dnsOut.ok, by: dnsOut.by });
    if (!dnsOut.ok) return { c, steps, ok: false, good: !c.want, reason: "DNS lookup blocked: the name never resolves" };
  }
  const out = allowed("Egress", src, dst, c.port, ps);
  steps.push({ what: `${src.id} egress`, ok: out.ok, by: out.by });
  if (!out.ok) return { c, steps, ok: false, good: !c.want, reason: `blocked leaving ${src.id}` };
  const inn = allowed("Ingress", dst, src, c.port, ps);
  steps.push({ what: `${dst.id} ingress`, ok: inn.ok, by: inn.by });
  if (!inn.ok) return { c, steps, ok: false, good: !c.want, reason: `blocked arriving at ${dst.id}` };
  return { c, steps, ok: true, good: c.want, reason: "connected" };
}

export function matrix(d: Design) {
  return CONNECTIONS.map((c) => check(c.id, d));
}
