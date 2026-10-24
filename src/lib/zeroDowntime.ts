// One release that renames a column (users.name → full_name) and, unknown to anyone, fails
// 2% of checkouts. Failed requests are computed from traffic, rollout timing, lock times and
// how fast the bug is caught and rolled back. Traffic and timings are illustrative.

export type Design = { expand: boolean; batched: boolean; canary: boolean; rollbackPlan: boolean; contractLater: boolean };
export const FIRST: Design = { expand: false, batched: false, canary: false, rollbackPlan: false, contractLater: false };
export const FIXED: Design = { expand: true, batched: true, canary: true, rollbackPlan: true, contractLater: true };

export const RPM = 600; // requests a minute
export const WRITES_PM = 100; // writes to users a minute
export const ROLLOUT_MIN = 12; // 6 pods, 2 minutes each
export const LOCK_MIN = 6; // one UPDATE over 20M rows
export const BUG_RATE = 0.02;
export const DETECT_FULL_MIN = 10; // an alert fires after errors build up across all traffic
export const CANARY = { share: 0.1, analyseMin: 5 };
export const FIX_FORWARD_MIN = 35;

export type Line = { label: string; failed: number; note: string };

export function release(d: Design) {
  const lines: Line[] = [];
  // 1. The schema change.
  if (!d.expand) lines.push({ label: "Rename in one migration", failed: Math.round(RPM * ROLLOUT_MIN * 0.5), note: "the column is renamed before the rollout; old pods still query users.name and fail until they're replaced" });
  else lines.push({ label: "Expand: add full_name, write both", failed: 0, note: "old and new code both work against the expanded schema" });
  // 2. The backfill.
  if (d.expand) lines.push(d.batched ? { label: "Backfill in batches of 5,000", failed: 0, note: "short transactions; writes never wait" } : { label: "Backfill with one UPDATE", failed: LOCK_MIN * WRITES_PM, note: `${LOCK_MIN} minutes of locked rows: sign-ups and profile edits time out` });
  // 3. The bug: caught by a canary, or by an alert after everyone has it.
  let exposure: number;
  let detectNote: string;
  if (d.canary) {
    exposure = CANARY.share * CANARY.analyseMin;
    detectNote = `${CANARY.share * 100}% of traffic for ${CANARY.analyseMin} minutes; the error rate is compared with the stable pods and the canary is pulled automatically`;
  } else {
    exposure = ROLLOUT_MIN * 0.5 + DETECT_FULL_MIN;
    detectNote = `the rollout reaches every pod in ${ROLLOUT_MIN} minutes; an alert fires ${DETECT_FULL_MIN} minutes later`;
  }
  // 4. Getting back: roll back if the old version still works with the schema, else fix forward.
  const canRollBack = d.rollbackPlan && d.expand && d.contractLater;
  let backMin: number;
  let backNote: string;
  if (d.canary) {
    backMin = 0;
    backNote = "nothing to roll back beyond the canary";
  } else if (canRollBack) {
    backMin = ROLLOUT_MIN * 0.5;
    backNote = "roll back to the previous image; it still works with the expanded schema";
  } else {
    backMin = FIX_FORWARD_MIN;
    backNote = !d.expand || !d.contractLater ? "the old version reads a column that no longer exists, so there's no rollback: fix forward under pressure" : "no tested rollback; the team fixes forward";
  }
  lines.push({ label: "The checkout bug", failed: Math.round((exposure + backMin) * RPM * BUG_RATE), note: `${detectNote}; ${backNote}` });
  // 5. Contract.
  if (!d.expand) lines.push({ label: "No contract step", failed: 0, note: "the rename removed users.name the moment it ran; the old version can never run again" });
  else lines.push(d.contractLater ? { label: "Contract a week later", failed: 0, note: "drop users.name once nothing has read it for a week" } : { label: "Drop users.name the same day", failed: 0, note: "the old version can never run again" });
  const failed = lines.reduce((a, l) => a + l.failed, 0);
  return { lines, failed, canRollBack, ok: failed < 20 };
}

export function migrations(d: Design) {
  if (!d.expand) return ["ALTER TABLE users RENAME COLUMN name TO full_name;"];
  return [
    "ALTER TABLE users ADD COLUMN full_name text;           -- expand",
    d.batched ? "UPDATE users SET full_name = name WHERE id BETWEEN $1 AND $2;  -- in batches" : "UPDATE users SET full_name = name;                    -- all 20M rows at once",
    "-- deploy: read full_name, write both columns",
    d.contractLater ? "-- a week later: ALTER TABLE users DROP COLUMN name;" : "ALTER TABLE users DROP COLUMN name;                -- same day",
  ];
}
