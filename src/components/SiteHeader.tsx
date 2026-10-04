"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { QuickSearchSlot } from "@/components/QuickSearch";
import ThemeToggle from "@/components/ThemeToggle";
import { TRACKS, liveCount, trackHref } from "@/lib/tracks";

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // a track is active on its own page and on every session page inside it
  const activeId = TRACKS.find((t) => pathname === trackHref(t) || pathname.startsWith(`${trackHref(t)}/`))?.id;
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--bg)]/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold" onClick={close}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" width={24} height={24} className="rounded-md" />
          Optimal Lab
        </Link>

        <nav
          className="hidden min-w-0 flex-1 items-center justify-end gap-0.5 overflow-x-auto md:flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Tracks"
        >
          {TRACKS.map((t) => {
            const active = t.id === activeId;
            return (
              <Link
                key={t.id}
                href={trackHref(t)}
                aria-current={active ? "page" : undefined}
                style={{ "--accent": t.accent } as React.CSSProperties}
                className={`shrink-0 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-[var(--panel)] text-[var(--accent)] shadow-[inset_0_0_0_1px_var(--line)]"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                {t.short}
              </Link>
            );
          })}
        </nav>

        <QuickSearchSlot />

        <ThemeToggle />

        <button
          type="button"
          className="flex h-11 items-center gap-2 rounded-lg border border-[var(--line)] px-3 text-sm text-[var(--muted)] md:hidden"
          aria-expanded={open}
          aria-controls="mobile-tracks"
          onClick={() => setOpen((o) => !o)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open && (
        <nav id="mobile-tracks" className="max-h-[70dvh] overflow-y-auto border-t border-[var(--line)] px-4 py-3 md:hidden" aria-label="Tracks">
          <Link
            href="/tracks"
            onClick={close}
            className="block rounded-lg px-2 py-2 text-xs uppercase tracking-[0.2em] text-[var(--faint)] hover:text-[var(--text)]"
          >
            All tracks
          </Link>
          {TRACKS.map((t) => {
            const live = liveCount(t);
            return (
              <Link
                key={t.id}
                href={trackHref(t)}
                onClick={close}
                aria-current={t.id === activeId ? "page" : undefined}
                style={{ "--accent": t.accent } as React.CSSProperties}
                className={`flex min-h-11 items-center gap-3 rounded-lg px-2 py-2.5 ${
                  t.id === activeId ? "bg-[var(--panel)] text-[var(--accent)]" : "text-[var(--text)]"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                <span className="flex-1">{t.title}</span>
                <span className="font-mono text-xs text-[var(--faint)]">{live > 0 ? `${live} live` : "soon"}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
