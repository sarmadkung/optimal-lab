import Link from "next/link";

// "Home / Track / Session" trail at the top of a page, so the reader always knows where they are.
export default function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[var(--muted)]">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-2">
            {i > 0 && <span className="text-[var(--faint)]" aria-hidden>/</span>}
            {item.href ? (
              <Link href={item.href} className="hover:text-[var(--text)]">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-[var(--text)]">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
