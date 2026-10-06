import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import { DoneToggle } from "@/components/Progress";
import { RealWorldTools } from "@/components/session/RealWorldTools";
import { SolveIt } from "@/components/session/SolveIt";
import { SessionLayoutProvider } from "@/components/session/SessionLayoutContext";
import { TrackLearningPath } from "@/components/session/TrackLearningPath";
import { TRACKS, getSession, layoutFor, neighbours, sessionHref, trackHref, type Session, type Track } from "@/lib/tracks";
import { sessionKey } from "@/lib/progressKeys";
import { sessionDemo } from "@/sessions/registry";

export const dynamicParams = false;

export function generateStaticParams() {
  return TRACKS.flatMap((t) =>
    t.sessions.map((s) => {
      // Fails the build when a live session has not declared its shape.
      if (s.status === "live") layoutFor(t, s);
      return { track: t.id, session: s.id };
    }),
  );
}

export async function generateMetadata(props: PageProps<"/tracks/[track]/[session]">): Promise<Metadata> {
  const { track, session } = await props.params;
  const found = getSession(track, session);
  return found ? { title: found.session.title, description: found.session.blurb } : {};
}

export default async function SessionPage(props: PageProps<"/tracks/[track]/[session]">) {
  const params = await props.params;
  const found = getSession(params.track, params.session);
  if (!found) notFound();
  const { track, session } = found;

  const demo = session.status === "live" ? sessionDemo(track.id, session.id) : undefined;
  const { prev, next } = neighbours(track, session.id);
  const layout = demo ? layoutFor(track, session) : undefined;

  return (
    <main style={{ "--accent": track.accent } as React.CSSProperties}>
      <div className="mx-auto w-full max-w-3xl px-4 pt-6">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: track.short, href: trackHref(track) },
            { label: session.title },
          ]}
        />
      </div>

      {demo && layout ? (
        <SessionLayoutProvider mode={layout.mode} why={layout.why}>
          {demo}
        </SessionLayoutProvider>
      ) : (
        <ComingSoon track={track} session={session} />
      )}

      {session.status === "live" ? <SolveIt trackId={track.id} sessionId={session.id} /> : null}

      {/* Where this session sits in the track. Below the demo, so the demo starts in the first screen. */}
      {session.status === "live" ? <TrackLearningPath trackId={track.id} sessionId={session.id} /> : null}

      {session.status === "live" ? <RealWorldTools trackId={track.id} sessionId={session.id} /> : null}

      <nav aria-label="More in this track" className="mx-auto w-full max-w-3xl px-4 pb-16">
        <div className="border-t border-[var(--line)] pt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)]">Keep going</p>
            {session.status === "live" ? <DoneToggle id={sessionKey(track.id, session.id)} label="Mark this session done" /> : null}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Neighbour track={track} session={prev} direction="prev" />
            <Neighbour track={track} session={next} direction="next" />
          </div>
          <Link
            href={trackHref(track)}
            className="mt-6 inline-block text-sm text-[var(--muted)] hover:text-[var(--text)]"
          >
            ← Back to all {track.short} sessions
          </Link>
        </div>
      </nav>
    </main>
  );
}

function Neighbour({ track, session, direction }: { track: Track; session?: Session; direction: "prev" | "next" }) {
  const label = direction === "prev" ? "← Previous" : "Next →";
  const align = direction === "next" ? "sm:text-right" : "";

  if (!session) {
    // keep the grid aligned when there is nothing on one side
    return <div className="hidden sm:block" />;
  }

  const live = session.status === "live";
  return (
    <Link
      href={sessionHref(track, session)}
      className={`block rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 transition-colors hover:border-[var(--accent)] ${align}`}
    >
      <span className="text-xs text-[var(--faint)]">
        {label}
        {!live && " · coming soon"}
      </span>
      <span className="mt-1 block font-semibold">{session.title}</span>
    </Link>
  );
}

function ComingSoon({ track, session }: { track: Track; session: Session }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)]">
        {track.title} · coming soon
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{session.title}</h1>
      <p className="mt-3 text-[var(--muted)]">{session.blurb}</p>
      <p className="mt-6 rounded-xl border border-dashed border-[var(--line-strong)] p-4 text-sm text-[var(--muted)]">
        This session is still being built. Until then, try a live one from the track below.
      </p>
    </div>
  );
}
