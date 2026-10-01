import Link from "next/link";
import { liveCount, trackHref, type Track } from "@/lib/tracks";

export default function TrackCard({ track }: { track: Track }) {
  const live = liveCount(track);
  const soon = track.sessions.length - live;
  return (
    <Link
      href={trackHref(track)}
      style={{ "--accent": track.accent } as React.CSSProperties}
      className="group flex h-full flex-col rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 transition-colors hover:border-[var(--accent)]"
    >
      <span className="block h-1 w-10 rounded-full bg-[var(--accent)]" />
      <p className="mt-4 text-lg font-semibold">{track.title}</p>
      <p className="mt-1 flex-1 text-sm text-[var(--muted)]">{track.tagline}</p>
      <p className="mt-4 flex items-center justify-between gap-2 text-xs">
        <span className="font-mono text-[var(--faint)]">
          {live > 0 ? `${live} live · ` : ""}
          {soon} coming
        </span>
        <span className="text-sm text-[var(--accent)]">
          View track <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
        </span>
      </p>
    </Link>
  );
}
