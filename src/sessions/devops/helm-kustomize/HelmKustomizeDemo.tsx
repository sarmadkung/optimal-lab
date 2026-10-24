"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { BASE, ENVS, FIRST, FIXED, HAND_EDIT, TEMPLATE, diff, envValues, events, overlay, render, type Design, type Env, type Tool } from "@/lib/helmKustomize";

const ACCENT = "var(--ops)";

export default function HelmKustomizeDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [env, setEnv] = useState<Env>("prod");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const helm = d.tool === "helm";
  const r = render(env, d);
  const evs = events(d);
  const sp = diff(render("staging", d).lines, render("prod", d).lines);
  const replicas = r.lines.find((l) => l.trim().startsWith("replicas:"))?.split(":")[1].trim() ?? "1";
  const image = r.lines.find((l) => l.includes("image:"))!.split("image:")[1].trim();
  const caught = r.errors.length > 0;

  const nodes: MapNode[] = [
    { id: "base", label: helm ? "Chart templates" : "Kustomize base", sub: helm ? "templates/*.yaml" : "base/*.yaml", at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "env", label: helm ? `values-${env}.yaml` : `overlays/${env}`, sub: env === "prod" && !caught && helm ? "replica: 5 (typo)" : `${env} settings`, at: [50, 18], mobileAt: [75, 12], state: env === "prod" && helm && !d.schema ? "wait" : "active" },
    { id: "check", label: helm ? "values schema" : "API validation", sub: helm ? (d.schema ? "strict" : "none") : "at apply", at: [86, 18], mobileAt: [75, 45], state: caught ? "good" : helm && !d.schema ? "dim" : "active" },
    { id: "render", label: helm ? "helm template" : "kustomize build", sub: `replicas ${replicas} · ${image}`, at: [86, 82], mobileAt: [25, 45], state: image.endsWith(":latest") ? "wait" : "good" },
    { id: "diff", label: "Diff vs live", sub: d.diff ? (env === "prod" ? `replicas ${HAND_EDIT} → ${replicas}` : "reviewed") : "skipped", at: [50, 82], mobileAt: [25, 80], state: d.diff ? "good" : "dim" },
    { id: "cluster", label: `${env} cluster`, sub: `${replicas} pods · ${image}`, at: [14, 82], mobileAt: [75, 80], state: evs.every((e) => e.ok) || env !== "prod" ? "good" : "bad" },
  ];

  const ids = ["base", "env", "check", "render", "diff", "cluster"];
  const labels = ["templates", helm ? "values" : "patches", caught ? "error → fix" : "ok", "manifests", d.diff ? "reviewed" : "apply"];
  const packets: Packet[] = stage === null ? [] : hops(`s${stage}`, [ids[stage], ids[stage + 1]], { label: labels[stage], tone: stage === 2 && caught ? "good" : stage === 4 ? (d.diff ? "good" : "bad") : undefined });

  const captions = [
    `Step 1: one set of ${helm ? "templates with placeholders" : "plain manifests"} for every environment.`,
    `Step 2: ${env} adds its own ${helm ? "values file" : "overlay"} on top.`,
    caught ? `Step 3: ${r.errors[0]}; the typo is fixed.` : helm && env === "prod" ? "Step 3: nothing checks the values; replica: 5 is silently ignored." : "Step 3: the settings pass.",
    `Step 4: the rendered Deployment runs ${replicas} replica${replicas === "1" ? "" : "s"} of ${image}.`,
    d.diff ? `Step 5: the diff against the live cluster is reviewed${env === "prod" ? `: replicas ${HAND_EDIT} → ${replicas}` : ""}, then applied.` : "Step 5: applied straight to the cluster.",
  ];
  const caption = stage !== null ? captions[stage] : `${evs.filter((e) => e.ok).length} of ${evs.length} production mistakes caught · ${env}: ${replicas} × ${image}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="Helm and Kustomize"
        blurb="Dev, staging and production run the same app with different replicas, hostnames, sizes and versions. Helm fills in templates from values files; Kustomize patches plain manifests with overlays. Both render real YAML here. Three mistakes reach production unless something stops them."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Base templates and per-environment settings are validated, rendered, diffed against the live cluster and applied"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "base", to: "env", label: "+" },
                  { from: "env", to: "check", label: "validate" },
                  { from: "check", to: "render", label: "render" },
                  { from: "render", to: "diff", label: "diff", dim: !d.diff },
                  { from: "diff", to: "cluster", label: "apply" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Production mistakes and the staging to production diff">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">three mistakes · {evs.filter((e) => e.ok).length}/{evs.length} caught</p>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {evs.map((e) => (
                    <li key={e.id}>
                      <span style={{ color: e.ok ? "var(--good)" : "var(--bad)" }} aria-hidden>
                        {e.ok ? "✓ " : "✕ "}
                      </span>
                      {e.title}
                      <span className="block text-[11px] text-[var(--muted)]">{e.text}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">staging → production</p>
                <pre className="mt-1 overflow-x-auto whitespace-pre rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] leading-relaxed">
                  {sp.removed.map((l) => `- ${l.trim()}`).join("\n")}
                  {"\n"}
                  {sp.added.map((l) => `+ ${l.trim()}`).join("\n")}
                </pre>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices<Env> label="Environment" accent={ACCENT} value={env} onChange={setEnv} options={ENVS.map((e) => ({ id: e, label: e }))} />
              </div>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Helm, no guard rails
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Schema, pinned tags, diff
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Deploying…">
                {`Deploy ${env}`}
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Write the manifests once" what="Helm templates have placeholders filled from values; Kustomize keeps plain, valid YAML and patches it. Helm also versions a chart as a package and records releases; Kustomize is built into kubectl." accent={ACCENT} active={at(0)}>
                <Choices<Tool> label="Tool" accent={ACCENT} value={d.tool} onChange={(x) => set({ tool: x })} options={[{ id: "helm", label: "Helm" }, { id: "kustomize", label: "Kustomize" }]} />
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] leading-relaxed">{helm ? TEMPLATE : JSON.stringify(BASE, null, 1)}</pre>
              </FlowStep>
              <FlowArrow label="+ environment" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Layer each environment's settings" what="Only what differs goes in the environment's file. Helm deep-merges values-prod.yaml over the chart's defaults; Kustomize merges an overlay's patches into the base." accent={ACCENT} active={at(1)}>
                <pre className="max-h-40 overflow-auto whitespace-pre rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] leading-relaxed">
                  {helm ? `# values-${env}.yaml\n${JSON.stringify(envValues(env, d), null, 1)}` : `# overlays/${env}\n${JSON.stringify(overlay(env, d), null, 1)}`}
                </pre>
              </FlowStep>
              <FlowArrow label="settings" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Reject settings that mean nothing" what="Helm ignores a values key no template reads, so replica: 5 renders the default of 1. A values.schema.json that forbids unknown keys turns the typo into an error. Kustomize's typo ends up in the YAML, and the API server's strict validation rejects it." accent={ACCENT} active={at(2)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.schema} disabled={!helm} onChange={(e) => set({ schema: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  values.schema.json, no extra keys
                </label>
                <p className="font-mono text-[10px]" style={{ color: caught ? "var(--good)" : "var(--muted)" }}>
                  {r.errors.length ? r.errors.join("; ") : "no errors"}
                </p>
              </FlowStep>
              <FlowArrow label="rendered YAML" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Pin what each environment runs" what="A template that falls back to :latest means nobody chose production's version. Set the tag per environment, and promoting a release becomes a one-line change you can review and revert." accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.pinTag} onChange={(e) => set({ pinTag: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Set the image tag per environment
                </label>
                <pre className="mt-2 max-h-56 overflow-auto whitespace-pre rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] leading-relaxed">{r.lines.join("\n")}</pre>
              </FlowStep>
              <FlowArrow label="apply" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Diff before you apply" what={`Someone ran kubectl scale --replicas=${HAND_EDIT} in production during a spike. The next deploy puts back what the repo says. helm diff or kubectl diff shows that change before it happens.`} accent={ACCENT} active={at(4)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.diff} onChange={(e) => set({ diff: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Show the diff against the live cluster first
                </label>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Value merging, template rendering, overlay patching, the schema check and the diffs all run here.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
