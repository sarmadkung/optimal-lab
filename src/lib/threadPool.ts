// The libuv thread pool behind Node.js. JavaScript runs on one main thread. Network I/O
// is handed to the operating system (epoll, kqueue, IOCP) and needs no pool thread. File
// system calls, crypto (pbkdf2, scrypt), zlib and dns.lookup run on a small pool of
// worker threads: 4 by default, set with UV_THREADPOOL_SIZE. When every thread is busy,
// the rest wait in a queue, even a quick file read stuck behind slow crypto.

export type TaskKind = "crypto" | "fs" | "dns" | "net";

export const KINDS: Record<TaskKind, { label: string; call: string; ticks: number; pool: boolean }> = {
  crypto: { label: "crypto.pbkdf2", call: "hash a password", ticks: 4, pool: true },
  fs: { label: "fs.readFile", call: "read a file", ticks: 1, pool: true },
  dns: { label: "dns.lookup", call: "resolve a hostname", ticks: 2, pool: true },
  net: { label: "http.get", call: "fetch a URL", ticks: 2, pool: false },
};

export type Task = { id: string; kind: TaskKind };

export const SCENARIOS: { id: string; label: string; tasks: Task[] }[] = [
  {
    id: "crypto-burst",
    label: "6 password hashes, then a file read",
    tasks: [
      ...Array.from({ length: 6 }, (_, i) => ({ id: `hash ${i + 1}`, kind: "crypto" as const })),
      { id: "read", kind: "fs" },
    ],
  },
  {
    id: "mixed",
    label: "Hashes, files and fetches",
    tasks: [
      { id: "hash 1", kind: "crypto" },
      { id: "fetch 1", kind: "net" },
      { id: "hash 2", kind: "crypto" },
      { id: "read 1", kind: "fs" },
      { id: "fetch 2", kind: "net" },
      { id: "lookup", kind: "dns" },
      { id: "read 2", kind: "fs" },
    ],
  },
];

export type Run = { task: Task; lane: string; start: number; end: number; waited: number };

export type PoolResult = {
  runs: Run[];
  lanes: string[];
  total: number;
};

/** Every task is submitted at tick 0, in order. Pool tasks take the first free thread. */
export function simulate(tasks: Task[], size: number): PoolResult {
  const free = Array.from({ length: size }, () => 0); // tick each thread becomes free
  const runs: Run[] = [];
  for (const task of tasks) {
    const k = KINDS[task.kind];
    if (!k.pool) {
      runs.push({ task, lane: "OS", start: 0, end: k.ticks, waited: 0 });
      continue;
    }
    let t = 0;
    for (let i = 1; i < size; i++) if (free[i] < free[t]) t = i;
    const start = free[t];
    free[t] = start + k.ticks;
    runs.push({ task, lane: `Thread ${t + 1}`, start, end: start + k.ticks, waited: start });
  }
  const lanes = [...Array.from({ length: size }, (_, i) => `Thread ${i + 1}`), ...(runs.some((r) => r.lane === "OS") ? ["OS"] : [])];
  return { runs, lanes, total: Math.max(0, ...runs.map((r) => r.end)) };
}

/** What each part is doing at one tick. */
export function at(result: PoolResult, tick: number) {
  const running = result.runs.filter((r) => r.start <= tick && tick < r.end);
  const queued = result.runs.filter((r) => r.lane !== "OS" && r.start > tick);
  const done = result.runs.filter((r) => r.end <= tick);
  const justDone = result.runs.filter((r) => r.end === tick);
  return { running, queued, done, justDone };
}
