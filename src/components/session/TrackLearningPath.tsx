import Link from "next/link";
import { getTrack, sessionHref } from "@/lib/tracks";

type Props = { trackId: string; sessionId: string };

/** Ordered live sessions in a track — highlights where you are and links to the track tool list. */
export function TrackLearningPath({ trackId, sessionId }: Props) {
  const track = getTrack(trackId);
  if (!track) return null;

  const path = track.sessions.filter((s) => s.status === "live");
  if (path.length < 2) return null;

  const index = path.findIndex((s) => s.id === sessionId);
  const hasTools = path.some((s) => s.status === "live");

  return (
    <nav
      aria-label="Sessions in this track"
      className="mx-auto w-full max-w-6xl px-4 pb-2 pt-4"
    >
      <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
            {track.short} track · {path.length} sessions
          </p>
          {hasTools ? (
            <Link href={`/tracks/${trackId}#tools`} className="text-xs text-[var(--accent)] hover:underline">
              Tools for this track →
            </Link>
          ) : null}
        </div>
        {track.learningPathBlurb ? (
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{track.learningPathBlurb}</p>
        ) : null}
        <ol className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {path.map((s, i) => {
            const current = i === index;
            const label = sessionStepLabel(s.title, s.tag);
            return (
              <li key={s.id} className="min-w-0 flex-1 sm:min-w-[9rem] sm:max-w-[14rem]">
                <Link
                  href={sessionHref(track, s)}
                  aria-current={current ? "page" : undefined}
                  className={`block rounded-lg border px-3 py-2 text-sm transition-colors ${
                    current
                      ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] font-medium text-[var(--text)]"
                      : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--line-strong)] hover:text-[var(--text)]"
                  }`}
                >
                  <span className="font-mono text-[10px] text-[var(--faint)]">Step {i + 1}</span>
                  <span className="mt-0.5 block leading-snug">{label}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

function sessionStepLabel(title: string, tag?: string) {
  if (tag && !/^(AI|DSA)\s*#\d+$/i.test(tag.trim())) {
    const cleaned = tag.replace(/^[^:]+:\s*/i, "").trim();
    if (cleaned) return cleaned;
  }
  const short = title.split(",")[0]?.split("·")[0]?.trim();
  return short && short.length < 48 ? short : title;
}
