"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildSearchIndex, searchDocs, type SearchResult } from "@/lib/searchIndex";

const KIND_LABEL: Record<SearchResult["kind"], string> = {
  session: "Session",
  track: "Track",
  page: "Page",
  tool: "Tool",
};

export function QuickSearchSlot() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const index = useMemo(() => buildSearchIndex(), []);
  const results = useMemo(() => searchDocs(index, query), [index, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => inputRef.current?.focus());
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => setActive(0), [query]);

  const go = (href: string) => {
    close();
    if (href.startsWith("http")) window.open(href, "_blank", "noopener,noreferrer");
    else router.push(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] text-[var(--muted)] sm:hidden"
        aria-label="Search sessions and tools"
      >
        <SearchIcon />
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-11 w-[9.5rem] shrink-0 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--inset)] px-3 text-left text-sm text-[var(--muted)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)] sm:flex md:w-44 lg:w-52"
        aria-label="Search sessions and tools (⌘K)"
      >
        <SearchIcon />
        <span className="truncate">Search…</span>
        <kbd className="ml-auto hidden shrink-0 rounded border border-[var(--line)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--faint)] lg:inline">
          ⌘K
        </kbd>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[max(1rem,10dvh)] sm:p-6">
          <button type="button" aria-label="Close search" className="absolute inset-0 bg-black/50" onClick={close} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Quick search"
            className="relative flex max-h-[min(32rem,85dvh)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-xl"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                close();
                return;
              }
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => (results.length ? (i + 1) % results.length : 0));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
              }
              if (e.key === "Enter" && results[active]) {
                e.preventDefault();
                go(results[active].href);
              }
            }}
          >
            <div className="flex items-center gap-2 border-b border-[var(--line)] px-3 py-2">
              <SearchIcon />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Sessions, tracks, tools…"
                className="min-h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[var(--faint)] sm:text-sm"
                autoComplete="off"
                spellCheck={false}
              />
              <button type="button" onClick={close} className="shrink-0 rounded-md px-2 py-1 text-xs text-[var(--muted)] hover:text-[var(--text)]">
                Esc
              </button>
            </div>
            <ul className="overflow-y-auto p-2" role="listbox">
              {query.trim() === "" ? (
                <li className="px-3 py-6 text-center text-sm text-[var(--muted)]">
                  Type to search live sessions, tracks, and in-production tools.
                </li>
              ) : results.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-[var(--muted)]">No matches for &ldquo;{query}&rdquo;</li>
              ) : (
                results.map((item, i) => (
                  <li key={item.id} role="option" aria-selected={i === active}>
                    <ResultRow item={item} active={i === active} onPick={() => go(item.href)} onHover={() => setActive(i)} />
                  </li>
                ))
              )}
            </ul>
            <p className="border-t border-[var(--line)] px-3 py-2 text-[10px] text-[var(--faint)]">
              ↑↓ to move · Enter to open · external tools open in a new tab
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ResultRow({
  item,
  active,
  onPick,
  onHover,
}: {
  item: SearchResult;
  active: boolean;
  onPick: () => void;
  onHover: () => void;
}) {
  const external = item.href.startsWith("http");
  return (
    <button
      type="button"
      onClick={onPick}
      onMouseEnter={onHover}
      style={item.accent ? ({ "--accent": item.accent } as React.CSSProperties) : undefined}
      className={`flex w-full min-h-11 items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
        active ? "bg-[var(--inset)]" : "hover:bg-[var(--inset)]"
      }`}
    >
      <span
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.accent ? "bg-[var(--accent)]" : "bg-[var(--faint)]"}`}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-medium text-[var(--text)]">{item.title}</span>
          <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--faint)]">
            {KIND_LABEL[item.kind]}
            {item.live === false ? " · soon" : ""}
            {external ? " · ↗" : ""}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-sm text-[var(--muted)]">{item.subtitle}</span>
      </span>
    </button>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3-3" />
    </svg>
  );
}
