"use client";

// Small client pieces for progress: a toggle to mark something done, a check mark
// for lists, and an "x of n done" count. All read the same store in src/lib/progress.ts.

import { setDone, useProgress } from "@/lib/progress";

export function DoneToggle({ id, label = "Mark as done", doneLabel = "Done ✓" }: { id: string; label?: string; doneLabel?: string }) {
  const progress = useProgress();
  const done = progress.has(id);
  return (
    <button
      type="button"
      aria-pressed={done}
      onClick={() => setDone(id, !done)}
      className="min-h-11 rounded-md border px-4 text-sm font-medium transition-colors"
      style={
        done
          ? { borderColor: "var(--good)", background: "color-mix(in srgb, var(--good) 14%, transparent)", color: "var(--text)" }
          : { borderColor: "var(--line-strong)", color: "var(--muted)" }
      }
    >
      {done ? doneLabel : label}
    </button>
  );
}

export function DoneMark({ id }: { id: string }) {
  const done = useProgress().has(id);
  if (!done) return null;
  return (
    <span className="font-mono text-xs" style={{ color: "var(--good)" }} aria-label="done">
      ✓
    </span>
  );
}

export function DoneCount({ ids, noun = "done" }: { ids: string[]; noun?: string }) {
  const progress = useProgress();
  const done = ids.filter((id) => progress.has(id)).length;
  return (
    <span className="font-mono text-xs text-[var(--muted)]">
      {done} of {ids.length} {noun}
    </span>
  );
}
