// Inline suggestions while someone types an email reply. The keystroke timings are a
// seeded synthetic trace with pauses where people pause; the suggestions the two models
// would make at each pause are illustrative. Debounce, latency, discarding stale
// suggestions, the confidence threshold, Tab-to-accept and cost all really run.

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const TEXT = "Thanks for the update. I can join the call on Thursday at 3pm. Could you send the agenda beforehand? Best, Sam";

// Extra thinking time after these prefixes, on top of normal typing.
const THINK: Record<string, number> = {
  "Thanks for the ": 350,
  "Thanks for the update. I can ": 450,
  "Thanks for the update. I can join the call on ": 800,
  "Thanks for the update. I can join the call on Thursday at 3pm. Could you send the ": 500,
};

// Gap before typing character i (ms).
export const GAPS: number[] = (() => {
  const r = mulberry32(3);
  return [...TEXT].map((_, i) => {
    if (i === 0) return 0;
    const prev = TEXT[i - 1];
    let g = 90 + 90 * r();
    if (prev === " ") g += 60 + 120 * r();
    if (prev === " " && /[.?,]/.test(TEXT[i - 2] ?? "")) g += 700 + 300 * r(); // a new sentence
    g += THINK[TEXT.slice(0, i)] ?? 0;
    return Math.round(g);
  });
})();

export type ModelId = "small" | "large";
export const MODELS: { id: ModelId; label: string; latencyMs: number; pricePerMIn: number }[] = [
  { id: "small", label: "Small, fast", latencyMs: 120, pricePerMIn: 0.1 },
  { id: "large", label: "Large, slow", latencyMs: 700, pricePerMIn: 1 },
];
const CONTEXT_TOKENS = 600; // the thread being replied to, plus the text so far

type Sug = { text: string; conf: number };
// What each model suggests after a prefix; anywhere else it guesses with low confidence.
const SUGGEST: Record<string, Partial<Record<ModelId, Sug>>> = {
  "Thanks for the ": { small: { text: "update.", conf: 0.7 }, large: { text: "update.", conf: 0.85 } },
  "Thanks for the update. ": { small: { text: "Let me know if you need anything.", conf: 0.4 }, large: { text: "I'll take a look today.", conf: 0.5 } },
  "Thanks for the update. I can ": { small: { text: "do that.", conf: 0.4 }, large: { text: "join the call", conf: 0.7 } },
  "Thanks for the update. I can join the call on ": { small: { text: "Monday.", conf: 0.35 }, large: { text: "Thursday at 3pm.", conf: 0.8 } },
  "Thanks for the update. I can join the call on Thursday at 3pm. ": { small: { text: "Thanks!", conf: 0.45 }, large: { text: "Could you send the agenda", conf: 0.55 } },
  "Thanks for the update. I can join the call on Thursday at 3pm. Could you send the ": { small: { text: "report?", conf: 0.5 }, large: { text: "agenda beforehand?", conf: 0.75 } },
  "Thanks for the update. I can join the call on Thursday at 3pm. Could you send the agenda beforehand? ": { small: { text: "Best, Sam", conf: 0.8 }, large: { text: "Best, Sam", conf: 0.9 } },
};
const suggestionAt = (prefix: string, m: ModelId): Sug => SUGGEST[prefix]?.[m] ?? { text: "…", conf: 0.2 };

export const DEBOUNCES = [0, 150, 300, 600];
export type Options = { debounce: number; model: ModelId; minConf: number };
export type Event = { at: number; kind: "request" | "stale" | "hidden" | "shown" | "accepted" | "ignored"; pos: number; text?: string };

const REACT_MS = 300; // seeing a suggestion and pressing Tab

export function simulate(o: Options) {
  const m = MODELS.find((x) => x.id === o.model)!;
  const events: Event[] = [];
  let t = 0;
  let i = 0; // next character to type
  let typed = 0;
  let requests = 0;
  while (i < TEXT.length) {
    t += i === 0 ? 0 : GAPS[i];
    i++; // the character is typed
    typed++;
    if (i >= TEXT.length) break;
    const nextGap = GAPS[i];
    if (nextGap < o.debounce) continue; // the user kept typing before the debounce ran out
    const sentAt = t + o.debounce;
    requests++;
    events.push({ at: sentAt, kind: "request", pos: i });
    const arrive = sentAt + m.latencyMs;
    if (arrive > t + nextGap) {
      events.push({ at: arrive, kind: "stale", pos: i }); // the text changed; throw it away
      continue;
    }
    const s = suggestionAt(TEXT.slice(0, i), o.model);
    if (s.conf < o.minConf) {
      events.push({ at: arrive, kind: "hidden", pos: i, text: s.text });
      continue;
    }
    events.push({ at: arrive, kind: "shown", pos: i, text: s.text });
    if (TEXT.slice(i).startsWith(s.text)) {
      // Tab: the suggested characters appear at once, and typing carries on from there
      t = arrive + REACT_MS;
      events.push({ at: t, kind: "accepted", pos: i, text: s.text });
      i += s.text.length;
    } else events.push({ at: arrive, kind: "ignored", pos: i, text: s.text });
  }
  const totalMs = t;
  const plainMs = GAPS.reduce((a, b) => a + b, 0);
  const count = (k: Event["kind"]) => events.filter((e) => e.kind === k).length;
  return {
    events,
    requests,
    stale: count("stale"),
    hidden: count("hidden"),
    shown: count("shown"),
    accepted: count("accepted"),
    ignored: count("ignored"),
    keysTyped: typed,
    keysSaved: TEXT.length - typed,
    totalMs,
    plainMs,
    costPer1000: (1000 * requests * CONTEXT_TOKENS * m.pricePerMIn) / 1e6,
  };
}
