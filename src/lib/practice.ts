// The Practice section: DSA problems from optimal-round, grouped by pattern.
// The statements live in src/data/practice.json, copied by `node scripts/sync-practice.mjs`
// from ../optimal-round. Only problem statements are copied; solutions are written by hand
// in that repo and are never brought here. Import this from server components only: the
// JSON is large and should not ship to the browser.

import data from "@/data/practice.json";

export type Difficulty = "Easy" | "Medium" | "Hard";

export type Problem = {
  number: string;
  title: string;
  difficulty: Difficulty;
  topic: string;
  problem: string;
  constraints: string[];
  examples: string[];
  edgeCases: string[];
  complexity: { naive: string | null; target: string | null };
  slug: string;
  file: string;
};

export type Topic = {
  slug: string;
  folder: string;
  title: string;
  problems: Problem[];
  /** Sessions that teach this pattern, as "<track>/<session>". */
  sessions: string[];
  /** Explainer folder in optimal-round/algorithms, if there is one. */
  explainer?: string;
};

export const REPO = "https://github.com/sarmadkung/optimal-round";

// folder → how it links to the rest of the site
const LINKS: Record<string, { sessions?: string[]; explainer?: string }> = {
  "01-arrays-hashing": { sessions: ["dsa/hash-map", "dsa/two-sum"] },
  "02-two-pointers": { sessions: ["dsa/two-pointers"], explainer: "03-two-pointers" },
  "03-sliding-window": { sessions: ["dsa/sliding-window"], explainer: "05-sliding-window" },
  "04-stack": { sessions: ["dsa/monotonic-stack"], explainer: "10-monotonic-stack" },
  "05-binary-search": { sessions: ["dsa/binary-search"], explainer: "07-binary-search" },
  "06-linked-list": { explainer: "04-fast-and-slow-pointers" },
  "08-graphs": { sessions: ["dsa/bfs-vs-dfs"], explainer: "11-bfs-and-dfs" },
  "10-backtracking": { explainer: "17-backtracking" },
  "11-intervals-greedy": { explainer: "22-interval-merging" },
  "12-math-bits": { explainer: "20-xor-tricks" },
  "13-heap-priority-queue": { explainer: "23-heap-top-k" },
  "18-union-find": { explainer: "13-union-find" },
  "19-advanced-graphs": { explainer: "14-dijkstra" },
  "21-prefix-sum": { explainer: "06-prefix-sum" },
  "22-number-theory": { explainer: "18-sieve-of-eratosthenes" },
};

export const TOPICS: Topic[] = (data.topics as { folder: string; problems: Problem[] }[]).map((t) => ({
  slug: t.folder.replace(/^\d+-/, ""),
  folder: t.folder,
  title: t.problems[0]?.topic ?? t.folder,
  problems: t.problems,
  sessions: LINKS[t.folder]?.sessions ?? [],
  explainer: LINKS[t.folder]?.explainer,
}));

export const PROBLEM_COUNT = TOPICS.reduce((s, t) => s + t.problems.length, 0);

export const getTopic = (slug: string) => TOPICS.find((t) => t.slug === slug);

export function getProblem(topicSlug: string, problemSlug: string) {
  const topic = getTopic(topicSlug);
  const index = topic?.problems.findIndex((p) => p.slug === problemSlug) ?? -1;
  if (!topic || index < 0) return undefined;
  return { topic, problem: topic.problems[index], prev: topic.problems[index - 1], next: topic.problems[index + 1] };
}

export const practiceHref = (topic: Topic) => `/practice/${topic.slug}`;
export const problemHref = (topic: Topic, p: Problem) => `/practice/${topic.slug}/${p.slug}`;
export const githubHref = (p: Problem) => `${REPO}/blob/main/${p.file}`;
export const explainerHref = (t: Topic) => (t.explainer ? `${REPO}/tree/main/algorithms/${t.explainer}` : undefined);

/** Topics whose pattern this session teaches. */
export const topicsForSession = (trackId: string, sessionId: string) => TOPICS.filter((t) => t.sessions.includes(`${trackId}/${sessionId}`));

export function countByDifficulty(problems: Problem[]) {
  const c: Record<Difficulty, number> = { Easy: 0, Medium: 0, Hard: 0 };
  for (const p of problems) c[p.difficulty]++;
  return c;
}

export const DIFFICULTY_COLOR: Record<Difficulty, string> = { Easy: "var(--good)", Medium: "var(--auto)", Hard: "var(--bad)" };

/** Progress key for a problem, shared by every page that shows its done mark. */
export const problemKey = (p: Problem) => `problem:${p.number}`;
