import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import { DoneCount, DoneMark } from "@/components/Progress";
import { DIFFICULTY_COLOR, TOPICS, explainerHref, getTopic, problemHref, problemKey } from "@/lib/practice";
import { getSession, sessionHref } from "@/lib/tracks";

export const dynamicParams = false;

export function generateStaticParams() {
  return TOPICS.map((t) => ({ topic: t.slug }));
}

export async function generateMetadata(props: PageProps<"/practice/[topic]">): Promise<Metadata> {
  const { topic } = await props.params;
  const t = getTopic(topic);
  return t ? { title: `${t.title} · Practice`, description: `${t.problems.length} ${t.title} problems, from easy to hard.` } : {};
}

export default async function TopicPage(props: PageProps<"/practice/[topic]">) {
  const { topic } = await props.params;
  const t = getTopic(topic);
  if (!t) notFound();
  const sessions = t.sessions.map((s) => getSession(...(s.split("/") as [string, string]))).filter((x) => x !== undefined);
  const explainer = explainerHref(t);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12" style={{ "--accent": "var(--dsa)" } as React.CSSProperties}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Practice", href: "/practice" }, { label: t.title }]} />
      <p className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)]">Practice · {t.problems.length} problems</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{t.title}</h1>
      <p className="mt-3">
        <DoneCount ids={t.problems.map(problemKey)} noun="solved on this device" />
      </p>

      {(sessions.length > 0 || explainer) && (
        <section className="mt-6 grid gap-3 sm:grid-cols-2">
          {sessions.map(({ track, session }) => (
            <Link
              key={session.id}
              href={sessionHref(track, session)}
              className="block rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 transition-colors hover:border-[var(--accent)]"
            >
              <span className="text-xs text-[var(--faint)]">Watch it first · interactive</span>
              <span className="mt-1 block font-semibold">{session.title} →</span>
            </Link>
          ))}
          {explainer && (
            <a href={explainer} className="block rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 transition-colors hover:border-[var(--accent)]">
              <span className="text-xs text-[var(--faint)]">Read the explainer · optimal-round</span>
              <span className="mt-1 block font-semibold">When to use it, and its look-alikes ↗</span>
            </a>
          )}
        </section>
      )}

      <ol className="mt-8 divide-y divide-[var(--line)] rounded-xl border border-[var(--line)] bg-[var(--panel)]">
        {t.problems.map((p) => (
          <li key={p.slug}>
            <Link href={problemHref(t, p)} className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--inset)]">
              <span className="w-9 shrink-0 font-mono text-xs text-[var(--faint)]">{p.number}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{p.title}</span>
                <span className="block truncate text-sm text-[var(--muted)]">{p.problem}</span>
              </span>
              <DoneMark id={problemKey(p)} />
              <span className="shrink-0 font-mono text-xs" style={{ color: DIFFICULTY_COLOR[p.difficulty] }}>
                {p.difficulty}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
