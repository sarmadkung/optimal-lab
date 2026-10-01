import Link from "next/link";
import { sessionHref, type Session, type Track } from "@/lib/tracks";

export default function SessionCard({ track, session }: { track: Track; session: Session }) {
  const style = { "--accent": track.accent } as React.CSSProperties;
  const live = session.status === "live";

  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">
          {session.tag ?? "Interactive"}
        </p>
        {live ? (
          <span className="flex items-center gap-1.5 text-[11px] text-[var(--good)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--good)]" />
            Live
          </span>
        ) : (
          <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[11px] text-[var(--faint)]">
            Coming soon
          </span>
        )}
      </div>
      <p className="mt-1 font-semibold">{session.title}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{session.blurb}</p>
      {live && (
        <p className="mt-3 text-sm font-medium text-[var(--accent)]">
          Open session <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
        </p>
      )}
    </>
  );

  if (live) {
    return (
      <Link
        href={sessionHref(track, session)}
        style={style}
        className="group block h-full rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 transition-colors hover:border-[var(--accent)]"
      >
        {body}
      </Link>
    );
  }

  return (
    <div style={style} className="h-full rounded-xl border border-dashed border-[var(--line)] p-4 opacity-75">
      {body}
    </div>
  );
}
