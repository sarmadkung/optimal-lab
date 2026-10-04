"use client";

import type { ReactNode } from "react";

type Props = {
  label: string;
  busy?: boolean;
  onRun: () => void;
  runLabel?: string;
  runningLabel?: string;
  accent: string;
  children?: ReactNode;
};

/** Sticky run strip for long step-flow sessions so Play stays reachable while scrolling. */
export function SessionControlBar({
  label,
  busy = false,
  onRun,
  runLabel = "Run through steps",
  runningLabel = "Running…",
  accent,
  children,
}: Props) {
  return (
    <div className="sticky top-14 z-30 -mx-4 border-b border-[var(--line)] bg-[var(--bg)]/90 px-4 py-3 backdrop-blur sm:top-[3.5rem] lg:top-20">
      <div className="flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 text-sm font-medium text-[var(--text)]">{label}</p>
        <button
          type="button"
          onClick={onRun}
          disabled={busy}
          className="min-h-11 shrink-0 rounded-md px-4 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-60"
          style={{ background: accent }}
        >
          {busy ? runningLabel : runLabel}
        </button>
        {children}
      </div>
    </div>
  );
}
