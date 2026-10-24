// Zapier and Make. One automation: a new shop order looks up the customer in the CRM,
// updates stock for each line item, tells Slack about VIP orders and emails a
// confirmation. No-code platforms bill by steps run (Zapier "tasks", Make "operations"),
// n8n by workflow executions. The counting rules, polling cost and delays run here;
// plan allowances are illustrative.

export type Trigger = "poll15" | "poll1" | "webhook";
export type Design = { orders: number; items: number; trigger: Trigger; batchItems: boolean };
export const FIRST: Design = { orders: 3000, items: 4, trigger: "poll15", batchItems: false };
export const FIXED: Design = { orders: 3000, items: 4, trigger: "webhook", batchItems: true };
export const ORDER_OPTIONS = [300, 3000, 30000];
export const VIP_SHARE = 0.2;
export const CHECKS_PER_MONTH: Record<Trigger, number> = { poll15: 4 * 24 * 30, poll1: 60 * 24 * 30, webhook: 0 };
export const AVG_DELAY_MIN: Record<Trigger, number> = { poll15: 7.5, poll1: 0.5, webhook: 0.05 };
export const ALLOWANCE = { zapier: 2000, make: 10000, n8n: 2500 }; // an entry paid plan each, illustrative

export function count(d: Design) {
  const itemSteps = d.batchItems ? 1 : d.items;
  // Zapier: every action step that runs is a task; the trigger and filters are free
  const zapPerRun = 1 + itemSteps + VIP_SHARE + 1;
  // Make: every module that runs is an operation (trigger, lookup, iterator, router, …),
  // and a polling trigger spends one each time it checks, even when nothing is new
  const makePerRun = 1 + 1 + (d.batchItems ? 0 : 1) + itemSteps + 1 + VIP_SHARE + 1;
  const zapier = Math.round(d.orders * zapPerRun);
  const make = Math.round(d.orders * makePerRun + CHECKS_PER_MONTH[d.trigger]);
  const n8n = d.orders; // one execution per run, however many steps
  return {
    zapPerRun,
    makePerRun,
    zapier,
    make,
    n8n,
    over: { zapier: zapier / ALLOWANCE.zapier, make: make / ALLOWANCE.make, n8n: n8n / ALLOWANCE.n8n },
    delayMin: AVG_DELAY_MIN[d.trigger],
    pollingOps: CHECKS_PER_MONTH[d.trigger],
  };
}

// where no-code runs out: each yes is a reason to move this workflow to code
export const LIMITS = [
  { id: "money", q: "Does a partial run cost money (charged but not recorded)?", why: "No transactions: a failure mid-run leaves earlier steps done. Code can use idempotency keys and compensations." },
  { id: "volume", q: "Thousands of runs a day, or loops over many items?", why: "Billing per step grows with runs × steps × items." },
  { id: "wait", q: "Does it wait days for something?", why: "Long waits and timers are what durable workflow engines are built for." },
  { id: "test", q: "Do changes need review and tests before they go live?", why: "Visual editors change production directly; code goes through pull requests and CI." },
  { id: "logic", q: "Is most of it custom logic in code steps?", why: "Code steps have tight time and memory limits and no shared modules." },
];
