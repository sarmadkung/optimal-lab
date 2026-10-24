"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { CHANGES, EXCEPTIONS, FIRST, FIXED, REGO, RULES, check, scorecard, violations, type Design, type Enforce, type Where } from "@/lib/policyAsCode";

const ACCENT = "var(--ops)";

export default function PolicyAsCodeDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [cid, setCid] = useState("bucket");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const c = CHANGES.find((x) => x.id === cid)!;
  const o = check(c, d);
  const v = violations(c, d);
  const card = scorecard(d);
  const late = card.filter((x) => x.result === "blocked at apply" && x.change.risky).length;
  const consoleChange = c.via === "console";
  const reached = o.result === "applied" || o.result === "warned" || o.result === "allowed" || o.result === "reverted by the cloud";

  const nodes: MapNode[] = [
    { id: "dev", label: consoleChange ? "Cloud console" : "Pull request", sub: consoleChange ? "a click, no pipeline" : `${c.resource.type}.${c.resource.name}`.slice(0, 26), at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "prcheck", label: "PR check", sub: d.where === "pr" ? "conftest on the plan" : "not run", at: [50, 18], mobileAt: [75, 12], state: consoleChange || d.where !== "pr" ? "dim" : o.result === "blocked in PR" ? (o.ok ? "good" : "bad") : "active" },
    { id: "main", label: "main", sub: o.result === "blocked at apply" ? "merged, can't apply" : "merged", at: [86, 18], mobileAt: [75, 45], state: consoleChange || o.result === "blocked in PR" ? "dim" : o.result === "blocked at apply" ? "wait" : "active" },
    { id: "apply", label: "Apply pipeline", sub: d.where === "apply" ? `policy ${d.enforce}` : "plan + apply", at: [86, 82], mobileAt: [25, 45], state: consoleChange || o.result === "blocked in PR" ? "dim" : o.result === "blocked at apply" ? (o.ok ? "good" : "bad") : "active" },
    { id: "cloud", label: "AWS account", sub: reached ? (o.ok ? "fine" : "now exposed") : "unchanged", at: [50, 82], mobileAt: [25, 80], state: reached ? (o.ok ? "good" : "bad") : "good" },
    { id: "guard", label: "Cloud-side rule", sub: d.guardrail ? "checks every bucket" : "none", at: [14, 82], mobileAt: [75, 80], state: d.guardrail ? (consoleChange ? "good" : "active") : "dim" },
  ];

  const tone = o.ok ? "good" : "bad";
  const path: Packet[][] = consoleChange
    ? [hops("c0", ["dev", "cloud"], { label: "click", tone: d.guardrail ? undefined : "bad" }), [], [], [], d.guardrail ? hops("c4", ["guard", "cloud"], { label: "revert", tone: "good" }) : []]
    : [
        hops("p0", ["dev", "prcheck"], { label: "plan JSON" }),
        d.where === "pr" ? hops("p1", ["prcheck", o.result === "blocked in PR" ? "dev" : "main"], { label: o.result === "blocked in PR" ? "✕ fails" : "passes", tone: o.result === "blocked in PR" ? tone : undefined }) : hops("p1", ["dev", "main"], { label: "merge" }),
        o.result === "blocked in PR" ? [] : hops("p2", ["main", "apply"], { label: "apply" }),
        o.result === "blocked in PR" ? [] : hops("p3", ["apply", o.result === "blocked at apply" ? "main" : "cloud"], { label: o.result === "blocked at apply" ? "✕ denied" : o.result === "warned" ? "warning, applied" : "applied", tone }),
        [],
      ];
  const packets: Packet[] = stage === null ? [] : path[stage];

  const captions = [
    consoleChange ? "Step 1: the change is made by hand in the console; no plan, no pipeline." : `Step 1: the plan's JSON is checked by ${RULES.length} rules: ${v.length ? v.map((x) => x.rule.id).join(", ") : "none match"}.`,
    consoleChange ? "Step 2: there is no pull request to check." : d.where === "pr" ? `Step 2: the PR check ${o.result === "blocked in PR" ? "fails" : "passes"}.` : "Step 2: nothing checks the pull request; it merges.",
    consoleChange ? "Step 3: nothing in the pipeline sees it." : `Step 3: policies ${d.enforce === "mandatory" ? "block on any deny" : "only print warnings"}.`,
    consoleChange ? "Step 4: no exception list is consulted." : v.some((x) => x.excepted) ? "Step 4: a recorded exception covers this resource." : "Step 4: no exception applies.",
    `Step 5: ${o.text}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${card.filter((x) => x.ok).length} of ${CHANGES.length} handled${late ? ` · ${late} caught only after merge` : ""} · ${c.title}: ${o.text}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="Policy as code"
        blurb="Reviewers miss things: a public bucket, port 22 open to the world, an unencrypted database. Policy as code writes those rules as code and runs them on every plan. Seven changes arrive, two of them legitimate exceptions to the rules and one made by hand in the console."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="A pull request is checked, merged to main and applied to the AWS account; a cloud-side rule watches the account itself"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "dev", to: "prcheck", label: "plan", dim: consoleChange },
                  { from: "prcheck", to: "main", label: "merge", dim: consoleChange },
                  { from: "main", to: "apply", label: "deploy", dim: consoleChange },
                  { from: "apply", to: "cloud", label: "apply", dim: consoleChange },
                  { from: "guard", to: "cloud", label: "watch", dim: !d.guardrail },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Seven changes">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">
                  seven changes · {card.filter((x) => x.ok).length}/{CHANGES.length}
                  {late ? ` · ${late} caught after merge` : ""}
                </p>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {card.map((x) => (
                    <li key={x.change.id}>
                      <span style={{ color: x.ok ? "var(--good)" : "var(--bad)" }} aria-hidden>
                        {x.ok ? "✓ " : "✕ "}
                      </span>
                      {x.change.title} <span className="font-mono text-[10px] text-[var(--faint)]">{x.result}</span>
                      <span className="block text-[11px] text-[var(--muted)]">{x.text}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices<string> label="Change" accent={ACCENT} value={cid} onChange={setCid} options={CHANGES.map((x) => ({ id: x.id, label: x.title }))} />
              </div>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Advisory, at apply
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Mandatory, in PRs, with guardrails
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Checking…">
                Submit the change
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Write the rules as code" what="Each rule reads the JSON of terraform plan and returns a message for anything it forbids. Rules are versioned, reviewed and tested like the code they check." accent={ACCENT} active={at(0)}>
                <pre className="max-h-40 overflow-auto whitespace-pre rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] leading-relaxed">{REGO}</pre>
                <ul className="mt-2 space-y-0.5 font-mono text-[10px]">
                  {RULES.map((r) => {
                    const hit = v.find((x) => x.rule.id === r.id);
                    return (
                      <li key={r.id} style={{ color: hit ? (hit.excepted ? "var(--c2)" : r.severity === "deny" ? "var(--bad)" : "var(--c2)") : "var(--faint)" }}>
                        {hit ? (hit.excepted ? "excepted" : r.severity) : "pass"} · {r.id}: {r.text}
                      </li>
                    );
                  })}
                </ul>
              </FlowStep>
              <FlowArrow label="pull request" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Check in the pull request" what="Run the rules where the change is still a proposal. Checking only at apply time catches it after merge, when main already holds code the pipeline refuses to apply." accent={ACCENT} active={at(1)}>
                <Choices<Where> label="Policies run" accent={ACCENT} value={d.where} onChange={(x) => set({ where: x })} options={[{ id: "apply", label: "At apply" }, { id: "pr", label: "On every pull request" }]} />
              </FlowStep>
              <FlowArrow label="verdict" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Make deny mean deny" what="Advisory rules print warnings people learn to scroll past. Mandatory rules fail the check. Keep warnings for judgement calls, such as a very large instance, and deny for things that are never fine." accent={ACCENT} active={at(2)}>
                <Choices<Enforce> label="Enforcement" accent={ACCENT} value={d.enforce} onChange={(x) => set({ enforce: x })} options={[{ id: "advisory", label: "Advisory" }, { id: "mandatory", label: "Mandatory" }]} />
              </FlowStep>
              <FlowArrow label="exceptions" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Record exceptions, with an owner and an expiry" what="Some rules have real exceptions: a marketing site's bucket is public on purpose. Without a way to say so, the team disables the rule. A recorded exception says who, why and until when." accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.exceptions} onChange={(e) => set({ exceptions: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Exception list
                </label>
                {d.exceptions && (
                  <p className="font-mono text-[10px] text-[var(--muted)]">
                    {EXCEPTIONS[0].resource}: {EXCEPTIONS[0].rule}, {EXCEPTIONS[0].owner}, “{EXCEPTIONS[0].reason}”, until {EXCEPTIONS[0].expires}
                  </p>
                )}
              </FlowStep>
              <FlowArrow label="the account" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Guard the cloud, not just the pipeline" what="Pipeline policies only see changes made through the pipeline. A rule that runs in the cloud account itself (AWS Config, Azure Policy, an organization policy) catches the console click too." accent={ACCENT} active={at(4)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.guardrail} onChange={(e) => set({ guardrail: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Cloud-side rule with auto-remediation
                </label>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Every rule is a real check over the planned resource here; the Rego shows how one looks in OPA.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
