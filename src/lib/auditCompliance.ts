// Six questions a SOC 2 auditor asks about production changes and access, answered (or not)
// by the controls in place. Each answer names the evidence that would be shown; preparation
// time is illustrative.

export type Logs = "none" | "central" | "locked";
export type Design = { prOnly: boolean; logs: Logs; reviews: boolean; breakGlass: boolean; automated: boolean };
export type QuestionId = "firewall" | "deploys" | "tamper" | "access" | "emergency" | "time";

export const FIRST: Design = { prOnly: false, logs: "none", reviews: false, breakGlass: false, automated: false };
export const FIXED: Design = { prOnly: true, logs: "locked", reviews: true, breakGlass: true, automated: true };

export const QUESTIONS: { id: QuestionId; ask: string; step: number }[] = [
  { id: "firewall", ask: "Who changed the production firewall on 3 March, and who approved it?", step: 0 },
  { id: "deploys", ask: "Show that every production deploy this year was reviewed.", step: 0 },
  { id: "tamper", ask: "How do you know these logs weren't edited?", step: 1 },
  { id: "access", ask: "Who had admin access in Q2, and did anyone check it was still needed?", step: 2 },
  { id: "emergency", ask: "Someone used emergency access on 12 May. Who, why, and what did they do?", step: 3 },
  { id: "time", ask: "Please send all the evidence for the audit period.", step: 4 },
];

export function answer(q: QuestionId, d: Design): { ok: boolean; evidence: string } {
  const logged = d.logs !== "none";
  switch (q) {
    case "firewall":
      if (d.prOnly) return { ok: true, evidence: "pull request #431 (author, two approvals), the pipeline run that applied it, and the matching cloud audit log entry" };
      if (logged) return { ok: false, evidence: "the cloud audit log shows alice changed it from the console; nothing shows an approval, which the control requires" };
      return { ok: false, evidence: "nobody can say; console changes weren't recorded anywhere you kept" };
    case "deploys":
      if (d.prOnly && d.automated) return { ok: true, evidence: "a report listing all 1,212 deploys, each linked to a merged, approved pull request" };
      if (d.prOnly) return { ok: true, evidence: "a sample of 40 deploys, matched to pull requests by hand over two days" };
      return { ok: false, evidence: "some deploys were run from laptops; there's no complete list to check" };
    case "tamper":
      if (d.logs === "locked") return { ok: true, evidence: "logs are written to a separate account under object lock for a year, with signed digest files that detect any change" };
      if (d.logs === "central") return { ok: false, evidence: "logs are central, but production admins can delete them, so nothing proves they weren't" };
      return { ok: false, evidence: "there are no logs to defend" };
    case "access":
      return d.reviews ? { ok: true, evidence: "the Q2 review: 14 admins, 3 removed, each decision signed off by a manager" } : { ok: false, evidence: "a list of 14 admins can be exported, but no one ever reviewed it; two left the company in March" };
    case "emergency":
      if (d.breakGlass) return { ok: true, evidence: "the break-glass role was assumed by bob, linked to incident INC-218, the security channel was alerted, and every action is in the audit log" };
      if (logged) return { ok: false, evidence: "the shared admin account was used; the log shows what it did, but not which person was behind it" };
      return { ok: false, evidence: "a shared admin password was used; there's no record of who or what" };
    case "time":
      if (d.automated && d.prOnly && logged) return { ok: true, evidence: "evidence has been collected continuously; exporting it takes an afternoon" };
      return { ok: false, evidence: `${d.prOnly || logged ? "about two weeks" : "about six weeks"} of engineers searching chat history, tickets and screenshots` };
  }
}

export function audit(d: Design) {
  const rows = QUESTIONS.map((q) => ({ q, ...answer(q.id, d) }));
  return { rows, passed: rows.filter((r) => r.ok).length, exceptions: rows.filter((r) => !r.ok).length };
}
