"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { LIGHT_QUERY, THEME_KEY as KEY, type Theme } from "@/lib/theme";

const apply = (t: Theme) => document.documentElement.setAttribute("data-theme", t);

const current = (): Theme =>
  document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";

const preferred = (): Theme => {
  const saved = localStorage.getItem(KEY);
  if (saved === "light" || saved === "dark") return saved;
  return matchMedia(LIGHT_QUERY).matches ? "light" : "dark";
};

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  // follow the OS setting until the reader picks a theme themselves
  const media = matchMedia(LIGHT_QUERY);
  const onSystem = () => {
    if (!localStorage.getItem(KEY)) apply(preferred());
  };
  media.addEventListener("change", onSystem);

  return () => {
    observer.disconnect();
    media.removeEventListener("change", onSystem);
  };
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, current, () => null);

  // React's dev Strict Mode remount clears attributes on <html>; put the theme back
  useLayoutEffect(() => apply(preferred()), []);

  function toggle() {
    const next: Theme = current() === "dark" ? "light" : "dark";
    localStorage.setItem(KEY, next);
    apply(next);
  }

  const label = theme ? `Switch to ${theme === "dark" ? "light" : "dark"} mode` : "Switch colour theme";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-[var(--line)] text-[var(--muted)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)]"
    >
      {/* both icons are in the HTML; globals.css shows the one for the theme you would switch to */}
      <svg className="theme-icon-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
      <svg className="theme-icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    </button>
  );
}
