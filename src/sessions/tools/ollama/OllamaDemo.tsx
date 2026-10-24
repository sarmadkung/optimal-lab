"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { ANSWER, BURST, CTX_OPTIONS, FIRST, FIXED, IDLE_GAP_MIN, LONG_PROMPT, MACHINE, MODELS, REQUEST, evaluate, kvBytesPerToken, type Design, type ModelId } from "@/lib/ollamaRuntime";

const ACCENT = "var(--tools)";
const s1 = (n: number) => `${Math.round(n * 10) / 10} s`;

export default function OllamaDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const r = evaluate(d);

  const nodes: MapNode[] = [
    { id: "app", label: "Team assistant", sub: `${BURST} people at once`, at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "ollama", label: "Ollama", sub: "localhost:11434", at: [50, 18], mobileAt: [75, 12], state: r.fits ? "good" : "bad" },
    { id: "mem", label: "Memory", sub: `${r.needGb.toFixed(1)} of ${MACHINE.usableGb} GB`, at: [86, 18], mobileAt: [75, 42], state: r.fits ? "good" : "bad" },
    { id: "disk", label: "Model files", sub: `${r.m.gb} GB on disk`, at: [86, 82], mobileAt: [75, 74], state: r.unloads ? "wait" : "idle" },
    { id: "queue", label: "Request queue", sub: d.parallel >= BURST ? "all at once" : `${Math.ceil(BURST / d.parallel)} deep`, at: [50, 82], mobileAt: [25, 42], state: d.parallel >= BURST ? "good" : "wait" },
    { id: "doc", label: "Long document", sub: `${LONG_PROMPT.toLocaleString("en-US")} tokens`, at: [14, 82], mobileAt: [25, 74], state: r.truncated ? "bad" : "good" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("p", ["disk", "mem"], { label: r.fits ? `${r.m.gb} GB loaded` : "doesn't fit", tone: r.fits ? "good" : "bad" })
    : stage === 1 ? hops("doc", ["doc", "app", "ollama"], { label: r.truncated ? `${r.truncated.toLocaleString("en-US")} tokens cut` : "fits the context", tone: r.truncated ? "bad" : "good" })
    : stage === 2 ? (r.unloads ? hops("cold", ["disk", "mem", "ollama"], { label: `reload ${s1(r.loadS)}`, tone: "bad" }) : hops("warm", ["mem", "ollama"], { label: "already loaded", tone: "good" }))
    : stage === 3 ? hops("q", ["app", "queue", "ollama"], { label: `${BURST} requests` })
    : stage === 4 ? hops("a", ["ollama", "app"], { label: `${r.tokPerSec} tokens/s`, tone: r.fits ? "good" : "bad" })
    : [];

  const captions = [
    r.fits ? `Step 1: ${r.m.label} takes ${r.m.gb} GB, plus ${r.kvGb.toFixed(1)} GB of KV cache for ${d.parallel} × ${d.numCtx.toLocaleString("en-US")} tokens.` : `Step 1: ${r.m.label} needs ${r.needGb.toFixed(1)} GB; the laptop has ${MACHINE.usableGb} GB for models, so it spills and crawls.`,
    r.truncated ? `Step 2: the ${LONG_PROMPT.toLocaleString("en-US")}-token document doesn't fit a ${d.numCtx.toLocaleString("en-US")}-token context; the start of the prompt is dropped without an error.` : "Step 2: the whole document fits the context.",
    r.unloads ? `Step 3: after ${IDLE_GAP_MIN} min idle the model was unloaded (keep_alive ${d.keepAlive}); the next question waits ${s1(r.loadS)} to load it.` : "Step 3: the model stays in memory between questions.",
    d.parallel >= BURST ? `Step 4: ${BURST} parallel slots: everyone is answered at once, a bit slower each.` : `Step 4: ${d.parallel} slot${d.parallel > 1 ? "s" : ""}: the last of ${BURST} people waits ${s1(r.lastWaitS)}.`,
    `Step 5: answers stream at about ${r.tokPerSec} tokens a second.`,
  ];
  const caption = stage !== null ? captions[stage] : `${r.fits ? "Fits" : "Doesn't fit"} (${r.needGb.toFixed(1)} of ${MACHINE.usableGb} GB) · ${r.tokPerSec} tokens/s · first token ${s1(r.firstTokenS)} after a quiet spell · ${r.truncated ? `${r.truncated.toLocaleString("en-US")} tokens of the long prompt cut` : "nothing cut"} · last of ${BURST} waits ${s1(r.lastWaitS)}.`;
  const used = Math.min(100, (r.needGb / MACHINE.usableGb) * 100);

  return (
    <SessionPage>
      <SessionHeader
        kicker="Tools · interactive"
        title="Ollama and local runtimes"
        blurb="Ollama runs open models on your own machine behind a local HTTP API, including an OpenAI-compatible one. A team points its internal assistant at a 32 GB laptop. The model is fine; what goes wrong is the runtime: long prompts cut to the context size without an error, a model that unloads when idle, and four people queueing behind one slot."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="The team assistant, Ollama on localhost, memory, model files on disk, the request queue and a long document"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "app", to: "ollama", label: "/api/chat" },
                  { from: "ollama", to: "mem", label: "weights + KV" },
                  { from: "disk", to: "mem", label: "load" },
                  { from: "queue", to: "ollama", label: "slots" },
                  { from: "doc", to: "app", label: "prompt" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Memory use and the request sent to Ollama">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">{MACHINE.label}</p>
                  <p className="font-mono text-xs" style={{ color: r.fits ? "var(--good)" : "var(--bad)" }}>
                    {r.needGb.toFixed(1)} / {MACHINE.usableGb} GB
                  </p>
                </div>
                <span className="mt-2 flex h-3 w-full overflow-hidden rounded-full bg-[var(--track)]">
                  <span className="block h-full" style={{ width: `${Math.min(used, (r.m.gb / MACHINE.usableGb) * 100)}%`, background: "var(--c1)" }} title="weights" />
                  <span className="block h-full" style={{ width: `${Math.max(0, used - (r.m.gb / MACHINE.usableGb) * 100)}%`, background: r.fits ? "var(--c4)" : "var(--bad)" }} title="KV cache" />
                </span>
                <p className="mt-1 flex gap-3 font-mono text-[10px]">
                  <span style={{ color: "var(--c1)" }}>■ weights {r.m.gb} GB</span>
                  <span style={{ color: "var(--c4)" }}>■ KV cache {r.kvGb.toFixed(1)} GB</span>
                </p>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] leading-relaxed">{`POST http://localhost:11434/api/chat\n${JSON.stringify(REQUEST(d), null, 1)}`}</pre>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Out of the box
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Set up for the team
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Generating…">
                Run the afternoon
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Pick a model and quantization that fit" what="Ollama pulls quantized weights (Q4_K_M, Q8_0). Weights plus the KV cache for every context slot must fit in memory; past that, layers spill and speed collapses." accent={ACCENT} active={at(0)}>
                <Choices<ModelId> label="Model" accent={ACCENT} value={d.model} onChange={(v) => set({ model: v })} options={MODELS.map((m) => ({ id: m.id, label: m.label }))} />
                <p className="mt-2 font-mono text-[11px] text-[var(--muted)]">
                  KV cache: {(kvBytesPerToken(r.m) / 1024).toFixed(0)} KiB a token ({r.m.layers} layers × {r.m.kvHeads} KV heads × {r.m.headDim} × K,V × 2 bytes)
                </p>
              </FlowStep>
              <FlowArrow label="a prompt" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Set the context size yourself" what="The runtime allocates a fixed context per request (num_ctx). A small one keeps memory low, and a longer prompt is cut to fit, without an error, so answers about the start of a document quietly get worse." accent={ACCENT} active={at(1)}>
                <Choices label="num_ctx" accent={ACCENT} value={String(d.numCtx)} onChange={(v) => set({ numCtx: Number(v) })} options={CTX_OPTIONS.map((c) => ({ id: String(c), label: c.toLocaleString("en-US") }))} />
                <p className="mt-2 font-mono text-[11px]" style={{ color: r.truncated ? "var(--bad)" : "var(--good)" }}>
                  {LONG_PROMPT.toLocaleString("en-US")}-token document + {ANSWER} answer: {r.truncated ? `${r.truncated.toLocaleString("en-US")} tokens cut` : "fits"}
                </p>
              </FlowStep>
              <FlowArrow label="later" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Keep the model loaded" what={`By default a model is unloaded after 5 minutes idle to free memory. On a shared assistant, with questions ${IDLE_GAP_MIN} minutes apart, every question starts by loading gigabytes from disk. keep_alive (per request or as a server default) keeps it in memory.`} accent={ACCENT} active={at(2)}>
                <Choices<Design["keepAlive"]> label="keep_alive" accent={ACCENT} value={d.keepAlive} onChange={(v) => set({ keepAlive: v })} options={[{ id: "5m", label: "5 minutes" }, { id: "1h", label: "1 hour" }, { id: "forever", label: "Always (-1)" }]} />
              </FlowStep>
              <FlowArrow label="requests" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Give it parallel slots, and the memory for them" what="With one slot, requests wait in line. Parallel slots (OLLAMA_NUM_PARALLEL) serve several at once, each with its own KV cache, so memory grows with slots × context." accent={ACCENT} active={at(3)}>
                <Choices label="Parallel slots" accent={ACCENT} value={String(d.parallel)} onChange={(v) => set({ parallel: Number(v) })} options={[{ id: "1", label: "1" }, { id: "4", label: "4" }]} />
              </FlowStep>
              <FlowArrow label="answers" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Call it like any model API" what="Besides /api/chat, Ollama serves an OpenAI-compatible endpoint at /v1, so code written against a hosted API can point at localhost with a base URL change. Same code, your machine, no per-token bill." accent={ACCENT} active={at(4)}>
                <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-xs">
                  <dt>Fits in memory</dt>
                  <dd className="text-right font-mono" style={{ color: r.fits ? "var(--good)" : "var(--bad)" }}>{r.fits ? "yes" : "no"}</dd>
                  <dt>Speed</dt>
                  <dd className="text-right font-mono">~{r.tokPerSec} tokens/s</dd>
                  <dt>First token after a quiet spell</dt>
                  <dd className="text-right font-mono" style={{ color: r.unloads ? "var(--c2)" : "var(--good)" }}>{s1(r.firstTokenS)}</dd>
                  <dt>Last of {BURST} people waits</dt>
                  <dd className="text-right font-mono">{s1(r.lastWaitS)}</dd>
                </dl>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Model sizes and architectures are the public models&apos;; speeds are estimates from memory bandwidth. Memory, truncation, reloads and queueing are computed here.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
