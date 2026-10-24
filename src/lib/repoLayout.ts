// Three services and three shared libraries, kept in one repository or one per package.
// The dependency graph is real: what a change affects is the reverse-dependency closure of
// what it touches. Build minutes and how long each team takes to bump a library are
// illustrative.

export type Layout = "poly" | "mono";
export type ChangeId = "lib" | "web" | "api";
export type Design = { layout: Layout; affected: boolean; renovate: boolean; expand: boolean };

export const FIRST: Design = { layout: "poly", affected: false, renovate: false, expand: false };
export const FIXED: Design = { layout: "mono", affected: true, renovate: true, expand: true };

export type Pkg = { id: string; kind: "service" | "library"; deps: string[]; minutes: number; team: string };
export const PKGS: Pkg[] = [
  { id: "web", kind: "service", deps: ["auth", "ui", "api-types"], minutes: 6, team: "web" },
  { id: "api", kind: "service", deps: ["auth", "api-types"], minutes: 5, team: "platform" },
  { id: "billing", kind: "service", deps: ["auth"], minutes: 4, team: "billing" },
  { id: "auth", kind: "library", deps: [], minutes: 1, team: "platform" },
  { id: "ui", kind: "library", deps: [], minutes: 2, team: "web" },
  { id: "api-types", kind: "library", deps: [], minutes: 1, team: "platform" },
];
// Days each team takes to bump a library by hand, when nobody makes them.
export const BUMP_DAYS: Record<string, number> = { web: 2, platform: 6, billing: 34 };

export const CHANGES: { id: ChangeId; title: string; touches: string[]; breaking?: boolean }[] = [
  { id: "lib", title: "Fix a token-expiry bug in the auth library", touches: ["auth"] },
  { id: "web", title: "Change a button on the web app", touches: ["web"] },
  { id: "api", title: "Rename an API field and update the web app", touches: ["api-types", "api", "web"], breaking: true },
];

const byId = (id: string) => PKGS.find((p) => p.id === id)!;

// Everything that depends, directly or not, on the touched packages, plus themselves.
export function affected(touches: string[]) {
  const out = new Set(touches);
  let grew = true;
  while (grew) {
    grew = false;
    for (const p of PKGS) if (!out.has(p.id) && p.deps.some((d) => out.has(d))) {
      out.add(p.id);
      grew = true;
    }
  }
  return PKGS.filter((p) => out.has(p.id)).map((p) => p.id);
}

export type Result = {
  change: (typeof CHANGES)[number];
  affected: string[];
  prs: number;
  repos: number;
  built: string[];
  ciMinutes: number;
  rolloutDays: number;
  drift: string;
  deploys: number;
  errorMinutes: number;
  notes: string[];
};

export function evaluate(change: ChangeId, d: Design): Result {
  const c = CHANGES.find((x) => x.id === change)!;
  const aff = affected(c.touches);
  const services = aff.filter((id) => byId(id).kind === "service");
  const notes: string[] = [];
  let prs: number;
  let repos: number;
  let built: string[];
  let rolloutDays = 0;
  let drift = "one version everywhere";

  if (d.layout === "poly") {
    // Touched repos get a PR; every service that only consumes a changed library needs a bump PR.
    const bumps = services.filter((s) => !c.touches.includes(s));
    prs = c.touches.length + bumps.length;
    repos = prs;
    built = [...c.touches, ...bumps];
    if (bumps.length) {
      const days = bumps.map((s) => (d.renovate ? 1 : BUMP_DAYS[byId(s).team]));
      rolloutDays = Math.max(...days);
      drift = d.renovate ? "versions agree within a day" : `old and new ${c.touches.join(", ")} in production for ${rolloutDays} days`;
      notes.push(d.renovate ? `a bot opens ${bumps.length} bump PRs the day the library is published` : `${bumps.length} teams bump the library when they get to it`);
    }
    if (c.touches.some((t) => byId(t).kind === "library")) notes.push("the library is published as a new version first");
  } else {
    prs = 1;
    repos = 1;
    built = d.affected ? aff : PKGS.map((p) => p.id);
    notes.push(d.affected ? `the build tool follows the graph: ${aff.length} of ${PKGS.length} packages` : "CI builds and tests every package on every change");
  }
  const ciMinutes = built.reduce((a, id) => a + byId(id).minutes, 0);

  // Deploys are never atomic: services roll out one after another.
  let deploys = services.length;
  let errorMinutes = 0;
  if (c.breaking) {
    if (d.expand) {
      deploys = services.length + 1;
      prs += d.layout === "poly" ? 2 : 1;
      notes.push("add the new field, move the web app over, then remove the old field later");
    } else {
      errorMinutes = d.layout === "poly" ? 25 : 6;
      notes.push(d.layout === "poly" ? "api ships first; the old web app reads a missing field until web ships" : "one commit, but api and web pods still roll out at different times");
    }
  }
  return { change: c, affected: aff, prs, repos, built, ciMinutes, rolloutDays, drift, deploys, errorMinutes, notes };
}

export function all(d: Design) {
  return CHANGES.map((c) => evaluate(c.id, d));
}
