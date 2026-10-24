"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { FIRST, FIXED, QUESTIONS, answer, audit, type Design, type Logs, type QuestionId } from "@/lib/auditCompliance";

const ACCENT = "var(--ops)";

export default function AuditDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [qid, setQid] = useState<QuestionId>("firewall");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const a = answer(qid, d);
  const res = audit(d);
  const q = QUESTIONS.find((x) => x.id === qid)!;
  const tone = a.ok ? "good" : "bad";
  const logged = d.logs !== "none";

  const source = qid === "firewall" || qid === "deploys" ? (d.prOnly ? "pr" : "logs") : qid === "access" ? "review" : "logs";
  const nodes: MapNode[] = [
    { id: "eng", label: "Engineers", sub: d.breakGlass ? "own accounts + break-glass" : "share an admin login", at: [14, 18], mobileAt: [25, 12], state: d.breakGlass ? "active" : "wait" },
    { id: "pr", label: "Pull request + pipeline", sub: d.prOnly ? "the only way in" : "optional", at: [50, 18], mobileAt: [75, 12], state: d.prOnly ? "good" : "dim" },
    { id: "prod", label: "Production", sub: d.prOnly ? "no console writes" : "console open", at: [86, 18], mobileAt: [75, 45], state: "active" },
    { id: "logs", label: "Audit log store", sub: d.logs === "locked" ? "separate account, locked" : d.logs === "central" ? "central, deletable" : "none kept", at: [86, 82], mobileAt: [75, 80], state: d.logs === "locked" ? "good" : d.logs === "central" ? "wait" : "dim" },
    { id: "review", label: "Access reviews", sub: d.reviews ? "every quarter" : "never", at: [50, 82], mobileAt: [25, 80], state: d.reviews ? "good" : "dim" },
    { id: "auditor", label: "Auditor", sub: `${res.passed}/${QUESTIONS.length} answered`, at: [14, 82], mobileAt: [25, 45], state: res.exceptions ? "bad" : "good" },
  ];

  const flow: Packet[][] = [
    d.prOnly ? hops("c", ["eng", "pr", "prod"], { label: "change" }) : hops("c", ["eng", "prod"], { label: "console" }),
    logged ? hops("l", ["prod", "logs"], { label: "every API call" }) : [],
    d.reviews ? hops("r", ["review", "eng"], { label: "still needed?" }) : [],
    hops("b", ["eng", "prod"], { label: d.breakGlass ? "break-glass, alerted" : "shared admin" }),
    hops("e", [logged ? "logs" : "eng", "auditor"], { label: d.automated ? "export" : "screenshots" }),
  ];
  const special = hops("x", [source, "auditor"], { label: a.ok ? "evidence" : "gap", tone });
  const packets: Packet[] = stage === null ? [] : stage === q.step ? special : flow[stage];

  const captions = [
    d.prOnly ? "Step 1: every production change is a reviewed pull request, applied by the pipeline." : "Step 1: engineers can change production from the console or their laptops.",
    d.logs === "locked" ? "Step 2: every API call is logged to a separate account that production admins can't touch." : d.logs === "central" ? "Step 2: logs are collected centrally, but admins can delete them." : "Step 2: logs stay wherever each tool keeps them, for as long as it keeps them.",
    d.reviews ? "Step 3: each quarter, managers confirm every admin still needs access." : "Step 3: access is granted and never revisited.",
    d.breakGlass ? "Step 4: emergency access is a separate role, tied to an incident and announced when used." : "Step 4: in an emergency someone uses the shared admin login.",
    d.automated ? "Step 5: evidence is collected continuously and exported on request." : "Step 5: evidence is gathered by hand when the auditor asks.",
  ];
  const caption = stage !== null ? (stage === q.step ? `${captions[stage]} “${q.ask}” ${a.evidence}.` : captions[stage]) : `${res.passed} of ${QUESTIONS.length} answered, ${res.exceptions} exception${res.exceptions === 1 ? "" : "s"} · ${a.evidence}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="Audit trails and compliance"
        blurb="A SOC 2 audit isn't about having good intentions; it's about showing evidence, months later, that every production change was reviewed and every privileged action is accounted for. An auditor asks six questions. The controls you built a year ago decide which you can answer."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Engineers change production through pull requests or the console; production writes audit logs; access reviews and the logs feed evidence to the auditor"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "eng", to: "pr", label: "PR", dim: !d.prOnly },
                  { from: "pr", to: "prod", label: "apply", dim: !d.prOnly },
                  { from: "eng", to: "prod", label: d.breakGlass ? "break-glass" : "console", dim: d.prOnly && d.breakGlass },
                  { from: "prod", to: "logs", label: "audit", dim: !logged },
                  { from: "logs", to: "auditor", label: "evidence", dim: !logged },
                  { from: "review", to: "auditor", label: "sign-offs", dim: !d.reviews },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Six audit questions">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">
                  six questions · {res.passed}/{QUESTIONS.length} · {res.exceptions} exception{res.exceptions === 1 ? "" : "s"}
                </p>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {res.rows.map((r) => (
                    <li key={r.q.id}>
                      <span style={{ color: r.ok ? "var(--good)" : "var(--bad)" }} aria-hidden>
                        {r.ok ? "✓ " : "✕ "}
                      </span>
                      {r.q.ask}
                      <span className="block text-[11px] text-[var(--muted)]">{r.evidence}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices<QuestionId> label="The auditor asks" accent={ACCENT} value={qid} onChange={setQid} options={QUESTIONS.map((x) => ({ id: x.id, label: x.ask.length > 46 ? x.ask.slice(0, 44) + "…" : x.ask }))} />
              </div>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Startup defaults
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Audit-ready
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Auditing…">
                Answer the auditor
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Make the pipeline the only way to change production" what="If every change is a pull request approved by someone else and applied by the pipeline, the evidence for “who changed it and who approved it” already exists, for every change." accent={ACCENT} active={at(0)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.prOnly} onChange={(e) => set({ prOnly: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Reviewed pull requests only; no console writes
                </label>
              </FlowStep>
              <FlowArrow label="actions" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Log every action where admins can't edit it" what="Cloud audit logs and Kubernetes audit logs record every API call. Ship them to a separate account, lock them for the retention period, and turn on integrity digests, so the people being audited can't change the record." accent={ACCENT} active={at(1)}>
                <Choices<Logs> label="Audit logs" accent={ACCENT} value={d.logs} onChange={(x) => set({ logs: x })} options={[{ id: "none", label: "Wherever they land" }, { id: "central", label: "Central" }, { id: "locked", label: "Central and locked" }]} />
              </FlowStep>
              <FlowArrow label="access" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Review who has access, on a schedule" what="Access piles up: people change teams, contractors leave. A quarterly review where managers confirm each admin is the control auditors look for, and the record of it is the evidence." accent={ACCENT} active={at(2)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.reviews} onChange={(e) => set({ reviews: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Quarterly access reviews
                </label>
              </FlowStep>
              <FlowArrow label="emergencies" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Make emergency access loud" what="Sometimes someone has to bypass the pipeline. A break-glass role, assumed from a personal account, tied to an incident and announced in the security channel, keeps the bypass accountable." accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.breakGlass} onChange={(e) => set({ breakGlass: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Break-glass role instead of a shared admin login
                </label>
              </FlowStep>
              <FlowArrow label="evidence" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Collect evidence continuously" what="Compliance tools pull pull-request approvals, deploy records, access reviews and log settings all year, so the audit is an export, not a scramble." accent={ACCENT} active={at(4)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.automated} onChange={(e) => set({ automated: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Automated evidence collection
                </label>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Each answer follows from the controls; the change, the people and the preparation times are illustrative.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
