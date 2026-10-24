// A planned game day: at 12:00 the primary database is stopped on purpose. Customer-facing
// downtime is computed phase by phase. Automatic failover doesn't wait for people to notice;
// apps that cached the old database address stay broken until restarted. What the drill
// exposes becomes the postmortem's action items. Phase times are illustrative.

export type Design = { alerting: boolean; runbook: boolean; autoFailover: boolean; reconnect: boolean; postmortem: boolean };
export const FIRST: Design = { alerting: false, runbook: false, autoFailover: false, reconnect: false, postmortem: false };
export const FIXED: Design = { alerting: true, runbook: true, autoFailover: true, reconnect: true, postmortem: true };

export const T = {
  detectAlert: 2,
  detectCustomers: 18,
  assembleRunbook: 4,
  assembleAdHoc: 15,
  failoverAuto: 1,
  failoverManual: 12,
  reconnectRetry: 1,
  reconnectRestart: 20,
  ticketsPerMinNoStatus: 9,
};

export type Phase = { name: string; minutes: number; note: string; bad?: boolean };

export function drill(d: Design) {
  const phases: Phase[] = [];
  const detect = d.alerting ? T.detectAlert : T.detectCustomers;
  phases.push({ name: "Notice", minutes: detect, note: d.alerting ? "the error-rate alert pages on-call" : "support starts forwarding customer complaints", bad: !d.alerting });
  const assemble = d.runbook ? T.assembleRunbook : T.assembleAdHoc;
  phases.push({ name: "Organise", minutes: assemble, note: d.runbook ? "an incident commander opens the channel and the database runbook" : "five people in a chat thread, each trying something", bad: !d.runbook });
  const failover = d.autoFailover ? T.failoverAuto : T.failoverManual;
  phases.push({ name: "Fail over", minutes: failover, note: d.autoFailover ? "the standby is promoted automatically, without waiting for anyone" : "someone finds how to promote the replica and does it by hand", bad: !d.autoFailover });
  const reconnect = d.reconnect ? T.reconnectRetry : T.reconnectRestart;
  phases.push({ name: "Apps reconnect", minutes: reconnect, note: d.reconnect ? "connections retry with backoff and re-resolve the database name" : "connection pools hold the old IP; nothing recovers until every app pod is restarted", bad: !d.reconnect });
  // Automatic failover starts at 12:00 regardless of humans; manual failover waits for them.
  const downtime = d.autoFailover ? failover + reconnect : detect + assemble + failover + reconnect;
  const findings = [
    !d.alerting && "no alert on the error rate: customers noticed first",
    !d.runbook && "no runbook or incident commander: twelve minutes of people talking over each other",
    !d.autoFailover && "failover is manual and only one person knew the command",
    !d.reconnect && "app connection pools cache the database IP and never reconnect",
  ].filter(Boolean) as string[];
  const fixedNextQuarter = d.postmortem ? findings.length : Math.min(1, findings.length);
  return {
    phases,
    downtime,
    findings,
    fixedNextQuarter,
    tickets: Math.round(downtime * T.ticketsPerMinNoStatus * (d.runbook ? 0.2 : 1)),
    clock: (m: number) => `${12 + Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`,
  };
}
