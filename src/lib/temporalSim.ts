// Temporal. An order workflow charges a card, reserves stock, waits for a fraud check to
// clear (a signal, up to 24 hours), ships and sends a receipt. Activities fail in four
// ways. The event history uses Temporal's event types; the retry policy, timeouts,
// heartbeats, idempotency and the resulting history run here, with illustrative timings.

export type Scenario = "flaky" | "declined" | "lost" | "crash";
export const SCENARIOS: { id: Scenario; label: string; one: string }[] = [
  { id: "flaky", label: "Payments API flaky", one: "the payments API returns 503 twice, then works" },
  { id: "declined", label: "Card declined", one: "the card is declined: retrying won't help" },
  { id: "lost", label: "Charge response lost", one: "the charge succeeds, but the response times out" },
  { id: "crash", label: "Worker crashes while shipping", one: "the worker running ShipOrder dies 40 s into 2 minutes of work" },
];

export type Retry = "none" | "default" | "nonRetryable";
export type Design = { retry: Retry; heartbeat: boolean; idempotencyKey: boolean };
export const FIRST: Design = { retry: "none", heartbeat: false, idempotencyKey: false };
export const FIXED: Design = { retry: "nonRetryable", heartbeat: true, idempotencyKey: true };
export const START_TO_CLOSE_S = 3600;
export const HEARTBEAT_S = 10;
export const MAX_INTERVAL_S = 100; // default retry policy: 1 s, doubling, capped at 100 s
export const SIGNAL_AFTER_S = 2 * 3600;

export type Ev = { t: number; type: string; detail: string; bad?: boolean };

export function history(sc: Scenario, d: Design) {
  const ev: Ev[] = [];
  let t = 0;
  let charges = 0;
  let failed: string | null = null;
  let attempts = 0;
  const add = (type: string, detail = "", bad = false) => ev.push({ t: Math.round(t), type, detail, bad });

  add("WorkflowExecutionStarted", "OrderWorkflow(order 4821)");

  // ChargeCard
  add("ActivityTaskScheduled", `ChargeCard${d.idempotencyKey ? " · key wf-4821-charge" : ""}`);
  const seenKeys = new Set<string>();
  for (let attempt = 1; ; attempt++) {
    attempts = attempt;
    add("ActivityTaskStarted", `attempt ${attempt}`);
    t += 2;
    let outcome: "ok" | "503" | "declined" | "timeout" = "ok";
    if (sc === "flaky" && attempt <= 2) outcome = "503";
    if (sc === "declined") outcome = "declined";
    if (sc === "lost" && attempt === 1) outcome = "timeout";
    // the payment provider charges unless it has seen this idempotency key
    if (outcome === "ok" || outcome === "timeout") {
      if (!(d.idempotencyKey && seenKeys.has("k"))) charges++;
      seenKeys.add("k");
    }
    if (outcome === "ok") {
      add("ActivityTaskCompleted", charges > 1 ? `charged again: ${charges} charges` : d.idempotencyKey && attempt > 1 ? "provider returned the first charge for this key" : "charged €84.00", charges > 1);
      break;
    }
    const nonRetryable = outcome === "declined" && d.retry === "nonRetryable";
    if (outcome === "timeout") {
      t += 28;
      add("ActivityTaskTimedOut", "no response in 30 s (the charge went through)", true);
    } else add("ActivityTaskFailed", outcome === "503" ? "503 Service Unavailable" : `CardDeclinedError${nonRetryable ? " (non-retryable)" : ""}`, outcome === "declined");
    if (d.retry === "none" || nonRetryable) {
      failed = nonRetryable ? "card declined, not retried: the workflow catches it and emails the customer" : `ChargeCard failed after 1 attempt${outcome === "timeout" ? ", but the card was charged" : ""}`;
      break;
    }
    if (attempt >= 40) {
      failed = "still retrying a declined card an hour later";
      break;
    }
    t += Math.min(MAX_INTERVAL_S, 2 ** (attempt - 1));
  }
  if (failed) {
    add(sc === "declined" && d.retry === "nonRetryable" ? "WorkflowExecutionCompleted" : "WorkflowExecutionFailed", failed, !(sc === "declined" && d.retry === "nonRetryable"));
    return { ev, charges, attempts, done: false, outcome: failed, seconds: t, shipDelay: 0 };
  }

  add("ActivityTaskScheduled", "ReserveStock");
  t += 1;
  add("ActivityTaskCompleted", "3 items reserved");

  // wait for the fraud check, with a 24-hour timer
  add("TimerStarted", "24 h fraud-check deadline");
  t += SIGNAL_AFTER_S;
  add("WorkflowExecutionSignaled", "fraudCleared");
  add("TimerCanceled");

  // ShipOrder: 2 minutes of work, the worker dies at 40 s in the crash scenario
  add("ActivityTaskScheduled", `ShipOrder · startToClose 1 h${d.heartbeat ? ` · heartbeat ${HEARTBEAT_S} s` : ""}`);
  add("ActivityTaskStarted", "attempt 1");
  let shipDelay = 0;
  if (sc === "crash") {
    t += 40;
    const detect = d.heartbeat ? HEARTBEAT_S : START_TO_CLOSE_S - 40;
    t += detect;
    shipDelay = 40 + detect;
    add("ActivityTaskTimedOut", d.heartbeat ? `no heartbeat for ${HEARTBEAT_S} s` : "startToClose: 1 h with no result", !d.heartbeat);
    if (d.retry === "none") {
      add("WorkflowExecutionFailed", "ShipOrder timed out", true);
      return { ev, charges, attempts, done: false, outcome: "paid, never shipped", seconds: t, shipDelay };
    }
    t += 1;
    add("ActivityTaskStarted", "attempt 2 on another worker");
  }
  t += 120;
  add("ActivityTaskCompleted", "label DHL 00340434");
  add("ActivityTaskScheduled", "SendReceipt");
  t += 1;
  add("ActivityTaskCompleted", "receipt sent");
  add("WorkflowExecutionCompleted");
  return { ev, charges, attempts, done: true, outcome: charges > 1 ? `completed, but the customer was charged ${charges} times` : "completed", seconds: t, shipDelay };
}
