// A work queue with SQS-style semantics: at-least-once delivery.
// A consumer receives a message, which hides it for the visibility timeout. If the consumer
// deletes it in time, it's done. If the consumer fails or is too slow, the message becomes
// visible again and someone receives it again. After MAX_RECEIVES failed tries it moves to a
// dead-letter queue. Each message here is "charge order #N": doing it twice charges twice,
// unless the consumer is idempotent (it records each order id and skips repeats).

export const MAX_RECEIVES = 3;
export const TICKS = 24;

export type Msg = { id: string; order: number; poison: boolean };

export type Settings = {
  consumers: number;
  /** ticks to process one message */
  work: number;
  /** visibility timeout in ticks */
  visibility: number;
  poison: boolean;
  idempotent: boolean;
};

export type MsgState = "waiting" | "in-flight" | "done" | "dead";

export type QueueFrame = {
  tick: number;
  states: Record<string, { state: MsgState; receives: number; consumer?: number }>;
  consumers: ({ msg: string; until: number } | null)[];
  charges: Record<number, number>;
  produced: number;
  events: string[];
};

export function messages(poison: boolean): Msg[] {
  return Array.from({ length: 8 }, (_, i) => ({ id: `m${i + 1}`, order: 101 + i, poison: poison && i === 4 }));
}

// One message arrives per tick for the first eight ticks.
const arrivesAt = (i: number) => i;

export function simulate(s: Settings): QueueFrame[] {
  const msgs = messages(s.poison);
  const st: QueueFrame["states"] = {};
  const visibleAt: Record<string, number> = {};
  const consumers: QueueFrame["consumers"] = Array.from({ length: s.consumers }, () => null);
  const started: Record<number, number> = {};
  const charges: Record<number, number> = {};
  const seen = new Set<number>(); // idempotency keys already processed
  const frames: QueueFrame[] = [];

  for (let t = 0; t < TICKS; t++) {
    const events: string[] = [];
    msgs.forEach((m, i) => {
      if (arrivesAt(i) === t) {
        st[m.id] = { state: "waiting", receives: 0 };
        visibleAt[m.id] = t;
      }
    });

    // consumers that finish now
    consumers.forEach((c, k) => {
      if (!c || c.until !== t) return;
      const m = msgs.find((x) => x.id === c.msg)!;
      consumers[k] = null;
      if (m.poison) {
        events.push(`Consumer ${k + 1} failed on ${m.id} (bad data). No delete, so it will come back.`);
        return;
      }
      if (s.idempotent && seen.has(m.order)) events.push(`Consumer ${k + 1} sees order #${m.order} was already charged and skips it.`);
      else {
        charges[m.order] = (charges[m.order] ?? 0) + 1;
        seen.add(m.order);
        events.push(
          charges[m.order] > 1 ? `Consumer ${k + 1} charged order #${m.order} again: a duplicate.` : `Consumer ${k + 1} charged order #${m.order} and deleted ${m.id}.`,
        );
      }
      if (st[m.id].state !== "done") st[m.id] = { ...st[m.id], state: "done", consumer: undefined };
      // a copy may still be running elsewhere; it will finish later as a duplicate
    });

    // visibility timeouts: in-flight messages not yet deleted come back
    for (const m of msgs) {
      const x = st[m.id];
      if (!x || x.state !== "in-flight" || visibleAt[m.id] > t) continue;
      if (x.receives >= MAX_RECEIVES) {
        st[m.id] = { ...x, state: "dead", consumer: undefined };
        events.push(`${m.id} failed ${MAX_RECEIVES} times and moves to the dead-letter queue.`);
      } else {
        st[m.id] = { ...x, state: "waiting", consumer: undefined };
        events.push(`${m.id}'s visibility timeout ran out. It is visible again.`);
      }
    }

    // idle consumers receive the oldest visible message
    consumers.forEach((c, k) => {
      if (c) return;
      const next = msgs.find((m) => st[m.id]?.state === "waiting" && visibleAt[m.id] <= t);
      if (!next) return;
      const x = st[next.id];
      st[next.id] = { state: "in-flight", receives: x.receives + 1, consumer: k };
      visibleAt[next.id] = t + s.visibility;
      consumers[k] = { msg: next.id, until: t + s.work };
      started[k] = t;
      events.push(`Consumer ${k + 1} receives ${next.id}${x.receives ? ` (try ${x.receives + 1})` : ""}.`);
    });

    frames.push({
      tick: t,
      states: JSON.parse(JSON.stringify(st)),
      consumers: consumers.map((c) => (c ? { ...c } : null)),
      charges: { ...charges },
      produced: msgs.filter((_, i) => arrivesAt(i) <= t).length,
      events,
    });
    const settled = msgs.every((m) => st[m.id] && (st[m.id].state === "done" || st[m.id].state === "dead")) && consumers.every((c) => !c);
    if (settled && t >= 7) break;
  }
  return frames;
}

export function summary(frame: QueueFrame) {
  const charges = Object.values(frame.charges);
  return {
    done: Object.values(frame.states).filter((x) => x.state === "done").length,
    dead: Object.values(frame.states).filter((x) => x.state === "dead").length,
    waiting: Object.values(frame.states).filter((x) => x.state === "waiting").length,
    duplicates: charges.reduce((s, c) => s + Math.max(0, c - 1), 0),
  };
}
