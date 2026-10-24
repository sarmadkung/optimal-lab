"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type NodeState, type Packet } from "@/components/system/SystemMap";
import { ATTEMPTS, CLIENT_PORT, FIRST, FIXED, MONITORING, OFFICE, connect, listening, scan, type Design, type Nacl, type Sg, type Ufw } from "@/lib/firewallRules";

const ACCENT = "var(--ops)";
const LAYERS = ["Network ACL in", "Security group", "ufw", "Socket", "Network ACL out"];
const NMAP = { open: "open", timeout: "filtered", refused: "closed" } as const;

export default function FirewallDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [aid, setAid] = useState("redis");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const a = ATTEMPTS.find((x) => x.id === aid)!;
  const r = connect(a, d);
  const sc = scan(d);

  // For each layer: the hop if the packet got there, "none" if the layer isn't configured.
  const layer = (i: number) => {
    const h = r.hops.find((x) => x.layer === LAYERS[i]);
    if (h) return h;
    if ((i === 0 || i === 4) && d.nacl === "none") {
      const reached = i === 0 || r.result === "open";
      return reached ? { layer: LAYERS[i], pass: true, note: "no network ACL on this subnet" } : null;
    }
    return null;
  };
  const state = (i: number): NodeState => {
    const h = layer(i);
    if (!h) return "dim";
    if (h.pass) return "active";
    return a.want ? "bad" : "good";
  };
  const ids = ["client", "nacl", "sg", "ufw", "socket"];

  const nodes: MapNode[] = [
    { id: "client", label: a.from, sub: `${a.ip}:${CLIENT_PORT}`, at: [14, 18], mobileAt: [25, 12], state: r.good ? "good" : "bad" },
    { id: "nacl", label: "Network ACL", sub: d.nacl === "none" ? "not used" : "stateless", at: [50, 18], mobileAt: [75, 12], state: d.nacl === "none" ? "idle" : state(0) },
    { id: "sg", label: "Security group", sub: d.sg === "open" ? "all from anywhere" : "least privilege", at: [86, 18], mobileAt: [75, 45], state: state(1) },
    { id: "ufw", label: "ufw on the VM", sub: d.ufw === "off" ? "inactive" : `${d.ufw} rules`, at: [86, 82], mobileAt: [75, 80], state: state(2) },
    { id: "socket", label: `Port ${a.port}`, sub: listening(d).find((s) => s.port === a.port)!.name.split(" (")[0], at: [50, 82], mobileAt: [25, 80], state: state(3) },
  ];

  const step = (i: number): Packet[] => {
    const h = layer(i);
    if (!h) return [];
    const from = i === 4 ? "socket" : ids[i];
    const to = i === 4 ? "client" : ids[i + 1];
    const tone = h.pass ? (i === 4 ? (a.want ? "good" : "bad") : undefined) : a.want ? "bad" : "good";
    return hops(`p${i}`, [from, to], { label: i === 4 ? "reply" : h.pass ? `:${a.port}` : "dropped", tone });
  };
  const packets: Packet[] = stage !== null ? step(stage) : [];

  const caption =
    stage !== null
      ? layer(stage)
        ? `Step ${stage + 1}: ${LAYERS[stage]}: ${layer(stage)!.note}.`
        : `Step ${stage + 1}: the packet never got this far.`
      : `${a.label}: ${NMAP[r.result]}${r.stoppedBy ? `, stopped by the ${r.stoppedBy}` : ""}. Scan: ${sc.legitOk} of ${sc.legit} wanted connections work, ${sc.exposed} unwanted open.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="Ports, firewalls and security groups"
        blurb="One VM with a public IP runs a website, ssh, an app, Postgres, Redis in Docker and a metrics exporter. A packet meets up to four filters before it reaches a socket, and the reply has to get back out. Send eight connections and see which layer stops each, and which ones it shouldn't."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="A client, the subnet's network ACL, the security group, ufw on the VM and the listening socket"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "client", to: "nacl", label: "SYN" },
                  { from: "nacl", to: "sg", label: "in" },
                  { from: "sg", to: "ufw", label: "in" },
                  { from: "ufw", to: "socket", label: "accept" },
                  { from: "socket", to: "client", label: "reply", dim: r.result !== "open" && !r.hops.some((h) => h.layer === "Network ACL out") },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Scan results for all eight connections">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">
                  scan · {sc.legitOk}/{sc.legit} wanted work · {sc.exposed} exposed
                </p>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {sc.results.map((x) => (
                    <li key={x.attempt.id}>
                      <span style={{ color: x.good ? "var(--good)" : "var(--bad)" }} aria-hidden>
                        {x.good ? "✓ " : "✕ "}
                      </span>
                      {x.attempt.label}{" "}
                      <span className="font-mono text-[11px] text-[var(--muted)]">
                        :{x.attempt.port} {NMAP[x.result]}
                        {x.stoppedBy ? ` · ${x.stoppedBy}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-[var(--faint)]">filtered = no answer (dropped), closed = refused, as nmap reports them.</p>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices<string> label="Connection" accent={ACCENT} value={aid} onChange={setAid} options={ATTEMPTS.map((x) => ({ id: x.id, label: x.label }))} />
              </div>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  ufw allow 22, 80, 443
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Every layer tight
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Connecting…">
                Send the packet
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Cross the subnet's network ACL" what="A network ACL filters whole subnets, rule by rule, first match wins. It is stateless: it remembers nothing, so it judges the reply separately (step 5)." accent={ACCENT} active={at(0)}>
                <Choices<Nacl> label="Network ACL" accent={ACCENT} value={d.nacl} onChange={(x) => set({ nacl: x })} options={[{ id: "none", label: "None (allow all)" }, { id: "noReturn", label: "In: 22, 80, 443, 9100 · out: 80, 443" }, { id: "return", label: `In: same · out: 1024–65535` }]} />
              </FlowStep>
              <FlowArrow label="packet" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Pass the security group" what="A security group is the cloud's firewall around one machine. It only allows; anything no rule matches is dropped. It is stateful, so replies to allowed connections go back out without a rule." accent={ACCENT} active={at(1)}>
                <Choices<Sg> label="Security group" accent={ACCENT} value={d.sg} onChange={(x) => set({ sg: x })} options={[{ id: "open", label: "All ports from 0.0.0.0/0" }, { id: "least", label: "80, 443 any · 22 office · 9100 monitoring" }]} />
                <p className="mt-1 font-mono text-[10px] text-[var(--muted)]">office {OFFICE}/32 · monitoring {MONITORING}</p>
              </FlowStep>
              <FlowArrow label="packet" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Pass the host firewall" what="ufw writes iptables rules on the VM: deny incoming by default, then allow specific ports. Docker publishes ports with its own rules that run before ufw's, so -p 6379:6379 is open whatever ufw says." accent={ACCENT} active={at(2)}>
                <Choices<Ufw> label="ufw" accent={ACCENT} value={d.ufw} onChange={(x) => set({ ufw: x })} options={[{ id: "off", label: "Inactive" }, { id: "basic", label: "Allow 22, 80, 443" }, { id: "tight", label: "80, 443 · 22 office · 9100 monitoring" }]} />
              </FlowStep>
              <FlowArrow label="packet" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Reach a listening socket" what="A service listening on 0.0.0.0 accepts connections on every interface; on 127.0.0.1 only from the machine itself. Internal services should never have been reachable in the first place." accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.loopback} onChange={(e) => set({ loopback: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Bind the app, Postgres and Redis to 127.0.0.1
                </label>
                <pre className="mt-1 overflow-x-auto whitespace-pre rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] leading-relaxed">
                  {["$ ss -tlnp", ...listening(d).map((s) => `LISTEN ${`${s.addr}:${s.port}`.padEnd(16)} ${s.name}`)].join("\n")}
                </pre>
              </FlowStep>
              <FlowArrow label="reply" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Get the reply back out" what={`The client sent from a random high port (${CLIENT_PORT} here). A security group lets the reply out automatically; a stateless network ACL needs an outbound rule for ports 1024–65535, or every connection hangs.`} accent={ACCENT} active={at(4)}>
                <ul className="space-y-0.5 text-xs">
                  {r.hops.map((h) => (
                    <li key={h.layer}>
                      <span style={{ color: h.pass ? "var(--good)" : "var(--bad)" }}>{h.pass ? "pass" : "stop"}</span> {h.layer}: <span className="text-[var(--muted)]">{h.note}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Rule matching, CIDR checks and the Docker bypass run here for all eight connections.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
