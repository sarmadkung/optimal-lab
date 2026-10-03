import Link from "next/link";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import HomeTabs from "@/components/HomeTabs";
import SessionCard from "@/components/SessionCard";
import TrackCard from "@/components/TrackCard";
import { TRACKS, liveSessions, sessionHref, trackHref, type Track } from "@/lib/tracks";

export default function Home() {
  const live = liveSessions();
  const start = live[0];
  const projectCount = TRACKS.reduce((n, t) => n + t.projects.length, 0);

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

      <section className="mt-14" aria-label="Explore">
        <HomeTabs
          label="Explore Optimal Lab"
          tabs={[
            {
              id: "tracks",
              label: "Tracks",
              count: TRACKS.length,
              content: (
                <TabPanel title="All tracks" what="Pick a subject to see its sessions, roadmap and projects.">
                  <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {TRACKS.map((t) => (
                      <li key={t.id}>
                        <TrackCard track={t} />
                      </li>
                    ))}
                  </ul>
                </TabPanel>
              ),
            },
            {
              id: "sessions",
              label: "Live sessions",
              count: live.length,
              content: (
                <TabPanel title="Live now" what="Ready to open. Each one takes a few minutes.">
                  <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {live.map(({ track, session }) => (
                      <li key={`${track.id}/${session.id}`}>
                        <SessionCard track={track} session={session} />
                      </li>
                    ))}
                  </ul>
                </TabPanel>
              ),
            },
            {
              id: "roadmaps",
              label: "Roadmaps",
              count: TRACKS.length,
              content: (
                <TabPanel
                  title="Roadmaps"
                  what="A step-by-step path through each track, with sessions and practice at each stage."
                  soon
                >
                  <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {TRACKS.map((t) => (
                      <li key={t.id}>
                        <RoadmapCard track={t} />
                      </li>
                    ))}
                  </ul>
                </TabPanel>
              ),
            },
            {
              id: "projects",
              label: "Projects",
              count: projectCount,
              content: (
                <TabPanel title="Projects" what="Build something real to lock in the skill." soon>
                  <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {TRACKS.flatMap((t) =>
                      t.projects.map((p) => (
                        <li key={`${t.id}/${p}`}>
                          <ProjectCard track={t} project={p} />
                        </li>
                      )),
                    )}
                  </ul>
                </TabPanel>
              ),
            },
            {
              id: "practice",
              label: "Practice",
              content: (
                <TabPanel
                  title="Practice"
                  what="A DSA editor with problems grouped by pattern. Each problem links back to the session that explains its pattern."
                  soon
                >
                  <PracticePreview />
                </TabPanel>
              ),
            },
          ]}
        />
      </section>

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
    </main>
  );
}

function TabPanel({
  title,
  what,
  soon,
  children,
}: {
  title: string;
  what: string;
  soon?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold">{title}</h2>
        {soon && <ComingSoon />}
      </div>
      <p className="mt-1 text-sm text-[var(--muted)]">{what}</p>
      <div className="mt-4">{children}</div>
    </>
  );
}

function RoadmapCard({ track }: { track: Track }) {
  return (
    <Link
      href={`${trackHref(track)}#roadmap`}
      style={{ "--accent": track.accent } as React.CSSProperties}
      className="group flex h-full flex-col rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 transition-colors hover:border-[var(--accent)]"
    >
      <span className="block h-1 w-10 rounded-full bg-[var(--accent)]" />
      <p className="mt-4 font-semibold">{track.title}</p>
      <ol className="mt-3 flex-1 space-y-1.5 text-sm text-[var(--muted)]">
        {track.roadmap.map((stage, i) => (
          <li key={stage} className="flex gap-2">
            <span className="w-4 shrink-0 font-mono text-xs leading-5 text-[var(--faint)]">{i + 1}</span>
            {stage}
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm text-[var(--accent)]">
        View roadmap <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
      </p>
    </Link>
  );
}

function ProjectCard({ track, project }: { track: Track; project: string }) {
  return (
    <Link
      href={`${trackHref(track)}#projects`}
      style={{ "--accent": track.accent } as React.CSSProperties}
      className="flex h-full flex-col rounded-xl border border-dashed border-[var(--line)] p-4 transition-colors hover:border-[var(--accent)]"
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">{track.short}</p>
      <p className="mt-1 text-sm">{project}</p>
    </Link>
  );
}

function PracticePreview() {
  const dsa = TRACKS.find((t) => t.id === "dsa");
  return (
    <div className="rounded-xl border border-dashed border-[var(--line)] p-5">
      <p className="text-sm text-[var(--muted)]">
        Practice is being built. Until it opens, the DSA sessions show the patterns the problems are grouped by.
      </p>
      {dsa && (
        <Link
          href={trackHref(dsa)}
          style={{ "--accent": dsa.accent } as React.CSSProperties}
          className="mt-4 inline-block rounded-lg border border-[var(--line-strong)] px-4 py-2.5 text-sm transition-colors hover:border-[var(--accent)]"
        >
          Open the DSA track →
        </Link>
      )}
    </div>
  );
}

function ComingSoon() {
  return (
    <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[11px] text-[var(--faint)]">
      Coming soon
    </span>
  );
}
