"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { DAYS, FIRST, FIXED, KEEP_N, LAYER_MB, PUSHES, month, type Design, type Ref, type Retention, type Tagging } from "@/lib/registryTags";

const ACCENT = "var(--ops)";

export default function RegistryDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const m = month(d);
  const [deploy, hotfix, scale, rollback] = m.steps;
  const tagged = m.list.filter((x) => x.tags.some((t) => t !== x.sha) || x.i === m.list.length - 1);

  const nodes: MapNode[] = [
    { id: "ci", label: "CI", sub: `${PUSHES} pushes a month`, at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "registry", label: "Registry", sub: `${m.keptCount} images · ${m.storage.deduped} MB`, at: [50, 18], mobileAt: [75, 12], state: "active" },
    { id: "retention", label: "Retention job", sub: d.retention === "none" ? "keeps everything" : d.retention === "lastN" ? `keeps last ${KEEP_N}` : `last ${KEEP_N} + releases + deployed`, at: [86, 18], mobileAt: [75, 45], state: d.retention === "lastN" ? "wait" : "active" },
    { id: "prod", label: "3 prod nodes", sub: hotfix.ok ? "one image" : "old v1.42.0", at: [86, 82], mobileAt: [25, 45], state: hotfix.ok ? "good" : "bad" },
    { id: "scale", label: "2 new nodes", sub: `day ${DAYS.scale}`, at: [50, 82], mobileAt: [75, 80], state: scale.ok ? "good" : "bad" },
    { id: "deploy", label: "Deployment", sub: d.ref === "digest" ? "image@sha256:…" : d.tagging === "latest" ? "image:latest" : "image:tag", at: [14, 82], mobileAt: [25, 80], state: rollback.ok ? "active" : "bad" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("p", ["ci", "registry"], { label: "push" })
    : stage === 1 ? hops("l", ["registry", "prod"], { label: `pull ${LAYER_MB.app} MB` })
    : stage === 2 ? hops("h", ["ci", "registry"], { label: "hotfix", tone: hotfix.ok ? "good" : "bad" })
    : stage === 3 ? hops("s", ["registry", "scale"], { label: "pull", tone: scale.ok ? "good" : "bad" })
    : stage === 4 ? [...(d.retention !== "none" ? hops("r", ["retention", "registry"], { label: "delete" }) : []), ...hops("b", ["deploy", "prod"], { label: "roll back", tone: rollback.ok ? "good" : "bad", start: d.retention !== "none" ? 1 : 0 })]
    : [];

  const captions = [
    `Step 1: day ${DAYS.release2}: ${deploy.text}.`,
    `Step 2: ${PUSHES} images share ${m.all.layers} unique layers, ${m.all.deduped.toLocaleString("en-US")} MB instead of ${m.all.naive.toLocaleString("en-US")}; a node already holding the base and dependency layers pulls ${LAYER_MB.app} MB.`,
    `Step 3: day ${DAYS.hotfix}: ${hotfix.text}.`,
    `Step 4: day ${DAYS.scale}: ${scale.text}.`,
    `Step 5: day ${DAYS.rollback}: ${rollback.text}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${m.ok} of 4 events go well · ${m.keptCount} images kept · ${m.storage.deduped} MB stored.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="Container registries"
        blurb="CI pushes an image on every merge; servers pull them to run. A tag like v1.42.0 is a name that can be moved; a digest is the hash of the image's manifest and can't be. Run one month: a release, a hotfix, a scale-up and a rollback, with a cleanup job deleting old images every night."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="CI pushes images to the registry, a retention job deletes old ones, and production nodes, new nodes and the deployment pull from it"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "ci", to: "registry", label: "push" },
                  { from: "retention", to: "registry", label: "nightly", dim: d.retention === "none" },
                  { from: "registry", to: "prod", label: "pull" },
                  { from: "registry", to: "scale", label: "pull" },
                  { from: "deploy", to: "prod", label: "image ref" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="The month's events">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">the month · {m.ok}/4 went well</p>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {m.steps.map((s) => (
                    <li key={s.day}>
                      <span style={{ color: s.ok ? "var(--good)" : "var(--bad)" }} aria-hidden>
                        {s.ok ? "✓ " : "✕ "}
                      </span>
                      day {s.day} · {s.title}
                      <span className="block break-words text-[11px] text-[var(--muted)]">{s.text}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">named images</p>
                <ul className="mt-1 space-y-0.5 font-mono text-[10px]">
                  {tagged.map((x) => (
                    <li key={x.i} className="break-all">
                      <span className="text-[var(--muted)]">#{x.i} day {x.day}</span> {x.tags.join(", ")} <span className="text-[var(--faint)]">{x.digest.slice(0, 19)}…</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Version tags, keep last {KEEP_N}
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Digests, immutable, smart cleanup
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Running…">
                Run the month
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Push and tag the image" what="Every build gets a name. :latest is a moving pointer to the last push. A tag with the commit hash identifies exactly one build; a version tag says which release it is." accent={ACCENT} active={at(0)}>
                <Choices<Tagging> label="Tags on each build" accent={ACCENT} value={d.tagging} onChange={(x) => set({ tagging: x })} options={[{ id: "latest", label: ":latest only" }, { id: "sha", label: "commit hash" }, { id: "release", label: "commit hash + version" }]} />
              </FlowStep>
              <FlowArrow label="layers" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Store and pull layers once" what="An image is a list of layers, each stored once under its hash. Builds that share a base and dependencies share those layers, in the registry and on every node, so a new build costs only its changed layers." accent={ACCENT} active={at(1)}>
                <p className="font-mono text-xs">
                  {m.all.naive.toLocaleString("en-US")} MB if copied · {m.all.deduped.toLocaleString("en-US")} MB stored ({m.all.layers} layers)
                </p>
                <p className="mt-1 break-all font-mono text-[10px] text-[var(--muted)]">#16 manifest → {m.list[16].digest}</p>
              </FlowStep>
              <FlowArrow label="hotfix" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Never move a release tag" what="Pushing a fix under an existing tag silently changes what that name means. Nodes that already pulled keep the old image. With tag immutability on, the registry refuses the overwrite." accent={ACCENT} active={at(2)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.immutable} onChange={(e) => set({ immutable: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Immutable tags
                </label>
              </FlowStep>
              <FlowArrow label="scale-up" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Deploy by digest" what="A deployment that names image@sha256:… gets the same bytes on every node, whenever it pulls. One that names a tag gets whatever the tag points to at pull time, which matters when an autoscaler adds nodes weeks later." accent={ACCENT} active={at(3)}>
                <Choices<Ref> label="The deployment references" accent={ACCENT} value={d.ref} onChange={(x) => set({ ref: x })} options={[{ id: "tag", label: "a tag" }, { id: "digest", label: "a digest" }]} />
              </FlowStep>
              <FlowArrow label="cleanup" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Clean up without deleting what runs" what={`Registries fill up, so old images get deleted. "Keep the last ${KEEP_N}" is easy and deletes the release that's running and the one you'd roll back to. Keep release tags and anything deployed recently as well.`} accent={ACCENT} active={at(4)}>
                <Choices<Retention> label="Retention" accent={ACCENT} value={d.retention} onChange={(x) => set({ retention: x })} options={[{ id: "none", label: "Keep everything" }, { id: "lastN", label: `Last ${KEEP_N}` }, { id: "smart", label: `Last ${KEEP_N} + releases + deployed` }]} />
                <p className="mt-1 font-mono text-[11px] text-[var(--muted)]">
                  day {DAYS.rollback}: {m.keptCount} images · {m.storage.deduped} MB
                </p>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Digests are real SHA-256 hashes of each manifest; layer sharing, tag moves and retention run here. Sizes and dates are illustrative.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
