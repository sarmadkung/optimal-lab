// Case study: lead enrichment. A week brings 200 sign-ups. Each is researched (company,
// size, industry), scored against the ideal customer, and the good ones go to sales.
// Who signed up, what each source returns and how often a research agent invents a
// fact are seeded and illustrative; routing, grounding, scoring, costs and timings run.

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x6d2b79f5) >>> 0) / 2 ** 32);
}

export type Domain = "company" | "free" | "disposable";
export type Lead = {
  id: number;
  domain: Domain;
  fit: boolean; // truly the kind of customer sales wants
  apiHas: boolean; // the enrichment API knows this company
  agentInvents: boolean; // the research agent states a size it didn't find
  agentWrongCompany: boolean; // for free-mail sign-ups, it picks the wrong company
  answersForm: boolean; // would answer a one-question follow-up
  hour: number; // hour of the week they signed up
};

export const WEEK: Lead[] = (() => {
  const r = rng(21);
  return Array.from({ length: 200 }, (_, i) => {
    const x = r();
    const domain: Domain = x < 0.7 ? "company" : x < 0.95 ? "free" : "disposable";
    const fit = domain === "disposable" ? false : r() < (domain === "company" ? 0.22 : 0.2);
    return { id: i + 1, domain, fit, apiHas: domain === "company" && r() < 0.75, agentInvents: r() < 0.12, agentWrongCompany: domain === "free" && r() < 0.6, answersForm: r() < 0.6, hour: Math.floor(r() * 168) };
  });
})();

export type Source = "agent" | "api" | "both";
export type Design = { source: Source; freeMail: "guess" | "ask" | "skip"; grounding: boolean; realtime: boolean };
export const FIRST: Design = { source: "agent", freeMail: "guess", grounding: false, realtime: false };
export const FIXED: Design = { source: "both", freeMail: "ask", grounding: true, realtime: true };
export const COST = { agent: 0.4, api: 0.05 };
export const SALES_MIN = 15; // minutes a rep spends on a lead before discarding it

export type Fate = { lead: Lead; looked: "api" | "agent" | "none"; known: boolean; wrongFact: boolean; scoredFit: boolean; cost: number; why: string };

export function enrich(l: Lead, d: Design): Fate {
  let cost = 0;
  if (l.domain === "disposable") return { lead: l, looked: "none", known: false, wrongFact: false, scoredFit: false, cost, why: "disposable address: dropped" };

  // free-mail sign-ups: guess the company from the name, ask, or skip
  let company = l.domain === "company";
  let guessed = false;
  if (l.domain === "free") {
    if (d.freeMail === "skip") return { lead: l, looked: "none", known: false, wrongFact: false, scoredFit: false, cost, why: "free-mail address: not enriched" };
    if (d.freeMail === "ask") {
      if (!l.answersForm) return { lead: l, looked: "none", known: false, wrongFact: false, scoredFit: false, cost, why: "asked for a company website; no answer yet" };
      company = true;
    } else guessed = true;
  }

  // the API knows most company domains, including ones people give in the follow-up form
  const apiKnows = company && (l.domain === "company" ? l.apiHas : true);
  if (d.source !== "agent" && apiKnows) {
    cost += COST.api;
    return { lead: l, looked: "api", known: true, wrongFact: false, scoredFit: l.fit, cost, why: "enrichment API record" };
  }
  if (d.source === "api") {
    cost += company ? COST.api : 0;
    return { lead: l, looked: "api", known: false, wrongFact: false, scoredFit: false, cost, why: "the API has no record; scored as unknown" };
  }

  // the research agent: reads the web, and sometimes states what it didn't find
  if (d.source === "both") cost += COST.api;
  cost += COST.agent;
  const wrongCompany = guessed && l.agentWrongCompany;
  const invented = l.agentInvents;
  if (d.grounding && (invented || wrongCompany)) {
    return { lead: l, looked: "agent", known: false, wrongFact: false, scoredFit: false, cost, why: wrongCompany ? "no page ties this person to the company it guessed: left unknown" : "employee count has no source URL: dropped, left unknown" };
  }
  if (wrongCompany) return { lead: l, looked: "agent", known: true, wrongFact: true, scoredFit: !l.fit, cost, why: "researched the wrong company with the same name" };
  if (invented) return { lead: l, looked: "agent", known: true, wrongFact: true, scoredFit: !l.fit, cost, why: "the agent stated a company size it didn't find" };
  return { lead: l, looked: "agent", known: true, wrongFact: false, scoredFit: l.fit, cost, why: d.grounding ? "researched by the agent; every fact has a source" : "researched by the agent" };
}

export function runWeek(d: Design) {
  const fates = WEEK.map((l) => enrich(l, d));
  const toSales = fates.filter((f) => f.scoredFit);
  const goodTotal = WEEK.filter((l) => l.fit).length;
  const goodSent = toSales.filter((f) => f.lead.fit).length;
  const badSent = toSales.length - goodSent;
  // nightly batch: a lead waits until 02:00, then a rep picks it up at 09:00
  const waitHours = (h: number) => {
    const hod = h % 24;
    return d.realtime ? 0.1 : (hod < 9 ? 9 - hod : 33 - hod);
  };
  const waits = toSales.filter((f) => f.lead.fit).map((f) => waitHours(f.lead.hour)).sort((a, b) => a - b);
  return {
    fates,
    goodTotal,
    goodSent,
    badSent,
    wrongFacts: fates.filter((f) => f.wrongFact).length,
    cost: Math.round(fates.reduce((a, f) => a + f.cost, 0) * 100) / 100,
    salesHoursWasted: Math.round((badSent * SALES_MIN) / 6) / 10,
    medianWaitH: waits.length ? Math.round(waits[Math.floor(waits.length / 2)] * 10) / 10 : 0,
  };
}
