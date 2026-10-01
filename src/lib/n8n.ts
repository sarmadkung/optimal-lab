// A small n8n-style flow: a webhook, a threshold, then one of two destinations.

export const THRESHOLD = 100;

export function route(amount: number) {
  const high = amount > THRESHOLD;
  return {
    high,
    destination: high ? "Slack #sales" : "Email the team",
    detail: high
      ? `Post: New order for $${amount}.`
      : `Email: Small order for $${amount}. No Slack ping.`,
  };
}
