// Case study: a daily digest. Every morning a workflow gathers yesterday's updates from
// GitHub, Jira, PagerDuty and Slack, has a model summarise them, and sends each of 12
// people in three time zones a digest at 8 a.m. Yesterday's items, which ones matter
// and what the model adds on its own are seeded; fetching, the outage and retry, the
// token budget, deduplication, the citation check and delivery times run here.

export type Source = "GitHub" | "Jira" | "PagerDuty" | "Slack";
export const SOURCES: Source[] = ["GitHub", "Jira", "PagerDuty", "Slack"];
export type Item = { id: string; source: Source; tokens: number; important: boolean; about: string | null; text: string };

const VOLUME: Record<Source, number> = { GitHub: 50, Jira: 40, PagerDuty: 15, Slack: 35 };
const IMPORTANT: Record<Source, { at: number; text: string; about?: string }[]> = {
  GitHub: [
    { at: 4, text: "PR #812 (payments retry) waiting on your review for 2 days" },
    { at: 21, text: "PR #820 merged: new export API", about: "export" },
    { at: 37, text: "Dependabot: critical fix for the image library" },
  ],
  Jira: [
    { at: 6, text: "OPS-311 checkout errors moved to In progress", about: "INC-77" },
    { at: 18, text: "PLAT-90 database upgrade scheduled for Thursday" },
    { at: 33, text: "SUP-412 enterprise customer escalated" },
  ],
  PagerDuty: [
    { at: 3, text: "INC-77: checkout errors 14:10–14:45, resolved", about: "INC-77" },
    { at: 12, text: "INC-78: search latency alert, still open" },
  ],
  Slack: [
    { at: 5, text: "#incidents: INC-77 postmortem doc is up", about: "INC-77" },
    { at: 14, text: "#product: pricing page change ships Monday" },
    { at: 22, text: "#eng: export API is live, docs to follow", about: "export" },
    { at: 30, text: "#eng: staging is down until noon" },
  ],
};

export const ITEMS: Item[] = SOURCES.flatMap((s) =>
  Array.from({ length: VOLUME[s] }, (_, i) => {
    const imp = IMPORTANT[s].find((x) => x.at === i);
    return { id: `${s[0]}${i + 1}`, source: s, tokens: s === "Slack" ? 520 : s === "Jira" ? 380 : 300, important: !!imp, about: imp?.about ?? null, text: imp?.text ?? `${s} update ${i + 1}` };
  }),
);

export const BUDGET = 32_000; // tokens of input the summary call allows
export const DOWN_SOURCE: Source = "Jira"; // returns 503 at 07:00 UTC, back by 07:20
export const PEOPLE = [
  { city: "San Francisco", offset: -8, count: 4 },
  { city: "London", offset: 0, count: 4 },
  { city: "Bengaluru", offset: 5.5, count: 4 },
];
// what the model writes that no item says (illustrative): one per summary call, roughly
export const INVENTED = ["“v2.3 shipped to all customers” (nothing shipped)", "“INC-78 resolved” (it's still open)"];

export type Design = { retry: boolean; mapReduce: boolean; dedupe: boolean; cite: boolean; localTime: boolean };
export const FIRST: Design = { retry: false, mapReduce: false, dedupe: false, cite: false, localTime: false };
export const FIXED: Design = { retry: true, mapReduce: true, dedupe: true, cite: true, localTime: true };

export function digest(d: Design) {
  // 1. fetch: one source is down at the first try
  const fetched = d.retry ? ITEMS : ITEMS.filter((i) => i.source !== DOWN_SOURCE);
  const notice = !d.retry ? null : `${DOWN_SOURCE} failed at 07:00 and was fetched on retry at 07:20`;

  // 2. summarise: one prompt with everything, cut at the budget, or one per source then combine
  let seen: Item[];
  let calls: number;
  if (d.mapReduce) {
    seen = fetched;
    calls = SOURCES.length + 1;
  } else {
    seen = [];
    let used = 0;
    for (const i of fetched) {
      if (used + i.tokens > BUDGET) break;
      seen.push(i);
      used += i.tokens;
    }
    calls = 1;
  }
  const dropped = fetched.filter((i) => !seen.includes(i));

  // 3. bullets: one per important item seen, plus what the model adds
  let bullets = seen.filter((i) => i.important).map((i) => ({ text: i.text, cites: [i.id], about: i.about, invented: false }));
  const invented = (d.mapReduce ? INVENTED.slice(0, 2) : INVENTED.slice(0, 1)).map((t) => ({ text: t, cites: [] as string[], about: null, invented: true }));
  bullets = [...bullets, ...invented];
  if (d.dedupe) {
    const merged: typeof bullets = [];
    for (const b of bullets) {
      const same = b.about && merged.find((m) => m.about === b.about);
      if (same) same.cites.push(...b.cites);
      else merged.push({ ...b, cites: [...b.cites] });
    }
    bullets = merged;
  }
  if (d.cite) bullets = bullets.filter((b) => b.cites.length && b.cites.every((c) => ITEMS.some((i) => i.id === c)));

  // 4. delivery: one run at 08:00 UTC, or 08:00 in each person's time zone
  const deliveries = PEOPLE.map((p) => {
    const local = d.localTime ? 8 : (8 + p.offset + 24) % 24;
    return { ...p, local, onTime: Math.abs(local - 8) <= 0.5 };
  });

  const importantTotal = ITEMS.filter((i) => i.important).length;
  const coveredIds = new Set(bullets.flatMap((b) => b.cites));
  const covered = ITEMS.filter((i) => i.important && coveredIds.has(i.id)).length;
  const groups = new Map<string, number>();
  bullets.forEach((b) => b.about && groups.set(b.about, (groups.get(b.about) ?? 0) + 1));
  return {
    bullets,
    calls,
    notice,
    importantTotal,
    covered,
    missing: ITEMS.filter((i) => i.important && !coveredIds.has(i.id)),
    dropped: dropped.length,
    silentGap: !d.retry,
    invented: bullets.filter((b) => b.invented).length,
    duplicates: [...groups.values()].reduce((a, n) => a + n - 1, 0),
    deliveries,
    onTime: deliveries.reduce((a, p) => a + (p.onTime ? p.count : 0), 0),
    people: PEOPLE.reduce((a, p) => a + p.count, 0),
  };
}
