import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import { DoneCount } from "@/components/Progress";
import { DIFFICULTY_COLOR, PROBLEM_COUNT, REPO, TOPICS, countByDifficulty, practiceHref, problemKey } from "@/lib/practice";
import { getSession } from "@/lib/tracks";

export const metadata: Metadata = {
  title: "Practice",
  description: `${PROBLEM_COUNT} DSA problems grouped by pattern, each linked to the interactive session that teaches it.`,
};

export default function PracticePage() {
  const all = TOPICS.flatMap((t) => t.problems);
  const totals = countByDifficulty(all);
  const withVisual = TOPICS.filter((t) => t.sessions.length);
  const rest = TOPICS.filter((t) => !t.sessions.length);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12" style={{ "--accent": "var(--dsa)" } as React.CSSProperties}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Practice" }]} />
      <p className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)]">Practice</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Solve it yourself</h1>
      <p className="mt-3 max-w-2xl text-[var(--muted)]">
        {PROBLEM_COUNT} problems in {TOPICS.length} patterns. Watch a pattern run in its session, then solve the problems that use it.
        Every problem says what to solve, its limits and examples, and the complexity to aim for, hidden until you want it.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        {(Object.keys(totals) as (keyof typeof totals)[]).map((d) => (
          <span key={d}>
            <span className="font-mono" style={{ color: DIFFICULTY_COLOR[d] }}>
              {totals[d]}
            </span>{" "}
            <span className="text-[var(--muted)]">{d.toLowerCase()}</span>
          </span>
        ))}
        <DoneCount ids={all.map(problemKey)} noun="solved on this device" />
      </div>

      <section className="mt-8 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5">
        <h2 className="font-semibold">How it works</h2>
        <ol className="mt-3 grid gap-3 text-sm text-[var(--muted)] sm:grid-cols-3">
          <li>
            <span className="font-mono text-[var(--accent)]">1.</span> Clone{" "}
            <a href={REPO} className="text-[var(--text)] underline-offset-2 hover:underline">
              optimal-round
            </a>
            . Each problem is one file with an empty function.
          </li>
          <li>
            <span className="font-mono text-[var(--accent)]">2.</span> Fill it in by hand. No AI: a solution you did not work out teaches you nothing.
          </li>
          <li>
            <span className="font-mono text-[var(--accent)]">3.</span> Run <code className="font-mono text-[var(--text)]">./practice c 009</code> to check correctness and speed, then mark it solved here.
          </li>
        </ol>
      </section>

      <h2 className="mt-10 text-xl font-semibold">Patterns with a visual</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">Start here: each one has an interactive session that shows the pattern working.</p>
      <TopicGrid topics={withVisual} />

      <h2 className="mt-10 text-xl font-semibold">More patterns</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">Problems and a written explainer in optimal-round; the visual is still to come.</p>
      <TopicGrid topics={rest} />
    </main>
  );
}

function TopicGrid({ topics }: { topics: typeof TOPICS }) {
  return (
    <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {topics.map((t) => {
        const c = countByDifficulty(t.problems);
        const session = t.sessions[0] ? getSession(...(t.sessions[0].split("/") as [string, string])) : undefined;
        return (
          <li key={t.slug}>
            <Link href={practiceHref(t)} className="block h-full rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 transition-colors hover:border-[var(--accent)]">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{t.title}</span>
                <span className="font-mono text-xs text-[var(--faint)]">{t.problems.length}</span>
              </div>
              <p className="mt-2 flex gap-3 font-mono text-xs">
                {(Object.keys(c) as (keyof typeof c)[]).map((d) =>
                  c[d] ? (
                    <span key={d} style={{ color: DIFFICULTY_COLOR[d] }}>
                      {c[d]} {d.toLowerCase()}
                    </span>
                  ) : null,
                )}
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">{session ? `Visual: ${session.session.title}` : t.explainer ? "Written explainer" : "Problems only"}</p>
              <p className="mt-2">
                <DoneCount ids={t.problems.map(problemKey)} noun="solved" />
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
