"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  flattenProjectCatalog,
  PROJECT_PILLARS,
  pillarIdFromProjectsHash,
  type CatalogProject,
  type ProjectLevel,
} from "@/lib/projects";

type PillarFilter = "all" | string;
type AreaFilter = "all" | string;

export default function ProjectCatalog() {
  const catalog = useMemo(() => flattenProjectCatalog(), []);
  const [pillar, setPillar] = useState<PillarFilter>("all");
  const [area, setArea] = useState<AreaFilter>("all");
  const [started, setStarted] = useState<Record<string, number>>({});

  useEffect(() => {
    const id = pillarIdFromProjectsHash(window.location.hash);
    if (id) setPillar(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/projects/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { counts?: Record<string, number> } | null) => {
        if (!cancelled && data?.counts) setStarted(data.counts);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const areas = useMemo(() => {
    const rows =
      pillar === "all" ? catalog : catalog.filter((p) => p.pillarId === pillar);
    const seen = new Map<string, string>();
    for (const row of rows) {
      if (!seen.has(row.categoryId)) seen.set(row.categoryId, row.categoryTitle);
    }
    return [...seen.entries()].map(([id, title]) => ({ id, title }));
  }, [catalog, pillar]);

  useEffect(() => {
    if (area !== "all" && !areas.some((a) => a.id === area)) setArea("all");
  }, [area, areas]);

  const filtered = useMemo(() => {
    return catalog.filter((p) => {
      if (pillar !== "all" && p.pillarId !== pillar) return false;
      if (area !== "all" && p.categoryId !== area) return false;
      return true;
    });
  }, [catalog, pillar, area]);

  const onStart = useCallback(async (key: string) => {
    setStarted((prev) => ({ ...prev, [key]: (prev[key] ?? 0) + 1 }));
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(key)}/start`, { method: "POST" });
      if (!res.ok) return;
      const data = (await res.json()) as { count?: number };
      if (typeof data.count === "number") {
        const count = data.count;
        setStarted((prev) => ({ ...prev, [key]: count }));
      }
    } catch {
      /* offline or Supabase not configured */
    }
  }, []);

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="sr-only">Filter by pillar</legend>
        <div className="flex flex-wrap gap-2">
          <FilterChip active={pillar === "all"} onClick={() => setPillar("all")}>
            All projects
          </FilterChip>
          {PROJECT_PILLARS.map((p) => (
            <FilterChip key={p.id} active={pillar === p.id} onClick={() => setPillar(p.id)}>
              {p.short}
            </FilterChip>
          ))}
        </div>
      </fieldset>

      {areas.length > 1 && (
        <fieldset>
          <legend className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--faint)]">Areas</legend>
          <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <FilterChip active={area === "all"} onClick={() => setArea("all")} compact>
              All areas
            </FilterChip>
            {areas.map((a) => (
              <FilterChip key={a.id} active={area === a.id} onClick={() => setArea(a.id)} compact>
                {a.title}
              </FilterChip>
            ))}
          </div>
        </fieldset>
      )}

      <p className="text-sm text-[var(--muted)]">
        <span className="font-medium text-[var(--text)]">{filtered.length}</span> project
        {filtered.length === 1 ? "" : "s"}
        {pillar !== "all" || area !== "all" ? " match your filters" : " in the catalog"}
      </p>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((project) => (
          <li key={project.key}>
            <ProjectIdeaCard project={project} startedCount={started[project.key]} onStart={() => onStart(project.key)} />
          </li>
        ))}
      </ul>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--line)] px-4 py-8 text-center text-sm text-[var(--muted)]">
          No projects in this filter yet. Try All projects or another area.
        </p>
      ) : null}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  compact,
  children,
}: {
  active: boolean;
  onClick: () => void;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors ${
        compact ? "text-xs" : ""
      } ${
        active
          ? "border-[var(--text)] bg-[var(--text)] text-[var(--bg)]"
          : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--line-strong)] hover:text-[var(--text)]"
      }`}
    >
      {children}
    </button>
  );
}

function ProjectIdeaCard({
  project,
  startedCount,
  onStart,
}: {
  project: CatalogProject;
  startedCount?: number;
  onStart: () => void;
}) {
  return (
    <article
      style={{ "--accent": project.accent } as React.CSSProperties}
      className="flex h-full flex-col rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 transition-colors hover:border-[var(--accent)] sm:p-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <LevelBadge level={project.level} />
        <span className="rounded-full border border-[var(--line)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[var(--muted)]">
          {project.format}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--accent)]">{project.pillarShort}</span>
      </div>
      <h3 className="mt-3 font-semibold leading-snug">{project.title}</h3>
      <p className="mt-1.5 flex-1 text-sm text-[var(--muted)]">{project.blurb}</p>
      <p className="mt-2 text-xs text-[var(--faint)]">{project.categoryTitle}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-3">
        <span className="text-xs text-[var(--muted)]">
          {startedCount != null && startedCount > 0 ? (
            <>
              <span className="font-medium text-[var(--text)]">{startedCount.toLocaleString()}</span> started
            </>
          ) : (
            "Be the first to start"
          )}
        </span>
        <button
          type="button"
          onClick={onStart}
          className="inline-flex min-h-11 items-center rounded-lg bg-[var(--accent)] px-3 text-sm font-semibold text-[var(--on-accent)] transition-opacity hover:opacity-90"
        >
          I&apos;m starting →
        </button>
      </div>
      <p className="mt-2 text-[11px] text-[var(--faint)]">Full walkthroughs and repos — coming soon</p>
    </article>
  );
}

function LevelBadge({ level }: { level: ProjectLevel }) {
  const tone =
    level === "beginner"
      ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
      : level === "advanced"
        ? "border-amber-500/40 text-amber-700 dark:text-amber-400"
        : "border-sky-500/40 text-sky-700 dark:text-sky-400";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${tone}`}>
      {level}
    </span>
  );
}
