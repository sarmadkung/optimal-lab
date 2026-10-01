import Link from "next/link";
import type { Session } from "@/lib/tracks";

export default function SessionCard({ session, accent }: { session: Session; accent: string }) {
  const style = { "--accent": accent } as React.CSSProperties;
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">
          {session.tag ?? "Interactive"}
        </p>
        {session.status === "soon" && (
          <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[11px] text-[var(--faint)]">
            Soon
          </span>
        )}
      </div>
      <p className="mt-1 font-semibold">{session.title}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{session.blurb}</p>
    </>
  );

  if (session.status === "live" && session.slug) {
    return (
      <Link
        href={session.slug}
        style={style}
        className="block h-full rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 transition-colors hover:border-[var(--accent)]"
      >
        {body}
      </Link>
    );
  }

  return (
    <div style={style} className="h-full rounded-xl border border-dashed border-[var(--line)] p-4 opacity-70">
      {body}
    </div>
  );
}
