"use client";

import { useState } from "react";
import { FlowArrow, FlowSequence, FlowStep } from "@/components/flow/Flow";
import { Choices, PlaybackControls, usePlayback } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { ALGOS, LIMIT, PATTERNS, SECONDS, WINDOW, simulate, type Algo, type Run } from "@/lib/rateLimit";

const ACCENT = "var(--sys)";
const MAX_BAR = 10;

export default function RateLimitDemo() {
  const [patternId, setPatternId] = useState(PATTERNS[0].id);
  const pattern = PATTERNS.find((p) => p.id === patternId) ?? PATTERNS[0];
  const runs = Object.fromEntries(ALGOS.map((a) => [a.id, simulate(a.id, pattern.arrivals)])) as Record<Algo, Run>;
  const playback = usePlayback(SECONDS, 450);
  const t = playback.i;
  const arrivedNow = pattern.arrivals[t];

  const caption =
    playback.atEnd
      ? `Most requests let through in any 10 seconds: fixed ${runs.fixed.peak}, sliding ${runs.sliding.peak}, bucket ${runs.bucket.peak}. The limit is ${LIMIT}.`
      : arrivedNow
        ? `Second ${t}: ${arrivedNow} ${arrivedNow === 1 ? "request" : "requests"}. Fixed lets ${runs.fixed.seconds[t].allowed} through, sliding ${runs.sliding.seconds[t].allowed}, bucket ${runs.bucket.seconds[t].allowed}.`
        : `Second ${t}: quiet.${t % WINDOW === 0 && t > 0 ? " A new fixed window starts and its counter resets to 0." : ""}`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="System design · interactive"
        title="Rate limiting: three algorithms, one burst"
        blurb={`Every API caps how often one client can call it: here ${LIMIT} requests per ${WINDOW} seconds. Three common ways to count give different answers on the same traffic. Watch a burst that straddles a window boundary.`}
      />

      <div className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
        <p aria-live="polite" className="min-h-10 text-sm">
          {caption}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Choices
            accent={ACCENT}
            value={pattern.id}
            onChange={(id) => {
              setPatternId(id);
              playback.reset();
            }}
            options={PATTERNS.map((p) => ({ id: p.id, label: p.label }))}
          />
          <PlaybackControls playback={playback} accent={ACCENT} nextLabel="Next second" status={`t = ${t}s`} />
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {ALGOS.map((a) => (
          <Lane key={a.id} name={a.name} how={a.how} algo={a.id} run={runs[a.id]} t={t} />
        ))}
      </div>

      <div className="mt-6">
        <FlowSequence mode="stage" accent={ACCENT}>
          <FlowStep n={1} title="A request arrives at the gateway" what="The limiter sits in front of the API (NGINX, Envoy, an API gateway) and identifies the client by API key, user id or IP." accent={ACCENT} active={arrivedNow > 0 && !playback.atEnd}>
            <p className="font-mono text-sm">t = {t}s · {arrivedNow} arriving</p>
          </FlowStep>
          <FlowArrow label="client id" accent={ACCENT} />
          <FlowStep n={2} title="Read the client's counter" what="Counters live in a shared store such as Redis, so every gateway instance sees the same numbers. One INCR per request." accent={ACCENT}>
            <p className="font-mono text-sm">
              fixed {runs.fixed.seconds[t].state}/{LIMIT} · sliding {runs.sliding.seconds[t].state}/{LIMIT} · tokens left {runs.bucket.seconds[t].state}
            </p>
          </FlowStep>
          <FlowArrow label="over or under" accent={ACCENT} />
          <FlowStep n={3} title="Over the limit: reject with 429" what="HTTP 429 Too Many Requests, with a Retry-After header so a well-behaved client knows when to try again." accent={ACCENT} active={ALGOS.some((a) => runs[a.id].seconds[t].rejected > 0)}>
            <p className="text-sm">
              Rejected this second: {ALGOS.map((a) => `${a.name.split(" ")[0].toLowerCase()} ${runs[a.id].seconds[t].rejected}`).join(" · ")}
            </p>
          </FlowStep>
          <FlowArrow label="under the limit" accent={ACCENT} />
          <FlowStep n={4} title="Under the limit: forward to the API" what="The request goes through and the counter goes up (or a token is spent)." accent={ACCENT}>
            <p className="text-sm">
              Let through so far: {ALGOS.map((a) => `${a.name.split(" ")[0].toLowerCase()} ${runs[a.id].seconds.slice(0, t + 1).reduce((s, x) => s + x.allowed, 0)}`).join(" · ")}
            </p>
          </FlowStep>
          <FlowArrow label="time passes" accent={ACCENT} />
          <FlowStep n={5} title="Reset, slide or refill" what="A fixed window resets on the boundary, which is why it can let 2× the limit through in two seconds. A sliding window carries part of the last window over. A token bucket refills steadily and allows short bursts up to its size." accent={ACCENT} active={playback.atEnd}>
            <p className="text-sm">
              Peak in any {WINDOW}s: fixed <b style={{ color: runs.fixed.peak > LIMIT ? "var(--bad)" : undefined }}>{runs.fixed.peak}</b> · sliding{" "}
              <b>{runs.sliding.peak}</b> · bucket <b>{runs.bucket.peak}</b>
            </p>
          </FlowStep>
        </FlowSequence>
      </div>
    </SessionPage>
  );
}

function Lane({ name, how, algo, run, t }: { name: string; how: string; algo: Algo; run: Run; t: number }) {
  const now = run.seconds[t];
  const stateLabel = algo === "bucket" ? `${now.state} tokens left` : algo === "sliding" ? `estimate ${now.state} / ${LIMIT}` : `count ${now.state} / ${LIMIT}`;
  return (
    <section aria-label={name} className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">{name}</h2>
        <p className="font-mono text-xs text-[var(--muted)]">
          {stateLabel} · peak {run.peak} in {WINDOW}s
        </p>
      </div>
      <p className="text-sm text-[var(--muted)]">{how}</p>
      <div className="relative mt-3 flex h-20 items-end gap-px" aria-hidden>
        {run.seconds.map((s) => (
          <div key={s.t} className="flex h-full min-w-0 flex-1 flex-col justify-end" style={{ opacity: s.t <= t ? 1 : 0.15 }}>
            <div style={{ height: `${(s.rejected / MAX_BAR) * 100}%`, background: "var(--bad)" }} className="rounded-t-sm" />
            <div style={{ height: `${(s.allowed / MAX_BAR) * 100}%`, background: "var(--good)" }} />
          </div>
        ))}
        {/* fixed-window boundaries */}
        {Array.from({ length: SECONDS / WINDOW - 1 }, (_, i) => (
          <div key={i} className="absolute inset-y-0 border-l border-dashed" style={{ left: `${(((i + 1) * WINDOW) / SECONDS) * 100}%`, borderColor: "var(--line-strong)" }} />
        ))}
        <div className="absolute inset-y-0 w-0.5 rounded" style={{ left: `${((t + 0.5) / SECONDS) * 100}%`, background: "var(--text)" }} />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-[var(--faint)]">
        <span>0s</span>
        <span>
          <span style={{ color: "var(--good)" }}>■</span> allowed <span style={{ color: "var(--bad)" }}>■</span> rejected · dashed = window boundary
        </span>
        <span>{SECONDS}s</span>
      </div>
    </section>
  );
}
