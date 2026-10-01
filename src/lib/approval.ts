// A workflow can draft a message and then wait. Nothing is sent until a person decides.

export const DRAFT = {
  to: "sara@shop.com",
  subject: "Re: Charged twice",
  body: "Hi Sara — I can see two charges for order 1842. I have refunded the duplicate. It should appear in 3–5 days.",
};

export type Decision = "approve" | "reject";
