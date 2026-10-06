"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { PlaybackControls, Slider, usePlayback } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, type MapNode, type Packet } from "@/components/system/SystemMap";
import { MAX_RECEIVES, messages, simulate, summary, type MsgState, type Settings } from "@/lib/messageQueue";

const ACCENT = "var(--sys)";
const STATE_COLOR: Record<MsgState, string> = { waiting: "var(--c1)", "in-flight": "var(--auto)", done: "var(--good)", dead: "var(--bad)" };

const PRESETS: { id: string; label: string; s: Settings }[] = [
  { id: "healthy", label: "Healthy", s: { consumers: 2, work: 2, visibility: 4, poison: false, idempotent: false } },
  { id: "slow", label: "Slow consumers", s: { consumers: 3, work: 4, visibility: 2, poison: false, idempotent: false } },
  { id: "poison", label: "A poison message", s: { consumers: 2, work: 2, visibility: 4, poison: true, idempotent: false } },
];

const CONSUMER_AT: [number, number][] = [[80, 15], [80, 50], [80, 85]];
const CONSUMER_MOBILE_AT: [number, number][] = [[18, 62], [50, 62], [82, 62]];

export default function MessageQueueDemo() {
  const [s, setS] = useState<Settings>(PRESETS[0].s);
  const frames = simulate(s);
  const playback = usePlayback(frames.length, 900);
  const f = frames[playback.i];
  const prev = playback.i > 0 ? frames[playback.i - 1] : null;
  const sum = summary(f);
  const msgs = messages(s.poison);
  const set = (patch: Partial<Settings>) => {
    setS((x) => ({ ...x, ...patch }));
    playback.reset();
  };

  const nodes: MapNode[] = [
    { id: "producer", label: "Producer", sub: `${f.produced} of ${msgs.length} sent`, at: [11, 30], mobileAt: [50, 8], state: f.produced < msgs.length ? "active" : "idle" },
    { id: "queue", label: "Queue", sub: `${sum.waiting} visible`, at: [44, 30], mobileAt: [50, 32], state: sum.waiting ? "wait" : "idle" },
    ...f.consumers.map((c, k) => ({
      id: `c${k}`,
      label: `Consumer ${k + 1}`,
      sub: c ? `working on ${c.msg}` : "idle",
      at: CONSUMER_AT[k],
      mobileAt: CONSUMER_MOBILE_AT[k],
      state: c ? ("active" as const) : ("idle" as const),
    })),
    { id: "dlq", label: "Dead-letter queue", sub: `${sum.dead} parked`, at: [44, 85], mobileAt: [16, 92], state: sum.dead ? "bad" : "dim" },
  ];
  const packets: Packet[] = [];
  f.consumers.forEach((c, k) => {
    if (c && (!prev || prev.consumers[k]?.msg !== c.msg || prev.consumers[k]?.until !== c.until)) packets.push({ id: `r-${f.tick}-${k}`, from: "queue", to: `c${k}`, label: c.msg });
  });
  if (prev && sum.dead > summary(prev).dead) packets.push({ id: `dlq-${f.tick}`, from: "queue", to: "dlq", label: "dead", tone: "bad" });
  if (prev && f.produced > prev.produced) packets.push({ id: `p-${f.tick}`, from: "producer", to: "queue", label: `m${f.produced}` });

  const caption = `Tick ${f.tick}: ${f.events.join(" ") || "Consumers are working."}`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="System design · interactive"
        title="Message queues: at-least-once delivery"
        blurb="A producer drops work on a queue and moves on. Consumers pull it, do it, and delete it. Make the consumers slow, or send a message that always fails, and watch what “at least once” really means."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-4">
              <SystemMap
                title="A producer, a queue, consumers and a dead-letter queue"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "producer", to: "queue", label: "send" },
                  ...f.consumers.map((_, k) => ({ from: "queue", to: `c${k}`, label: "receive" })),
                  { from: "queue", to: "dlq", label: `after ${MAX_RECEIVES} tries`, dim: sum.dead === 0 },
                ]}
                packets={packets}
                aspect={2.2}
                mobileAspect={0.9}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Every message and what happened to it">
                <ul className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                  {msgs.map((m) => {
                    const st = f.states[m.id];
                    const charged = f.charges[m.order] ?? 0;
                    return (
                      <li key={m.id} className="rounded-lg border px-1 py-1.5 text-center" style={{ borderColor: st ? STATE_COLOR[st.state] : "var(--line)", opacity: st ? 1 : 0.35 }}>
                        <p className="font-mono text-sm">{m.id}</p>
                        <p className="text-[10px] text-[var(--muted)]">{st ? st.state : "not sent"}</p>
                        <p className="font-mono text-[10px]" style={{ color: charged > 1 ? "var(--bad)" : "var(--faint)" }}>
                          {charged ? `charged ×${charged}` : st?.receives ? `try ${st.receives}` : "·"}
                        </p>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-sm">
                  {sum.done} done · {sum.dead} dead-lettered · <span style={{ color: sum.duplicates ? "var(--bad)" : undefined }}>{sum.duplicates} duplicate charges</span>
                </p>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button key={p.id} type="button" onClick={() => set(p.s)} className="min-h-11 rounded-md border border-[var(--line-strong)] px-3 text-sm">
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="grid w-full gap-3 sm:grid-cols-3">
                <Slider label="Consumers" value={s.consumers} min={1} max={3} step={1} format={String} accent={ACCENT} onChange={(v) => set({ consumers: v })} />
                <Slider label="Work per message" value={s.work} min={1} max={4} step={1} format={(v) => `${v} ticks`} accent={ACCENT} onChange={(v) => set({ work: v })} />
                <Slider label="Visibility timeout" value={s.visibility} min={2} max={6} step={1} format={(v) => `${v} ticks`} accent={ACCENT} onChange={(v) => set({ visibility: v })} />
              </div>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" checked={s.poison} onChange={(e) => set({ poison: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                m5 has bad data (always fails)
              </label>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" checked={s.idempotent} onChange={(e) => set({ idempotent: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                Idempotent consumer (skip orders already charged)
              </label>
              <PlaybackControls playback={playback} accent={ACCENT} nextLabel="Next tick" status={`tick ${f.tick}`} />
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="The producer sends and moves on" what="The web request that created the order returns at once. The slow part (charging the card) happens later, off the request path." accent={ACCENT} active={!!prev && f.produced > prev.produced}>
                <p className="text-sm">{f.produced} of {msgs.length} messages sent.</p>
              </FlowStep>
              <FlowArrow label="message" accent={ACCENT} />

              <FlowStep n={2} title="A consumer receives it, and it hides" what={`The message stays in the queue but is invisible for the visibility timeout (${s.visibility} ticks here, 30 seconds by default on SQS).`} accent={ACCENT} active={packets.some((p) => p.from === "queue" && p.to.startsWith("c"))}>
                <p className="text-sm">{f.consumers.filter(Boolean).length} of {s.consumers} consumers busy.</p>
              </FlowStep>
              <FlowArrow label="do the work" accent={ACCENT} />

              <FlowStep n={3} title="Delete it when done" what="Deleting is the acknowledgement. If the consumer crashes, or takes longer than the timeout, the message reappears and someone gets it again." accent={ACCENT} active={f.events.some((e) => e.includes("visible again"))}>
                <p className="text-sm" style={{ color: s.work > s.visibility ? "var(--bad)" : undefined }}>
                  Work {s.work} ticks vs timeout {s.visibility}: {s.work > s.visibility ? "too slow, messages will be delivered twice." : "fits."}
                </p>
              </FlowStep>
              <FlowArrow label="maybe a second time" accent={ACCENT} />

              <FlowStep n={4} title="Expect duplicates: be idempotent" what="At-least-once means a message can be processed twice. Record what you've done (an idempotency key like the order id) and skip repeats." accent={ACCENT} active={sum.duplicates > 0}>
                <p className="text-sm" style={{ color: sum.duplicates ? "var(--bad)" : "var(--good)" }}>
                  {sum.duplicates ? `${sum.duplicates} orders charged twice.` : s.idempotent ? "Repeats are skipped: no double charges." : "No duplicates so far."}
                </p>
              </FlowStep>
              <FlowArrow label={`fails ${MAX_RECEIVES} times`} accent={ACCENT} />

              <FlowStep n={5} title="Park poison messages in a dead-letter queue" what={`A message that fails every time would block a consumer forever. After ${MAX_RECEIVES} receives it moves aside, an alarm fires, and a person looks at it.`} accent={ACCENT} active={sum.dead > 0}>
                <p className="text-sm">{sum.dead ? `${sum.dead} message in the dead-letter queue.` : "Dead-letter queue is empty."}</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
