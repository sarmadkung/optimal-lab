// One public VM and eight connection attempts, walked through every layer a packet meets:
// the subnet's network ACL (stateless, checked both ways), the security group (stateful),
// the host firewall (ufw), which Docker-published ports skip, and finally the socket's
// bind address. CIDR matching is real; first match wins in ACLs, any match in groups.

import { contains } from "./subnets";

export type Ufw = "off" | "basic" | "tight";
export type Sg = "open" | "least";
export type Nacl = "none" | "noReturn" | "return";
export type Design = { loopback: boolean; ufw: Ufw; sg: Sg; nacl: Nacl };

export const FIRST: Design = { loopback: false, ufw: "basic", sg: "open", nacl: "none" };
export const FIXED: Design = { loopback: true, ufw: "tight", sg: "least", nacl: "return" };

export const OFFICE = "203.0.113.10";
export const MONITORING = "10.0.3.0/24";

type Service = { port: number; name: string; docker?: boolean; internal?: boolean };
export const SERVICES: Service[] = [
  { port: 22, name: "sshd" },
  { port: 80, name: "nginx" },
  { port: 443, name: "nginx" },
  { port: 3000, name: "app", internal: true },
  { port: 5432, name: "postgres", internal: true },
  { port: 6379, name: "redis (Docker, -p 6379:6379)", docker: true, internal: true },
  { port: 9100, name: "node_exporter" },
];

export type Attempt = { id: string; from: string; ip: string; port: number; want: boolean; label: string };
export const ATTEMPTS: Attempt[] = [
  { id: "web", from: "Internet", ip: "198.51.100.77", port: 443, want: true, label: "A visitor loads the site" },
  { id: "ssh-office", from: "Office VPN", ip: OFFICE, port: 22, want: true, label: "You ssh in from the office" },
  { id: "metrics", from: "Prometheus", ip: "10.0.3.5", port: 9100, want: true, label: "Monitoring scrapes metrics" },
  { id: "ssh-any", from: "Internet", ip: "198.51.100.77", port: 22, want: false, label: "A bot tries ssh" },
  { id: "app", from: "Internet", ip: "198.51.100.77", port: 3000, want: false, label: "Someone hits the app port directly" },
  { id: "pg", from: "Internet", ip: "198.51.100.77", port: 5432, want: false, label: "A scanner tries Postgres" },
  { id: "redis", from: "Internet", ip: "198.51.100.77", port: 6379, want: false, label: "A scanner tries Redis" },
  { id: "metrics-any", from: "Internet", ip: "198.51.100.77", port: 9100, want: false, label: "Someone reads your metrics" },
];

type Rule = { ports: number[] | "all" | { lo: number; hi: number }; from: string };
const portIn = (p: number, r: Rule["ports"]) => (r === "all" ? true : Array.isArray(r) ? r.includes(p) : p >= r.lo && p <= r.hi);
const fromIn = (ip: string, cidr: string) => contains(cidr.includes("/") ? cidr : `${cidr}/32`, ip);
const match = (rules: Rule[], ip: string, port: number) => rules.find((r) => portIn(port, r.ports) && fromIn(ip, r.from));

export const UFW_RULES: Record<Ufw, Rule[] | null> = {
  off: null,
  basic: [{ ports: [22], from: "0.0.0.0/0" }, { ports: [80], from: "0.0.0.0/0" }, { ports: [443], from: "0.0.0.0/0" }],
  tight: [{ ports: [80], from: "0.0.0.0/0" }, { ports: [443], from: "0.0.0.0/0" }, { ports: [22], from: OFFICE }, { ports: [9100], from: MONITORING }],
};
export const SG_RULES: Record<Sg, Rule[]> = {
  open: [{ ports: "all", from: "0.0.0.0/0" }],
  least: [{ ports: [80], from: "0.0.0.0/0" }, { ports: [443], from: "0.0.0.0/0" }, { ports: [22], from: OFFICE }, { ports: [9100], from: MONITORING }],
};
// Network ACL inbound and outbound. The client's source port is ephemeral (here 51514),
// so a stateless ACL has to allow replies to 1024–65535 on the way out.
const NACL_IN: Rule[] = [{ ports: [22], from: "0.0.0.0/0" }, { ports: [80], from: "0.0.0.0/0" }, { ports: [443], from: "0.0.0.0/0" }, { ports: [9100], from: "10.0.0.0/16" }];
const NACL_OUT: Record<Exclude<Nacl, "none">, Rule[]> = {
  noReturn: [{ ports: [80], from: "0.0.0.0/0" }, { ports: [443], from: "0.0.0.0/0" }],
  return: [{ ports: { lo: 1024, hi: 65535 }, from: "0.0.0.0/0" }],
};
export const CLIENT_PORT = 51514;

