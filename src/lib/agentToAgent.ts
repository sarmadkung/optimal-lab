// Agent-to-agent protocols. A travel assistant hands parts of a trip to three agents
// from other vendors: flights (quick), a hotel agent that works for a minute and then
// needs to ask which neighbourhood, and a visa agent that needs the traveller to sign
// in. The task lifecycle follows A2A's task states; the vendor agents' timings are
// illustrative, and the transitions, timeouts, polling and the client's handling run.

export type State = "submitted" | "working" | "input-required" | "auth-required" | "completed" | "failed" | "canceled";
export const TERMINAL: State[] = ["completed", "failed", "canceled"];
const NEXT: Record<State, State[]> = {
  submitted: ["working", "failed", "canceled"],
  working: ["working", "input-required", "auth-required", "completed", "failed", "canceled"],
  "input-required": ["working", "canceled", "failed"],
  "auth-required": ["working", "canceled", "failed"],
  completed: [],
  failed: [],
  canceled: [],
};
export const canMove = (a: State, b: State) => NEXT[a].includes(b);

export type Remote = { id: string; name: string; skill: string; script: { at: number; state: State; note: string }[]; needs?: "input" | "auth"; resumeFor: number };
export const REMOTES: Remote[] = [
  { id: "flights", name: "Flights agent", skill: "search-and-book-flights", script: [{ at: 0, state: "working", note: "searching 3 airlines" }, { at: 4, state: "completed", note: "booked LH 401, seat 23C" }], resumeFor: 0 },
  {
    id: "hotel", name: "Hotel agent", skill: "find-and-book-hotels",
    script: [{ at: 0, state: "working", note: "checking 40 hotels" }, { at: 30, state: "working", note: "12 match the dates and budget" }, { at: 60, state: "input-required", note: "Old town or near the conference centre?" }],
    needs: "input", resumeFor: 30,
  },
  { id: "visa", name: "Visa agent", skill: "apply-eta", script: [{ at: 0, state: "working", note: "checking entry rules" }, { at: 8, state: "auth-required", note: "sign in to the travel-authority account to submit" }], needs: "auth", resumeFor: 20 },
];

export type Style = "rest" | "poll" | "stream";
export type Design = { style: Style; relay: boolean };
export const FIRST: Design = { style: "rest", relay: false };
export const FIXED: Design = { style: "stream", relay: true };
export const REST_TIMEOUT = 30;
export const POLL_EVERY = 10;
export const USER_REPLY = 20; // seconds for the traveller to answer or sign in

export type Seen = { t: number; state: State; note: string };
export type Run = { r: Remote; seen: Seen[]; final: State; doneAt: number | null; silentFor: number; why: string };

export function run(r: Remote, d: Design): Run {
  // what the remote agent does, as A2A task states over time
  const timeline: Seen[] = r.script.map((s) => ({ t: s.at, state: s.state, note: s.note }));
  const asks = r.needs ? timeline[timeline.length - 1] : null;
  if (asks && d.relay && d.style !== "rest") {
    const answered = asks.t + (d.style === "poll" ? POLL_EVERY - (asks.t % POLL_EVERY || POLL_EVERY) : 0) + USER_REPLY;
    timeline.push({ t: answered, state: "working", note: r.needs === "input" ? "traveller: near the conference centre" : "traveller signed in" });
    timeline.push({ t: answered + r.resumeFor, state: "completed", note: r.needs === "input" ? "booked Hotel Kranz, 3 nights" : "ETA submitted, reference 4471" });
  }
  // every step must be a legal A2A transition
  timeline.reduce<State>((prev, s) => {
    if (prev !== s.state && !canMove(prev, s.state)) throw new Error(`illegal ${prev} → ${s.state}`);
    return s.state;
  }, "submitted");

  if (d.style === "rest") {
    // one synchronous call with a timeout; no way to say "working" or ask a question
    const end = timeline.find((s) => TERMINAL.includes(s.state) || s.state === "input-required" || s.state === "auth-required")!;
    if (end.state === "completed" && end.t <= REST_TIMEOUT) return { r, seen: [{ t: end.t, state: "completed", note: end.note }], final: "completed", doneAt: end.t, silentFor: end.t, why: "answered within the timeout" };
    if (end.t > REST_TIMEOUT) return { r, seen: [{ t: REST_TIMEOUT, state: "failed", note: "504 after 30 s" }], final: "failed", doneAt: null, silentFor: REST_TIMEOUT, why: `still working when the ${REST_TIMEOUT} s timeout hit` };
    return { r, seen: [{ t: end.t, state: "failed", note: r.needs === "auth" ? "401 Unauthorized" : "400: missing preference" }], final: "failed", doneAt: null, silentFor: end.t, why: "the error has nowhere to go but the log" };
  }

  // A2A: the client sees states by polling tasks/get, or as they're streamed
  const seen: Seen[] = timeline.map((s) => ({ ...s, t: d.style === "poll" ? Math.ceil(s.t / POLL_EVERY) * POLL_EVERY : s.t }));
  const last = seen[seen.length - 1];
  const gaps = seen.map((s, i) => s.t - (i ? seen[i - 1].t : 0));
  const final = last.state;
  const why =
    final === "completed" ? (r.needs ? `${r.needs === "input" ? "asked a question" : "asked for sign-in"}; the client relayed it to the traveller` : "done")
    : `stuck in ${final}: the client doesn't pass ${final === "input-required" ? "the question" : "the sign-in request"} to the traveller`;
  return { r, seen, final, doneAt: final === "completed" ? last.t : null, silentFor: Math.max(...gaps), why };
}

export function runTrip(d: Design) {
  const runs = REMOTES.map((r) => run(r, d));
  return {
    runs,
    done: runs.filter((x) => x.final === "completed").length,
    stuck: runs.filter((x) => x.final === "input-required" || x.final === "auth-required").length,
    failed: runs.filter((x) => x.final === "failed").length,
    tripDone: runs.every((x) => x.final === "completed") ? Math.max(...runs.map((x) => x.doneAt!)) : null,
    adapters: d.style === "rest" ? REMOTES.length : 0,
    longestSilence: Math.max(...runs.map((x) => x.silentFor)),
  };
}

export const AGENT_CARD = {
  name: "Hotel agent",
  url: "https://hotels.example/a2a",
  version: "1.4.0",
  capabilities: { streaming: true, pushNotifications: true },
  securitySchemes: { oauth: { type: "oauth2" } },
  skills: [{ id: "find-and-book-hotels", name: "Find and book hotels", description: "Search by city, dates and budget; book; may ask about location preferences." }],
};
