// One email enters a workflow. The branch depends on the classification.

export type Kind = "billing" | "bug" | "other";

export type Email = {
  id: string;
  from: string;
  subject: string;
  body: string;
  kind: Kind;
  action: string;
  result: string;
};

export const EMAILS: Email[] = [
  {
    id: "bill",
    from: "sara@shop.com",
    subject: "Charged twice",
    body: "Order 1842 shows two identical charges.",
    kind: "billing",
    action: "Draft a refund reply",
    result: "A reply is drafted for the billing queue.",
  },
  {
    id: "bug",
    from: "ali@co.com",
    subject: "Export button does nothing",
    body: "I click Export and the page stays still.",
    kind: "bug",
    action: "Open a bug ticket",
    result: "Ticket BUG-204 is opened with the email attached.",
  },
  {
    id: "news",
    from: "news@letter.com",
    subject: "Your weekly digest",
    body: "This week in product news.",
    kind: "other",
    action: "Archive it",
    result: "Archived. No one is pinged.",
  },
];

export const KIND_LABEL: Record<Kind, string> = {
  billing: "Billing",
  bug: "Bug",
  other: "Other",
};
