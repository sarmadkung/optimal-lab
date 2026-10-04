import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import SessionCard from "@/components/SessionCard";
import { RealWorldTools } from "@/components/session/RealWorldTools";
import { listRealWorldToolsForTrack } from "@/lib/realWorldTools";
import { TRACKS, firstLive, getTrack, sessionHref } from "@/lib/tracks";

export const dynamicParams = false;

export function generateStaticParams() {
  return TRACKS.map((t) => ({ track: t.id }));
}

export async function generateMetadata(props: PageProps<"/tracks/[track]">): Promise<Metadata> {
  const { track } = await props.params;
  const t = getTrack(track);
  return t ? { title: t.title, description: t.tagline } : {};
}

export default async function TrackPage(props: PageProps<"/tracks/[track]">) {
  const { track } = await props.params;
  const t = getTrack(track);
  if (!t) notFound();

  const live = t.sessions.filter((s) => s.status === "live");
  const soon = t.sessions.filter((s) => s.status === "soon");
  const start = firstLive(t);
  const hasTools = listRealWorldToolsForTrack(t.id, live).length > 0;

  return (
    <main
      className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12"
      style={{ "--accent": t.accent } as React.CSSProperties}
    >
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Tracks", href: "/tracks" },
          { label: t.short },
        ]}
      />
      <span className="mt-6 block h-1 w-12 rounded-full bg-[var(--accent)]" />
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{t.title}</h1>
      <p className="mt-3 max-w-2xl text-[var(--muted)]">{t.tagline}</p>
      {t.learningPathBlurb ? (
        <p className="mt-3 max-w-2xl text-sm text-[var(--muted)]">{t.learningPathBlurb}</p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {start ? (
          <Link
            href={sessionHref(t, start)}
            className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--on-accent)] transition-opacity hover:opacity-90"
          >
            Start: {start.title} →
          </Link>
        ) : (
          <span className="rounded-lg border border-dashed border-[var(--line-strong)] px-4 py-2.5 text-sm text-[var(--muted)]">
            First session coming soon
          </span>
        )}
        <span className="font-mono text-xs text-[var(--faint)]">
          {live.length} live · {soon.length} coming
        </span>
      </div>

      {/* section jump links */}
      <nav className="mt-8 flex flex-wrap gap-2 text-sm" aria-label="On this page">
        {[
          ["sessions", "Sessions"],
          ...(hasTools ? [["tools", "In production"] as const] : []),
          ["roadmap", "Roadmap"],
          ["projects", "Projects"],
        ].map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="rounded-full border border-[var(--line)] px-3 py-1 text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--text)]"
          >
            {label}
          </a>
        ))}
      </nav>

      <section id="sessions" className="mt-12 scroll-mt-20">
        <h2 className="text-xl font-semibold">Sessions</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Go in order. Each session is one idea you can drag, step and break.
        </p>
        {live.length === 0 && (
          <p className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 text-sm text-[var(--muted)]">
            The first sessions for this track are being built. Here is what is coming.
          </p>
        )}
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...live, ...soon].map((s) => (
            <li key={s.id}>
              <SessionCard track={t} session={s} />
            </li>
          ))}
        </ol>
      </section>

      {hasTools ? <RealWorldTools track={t} /> : null}

      <section id="roadmap" className="mt-14 scroll-mt-20">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Roadmap</h2>
          <ComingSoon />
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">
          A step-by-step path through the track, with sessions and practice at each stage.
        </p>
        <ol className="mt-5 space-y-3 border-l border-[var(--line)] pl-5">
          {t.roadmap.map((stage, i) => (
            <li key={stage} className="relative">
              <span className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full border border-[var(--accent)] bg-[var(--bg)]" />
              <span className="font-mono text-xs text-[var(--faint)]">Stage {i + 1}</span>
              <p className="text-[var(--text)]">{stage}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="projects" className="mt-14 scroll-mt-20">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Projects</h2>
          <ComingSoon />
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">Build something real to lock in the skill.</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {t.projects.map((p) => (
            <li key={p} className="rounded-xl border border-dashed border-[var(--line)] p-4 text-sm">
              {p}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function ComingSoon() {
  return (
    <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[11px] text-[var(--faint)]">
      Coming soon
    </span>
  );
}
