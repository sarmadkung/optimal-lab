"use client";

import { openOnboarding } from "@/lib/onboarding";

export default function TourButton() {
  return (
    <button
      type="button"
      onClick={openOnboarding}
      className="mt-3 min-h-11 text-sm text-[var(--muted)] underline-offset-4 hover:text-[var(--text)] hover:underline"
    >
      Take the tour
    </button>
  );
}
