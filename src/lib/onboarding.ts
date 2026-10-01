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
let cached: Snap = CLOSED;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function read(): Snap {
  let open = replay;
  try {
    if (localStorage.getItem(ONBOARDING_KEY) !== ONBOARDING_DONE) open = true;
  } catch {
    // storage blocked: don't keep a tour on screen that can't be remembered as finished
    open = replay;
  }
  if (cached.open !== open || cached.step !== step) cached = { open, step };
  return cached;
}

export function subscribeOnboarding(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function getOnboardingSnapshot() {
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
  try {
    localStorage.setItem(ONBOARDING_KEY, ONBOARDING_DONE);
  } catch {
    // still close it for this page load
  }
  replay = false;
  step = 0;
  emit();
}

export function openOnboarding() {
  replay = true;
  step = 0;
  emit();
}
