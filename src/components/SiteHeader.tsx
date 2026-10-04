"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { QuickSearchSlot } from "@/components/QuickSearch";
import ThemeToggle from "@/components/ThemeToggle";

const SITE_LINKS = [
  { href: "/", label: "Home", match: (path: string) => path === "/" },
  {
    href: "/tracks",
    label: "All tracks",
    match: (path: string) => path === "/tracks" || path.startsWith("/tracks/"),
  },
] as const;

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--bg)]/85 backdrop-blur">
      <div className="mx-auto flex min-h-14 w-full max-w-5xl items-center gap-3 px-4 py-1.5">
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2.5" onClick={close}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" width={24} height={24} className="shrink-0 rounded-md" />
          <span className="min-w-0 leading-tight">
            <span className="block font-semibold">Optimal Lab</span>
            <span className="hidden truncate text-xs font-normal text-[var(--muted)] sm:block">
              See how engineering works
            </span>
          </span>
        </Link>

        <nav className="hidden shrink-0 items-center gap-0.5 md:flex" aria-label="Site">
          {SITE_LINKS.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-[var(--panel)] text-[var(--text)] shadow-[inset_0_0_0_1px_var(--line)]"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <QuickSearchSlot />
          <ThemeToggle />

          <button
            type="button"
            className="flex h-11 items-center gap-2 rounded-lg border border-[var(--line)] px-3 text-sm text-[var(--muted)] md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((o) => !o)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" className="border-t border-[var(--line)] px-4 py-3 md:hidden" aria-label="Site">
          {SITE_LINKS.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center rounded-lg px-2 py-2.5 text-sm ${
                  active ? "bg-[var(--panel)] font-medium text-[var(--text)]" : "text-[var(--text)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
