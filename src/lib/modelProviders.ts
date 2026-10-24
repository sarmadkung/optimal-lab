// Model provider APIs. One conversation (a system prompt, a question, a tool the model
// calls, the tool's result, the final answer) written in three providers' request
// formats. The converters below produce each shape from one neutral conversation; the
// field names follow each API's public reference (OpenAI Chat Completions, Anthropic
// Messages, Gemini generateContent).

export type Provider = "openai" | "anthropic" | "gemini";
export const PROVIDERS: { id: Provider; label: string; endpoint: string }[] = [
  { id: "openai", label: "OpenAI", endpoint: "POST /v1/chat/completions" },
  { id: "anthropic", label: "Anthropic", endpoint: "POST /v1/messages" },
  { id: "gemini", label: "Gemini", endpoint: "POST /v1beta/models/{model}:generateContent" },
];

export type Turn =
  | { kind: "user"; text: string }
  | { kind: "call"; id: string; name: string; args: Record<string, unknown> }
  | { kind: "result"; id: string; name: string; result: Record<string, unknown> }
  | { kind: "assistant"; text: string };

export const SYSTEM = "You are a shop's support assistant. Use tools for order data.";
export const TOOL = { name: "get_order", description: "Look up an order by id.", parameters: { type: "object", properties: { order_id: { type: "string" } }, required: ["order_id"] } };
export const CONVERSATION: Turn[] = [
  { kind: "user", text: "Where is order 4821?" },
  { kind: "call", id: "call_1", name: "get_order", args: { order_id: "4821" } },
  { kind: "result", id: "call_1", name: "get_order", result: { status: "shipped", carrier: "DHL" } },
  { kind: "assistant", text: "It shipped with DHL yesterday." },
];

export function toRequest(p: Provider, upTo: number) {
  const turns = CONVERSATION.slice(0, upTo);
  if (p === "openai") {
    return {
      model: "gpt-…",
      messages: [
        { role: "system", content: SYSTEM },
        ...turns.map((t) =>
          t.kind === "user" ? { role: "user", content: t.text }
          : t.kind === "call" ? { role: "assistant", content: null, tool_calls: [{ id: t.id, type: "function", function: { name: t.name, arguments: JSON.stringify(t.args) } }] }
          : t.kind === "result" ? { role: "tool", tool_call_id: t.id, content: JSON.stringify(t.result) }
          : { role: "assistant", content: t.text },
        ),
      ],
      tools: [{ type: "function", function: { name: TOOL.name, description: TOOL.description, parameters: TOOL.parameters } }],
    };
  }
  if (p === "anthropic") {
    return {
      model: "claude-…",
      max_tokens: 1024,
      system: SYSTEM,
      messages: turns.map((t) =>
        t.kind === "user" ? { role: "user", content: t.text }
        : t.kind === "call" ? { role: "assistant", content: [{ type: "tool_use", id: t.id, name: t.name, input: t.args }] }
        : t.kind === "result" ? { role: "user", content: [{ type: "tool_result", tool_use_id: t.id, content: JSON.stringify(t.result) }] }
        : { role: "assistant", content: t.text },
      ),
      tools: [{ name: TOOL.name, description: TOOL.description, input_schema: TOOL.parameters }],
    };
  }
  return {
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: turns.map((t) =>
      t.kind === "user" ? { role: "user", parts: [{ text: t.text }] }
      : t.kind === "call" ? { role: "model", parts: [{ functionCall: { name: t.name, args: t.args } }] }
      : t.kind === "result" ? { role: "user", parts: [{ functionResponse: { name: t.name, response: t.result } }] }
      : { role: "model", parts: [{ text: t.text }] },
    ),
    tools: [{ functionDeclarations: [{ name: TOOL.name, description: TOOL.description, parameters: TOOL.parameters }] }],
  };
}

// how the final answer arrives when streamed (server-sent events, shortened)
export const STREAM: Record<Provider, string[]> = {
  openai: ['data: {"choices":[{"delta":{"role":"assistant"}}]}', 'data: {"choices":[{"delta":{"content":"It shipped"}}]}', 'data: {"choices":[{"delta":{"content":" with DHL yesterday."}}]}', 'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}', "data: [DONE]"],
  anthropic: ["event: message_start", 'event: content_block_start {"index":0,"content_block":{"type":"text"}}', 'event: content_block_delta {"delta":{"type":"text_delta","text":"It shipped"}}', 'event: content_block_delta {"delta":{"type":"text_delta","text":" with DHL yesterday."}}', "event: content_block_stop", 'event: message_delta {"delta":{"stop_reason":"end_turn"}}', "event: message_stop"],
  gemini: ['data: {"candidates":[{"content":{"role":"model","parts":[{"text":"It shipped"}]}}]}', 'data: {"candidates":[{"content":{"role":"model","parts":[{"text":" with DHL yesterday."}]},"finishReason":"STOP"}]}'],
};

// what an app has to handle differently per provider
export const DIFFERENCES: { what: string; openai: string; anthropic: string; gemini: string }[] = [
  { what: "System prompt", openai: "a message with role system", anthropic: "top-level system field", gemini: "systemInstruction" },
  { what: "Assistant role name", openai: "assistant", anthropic: "assistant", gemini: "model" },
  { what: "Tool schema field", openai: "function.parameters", anthropic: "input_schema", gemini: "functionDeclarations[].parameters" },
  { what: "Tool call arguments", openai: "a JSON string to parse", anthropic: "an object (input)", gemini: "an object (args)" },
  { what: "Tool result goes in", openai: "role tool + tool_call_id", anthropic: "user message, tool_result block", gemini: "user turn, functionResponse part" },
  { what: "Output length", openai: "optional", anthropic: "max_tokens required", gemini: "optional (generationConfig)" },
  { what: "Stream ends with", openai: "data: [DONE]", anthropic: "event: message_stop", gemini: "the last chunk's finishReason" },
];

export const sizeOf = (o: unknown) => JSON.stringify(o).length;
