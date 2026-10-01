// Binary search on a sorted list. Each probe keeps one half and drops the other.

export const SORTED = [3, 7, 11, 14, 19, 22, 28, 35, 41, 50];

export type Verdict = "low" | "high" | "found" | "missing";

export type SearchFrame = {
  lo: number;
  hi: number;
  mid: number;
  value: number | null;
  verdict: Verdict;
};

export function search(target: number, nums = SORTED): SearchFrame[] {
  const frames: SearchFrame[] = [];
  let lo = 0;
  let hi = nums.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const value = nums[mid];
    const verdict: Verdict = value === target ? "found" : value < target ? "low" : "high";
    frames.push({ lo, hi, mid, value, verdict });
    if (verdict === "found") return frames;
    if (verdict === "low") lo = mid + 1;
    else hi = mid - 1;
  }
  frames.push({ lo, hi: lo - 1, mid: -1, value: null, verdict: "missing" });
  return frames;
}

// A linear scan stops at the match, or reads every cell if the target is absent.
export function linearChecks(target: number, nums = SORTED) {
  const at = nums.indexOf(target);
  return at === -1 ? nums.length : at + 1;
}
