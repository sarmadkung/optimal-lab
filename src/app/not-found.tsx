import Link from "next/link";
import TrackCard from "@/components/TrackCard";
import { TRACKS } from "@/lib/tracks";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--faint)]">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">This page does not exist</h1>
      <p className="mt-3 max-w-xl text-[var(--muted)]">
        The link may be old, or the session may have moved. Pick a track below, or{" "}
        <Link href="/" className="text-[var(--text)] underline underline-offset-4">
          go back home
        </Link>
        .
      </p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TRACKS.map((t) => (
          <li key={t.id}>
            <TrackCard track={t} />
          </li>
        ))}
      </ul>
    </main>
  );
}
