"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { CACHE_S, CODE_VARS, EVENTS, FIRST, FIXED, STORAGE, TEMPLATE_V14, TEMPLATE_V15, month, outcome, placeholders, render, type Design, type EventId, type Storage } from "@/lib/promptManagement";

const ACCENT = "var(--tools)";

export default function PromptManagementDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [ev, setEv] = useState<EventId>("outage");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const mo = month(d);
  const o = outcome(ev, d);
  const reg = d.storage !== "code";
  const v15 = render(TEMPLATE_V15, CODE_VARS);

  const nodes: MapNode[] = [
    { id: "editor", label: "Support lead", sub: reg ? "edits in the registry" : "opens a pull request", at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "registry", label: "Prompt registry", sub: reg ? (d.labels ? "v15 · production → v14" : "latest version") : "not used", at: [50, 18], mobileAt: [75, 12], state: reg ? (ev === "outage" ? "bad" : "good") : "dim" },
    { id: "repo", label: "Repo + deploy", sub: reg ? "code only" : "prompt in code", at: [86, 18], mobileAt: [75, 42], state: reg ? "idle" : "active" },
    { id: "app", label: "Support bot", sub: d.storage === "cached" ? `cache ${CACHE_S} s + bundled copy` : d.storage === "live" ? "fetches every call" : "prompt compiled in", at: [50, 82], mobileAt: [25, 42], state: o.good ? "good" : "bad" },
    { id: "model", label: "Model", sub: "renders the template", at: [86, 82], mobileAt: [75, 76], state: "active" },
    { id: "traces", label: "Traces", sub: d.tagTraces ? "prompt version on each" : "no version", at: [14, 82], mobileAt: [25, 76], state: d.tagTraces ? "good" : "dim" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("e", ["editor", reg ? "registry" : "repo"], { label: ev === "bad" ? "roll back" : ev === "rename" ? "publish v15" : "edit" })
    : stage === 1 ? (reg ? hops("f", ["registry", "app"], { label: ev === "outage" ? (d.storage === "cached" ? "cache / fallback" : "503") : "fetch", tone: ev === "outage" && d.storage === "live" ? "bad" : undefined }) : hops("d", ["repo", "app"], { label: "deploy" }))
    : stage === 2 ? hops("r", ["app", "model"], { label: ev === "rename" && !o.good ? "{{first_name}}" : "rendered prompt", tone: ev === "rename" && !o.good ? "bad" : undefined })
    : stage === 3 ? hops("t", ["app", "traces"], { label: d.tagTraces ? "v14 · production" : "untagged" })
    : stage === 4 ? hops("a", ["traces", "editor"], { label: o.good ? "done" : "problem", tone: o.good ? "good" : "bad" })
    : [];

  const captions = [
    `Step 1: ${EVENTS.find((x) => x.id === ev)!.title}.`,
    reg ? (d.storage === "cached" ? `Step 2: the bot reads the prompt from a ${CACHE_S}-second cache, with a copy bundled in the app as a last resort.` : "Step 2: the bot fetches the prompt from the registry on every request.") : "Step 2: the prompt ships with the next deploy.",
    `Step 3: the template is filled with the variables the code sends: ${Object.keys(CODE_VARS).join(", ")}.`,
    d.tagTraces ? "Step 4: every trace records the prompt version and label." : "Step 4: traces don't record which prompt version ran.",
    `Step 5: ${o.text}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${mo.good} of ${EVENTS.length} events handled well · ${EVENTS.find((x) => x.id === ev)!.title}: ${o.text}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="Tools · interactive"
        title="Prompt management"
        blurb="A support bot's prompt can be a string in the code or an entry in a prompt registry (Langfuse, PromptLayer, a provider's prompt store) that people outside engineering can edit. Moving it out of the code makes edits fast and adds new ways to break production. Run one month: an edit, a bad edit, an outage, a renamed variable and an audit question."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="A support lead, the prompt registry, the repo and deploy, the support bot, the model and traces"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "editor", to: "registry", label: "edit", dim: !reg },
                  { from: "editor", to: "repo", label: "PR", dim: reg },
                  { from: "registry", to: "app", label: "fetch", dim: !reg },
                  { from: "app", to: "model", label: "prompt" },
                  { from: "app", to: "traces", label: "trace" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="The month's events and how each went">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">the month · {mo.good}/{EVENTS.length} handled well</p>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {mo.rows.map((r) => (
                    <li key={r.e.id}>
                      <span style={{ color: r.good ? "var(--good)" : "var(--bad)" }} aria-hidden>
                        {r.good ? "✓ " : "✕ "}
                      </span>
                      {r.e.title}
                      <span className="block text-[11px] text-[var(--muted)]">{r.text}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices<EventId> label="Event" accent={ACCENT} value={ev} onChange={setEv} options={EVENTS.map((x) => ({ id: x.id, label: x.title.split(";")[0].split(":")[0] }))} />
              </div>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Registry, nothing else
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Cached, labelled, checked, traced
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Running…">
                Play this event
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Decide where the prompt lives" what="In the code, a prompt is reviewed, tested and versioned like everything else, and changing it takes a deploy. In a registry, anyone allowed can change it in minutes, and the app depends on the registry at run time." accent={ACCENT} active={at(0)}>
                <Choices<Storage> label="Prompt storage" accent={ACCENT} value={d.storage} onChange={(v) => set({ storage: v })} options={STORAGE.map((x) => ({ id: x.id, label: x.label }))} />
                <p className="mt-1 text-[11px] text-[var(--faint)]">{STORAGE.find((x) => x.id === d.storage)!.one}</p>
              </FlowStep>
              <FlowArrow label="versions" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Deploy with labels, roll back by moving one" what="Every save is a new version. Labels like staging and production point at versions; the app asks for “production”. Promoting and rolling back are moving a label, not editing text." accent={ACCENT} active={at(1)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.labels} onChange={(e) => set({ labels: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  The app fetches the production label, not the latest
                </label>
              </FlowStep>
              <FlowArrow label="fetch" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Don't let the registry take the bot down" what={`Fetching on every call adds latency and makes the registry a dependency of every request. Cache it for a short time (here ${CACHE_S} s) and bundle the current production version in the app, so an outage changes nothing.`} accent={ACCENT} active={at(2)}>
                <p className="text-xs">{outcome("outage", d).text}.</p>
              </FlowStep>
              <FlowArrow label="template" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Check variables before a version can go live" what="A template is code: its placeholders must match what the app sends. Rename {{customer_name}} to {{first_name}} in the registry, and the code still sends customer_name." accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.varCheck} onChange={(e) => set({ varCheck: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Refuse to publish a version whose variables the app doesn&apos;t send
                </label>
                <p className="font-mono text-[10px] text-[var(--muted)]">v14 needs {placeholders(TEMPLATE_V14).join(", ")} · v15 needs {placeholders(TEMPLATE_V15).join(", ")}</p>
                <p className="mt-1 break-words font-mono text-[10px]" style={{ color: v15.missing.length ? "var(--bad)" : "var(--good)" }}>
                  v15 rendered: “{v15.text}”
                </p>
              </FlowStep>
              <FlowArrow label="traces" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Tag every trace with the version" what="When the prompt changes outside the code, git history no longer says what ran. The prompt version on each trace is how you answer “what did the bot say last Tuesday, and why?”." accent={ACCENT} active={at(4)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.tagTraces} onChange={(e) => set({ tagTraces: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Prompt name, version and label on every trace
                </label>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Template rendering, the variable check, caching and the outage run here; times are illustrative.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
