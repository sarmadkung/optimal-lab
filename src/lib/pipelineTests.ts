// A month of CI for one repository: 400 pushes, 80 merges, 30 nights. Where each test
// stage runs (every push, before merge, nightly, never) and in what order decides how fast
// a developer hears back, how many CI minutes the month costs, and where each kind of
// defect is caught. Stage durations, defect counts and flake rates are illustrative.

export type When = "push" | "merge" | "nightly" | "off";
export type Order = "failFast" | "parallel";
export type StageId = "lint" | "unit" | "integration" | "e2e" | "load";
export type Design = { order: Order; integration: When; e2e: When; shards: 1 | 4; load: When; quarantine: boolean };

export const FIRST: Design = { order: "parallel", integration: "push", e2e: "push", shards: 1, load: "push", quarantine: false };
export const FIXED: Design = { order: "failFast", integration: "push", e2e: "merge", shards: 4, load: "nightly", quarantine: true };

export const PUSHES = 400;
export const MERGES = 80;
export const NIGHTS = 30;
export const FLAKE = 0.03; // chance a full e2e run fails for no reason
export const FLAKE_QUARANTINED = 0.003;

export const STAGES: { id: StageId; label: string; minutes: number; what: string }[] = [
  { id: "lint", label: "Lint + types", minutes: 1, what: "style, types, obvious mistakes" },
  { id: "unit", label: "Unit tests", minutes: 4, what: "1,200 tests of single functions" },
  { id: "integration", label: "Integration", minutes: 9, what: "the app against a real Postgres" },
  { id: "e2e", label: "End-to-end", minutes: 24, what: "a browser clicking through 40 flows" },
  { id: "load", label: "Load test", minutes: 35, what: "10 minutes at twice peak traffic" },
];

export type DefectId = "clean" | "type" | "logic" | "sql" | "flow" | "perf";
export const DEFECTS: { id: DefectId; label: string; stage: StageId | null; perMonth: number }[] = [
  { id: "clean", label: "A clean commit", stage: null, perMonth: 0 },
  { id: "type", label: "A type error", stage: "lint", perMonth: 30 },
  { id: "logic", label: "A logic bug", stage: "unit", perMonth: 20 },
  { id: "sql", label: "A wrong SQL join", stage: "integration", perMonth: 8 },
  { id: "flow", label: "A broken checkout flow", stage: "e2e", perMonth: 5 },
  { id: "perf", label: "A query 10× slower", stage: "load", perMonth: 2 },
];

export function when(d: Design, s: StageId): When {
  if (s === "lint" || s === "unit") return "push";
  return d[s];
}
export function minutes(d: Design, s: StageId) {
  const m = STAGES.find((x) => x.id === s)!.minutes;
  return s === "e2e" ? Math.ceil(m / d.shards) + (d.shards > 1 ? 2 : 0) : m; // shards pay a little setup each
}
const machineMinutes = (d: Design, s: StageId) => (s === "e2e" ? minutes(d, s) * d.shards : minutes(d, s));

// The stages that run at one trigger, in pipeline order.
export function stagesAt(d: Design, trigger: When) {
  return STAGES.filter((s) => when(d, s.id) === trigger).map((s) => s.id);
}

// How long until a push gets its verdict, and which stages ran.
export function pushRun(d: Design, failing: StageId | null) {
  const ids = stagesAt(d, "push");
  if (d.order === "parallel") {
    const ran = ids;
    const wait = failing && ids.includes(failing) ? minutes(d, failing) : Math.max(...ids.map((s) => minutes(d, s)));
    return { ran, wait, verdictAt: failing && ids.includes(failing) ? failing : null };
  }
  const ran: StageId[] = [];
  let wait = 0;
  for (const s of ids) {
    ran.push(s);
    wait += minutes(d, s);
    if (s === failing) return { ran, wait, verdictAt: s };
  }
  return { ran, wait, verdictAt: null };
}

export function caughtWhere(d: Design, defect: DefectId) {
  const def = DEFECTS.find((x) => x.id === defect)!;
  if (!def.stage) return { where: "nothing to catch", good: true, when: null as When | null };
  const w = when(d, def.stage);
  const text: Record<When, string> = {
    push: `on the push, in ${pushRun(d, def.stage).wait} min`,
    merge: "before merge, in the merge check",
    nightly: "the next morning, after it is already on main",
    off: "in production",
  };
  return { where: text[w], good: w === "push" || w === "merge", when: w };
}

export function month(d: Design) {
  // A push that fails early in a fail-fast pipeline skips the later stages.
  const failingPushes = DEFECTS.filter((x) => x.stage && when(d, x.stage) === "push");
  let ci = 0;
  for (const s of stagesAt(d, "push")) {
    let runs = PUSHES;
    if (d.order === "failFast") {
      const idx = stagesAt(d, "push").indexOf(s);
      const stoppedBefore = failingPushes.filter((f) => stagesAt(d, "push").indexOf(f.stage!) < idx).reduce((a, f) => a + f.perMonth, 0);
      runs -= stoppedBefore;
    }
    ci += runs * machineMinutes(d, s);
  }
  for (const s of stagesAt(d, "merge")) ci += MERGES * machineMinutes(d, s);
  for (const s of stagesAt(d, "nightly")) ci += NIGHTS * machineMinutes(d, s);
  const e2eRuns = when(d, "e2e") === "push" ? PUSHES : when(d, "e2e") === "merge" ? MERGES : when(d, "e2e") === "nightly" ? NIGHTS : 0;
  const flaky = Math.round(e2eRuns * (d.quarantine ? FLAKE_QUARANTINED : FLAKE));
  const caught = DEFECTS.filter((x) => x.stage).map((x) => ({ defect: x, ...caughtWhere(d, x.id) }));
  return {
    ci,
    clean: pushRun(d, null).wait,
    flaky,
    caught,
    escaped: caught.filter((c) => !c.good).reduce((a, c) => a + c.defect.perMonth, 0),
  };
}
