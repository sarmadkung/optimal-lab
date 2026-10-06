// Pure traces for three DSA pattern sessions. Each function returns one frame per step,
// so a demo can play them back and a reader can check every number by hand.
// Problems follow optimal-round: 009 Container With Most Water (two pointers),
// 005 Group Anagrams (hash map), 062 Daily Temperatures (monotonic stack).

// ---------------------------------------------------------------- two pointers

export const HEIGHT_PRESETS: { id: string; label: string; heights: number[] }[] = [
  { id: "classic", label: "1 8 6 2 5 4 8 3 7", heights: [1, 8, 6, 2, 5, 4, 8, 3, 7] },
  { id: "flat", label: "4 4 4 4", heights: [4, 4, 4, 4] },
  { id: "peak", label: "2 3 4 5 18 17 6", heights: [2, 3, 4, 5, 18, 17, 6] },
];

export type ContainerFrame = {
  l: number;
  r: number;
  area: number;
  best: number;
  bestPair: [number, number];
  /** which pointer moves next, or null when they have met */
  move: "l" | "r" | null;
};

export function containerTrace(h: number[]): ContainerFrame[] {
  const frames: ContainerFrame[] = [];
  let l = 0;
  let r = h.length - 1;
  let best = -1;
  let bestPair: [number, number] = [0, h.length - 1];
  while (l < r) {
    const area = Math.min(h[l], h[r]) * (r - l);
    if (area > best) {
      best = area;
      bestPair = [l, r];
    }
    // Moving the taller line can only shrink the width and never raise the shorter side,
    // so the shorter line is the only one worth replacing.
    const move = h[l] <= h[r] ? "l" : "r";
    frames.push({ l, r, area, best, bestPair, move });
    if (move === "l") l++;
    else r--;
  }
  frames.push({ l, r, area: 0, best, bestPair, move: null });
  return frames;
}

/** Pairs a brute-force scan would check. */
export const pairCount = (n: number) => (n * (n - 1)) / 2;

// ---------------------------------------------------------------- hash map grouping

export const WORDS = ["eat", "tea", "tan", "ate", "nat", "bat"];

export type KeyKind = "sorted" | "counts";

export function keyOf(word: string, kind: KeyKind) {
  if (kind === "sorted") return [...word].sort().join("");
  const counts = new Map<string, number>();
  for (const c of word) counts.set(c, (counts.get(c) ?? 0) + 1);
  return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([c, n]) => `${c}${n}`).join("");
}

export type GroupFrame = {
  /** index of the word just placed; -1 before the first */
  i: number;
  key: string | null;
  /** true when the key was already in the map */
  found: boolean;
  buckets: { key: string; words: string[] }[];
};

export function groupTrace(words = WORDS, kind: KeyKind = "sorted"): GroupFrame[] {
  const map = new Map<string, string[]>();
  const frames: GroupFrame[] = [{ i: -1, key: null, found: false, buckets: [] }];
  words.forEach((w, i) => {
    const key = keyOf(w, kind);
    const found = map.has(key);
    map.set(key, [...(map.get(key) ?? []), w]);
    frames.push({ i, key, found, buckets: [...map].map(([k, ws]) => ({ key: k, words: ws })) });
  });
  return frames;
}

// ---------------------------------------------------------------- monotonic stack

export const TEMPS = [73, 74, 75, 71, 69, 72, 76, 73];

export type StackFrame = {
  /** day being read; TEMPS.length when finished */
  i: number;
  /** indices popped while reading this day, each answered with i - index */
  popped: number[];
  /** indices on the stack after this day is pushed (bottom first) */
  stack: number[];
  answer: (number | null)[];
  /** pushes + pops so far: never more than 2n */
  ops: number;
};

export function dailyTemperatures(t = TEMPS): StackFrame[] {
  const answer: (number | null)[] = t.map(() => null);
  const stack: number[] = [];
  const frames: StackFrame[] = [{ i: -1, popped: [], stack: [], answer: [...answer], ops: 0 }];
  let ops = 0;
  t.forEach((temp, i) => {
    const popped: number[] = [];
    while (stack.length && t[stack[stack.length - 1]] < temp) {
      const j = stack.pop()!;
      answer[j] = i - j;
      popped.push(j);
      ops++;
    }
    stack.push(i);
    ops++;
    frames.push({ i, popped, stack: [...stack], answer: [...answer], ops });
  });
  // Days still on the stack never see a warmer day.
  const left = [...stack];
  left.forEach((j) => (answer[j] = 0));
  frames.push({ i: t.length, popped: left, stack: [], answer: [...answer], ops });
  return frames;
}
