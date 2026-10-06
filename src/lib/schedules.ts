// A workflow on a schedule: `0 * * * *` fires at the top of every hour and posts a digest.
// The clock keeps firing even when the runner is down. What happens to those missed runs
// is a policy you choose, and every scheduler names it differently:
//   skip      Airflow catchup=False, Kubernetes CronJob past startingDeadlineSeconds
//   once      systemd timer Persistent=true: one run on recovery covers the gap
//   all       Airflow catchup=True (backfill): one run per missed slot

export const CRON = "0 * * * *";
export const START_HOUR = 8;
export const HOURS = 12; // 08:00 … 19:00

export type Policy = "skip" | "once" | "all";

export const POLICIES: { id: Policy; label: string; real: string }[] = [
  { id: "skip", label: "Skip missed runs", real: "Airflow catchup=False · CronJob startingDeadlineSeconds" },
  { id: "once", label: "Run once on recovery", real: "systemd Persistent=true · Temporal catchupWindow" },
  { id: "all", label: "Run every missed slot", real: "Airflow catchup=True (backfill)" },
];

export type Run = { slot: number; at: number; late: boolean };

export type HourFrame = {
  hour: number; // index 0..HOURS-1
  up: boolean;
  /** the clock fired for this slot */
  fired: boolean;
  /** runs that executed during this hour */
  runs: Run[];
  /** slots dropped for good by the policy */
  missed: number[];
  /** slots that fired while the runner was down, not yet decided */
  pending: number[];
  /** slots folded into one catch-up run (no run of their own, but their data is covered) */
  covered: number[];
  event: string;
};

export const label = (i: number) => `${String(START_HOUR + i).padStart(2, "0")}:00`;

export function simulate(downFrom: number, downFor: number, policy: Policy): HourFrame[] {
  const frames: HourFrame[] = [];
  let pending: number[] = []; // slots that fired while the runner was down
  const missed: number[] = [];
  const covered: number[] = [];
  for (let h = 0; h < HOURS; h++) {
    const up = !(h >= downFrom && h < downFrom + downFor);
    const runs: Run[] = [];
    let event: string;
    if (!up) {
      pending.push(h);
      event = `${label(h)}: the clock fires, but the runner is down. Nothing runs.`;
    } else {
      if (pending.length) {
        if (policy === "all") {
          runs.push(...pending.map((slot) => ({ slot, at: h, late: true })));
          event = `${label(h)}: runner is back. It backfills ${pending.length} missed ${pending.length === 1 ? "run" : "runs"}, then the on-time one.`;
        } else if (policy === "once") {
          runs.push({ slot: pending[pending.length - 1], at: h, late: true });
          covered.push(...pending);
          event = `${label(h)}: runner is back. One catch-up run covers the gap, then the on-time one.`;
        } else {
          missed.push(...pending);
          event = `${label(h)}: runner is back. ${pending.length} missed ${pending.length === 1 ? "run is" : "runs are"} dropped; only the on-time run happens.`;
        }
        pending = [];
      } else event = `${label(h)}: the clock fires and the digest runs on time.`;
      runs.push({ slot: h, at: h, late: false });
    }
    frames.push({ hour: h, up, fired: true, runs, missed: [...missed], pending: [...pending], covered: [...covered], event });
  }
  return frames;
}

export function totals(frames: HourFrame[]) {
  const runs = frames.flatMap((f) => f.runs);
  return { onTime: runs.filter((r) => !r.late).length, late: runs.filter((r) => r.late).length, missed: frames.at(-1)!.missed.length + frames.at(-1)!.pending.length, burst: Math.max(...frames.map((f) => f.runs.length)) };
}
