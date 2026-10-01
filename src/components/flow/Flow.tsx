"use client";

// Building blocks for "how does X work" visuals: a vertical pipeline of steps,
// top to bottom, with an arrow between each step saying what gets passed down.
// See "Explaining a process: the step flow" in README.md.
// Colours are CSS transitions on theme tokens (not Motion), so they follow light/dark mode.

import { motion } from "motion/react";
import type { ReactNode } from "react";

type StepProps = {
  n: number; // 1-based step number
  title: string;
  what: string; // one plain sentence: what happens in this step
  active?: boolean; // highlighted while an animated run passes through
  accent?: string; // CSS colour, defaults to the AI accent
  children?: ReactNode;
};

export function FlowStep({ n, title, what, active = false, accent = "var(--ai)", children }: StepProps) {
  return (
    <section
      aria-current={active ? "step" : undefined}
      className="relative rounded-xl border bg-[var(--panel)] p-4 transition-[border-color,box-shadow] duration-200 sm:p-5"
      style={{
        borderColor: active ? accent : "var(--line)",
        boxShadow: active ? `0 0 0 3px color-mix(in srgb, ${accent} 18%, transparent)` : "none",
      }}
    >
      <header className="flex items-start gap-3">
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full border font-mono text-xs transition-colors duration-200"
          style={{
            borderColor: active ? accent : "var(--line-strong)",
            color: active ? "var(--on-accent)" : "var(--muted)",
            backgroundColor: active ? accent : "transparent",
          }}
        >
          {n}
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold leading-7">{title}</h2>
          <p className="text-sm text-[var(--muted)]">{what}</p>
        </div>
      </header>
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}

// The connector between two steps. `label` names what flows down, e.g. "5 raw scores".
export function FlowArrow({ label, active = false, accent = "var(--ai)" }: { label?: string; active?: boolean; accent?: string }) {
  const stroke = { stroke: active ? accent : "var(--line-strong)", transition: "stroke 0.2s" };
  return (
    <div className="flex items-center gap-3 py-1 pl-[13px] sm:pl-[17px]" aria-hidden>
      <svg width="14" height="40" viewBox="0 0 14 40" className="shrink-0 overflow-visible">
        <line x1="7" y1="0" x2="7" y2="32" strokeWidth="2" strokeLinecap="round" style={stroke} />
        <path d="M1 28 L7 36 L13 28" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={stroke} />
        {active && (
          <motion.circle
            cx="7" r="3.5" style={{ fill: accent }}
            initial={{ cy: 0, opacity: 1 }}
            animate={{ cy: 34, opacity: [1, 1, 0] }}
            transition={{ duration: 0.35, ease: "easeIn" }}
          />
        )}
      </svg>
      {label && <span className="font-mono text-xs text-[var(--faint)]">{label}</span>}
    </div>
  );
}
