"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export type HomeTab = {
  id: string; // also the URL hash, e.g. #projects
  label: string;
  count?: number;
  content: ReactNode;
};

export default function HomeTabs({ tabs, label }: { tabs: HomeTab[]; label: string }) {
  const [active, setActive] = useState(tabs[0].id);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const tabKey = tabs.map((t) => t.id).join("|");

  useEffect(() => {
    function applyHash() {
      const id = window.location.hash.replace("#", "");
      if (tabKey.split("|").includes(id)) setActive(id);
    }
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [tabKey]);

  function select(id: string) {
    setActive(id);
    history.replaceState(null, "", id === tabs[0].id ? window.location.pathname : `#${id}`);
  }

  function onKeyDown(e: KeyboardEvent, i: number) {
    const last = tabs.length - 1;
    const to =
      e.key === "ArrowRight" ? (i === last ? 0 : i + 1)
      : e.key === "ArrowLeft" ? (i === 0 ? last : i - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : -1;
    if (to < 0) return;
    e.preventDefault();
    select(tabs[to].id);
    buttons.current[to]?.focus();
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label={label}
        className="flex flex-wrap gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-1.5"
      >
        {tabs.map((t, i) => {
          const selected = t.id === active;
          return (
            <button
              key={t.id}
              ref={(el) => {
                buttons.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(t.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors sm:flex-none sm:px-4 ${
                selected
                  ? "bg-[var(--text)] text-[var(--bg)]"
                  : "text-[var(--muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
              }`}
            >
              {t.label}
              {t.count !== undefined && (
                <span
                  className={`rounded-full bg-[var(--bg)] px-1.5 font-mono text-[11px] ${
                    selected ? "text-[var(--text)]" : "text-[var(--faint)]"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tabs.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`panel-${t.id}`}
          aria-labelledby={`tab-${t.id}`}
          hidden={t.id !== active}
          tabIndex={0}
          className="mt-6 focus:outline-none"
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
