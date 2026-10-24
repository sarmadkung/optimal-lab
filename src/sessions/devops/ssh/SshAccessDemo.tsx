"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { CERT_HOURS, FIRST, FIXED, HOST_CHECKS, KEYS, LOGINS, SERVERS, THREATS, fingerprint, judge, scorecard, sshConfig, type Access, type Design, type Hop, type HostCheck, type Login, type ThreatId } from "@/lib/sshAccess";

const ACCENT = "var(--ops)";

export default function SshAccessDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [threat, setThreat] = useState<ThreatId>("bastion");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const v = judge(threat, d);
  const card = scorecard(d);
  const t = THREATS.find((x) => x.id === threat)!;
  const usesKey = d.login !== "password";
  const hit = (i: number) => t.step === i;
  const attackTone = v.safe ? "good" : "bad";

  const nodes: MapNode[] = [
    { id: "laptop", label: "Your laptop", sub: usesKey ? "ssh-agent holds the key" : "types a password", at: [14, 22], mobileAt: [25, 12], state: threat === "laptop" ? attackTone : "active" },
    { id: "bastion", label: "Bastion", sub: d.noPasswords && usesKey ? "keys only" : "passwords allowed", at: [50, 22], mobileAt: [75, 12], state: threat === "bastion" || threat === "bots" ? attackTone : "active" },
    { id: "db", label: "db-1", sub: "private subnet", at: [86, 22], mobileAt: [75, 45], state: "active" },
    { id: "ca", label: d.access === "certs" && usesKey ? "SSH CA" : "authorized_keys", sub: d.access === "certs" && usesKey ? `signs ${CERT_HOURS} h certs` : `copied to ${SERVERS} servers`, at: [14, 80], mobileAt: [25, 45], state: threat === "leaver" ? attackTone : "idle" },
    { id: "attacker", label: "Attacker", sub: t.title.toLowerCase(), at: [50, 80], mobileAt: [25, 80], state: v.safe ? "dim" : "bad" },
    { id: "apps", label: "App servers", sub: "6 hosts", at: [86, 80], mobileAt: [75, 80], state: "idle" },
  ];

  const attack = (i: number): Packet[] => {
    if (!hit(i)) return [];
    const tone = v.safe ? "good" : "bad";
    if (threat === "bots") return hops("ab", ["attacker", "bastion"], { label: v.safe ? "refused" : "guesses", tone });
    if (threat === "mitm") return hops("am", ["attacker", "laptop"], { label: "fake host key", tone });
    if (threat === "bastion") return hops("ax", ["bastion", "db"], { label: v.safe ? "no key" : "your agent", tone, start: 0.4 });
    if (threat === "laptop") return hops("al", ["laptop", "attacker"], { label: v.safe ? "encrypted" : "id_ed25519", tone });
    return hops("ae", ["attacker", "apps"], { label: v.safe ? "cert expired" : "old key", tone });
  };
  const packets: Packet[] =
    stage === 0 ? [...hops("k", ["laptop", "bastion"], { label: usesKey ? "public key" : "password" }), ...attack(0)]
    : stage === 1 ? [...hops("a", ["laptop", "bastion"], { label: "auth" }), ...attack(1)]
    : stage === 2 ? [...hops("h", ["db", "laptop"], { label: "host key" }), ...attack(2)]
    : stage === 3 ? [...hops("j", ["laptop", "bastion", "db"], { label: d.hop === "jump" ? "-J tunnel" : "-A agent" }), ...attack(3)]
    : stage === 4 ? [...(d.access === "certs" && usesKey ? hops("c", ["ca", "laptop"], { label: `cert ${CERT_HOURS} h` }) : []), ...attack(4)]
    : [];

  const captions = [
    usesKey ? `Step 1: your key's fingerprint is ${fingerprint(KEYS.you)}.` : "Step 1: no key; you'll type a password on every hop.",
    `Step 2: the bastion ${d.noPasswords && usesKey ? "accepts only keys" : "also accepts passwords"}.`,
    `Step 3: db-1 presents its host key; ssh ${d.hostCheck === "pinned" ? "compares it with known_hosts" : d.hostCheck === "tofu" ? "asks you whether to trust it" : "doesn't check it"}.`,
    d.hop === "jump" ? "Step 4: ProxyJump opens a tunnel through the bastion; the login to db-1 happens end to end from your laptop." : "Step 4: you log in to the bastion with your agent forwarded, then ssh to db-1 from there.",
    d.access === "certs" && usesKey ? `Step 5: today's access comes from a certificate that expires in ${CERT_HOURS} hours.` : `Step 5: access is a line in authorized_keys on ${SERVERS} servers.`,
  ];
  const caption = stage !== null ? (hit(stage) ? `${captions[stage]} ${t.title}: ${v.text}.` : captions[stage]) : `${card.filter((c) => c.safe).length} of ${THREATS.length} threats stopped · ${t.title}: ${v.text}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="SSH and remote access"
        blurb="You reach a private database host through a bastion. Every choice along the way — how you log in, what the servers accept, whether you check the host, how you hop and how access is granted — decides whether one of five ordinary incidents becomes a breach."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Your laptop, a bastion, the private host db-1, six app servers, an SSH CA or authorized_keys files, and an attacker"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "laptop", to: "bastion", label: "ssh" },
                  { from: "bastion", to: "db", label: d.hop === "jump" ? "tunnel" : "ssh" },
                  { from: "ca", to: "laptop", label: d.access === "certs" && usesKey ? "cert" : "keys", dim: !(d.access === "certs" && usesKey) },
                  { from: "attacker", to: "bastion", label: "port 22", dim: threat !== "bots" && threat !== "bastion" },
                  { from: "attacker", to: "apps", label: "old access", dim: threat !== "leaver" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Five incidents against this setup">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">five incidents · {card.filter((c) => c.safe).length}/{THREATS.length} stopped</p>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {card.map((c) => (
                    <li key={c.threat.id}>
                      <span style={{ color: c.safe ? "var(--good)" : "var(--bad)" }} aria-hidden>
                        {c.safe ? "✓ " : "✕ "}
                      </span>
                      {c.threat.title}
                      <span className="block text-[11px] text-[var(--muted)]">{c.text}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">~/.ssh/config</p>
                <pre className="mt-1 overflow-x-auto whitespace-pre rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] leading-relaxed">{sshConfig(d).join("\n")}</pre>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices<ThreatId> label="Incident" accent={ACCENT} value={threat} onChange={setThreat} options={THREATS.map((x) => ({ id: x.id, label: x.title }))} />
              </div>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Defaults most people use
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Hardened
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Connecting…">
                Connect to db-1
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Make a key pair" what="ssh-keygen makes a private key that stays on your laptop and a public key you hand out. A passphrase encrypts the private key file; a hardware key keeps it on a device it can't be copied from." accent={ACCENT} active={at(0)}>
                <Choices<Login> label="How you log in" accent={ACCENT} value={d.login} onChange={(x) => set({ login: x })} options={LOGINS} />
                {usesKey && (
                  <>
                    <p className="mt-2 break-all font-mono text-[10px] text-[var(--muted)]">{KEYS.you}</p>
                    <p className="break-all font-mono text-[10px]">{fingerprint(KEYS.you)}</p>
                  </>
                )}
              </FlowStep>
              <FlowArrow label="authentication" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Turn off passwords on the servers" what="Bots try passwords against every public port 22 all day. Once everyone has a key, sshd_config can refuse passwords entirely, so there is nothing left to guess." accent={ACCENT} active={at(1)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.noPasswords && usesKey} disabled={!usesKey} onChange={(e) => set({ noPasswords: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  PasswordAuthentication no
                </label>
                {!usesKey && <p className="text-[11px] text-[var(--faint)]">You log in with a password, so turning it off would lock you out.</p>}
              </FlowStep>
              <FlowArrow label="host key" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Check you reached the real server" what="The server proves who it is with its host key. ssh compares the key with ~/.ssh/known_hosts; the first time, it can only ask you. Knowing the key in advance, from your inventory or a host certificate, removes the guess." accent={ACCENT} active={at(2)}>
                <Choices<HostCheck> label="Host key check" accent={ACCENT} value={d.hostCheck} onChange={(x) => set({ hostCheck: x })} options={HOST_CHECKS.map((x) => ({ id: x.id, label: x.label }))} />
                <p className="mt-2 break-all font-mono text-[10px] text-[var(--muted)]">real db-1: {fingerprint(KEYS.host)}</p>
                <p className="break-all font-mono text-[10px]" style={{ color: "var(--bad)" }}>
                  fake db-1: {fingerprint(KEYS.evil)}
                </p>
              </FlowStep>
              <FlowArrow label="next hop" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Hop through the bastion" what="Agent forwarding (-A) lets the bastion ask your laptop's agent to sign logins, so anyone with root there can too, while you're connected. ProxyJump (-J) only relays an encrypted connection; the bastion never sees a key or password." accent={ACCENT} active={at(3)}>
                <Choices<Hop> label="How you reach db-1" accent={ACCENT} value={d.hop} onChange={(x) => set({ hop: x })} options={[{ id: "agent", label: "ssh -A, then ssh again" }, { id: "jump", label: "ssh -J (ProxyJump)" }]} />
              </FlowStep>
              <FlowArrow label="access" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Grant access so it ends by itself" what={`A public key in authorized_keys works until someone deletes it on every server. An SSH certificate is a public key signed by your CA with an expiry; servers trust the CA, so access lasts ${CERT_HOURS} hours and ends without cleanup.`} accent={ACCENT} active={at(4)}>
                <Choices<Access> label="How access is granted" accent={ACCENT} value={d.access} onChange={(x) => set({ access: x })} options={[{ id: "static", label: "authorized_keys" }, { id: "certs", label: `Certificates, ${CERT_HOURS} h` }]} />
                {d.access === "certs" && usesKey && <p className="mt-2 break-words font-mono text-[10px] text-[var(--muted)]">ssh-keygen -s ca_key -I you -n deploy -V +{CERT_HOURS}h id_ed25519.pub</p>}
                <p className="mt-2 text-[11px] text-[var(--faint)]">Fingerprints are computed here from real ed25519 public keys, the way ssh-keygen -l does.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