export function listening(d: Design) {
  return SERVICES.map((s) => ({ ...s, addr: d.loopback && s.internal ? "127.0.0.1" : "0.0.0.0" }));
}

export type Hop = { layer: string; pass: boolean; note: string };
export type Result = { attempt: Attempt; hops: Hop[]; result: "open" | "timeout" | "refused"; stoppedBy: string | null; good: boolean };

export function connect(a: Attempt, d: Design): Result {
  const hops: Hop[] = [];
  const stop = (result: Result["result"], layer: string): Result => ({ attempt: a, hops, result, stoppedBy: layer, good: !a.want });
  if (d.nacl !== "none") {
    const ok = !!match(NACL_IN, a.ip, a.port);
    hops.push({ layer: "Network ACL in", pass: ok, note: ok ? `rule allows ${a.port}` : "no rule matches: deny" });
    if (!ok) return stop("timeout", "Network ACL");
  }
  const sg = match(SG_RULES[d.sg], a.ip, a.port);
  hops.push({ layer: "Security group", pass: !!sg, note: sg ? `allows ${a.port} from ${sg.from}` : "no rule allows it: dropped" });
  if (!sg) return stop("timeout", "Security group");
  const svc = listening(d).find((s) => s.port === a.port)!;
  const rules = UFW_RULES[d.ufw];
  if (svc.docker && svc.addr === "0.0.0.0") hops.push({ layer: "ufw", pass: true, note: "skipped: Docker's DNAT rules forward the port before ufw's INPUT chain sees it" });
  else if (!rules) hops.push({ layer: "ufw", pass: true, note: "inactive" });
  else {
    const r = match(rules, a.ip, a.port);
    hops.push({ layer: "ufw", pass: !!r, note: r ? `allow ${a.port} from ${r.from === "0.0.0.0/0" ? "anywhere" : r.from}` : "default deny incoming" });
    if (!r) return stop("timeout", "ufw");
  }
  const reachable = svc.addr === "0.0.0.0";
  hops.push({ layer: "Socket", pass: reachable, note: reachable ? `${svc.name} listens on 0.0.0.0:${a.port}` : `${svc.name} listens on 127.0.0.1 only: connection refused` });
  if (!reachable) return stop("refused", "bind address");
  if (d.nacl !== "none") {
    const ok = !!match(NACL_OUT[d.nacl], a.ip, CLIENT_PORT);
    hops.push({ layer: "Network ACL out", pass: ok, note: ok ? `reply to port ${CLIENT_PORT} allowed` : `reply to port ${CLIENT_PORT} has no rule: dropped` });
    if (!ok) return stop("timeout", "Network ACL (reply)");
  }
  return { attempt: a, hops, result: "open", stoppedBy: null, good: a.want };
}

export function scan(d: Design) {
  const results = ATTEMPTS.map((a) => connect(a, d));
  return {
    results,
    legitOk: results.filter((r) => r.attempt.want && r.result === "open").length,
    legit: ATTEMPTS.filter((a) => a.want).length,
    exposed: results.filter((r) => !r.attempt.want && r.result === "open").length,
    good: results.filter((r) => r.good).length,
  };
}
