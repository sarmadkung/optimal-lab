// One turn of the Node.js event loop after synchronous code finishes.
// Order when every callback is already ready: sync, nextTick, promises,
// timers, poll (I/O), check (setImmediate).

export type Job = "nextTick" | "promise" | "timeout" | "io" | "immediate";

export type PhaseId = "sync" | "nextTick" | "micro" | "timers" | "poll" | "check";

export const PHASES: { id: PhaseId; title: string; what: string }[] = [
  { id: "sync", title: "Run synchronous code", what: "The call stack runs to the end. Nothing queued can start yet." },
  { id: "nextTick", title: "Drain nextTick", what: "process.nextTick callbacks run before promises." },
  { id: "micro", title: "Drain promise reactions", what: "Then every Promise.then queued so far runs." },
  { id: "timers", title: "Timers phase", what: "Due setTimeout and setInterval callbacks run." },
  { id: "poll", title: "Poll for I/O", what: "Ready file and network callbacks run here." },
  { id: "check", title: "Check phase", what: "setImmediate callbacks run after the poll." },
];

export const JOBS: { id: Job; label: string; phase: PhaseId; line: string }[] = [
  { id: "nextTick", label: "process.nextTick", phase: "nextTick", line: "nextTick ran" },
  { id: "promise", label: "Promise.then", phase: "micro", line: "promise ran" },
  { id: "timeout", label: "setTimeout(0)", phase: "timers", line: "timeout ran" },
  { id: "io", label: "fs.readFile callback", phase: "poll", line: "file callback ran" },
  { id: "immediate", label: "setImmediate", phase: "check", line: "setImmediate ran" },
];

export type ScriptLine = { phase: PhaseId; line: string | null };

export function script(on: Record<Job, boolean>): ScriptLine[] {
  const line = (phase: PhaseId) => JOBS.find((j) => j.phase === phase && on[j.id])?.line ?? null;
  return [
    { phase: "sync", line: "start" },
    { phase: "sync", line: "end" },
    { phase: "nextTick", line: line("nextTick") },
    { phase: "micro", line: line("micro") },
    { phase: "timers", line: line("timers") },
    { phase: "poll", line: line("poll") },
    { phase: "check", line: line("check") },
  ];
}
