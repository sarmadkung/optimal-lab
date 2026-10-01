import Link from "next/link";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import SessionCard from "@/components/SessionCard";
import TrackCard from "@/components/TrackCard";
import { TRACKS, liveSessions, sessionHref } from "@/lib/tracks";

export default function Home() {
  const live = liveSessions();
  const start = live[0];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">See how engineering works</h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          Short interactive sessions on algorithms, Node.js, system design, DevOps, AI, and the
          tools that ship them. Instead of reading a diagram, you move the parts yourself and watch
          what happens.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {start && (
            <Link
              href={sessionHref(start.track, start.session)}
              style={{ "--accent": start.track.accent } as React.CSSProperties}
              className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--on-accent)] transition-opacity hover:opacity-90"
            >
              Start with “{start.session.title}”
            </Link>
          )}
          <Link
            href="/tracks"
            className="rounded-lg border border-[var(--line-strong)] px-4 py-2.5 text-sm transition-colors hover:border-[var(--text)]"
          >
            Browse all tracks
          </Link>
        </div>
      </section>

      {live.length > 0 && (
        <section className="mt-14" aria-labelledby="live-heading">
          <h2 id="live-heading" className="text-xl font-semibold">Live now</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Ready to open. Each one takes a few minutes.</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {live.map(({ track, session }) => (
              <li key={`${track.id}/${session.id}`}>
                <SessionCard track={track} session={session} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-14 grid gap-8 lg:grid-cols-[1fr_1.1fr]" aria-labelledby="how-heading">
        <div>
          <h2 id="how-heading" className="text-xl font-semibold">How a session works</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Every session follows the same path, so once you have done one you know how to do them all.
          </p>
        </div>
        <div>
          <FlowStep n={1} title="Pick a track" what="A track is one subject, like DSA or AI. Each holds a list of sessions." />
          <FlowArrow label="one subject" />
          <FlowStep n={2} title="Open a session" what="A session explains one idea, from the top of the page to the bottom." />
          <FlowArrow label="one idea" />
          <FlowStep n={3} title="Play with it" what="Drag the sliders, press Play or Step, and watch the numbers change." />
          <FlowArrow label="what you saw" />
          <FlowStep n={4} title="Keep going" what="At the bottom, Next takes you to the following session in the track." />
        </div>
      </section>

      <section className="mt-14" aria-labelledby="tracks-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="tracks-heading" className="text-xl font-semibold">All tracks</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Pick a subject to see its sessions, roadmap and projects.</p>
          </div>
        </div>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TRACKS.map((t) => (
            <li key={t.id}>
              <TrackCard track={t} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
