// Turning an API into tools. A shop's OpenAPI spec has 48 operations. Converting all of
// them to tool definitions is one command, and the model then has to choose among 48
// similar tools on every request. The conversion, the curation, the token counts and the
// argument checks run here; how often a model picks the right tool at each size and
// quality of description is illustrative.

export type Param = { name: string; in: "path" | "query" | "body"; type: "string" | "integer" | "object"; required?: boolean; enum?: string[]; description?: string; nested?: boolean };
export type Op = { id: string; method: string; path: string; summary: string; params: Param[]; responseBytes: number; useful: boolean };

// eight of the 48 operations, written out; the other 40 are admin, webhooks, v1 duplicates
export const OPS: Op[] = [
  { id: "getOrder", method: "GET", path: "/v2/orders/{orderId}", summary: "Get order", params: [{ name: "orderId", in: "path", type: "string", required: true }, { name: "expand", in: "query", type: "string" }], responseBytes: 4200, useful: true },
  { id: "getOrderLegacy", method: "GET", path: "/v1/orders/{id}", summary: "Get order (deprecated)", params: [{ name: "id", in: "path", type: "string", required: true }], responseBytes: 3900, useful: false },
  { id: "listOrders", method: "GET", path: "/v2/orders", summary: "List orders", params: [{ name: "customerId", in: "query", type: "string" }, { name: "status", in: "query", type: "string", enum: ["pending", "paid", "shipped", "delivered", "refunded"] }, { name: "cursor", in: "query", type: "string" }], responseBytes: 38000, useful: true },
  { id: "createRefund", method: "POST", path: "/v2/orders/{orderId}/refunds", summary: "Create refund", params: [{ name: "orderId", in: "path", type: "string", required: true }, { name: "body", in: "body", type: "object", required: true, nested: true }], responseBytes: 900, useful: true },
  { id: "getShipment", method: "GET", path: "/v2/shipments/{shipmentId}", summary: "Get shipment", params: [{ name: "shipmentId", in: "path", type: "string", required: true }], responseBytes: 2100, useful: true },
  { id: "searchCustomers", method: "GET", path: "/v2/customers", summary: "Search customers", params: [{ name: "q", in: "query", type: "string" }, { name: "email", in: "query", type: "string" }], responseBytes: 12000, useful: true },
  { id: "patchOrder", method: "PATCH", path: "/v2/orders/{orderId}", summary: "Update order", params: [{ name: "orderId", in: "path", type: "string", required: true }, { name: "body", in: "body", type: "object", nested: true }], responseBytes: 4200, useful: false },
  { id: "deleteCustomer", method: "DELETE", path: "/v2/customers/{customerId}", summary: "Delete customer", params: [{ name: "customerId", in: "path", type: "string", required: true }], responseBytes: 200, useful: false },
];
export const TOTAL_OPS = 48;
export const OTHER_OP_TOKENS = 350; // the 40 operations not written out: admin, webhooks, v1 copies (assumed size)
export const CURATED = OPS.filter((o) => o.useful).map((o) => o.id); // what a support bot needs

export type Descriptions = "summary" | "written";
export type Design = { curate: boolean; descriptions: Descriptions; flatten: boolean; trim: boolean };
export const FIRST: Design = { curate: false, descriptions: "summary", flatten: false, trim: false };
export const FIXED: Design = { curate: true, descriptions: "written", flatten: true, trim: true };

const WRITTEN: Record<string, string> = {
  getOrder: "Look up one order by its id (like ord_8F2K). Use when the customer gives an order number. Returns status, items, totals and the shipment id.",
  listOrders: "Find a customer's orders, newest first. Use when the customer doesn't know the order number. Filter by status when they say 'my refund' or 'not delivered'.",
  createRefund: "Refund all or part of a paid order. Only after the customer confirmed the amount. amount_cents must not exceed the order total.",
  getShipment: "Track a shipment: carrier, tracking number and last scan. Use the shipment id from getOrder.",
  searchCustomers: "Find a customer by email or name to get their customer id.",
};

// the refund body, as nested in the spec, or flattened into top-level parameters
const REFUND_NESTED = { type: "object", properties: { refund: { type: "object", properties: { amount: { type: "object", properties: { value: { type: "integer" }, currency: { type: "string" } } }, reason: { type: "string" } } } } };
const REFUND_FLAT = { amount_cents: { type: "integer", minimum: 1, description: "Amount in cents" }, reason: { type: "string", enum: ["damaged", "late", "wrong_item", "other"] } };

export type ToolDef = { name: string; description: string; input_schema: { type: "object"; properties: Record<string, unknown>; required: string[] } };

export function toTool(op: Op, d: Design): ToolDef {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const p of op.params) {
    if (p.in === "body") {
      if (d.flatten && op.id === "createRefund") {
        Object.assign(properties, REFUND_FLAT);
        required.push("amount_cents", "reason");
      } else properties.body = op.id === "createRefund" ? REFUND_NESTED : { type: "object" };
      continue;
    }
    if (d.flatten && p.name === "expand") continue; // the server should return what the tool needs
    properties[p.name] = { type: p.type, ...(p.enum ? { enum: p.enum } : {}) };
    if (p.required) required.push(p.name);
  }
  const description = d.descriptions === "written" && WRITTEN[op.id] ? WRITTEN[op.id] : `${op.summary}. ${op.method} ${op.path}`;
  return { name: op.id, description, input_schema: { type: "object", properties, required } };
}

export const tokens = (s: string) => Math.ceil(s.length / 4);

export function build(d: Design) {
  const ops = d.curate ? OPS.filter((o) => CURATED.includes(o.id)) : OPS;
  const tools = ops.map((o) => toTool(o, d));
  const shownTokens = tokens(JSON.stringify(tools));
  const defTokens = d.curate ? shownTokens : shownTokens + (TOTAL_OPS - OPS.length) * OTHER_OP_TOKENS;
  const toolCount = d.curate ? ops.length : TOTAL_OPS;
  // a typical conversation calls getOrder, then getShipment or listOrders
  const responseTokens = d.trim ? 350 : tokens("x".repeat(4200 + 2100));
  // how often the right tool is chosen with valid arguments (illustrative)
  const choose = toolCount > 20 ? 0.71 : 0.9;
  const describe = d.descriptions === "written" ? 0.07 : 0;
  const args = d.flatten ? 0.03 : -0.08;
  const correct = Math.min(0.99, Math.max(0, choose + describe + args));
  const perRequest = defTokens + responseTokens + 400;
  return { tools, toolCount, defTokens, responseTokens, perRequest, correct, costPer1k: (perRequest * 1000 * 3) / 1e6 };
}

// check a model's refund call against the generated schema
export function validateRefund(args: Record<string, unknown>, d: Design): string[] {
  const t = toTool(OPS.find((o) => o.id === "createRefund")!, d);
  const errs: string[] = [];
  for (const r of t.input_schema.required) if (!(r in args)) errs.push(`missing ${r}`);
  if (d.flatten) {
    if ("amount_cents" in args && (!Number.isInteger(args.amount_cents) || (args.amount_cents as number) < 1)) errs.push("amount_cents must be a positive integer");
    if ("reason" in args && !(REFUND_FLAT.reason.enum as string[]).includes(String(args.reason))) errs.push(`reason must be one of ${REFUND_FLAT.reason.enum.join(", ")}`);
  } else {
    const body = args.body as { refund?: { amount?: { value?: unknown } } } | undefined;
    if (!body?.refund?.amount?.value) errs.push("body.refund.amount.value is missing");
  }
  return errs;
}
