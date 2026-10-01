"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Walks a step flow from the top, one card at a time. Cancelled on unmount.
export function useWalk(steps: number, ms = 420) {
  const [stage, setStage] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const cancel = useRef(false);

  useEffect(() => {
    return () => {
      cancel.current = true;
    };
  }, []);

  async function run() {
    if (busy) return;
    setBusy(true);
    for (let s = 0; s < steps; s++) {
      if (cancel.current) return;
      setStage(s);
      await wait(ms);
    }
    if (cancel.current) return;
    await wait(220);
    setStage(null);
    setBusy(false);
  }

  return { stage, busy, run, setStage, setBusy };
}

export function RunButton({
  busy,
  onClick,
  accent,
  children,
  running = "Running…",
}: {
  busy: boolean;
  onClick: () => void;
  accent: string;
  children: string;
  running?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="min-h-11 rounded-md px-4 py-2 text-sm font-semibold text-[var(--on-accent)] transition-opacity disabled:opacity-50"
      style={{ background: accent }}
    >
      {busy ? running : children}
    </button>
  );
}

export function Slider({
  label,
  hint,
  value,
  min,
  max,
  step,
  format,
  onChange,
  accent,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  accent: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        <span className="font-mono text-sm tabular-nums" style={{ color: accent }}>
          {format(value)}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-11 w-full"
        style={{ accentColor: accent }}
      />
      {hint && <span className="block text-xs text-[var(--faint)]">{hint}</span>}
    </label>
  );
}

export function Choices<T extends string>({
  label,
  value,
  options,
  onChange,
  accent,
}: {
  label?: string;
  value: T | null;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
  accent: string;
}) {
  return (
    <div>
      {label && <p className="mb-2 text-sm font-medium">{label}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = o.id === value;
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.id)}
              className="min-h-11 rounded-md border px-3 py-2 text-sm transition-colors"
              style={
                active
                  ? { borderColor: accent, background: `color-mix(in srgb, ${accent} 16%, transparent)`, color: "var(--text)" }
                  : { borderColor: "var(--line)", color: "var(--muted)" }
              }
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Meter({ value, max, color }: { value: number; max: number; color: string }) {
  const width = max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-3 overflow-hidden rounded bg-[var(--track)]">
      <div className="h-full rounded transition-[width] duration-300" style={{ width: `${width}%`, background: color }} />
    </div>
  );
}

export function SessionIntro({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)]">{kicker}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      <div className="mt-3 text-[var(--muted)]">{children}</div>
    </>
  );
}
