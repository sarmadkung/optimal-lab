// Ollama and local runtimes. A team runs an internal assistant on one 32 GB laptop
// through Ollama's local API. Three things go wrong that have nothing to do with the
// model's quality: long prompts are cut to the context size, the model unloads when
// idle, and four people asking at once queue behind each other. Model sizes and
// architecture numbers are those of the public models; speeds are estimates from
// memory bandwidth. Memory, truncation, cold starts and queueing are computed here.

export type ModelId = "llama3.1:8b-q4" | "llama3.1:8b-q8" | "qwen2.5:14b-q4" | "gemma2:27b-q4" | "llama3.3:70b-q4";
export const MODELS: { id: ModelId; label: string; gb: number; layers: number; kvHeads: number; headDim: number }[] = [
  { id: "llama3.1:8b-q4", label: "Llama 3.1 8B · Q4_K_M", gb: 4.9, layers: 32, kvHeads: 8, headDim: 128 },
  { id: "llama3.1:8b-q8", label: "Llama 3.1 8B · Q8_0", gb: 8.5, layers: 32, kvHeads: 8, headDim: 128 },
  { id: "qwen2.5:14b-q4", label: "Qwen 2.5 14B · Q4_K_M", gb: 9.0, layers: 48, kvHeads: 8, headDim: 128 },
  { id: "gemma2:27b-q4", label: "Gemma 2 27B · Q4_K_M", gb: 16.0, layers: 46, kvHeads: 16, headDim: 128 },
  { id: "llama3.3:70b-q4", label: "Llama 3.3 70B · Q4_K_M", gb: 43.0, layers: 80, kvHeads: 8, headDim: 128 },
];

export const MACHINE = { label: "Laptop, 32 GB unified memory", usableGb: 24, bandwidthGBs: 400, diskGBs: 3 };
export const LONG_PROMPT = 6000; // a policy document plus a question
export const ANSWER = 300;
export const BURST = 4; // people asking at the same moment
export const IDLE_GAP_MIN = 20; // typical gap between questions in the afternoon

export type Design = { model: ModelId; numCtx: number; parallel: number; keepAlive: "5m" | "1h" | "forever" };
export const FIRST: Design = { model: "llama3.1:8b-q8", numCtx: 2048, parallel: 1, keepAlive: "5m" };
export const FIXED: Design = { model: "llama3.1:8b-q4", numCtx: 8192, parallel: 4, keepAlive: "forever" };
export const CTX_OPTIONS = [2048, 8192, 32768];

// K and V for every layer, KV head and dimension, at 2 bytes each
export const kvBytesPerToken = (m: (typeof MODELS)[number]) => m.layers * m.kvHeads * m.headDim * 2 * 2;

export function evaluate(d: Design) {
  const m = MODELS.find((x) => x.id === d.model)!;
  const kvGb = (kvBytesPerToken(m) * d.numCtx * d.parallel) / 1024 ** 3;
  const needGb = m.gb + kvGb + 0.6;
  const fits = needGb <= MACHINE.usableGb;
  // decoding reads every weight once per token: bandwidth bound, at about 60% efficiency
  const tokPerSec = fits ? Math.round((MACHINE.bandwidthGBs * 0.6) / m.gb) : Math.max(1, Math.round((MACHINE.diskGBs * 0.5) / (m.gb - MACHINE.usableGb + 4)));
  const prefillPerSec = tokPerSec * 12;
  const truncated = Math.max(0, LONG_PROMPT + ANSWER - d.numCtx);
  const loadS = Math.round((m.gb / MACHINE.diskGBs + 1) * 10) / 10;
  const unloads = d.keepAlive === "5m" ? IDLE_GAP_MIN > 5 : d.keepAlive === "1h" ? IDLE_GAP_MIN > 60 : false;
  const oneRequestS = (Math.min(LONG_PROMPT, d.numCtx) / prefillPerSec + ANSWER / tokPerSec) * 0.5 + (800 / prefillPerSec + ANSWER / tokPerSec) * 0.5;
  // with parallel slots requests share the machine; without, they wait in line
  const lastWaitS = d.parallel >= BURST ? oneRequestS * 1.6 : oneRequestS * Math.ceil(BURST / d.parallel);
  const firstTokenS = (unloads ? loadS : 0) + 800 / prefillPerSec;
  return { m, kvGb, needGb, fits, tokPerSec, truncated, loadS, unloads, firstTokenS, oneRequestS, lastWaitS };
}

export const REQUEST = (d: Design) => ({
  model: d.model.replace(/-q\d$/, ""),
  messages: [{ role: "user", content: "Summarise the travel policy below…" }],
  stream: true,
  keep_alive: d.keepAlive === "forever" ? -1 : d.keepAlive,
  options: { num_ctx: d.numCtx },
});
