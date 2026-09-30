// Decoding math for the next-token demo. Kept free of React so it is easy to check.

export type Candidate = { token: string; logit: number };

export type Row = {
  token: string;
  logit: number;
  base: number; // softmax at T = 1
  tempered: number; // softmax at the chosen temperature
  kept: boolean; // survived top-k and top-p
  cutBy: "greedy" | "top-k" | "top-p" | null;
  final: number; // renormalised over kept tokens, 0 if cut
};

export function softmax(logits: number[], temperature: number): number[] {
  // T = 0 means greedy: all mass on the top logit
  if (temperature <= 0) {
    const max = Math.max(...logits);
    const idx = logits.indexOf(max);
    return logits.map((_, i) => (i === idx ? 1 : 0));
  }
  const scaled = logits.map((l) => l / temperature);
  const max = Math.max(...scaled); // subtract max so exp() cannot overflow
  const exps = scaled.map((s) => Math.exp(s - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

export function decode(
  candidates: Candidate[],
  temperature: number,
  topK: number,
  topP: number,
): Row[] {
  const logits = candidates.map((c) => c.logit);
  const base = softmax(logits, 1);
  const tempered = softmax(logits, temperature);

  // rank by tempered probability, highest first
  const order = tempered.map((p, i) => ({ p, i })).sort((a, b) => b.p - a.p);

  const cutBy: Row["cutBy"][] = candidates.map(() => null);
  let cumulative = 0;
  order.forEach(({ p, i }, rank) => {
    if (temperature <= 0 && rank > 0) {
      cutBy[i] = "greedy";
      return;
    }
    if (rank >= topK) {
      cutBy[i] = "top-k";
      return;
    }
    // top-p keeps the smallest set whose cumulative mass reaches P;
    // the token that crosses the line is kept
    if (topP < 1 && cumulative >= topP) cutBy[i] = "top-p";
    cumulative += p;
  });

  const keptMass = tempered.reduce((s, p, i) => (cutBy[i] ? s : s + p), 0);

  return candidates.map((c, i) => ({
    token: c.token,
    logit: c.logit,
    base: base[i],
    tempered: tempered[i],
    kept: cutBy[i] === null,
    cutBy: cutBy[i],
    final: cutBy[i] ? 0 : tempered[i] / keptMass,
  }));
}

// Pick one row by its final probability. `r` is a uniform number in [0, 1).
export function sample(rows: Row[], r: number): number {
  let acc = 0;
  for (let i = 0; i < rows.length; i++) {
    if (!rows[i].kept) continue;
    acc += rows[i].final;
    if (r < acc) return i;
  }
  return rows.findLastIndex((row) => row.kept);
}

export const pct = (p: number) =>
  p >= 0.1 ? `${(p * 100).toFixed(1)}%` : p >= 0.001 ? `${(p * 100).toFixed(2)}%` : "<0.1%";
