"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { AWS_KEY, FIRST, FIXED, FOUND_AFTER_DAYS, LEAKS, SHORT_LIVED_MIN, TOKEN, judge, logLines, scan, scorecard, tokenFor, type Design, type LeakId } from "@/lib/pipelineSecrets";

const ACCENT = "var(--ops)";

export default function PipelineSecretsDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [lid, setLid] = useState<LeakId>("log");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const v = judge(lid, d);
  const card = scorecard(d);
  const leak = LEAKS.find((x) => x.id === lid)!;
  const tone = v.safe ? "good" : "bad";
  const token = tokenFor(d);

  const nodes: MapNode[] = [
    { id: "dev", label: "Developer", sub: "pushes code", at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "git", label: "Git host", sub: d.pushProtection ? "push protection on" : "accepts anything", at: [50, 18], mobileAt: [75, 12], state: lid === "commit" ? tone : "active" },
    { id: "ci", label: "CI runner", sub: d.noPrint ? "prints no secrets" : "set -x, debug logs", at: [86, 18], mobileAt: [75, 45], state: lid === "log" ? tone : "active" },
    { id: "registry", label: "Image registry", sub: d.buildSecret ? "no secrets in layers" : "token in build history", at: [86, 82], mobileAt: [75, 80], state: lid === "image" ? tone : "active" },
    { id: "attacker", label: lid === "fork" ? "Fork's PR" : "Someone curious", sub: lid === "fork" ? "edits the workflow" : "reads logs, pulls images", at: [50, 82], mobileAt: [25, 80], state: v.safe ? "dim" : "bad" },
    { id: "cloud", label: "Deploy target", sub: d.shortLived ? `token expires in ${SHORT_LIVED_MIN} min` : "token never expires", at: [14, 82], mobileAt: [25, 45], state: lid === "late" ? tone : "active" },
  ];

  const flow: Packet[][] = [
    hops("p", ["dev", "git"], { label: "push" }),
    hops("l", ["git", "ci"], { label: "run" }),
    hops("b", ["ci", "registry"], { label: "image" }),
    hops("f", ["git", "ci"], { label: "PR" }),
    hops("c", ["ci", "cloud"], { label: d.shortLived ? "1-hour token" : "stored token" }),
  ];
  const special: Packet[] =
    lid === "commit" ? hops("x", ["dev", "git"], { label: v.safe ? "rejected" : "token in history", tone })
    : lid === "log" ? hops("x", ["ci", "attacker"], { label: v.safe ? "nothing to read" : "base64 in log", tone })
    : lid === "image" ? hops("x", ["registry", "attacker"], { label: v.safe ? "clean layers" : "ARG in history", tone })
    : lid === "fork" ? hops("x", ["attacker", "ci"], { label: v.safe ? "no secrets" : "exfiltrate", tone })
    : hops("x", ["attacker", "cloud"], { label: v.safe ? "expired" : "still valid", tone });
  const packets: Packet[] = stage === null ? [] : stage === leak.step ? special : flow[stage];

  const captions = [
    d.pushProtection ? "Step 1: the git host scans every push for known token formats." : "Step 1: pushes are accepted without looking inside.",
    d.noPrint ? "Step 2: scripts never echo credentials and don't run with set -x." : "Step 2: the job runs with set -x and a debug line; masking hides exact matches only.",
    d.buildSecret ? "Step 3: the image build mounts the token for one step." : "Step 3: the token is a build ARG, recorded in the image history.",
    d.forkSafe ? "Step 4: pull requests from forks run without secrets." : "Step 4: pull requests from forks run with the repository's secrets.",
    d.shortLived ? `Step 5: each job gets a token that expires after ${SHORT_LIVED_MIN} minutes.` : "Step 5: the job uses a personal access token that never expires.",
  ];
  const caption = stage !== null ? (stage === leak.step ? `${captions[stage]} ${leak.title}: ${v.text}.` : captions[stage]) : `${card.filter((c) => c.safe).length} of ${LEAKS.length} leaks stopped · ${leak.title}: ${v.text}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="Secrets in pipelines and clusters"
        blurb="A CI pipeline holds the keys to production: a deploy token, cloud credentials, a registry password. They leak in ordinary ways: a commit, a debug line, an image, a fork's pull request, a token nobody rotated. Five leaks, five controls; the scanner and the log masking really run."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="A developer pushes to the git host, CI runs, builds an image and deploys; someone curious or a fork's pull request looks for the token"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "dev", to: "git", label: "push" },
                  { from: "git", to: "ci", label: "trigger" },
                  { from: "ci", to: "registry", label: "image" },
                  { from: "ci", to: "cloud", label: "deploy" },
                  { from: "attacker", to: "ci", label: lid === "fork" ? "PR" : "logs", dim: v.safe },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Five leaks and the build log">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">five leaks · {card.filter((c) => c.safe).length}/{LEAKS.length} stopped</p>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {card.map((c) => (
                    <li key={c.leak.id}>
                      <span style={{ color: c.safe ? "var(--good)" : "var(--bad)" }} aria-hidden>
                        {c.safe ? "✓ " : "✕ "}
                      </span>
                      {c.leak.title}
                      <span className="block text-[11px] text-[var(--muted)]">{c.text}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">build log, as anyone with access sees it</p>
                <pre className="mt-1 overflow-x-auto whitespace-pre rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] leading-relaxed">{logLines(d).join("\n")}</pre>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices<LeakId> label="Leak" accent={ACCENT} value={lid} onChange={setLid} options={LEAKS.map((x) => ({ id: x.id, label: x.title }))} />
              </div>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Masking only
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Every control
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Running…">
                Run the pipeline
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Block secrets at the push" what="Secret scanning matches the formats of real tokens and keys in every pushed change. Once a secret is in history it stays in every clone, so rejecting the push is the only clean fix." accent={ACCENT} active={at(0)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.pushProtection} onChange={(e) => set({ pushProtection: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Push protection
                </label>
                <p className="break-all font-mono text-[10px] text-[var(--muted)]">
                  scan(“registry_token = {TOKEN.slice(0, 8)}…, {AWS_KEY.slice(0, 8)}…”) → {scan(`${TOKEN} ${AWS_KEY}`).join(", ")}
                </p>
              </FlowStep>
              <FlowArrow label="CI job" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Don't print them at all" what="CI masks a registered secret's exact text in logs. It can't recognise it base64-encoded, URL-encoded or split across lines. Only scripts that never print credentials are safe." accent={ACCENT} active={at(1)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.noPrint} onChange={(e) => set({ noPrint: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  No set -x, no debug output of credentials
                </label>
                <p className="break-all font-mono text-[10px] text-[var(--muted)]">secret: {token.slice(0, 6)}… → masked as ***; its base64 is not</p>
              </FlowStep>
              <FlowArrow label="image build" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Keep them out of images" what="Build arguments and environment variables are saved in the image's history. A build secret mount gives one RUN step the value and records nothing." accent={ACCENT} active={at(2)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.buildSecret} onChange={(e) => set({ buildSecret: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  RUN --mount=type=secret instead of ARG
                </label>
              </FlowStep>
              <FlowArrow label="pull requests" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Give forks no secrets" what="A pull request from a fork runs code you haven't reviewed. Triggers that hand it the repository's secrets (pull_request_target running the fork's code) let anyone with a GitHub account take them." accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.forkSafe} onChange={(e) => set({ forkSafe: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Forks run on pull_request, without secrets
                </label>
              </FlowStep>
              <FlowArrow label="credentials" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Make leaks expire" what={`Some leak will get past everything. A token issued per job that lasts ${SHORT_LIVED_MIN} minutes (an app installation token, or OIDC to a cloud) is useless by the time anyone finds it ${FOUND_AFTER_DAYS} days later.`} accent={ACCENT} active={at(4)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.shortLived} onChange={(e) => set({ shortLived: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Short-lived tokens per job
                </label>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The token-pattern scan, the masking and the base64 run here on example values shaped like real credentials.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
