// Send a burst of requests, then let each server finish `rate` of them.
// Round robin ignores how busy a server is. Least connections does not.

export type Strategy = "roundRobin" | "least";

export const SERVERS = [
  { name: "A", rate: 1 },
  { name: "B", rate: 1 },
  { name: "C", rate: 3 },
];

export type BalanceFrame = {
  inflight: number[];
  assigned: number[];
};

export function simulate(strategy: Strategy, arrivals = 4, ticks = 6): BalanceFrame[] {
  const inflight = SERVERS.map(() => 0);
  let cursor = 0;
  const frames: BalanceFrame[] = [];
  for (let t = 0; t < ticks; t++) {
    const assigned: number[] = [];
    for (let a = 0; a < arrivals; a++) {
      const pick =
        strategy === "roundRobin"
          ? cursor++ % SERVERS.length
          : inflight.reduce((best, n, i) => (n < inflight[best] ? i : best), 0);
      inflight[pick]++;
      assigned.push(pick);
    }
    for (let i = 0; i < SERVERS.length; i++) inflight[i] = Math.max(0, inflight[i] - SERVERS[i].rate);
    frames.push({ inflight: [...inflight], assigned });
  }
  return frames;
}
