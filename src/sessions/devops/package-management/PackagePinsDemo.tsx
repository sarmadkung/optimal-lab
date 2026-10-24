"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type NodeState, type Packet } from "@/components/system/SystemMap";
import { FIRST, FIXED, RELEASES, REPORT_DAY, SERVERS, STATUS_TEXT, STRATEGIES, fleet, server, type Design, type StrategyId } from "@/lib/packagePins";

const ACCENT = "var(--ops)";
const short = (v: string | null) => (v ? v.replace("-1~noble", "").replace("3.0.13-0ubuntu", "u") : "—");
const tone = (s: string): NodeState => (s === "ok" ? "good" : s === "unpatched" ? "wait" : "bad");

export default function PackagePinsDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [target, setTarget] = useState("C");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const f = fleet(d);
  const s = server(target, d);
  const inst = s.install;
  const image = d.strategy === "image";
  const strat = STRATEGIES.find((x) => x.id === d.strategy)!;

  const nodes: MapNode[] = [
    { id: "vendor", label: "nginx.org repo", sub: "keeps every version", at: [25, 14], mobileAt: [25, 10], state: "active" },
    { id: "mirror", label: "Ubuntu mirror", sub: "newest update only", at: [75, 14], mobileAt: [75, 10], state: "active" },
    { id: "build", label: image ? "Image pipeline" : "Provisioning script", sub: image ? `weekly · day ${s.image}` : strat.label.toLowerCase(), at: [50, 48], mobileAt: [50, 36], state: inst.ok ? "active" : "bad" },
    ...f.servers.map((x, i) => ({
      id: x.id,
      label: `Server ${x.id}`,
      sub: x.status === "failed" ? "build failed" : `${short(x.nginx)} · ${short(x.openssl)}`,
      at: [16 + i * 34, 84] as [number, number],
      mobileAt: ([[25, 64], [75, 64], [50, 90]] as [number, number][])[i],
      state: tone(x.status),
    })),
  ];

  const packets: Packet[] =
    stage === 0 ? [...hops("v", ["vendor", "build"], { label: "index" }), ...hops("u", ["mirror", "build"], { label: "index" })]
    : stage === 1 ? hops("p", ["mirror", "build"], { label: inst.error ? "not found" : short(inst.versions.openssl), tone: inst.error ? "bad" : undefined })
    : stage === 2 ? (inst.ok ? hops("i", ["build", target], { label: inst.configOk ? "install" : "nginx -t ✕", tone: inst.configOk ? "good" : "bad" }) : [])
    : stage === 3 ? (d.unattended && inst.ok ? hops("s", ["mirror", target], { label: "security update" }) : [])
    : stage === 4 ? hops("r", [target, "build"], { label: STATUS_TEXT[s.status].split(":")[0], tone: s.status === "ok" ? "good" : "bad" })
    : [];

  const captions = [
    `Step 1: on day ${inst.day}, apt-get update reads nginx ${inst.candidates.nginx.map(short).join(", ")} and openssl ${inst.candidates.openssl.map(short).join(", ")}.`,
    inst.error ? `Step 2: ${inst.error}. Ubuntu dropped that build from the index when a newer one came out.` : `Step 2: apt picks nginx ${inst.versions.nginx} and openssl ${inst.versions.openssl}.`,
    !inst.ok ? "Step 3: nothing to install; the build stops." : inst.configOk ? `Step 3: installed; nginx -t passes on server ${target}.` : `Step 3: nginx ${inst.versions.nginx} rejects the site config. Server ${target} never passes its health check.`,
    d.unattended ? (s.upgrades.length ? `Step 4: unattended-upgrades applied ${s.upgrades.join("; ")}.` : "Step 4: unattended-upgrades found nothing newer to apply.") : "Step 4: nothing updates a running server; it keeps what it was built with.",
    `Step 5: on day ${REPORT_DAY}, server ${target}: ${STATUS_TEXT[s.status]}.`,
  ];
  const caption = stage !== null ? captions[stage] : `Day ${REPORT_DAY}: ${f.serving} of 3 serving · ${f.patched} patched · ${f.identical ? "all identical" : `${f.variants} different version sets`}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="Package management"
        blurb="Three web servers are built with apt on days 0, 20 and 45, from the vendor's nginx repository and Ubuntu's mirror. The index changes under you: new releases appear, and Ubuntu lists only the newest security update. Pick how versions are chosen and see the fleet on day 60."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="The nginx.org repository and the Ubuntu mirror feed a provisioning script or an image pipeline, which builds servers A, B and C"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "vendor", to: "build", label: "nginx" },
                  { from: "mirror", to: "build", label: "openssl" },
                  ...SERVERS.map((x) => ({ from: "build", to: x.id, label: image ? "image" : `day ${x.built}` })),
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Release timeline">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">what the repositories publish</p>
                <ul className="mt-2 space-y-1 text-xs">
                  {RELEASES.filter((r) => r.day >= 0).map((r) => (
                    <li key={r.version} className="flex gap-2">
                      <span className="w-14 shrink-0 font-mono text-[var(--faint)]">day {r.day}</span>
                      <span className="min-w-0">
                        <span className="font-mono">{r.pkg} {short(r.version)}</span> <span className="text-[var(--muted)]">· {r.note}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-[var(--faint)]">u3.4 is 3.0.13-0ubuntu3.4. Dates and the 1.28 config break are illustrative.</p>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices<string> label="Follow one server" accent={ACCENT} value={target} onChange={setTarget} options={SERVERS.map((x) => ({ id: x.id, label: `${x.id}, built day ${x.built}` }))} />
              </div>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Latest, no updates
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Baked image + security updates
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Building…">
                Build this server
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Read the index" what="apt-get update downloads each repository's list of packages and versions. What you get depends on the day you run it, not on the day you wrote the script." accent={ACCENT} active={at(0)}>
                <p className="font-mono text-[11px]">
                  day {inst.day}
                  {image ? " (this week's image build)" : ""}
                </p>
                <p className="break-words font-mono text-[11px] text-[var(--muted)]">nginx: {inst.candidates.nginx.join(", ")}</p>
                <p className="break-words font-mono text-[11px] text-[var(--muted)]">openssl: {inst.candidates.openssl.join(", ")}</p>
              </FlowStep>
              <FlowArrow label="candidates" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Choose the version" what="Without a pin apt takes the newest. An exact version can vanish: Ubuntu's update pockets list only the latest build. A pin in apt preferences takes the newest version matching a pattern, so patches arrive and new series don't." accent={ACCENT} active={at(1)}>
                <Choices<StrategyId> label="How versions are chosen" accent={ACCENT} value={d.strategy} onChange={(v) => set({ strategy: v })} options={STRATEGIES.map((x) => ({ id: x.id, label: x.label }))} />
                <p className="mt-1 break-words font-mono text-[10px] text-[var(--muted)]">{strat.line}</p>
                <p className="mt-1 text-[11px] text-[var(--faint)]">{strat.one}</p>
                <p className="mt-1 break-words font-mono text-[11px]" style={{ color: inst.error ? "var(--bad)" : "var(--text)" }}>
                  {inst.error ?? `→ nginx ${inst.versions.nginx}, openssl ${inst.versions.openssl}`}
                </p>
              </FlowStep>
              <FlowArrow label="packages" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Install, then test before serving" what="A new major series can change defaults or remove a directive. Run the service's own config check (nginx -t) as part of the build, so a bad combination fails in the pipeline, not on a live server." accent={ACCENT} active={at(2)}>
                <p className="font-mono text-xs" style={{ color: !inst.ok || !inst.configOk ? "var(--bad)" : "var(--good)" }}>
                  {!inst.ok ? "not installed" : inst.configOk ? "nginx: configuration file test is successful" : "nginx: [emerg] unknown directive in the site config"}
                </p>
              </FlowStep>
              <FlowArrow label="running server" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Patch what is already running" what="A server keeps the versions it was built with. unattended-upgrades installs Ubuntu's security updates daily; by default it ignores other repositories, and installing pkg=version doesn't hold a package back." accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.unattended} onChange={(e) => set({ unattended: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  unattended-upgrades for security updates
                </label>
                <p className="text-[11px] text-[var(--muted)]">{image ? "With images, patches also arrive through the weekly rebuild and fleet replacement." : s.upgrades.length ? s.upgrades.join(" · ") : "No upgrades applied to this server."}</p>
              </FlowStep>
              <FlowArrow label={`day ${REPORT_DAY}`} accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Compare the fleet" what="Servers built from the same script on different days drift apart. The fix is to resolve versions once, test that set, and copy it everywhere: an image, a lockfile or a pinned snapshot of the mirror." accent={ACCENT} active={at(4)}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[18rem] text-left text-[11px]">
                    <thead>
                      <tr className="text-[var(--faint)]">
                        <th className="py-0.5 pr-2 font-normal">server</th>
                        <th className="py-0.5 pr-2 font-normal">nginx</th>
                        <th className="py-0.5 pr-2 font-normal">openssl</th>
                        <th className="py-0.5 font-normal">day {REPORT_DAY}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {f.servers.map((x) => (
                        <tr key={x.id} className="border-t border-[var(--line)]">
                          <td className="py-1 pr-2 font-mono">{x.id}</td>
                          <td className="py-1 pr-2 font-mono">{short(x.nginx)}</td>
                          <td className="py-1 pr-2 font-mono">{short(x.openssl)}</td>
                          <td className="py-1" style={{ color: x.status === "ok" ? "var(--good)" : "var(--bad)" }}>
                            {STATUS_TEXT[x.status]}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Version comparison follows dpkg&apos;s rules and pins match like apt preferences; both run here.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
