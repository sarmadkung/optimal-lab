import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import SessionCard from "@/components/SessionCard";
import { TRACKS, liveCount, trackHref } from "@/lib/tracks";

export const metadata: Metadata = {
  title: "All tracks",
  description: "Every Optimal Lab track and its interactive sessions, from DSA and DevOps to AI native, automation, and tools.",
};

export default function TracksPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "All tracks" }]} />
      <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">All tracks</h1>
      <p className="mt-3 max-w-2xl text-[var(--muted)]">
        Each track is one subject. Open a session marked <span className="text-[var(--good)]">Live</span>{" "}
        to start; the rest are on the way.
      </p>

      {/* jump to a track */}
      <nav className="mt-6 flex flex-wrap gap-2 text-sm" aria-label="Jump to a track">
        {TRACKS.map((t) => (
          <a
            key={t.id}
            href={`#${t.id}`}
            style={{ "--accent": t.accent } as React.CSSProperties}
            className="flex items-center gap-2 rounded-full border border-[var(--line)] px-3 py-1 text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--text)]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            {t.short}
          </a>
        ))}
      </nav>

      {TRACKS.map((t) => {
        const live = liveCount(t);
        return (
          <section
            key={t.id}
            id={t.id}
            className="mt-12 scroll-mt-20"
            style={{ "--accent": t.accent } as React.CSSProperties}
          >
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
              <div>
                <span className="block h-1 w-10 rounded-full bg-[var(--accent)]" />
                <h2 className="mt-3 text-2xl font-semibold tracking-tight">{t.title}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {t.tagline}{" "}
                  <span className="font-mono text-xs text-[var(--faint)]">
                    {live} live · {t.sessions.length - live} coming
                  </span>
                </p>
              </div>
              <Link href={trackHref(t)} className="shrink-0 text-sm text-[var(--accent)] hover:underline">
                Roadmap and projects →
              </Link>
            </div>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {t.sessions.map((s) => (
                <li key={s.id}>
                  <SessionCard track={t} session={s} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
