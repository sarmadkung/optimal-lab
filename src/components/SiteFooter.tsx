import Link from "next/link";
import TourButton from "@/components/TourButton";
import { TRACKS, trackHref } from "@/lib/tracks";

export default function SiteFooter() {
  return (
    <footer className="border-t border-[var(--line)]">
      <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-10 text-sm sm:grid-cols-[1fr_auto]">
        <div>
          <p className="font-semibold">Optimal Lab</p>
          <p className="mt-1 max-w-sm text-[var(--muted)]">Interactive visuals you can drag, step, and break.</p>
          <TourButton />
        </div>
        <nav aria-label="Footer">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--faint)]">Tracks</p>
          <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5">
            {TRACKS.map((t) => (
              <li key={t.id}>
                <Link href={trackHref(t)} className="text-[var(--muted)] hover:text-[var(--text)]">
                  {t.short}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/tracks" className="text-[var(--muted)] hover:text-[var(--text)]">
                All tracks
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
