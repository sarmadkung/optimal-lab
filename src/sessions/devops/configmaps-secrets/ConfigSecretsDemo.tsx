"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { CONFIG, EVENTS, FIRST, FIXED, NEW_PASSWORD, PASSWORD, base64, checksum, judge, podSpec, scorecard, unbase64, type Delivery, type Design, type EventId, type Source } from "@/lib/configSecrets";

const ACCENT = "var(--ops)";

export default function ConfigSecretsDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [eid, setEid] = useState<EventId>("rotate");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const v = judge(eid, d);
  const card = scorecard(d);
  const ev = EVENTS.find((x) => x.id === eid)!;
  const tone = v.ok ? "good" : "bad";
  const ext = d.source === "external";

  const nodes: MapNode[] = [
    { id: "repo", label: "Git repo", sub: ext ? "ExternalSecret only" : "Secret manifest", at: [14, 18], mobileAt: [25, 12], state: eid === "repo" ? tone : "active" },
    { id: "store", label: "Secret store", sub: ext ? "Vault / cloud" : "not used", at: [50, 18], mobileAt: [75, 12], state: ext ? "active" : "dim" },
    { id: "api", label: "API server", sub: d.narrowRbac ? "RBAC: app only" : "RBAC: whole team", at: [86, 18], mobileAt: [75, 45], state: eid === "peek" ? tone : "active" },
    { id: "etcd", label: "etcd", sub: d.encrypted ? "encrypted (KMS)" : "unencrypted", at: [86, 82], mobileAt: [75, 80], state: eid === "backup" ? tone : d.encrypted ? "active" : "wait" },
    { id: "pods", label: "Pods", sub: d.delivery === "env" ? "env vars" : d.delivery === "volume" ? "mounted files" : "subPath file", at: [50, 82], mobileAt: [25, 45], state: eid === "setting" || eid === "rotate" ? tone : "active" },
    { id: "person", label: eid === "backup" ? "Stranger" : "Teammate", sub: eid === "peek" ? "kubectl get secret" : eid === "repo" ? "git clone" : eid === "backup" ? "found the backup" : "makes the change", at: [14, 82], mobileAt: [25, 80], state: "active" },
  ];

  const flow: Packet[][] = [
    hops("a", ["api", "pods"], { label: d.delivery === "env" ? "env" : "files" }),
    hops("b", ["api", "pods"], { label: d.checksum ? "rollout" : "no restart" }),
    hops("c", ["person", "api"], { label: "get secret" }),
    hops("d", ["api", "etcd"], { label: d.encrypted ? "ciphertext" : "plain" }),
    hops("e", [ext ? "store" : "repo", "api"], { label: ext ? "sync" : "apply" }),
  ];
  const special: Packet[] =
    eid === "setting" || eid === "rotate" ? hops("x", ["api", "pods"], { label: v.ok ? "new value" : "old value", tone })
    : eid === "peek" ? hops("x", ["person", "api"], { label: v.ok ? "Forbidden" : "base64", tone })
    : eid === "backup" ? hops("x", ["etcd", "person"], { label: v.ok ? "ciphertext" : "passwords", tone })
    : hops("x", ["repo", "person"], { label: v.ok ? "vault path" : "base64", tone });
  const packets: Packet[] = stage === null ? [] : stage === ev.step ? special : flow[stage];

  const captions = [
    `Step 1: the app gets its config as ${d.delivery === "env" ? "environment variables" : d.delivery === "volume" ? "files in a mounted volume" : "a single file mounted with subPath"}.`,
    d.checksum ? `Step 2: the pod template carries checksum/config: ${checksum(CONFIG, PASSWORD)}; a new value changes it and triggers a rollout.` : "Step 2: changing a ConfigMap or Secret doesn't restart anything.",
    d.narrowRbac ? "Step 3: only the app's service account can read this Secret." : "Step 3: anyone with edit rights in the namespace can read every Secret in it.",
    d.encrypted ? "Step 4: the API server encrypts Secrets before writing them to etcd." : "Step 4: Secrets go into etcd unencrypted.",
    ext ? "Step 5: the value lives in a secret store; an operator syncs it into the cluster." : "Step 5: the Secret manifest, value included, is committed to Git.",
  ];
  const caption = stage !== null ? (stage === ev.step ? `${captions[stage]} ${ev.title}: ${v.text}.` : captions[stage]) : `${card.filter((c) => c.ok).length} of ${EVENTS.length} handled · ${ev.title}: ${v.text}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="ConfigMaps and Secrets"
        blurb="The same image runs everywhere; settings and passwords come from ConfigMaps and Secrets. How they reach the pod decides whether a change takes effect, and a Secret is only as secret as who can read it, where it's stored and where its manifest lives. Five things happen to one app's config."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="A Git repo or a secret store feeds the API server, which stores Secrets in etcd and passes config to pods; a teammate or a stranger tries to read them"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "repo", to: "api", label: "apply" },
                  { from: "store", to: "api", label: "sync", dim: !ext },
                  { from: "api", to: "etcd", label: "store" },
                  { from: "api", to: "pods", label: "config" },
                  { from: "person", to: "api", label: "kubectl" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Five events">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">five events · {card.filter((c) => c.ok).length}/{EVENTS.length} handled</p>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {card.map((c) => (
                    <li key={c.event.id}>
                      <span style={{ color: c.ok ? "var(--good)" : "var(--bad)" }} aria-hidden>
                        {c.ok ? "✓ " : "✕ "}
                      </span>
                      {c.event.title}
                      <span className="block break-words text-[11px] text-[var(--muted)]">{c.text}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices<EventId> label="What happens" accent={ACCENT} value={eid} onChange={setEid} options={EVENTS.map((x) => ({ id: x.id, label: x.title }))} />
              </div>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Tutorial setup
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Production setup
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Running…">
                Play it
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Pass config in, don't bake it" what="One image, many environments: values come from a ConfigMap (settings) and a Secret (credentials). Environment variables are fixed when the container starts; a mounted volume is updated in place, except through subPath." accent={ACCENT} active={at(0)}>
                <Choices<Delivery> label="Delivered as" accent={ACCENT} value={d.delivery} onChange={(x) => set({ delivery: x })} options={[{ id: "env", label: "Env vars" }, { id: "volume", label: "Mounted volume" }, { id: "subPath", label: "subPath file" }]} />
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] leading-relaxed">{podSpec(d).join("\n")}</pre>
              </FlowStep>
              <FlowArrow label="a value changes" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Roll out when config changes" what="Kubernetes doesn't restart pods when a ConfigMap or Secret changes. Put a hash of the config in the pod template: a new value changes the template, and the Deployment does an ordinary rolling update." accent={ACCENT} active={at(1)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.checksum} onChange={(e) => set({ checksum: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  checksum/config annotation
                </label>
                <p className="font-mono text-[10px] text-[var(--muted)]">
                  before {checksum(CONFIG, PASSWORD)} → after rotation {checksum(CONFIG, NEW_PASSWORD)}
                </p>
              </FlowStep>
              <FlowArrow label="kubectl" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Limit who can read Secrets" what="A Secret's value is base64, an encoding anyone can reverse. The real protection is RBAC: the right to get or list Secrets, which namespace-wide edit roles usually include." accent={ACCENT} active={at(2)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.narrowRbac} onChange={(e) => set({ narrowRbac: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Only the app&apos;s service account can get it
                </label>
                <p className="break-all font-mono text-[10px] text-[var(--muted)]">
                  password: {base64(PASSWORD)} → base64 -d → {unbase64(base64(PASSWORD))}
                </p>
              </FlowStep>
              <FlowArrow label="storage" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Encrypt Secrets at rest" what="Unless the API server is configured to encrypt them, Secrets sit in etcd unencrypted, and so do etcd's backups. Encryption with a key held in a cloud KMS makes a stolen backup useless." accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.encrypted} onChange={(e) => set({ encrypted: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  EncryptionConfiguration with a KMS provider
                </label>
              </FlowStep>
              <FlowArrow label="source of truth" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Keep the values out of Git" what="Committing a Secret manifest commits the password. Store the value in a secret manager and commit only a pointer that an operator (External Secrets, a CSI driver) resolves, or commit it encrypted (Sealed Secrets, SOPS)." accent={ACCENT} active={at(4)}>
                <Choices<Source> label="Values come from" accent={ACCENT} value={d.source} onChange={(x) => set({ source: x })} options={[{ id: "git", label: "A Secret in Git" }, { id: "external", label: "A secret store" }]} />
                <p className="mt-2 text-[11px] text-[var(--faint)]">base64 and the config checksum (SHA-256) are computed here; the timings are approximate.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
