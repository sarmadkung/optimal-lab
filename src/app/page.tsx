import Link from "next/link";
import HomeTabs from "@/components/HomeTabs";
import ProjectCatalog from "@/components/ProjectCatalog";
import TrackCard from "@/components/TrackCard";
import { projectCatalogCount } from "@/lib/projects";
import { TRACKS, homeStartSession, sessionHref, trackHref, type Track } from "@/lib/tracks";

export default function Home() {
  const start = homeStartSession();
  const projectCount = projectCatalogCount();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">See how engineering works</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Pick a track and play with the idea — DSA, systems, DevOps, AI. No account.
          </p>
        </div>
        {start && (
          <Link
            href={sessionHref(start.track, start.session)}
            style={{ "--accent": start.track.accent } as React.CSSProperties}
            className="inline-flex min-h-11 shrink-0 items-center self-start rounded-lg bg-[var(--accent)] px-3.5 text-sm font-semibold text-[var(--on-accent)] transition-opacity hover:opacity-90 sm:self-center"
          >
            Start with {start.session.title} →
          </Link>
        )}
      </section>

      <section className="mt-6 sm:mt-8" aria-label="Explore">
        <HomeTabs
          label="Home sections"
          tabs={[
            {
              id: "tracks",
              label: "Tracks",
              count: TRACKS.length,
              content: (
                <TabPanel hint="One subject per track. Open a track for its sessions — live ones you can play now, plus roadmap and projects.">
                  <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {TRACKS.map((t) => (
                      <li key={t.id}>
                        <TrackCard track={t} />
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-center text-sm text-[var(--muted)]">
                    <Link href="/tracks" className="text-[var(--accent)] hover:underline">
                      Full track list →
                    </Link>
                  </p>
                </TabPanel>
              ),
            },
            {
              id: "roadmaps",
              label: "Roadmaps",
              content: (
                <TabPanel hint="Structured paths through each track — interactive steps are being added over time." soon>
                  <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {TRACKS.map((t) => (
                      <li key={t.id}>
                        <RoadmapTeaser track={t} />
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
                <TabPanel
                  hint="Filter by pillar and area, then pick a build — like roadmap.sh/projects, with difficulty and format on each card."
                  soon
                >
                  <ProjectCatalog />
                </TabPanel>
              ),
            },
            {
              id: "practice",
              label: "Practice",
              content: (
                <TabPanel hint="DSA problems by pattern, linked to the sessions that teach each pattern." soon>
                  <div className="rounded-xl border border-dashed border-[var(--line)] px-5 py-8 text-center">
                    <p className="text-sm text-[var(--muted)]">The editor is not live yet.</p>
                    <Link
                      href="/tracks/dsa"
                      className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-[var(--line-strong)] px-4 text-sm transition-colors hover:border-[var(--accent)]"
                    >
                      Browse DSA sessions instead →
                    </Link>
                  </div>
                </TabPanel>
              ),
            },
          ]}
        />
      </section>
    </main>
  );
}

function TabPanel({
  hint,
  soon,
  children,
}: {
  hint: string;
  soon?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <p className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
        {hint}
        {soon ? <ComingSoon /> : null}
      </p>
      <div className="mt-4">{children}</div>
    </>
  );
}

function RoadmapTeaser({ track }: { track: Track }) {
  const preview = track.roadmap.slice(0, 2);
  const rest = track.roadmap.length - preview.length;
  return (
    <Link
      href={`${trackHref(track)}#roadmap`}
      style={{ "--accent": track.accent } as React.CSSProperties}
      className="group block h-full rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 transition-colors hover:border-[var(--accent)]"
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">{track.short}</p>
      <p className="mt-1 font-semibold leading-snug">{track.title}</p>
      <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
        {preview.map((stage) => (
          <li key={stage} className="truncate">
            {stage}
          </li>
        ))}
      </ul>
      {rest > 0 ? <p className="mt-2 text-xs text-[var(--faint)]">+{rest} more on the track page</p> : null}
      <p className="mt-3 text-sm text-[var(--accent)]">
        View roadmap <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
      </p>
    </Link>
  );
}

function ComingSoon() {
  return (
    <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[11px] text-[var(--faint)]">
      Coming soon
    </span>
  );
}
