"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { FIRST, FIXED, PRINCIPALS, REQUESTS, SCP, evaluate, json, policiesFor, scorecard, type Design, type Policies } from "@/lib/cloudIam";

const ACCENT = "var(--ops)";

export default function CloudIamDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [rid, setRid] = useState("mine");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const r = REQUESTS.find((x) => x.id === rid)!;
  const e = evaluate(r, d);
  const card = scorecard(d);
  const allowed = e.decision === "Allow";
  const noKey = e.decision === "No key to use";
  const bySCP = e.by.startsWith("organization SCP");
  const creds = r.who === "dev" ? `SSO session${r.mfa ? " + MFA" : ""}` : r.who === "app" ? "task role, auto-rotated" : d.ciOidc ? "OIDC token, 1 hour" : "access key in CI secrets";

  const nodes: MapNode[] = [
    { id: "caller", label: PRINCIPALS[r.who], sub: r.action, at: [14, 18], mobileAt: [25, 12], state: r.who === "leaked" ? "bad" : "active" },
    { id: "creds", label: "Credentials", sub: creds, at: [50, 18], mobileAt: [75, 12], state: noKey ? "good" : r.who === "leaked" ? "bad" : "active" },
    { id: "scp", label: "Org guardrails", sub: d.scp ? `${SCP.length} SCP denies` : "none", at: [86, 18], mobileAt: [75, 45], state: noKey ? "dim" : bySCP ? "good" : d.scp ? "active" : "dim" },
    { id: "policy", label: "Role policy", sub: d.policies === "admin" ? "Allow * on *" : "least privilege", at: [86, 82], mobileAt: [25, 45], state: noKey || bySCP ? "dim" : d.policies === "admin" ? "wait" : "active" },
    { id: "decision", label: e.decision, sub: e.ok ? "as intended" : "should be the opposite", at: [50, 82], mobileAt: [25, 80], state: noKey ? "dim" : e.ok ? "good" : "bad" },
    { id: "resource", label: r.resource.split(":").slice(2, 3)[0].toUpperCase() || "AWS", sub: r.resource.split(":").slice(-1)[0].replace(/^.*\//, "").slice(0, 22), at: [14, 82], mobileAt: [75, 80], state: allowed ? (e.ok ? "good" : "bad") : "idle" },
  ];

  const packets: Packet[] = (() => {
    if (stage === null) return [];
    if (noKey) return stage === 0 ? hops("k", ["caller", "creds"], { label: "no key", tone: "good" }) : [];
    if (stage === 0) return hops("s0", ["caller", "creds"], { label: "sign" });
    if (stage === 1) return hops("s1", ["creds", "scp"], { label: "request" });
    if (stage === 2) return bySCP ? hops("s2", ["scp", "decision"], { label: "Deny", tone: e.ok ? "good" : "bad" }) : hops("s2", ["scp", "policy"], { label: "no deny" });
    if (stage === 3) return bySCP ? [] : hops("s3", ["policy", "decision"], { label: e.decision.split(" ")[0] });
    return allowed ? hops("go", ["decision", "resource"], { label: r.action.split(":")[1], tone: e.ok ? "good" : "bad" }) : hops("no", ["decision", "caller"], { label: "AccessDenied", tone: e.ok ? "good" : "bad" });
  })();

  const captions = [
    noKey ? "Step 1: the attacker has nothing: CI never stored a long-lived key." : `Step 1: the request is signed with ${creds}.`,
    d.scp ? (bySCP ? `Step 2: ${e.by}.` : "Step 2: no organization guardrail matches.") : "Step 2: no organization guardrails.",
    bySCP || noKey ? "Step 3: the role's own policy doesn't matter now." : `Step 3: the role policy is evaluated: ${d.policies === "admin" ? "Allow * on *" : "only what this role needs"}.`,
    noKey ? "Step 4: nothing to evaluate." : `Step 4: ${e.decision}: ${e.by}.`,
    noKey ? `Step 5: ${e.by}.` : `Step 5: ${allowed ? "the call goes through" : "AccessDenied"}${e.ok ? ", as intended" : r.want === "Deny" ? ": it should have been denied" : ": it should have been allowed"}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${card.filter((x) => x.ok).length} of ${REQUESTS.length} requests decided correctly · ${r.title}: ${e.decision}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="Cloud IAM: roles and policies"
        blurb="Every call to a cloud API is signed by someone and checked against policies. An explicit Deny anywhere wins; otherwise any Allow lets it through; otherwise it's denied. Eight requests, from the app, CI, a developer and an attacker holding a leaked key, through a real evaluator."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="A caller signs a request with credentials; organization guardrails, then the role's policy are evaluated; the decision allows or denies access to the resource"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "caller", to: "creds", label: "sign" },
                  { from: "creds", to: "scp", label: "request", dim: !d.scp },
                  { from: "scp", to: "policy", label: "no deny" },
                  { from: "policy", to: "decision", label: "evaluate" },
                  { from: "decision", to: "resource", label: "allow", dim: !allowed },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Eight requests">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">eight requests · {card.filter((x) => x.ok).length}/{REQUESTS.length} right</p>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {card.map((x) => (
                    <li key={x.req.id}>
                      <span style={{ color: x.ok ? "var(--good)" : "var(--bad)" }} aria-hidden>
                        {x.ok ? "✓ " : "✕ "}
                      </span>
                      {x.req.title} <span className="font-mono text-[10px] text-[var(--faint)]">{x.decision}</span>
                      <span className="block break-words text-[11px] text-[var(--muted)]">{x.by}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices<string> label="Request" accent={ACCENT} value={rid} onChange={setRid} options={REQUESTS.map((x) => ({ id: x.id, label: x.title }))} />
              </div>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Admin for everyone
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Least privilege + guardrails
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Evaluating…">
                Send the request
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Sign with short-lived credentials" what="Workloads get credentials from their role, rotated automatically. CI should do the same through OIDC federation: a token valid for an hour, issued only to your repository. A stored access key works for anyone who finds it, from anywhere." accent={ACCENT} active={at(0)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.ciOidc} onChange={(e) => set({ ciOidc: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  CI assumes its role through OIDC (no stored keys)
                </label>
              </FlowStep>
              <FlowArrow label="request" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Set guardrails above every account" what="Service control policies are Deny statements that apply to everyone in the account, administrators included: never stop the audit trail, never run in regions you don't use." accent={ACCENT} active={at(1)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.scp} onChange={(e) => set({ scp: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Organization SCPs
                </label>
                {d.scp && <pre className="mt-1 overflow-x-auto whitespace-pre rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] leading-relaxed">{json(SCP).join("\n")}</pre>}
              </FlowStep>
              <FlowArrow label="no deny" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Give each role only what it needs" what="The app reads and writes objects in one bucket; CI updates one function. Anything not allowed is denied by default, so a bug or a stolen credential can only do what that role could." accent={ACCENT} active={at(2)}>
                <Choices<Policies> label="Role policies" accent={ACCENT} value={d.policies} onChange={(x) => set({ policies: x })} options={[{ id: "admin", label: "AdministratorAccess" }, { id: "least", label: "Least privilege" }]} />
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] leading-relaxed">{json(policiesFor(r.who, d)).join("\n")}</pre>
              </FlowStep>
              <FlowArrow label="statements" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Add conditions to dangerous actions" what="A condition makes an Allow depend on the request: MFA present, a source network, a tag. Deleting a production database should need a fresh MFA prompt, not just a logged-in laptop." accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.mfa} onChange={(e) => set({ mfa: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  rds:* requires aws:MultiFactorAuthPresent
                </label>
              </FlowStep>
              <FlowArrow label="decision" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Explicit deny, then allow, then deny" what="Evaluation order is the whole model: any matching Deny ends it; otherwise a matching Allow permits it; otherwise the answer is no." accent={ACCENT} active={at(4)}>
                <p className="break-words font-mono text-[11px]" style={{ color: e.ok ? "var(--good)" : "var(--bad)" }}>
                  {r.action} on {r.resource} → {e.decision}
                </p>
                <p className="mt-1 break-words text-[11px] text-[var(--muted)]">{e.by}</p>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The evaluator runs here: wildcard matching on actions and ARNs, MFA and region conditions, SCPs.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
