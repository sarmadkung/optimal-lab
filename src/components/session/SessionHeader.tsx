import type { ReactNode } from "react";

type Props = {
  kicker: string;
  title: ReactNode;
  blurb: string;
};

export function SessionHeader({ kicker, title, blurb }: Props) {
  return (
    <>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)]">{kicker}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-2xl text-[var(--muted)]">{blurb}</p>
    </>
  );
}

/** Shared width and padding for interactive session pages with a split visual. */
export function SessionPage({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">{children}</div>;
}
