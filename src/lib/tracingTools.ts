// Tracing tools. A support bot handles 50,000 requests a day. Langfuse, LangSmith,
// Helicone and OpenTelemetry-based tools can all record them; what you capture decides
// which questions you can answer next month, what it costs to store, and whether
// customers' personal data ends up in your traces. The storage arithmetic and which
// question each setup can answer run here.

export type Instrument = "proxy" | "sdk" | "otel";
export const INSTRUMENTS: { id: Instrument; label: string; one: string }[] = [
  { id: "proxy", label: "A proxy in front of the model API", one: "change the base URL; sees model calls only" },
  { id: "sdk", label: "The tool's SDK in your code", one: "wrap functions; sees every step you wrap" },
  { id: "otel", label: "OpenTelemetry GenAI spans", one: "standard spans, sent to any backend that reads them" },
];

export type Design = { instrument: Instrument; steps: boolean; tags: boolean; redact: boolean; sampling: 1 | 0.1 | "tail" };
export const FIRST: Design = { instrument: "proxy", steps: false, tags: false, redact: false, sampling: 1 };
export const FIXED: Design = { instrument: "otel", steps: true, tags: true, redact: true, sampling: "tail" };

export const PER_DAY = 50_000;
export const KB = { llm: 6, step: 3, tags: 0.2 }; // stored per request
export const STEPS_PER_REQUEST = 3; // retrieval, a tool call, a guardrail check
export const TAIL_SHARE = 0.08; // errors, slow requests and thumbs-down kept in full; the rest at 2%

export const QUESTIONS: { id: string; q: string; needs: (d: Design) => string | null }[] = [
  { id: "cost", q: "Which customer's requests cost the most this month?", needs: (d) => (d.tags ? null : "requests aren't tagged with a customer id") },
  { id: "why", q: "Why did this answer cite the wrong policy?", needs: (d) => (d.instrument === "proxy" ? "a proxy never sees the retrieval step" : !d.steps ? "retrieval isn't recorded as a step" : d.sampling === 0.1 ? "90% of requests weren't kept" : null) },
  { id: "version", q: "Did latency go up after Tuesday's prompt change?", needs: (d) => (d.tags ? null : "traces don't carry the prompt version") },
  { id: "feedback", q: "Which traces got a thumbs-down?", needs: (d) => (d.tags ? (d.sampling === 0.1 ? "most thumbs-down traces were sampled away" : null) : "feedback isn't attached to traces") },
  { id: "pii", q: "Are customers' card numbers and emails stored in our traces?", needs: (d) => (d.redact ? null : "yes: prompts are stored as sent") },
];

export function evaluate(d: Design) {
  const perReq = KB.llm + (d.instrument !== "proxy" && d.steps ? KB.step * STEPS_PER_REQUEST : 0) + (d.tags ? KB.tags : 0);
  const kept = d.sampling === "tail" ? TAIL_SHARE + (1 - TAIL_SHARE) * 0.02 : d.sampling;
  const gbMonth = (PER_DAY * 30 * perReq * kept) / 1024 / 1024;
  const answers = QUESTIONS.map((x) => ({ ...x, blocked: x.needs(d) }));
  return { perReq, kept, gbMonth, answers, answered: answers.filter((a) => !a.blocked).length };
}

// a request as one trace: spans with durations and token counts
export function trace(d: Design) {
  const spans = [
    { name: "support.answer", ms: 2900, depth: 0, kind: "request" },
    ...(d.instrument !== "proxy" && d.steps
      ? [
          { name: "retrieve policy docs", ms: 240, depth: 1, kind: "step" },
          { name: "tool: get_order", ms: 310, depth: 1, kind: "step" },
        ]
      : []),
    { name: "llm: generate (1,840 in / 210 out)", ms: 2100, depth: 1, kind: "llm" },
    ...(d.instrument !== "proxy" && d.steps ? [{ name: "guardrail: output check", ms: 180, depth: 1, kind: "step" }] : []),
  ];
  const attrs = [
    ...(d.tags ? ["customer.id = c_7731", "prompt.version = support-v14", "feedback = thumbs_down"] : []),
    d.redact ? "prompt = “My card [CARD] was charged twice, email [EMAIL]…”" : "prompt = “My card 4242 4242 4242 4242 was charged twice, email sam@…”",
  ];
  return { spans, attrs };
}
