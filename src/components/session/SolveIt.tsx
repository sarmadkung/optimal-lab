import Link from "next/link";
import { DoneMark } from "@/components/Progress";
import { DIFFICULTY_COLOR, practiceHref, problemHref, problemKey, topicsForSession } from "@/lib/practice";

const ORDER = { Easy: 0, Medium: 1, Hard: 2 } as const;

/** "Now solve it": the practice problems that use the pattern this session teaches. */
export function SolveIt({ trackId, sessionId }: { trackId: string; sessionId: string }) {
  const topics = topicsForSession(trackId, sessionId);
  if (!topics.length) return null;
  return (
    <section aria-label="Practice problems for this pattern" className="mx-auto w-full max-w-6xl px-4 pt-4 pb-2">
      <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-4 sm:px-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">Now solve it</p>
        {topics.map((t) => {
          const picks = [...t.problems].sort((a, b) => ORDER[a.difficulty] - ORDER[b.difficulty]).slice(0, 3);
          return (
            <div key={t.slug} className="mt-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-semibold">{t.title}: {t.problems.length} problems</h2>
                <Link href={practiceHref(t)} className="text-sm text-[var(--accent)] hover:underline">
                  See all →
                </Link>
              </div>
              <ul className="mt-3 grid gap-2 sm:grid-cols-3">
                {picks.map((p) => (
                  <li key={p.slug} className="min-w-0">
                    <Link href={problemHref(t, p)} className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-[var(--line)] px-3 py-2 text-sm transition-colors hover:border-[var(--accent)]">
                      <span className="min-w-0 truncate">
                        <span className="font-mono text-xs text-[var(--faint)]">{p.number} </span>
                        {p.title}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <DoneMark id={problemKey(p)} />
                        <span className="font-mono text-[10px]" style={{ color: DIFFICULTY_COLOR[p.difficulty] }}>
                          {p.difficulty}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
