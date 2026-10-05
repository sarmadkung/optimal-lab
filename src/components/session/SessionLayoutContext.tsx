"use client";

// Carries the layout chosen for this session (see src/lib/sessionLayout.ts) down to
// SessionLayout and FlowSequence, so a demo never decides its own screen shape.
// In development a small switcher lets you try the other two layouts on any session
// (or open the page with ?layout=stage|rail|scroll).

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { LAYOUT_LABEL, type LayoutMode } from "@/lib/sessionLayout";

type Value = { mode: LayoutMode; why: string };

const SessionLayoutContext = createContext<Value>({ mode: "scroll", why: "" });

export const useSessionLayout = () => useContext(SessionLayoutContext);

const MODES: LayoutMode[] = ["stage", "rail", "scroll"];
const DEV = process.env.NODE_ENV !== "production";

export function SessionLayoutProvider({ mode, why, children }: Value & { children: ReactNode }) {
  const [override, setOverride] = useState<LayoutMode | null>(null);

  useEffect(() => {
    if (!DEV) return;
    const asked = new URLSearchParams(window.location.search).get("layout");
    // Read once on mount: the URL is outside React, so this is syncing with it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (asked && (MODES as string[]).includes(asked)) setOverride(asked as LayoutMode);
  }, []);

  const value: Value = override && override !== mode ? { mode: override, why: "Preview only: picked in the layout switcher." } : { mode, why };

  return (
    <SessionLayoutContext.Provider value={value}>
      <div data-layout={value.mode}>{children}</div>
      {DEV && <LayoutSwitcher chosen={mode} why={why} current={value.mode} onPick={(m) => setOverride(m === mode ? null : m)} />}
    </SessionLayoutContext.Provider>
  );
}

function LayoutSwitcher({ chosen, why, current, onPick }: { chosen: LayoutMode; why: string; current: LayoutMode; onPick: (m: LayoutMode) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed right-3 bottom-3 z-50 max-w-[min(22rem,calc(100vw-1.5rem))] rounded-xl border border-[var(--line-strong)] bg-[var(--panel)] p-2 text-xs shadow-lg">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex min-h-9 w-full items-center gap-2 px-1 text-left" aria-expanded={open}>
        <span className="font-mono uppercase tracking-wider text-[var(--faint)]">Layout</span>
        <span className="font-medium text-[var(--text)]">{LAYOUT_LABEL[current]}</span>
        {current !== chosen && <span className="text-[var(--faint)]">(rule: {LAYOUT_LABEL[chosen]})</span>}
        <span className="ml-auto text-[var(--faint)]" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open && (
        <div className="mt-1 px-1 pb-1">
          <p className="text-[var(--muted)]">{why}</p>
          <div className="mt-2 flex gap-1">
            {MODES.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={m === current}
                onClick={() => onPick(m)}
                className="min-h-9 flex-1 rounded-md border px-2"
                style={{
                  borderColor: m === current ? "var(--accent)" : "var(--line)",
                  color: m === current ? "var(--text)" : "var(--muted)",
                }}
              >
                {LAYOUT_LABEL[m]}
                {m === chosen && " ✓"}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[var(--faint)]">Dev only. ✓ is what the rule picked.</p>
        </div>
      )}
    </div>
  );
}
