// Rules and context files. An agent works in a pnpm monorepo it has never seen. Nine
// mistakes are likely without guidance; each section of an AGENTS.md-style file
// prevents some of them, costs tokens on every turn, and an old pasted style guide
// contradicts the newer conventions. Which mistakes are likely is illustrative; which
// section covers which mistake, the contradiction, nested files and the token cost run.

export type SectionId = "commands" | "layout" | "conventions" | "donttouch" | "workflow" | "history" | "styleguide" | "nested";
export type Section = { id: SectionId; title: string; tokens: number; text: string; covers: number[]; note?: string };

export const SECTIONS: Section[] = [
  { id: "commands", title: "Commands", tokens: 120, text: "Use pnpm. Test one package: pnpm --filter <pkg> test. Before finishing: pnpm typecheck && pnpm --filter <pkg> test.", covers: [1, 2, 8] },
  { id: "layout", title: "Layout", tokens: 90, text: "apps/web is the site, packages/ui holds shared components, packages/api the server.", covers: [5] },
  { id: "conventions", title: "Conventions", tokens: 110, text: "Named exports only. Dates go through packages/utils/date.ts; don't add a date library.", covers: [4, 7] },
  { id: "donttouch", title: "Don't edit", tokens: 50, text: "packages/api/src/gen/ is generated from openapi.yaml: edit the spec, then pnpm gen.", covers: [3] },
  { id: "workflow", title: "Workflow", tokens: 70, text: "Every change to a package needs a changeset (pnpm changeset).", covers: [6] },
  { id: "history", title: "Project history", tokens: 600, text: "In 2019 we moved from Flow to TypeScript, then from Lerna to pnpm workspaces…", covers: [], note: "true, and no help with any task" },
  { id: "styleguide", title: "Pasted 2021 style guide", tokens: 3200, text: "…Components use default exports. Prefer moment for dates…", covers: [], note: "contradicts Conventions on exports and dates" },
  { id: "nested", title: "apps/web/AGENTS.md", tokens: 80, text: "Pages are server components. Fetch on the server; no useEffect for data.", covers: [9], note: "loaded only when working in apps/web" },
];

export const MISTAKES: { n: number; text: string }[] = [
  { n: 1, text: "runs npm install, writing a second lockfile" },
  { n: 2, text: "runs the whole 12-minute test suite after every edit" },
  { n: 3, text: "edits the generated API client instead of openapi.yaml" },
  { n: 4, text: "adds a new date library" },
  { n: 5, text: "puts a shared component inside apps/web" },
  { n: 6, text: "forgets the changeset, so CI fails" },
  { n: 7, text: "uses a default export" },
  { n: 8, text: "says it's done without running the type checker" },
  { n: 9, text: "fetches page data in useEffect in a server-rendered page" },
];

export const TURNS = 40; // model requests in a typical session
export const PRICE_PER_M = { fresh: 3, cached: 0.3 };

export function evaluate(on: Set<SectionId>) {
  const covered = new Set(SECTIONS.filter((s) => on.has(s.id)).flatMap((s) => s.covers));
  // the old style guide says the opposite on exports and dates; the agent may follow either
  const contradicted = on.has("styleguide") ? [4, 7].filter((n) => covered.has(n)) : [];
  const conflicted = on.has("styleguide") ? [4, 7] : [];
  const made = MISTAKES.filter((m) => !covered.has(m.n) || conflicted.includes(m.n));
  const tokens = SECTIONS.filter((s) => on.has(s.id)).reduce((a, s) => a + s.tokens, 0);
  const perSession = tokens * TURNS;
  return {
    made,
    prevented: MISTAKES.length - made.length,
    contradicted,
    tokens,
    perSession,
    cost: { fresh: (perSession / 1e6) * PRICE_PER_M.fresh, cached: (perSession / 1e6) * PRICE_PER_M.cached },
  };
}

export const FIRST: SectionId[] = [];
export const BLOATED: SectionId[] = ["commands", "layout", "conventions", "history", "styleguide"];
export const FIXED: SectionId[] = ["commands", "layout", "conventions", "donttouch", "workflow", "nested"];
