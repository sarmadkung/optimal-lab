// Fixed-size sliding window. The first window is summed in full.
// Every later window drops the cell that left and adds the cell that entered.

export const VALUES = [2, 1, 5, 1, 3, 2, 4];

export type WindowFrame = {
  start: number;
  sum: number;
  left: number | null;
  entered: number;
  best: number;
  bestStart: number;
};

export function trace(k: number, values = VALUES): WindowFrame[] {
  if (k < 1 || k > values.length) return [];
  const frames: WindowFrame[] = [];
  let sum = 0;
  for (let i = 0; i < k; i++) sum += values[i];
  let best = sum;
  let bestStart = 0;
  frames.push({ start: 0, sum, left: null, entered: values[k - 1], best, bestStart });
  for (let start = 1; start <= values.length - k; start++) {
    const left = values[start - 1];
    const entered = values[start + k - 1];
    sum = sum - left + entered;
    if (sum > best) {
      best = sum;
      bestStart = start;
    }
    frames.push({ start, sum, left, entered, best, bestStart });
  }
  return frames;
}

// Work to find the max window: re-adding every cell, versus one add and one drop per slide.
export function costs(n: number, k: number) {
  const windows = Math.max(0, n - k + 1);
  const naive = windows * k;
  const slide = windows === 0 ? 0 : k + (windows - 1) * 2;
  return { windows, naive, slide };
}
