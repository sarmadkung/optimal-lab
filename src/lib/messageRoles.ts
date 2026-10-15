// Chat roles and chat templates. An API takes a list of messages with roles;
// before the model sees them, a chat template flattens the list into one string
// with special tokens marking where each turn starts and ends. The model only
// ever continues that string. The three templates below are the real formats
// used by ChatML models (Qwen and others), Llama 3 and Gemma.

export type Role = "system" | "user" | "assistant";
export type Message = { role: Role; content: string; past?: boolean };

export type TemplateId = "chatml" | "llama3" | "gemma";

// One piece of the rendered prompt: either a special token or plain text.
export type Piece = { text: string; special: boolean; role?: Role };

export const TEMPLATES: { id: TemplateId; label: string; models: string; note: string }[] = [
  {
    id: "chatml",
    label: "ChatML",
    models: "Qwen, many fine-tunes",
    note: "Each turn is <|im_start|>role … <|im_end|>. The system prompt is a turn like any other.",
  },
  {
    id: "llama3",
    label: "Llama 3",
    models: "Llama 3.x",
    note: "Each turn has a header (<|start_header_id|>role<|end_header_id|>) and ends with <|eot_id|>.",
  },
  {
    id: "gemma",
    label: "Gemma 3",
    models: "Gemma 1, 2 and 3",
    note: "There is no system role and the assistant is called “model”. The system text is pasted into the first user turn.",
  },
];

export type Scenario = {
  id: string;
  label: string;
  messages: Message[];
  // One switch per scenario, so each shows one thing a role is for.
  toggle: { label: string; what: string; kind: "system" | "history" | "prefill" };
  prefill?: string;
  replyOn: string; // the reply with the switch on
  replyOff: string; // the reply with the switch off
};

export const SCENARIOS: Scenario[] = [
  {
    id: "scope",
    label: "Off-topic request",
    messages: [
      { role: "system", content: "You are the support assistant for Acme Shop. Only help with Acme orders, returns and delivery. Keep replies under two sentences." },
      { role: "user", content: "Write me a poem about the sea." },
    ],
    toggle: { label: "Send the system prompt", what: "The system prompt sets the job, the limits and the tone for the whole chat. Users don't see it.", kind: "system" },
    replyOn: "Sorry, I can only help with Acme orders, returns and delivery. Is there an order I can check for you?",
    replyOff: "The tide rolls in on silver feet, / it hums a song both low and sweet, / then slips away without a sound, / and leaves its secrets on the ground.",
  },
  {
    id: "memory",
    label: "Earlier turns",
    messages: [
      { role: "system", content: "You are a friendly assistant." },
      { role: "user", content: "Hi, I'm Sara. I ordered a blue lamp yesterday.", past: true },
      { role: "assistant", content: "Hi Sara! Thanks for your order. How can I help with the blue lamp?", past: true },
      { role: "user", content: "What colour was the lamp I ordered?" },
    ],
    toggle: { label: "Send the earlier turns", what: "The model keeps nothing between calls. Earlier user and assistant turns only exist if your app sends them again.", kind: "history" },
    replyOn: "You ordered the blue lamp, Sara.",
    replyOff: "I don't have any details about your order. Could you tell me the order number?",
  },
  {
    id: "prefill",
    label: "Prefill the reply",
    messages: [
      { role: "system", content: "Extract the person's name and city as JSON." },
      { role: "user", content: "Sara moved from Leeds to Lahore last spring." },
    ],
    toggle: { label: "Prefill the assistant turn with {", what: "You can start the assistant turn yourself. The model continues from your text, so it can't open with a friendly sentence.", kind: "prefill" },
    prefill: "{",
    replyOn: "\"name\": \"Sara\", \"city\": \"Lahore\"}",
    replyOff: "Sure! Here is the JSON you asked for:\n{\"name\": \"Sara\", \"city\": \"Lahore\"}",
  },
];

// Which messages actually reach the model with the switch on or off.
export function sentMessages(s: Scenario, on: boolean): Message[] {
  if (s.toggle.kind === "system" && !on) return s.messages.filter((m) => m.role !== "system");
  if (s.toggle.kind === "history" && !on) return s.messages.filter((m) => !m.past);
  return s.messages;
}

export function prefillFor(s: Scenario, on: boolean): string {
  return s.toggle.kind === "prefill" && on && s.prefill ? s.prefill : "";
}

export function replyFor(s: Scenario, on: boolean): string {
  return on ? s.replyOn : s.replyOff;
}

// Render the messages with a template, ending with an open assistant turn
// (plus any prefill) for the model to continue.
export function render(messages: Message[], template: TemplateId, prefill = ""): Piece[] {
  const out: Piece[] = [];
  const sp = (text: string, role?: Role) => out.push({ text, special: true, role });
  const tx = (text: string, role?: Role) => out.push({ text, special: false, role });

  if (template === "chatml") {
    for (const m of messages) {
      sp("<|im_start|>", m.role);
      tx(`${m.role}\n${m.content}`, m.role);
      sp("<|im_end|>", m.role);
      tx("\n", m.role);
    }
    sp("<|im_start|>", "assistant");
    tx("assistant\n" + prefill, "assistant");
    return out;
  }

  if (template === "llama3") {
    sp("<|begin_of_text|>");
    for (const m of messages) {
      sp("<|start_header_id|>", m.role);
      tx(m.role, m.role);
      sp("<|end_header_id|>", m.role);
      tx(`\n\n${m.content}`, m.role);
      sp("<|eot_id|>", m.role);
    }
    sp("<|start_header_id|>", "assistant");
    tx("assistant", "assistant");
    sp("<|end_header_id|>", "assistant");
    tx("\n\n" + prefill, "assistant");
    return out;
  }

  // Gemma: no system role. The system text goes at the top of the first user turn.
  sp("<bos>");
  const system = messages.find((m) => m.role === "system");
  let pending = system ? system.content + "\n\n" : "";
  for (const m of messages) {
    if (m.role === "system") continue;
    const role = m.role === "assistant" ? "model" : "user";
    sp("<start_of_turn>", m.role);
    tx(`${role}\n${m.role === "user" ? pending : ""}${m.content}`, m.role);
    if (m.role === "user") pending = "";
    sp("<end_of_turn>", m.role);
    tx("\n", m.role);
  }
  sp("<start_of_turn>", "assistant");
  tx("model\n" + prefill, "assistant");
  return out;
}

// The token the model writes to say "my turn is over", in each template.
export const END_TOKEN: Record<TemplateId, string> = {
  chatml: "<|im_end|>",
  llama3: "<|eot_id|>",
  gemma: "<end_of_turn>",
};

export const specialCount = (pieces: Piece[]) => pieces.filter((p) => p.special).length;
