"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { TRACKS } from "@/lib/tracks";

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // a track is active on its own page, or on any of its session pages
  const activeId = TRACKS.find(
    (t) =>
      pathname === `/tracks/${t.id}` ||
      t.sessions.some((s) => s.slug && pathname === s.slug),
  )?.id;

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--bg)]/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-4 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold" onClick={() => setOpen(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" width={24} height={24} className="rounded-md" />
          Optimal Lab
        </Link>

        <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Tracks">
          {TRACKS.map((t) => {
            const active = t.id === activeId;
            return (
              <Link
                key={t.id}
                href={`/tracks/${t.id}`}
                style={{ "--accent": t.accent } as React.CSSProperties}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-[var(--panel)] text-[var(--accent)]"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                {t.short}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          className="ml-auto rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--muted)] md:hidden"
          aria-expanded={open}
          aria-controls="mobile-tracks"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Close" : "Tracks"}
        </button>
      </div>

      {open && (
        <nav id="mobile-tracks" className="border-t border-[var(--line)] px-4 py-2 md:hidden" aria-label="Tracks">
          {TRACKS.map((t) => (
            <Link
              key={t.id}
              href={`/tracks/${t.id}`}
              onClick={() => setOpen(false)}
              style={{ "--accent": t.accent } as React.CSSProperties}
              className={`flex items-center gap-3 rounded-lg px-2 py-2.5 ${
                t.id === activeId ? "text-[var(--accent)]" : "text-[var(--text)]"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
              {t.title}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
