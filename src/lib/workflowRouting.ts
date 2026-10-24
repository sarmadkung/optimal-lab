// Branches and routing. Twelve orders from a web form and an API go through a switch with
// three rules and a default. The rules really run, with the same pitfalls as in a visual
// workflow builder: amounts that arrive as text, a lower-case country code, first-match
// versus every-match, and no default branch.

export type Order = { id: number; amount: number | string; country: string; tier: "vip" | "standard"; source: "form" | "api" };
export const ORDERS: Order[] = [
  { id: 1, amount: 1500, country: "DE", tier: "standard", source: "api" },
  { id: 2, amount: "900", country: "FR", tier: "standard", source: "form" },
  { id: 3, amount: "250", country: "US", tier: "standard", source: "form" },
  { id: 4, amount: 2400, country: "US", tier: "vip", source: "api" },
  { id: 5, amount: 120, country: "de", tier: "standard", source: "form" },
  { id: 6, amount: "15000", country: "NL", tier: "vip", source: "form" },
  { id: 7, amount: 80, country: "GB", tier: "standard", source: "api" },
  { id: 8, amount: "1000", country: "US", tier: "standard", source: "form" },
  { id: 9, amount: 640, country: "US", tier: "vip", source: "api" },
  { id: 10, amount: "75", country: "ES", tier: "standard", source: "form" },
  { id: 11, amount: 3200, country: "JP", tier: "standard", source: "api" },
  { id: 12, amount: 45, country: "US", tier: "standard", source: "api" },
];

const EU = ["AT", "BE", "DE", "ES", "FI", "FR", "IE", "IT", "NL", "PL", "PT", "SE"];
export type Branch = "approval" | "vat" | "priority" | "standard";
export const BRANCH_LABEL: Record<Branch, string> = { approval: "Manager approval", vat: "EU VAT check", priority: "Priority handling", standard: "Standard fulfilment" };

export type Options = { clean: boolean; vipFirst: boolean; mode: "first" | "all"; fallback: boolean };

type Rule = { branch: Branch; text: string; test: (o: Order, clean: boolean) => boolean };
const RULES: Record<"approval" | "vat" | "priority", Rule> = {
  // without cleaning, a text amount is compared as text: "900" > "1000" because "9" > "1"
  approval: { branch: "approval", text: "amount > 1000", test: (o, clean) => (clean || typeof o.amount === "number" ? Number(o.amount) > 1000 : String(o.amount) > "1000") },
  vat: { branch: "vat", text: "country is in the EU", test: (o, clean) => EU.includes(clean ? o.country.trim().toUpperCase() : o.country) },
  priority: { branch: "priority", text: "tier = vip", test: (o) => o.tier === "vip" },
};

export function rulesInOrder(o: Options): Rule[] {
  return o.vipFirst ? [RULES.priority, RULES.approval, RULES.vat] : [RULES.approval, RULES.vat, RULES.priority];
}

// What the business wants: every branch that applies, or standard when none does.
export function intended(order: Order): Branch[] {
  const b = (Object.values(RULES) as Rule[]).filter((r) => r.test(order, true)).map((r) => r.branch);
  return b.length ? b : ["standard"];
}

export function route(order: Order, o: Options): Branch[] {
  const hits = rulesInOrder(o).filter((r) => r.test(order, o.clean)).map((r) => r.branch);
  const chosen = o.mode === "first" ? hits.slice(0, 1) : hits;
  return chosen.length ? chosen : o.fallback ? ["standard"] : [];
}

export function runAll(o: Options) {
  const rows = ORDERS.map((order) => {
    const got = route(order, o);
    const want = intended(order);
    const same = got.length === want.length && got.every((b) => want.includes(b));
    const status = got.length === 0 ? "dropped" : same ? "right" : got.some((b) => !want.includes(b)) ? "wrong" : "partial";
    return { order, got, want, status: status as "right" | "wrong" | "partial" | "dropped" };
  });
  const n = (s: string) => rows.filter((r) => r.status === s).length;
  return { rows, right: n("right"), wrong: n("wrong"), partial: n("partial"), dropped: n("dropped") };
}

export const BASE: Options = { clean: false, vipFirst: false, mode: "first", fallback: false };
export const FIXED: Options = { clean: true, vipFirst: false, mode: "all", fallback: true };
