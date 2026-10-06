import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import { DoneToggle } from "@/components/Progress";
import { DIFFICULTY_COLOR, REPO, TOPICS, getProblem, githubHref, practiceHref, problemHref, problemKey } from "@/lib/practice";
import { getSession, sessionHref } from "@/lib/tracks";

export const dynamicParams = false;

export function generateStaticParams() {
  return TOPICS.flatMap((t) => t.problems.map((p) => ({ topic: t.slug, problem: p.slug })));
}

export async function generateMetadata(props: PageProps<"/practice/[topic]/[problem]">): Promise<Metadata> {
  const { topic, problem } = await props.params;
  const found = getProblem(topic, problem);
  return found ? { title: `${found.problem.number} ${found.problem.title}`, description: found.problem.problem } : {};
}

// Inline `code` in a statement becomes <code>.
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/g).map((part, i) =>
        part.startsWith("`") && part.endsWith("`") ? (
          <code key={i} className="rounded bg-[var(--inset)] px-1 font-mono text-[0.9em]">
            {part.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export default async function ProblemPage(props: PageProps<"/practice/[topic]/[problem]">) {
  const params = await props.params;
  const found = getProblem(params.topic, params.problem);
  if (!found) notFound();
  const { topic, problem: p, prev, next } = found;
  const sessions = topic.sessions.map((s) => getSession(...(s.split("/") as [string, string]))).filter((x) => x !== undefined);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12" style={{ "--accent": "var(--dsa)" } as React.CSSProperties}>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Practice", href: "/practice" },
          { label: topic.title, href: practiceHref(topic) },
          { label: p.title },
        ]}
      />

      <p className="mt-6 flex flex-wrap items-center gap-3 font-mono text-xs uppercase tracking-[0.2em]">
        <span className="text-[var(--accent)]">
          {topic.title} · {p.number}
        </span>
        <span style={{ color: DIFFICULTY_COLOR[p.difficulty] }}>{p.difficulty}</span>
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{p.title}</h1>

      <p className="mt-4 leading-7">
        <Rich text={p.problem} />
      </p>

      <Section title="Constraints">
        <ul className="space-y-1 font-mono text-sm">
          {p.constraints.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </Section>

      <Section title="Examples">
        <pre className="overflow-x-auto rounded-lg bg-[var(--inset)] p-3 font-mono text-sm leading-6">{p.examples.join("\n")}</pre>
      </Section>

      {p.edgeCases.length > 0 && (
        <Section title="Edge cases">
          <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
            {p.edgeCases.map((e) => (
              <li key={e}>
                <Rich text={e} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      <details className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
        <summary className="min-h-6 cursor-pointer font-medium">Show the target complexity (spoiler)</summary>
        <dl className="mt-3 grid gap-2 text-sm">
          {p.complexity.naive && (
            <div>
              <dt className="text-xs text-[var(--faint)]">Naive</dt>
              <dd>{p.complexity.naive}</dd>
            </div>
          )}
          {p.complexity.target && (
            <div>
              <dt className="text-xs text-[var(--faint)]">Target</dt>
              <dd>{p.complexity.target}</dd>
            </div>
          )}
        </dl>
      </details>

      <section className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5">
        <h2 className="font-semibold">Solve it</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">By hand, in your editor. The runner checks answers and timing.</p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-[var(--inset)] p-3 font-mono text-sm leading-6">
          {`git clone ${REPO}\ncd optimal-round\n# open ${p.file}\n./practice c ${p.number}`}
        </pre>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <DoneToggle id={problemKey(p)} label="Mark as solved" doneLabel="Solved ✓" />
          <a href={githubHref(p)} className="inline-flex min-h-11 items-center rounded-md border border-[var(--line-strong)] px-4 text-sm">
            Open the file on GitHub ↗
          </a>
        </div>
      </section>

      {sessions.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-medium text-[var(--muted)]">Stuck? Watch the pattern run</h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {sessions.map(({ track, session }) => (
              <Link key={session.id} href={sessionHref(track, session)} className="block rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 transition-colors hover:border-[var(--accent)]">
                <span className="text-xs text-[var(--faint)]">Interactive session</span>
                <span className="mt-1 block font-semibold">{session.title} →</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <nav aria-label="More problems in this pattern" className="mt-10 grid gap-3 border-t border-[var(--line)] pt-6 sm:grid-cols-2">
        {prev ? (
          <Link href={problemHref(topic, prev)} className="block rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 hover:border-[var(--accent)]">
            <span className="text-xs text-[var(--faint)]">← Previous</span>
            <span className="mt-1 block font-semibold">{prev.title}</span>
          </Link>
        ) : (
          <div className="hidden sm:block" />
        )}
        {next && (
          <Link href={problemHref(topic, next)} className="block rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 hover:border-[var(--accent)] sm:text-right">
            <span className="text-xs text-[var(--faint)]">Next →</span>
            <span className="mt-1 block font-semibold">{next.title}</span>
          </Link>
        )}
      </nav>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">{title}</h2>
      {children}
    </section>
  );
}
