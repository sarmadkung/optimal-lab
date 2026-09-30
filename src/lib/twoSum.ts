// Step-by-step traces of three Two Sum solutions, so the page can replay them.

export type Approach = "brute" | "twoPointers" | "hashMap";

export type Frame = {
  arr: number[]; // array as shown at this step (the sort approach reorders it)
  orig: number[]; // original index of each shown value
  pointers: { label: string; index: number }[];
  checked: number[]; // indices already ruled out, drawn dimmed
  map: [number, number][]; // hash map contents: value -> original index
  note: string;
  ops: number; // comparisons or lookups so far
  found: [number, number] | null; // original indices of the answer
};

export const ARRAY = [4, 11, 7, 1, 15, 9, 3, 12];
export const TARGET = 24;

const ids = (a: number[]) => a.map((_, i) => i);

function brute(nums: number[], target: number): Frame[] {
  const frames: Frame[] = [];
  let ops = 0;
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      ops++;
      const sum = nums[i] + nums[j];
      const hit = sum === target;
      frames.push({
        arr: nums,
        orig: ids(nums),
        pointers: [
          { label: "i", index: i },
          { label: "j", index: j },
        ],
        checked: ids(nums).filter((k) => k < i),
        map: [],
        note: `${nums[i]} + ${nums[j]} = ${sum}${hit ? " ✓" : ` ≠ ${target}`}`,
        ops,
        found: hit ? [i, j] : null,
      });
      if (hit) return frames;
    }
  }
  return frames;
}

function twoPointers(nums: number[], target: number): Frame[] {
  const pairs = nums.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const arr = pairs.map((p) => p[0]);
  const orig = pairs.map((p) => p[1]);
  // charge the sort as n·log2(n) comparisons so the counter stays honest
  const sortCost = Math.round(nums.length * Math.log2(nums.length));
  const frames: Frame[] = [
    {
      arr: nums,
      orig: ids(nums),
      pointers: [],
      checked: [],
      map: [],
      note: "First sort the array (keep each value's original index)",
      ops: 0,
      found: null,
    },
    {
      arr,
      orig,
      pointers: [],
      checked: [],
      map: [],
      note: `Sorted. Sorting costs about n·log n ≈ ${sortCost} comparisons`,
      ops: sortCost,
      found: null,
    },
  ];
  let ops = sortCost;
  let l = 0;
  let r = arr.length - 1;
  while (l < r) {
    ops++;
    const sum = arr[l] + arr[r];
    const hit = sum === target;
    const dimmed = ids(arr).filter((k) => k < l || k > r);
    frames.push({
      arr,
      orig,
      pointers: [
        { label: "L", index: l },
        { label: "R", index: r },
      ],
      checked: dimmed,
      map: [],
      note: hit
        ? `${arr[l]} + ${arr[r]} = ${sum} ✓`
        : sum < target
          ? `${arr[l]} + ${arr[r]} = ${sum} < ${target}, too small → move L right`
          : `${arr[l]} + ${arr[r]} = ${sum} > ${target}, too big → move R left`,
      ops,
      found: hit ? [orig[l], orig[r]].sort((a, b) => a - b) as [number, number] : null,
    });
    if (hit) return frames;
    if (sum < target) l++;
    else r--;
  }
  return frames;
}

function hashMap(nums: number[], target: number): Frame[] {
  const frames: Frame[] = [];
  const seen = new Map<number, number>();
  let ops = 0;
  for (let i = 0; i < nums.length; i++) {
    ops++;
    const need = target - nums[i];
    const j = seen.get(need);
    const hit = j !== undefined;
    frames.push({
      arr: nums,
      orig: ids(nums),
      pointers: [{ label: "i", index: i }],
      checked: ids(nums).filter((k) => k < i),
      map: [...seen.entries()],
      note: hit
        ? `need ${need}: it is in the map at index ${j} ✓`
        : `need ${need}: not in the map, so store ${nums[i]}`,
      ops,
      found: hit ? [j, i] : null,
    });
    if (hit) return frames;
    seen.set(nums[i], i);
  }
  return frames;
}

export const TRACES: Record<Approach, Frame[]> = {
  brute: brute(ARRAY, TARGET),
  twoPointers: twoPointers(ARRAY, TARGET),
  hashMap: hashMap(ARRAY, TARGET),
};

export const APPROACHES: {
  id: Approach;
  name: string;
  big: string;
  memory: string;
  idea: string;
  tradeOff: string;
}[] = [
  {
    id: "brute",
    name: "Check every pair",
    big: "O(n²)",
    memory: "O(1)",
    idea: "Try each number with every number after it.",
    tradeOff: "No extra memory, easy to get right. Falls over once n grows.",
  },
  {
    id: "twoPointers",
    name: "Sort + two pointers",
    big: "O(n log n)",
    memory: "O(n)",
    idea: "Sort, then squeeze in from both ends. Too small? Move left up. Too big? Move right down.",
    tradeOff: "Great when data is already sorted. Sorting costs time and loses the original order.",
  },
  {
    id: "hashMap",
    name: "One pass + hash map",
    big: "O(n)",
    memory: "O(n)",
    idea: "For each number, ask the map: have I already seen the number I need?",
    tradeOff: "Fastest. Pays for it with memory for the map.",
  },
];

// operation counts for the growth chart
export const growth = (n: number) => ({
  brute: (n * (n - 1)) / 2,
  twoPointers: n * Math.log2(Math.max(n, 2)) + n,
  hashMap: n,
});
