"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { ATTACKS, BASES, FIRST, FIXED, filesystem, judge, layers, runFlags, scorecard, type AttackId, type BaseId, type Design } from "@/lib/containerSecurity";

const ACCENT = "var(--ops)";

export default function ContainerSecurityDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [aid, setAid] = useState<AttackId>("secret");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const v = judge(aid, d);
  const card = scorecard(d);
  const a = ATTACKS.find((x) => x.id === aid)!;
  const base = BASES.find((b) => b.id === d.base)!;
  const ls = layers(d);
  const fs = filesystem(ls);
  const tone = v.safe ? "good" : "bad";

  const nodes: MapNode[] = [
    { id: "build", label: "CI build", sub: `${ls.length} layers`, at: [14, 18], mobileAt: [25, 12], state: aid === "secret" ? tone : "active" },
    { id: "scan", label: "Image scan", sub: d.scanGate ? "fails on fixable critical" : "not run", at: [50, 18], mobileAt: [75, 12], state: d.scanGate ? (aid === "cve" ? tone : "active") : "dim" },
    { id: "registry", label: "Registry", sub: `${base.mb} MB base · ${base.packages} pkgs`, at: [86, 18], mobileAt: [75, 45], state: "active" },
    { id: "container", label: "Container", sub: `${d.nonRoot ? "uid 10001" : "root"}${d.hardened ? " · read-only" : ""}`, at: [86, 82], mobileAt: [25, 45], state: aid === "rce" || aid === "network" ? tone : "active" },
    { id: "attacker", label: "Attacker", sub: a.title.split(" ").slice(0, 4).join(" "), at: [50, 82], mobileAt: [25, 80], state: v.safe ? "dim" : "bad" },
    { id: "host", label: "Host", sub: d.noSocket ? "nothing mounted" : "docker.sock mounted", at: [14, 82], mobileAt: [75, 80], state: aid === "escape" ? tone : d.noSocket ? "active" : "wait" },
  ];

  const attackPacket = (): Packet[] => {
    if (aid === "cve") return hops("a", ["scan", "build"], { label: v.safe ? "blocked" : "missed", tone });
    if (aid === "secret") return hops("a", ["registry", "attacker"], { label: v.safe ? "no token" : "layer 2", tone });
    if (aid === "rce") return hops("a", ["attacker", "container"], { label: v.safe ? "contained" : "shell", tone });
    if (aid === "network") return hops("a", ["container", "registry"], { label: v.safe ? "no NET_RAW" : "raw packets", tone });
    return hops("a", ["container", "host"], { label: v.safe ? "no way out" : "docker.sock", tone });
  };
  const flow: Packet[][] = [
    hops("b", ["build", "scan"], { label: "image" }),
    hops("s", ["scan", "registry"], { label: d.scanGate ? "scanned" : "push" }),
    hops("p", ["registry", "container"], { label: "pull" }),
    hops("r", ["host", "container"], { label: d.hardened ? "least privilege" : "defaults" }),
    hops("h", ["container", "host"], { label: d.noSocket ? "isolated" : "socket" }),
  ];
  const packets: Packet[] = stage === null ? [] : stage === a.step ? attackPacket() : flow[stage];

  const captions = [
    `Step 1: the image starts from ${base.image}: ${base.mb} MB, ${base.packages} packages${base.shell ? ", a shell and a package manager" : ", no shell"}.`,
    d.scanGate ? "Step 2: the scanner checks every package against known CVEs before the push." : "Step 2: nothing checks the packages before the push.",
    d.secretMount ? "Step 3: the build used a secret mount; no layer contains the token." : `Step 3: the token went into a layer and a later layer deleted it.`,
    `Step 4: the container runs as ${d.nonRoot ? "uid 10001" : "root"}${d.hardened ? " with a read-only filesystem and no capabilities" : " with Docker's default capabilities"}.`,
    d.noSocket ? "Step 5: nothing from the host is mounted into the container." : "Step 5: the Docker socket is mounted into the container.",
  ];
  const caption = stage !== null ? (stage === a.step ? `${captions[stage]} ${a.title}: ${v.text}.` : captions[stage]) : `${card.filter((c) => c.safe).length} of ${ATTACKS.length} attacks stopped · ${a.title}: ${v.text}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="Container security"
        blurb="A container isn't a security boundary by default: it runs as root, keeps a shell, packages it doesn't need and capabilities it never uses, and anything ever written into a layer stays there. Build and run one API image five ways and send five attacks at it."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="CI builds the image, a scanner checks it, the registry stores it, the container runs on a host, and an attacker probes each"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "build", to: "scan", label: "image" },
                  { from: "scan", to: "registry", label: "push" },
                  { from: "registry", to: "container", label: "pull" },
                  { from: "attacker", to: "container", label: "exploit" },
                  { from: "container", to: "host", label: d.noSocket ? "kernel" : "docker.sock", dim: d.noSocket },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Five attacks against this image">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">five attacks · {card.filter((c) => c.safe).length}/{ATTACKS.length} stopped</p>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {card.map((c) => (
                    <li key={c.attack.id}>
                      <span style={{ color: c.safe ? "var(--good)" : "var(--bad)" }} aria-hidden>
                        {c.safe ? "✓ " : "✕ "}
                      </span>
                      {c.attack.title}
                      <span className="block text-[11px] text-[var(--muted)]">{c.text}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 break-words font-mono text-[10px] text-[var(--muted)]">$ {runFlags(d)}</p>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices<AttackId> label="Attack" accent={ACCENT} value={aid} onChange={setAid} options={ATTACKS.map((x) => ({ id: x.id, label: x.title }))} />
              </div>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Tutorial defaults
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Hardened
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Running…">
                Build, ship and attack
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Start from less" what="Every package in the base image is code you ship and patch. A distroless image has the runtime libraries and nothing else: no shell, no package manager, a fraction of the size." accent={ACCENT} active={at(0)}>
                <Choices<BaseId> label="Base image" accent={ACCENT} value={d.base} onChange={(x) => set({ base: x })} options={BASES.map((b) => ({ id: b.id, label: b.label }))} />
                <p className="mt-1 break-words font-mono text-[10px] text-[var(--muted)]">
                  {base.image} · {base.mb} MB · {base.packages} packages · {base.fixableCritical} fixable critical CVEs
                </p>
              </FlowStep>
              <FlowArrow label="image" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Scan, and fail on what you can fix" what="A scanner such as Trivy or Grype lists known CVEs in every package. Failing on every finding blocks all builds forever; failing on critical ones that already have a fix is a rule people can live with." accent={ACCENT} active={at(1)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.scanGate} onChange={(e) => set({ scanGate: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Fail the build on fixable critical CVEs
                </label>
              </FlowStep>
              <FlowArrow label="layers" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Keep secrets out of every layer" what="Each instruction adds a layer, and deleting a file later only hides it. Anyone who can pull the image can unpack the earlier layer. A build secret mount exists only while one step runs." accent={ACCENT} active={at(2)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.secretMount} onChange={(e) => set({ secretMount: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Pass the token with --mount=type=secret
                </label>
                <ol className="mt-1 space-y-0.5 font-mono text-[10px]">
                  {ls.map((l, i) => (
                    <li key={i} className="break-words" style={{ color: l.add.includes("/tmp/token") ? "var(--bad)" : "var(--muted)" }}>
                      {i + 1}. {l.line}
                    </li>
                  ))}
                </ol>
                <p className="mt-1 font-mono text-[10px]">ls in the container: {fs.visible.join(" ")}</p>
              </FlowStep>
              <FlowArrow label="container" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Run with least privilege" what="Root in a container is root on the files it can reach. Run as an unprivileged user, make the filesystem read-only, drop every Linux capability and forbid gaining new privileges; add back only what the app proves it needs." accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.nonRoot} onChange={(e) => set({ nonRoot: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  USER 10001
                </label>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.hardened} onChange={(e) => set({ hardened: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Read-only, --cap-drop ALL, no-new-privileges
                </label>
              </FlowStep>
              <FlowArrow label="host" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Never hand it the host" what="Mounting /var/run/docker.sock or running --privileged gives the container the host: it can start another container with the host's disk mounted. CI agents and monitoring tools ask for this more often than you'd expect." accent={ACCENT} active={at(4)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.noSocket} onChange={(e) => set({ noSocket: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  No Docker socket, no --privileged
                </label>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The layer replay and each attack&apos;s outcome run here; base image sizes, package counts and CVE counts are illustrative.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
