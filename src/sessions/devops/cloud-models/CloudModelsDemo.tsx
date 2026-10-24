"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type NodeState, type Packet } from "@/components/system/SystemMap";
import { EVENTS, LAYERS, MODELS, STEP_LAYERS, owner, respond, type EventId, type LayerId, type Model, type Owner } from "@/lib/cloudModels";

const ACCENT = "var(--ops)";
const OWNER_STATE: Record<Owner, NodeState> = { you: "active", shared: "wait", provider: "good" };
const OWNER_COLOR: Record<Owner, string> = { you: "var(--c1)", shared: "var(--c2)", provider: "var(--good)" };

function Row({ layer, m }: { layer: LayerId; m: Model }) {
  const l = LAYERS.find((x) => x.id === layer)!;
  return (
    <div className="mt-2">
      <p className="text-xs font-medium">{l.label}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {MODELS.map((x) => (
          <span key={x.id} className="rounded px-1.5 py-0.5 font-mono text-[10px]" style={{ color: OWNER_COLOR[l.owners[x.id]], outline: x.id === m ? `1px solid ${OWNER_COLOR[l.owners[x.id]]}` : undefined }}>
            {x.label.split(" (")[0].replace("Your own servers", "own servers")}: {l.owners[x.id]}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function CloudModelsDemo() {
  const [m, setM] = useState<Model>("iaas");
  const [eid, setEid] = useState<EventId>("cve");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const model = MODELS.find((x) => x.id === m)!;
  const ev = EVENTS.find((x) => x.id === eid)!;
  const r = respond(eid, m);

  const nodeFor: Record<LayerId, string> = { hardware: "servers", network: "servers", os: "runtime", runtime: "runtime", scaling: "runtime", app: "app", data: "data", access: "data" };
  const groupOwner = (ids: LayerId[]): Owner => {
    const os = ids.map((x) => owner(x, m));
    return os.every((o) => o === "provider") ? "provider" : os.every((o) => o === "you") ? "you" : "shared";
  };
  const nodes: MapNode[] = [
    { id: "team", label: "Your team", sub: `~${model.opsHours} h a month`, at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "app", label: "Application", sub: owner("app", m), at: [50, 18], mobileAt: [75, 12], state: OWNER_STATE[owner("app", m)] },
    { id: "runtime", label: "Runtime + OS", sub: `+ scaling: ${groupOwner(["os", "runtime", "scaling"])}`, at: [86, 18], mobileAt: [75, 45], state: OWNER_STATE[groupOwner(["os", "runtime", "scaling"])] },
    { id: "servers", label: "Servers + network", sub: groupOwner(["hardware", "network"]), at: [86, 82], mobileAt: [75, 80], state: OWNER_STATE[groupOwner(["hardware", "network"])] },
    { id: "provider", label: m === "onprem" ? "No provider" : "Provider", sub: model.example, at: [50, 82], mobileAt: [25, 80], state: m === "onprem" ? "dim" : "good" },
    { id: "data", label: "Data + access", sub: groupOwner(["data", "access"]), at: [14, 82], mobileAt: [25, 45], state: OWNER_STATE[groupOwner(["data", "access"])] },
  ];

  const actor = (o: Owner) => (o === "provider" ? "provider" : "team");
  const flow: Packet[][] = STEP_LAYERS.map((ids, i) => {
    const target = nodeFor[ids[0]];
    const o = groupOwner(ids);
    return hops(`f${i}`, [actor(o), target], { label: o === "shared" ? "both" : o });
  });
  const special = hops("x", [actor(r.owner), nodeFor[ev.layer]], { label: r.owner === "provider" ? "handled" : "you act", tone: r.owner === "provider" ? "good" : undefined });
  const packets: Packet[] = stage === null ? [] : stage === ev.step ? special : flow[stage];

  const captions = STEP_LAYERS.map((ids, i) => `Step ${i + 1}: ${ids.map((x) => `${LAYERS.find((l) => l.id === x)!.label.toLowerCase()}: ${owner(x, m)}`).join("; ")}.`);
  const caption = stage !== null ? (stage === ev.step ? `${captions[stage]} ${ev.title}: ${r.text}.` : captions[stage]) : `${model.label}: you run ${LAYERS.filter((l) => l.owners[m] === "you").length} of ${LAYERS.length} layers yourself · ${ev.title}: ${r.text}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="IaaS, PaaS, SaaS and serverless"
        blurb="Every hosting model splits the same stack between you and someone else: hardware, operating system, runtime, scaling, your code, your data, who has access. Moving up hands layers to the provider, along with the control that came with them. Pick a model and see who acts when five things happen."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Your team and the provider each run part of the stack: application, runtime and OS, servers and network, data and access"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "team", to: "app", label: "you" },
                  { from: "team", to: "runtime", label: "you", dim: groupOwner(["os", "runtime", "scaling"]) === "provider" },
                  { from: "provider", to: "runtime", label: "provider", dim: groupOwner(["os", "runtime", "scaling"]) === "you" || m === "onprem" },
                  { from: "provider", to: "servers", label: "provider", dim: m === "onprem" },
                  { from: "team", to: "data", label: "always you" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Five events and who acts">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">who acts · {model.label}</p>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {EVENTS.map((e) => {
                    const x = respond(e.id, m);
                    return (
                      <li key={e.id}>
                        <span className="font-mono text-[10px]" style={{ color: OWNER_COLOR[x.owner] }}>
                          {x.owner}{" "}
                        </span>
                        {e.title}
                        <span className="block text-[11px] text-[var(--muted)]">{x.text}</span>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">operations hours a month</p>
                <ul className="mt-1 space-y-1">
                  {MODELS.map((x) => (
                    <li key={x.id} className="flex items-center gap-2 text-[11px]">
                      <span className="w-28 shrink-0 text-[var(--muted)]">{x.label}</span>
                      <span className="h-2 rounded-sm" style={{ width: `${(x.opsHours / 70) * 60}%`, background: x.id === m ? ACCENT : "var(--line)" }} />
                      <span className="font-mono">{x.opsHours}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-[11px] text-[var(--faint)]">Hours are illustrative. What you keep with {model.label}: {model.gives}.</p>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices<Model> label="Hosting model" accent={ACCENT} value={m} onChange={setM} options={MODELS.map((x) => ({ id: x.id, label: x.label }))} />
              </div>
              <div className="w-full">
                <Choices<EventId> label="What happens" accent={ACCENT} value={eid} onChange={setEid} options={EVENTS.map((x) => ({ id: x.id, label: x.title }))} />
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Running…">
                Walk the stack
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Hardware and network" what="Someone has to replace failed disks, power, cooling and switches. In any cloud model that's the provider; you still design your own network inside it (subnets, firewalls) on VMs." accent={ACCENT} active={at(0)}>
                {STEP_LAYERS[0].map((x) => (
                  <Row key={x} layer={x} m={m} />
                ))}
              </FlowStep>
              <FlowArrow label="hosts" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Operating system" what="Patching the OS is the biggest routine job on VMs: every server, every month, plus emergencies. On a platform or functions, the provider patches the hosts underneath you." accent={ACCENT} active={at(1)}>
                <Row layer="os" m={m} />
              </FlowStep>
              <FlowArrow label="runtime" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Runtime and scaling" what="On VMs you install the runtime and write the autoscaling rules. Platforms run your container and scale between limits you set; functions scale per request but cap how long and how big each call can be." accent={ACCENT} active={at(2)}>
                {STEP_LAYERS[2].map((x) => (
                  <Row key={x} layer={x} m={m} />
                ))}
              </FlowStep>
              <FlowArrow label="your code" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Application" what="Your code is yours in every model except SaaS, where you configure someone else's software and live with its features and limits." accent={ACCENT} active={at(3)}>
                <Row layer="app" m={m} />
              </FlowStep>
              <FlowArrow label="data" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Data and access are always yours" what="No model takes these away. The provider keeps the system up; deleting the wrong records, keeping backups you can restore, and removing a leaver's access are always your job." accent={ACCENT} active={at(4)}>
                {STEP_LAYERS[4].map((x) => (
                  <Row key={x} layer={x} m={m} />
                ))}
                <p className="mt-2 text-[11px] text-[var(--faint)]">Ownership follows the shared responsibility model the major clouds publish; the hours are illustrative.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
