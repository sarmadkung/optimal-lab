// AI SDKs. An SDK like the Vercel AI SDK or LiteLLM gives one call shape for every
// provider and converts it to each API underneath (the converters in modelProviders.ts
// are that layer, written out). What a team gains and where it still needs an escape
// hatch depends on which features it uses. Coverage and line counts are illustrative
// of typical SDKs, not of one product.

export type Feature = "text" | "stream" | "tools" | "toolLoop" | "structured" | "images" | "caching" | "reasoning" | "batch";
export const FEATURES: { id: Feature; label: string }[] = [
  { id: "text", label: "Generate text" },
  { id: "stream", label: "Stream tokens" },
  { id: "tools", label: "Tool calls" },
  { id: "toolLoop", label: "Run the tool loop (call, result, call again)" },
  { id: "structured", label: "Structured output from a schema" },
  { id: "images", label: "Images in the prompt" },
  { id: "caching", label: "Prompt caching controls" },
  { id: "reasoning", label: "Reasoning / thinking settings" },
  { id: "batch", label: "Batch API (half price, results later)" },
];

export type Approach = "direct" | "sdk" | "gateway";
export const APPROACHES: { id: Approach; label: string; one: string }[] = [
  { id: "direct", label: "Each provider's API", one: "your own adapter per provider" },
  { id: "sdk", label: "An AI SDK in your code", one: "one interface; providers are packages" },
  { id: "gateway", label: "An OpenAI-compatible gateway", one: "one HTTP API; the gateway converts" },
];

export type Cover = "common" | "options" | "manual" | "none";
// how each approach typically covers a feature
export const COVERAGE: Record<Approach, Record<Feature, Cover>> = {
  direct: { text: "manual", stream: "manual", tools: "manual", toolLoop: "manual", structured: "manual", images: "manual", caching: "manual", reasoning: "manual", batch: "manual" },
  sdk: { text: "common", stream: "common", tools: "common", toolLoop: "common", structured: "common", images: "common", caching: "options", reasoning: "options", batch: "none" },
  gateway: { text: "common", stream: "common", tools: "common", toolLoop: "manual", structured: "options", images: "common", caching: "options", reasoning: "options", batch: "none" },
};
export const COVER_LABEL: Record<Cover, string> = { common: "same code for every provider", options: "provider-specific options", manual: "you write it per provider", none: "not covered: call the provider directly" };

// rough glue code per feature per provider, by how it's covered
const LINES: Record<Cover, number> = { common: 0, options: 6, manual: 40, none: 60 };

export function assess(approach: Approach, features: Feature[], providers: number) {
  const rows = features.map((f) => ({ f, cover: COVERAGE[approach][f], lines: LINES[COVERAGE[approach][f]] * providers }));
  const glue = rows.reduce((a, r) => a + r.lines, 0) + (approach === "direct" ? 0 : 10);
  // switching one provider for another: what has to change
  const switchLines = approach === "direct" ? features.length * LINES.manual : rows.filter((r) => r.cover === "options" || r.cover === "none").reduce((a, r) => a + LINES[r.cover], 0) + 1;
  const escapes = rows.filter((r) => r.cover === "options" || r.cover === "none").length;
  return { rows, glue, switchLines, escapes };
}
