"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, PlaybackControls, Slider, usePlayback } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, type Packet } from "@/components/system/SystemMap";
import { KINDS, SCENARIOS, at, simulate, type TaskKind } from "@/lib/threadPool";

const ACCENT = "var(--node)";
const COLOR: Record<TaskKind, string> = { crypto: "var(--c4)", fs: "var(--c1)", dns: "var(--c5)", net: "var(--c3)" };

export default function ThreadPoolDemo() {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const [size, setSize] = useState(4);
  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];
  const result = simulate(scenario.tasks, size);
  const playback = usePlayback(result.total + 1, 900);
  const tick = playback.i;
  const now = at(result, tick);
  const poolBusy = now.running.filter((r) => r.lane !== "OS").length;
  const osBusy = now.running.filter((r) => r.lane === "OS").length;
  const slowest = [...result.runs].filter((r) => KINDS[r.task.kind].ticks === 1).sort((a, b) => b.waited - a.waited)[0];

  const packets: Packet[] = [
    ...(now.queued.length ? [{ id: `q-${tick}`, from: "main", to: "queue", label: `${now.queued.length} waiting` }] : []),
    ...now.running.filter((r) => r.start === tick && r.lane !== "OS").map((r) => ({ id: `run-${r.task.id}`, from: "queue", to: "pool", label: r.task.id })),
    ...now.running.filter((r) => r.start === tick && r.lane === "OS").map((r) => ({ id: `os-${r.task.id}`, from: "main", to: "os", label: r.task.id })),
    ...now.justDone.map((r, i) => ({ id: `cb-${r.task.id}`, from: r.lane === "OS" ? "os" : "pool", to: "main", label: "callback", tone: "good" as const, delay: i * 0.1 })),
  ];

  const caption =
    tick === 0
      ? `Tick 0: all ${scenario.tasks.length} calls start at once. ${Math.min(size, result.runs.filter((r) => r.lane !== "OS").length)} get a thread, ${now.queued.length} wait in the queue.`
      : tick >= result.total
        ? `Done in ${result.total} ticks. ${slowest ? `“${slowest.task.id}” needs 1 tick of work but waited ${slowest.waited} for a free thread.` : ""}`
        : `Tick ${tick}: ${poolBusy} of ${size} threads busy, ${now.queued.length} waiting${osBusy ? `, ${osBusy} network ${osBusy === 1 ? "call" : "calls"} handled by the OS` : ""}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="Node.js · interactive"
        title="The libuv thread pool"
        blurb="Your JavaScript runs on one thread, but some async calls run on a small pool of worker threads: 4 by default. Fill the pool with slow crypto and watch a quick file read wait its turn."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-4">
              <SystemMap
                title="The main thread, the libuv work queue, the thread pool and the OS"
                accent={ACCENT}
                chrome="split"
                nodes={[
                  { id: "main", label: "Main thread", sub: "your JS + event loop", at: [14, 50], mobileAt: [50, 12], state: now.justDone.length ? "good" : "active" },
                  { id: "queue", label: "Work queue", sub: `${now.queued.length} waiting`, at: [46, 24], mobileAt: [24, 50], state: now.queued.length ? "wait" : "idle" },
                  { id: "pool", label: "Thread pool", sub: `${poolBusy}/${size} busy`, at: [84, 24], mobileAt: [24, 88], state: poolBusy === size ? "bad" : poolBusy ? "active" : "idle" },
                  { id: "os", label: "OS kernel", sub: osBusy ? `${osBusy} sockets` : "epoll / kqueue", at: [70, 78], mobileAt: [76, 70], state: osBusy ? "active" : "idle" },
                ]}
                links={[
                  { from: "main", to: "queue", label: "fs · crypto · dns" },
                  { from: "queue", to: "pool", label: "next task" },
                  { from: "pool", to: "main", label: "callback" },
                  { from: "main", to: "os", label: "network I/O" },
                ]}
                packets={packets}
                aspect={2.2}
                mobileAspect={0.95}
              />
              <Timeline result={result} tick={tick} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <Choices
                label="Work"
                accent={ACCENT}
                value={scenario.id}
                onChange={(id) => {
                  setScenarioId(id);
                  playback.reset();
                }}
                options={SCENARIOS.map((s) => ({ id: s.id, label: s.label }))}
              />
              <div className="w-full">
                <Slider
                  label="UV_THREADPOOL_SIZE"
                  hint="Set before the process starts. Max 1024."
                  value={size}
                  min={1}
                  max={8}
                  step={1}
                  format={(v) => String(v)}
                  accent={ACCENT}
                  onChange={(v) => {
                    setSize(v);
                    playback.reset();
                  }}
                />
              </div>
              <PlaybackControls playback={playback} accent={ACCENT} nextLabel="Next tick" status={`Tick ${tick} of ${result.total}`} />
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Your code calls an async API" what="The call returns at once. The work itself happens somewhere else, and your callback or promise waits for it." accent={ACCENT} active={tick === 0}>
                <p className="font-mono text-xs leading-6 text-[var(--muted)]">{scenario.tasks.map((t) => KINDS[t.kind].label).join(" · ")}</p>
              </FlowStep>
              <FlowArrow label="network or not?" accent={ACCENT} />

              <FlowStep n={2} title="Network I/O goes straight to the OS" what="Sockets are non-blocking. The kernel tells libuv when data arrives, so http, net and fetch never use a pool thread." accent={ACCENT} active={osBusy > 0}>
                <p className="text-sm">{result.runs.some((r) => r.lane === "OS") ? `${result.runs.filter((r) => r.lane === "OS").length} network calls, 0 pool threads.` : "No network calls in this work."}</p>
              </FlowStep>
              <FlowArrow label="fs · crypto · zlib · dns.lookup" accent={ACCENT} />

              <FlowStep n={3} title="Other work waits for a free thread" what="File system calls, pbkdf2/scrypt, zlib and dns.lookup have no async OS interface everywhere, so libuv runs them on its pool. A full pool means a queue." accent={ACCENT} active={now.queued.length > 0}>
                <p className="text-sm">
                  {now.queued.length ? `${now.queued.map((r) => r.task.id).join(", ")} waiting.` : "Queue empty."}
                </p>
              </FlowStep>
              <FlowArrow label="a free thread" accent={ACCENT} />

              <FlowStep n={4} title="A worker thread runs it" what="Off the main thread, so your JS keeps running. But a long task holds its thread the whole time." accent={ACCENT} active={poolBusy > 0}>
                <ul className="space-y-1 text-sm">
                  {now.running.filter((r) => r.lane !== "OS").map((r) => (
                    <li key={r.task.id} className="flex justify-between gap-2">
                      <span>{r.task.id}</span>
                      <span className="font-mono text-xs text-[var(--faint)]">{r.lane}</span>
                    </li>
                  ))}
                  {poolBusy === 0 && <li className="text-[var(--faint)]">All threads idle.</li>}
                </ul>
              </FlowStep>
              <FlowArrow label="result" accent={ACCENT} />

              <FlowStep n={5} title="The callback returns to the event loop" what="libuv queues the callback; the main thread runs it on its next turn. Then the thread takes the next task from the queue." accent={ACCENT} active={now.justDone.length > 0}>
                <p className="text-sm">{now.done.length} of {result.runs.length} callbacks run.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Timeline({ result, tick }: { result: ReturnType<typeof simulate>; tick: number }) {
  const span = Math.max(1, result.total);
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Which thread ran which task, over time">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">Timeline</p>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--muted)]">
          {(Object.keys(KINDS) as TaskKind[]).map((k) => (
            <li key={k} className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm" style={{ background: COLOR[k] }} />
              {KINDS[k].label}
            </li>
          ))}
        </ul>
      </div>
      <div className="relative mt-3 space-y-1.5">
        {result.lanes.map((lane) => (
          <div key={lane} className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2">
            <span className="truncate font-mono text-[11px] text-[var(--muted)]">{lane}</span>
            <div className="relative h-6 rounded bg-[var(--track)]">
              {result.runs
                .filter((r) => r.lane === lane)
                .map((r) => (
                  <span
                    key={r.task.id}
                    title={`${r.task.id}: ticks ${r.start}–${r.end}`}
                    className="absolute inset-y-0.5 overflow-hidden rounded px-1 text-[10px] leading-5 whitespace-nowrap text-[var(--on-accent)]"
                    style={{
                      left: `${(r.start / span) * 100}%`,
                      width: `calc(${((r.end - r.start) / span) * 100}% - 2px)`,
                      background: COLOR[r.task.kind],
                      opacity: r.start <= tick ? 1 : 0.3,
                    }}
                  >
                    {r.task.id}
                  </span>
                ))}
            </div>
          </div>
        ))}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-0.5 rounded transition-[left] duration-300"
          style={{ left: `calc(4.5rem + 0.5rem + (100% - 5rem) * ${Math.min(tick, span) / span})`, background: "var(--text)" }}
        />
      </div>
    </section>
  );
}
