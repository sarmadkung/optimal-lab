"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { ENVS, EVENTS, FIRST, FIXED, judge, moduleBlock, scorecard, summary, type Design, type EventId, type Pin, type Reuse } from "@/lib/tfModules";

const ACCENT = "var(--ops)";
const ACTION_COLOR = { create: "var(--good)", update: "var(--c2)", destroy: "var(--bad)", move: "var(--c1)", "no-op": "var(--faint)" } as const;
const ACTION_MARK = { create: "+", update: "~", destroy: "-", move: "→", "no-op": " " } as const;

export default function TfModulesDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [eid, setEid] = useState<EventId>("rename");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const v = judge(eid, d);
  const card = scorecard(d);
  const ev = EVENTS.find((x) => x.id === eid)!;
  const mod = d.reuse === "module";
  const prodPlan = v.plans.find((p) => p.env === "prod")?.plan ?? [];
  const tone = v.ok ? "good" : "bad";

  const nodes: MapNode[] = [
    { id: "module", label: mod ? "postgres module" : "No module", sub: mod ? (d.pin === "tag" ? "tags v1.0, v1.1, v2.0" : "main branch") : "3 separate copies", at: [50, 14], mobileAt: [50, 8], state: mod ? "active" : "dim" },
    ...ENVS.map((env, i) => ({
      id: env,
      label: env,
      sub: mod ? (d.pin === "tag" ? (env === "dev" ? "ref v2.0.0" : "ref v1.1.0") : "ref main") : "own copy",
      at: ([[16, 48], [50, 48], [84, 48]] as [number, number][])[i],
      mobileAt: ([[18, 38], [50, 38], [82, 38]] as [number, number][])[i],
      state: (env === "prod" && !v.ok ? "bad" : "active") as MapNode["state"],
    })),
    { id: "plan", label: "terraform plan", sub: prodPlan.length ? summary(prodPlan).split(",")[0] + "…" : eid === "typo" ? (v.ok ? "validation error" : "passes") : "per environment", at: [30, 86], mobileAt: [28, 80], state: eid === "typo" && v.ok ? "good" : "active" },
    { id: "cloud", label: "Cloud API", sub: eid === "typo" && !v.ok ? "rejects db.t3.mega" : "applies the plan", at: [70, 86], mobileAt: [72, 80], state: eid === "typo" && !v.ok ? "bad" : "active" },
  ];

  const flow: Packet[][] = [
    mod ? ENVS.flatMap((e) => hops(`m${e}`, ["module", e], { label: "source" })) : [],
    hops("v", ["prod", "plan"], { label: "inputs" }),
    mod ? hops("p", ["module", "prod"], { label: d.pin === "tag" ? "v1.1.0" : "main" }) : [],
    mod ? hops("r", ["module", "prod"], { label: "v2" }) : [],
    hops("a", ["plan", "cloud"], { label: "apply" }),
  ];
  const special: Packet[] =
    eid === "protect" ? (mod ? ENVS.flatMap((e) => hops(`x${e}`, ["module", e], { label: "v1.1", tone: "good" })) : ENVS.flatMap((e) => hops(`x${e}`, [e, "plan"], { label: e === "prod" ? "missed" : "edited", tone: e === "prod" ? "bad" : "good" })))
    : eid === "typo" ? hops("x", ["prod", v.ok ? "plan" : "cloud"], { label: v.ok ? "invalid" : "db.t3.mega", tone })
    : mod ? hops("x", ["module", "prod"], { label: v.ok ? (d.moved ? "moved" : "pinned") : "destroy!", tone }) : [];
  const packets: Packet[] = stage === null ? [] : stage === ev.step ? special : flow[stage];

  const captions = [
    mod ? "Step 1: one module defines the database; each environment calls it with its own inputs." : "Step 1: each environment has its own copy of the database code.",
    d.validate && mod ? "Step 2: the module checks its inputs at plan time." : "Step 2: inputs are passed straight to the cloud API.",
    mod ? (d.pin === "tag" ? "Step 3: each environment names a module version; upgrades happen one environment at a time." : "Step 3: every environment follows the module's main branch.") : "Step 3: nothing to pin; copies drift instead.",
    mod ? (d.moved ? "Step 4: v2 ships a moved block with its rename." : "Step 4: v2 renames a resource without telling Terraform.") : "Step 4: no shared module to refactor.",
    prodPlan.length ? `Step 5: production's plan: ${summary(prodPlan)}.` : "Step 5: each environment runs plan, then apply.",
  ];
  const caption = stage !== null ? (stage === ev.step ? `${captions[stage]} ${ev.title}: ${v.text}.` : captions[stage]) : `${card.filter((c) => c.ok).length} of ${EVENTS.length} handled · ${ev.title}: ${v.text}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="Terraform modules and reuse"
        blurb="Dev, staging and production each need a Postgres database. Copy the code three times, or write a module once and call it three times with different inputs. Then live with it: a fix for every environment, a bad input, and a new module version that renames a resource."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="A postgres module is called by dev, staging and production; production's terraform plan goes to the cloud API"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  ...ENVS.map((e) => ({ from: "module", to: e, label: "source", dim: !mod })),
                  { from: "prod", to: "plan", label: "plan" },
                  { from: "plan", to: "cloud", label: "apply" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Three changes and their plans">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">three changes · {card.filter((c) => c.ok).length}/{EVENTS.length} handled</p>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {card.map((c) => (
                    <li key={c.event.id}>
                      <span style={{ color: c.ok ? "var(--good)" : "var(--bad)" }} aria-hidden>
                        {c.ok ? "✓ " : "✕ "}
                      </span>
                      {c.event.title}
                      <span className="block text-[11px] text-[var(--muted)]">{c.text}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices<EventId> label="Change" accent={ACCENT} value={eid} onChange={setEid} options={EVENTS.map((x) => ({ id: x.id, label: x.title }))} />
              </div>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Copy and paste
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Versioned module
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Planning…">
                Make the change
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Write it once" what="A module is a folder of Terraform with input variables and outputs. Environments call it with their own sizes and names, so a fix is made once instead of in every copy." accent={ACCENT} active={at(0)}>
                <Choices<Reuse> label="The database code" accent={ACCENT} value={d.reuse} onChange={(x) => set({ reuse: x })} options={[{ id: "copy", label: "Copied per environment" }, { id: "module", label: "One module" }]} />
                <pre className="mt-2 max-h-56 overflow-auto whitespace-pre rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] leading-relaxed">{moduleBlock(d).join("\n")}</pre>
              </FlowStep>
              <FlowArrow label="inputs" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Validate inputs at plan time" what="A validation block turns a bad input into a plan error in a second, instead of an API error halfway through an apply." accent={ACCENT} active={at(1)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.validate} disabled={!mod} onChange={(e) => set({ validate: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  validation on instance_class
                </label>
              </FlowStep>
              <FlowArrow label="version" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Pin the module version" what="source = …?ref=main means every apply might run new module code. A version tag means each environment upgrades when someone bumps it and reads the plan, dev first and production last." accent={ACCENT} active={at(2)}>
                <Choices<Pin> label="ref" accent={ACCENT} value={d.pin} onChange={(x) => set({ pin: x })} options={[{ id: "main", label: "main" }, { id: "tag", label: "a version tag" }]} />
              </FlowStep>
              <FlowArrow label="new version" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Refactor with moved blocks" what="Terraform knows resources by address. Rename aws_db_instance.this to .main and the plan says destroy one, create the other. A moved block tells it they're the same database." accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.moved} disabled={!mod} onChange={(e) => set({ moved: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  v2 includes a moved block
                </label>
              </FlowStep>
              <FlowArrow label="plan" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Read every environment's plan" what="The plan is the contract: what will be added, changed, destroyed or moved. A destroy on a database should stop everything." accent={ACCENT} active={at(4)}>
                {v.plans.length === 0 && <p className="text-xs text-[var(--muted)]">{v.text}.</p>}
                {v.plans.map((p) => (
                  <div key={p.env} className="mt-1">
                    <p className="font-mono text-[11px]">
                      {p.env}: {summary(p.plan)}
                    </p>
                    <ul className="font-mono text-[10px]">
                      {p.plan.filter((l) => l.action !== "no-op").map((l) => (
                        <li key={l.address + l.action} className="break-words" style={{ color: ACTION_COLOR[l.action] }}>
                          {ACTION_MARK[l.action]} {l.address}
                          {l.detail ? ` (${l.detail})` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <p className="mt-2 text-[11px] text-[var(--faint)]">Plans are computed here by comparing state addresses and attributes with the configuration, moved blocks included.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
