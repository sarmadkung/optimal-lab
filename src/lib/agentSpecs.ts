// Writing specs for coding agents. One task, "add rate limiting to the login endpoint",
// with four optional parts of the spec. What the agent does when a part is missing is
// illustrative but typical; the spec text, the checklist that detects each part and the
// totals really run.

export type Part = "context" | "done" | "constraints" | "scope";
export const GOAL = "Add rate limiting to the login endpoint, to stop password guessing.";
export const PARTS: { id: Part; label: string; text: string; detect: RegExp; missing: string }[] = [
  {
    id: "context",
    label: "Where the code is",
    text: "Login is api/src/routes/auth/login.ts. Rate limiting already exists in api/src/middleware/limit.ts.",
    detect: /\b[\w-]+(\/[\w.-]+)+\.\w+\b/,
    missing: "Searches for “login”, finds admin/login.ts first and adds the limit there. The public login is untouched.",
  },
  {
    id: "done",
    label: "When it's done",
    text: "Done when: the 6th failed attempt from one IP within 15 minutes gets a 429, and `npm test auth` passes with a new test for it.",
    detect: /\bdone when\b|acceptance|\btests? pass/i,
    missing: "Guesses 100 requests a minute, writes no test, and stops when it compiles.",
  },
  {
    id: "constraints",
    label: "Rules to follow",
    text: "Use the existing limit middleware and its Redis store. No new dependencies. Don't change the response body.",
    detect: /\bno new dependenc|\bdon'?t\b|\bdo not\b|\bmust not\b/i,
    missing: "Adds a rate-limit package with an in-memory store, which each of the 4 servers keeps separately: 4× the limit.",
  },
  {
    id: "scope",
    label: "What to leave alone",
    text: "Out of scope: the admin login, and refactoring the auth middleware.",
    detect: /\bout of scope\b|\bleave\b.*\balone\b|\bnot part of\b/i,
    missing: "Also “tidies” the auth middleware it read on the way: 140 extra lines in the diff.",
  },
];

export type Spec = Record<Part, boolean>;
export const EMPTY: Spec = { context: false, done: false, constraints: false, scope: false };
export const FULL: Spec = { context: true, done: true, constraints: true, scope: true };

export function specText(s: Spec) {
  return [GOAL, ...PARTS.filter((p) => s[p.id]).map((p) => p.text)].join("\n");
}

// The checklist reads the text, not the toggles.
export function lint(text: string) {
  return PARTS.map((p) => ({ part: p, found: p.detect.test(text) }));
}

export function outcome(s: Spec) {
  const files = 2 + (s.context ? 0 : 1) + (s.constraints ? 0 : 2) + (s.scope ? 0 : 2);
  const lines = 46 + (s.context ? 0 : 30) + (s.constraints ? 0 : 38) + (s.scope ? 0 : 140) - (s.done ? 0 : 22);
  const deps = s.constraints ? 0 : 1;
  const rounds = 1 + (s.context ? 0 : 1) + (s.done ? 0 : 1) + (s.constraints ? 0 : 1);
  const reviewMin = rounds * 10 + Math.round(lines / 20);
  const works = s.context && s.done && s.constraints;
  return { files, lines, deps, rounds, reviewMin, works, test: s.done };
}
