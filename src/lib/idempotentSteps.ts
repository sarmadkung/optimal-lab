// Idempotent steps. A "new subscription" workflow has four steps with side effects in
// other systems. Something fails partway, the workflow is retried, and we count what
// the outside world ended up with. The workflow, the failures, the retries and the
// systems' key handling really run.

export type StepId = "invoice" | "charge" | "email" | "crm";
export const STEPS: { id: StepId; label: string; system: string; keyed: string }[] = [
  { id: "invoice", label: "Create the invoice", system: "Billing", keyed: "external id on the invoice" },
  { id: "charge", label: "Charge the card", system: "Payments", keyed: "Idempotency-Key header" },
  { id: "email", label: "Send the welcome email", system: "Email", keyed: "check the sent log for this key" },
  { id: "crm", label: "Add the customer to the CRM", system: "CRM", keyed: "upsert on external id" },
];

export type Scenario = "timeout" | "crash" | "twice";
export const SCENARIOS: { id: Scenario; label: string; one: string }[] = [
  { id: "timeout", label: "Timeout after the charge", one: "The payment goes through, but the response is lost; the step looks failed." },
  { id: "crash", label: "Crash after the email", one: "The worker dies after sending the email and before recording that it did." },
  { id: "twice", label: "Trigger delivered twice", one: "The signup webhook arrives twice, starting two runs for one signup." },
];

export type Design = { resume: boolean; keys: boolean };

type World = Record<StepId, string[]>; // one entry per side effect actually performed

export function simulate(scenario: Scenario, d: Design) {
  const world: World = { invoice: [], charge: [], email: [], crm: [] };
  const usedKeys = new Set<string>();
  const log: string[] = [];
  const eventId = "evt_7c41";
  let runCounter = 0;

  // A system performs the side effect unless it has already seen this key.
  const call = (step: StepId, key: string | null) => {
    if (key && usedKeys.has(`${step}:${key}`)) {
      log.push(`${step}: key seen before, nothing new`);
      return;
    }
    if (key) usedKeys.add(`${step}:${key}`);
    world[step].push(key ?? `x${world[step].length}`);
    log.push(`${step}: done`);
  };

  const runOnce = (runId: string, from: number, failAt: { step: number; after: boolean } | null) => {
    for (let i = from; i < STEPS.length; i++) {
      const s = STEPS[i];
      const key = d.keys ? `${eventId}:${s.id}` : null; // keys come from the event, not from the run
      call(s.id, key);
      if (failAt && failAt.step === i) return i; // the side effect happened; the run did not record it
      log.push(`${runId}: checkpoint after ${s.id}`);
    }
    return null;
  };

  const start = () => `run_${++runCounter}`;
  if (scenario === "twice") {
    runOnce(start(), 0, null);
    runOnce(start(), 0, null);
  } else {
    const failStep = scenario === "timeout" ? 1 : 2;
    const id = start();
    const failed = runOnce(id, 0, { step: failStep, after: true });
    // retry: from the step that looked failed, or from the top
    if (failed !== null) runOnce(d.resume ? id : start(), d.resume ? failed : 0, null);
  }
  const counts = Object.fromEntries(STEPS.map((s) => [s.id, world[s.id].length])) as Record<StepId, number>;
  const extra = STEPS.reduce((n, s) => n + Math.max(0, counts[s.id] - 1), 0);
  return { counts, extra, log };
}

export function all(d: Design) {
  return SCENARIOS.map((s) => ({ s, ...simulate(s.id, d) }));
}
