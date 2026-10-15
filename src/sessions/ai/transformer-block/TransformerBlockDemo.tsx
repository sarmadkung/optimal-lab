"use client";

import Link from "next/link";
import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, Slider, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMapPanel } from "@/components/system/SystemMap";
import { HIDDEN, MODELS, TOKENS, blockParams, fmtCount, fmtVec, sameness, stack, type ModelId, type Vec } from "@/lib/transformerBlock";

const ACCENT = "var(--ai)";
const MAX_LAYERS = 12;
// Both runs are cheap (4 tokens × 12 layers), so compute them once.
const WITH = stack(MAX_LAYERS, true);
const WITHOUT = stack(MAX_LAYERS, false);

const PARTS = ["LayerNorm", "Attention", "Add back", "LayerNorm", "Feed-forward", "Add back"];

export default function TransformerBlockDemo() {
  const [token, setToken] = useState(TOKENS.length - 1);
  const [residual, setResidual] = useState(true);
  const [layer, setLayer] = useState(1);
  const [model, setModel] = useState<ModelId>("llama8");
  const { stage, busy, run } = useWalk(6, 1000);
  const on = (s: number) => stage === s;

  const traces = residual ? WITH : WITHOUT;
  const t = traces[layer - 1];
  const word = TOKENS[token];
  const alike = sameness(t.output);
  const m = MODELS.find((x) => x.id === model)!;
  const p = blockParams(m);

  // The vector for the picked token at the current point in the block.
  const now: { label: string; v: Vec } =
    stage === 0 ? { label: "after LayerNorm", v: t.norm1[token] }
    : stage === 1 ? { label: "attention output", v: t.attn[token] }
    : stage === 2 ? { label: residual ? "x + attention" : "attention only", v: t.mid[token] }
    : stage === 3 ? { label: "after LayerNorm", v: t.norm2[token] }
    : stage === 4 ? { label: "feed-forward output", v: t.ffn[token] }
    : { label: `out of layer ${layer}`, v: t.output[token] };

  const w = t.weights[token];
  const looks = w
    .map((x, j) => ({ x, j }))
    .filter((e) => e.j <= token)
    .sort((a, b) => b.x - a.x)[0];

  const caption =
    stage === null
      ? residual
        ? `After ${layer} ${layer === 1 ? "layer" : "layers"} the tokens are ${Math.round(alike * 100)}% alike: each one still carries its own meaning. Turn off the residual connections and stack more layers.`
        : `Without residual connections, after ${layer} ${layer === 1 ? "layer" : "layers"} the tokens are ${Math.round(alike * 100)}% alike. ${alike > 0.9 ? "They've blurred into one vector: the model can no longer tell them apart." : "Stack more layers and watch them blur together."}`
      : [
          `LayerNorm rescales “${word}” to mean 0 and spread 1, so no token shouts over the others.`,
          `Attention: “${word}” blends itself and the ${token} ${token === 1 ? "token" : "tokens"} before it, mostly “${TOKENS[looks.j]}” (${Math.round(looks.x * 100)}%).`,
          residual ? `Add back: the attention result is added to the original “${word}”, not swapped in.` : "Residual off: the attention result replaces the original vector.",
          "LayerNorm again, before the feed-forward layer.",
          `Feed-forward: “${word}” alone goes through ${HIDDEN} hidden units and back to 4. No other token is involved.`,
          residual ? `Add back again. This is the input to layer ${layer + 1}; real models repeat the block ${m.layers} times.` : `The output replaces the input. Layer ${layer + 1} starts from this.`,
        ][stage];

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Engineering · interactive"
        title="A transformer block"
        blurb="A large language model is one block repeated dozens of times. Attention lets the tokens share information, a feed-forward layer works on each token alone, and residual connections add each result onto a running vector instead of replacing it. Remove those, and the tokens blur together."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5" aria-label="One transformer block and what it does to each token">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">
                  Layer {layer} of {MAX_LAYERS} · “{word}”
                </p>
                <p className="font-mono text-xs text-[var(--muted)]">{residual ? "with residuals" : "no residuals"}</p>
              </div>

              <div className="mt-3 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <BlockDiagram stage={stage} residual={residual} />
                <div className="min-w-0 space-y-4">
                  <div>
                    <p className="text-xs text-[var(--faint)]">“{word}”, {now.label}</p>
                    <Bars v={now.v} />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--faint)]">How alike the 4 tokens are, layer by layer</p>
                    <Sameness layer={layer} residual={residual} />
                  </div>
                </div>
              </div>
            </section>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <Choices label="Follow the token" accent={ACCENT} value={String(token)} onChange={(v) => setToken(Number(v))} options={TOKENS.map((x, i) => ({ id: String(i), label: x }))} />
              <Choices
                label="Residual connections"
                accent={ACCENT}
                value={residual ? "on" : "off"}
                onChange={(v) => setResidual(v === "on")}
                options={[
                  { id: "on", label: "On (x + change)" },
                  { id: "off", label: "Off (replace x)" },
                ]}
              />
              <div className="w-full">
                <Slider label="Layers stacked" accent={ACCENT} value={layer} min={1} max={MAX_LAYERS} step={1} format={(v) => `${v}`} onChange={setLayer} />
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Running the block…">
                Walk through one block
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Normalize each token" what="LayerNorm shifts and scales each token's vector to mean 0 and spread 1. It keeps the numbers in a steady range as layers stack up." accent={ACCENT} active={on(0)}>
                <VecRows rows={[["in", t.input[token]], ["normed", t.norm1[token]]]} />
              </FlowStep>
              <FlowArrow label={`${TOKENS.length} normalized vectors`} accent={ACCENT} active={on(1)} />

              <FlowStep n={2} title="Attention: tokens look at each other" what="This is the only place tokens share information. Each token blends in the tokens before it, weighted by how well they match." accent={ACCENT} active={on(1)}>
                <ul className="space-y-1.5">
                  {TOKENS.map((x, j) => (
                    <li key={x} className="grid grid-cols-[minmax(0,4rem)_minmax(0,1fr)_3rem] items-center gap-2 text-sm" style={{ opacity: j <= token ? 1 : 0.35 }}>
                      <span className="truncate">{x}</span>
                      <span className="h-2 rounded bg-[var(--track)]">
                        <span className="block h-full rounded transition-[width] duration-300" style={{ width: `${w[j] * 100}%`, background: ACCENT }} />
                      </span>
                      <span className="text-right font-mono tabular-nums">{j <= token ? `${Math.round(w[j] * 100)}%` : "masked"}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-[var(--faint)]">
                  How these weights are computed:{" "}
                  <Link href="/tracks/ai/attention" className="text-[var(--accent)] hover:underline">
                    Attention, one head
                  </Link>
                  . Real blocks run many heads side by side.
                </p>
              </FlowStep>
              <FlowArrow label="a blend for each token" accent={ACCENT} active={on(2)} />

              <FlowStep n={3} title="Add the change back onto the token" what="The residual connection: x + attention(x). The sub-layer only adds a change, so the original token survives every layer, and gradients have a short path back during training." accent={ACCENT} active={on(2)}>
                <Choices
                  accent={ACCENT}
                  value={residual ? "on" : "off"}
                  onChange={(v) => setResidual(v === "on")}
                  options={[
                    { id: "on", label: "x + attention" },
                    { id: "off", label: "attention only" },
                  ]}
                />
                <VecRows rows={[["x", t.input[token]], ["change", t.attn[token]], ["result", t.mid[token]]]} />
              </FlowStep>
              <FlowArrow label="the residual stream" accent={ACCENT} active={on(3)} />

              <FlowStep n={4} title="Normalize again" what="A second LayerNorm, so the feed-forward layer also gets steady numbers." accent={ACCENT} active={on(3)}>
                <VecRows rows={[["normed", t.norm2[token]]]} />
              </FlowStep>
              <FlowArrow label="one vector per token" accent={ACCENT} active={on(4)} />

              <FlowStep n={5} title="Feed-forward: each token on its own" what={`Expand to ${HIDDEN} numbers (4× wider), drop the negatives (ReLU), and project back to 4. Most of a model's weights, and much of what it knows, live in these layers.`} accent={ACCENT} active={on(4)}>
                <p className="text-xs text-[var(--faint)]">
                  {HIDDEN} hidden units for “{word}”, {t.hidden[token].filter((h) => h > 0).length} switched on
                </p>
                <div className="mt-1 grid grid-cols-[repeat(16,minmax(0,1fr))] gap-0.5" aria-hidden>
                  {t.hidden[token].map((h, i) => (
                    <span key={i} className="h-6 rounded-sm transition-colors duration-300" style={{ background: h > 0 ? `color-mix(in srgb, ${ACCENT} ${Math.round(Math.min(1, h / 2) * 80 + 20)}%, transparent)` : "var(--track)" }} />
                  ))}
                </div>
                <VecRows rows={[["out", t.ffn[token]]]} />
              </FlowStep>
              <FlowArrow label="change per token" accent={ACCENT} active={on(5)} />

              <FlowStep n={6} title="Add back, then repeat the block" what="The second residual add gives the block's output. It goes straight into the next block, which has its own weights. Only after the last block does the model predict the next token." accent={ACCENT} active={on(5)}>
                <VecRows rows={[["output", t.output[token]]]} />
                <div className="mt-4">
                  <Choices accent={ACCENT} value={model} onChange={setModel} options={MODELS.map((x) => ({ id: x.id, label: x.name }))} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ["Blocks", String(m.layers)],
                    ["Attention / block", fmtCount(p.attn)],
                    ["Feed-forward / block", fmtCount(p.ffn)],
                    ["Whole model", fmtCount(p.all)],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-lg bg-[var(--inset)] p-2">
                      <dt className="text-xs text-[var(--faint)]">{k}</dt>
                      <dd className="font-mono text-sm">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  {Math.round((p.ffn / p.block) * 100)}% of each block is the feed-forward layer. {m.name} is {m.layers} copies of this block ({m.d.toLocaleString()} numbers per token) plus {fmtCount(p.embeddings)} in its embedding tables; its published size is {m.total}. Next:{" "}
                  <Link href="/tracks/ai/next-token" className="text-[var(--accent)] hover:underline">
                    how the last block’s output picks a token
                  </Link>
                  .
                </p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function VecRows({ rows }: { rows: [string, Vec][] }) {
  return (
    <dl className="mt-3 grid grid-cols-[4rem_minmax(0,1fr)] gap-y-1 font-mono text-xs">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-[var(--faint)]">{k}</dt>
          <dd className="break-words">{fmtVec(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

// Four numbers as signed bars around a centre line.
function Bars({ v }: { v: Vec }) {
  const top = Math.max(1, ...v.map(Math.abs));
  return (
    <ul className="mt-1 space-y-1">
      {v.map((x, i) => (
        <li key={i} className="grid grid-cols-[1.5rem_minmax(0,1fr)_3.5rem] items-center gap-2 text-xs">
          <span className="font-mono text-[var(--faint)]">d{i + 1}</span>
          <span className="relative h-3 rounded bg-[var(--track)]">
            <span className="absolute inset-y-0 left-1/2 w-px bg-[var(--line-strong)]" />
            <span
              className="absolute inset-y-0 rounded transition-all duration-300"
              style={{
                left: x >= 0 ? "50%" : `${50 - (Math.abs(x) / top) * 50}%`,
                width: `${(Math.abs(x) / top) * 50}%`,
                background: x >= 0 ? "var(--c1)" : "var(--c4)",
              }}
            />
          </span>
          <span className="text-right font-mono tabular-nums">{x.toFixed(2)}</span>
        </li>
      ))}
    </ul>
  );
}

// Sameness of the tokens after each layer, with and without residuals.
function Sameness({ layer, residual }: { layer: number; residual: boolean }) {
  const X = (l: number) => 10 + ((l - 1) / (MAX_LAYERS - 1)) * 180;
  const Y = (s: number) => 70 - s * 60;
  const line = (traces: typeof WITH) => traces.map((tr, i) => `${i ? "L" : "M"}${X(i + 1).toFixed(1)} ${Y(sameness(tr.output)).toFixed(1)}`).join(" ");
  return (
    <figure>
      <svg viewBox="0 0 200 82" className="mt-1 w-full" role="img" aria-label="Token sameness by layer: flat with residuals, rising to 100% without">
        <line x1="10" x2="190" y1={Y(1)} y2={Y(1)} stroke="var(--line)" strokeDasharray="3 3" />
        <line x1="10" x2="190" y1={Y(0)} y2={Y(0)} stroke="var(--line)" />
        <text x="190" y={Y(1) - 2} fontSize="7" textAnchor="end" fill="var(--faint)">100% alike</text>
        <path d={line(WITHOUT)} fill="none" stroke="var(--bad)" strokeWidth={residual ? 1 : 2.2} opacity={residual ? 0.45 : 1} />
        <path d={line(WITH)} fill="none" stroke="var(--good)" strokeWidth={residual ? 2.2 : 1} opacity={residual ? 1 : 0.45} />
        <line x1={X(layer)} x2={X(layer)} y1="6" y2="72" stroke={ACCENT} strokeWidth="1" style={{ transition: "x1 0.3s, x2 0.3s" }} />
        <text x="10" y="81" fontSize="7" fill="var(--faint)">layer 1</text>
        <text x="190" y="81" fontSize="7" textAnchor="end" fill="var(--faint)">layer {MAX_LAYERS}</text>
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-3 text-xs text-[var(--muted)]">
        <span style={{ color: "var(--good)" }}>— with residuals</span>
        <span style={{ color: "var(--bad)" }}>— without</span>
      </figcaption>
    </figure>
  );
}

// The block as a column of parts, with the residual stream running beside it.
function BlockDiagram({ stage, residual }: { stage: number | null; residual: boolean }) {
  const ys = [56, 104, 152, 200, 248, 296];
  const lit = (i: number) => stage === i;
  const stroke = (on: boolean) => (on ? ACCENT : "var(--line-strong)");
  const bypass = (i: number) => residual && stage === i;
  return (
    <svg viewBox="0 0 220 350" className="mx-auto w-full max-w-[16rem]" role="img" aria-label={`Input, LayerNorm, attention, add, LayerNorm, feed-forward, add, output. Residual connections ${residual ? "on" : "off"}.`}>
      {/* main path */}
      <line x1="130" x2="130" y1="22" y2="330" stroke="var(--line-strong)" strokeWidth="1.5" />
      {/* residual bypasses: input → first add, first add → second add */}
      {[
        { from: 14, to: ys[2], i: 2 },
        { from: ys[2], to: ys[5], i: 5 },
      ].map((b) => (
        <path
          key={b.i}
          d={`M130 ${b.from + 6} H32 V${b.to} H118`}
          fill="none"
          stroke={residual ? stroke(bypass(b.i)) : "var(--line)"}
          strokeWidth={bypass(b.i) ? 2.5 : 1.5}
          strokeDasharray={residual ? undefined : "4 4"}
          opacity={residual ? 1 : 0.5}
          style={{ transition: "stroke 0.2s" }}
        />
      ))}
      <text x="26" y="180" fontSize="9" fill="var(--faint)" transform="rotate(-90 26 180)" textAnchor="middle">
        {residual ? "residual stream" : "residuals off"}
      </text>
      <text x="130" y="12" fontSize="10" textAnchor="middle" fill="var(--muted)">input x</text>
      <text x="130" y="346" fontSize="10" textAnchor="middle" fill="var(--muted)">to the next block</text>
      {PARTS.map((label, i) => {
        const y = ys[i];
        const add = label === "Add back";
        if (add)
          return (
            <g key={i}>
              <circle cx="130" cy={y} r="12" fill="var(--panel)" stroke={stroke(lit(i))} strokeWidth={lit(i) ? 2.5 : 1.5} style={{ transition: "stroke 0.2s" }} />
              <text x="130" y={y + 4} fontSize="14" textAnchor="middle" fill={residual ? "var(--text)" : "var(--faint)"}>
                {residual ? "+" : "–"}
              </text>
            </g>
          );
        return (
          <g key={i}>
            <rect
              x="70"
              y={y - 15}
              width="120"
              height="30"
              rx="6"
              fill={lit(i) ? `color-mix(in srgb, ${ACCENT} 18%, var(--panel))` : "var(--panel)"}
              stroke={stroke(lit(i))}
              strokeWidth={lit(i) ? 2.5 : 1.5}
              style={{ transition: "stroke 0.2s, fill 0.2s" }}
            />
            <text x="130" y={y + 4} fontSize="11" textAnchor="middle" fill="var(--text)">
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
