// Prompt management. A support bot's prompt can live in the code, or in a prompt
// registry (Langfuse, PromptLayer, a provider's prompt store) that the app fetches at
// run time. Five things happen in a month: a quick wording change, a bad edit, a
// registry outage, a renamed variable and a question about which version said what.
// Template rendering, the variable check, caching and the timings run here.

export type Storage = "code" | "live" | "cached";
export const STORAGE: { id: Storage; label: string; one: string }[] = [
  { id: "code", label: "In the code", one: "a string in the repo, shipped with each deploy" },
  { id: "live", label: "Registry, fetched every call", one: "always the latest version, one extra request each time" },
  { id: "cached", label: "Registry, cached + bundled fallback", one: "fetched every 60 s; a copy ships with the app" },
];

export type Design = { storage: Storage; labels: boolean; varCheck: boolean; tagTraces: boolean };
export const FIRST: Design = { storage: "live", labels: false, varCheck: false, tagTraces: false };
export const FIXED: Design = { storage: "cached", labels: true, varCheck: true, tagTraces: true };
export const CACHE_S = 60;
export const REQ_PER_MIN = 200;
export const OUTAGE_MIN = 30;

// {{name}} placeholders, as most registries use
export function render(template: string, vars: Record<string, string>) {
  const missing: string[] = [];
  const text = template.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k: string) => (k in vars ? vars[k] : (missing.push(k), m)));
  return { text, missing };
}
export const placeholders = (t: string) => [...new Set([...t.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]))];

export const TEMPLATE_V14 = "You are {{company}}'s support assistant. Greet {{customer_name}} by name. Answer in {{language}}.";
export const TEMPLATE_V15 = "You are {{company}}'s support assistant. Greet {{first_name}} warmly. Answer in {{language}}.";
export const CODE_VARS = { company: "Northwind", customer_name: "Sam", language: "English" };

export type EventId = "edit" | "bad" | "outage" | "rename" | "which";
export const EVENTS: { id: EventId; title: string }[] = [
  { id: "edit", title: "Support lead rewords the greeting" },
  { id: "bad", title: "An edit breaks the JSON format; roll it back" },
  { id: "outage", title: "The prompt registry is down for 30 minutes" },
  { id: "rename", title: "The template's variable is renamed" },
  { id: "which", title: "Which prompt wrote this reply last Tuesday?" },
];

export function outcome(e: EventId, d: Design): { minutes: number | null; good: boolean; text: string } {
  const reg = d.storage !== "code";
  const propagate = d.storage === "cached" ? CACHE_S / 60 : 0;
  switch (e) {
    case "edit":
      return reg ? { minutes: 5 + propagate, good: true, text: `edited in the registry${d.labels ? ", tested on the staging label, then promoted" : ""}; live in ${5 + propagate} min` } : { minutes: 24 * 60, good: false, text: "a pull request, a review and the next deploy: about a day" };
    case "bad":
      return reg && d.labels ? { minutes: 2 + propagate, good: true, text: `move the production label back to v14: ${2 + propagate} min` } : reg ? { minutes: 20, good: false, text: "no labels: find the old text and publish it again by hand, about 20 min" } : { minutes: 120, good: false, text: "revert the commit and redeploy: about 2 hours" };
    case "outage": {
      if (d.storage === "code") return { minutes: 0, good: true, text: "nothing to fetch: unaffected" };
      if (d.storage === "cached") return { minutes: 0, good: true, text: "served from cache, then from the bundled copy: unaffected" };
      return { minutes: OUTAGE_MIN, good: false, text: `every request fails to fetch its prompt: ${(REQ_PER_MIN * OUTAGE_MIN).toLocaleString("en-US")} failed requests` };
    }
    case "rename": {
      const r = render(TEMPLATE_V15, CODE_VARS);
      if (d.varCheck && d.storage !== "code") return { minutes: 0, good: true, text: `publishing v15 is refused: it needs {{${r.missing.join("}}, {{")}}}, which the app doesn't send` };
      if (d.storage === "code") return { minutes: 0, good: true, text: "template and code change in the same commit; tests catch a mismatch" };
      return { minutes: null, good: false, text: `v15 goes live and every prompt contains the literal “{{${r.missing[0]}}}”` };
    }
    case "which":
      return d.tagTraces ? { minutes: 0, good: true, text: "the trace says support-prompt v14, label production" } : d.storage === "code" ? { minutes: 30, good: false, text: "find the deploy that was live on Tuesday and read the prompt in that commit" } : { minutes: null, good: false, text: "the registry has 15 versions and nothing says which one was live" };
  }
}

export function month(d: Design) {
  const rows = EVENTS.map((e) => ({ e, ...outcome(e.id, d) }));
  return { rows, good: rows.filter((r) => r.good).length };
}
