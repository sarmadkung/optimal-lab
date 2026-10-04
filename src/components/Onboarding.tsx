"use client";

import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  finishOnboarding,
  getOnboardingServerSnapshot,
  getOnboardingSnapshot,
  initOnboardingFromStorage,
  setOnboardingStep,
  subscribeOnboarding,
} from "@/lib/onboarding";
import { TRACKS, liveSessions, sessionHref } from "@/lib/tracks";

const STEPS = [
  {
    title: "See how engineering works",
    body: "Optimal Lab is a set of short sessions. You move the parts of an idea and watch what happens, instead of reading a static diagram.",
  },
  {
    title: "Start with a track",
    body: "A track is one subject. Open it and the sessions are listed in order.",
  },
  {
    title: "Play with a session",
    body: "Each session is one idea. Drag a slider, press Play or Step, and watch the numbers change.",
  },
  {
    title: "Pick light or dark",
    body: "The sun and moon button in the top bar switches the colours. This device remembers your choice.",
  },
  {
    title: "You are ready",
    body: "Home lists what is live right now. At the end of a session, Next takes you to the following one.",
  },
];

export default function Onboarding() {
  const { open, step } = useSyncExternalStore(subscribeOnboarding, getOnboardingSnapshot, getOnboardingServerSnapshot);
  const dialogRef = useRef<HTMLDivElement>(null);
  const start = liveSessions()[0];

  useEffect(() => {
    initOnboardingFromStorage();
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  const last = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <button type="button" aria-label="Skip the tour" className="absolute inset-0 bg-black/50" onClick={finishOnboarding} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === "Escape") finishOnboarding();
        }}
        className="relative flex max-h-[min(100dvh,40rem)] w-full flex-col overflow-y-auto rounded-t-2xl border border-[var(--line)] bg-[var(--panel)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl outline-none sm:max-w-md sm:rounded-2xl sm:p-6"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-xs text-[var(--faint)]">
            {step + 1} of {STEPS.length}
          </p>
          <button type="button" onClick={finishOnboarding} className="min-h-11 px-2 text-sm text-[var(--muted)] hover:text-[var(--text)]">
            Skip
          </button>
        </div>

        <div className="mt-2 flex gap-1.5" aria-hidden>
          {STEPS.map((s, i) => (
            <span
              key={s.title}
              className={`h-1 flex-1 rounded-full ${i <= step ? "bg-[var(--text)]" : "bg-[var(--line)]"}`}
            />
          ))}
        </div>

        <h2 id="onboarding-title" className="mt-5 text-2xl font-semibold tracking-tight">
          {current.title}
        </h2>
        <p className="mt-2 text-[var(--muted)]">{current.body}</p>

        {step === 1 && (
          <div className="mt-5">
            <TrackList />
          </div>
        )}
        {step === 2 && (
          <div className="mt-5">
            <PlayHints />
          </div>
        )}
        {step === 3 && (
          <div className="mt-5">
            <ThemeHint />
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setOnboardingStep(step - 1)}
              className="min-h-11 rounded-lg border border-[var(--line-strong)] px-4 text-sm"
            >
              Back
            </button>
          )}
          {last && start ? (
            <Link
              href={sessionHref(start.track, start.session)}
              onClick={finishOnboarding}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--text)] px-4 text-sm font-semibold text-[var(--bg)]"
            >
              Start with {start.session.title}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => (last ? finishOnboarding() : setOnboardingStep(step + 1))}
              className="min-h-11 rounded-lg bg-[var(--text)] px-4 text-sm font-semibold text-[var(--bg)]"
            >
              {last ? "Got it" : "Next"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TrackList() {
  return (
    <ul className="flex flex-wrap gap-2">
      {TRACKS.map((t) => (
        <li
          key={t.id}
          style={{ "--accent": t.accent } as React.CSSProperties}
          className="flex items-center gap-2 rounded-full border border-[var(--line)] px-3 py-1.5 text-sm"
        >
          <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
          {t.short}
        </li>
      ))}
    </ul>
  );
}

function PlayHints() {
  return (
    <ul className="grid grid-cols-3 gap-2 text-center text-sm">
      {["Drag", "Step", "Watch"].map((label) => (
        <li key={label} className="rounded-xl border border-[var(--line)] bg-[var(--inset)] px-2 py-3 font-medium">
          {label}
        </li>
      ))}
    </ul>
  );
}

function ThemeHint() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--inset)] px-4 py-3 text-sm">
      <span className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--line)]" aria-hidden>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2" />
        </svg>
      </span>
      <span className="text-[var(--muted)]">Look for this button at the top right.</span>
    </div>
  );
}
