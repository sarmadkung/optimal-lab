// First-visit tour. There is no account or database, so "already seen" lives in
// localStorage on this device. Skip and finish both count as done.
//
// The snapshot is cached because useSyncExternalStore bails out only when
// getSnapshot returns the same reference.

export const ONBOARDING_KEY = "onboarding";
export const ONBOARDING_DONE = "done";

type Snap = { open: boolean; step: number };

const CLOSED: Snap = { open: false, step: 0 };

let step = 0;
let replay = false;
/** Set true once the client has read localStorage (avoids SSR / first-paint reopen). */
let storageReady = false;
let finished = true;
let cached: Snap = CLOSED;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function syncFromStorage() {
  if (typeof window === "undefined") return;
  try {
    finished = localStorage.getItem(ONBOARDING_KEY) === ONBOARDING_DONE;
  } catch {
    finished = true;
  }
  storageReady = true;
}

function read(): Snap {
  if (typeof window === "undefined") return CLOSED;
  if (!storageReady) syncFromStorage();

  const open = replay || !finished;
  if (cached.open !== open || cached.step !== step) cached = { open, step };
  return cached;
}

export function subscribeOnboarding(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function getOnboardingSnapshot() {
  if (typeof window === "undefined") return CLOSED;
  return read();
}

export function getOnboardingServerSnapshot() {
  return CLOSED;
}

export function setOnboardingStep(next: number) {
  step = next;
  emit();
}

export function finishOnboarding() {
  replay = false;
  step = 0;
  finished = true;
  cached = CLOSED;
  try {
    localStorage.setItem(ONBOARDING_KEY, ONBOARDING_DONE);
  } catch {
    // still closed for this visit
  }
  emit();
}

export function openOnboarding() {
  replay = true;
  step = 0;
  emit();
}

/** Call once on the client so the tour can open after we know localStorage state. */
export function initOnboardingFromStorage() {
  syncFromStorage();
  emit();
}
