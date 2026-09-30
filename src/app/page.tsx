import Link from "next/link";

const DEMOS = [
  {
    href: "/dsa-01",
    pillar: "DSA series #01",
    title: "Two Sum, three ways",
    blurb: "Step through brute force, two pointers and a hash map. Then scale n and see the gap.",
  },
  {
    href: "/next-token",
    pillar: "AI Engineering",
    title: "How an LLM picks the next token",
    blurb: "Drag temperature, top-k and top-p. Watch the odds move, then sample.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Optimal Lab</h1>
      <p className="mt-2 text-[var(--muted)]">
        See how engineering works. Interactive visuals for algorithms, system design, DevOps and AI,
        shown by moving parts instead of static diagrams.
      </p>
      <ul className="mt-8 space-y-3">
        {DEMOS.map((d) => (
          <li key={d.href}>
            <Link
              href={d.href}
              className="block rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 transition-colors hover:border-[var(--ai)]"
            >
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--ai)]">
                {d.pillar}
              </p>
              <p className="mt-1 text-lg font-semibold">{d.title}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{d.blurb}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
