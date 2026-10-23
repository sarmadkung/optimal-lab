// Case study: meeting notes and action items. One 60-minute product meeting with eight
// real action items and two remarks that only sound like them. What each model extracts
// is illustrative; speaker attribution, owner lookup in the directory, task creation,
// timing and cost really run.

export const MINUTES = 60;
export const WORDS_PER_MIN = 150;
export const MEETINGS_PER_MONTH = 1200;
export const ATTENDEES = ["Ana", "Ben", "Lee", "Priya", "Sam K"];
export const DIRECTORY = [
  { id: "u12", name: "Ana Lopez" },
  { id: "u31", name: "Ben Ito" },
  { id: "u44", name: "Lee Park" },
  { id: "u52", name: "Priya Nair" },
  { id: "u07", name: "Sam Reyes" }, // listed first, and not in the meeting
  { id: "u63", name: "Sam K" },
];

type Line = { id: string; speaker: string; said: string; owners: string[]; real: boolean; namedOwner: boolean; small: boolean; large: boolean };
export const LINES: Line[] = [
  { id: "a1", speaker: "Priya", said: "Priya will update the pricing page by Friday.", owners: ["Priya"], real: true, namedOwner: true, small: true, large: true },
  { id: "a2", speaker: "Sam K", said: "I'll draft the launch email.", owners: ["Sam K"], real: true, namedOwner: false, small: true, large: true },
  { id: "a3", speaker: "Ana", said: "Ben, can you chase legal on the contract? (Ben: yes.)", owners: ["Ben"], real: true, namedOwner: true, small: true, large: true },
  { id: "a4", speaker: "Ben", said: "I can take bug triage this week.", owners: ["Ben"], real: true, namedOwner: false, small: false, large: true },
  { id: "a5", speaker: "Ana", said: "Sam, please check the analytics numbers before Tuesday.", owners: ["Sam"], real: true, namedOwner: true, small: true, large: true },
  { id: "a6", speaker: "Lee", said: "Lee to book the offsite venue.", owners: ["Lee"], real: true, namedOwner: true, small: true, large: true },
  { id: "a7", speaker: "Ana", said: "I'll send the notes to the board.", owners: ["Ana"], real: true, namedOwner: false, small: true, large: true },
  { id: "a8", speaker: "Priya", said: "Priya and Ben, let's review the hiring plan together.", owners: ["Priya", "Ben"], real: true, namedOwner: true, small: false, large: true },
  { id: "f1", speaker: "Lee", said: "We should revisit the logo someday.", owners: [], real: false, namedOwner: false, small: true, large: true },
  { id: "f2", speaker: "Ben", said: "Maybe someone could look at onboarding?", owners: [], real: false, namedOwner: false, small: true, large: false },
];

export type ModelId = "small" | "large";
export const MODELS: { id: ModelId; label: string; pricePerMIn: number; pricePerMOut: number; seconds: number }[] = [
  { id: "small", label: "Small model", pricePerMIn: 0.3, pricePerMOut: 1.2, seconds: 15 },
  { id: "large", label: "Large model", pricePerMIn: 3, pricePerMOut: 15, seconds: 40 },
];
export const ASR = { perMin: 0.006, realtimeFactor: 0.1, diarizePerMin: 0.002 };
export type Design = { diarize: boolean; model: ModelId; resolve: boolean; confirm: boolean };

// "I'll …" needs to know who was speaking; a name needs a person.
function ownerOf(l: Line, d: Design) {
  if (!l.real) return { ids: [] as string[], why: "no owner" };
  if (!l.namedOwner && !d.diarize) return { ids: [], why: "“I” with no speaker label" };
  const ids = l.owners.map((name) => {
    const pool = d.resolve ? DIRECTORY.filter((p) => ATTENDEES.some((a) => p.name.startsWith(a))) : DIRECTORY;
    const hit = pool.find((p) => p.name === name || p.name.startsWith(name + " "));
    return hit?.id ?? null;
  });
  return { ids: ids.filter((x): x is string => !!x), why: "" };
}
// who was actually meant: the Sam in the meeting
const truthIds = (l: Line) => l.owners.map((n) => (n === "Sam" ? "u63" : DIRECTORY.find((p) => p.name === n || p.name.startsWith(n + " "))!.id));

export function run(d: Design) {
  const extracted = LINES.filter((l) => (d.model === "small" ? l.small : l.large));
  const tasks = extracted
    .filter((l) => !(d.confirm && !l.real)) // the host deletes the non-actions in the recap
    .map((l) => {
      const o = ownerOf(l, d);
      const want = l.real ? truthIds(l) : [];
      const status = !l.real ? "false" : o.ids.length === 0 ? "unassigned" : o.ids.slice().sort().join() === want.slice().sort().join() ? "right" : "wrong";
      return { l, owners: o.ids, why: o.why, status: status as "right" | "wrong" | "unassigned" | "false" };
    });
  const missed = LINES.filter((l) => l.real && !extracted.includes(l));
  const m = MODELS.find((x) => x.id === d.model)!;
  const tokensIn = MINUTES * WORDS_PER_MIN * 1.33 + 800;
  const asrCost = MINUTES * (ASR.perMin + (d.diarize ? ASR.diarizePerMin : 0));
  const llmCost = (tokensIn * m.pricePerMIn + 900 * m.pricePerMOut) / 1e6;
  return {
    tasks,
    missed,
    right: tasks.filter((t) => t.status === "right").length,
    wrong: tasks.filter((t) => t.status === "wrong").length,
    unassigned: tasks.filter((t) => t.status === "unassigned").length,
    falseTasks: tasks.filter((t) => t.status === "false").length,
    perMeeting: asrCost + llmCost,
    perMonth: (asrCost + llmCost) * MEETINGS_PER_MONTH,
    minutesToRecap: MINUTES * ASR.realtimeFactor + m.seconds / 60 + (d.confirm ? 2 : 0),
    tokensIn: Math.round(tokensIn),
  };
}

export const REAL_ITEMS = LINES.filter((l) => l.real).length;
export const nameOf = (id: string) => DIRECTORY.find((p) => p.id === id)?.name ?? id;
