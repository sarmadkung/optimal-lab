import Link from "next/link";
import SessionCard from "@/components/SessionCard";
import { TRACKS, liveCount } from "@/lib/tracks";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">See how engineering works</h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          Interactive sessions for algorithms, Node.js, system design, DevOps and AI, shown by moving
          parts instead of static diagrams. Pick a track to start.
        </p>
      </section>

      {/* track picker */}
      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Tracks">
        {TRACKS.map((t) => {
          const live = liveCount(t);
          return (
            <Link
              key={t.id}
              href={`/tracks/${t.id}`}
              style={{ "--accent": t.accent } as React.CSSProperties}
              className="group rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 transition-colors hover:border-[var(--accent)]"
            >
              <span className="block h-1 w-10 rounded-full bg-[var(--accent)]" />
              <p className="mt-4 text-lg font-semibold">{t.title}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{t.tagline}</p>
              <p className="mt-4 font-mono text-xs text-[var(--faint)]">
                {live > 0 ? `${live} live · ` : ""}
                {t.sessions.length - live} coming
              </p>
            </Link>
          );
        })}
      </section>

      {/* one section per track */}
      {TRACKS.map((t) => (
        <section key={t.id} id={t.id} className="mt-14 scroll-mt-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p
                className="font-mono text-xs uppercase tracking-[0.2em]"
                style={{ color: t.accent }}
              >
                Track
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">{t.title}</h2>
            </div>
            <Link
              href={`/tracks/${t.id}`}
              className="shrink-0 text-sm text-[var(--muted)] hover:text-[var(--text)]"
            >
              View track →
            </Link>
          </div>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {t.sessions.slice(0, 3).map((s) => (
              <li key={s.title}>
                <SessionCard session={s} accent={t.accent} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
