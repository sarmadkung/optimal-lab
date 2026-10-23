"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type Packet } from "@/components/system/SystemMap";
import { ABANDON_S, CONTEXT_LIMIT, DEMO, FAIL_LABEL, GUARD_LIST, NO_GUARDS, STATS, TIMEOUT_S, TRAFFIC, run, type Fail, type Guards } from "@/lib/productionReadiness";

const ACCENT = "var(--native)";
const ALL: Guards = { input: true, provider: true, output: true, cache: true };
const FAIL_COLOR: Record<Fail, string> = { tooLong: "var(--c1)", language: "var(--c5)", rateLimit: "var(--c2)", serverError: "var(--bad)", tooSlow: "var(--muted)", badOutput: "var(--c4)" };

export default function PrototypeToProductionDemo() {
  const [g, setG] = useState<Guards>(NO_GUARDS);
  const { stage, busy, run: walk } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (k: keyof Guards, v: boolean) => setG((c) => ({ ...c, [k]: v }));
  const demo = run(DEMO, NO_GUARDS);
  const x = run(TRAFFIC, g);
  const failed = x.total - x.ok;

  const packets: Packet[] =
    stage === 0 ? hops("d", ["users", "app", "primary", "app"], { label: "10 demo inputs", tone: "good" })
    : stage === 1 ? hops("t", ["users", "app"], { label: "1,000 real requests" })
    : stage === 2 ? hops("i", ["app", "primary"], { label: g.input ? "long pastes chunked" : `${STATS.longPastes} over ${CONTEXT_LIMIT / 1000}k`, tone: g.input ? "good" : "bad" })
    : stage === 3 ? (g.provider ? hops("f", ["primary", "fallback", "check"], { label: "retry, then fallback", tone: "good" }) : hops("e", ["primary", "app"], { label: "429 / 500 to the user", tone: "bad" }))
    : stage === 4 ? hops("o", ["check", "app", "users"], { label: `${x.ok} answered`, tone: failed > 30 ? "bad" : "good" })
    : [];

  const captions = [
    `Step 1: in the demo, 10 inputs chosen by the team all work: p95 ${demo.p95.toFixed(1)} s.`,
    `Step 2: real traffic: ${STATS.longPastes} pasted documents over the limit, ${STATS.nonEnglish} not in English, ${STATS.repeats} repeats, ${STATS.firstTryErrors} errors on the first try, ${STATS.slow} slow answers, ${STATS.badOutput} broken outputs.`,
    g.input ? "Step 3: long pastes are summarized in chunks first, and the prompt answers in the user's language." : `Step 3: no input guard: ${x.fails.tooLong} requests fail on length and ${x.fails.language} get an English answer.`,
    g.provider ? `Step 4: each call times out at ${TIMEOUT_S} s, retries with backoff and falls back to a second provider.` : `Step 4: one try only: ${x.fails.rateLimit + x.fails.serverError} errors go straight to users.`,
    `Step 5: ${x.ok} of 1,000 answered${g.output ? ", outputs checked and repaired once" : ""}${g.cache ? `, ${x.cacheHits} served from cache` : ""}; p95 ${x.p95.toFixed(1)} s, $${x.costPer1k.toFixed(2)} per 1,000.`,
  ];
  const caption = stage !== null ? captions[stage] : `${x.ok} of 1,000 requests answered (${failed} failed) · p95 ${x.p95.toFixed(1)} s · $${x.costPer1k.toFixed(2)} per 1,000 requests.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Native · interactive"
        title="From prototype to production"
        blurb="A “summarize this document” feature passed every demo: ten inputs, ten good answers. Then a thousand real users arrive with 100-page pastes, Spanish, rate limits, 20-second answers and the occasional broken JSON. Run them through the demo code, then add the four safeguards one at a time."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Users, the app, the model provider, a fallback provider and an output check"
                accent={ACCENT}
                chrome="split"
                nodes={[
                  { id: "users", label: "Users", sub: `${x.ok}/1,000 answered`, at: [10, 50], mobileAt: [50, 8], state: failed > 30 ? "bad" : "good" },
                  { id: "app", label: "Your app", sub: g.input || g.cache ? [g.input && "input guard", g.cache && "cache"].filter(Boolean).join(" + ") : "demo code", at: [36, 50], mobileAt: [50, 34], state: "active" },
                  { id: "primary", label: "Model provider", sub: `${STATS.firstTryErrors} errors`, at: [64, 16], mobileAt: [24, 62], state: "active" },
                  { id: "fallback", label: "Fallback provider", sub: g.provider ? "standing by" : "none", at: [64, 84], mobileAt: [76, 62], state: g.provider ? "active" : "dim" },
                  { id: "check", label: "Output check", sub: g.output ? "validate + repair" : "off", at: [88, 50], mobileAt: [50, 88], state: g.output ? "active" : "dim" },
                ]}
                links={[
                  { from: "users", to: "app", label: "requests" },
                  { from: "app", to: "primary", label: "prompt" },
                  { from: "primary", to: "fallback", label: "on failure", dim: !g.provider },
                  { from: "primary", to: "check", label: "output" },
                  { from: "fallback", to: "check", label: "output", dim: !g.provider },
                  { from: "check", to: "app", label: "answer" },
                ]}
                packets={packets}
                aspect={1.5}
                mobileAspect={0.8}
              />
              <Outcomes g={g} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setG(NO_GUARDS)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Demo code
                </button>
                <button type="button" onClick={() => setG(ALL)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  All four safeguards
                </button>
              </div>
              <RunButton busy={busy} onClick={walk} accent={ACCENT} running="Serving…">
                Send real traffic
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="The demo: ten inputs you picked" what="A prototype is tested on inputs its builders chose, which are short, in English and well formed, against a provider that isn't busy. It passes, and that says little about what users will send." accent={ACCENT} active={at(0)}>
                <p className="font-mono text-xs">
                  {demo.ok}/{demo.total} answered · p95 {demo.p95.toFixed(1)} s · ${demo.costPer1k.toFixed(2)} per 1,000
                </p>
              </FlowStep>
              <FlowArrow label="launch" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Real traffic arrives" what="Production inputs have a long tail: some are a hundred pages, some in another language, some the same request twice. Providers return 429s and 500s and the occasional 20-second answer, and a few outputs come back broken." accent={ACCENT} active={at(1)}>
                <ul className="grid gap-x-3 gap-y-0.5 font-mono text-[11px] sm:grid-cols-2">
                  <li>{STATS.longPastes} over {CONTEXT_LIMIT / 1000}k tokens</li>
                  <li>{STATS.nonEnglish} not in English</li>
                  <li>{STATS.repeats} repeats of an earlier request</li>
                  <li>{STATS.firstTryErrors} errors on the first try</li>
                  <li>{STATS.slow} answers slower than {TIMEOUT_S} s</li>
                  <li>{STATS.badOutput} broken outputs</li>
                </ul>
              </FlowStep>
              <FlowArrow label="each request" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Guard the input" what={`Count tokens before calling: over ${CONTEXT_LIMIT / 1000}k, summarize the document in chunks first instead of failing. And tell the model to answer in the user's language; the demo's English examples quietly taught it otherwise.`} accent={ACCENT} active={at(2)}>
                <Toggle on={g.input} set={(v) => set("input", v)} label={GUARD_LIST[0].label} />
              </FlowStep>
              <FlowArrow label="prompt" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Survive the provider" what={`Time out at ${TIMEOUT_S} s instead of waiting for a 40-second answer, retry 429s and 500s with backoff, and after three tries send it to a second provider. Each costs a little latency; together they turn errors into answers.`} accent={ACCENT} active={at(3)}>
                <Toggle on={g.provider} set={(v) => set("provider", v)} label={GUARD_LIST[1].label} />
              </FlowStep>
              <FlowArrow label="output" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Check the output, and stop paying twice" what="Validate every answer against its schema and ask once more when it fails, so users never see half a JSON object. Cache answers to identical requests: about one in five here, answered instantly for nothing." accent={ACCENT} active={at(4)}>
                <Toggle on={g.output} set={(v) => set("output", v)} label={GUARD_LIST[2].label} />
                <Toggle on={g.cache} set={(v) => set("cache", v)} label={GUARD_LIST[3].label} />
                <Ladder />
                <p className="mt-2 text-[11px] text-[var(--faint)]">The 1,000 requests are a seeded synthetic mix; error rates and latencies are typical, not measured. Every request really runs through the safeguards that are on.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Toggle({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) {
  return (
    <label className="flex min-h-11 w-full items-center gap-2 text-sm">
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} className="h-4 w-4" style={{ accentColor: ACCENT }} />
      {label}
    </label>
  );
}

// 1,000 requests as one bar: answered, then each way of failing.
function Outcomes({ g }: { g: Guards }) {
  const x = run(TRAFFIC, g);
  const parts = (Object.keys(FAIL_LABEL) as Fail[]).filter((k) => x.fails[k] > 0);
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="What happened to 1,000 real requests">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">1,000 real requests</p>
        <p className="font-mono text-xs">
          p50 {x.p50.toFixed(1)} s · p95 {x.p95.toFixed(1)} s · ${x.costPer1k.toFixed(2)}/1k
        </p>
      </div>
      <div className="mt-3 flex h-5 overflow-hidden rounded">
        <div style={{ width: `${(x.ok / x.total) * 100}%`, background: "var(--good)" }} />
        {parts.map((k) => (
          <div key={k} style={{ width: `${(x.fails[k] / x.total) * 100}%`, background: FAIL_COLOR[k] }} />
        ))}
      </div>
      <ul className="mt-3 space-y-0.5 text-xs">
        <li className="flex justify-between gap-2">
          <span>
            <span style={{ color: "var(--good)" }}>■</span> answered{x.cacheHits ? ` (${x.cacheHits} from cache)` : ""}
          </span>
          <span className="font-mono">{x.ok}</span>
        </li>
        {(Object.keys(FAIL_LABEL) as Fail[]).map((k) => (
          <li key={k} className="flex justify-between gap-2" style={{ color: x.fails[k] ? "var(--text)" : "var(--faint)" }}>
            <span>
              <span style={{ color: FAIL_COLOR[k] }}>■</span> {FAIL_LABEL[k]}
            </span>
            <span className="font-mono">{x.fails[k]}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-[var(--faint)]">Users leave after {ABANDON_S} s.</p>
    </section>
  );
}

// Each safeguard added on top of the ones before it.
function Ladder() {
  let g: Guards = NO_GUARDS;
  const rows = [{ label: "Demo code", x: run(TRAFFIC, g) }];
  for (const s of GUARD_LIST) {
    g = { ...g, [s.id]: true };
    rows.push({ label: `+ ${s.label.toLowerCase()}`, x: run(TRAFFIC, g) });
  }
  return (
    <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-x-3 gap-y-0.5 font-mono text-[11px]">
      <span className="text-[var(--faint)]">safeguards</span>
      <span className="text-right text-[var(--faint)]">answered</span>
      <span className="text-right text-[var(--faint)]">p95</span>
      <span className="text-right text-[var(--faint)]">$/1k</span>
      {rows.map((r) => [
        <span key={`${r.label}a`}>{r.label}</span>,
        <span key={`${r.label}b`} className="text-right">
          {r.x.ok}
        </span>,
        <span key={`${r.label}c`} className="text-right">
          {r.x.p95.toFixed(1)} s
        </span>,
        <span key={`${r.label}d`} className="text-right">
          {r.x.costPer1k.toFixed(2)}
        </span>,
      ])}
    </div>
  );
}
