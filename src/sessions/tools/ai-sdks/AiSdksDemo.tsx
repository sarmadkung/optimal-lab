"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { APPROACHES, COVER_LABEL, FEATURES, assess, type Approach, type Feature } from "@/lib/aiSdks";
import { PROVIDERS, toRequest, type Provider } from "@/lib/modelProviders";

const ACCENT = "var(--tools)";
const COVER_COLOR = { common: "var(--good)", options: "var(--c2)", manual: "var(--muted)", none: "var(--bad)" } as const;
const START: Feature[] = ["text", "stream", "tools", "toolLoop", "structured", "caching"];

export default function AiSdksDemo() {
  const [approach, setApproach] = useState<Approach>("sdk");
  const [target, setTarget] = useState<Provider>("anthropic");
  const [providers, setProviders] = useState(3);
  const [features, setFeatures] = useState<Set<Feature>>(new Set(START));
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const list = FEATURES.filter((f) => features.has(f.id)).map((f) => f.id);
  const a = assess(approach, list, providers);
  const req = toRequest(target, 1);
  const neutral = `generate({
  model: "${target}/…",
  system: "You are a shop's support assistant.",
  messages: [{ role: "user", content: "Where is order 4821?" }],
  tools: { get_order },
})`;

  const nodes: MapNode[] = [
    { id: "code", label: "Your code", sub: approach === "direct" ? `${providers} adapters` : "one call shape", at: [14, 50], mobileAt: [50, 10], state: "active" },
    { id: "layer", label: approach === "direct" ? "Your adapters" : approach === "sdk" ? "SDK" : "Gateway", sub: approach === "gateway" ? "OpenAI-compatible HTTP" : approach === "sdk" ? "provider packages" : "hand-written", at: [44, 50], mobileAt: [50, 40], state: approach === "direct" ? "wait" : "good" },
    ...PROVIDERS.map((p, i) => ({ id: p.id, label: p.label, sub: p.id === target ? "this request" : i < providers ? "also used" : "not used", at: [84, 16 + i * 34] as [number, number], mobileAt: [18 + i * 32, 80] as [number, number], state: (p.id === target ? "active" : i < providers ? "idle" : "dim") as MapNode["state"] })),
  ];

  const packets: Packet[] =
    stage === 0 ? hops("c", ["code", "layer"], { label: "generate(…)" })
    : stage === 1 ? hops("x", ["layer", target], { label: `${PROVIDERS.find((p) => p.id === target)!.label} format` })
    : stage === 2 ? hops("b", [target, "layer", "code"], { label: "same result shape" })
    : stage === 3 ? (a.escapes ? hops("e", ["code", target], { label: "provider-specific", tone: "bad" }) : [])
    : stage === 4 ? hops("s", ["code", "layer"], { label: `switch: ~${a.switchLines} lines` })
    : [];

  const captions = [
    approach === "direct" ? "Step 1: your code builds each provider's request itself." : "Step 1: your code makes one call: model id, system prompt, messages, tools.",
    `Step 2: ${approach === "direct" ? "your adapter" : approach === "sdk" ? "the SDK's provider package" : "the gateway"} turns it into the ${PROVIDERS.find((p) => p.id === target)!.label} request shape.`,
    "Step 3: the response (text, tool calls, a stream) comes back in one shape, whichever provider answered.",
    a.escapes ? `Step 4: ${a.escapes} of the features you picked need provider-specific code or a direct call.` : "Step 4: everything you picked is covered by the common interface.",
    `Step 5: about ${a.glue} lines of glue for ${providers} provider${providers > 1 ? "s" : ""}; switching a provider touches about ${a.switchLines}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${APPROACHES.find((x) => x.id === approach)!.label}: ~${a.glue} lines of glue · ${a.escapes} feature${a.escapes === 1 ? " needs" : "s need"} an escape hatch · switching a provider ~${a.switchLines} lines.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="Tools · interactive"
        title="AI SDKs"
        blurb="Every model provider has its own request shape. An AI SDK (the Vercel AI SDK, LiteLLM and others) gives you one call and converts it underneath, so switching providers is a one-line change, until you need a feature only one provider has. Pick the features your app uses and see what a common interface covers."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Your code, an SDK or gateway layer, and three model providers"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[{ from: "code", to: "layer", label: "one call" }, ...PROVIDERS.map((p, i) => ({ from: "layer", to: p.id, label: p.id === target ? "converted" : "", dim: i >= providers && p.id !== target }))]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.95}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="The same call, as written and as sent">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">you write</p>
                <pre className="mt-2 overflow-x-auto whitespace-pre rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] leading-relaxed">{neutral}</pre>
                <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">{PROVIDERS.find((p) => p.id === target)!.label} receives</p>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] leading-relaxed">{JSON.stringify(req, null, 1)}</pre>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices<Provider> label="Send to" accent={ACCENT} value={target} onChange={setTarget} options={PROVIDERS.map((p) => ({ id: p.id, label: p.label }))} />
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Converting…">
                Send one request
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Choose where the conversion happens" what="Your own adapters, an SDK inside your code (one package per provider), or a gateway service that speaks one OpenAI-compatible API and converts on the server." accent={ACCENT} active={at(0)}>
                <Choices<Approach> label="Approach" accent={ACCENT} value={approach} onChange={setApproach} options={APPROACHES.map((x) => ({ id: x.id, label: x.label }))} />
                <p className="mt-1 text-[11px] text-[var(--faint)]">{APPROACHES.find((x) => x.id === approach)!.one}</p>
              </FlowStep>
              <FlowArrow label="one call" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Count the providers you really use" what="One provider needs no abstraction. Two or three (one for cost, one as a fallback, one for a modality) is where a common interface pays." accent={ACCENT} active={at(1)}>
                <Choices label="Providers in use" accent={ACCENT} value={String(providers)} onChange={(v) => setProviders(Number(v))} options={[{ id: "1", label: "1" }, { id: "2", label: "2" }, { id: "3", label: "3" }]} />
              </FlowStep>
              <FlowArrow label="features" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="List the features your app needs" what="Text, streaming and tools are the same everywhere. Caching, reasoning settings and batch jobs are where providers differ, and where a common interface thins out." accent={ACCENT} active={at(2)}>
                <ul className="space-y-0.5">
                  {FEATURES.map((f) => (
                    <li key={f.id}>
                      <label className="flex min-h-11 items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={features.has(f.id)}
                          onChange={(e) =>
                            setFeatures((cur) => {
                              const next = new Set(cur);
                              if (e.target.checked) next.add(f.id);
                              else next.delete(f.id);
                              return next;
                            })
                          }
                          className="h-4 w-4"
                          style={{ accentColor: ACCENT }}
                        />
                        {f.label}
                      </label>
                    </li>
                  ))}
                </ul>
              </FlowStep>
              <FlowArrow label="coverage" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Know your escape hatches" what="Good SDKs let you pass provider-specific options through, and you can always call one provider directly for the feature only it has. Those are the lines that change when you switch." accent={ACCENT} active={at(3)}>
                <ul className="space-y-0.5 text-xs">
                  {a.rows.map((r) => (
                    <li key={r.f} className="flex flex-wrap justify-between gap-2">
                      <span>{FEATURES.find((f) => f.id === r.f)!.label}</span>
                      <span className="text-[11px]" style={{ color: COVER_COLOR[r.cover] }}>
                        {COVER_LABEL[r.cover]}
                      </span>
                    </li>
                  ))}
                </ul>
              </FlowStep>
              <FlowArrow label="switch provider" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Count glue code and switching cost" what="The point of a common interface is that adding or swapping a provider costs a model id, not a rewrite." accent={ACCENT} active={at(4)}>
                <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-xs">
                  <dt>Glue code you maintain</dt>
                  <dd className="text-right font-mono">~{a.glue} lines</dd>
                  <dt>Lines touched to switch a provider</dt>
                  <dd className="text-right font-mono">~{a.switchLines}</dd>
                  <dt>Features needing an escape hatch</dt>
                  <dd className="text-right font-mono" style={{ color: a.escapes ? "var(--c2)" : "var(--good)" }}>{a.escapes}</dd>
                </dl>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The request conversion runs here (the same converters as Model provider APIs). Coverage and line counts are illustrative of typical SDKs and gateways; check the one you use.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
