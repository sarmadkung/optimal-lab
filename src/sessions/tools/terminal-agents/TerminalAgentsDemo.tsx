"use client";

import { useState, type ReactNode } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { ALLOW, CAREFUL_PROMPTS, DENY, FIRST, FIXED, RISK_LABEL, SECONDS_PER_PROMPT, SESSION, runSession, type Decision, type Design, type Mode } from "@/lib/terminalAgents";

const ACCENT = "var(--tools)";
const HOW: Record<Decision["how"], string> = { allowed: "allowed", denied: "denied", "asked-yes": "you said yes", "asked-no": "you said no" };

export default function TerminalAgentsDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [pick, setPick] = useState(15);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const s = runSession(d);
  const x = s.decisions.find((y) => y.c.n === pick)!;
  const c = x.c;

  const toggle = (k: "deny" | "sandbox", label: string, extra?: ReactNode) => (
    <>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={d[k]} onChange={(e) => set({ [k]: e.target.checked } as Partial<Design>)} className="h-4 w-4" style={{ accentColor: ACCENT }} />
        {label}
      </label>
      {extra}
    </>
  );

  const target = c.risk === "push" ? "remote" : c.risk === "remote" ? "remote" : "box";
  const nodes: MapNode[] = [
    { id: "you", label: "You", sub: `${s.prompts} prompts · ${s.waitMin} min`, at: [14, 18], mobileAt: [25, 12], state: s.prompts > 6 ? "wait" : "active" },
    { id: "cli", label: "Agent in the terminal", sub: `${SESSION.length} tool calls`, at: [50, 18], mobileAt: [75, 12], state: "active" },
    { id: "model", label: "Model API", sub: "decides the next call", at: [86, 18], mobileAt: [75, 42], state: "active" },
    { id: "rules", label: "Permission rules", sub: d.mode === "skip" ? (d.deny ? "deny list only" : "skipped") : d.mode === "rules" ? `${ALLOW.length} allow · ${d.deny ? DENY.length : 0} deny` : "ask for writes", at: [50, 56], mobileAt: [25, 42], state: d.mode === "skip" && !d.deny ? "dim" : "good" },
    { id: "box", label: d.sandbox ? "Sandbox container" : "Your laptop", sub: d.sandbox ? "no secrets · registry only" : "your keys, your network", at: [14, 86], mobileAt: [25, 74], state: x.harm && target === "box" ? "bad" : d.sandbox ? "good" : "wait" },
    { id: "remote", label: "Internet + GitHub", sub: d.sandbox ? "unreachable" : "reachable", at: [86, 86], mobileAt: [75, 74], state: x.harm && target === "remote" ? "bad" : d.sandbox ? "dim" : "idle" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("p", ["model", "cli"], { label: `${c.tool}(${c.arg.length > 18 ? c.arg.slice(0, 17) + "…" : c.arg})` })
    : stage === 1 ? hops("r", ["cli", "rules"], { label: x.rule ?? "no rule", tone: x.how === "denied" ? "bad" : x.how === "allowed" ? "good" : undefined })
    : stage === 2 ? (x.how.startsWith("asked") ? hops("a", ["rules", "you", "rules"], { label: x.how === "asked-yes" ? "yes" : "no", tone: x.how === "asked-yes" && c.risk !== "none" ? "bad" : "good" }) : [])
    : stage === 3 ? (x.ran ? hops("x", target === "remote" ? ["rules", "box", "remote"] : ["rules", "box"], { label: x.harm ? "it happens" : c.risk !== "none" ? "fails in the box" : "runs", tone: x.harm ? "bad" : "good" }) : [])
    : stage === 4 ? hops("o", ["box", "cli", "model"], { label: x.ran ? "output" : "denied" })
    : [];

  const captions = [
    `Step 1: the agent asks to run ${c.tool}(${c.arg}) to ${c.why}.`,
    x.how === "denied" ? `Step 2: deny rule ${x.rule} matches; it never runs.` : x.rule ? `Step 2: allow rule ${x.rule} matches; it runs without asking.` : d.mode === "skip" ? "Step 2: permissions are skipped; it runs." : "Step 2: no rule matches, so you're asked.",
    x.how === "asked-yes" ? `Step 3: you click yes${c.risk !== "none" && s.decisions.filter((y) => y.how.startsWith("asked")).findIndex((y) => y.c.n === c.n) >= CAREFUL_PROMPTS ? ", the way you did for the last several prompts" : ""}.` : x.how === "asked-no" ? "Step 3: you read it and say no." : "Step 3: nobody is asked.",
    !x.ran ? "Step 4: nothing runs." : x.harm ? `Step 4: it runs: ${x.effect}.` : c.risk !== "none" ? `Step 4: it runs, and ${x.effect}.` : "Step 4: it runs.",
    `Step 5: the result goes back to the model, which picks the next call. Session: ${s.prompts} prompts, ${s.harms.length} harmful calls took effect.`,
  ];
  const caption = stage !== null ? captions[stage] : `${s.prompts} permission prompts (${s.waitMin} min of your attention) · ${s.blocked} calls blocked · ${s.harms.length} harmful: ${s.harms.map((h) => RISK_LABEL[h.c.risk]).join("; ") || "none"}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="Tools · interactive"
        title="Terminal coding agents"
        blurb="A terminal agent (Claude Code, Codex CLI, Gemini CLI and the like) reads files, edits them and runs commands until the tests pass. Fixing one failing test, it makes sixteen tool calls, and four of them you'd never want on your laptop. Decide what it may do without asking, what it may never do, and where it runs."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="You, the agent in the terminal, the model API, permission rules, the machine it runs on, and the internet with the GitHub remote"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "model", to: "cli", label: "tool call" },
                  { from: "cli", to: "rules", label: "check" },
                  { from: "rules", to: "you", label: "ask", dim: d.mode === "skip" },
                  { from: "rules", to: "box", label: "run" },
                  { from: "box", to: "remote", label: "network", dim: d.sandbox },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <Transcript d={d} pick={pick} setPick={setPick} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Skip permissions
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Rules + sandbox
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Running…">
                {`Run call ${c.n}`}
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="The model proposes a tool call" what="The agent is a loop: the model reads the conversation and asks for one tool call (read, search, edit, run a command), the CLI runs it and sends the output back. Everything below happens between asking and running." accent={ACCENT} active={at(0)}>
                <p className="font-mono text-xs">
                  {c.tool}({c.arg})
                </p>
                <p className="text-[11px] text-[var(--muted)]">to {c.why}{c.risk !== "none" ? ` · ${RISK_LABEL[c.risk]}` : ""}</p>
              </FlowStep>
              <FlowArrow label="a call" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Deny the things that must never happen" what="A short deny list beats a long allow list: secrets, piping the internet into a shell, pushing to shared branches. Deny rules are checked first, whatever else is allowed." accent={ACCENT} active={at(1)}>
                {toggle("deny", "Use the deny list", <p className="font-mono text-[11px] text-[var(--muted)]">{DENY.join(" · ")}</p>)}
              </FlowStep>
              <FlowArrow label="not denied" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Allow the routine, ask about the rest" what={`Asking before every command sounds safe, but after a handful of prompts people click yes without reading (here, after ${CAREFUL_PROMPTS}). Allow the calls you'd always approve, with patterns like Bash(pnpm test:*), so the prompts that remain get read. Prefix patterns are broad: pnpm test -u matches too.`} accent={ACCENT} active={at(2)}>
                <Choices<Mode> label="Without a deny match" accent={ACCENT} value={d.mode} onChange={(v) => set({ mode: v })} options={[{ id: "ask", label: "Ask for every write" }, { id: "rules", label: "Allow list, ask the rest" }, { id: "skip", label: "Skip permissions" }]} />
                {d.mode === "rules" && <p className="mt-2 font-mono text-[11px] text-[var(--muted)]">{ALLOW.join(" · ")}</p>}
              </FlowStep>
              <FlowArrow label="allowed" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Run it somewhere it can't do damage" what="A container with the repo, no credentials and network limited to the package registry turns the worst calls into errors. It doesn't stop bad code changes: a rewritten snapshot is still in the diff." accent={ACCENT} active={at(3)}>
                {toggle("sandbox", "Run in a container: no secrets, registry-only network")}
              </FlowStep>
              <FlowArrow label="output" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Count prompts and harm" what="A good setup asks rarely, blocks the dangerous, and leaves the remaining risk (bad code) to review." accent={ACCENT} active={at(4)}>
                <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-xs">
                  <dt>Prompts to you</dt>
                  <dd className="text-right font-mono">{s.prompts} ({s.waitMin} min at {SECONDS_PER_PROMPT} s)</dd>
                  <dt>Calls blocked</dt>
                  <dd className="text-right font-mono">{s.blocked}</dd>
                  <dt>Harmful calls that took effect</dt>
                  <dd className="text-right font-mono" style={{ color: s.harms.length ? "var(--bad)" : "var(--good)" }}>{s.harms.length}</dd>
                  <dt>Test fixed</dt>
                  <dd className="text-right font-mono">{s.fixed ? "yes" : "no"}</dd>
                </dl>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The session is illustrative. Rule matching, the deny list, the person&apos;s answers and the sandbox run here.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Transcript({ d, pick, setPick }: { d: Design; pick: number; setPick: (n: number) => void }) {
  const s = runSession(d);
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="The session's sixteen tool calls and what happened to each">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">session · pick a call</p>
        <p className="font-mono text-xs" style={{ color: s.harms.length ? "var(--bad)" : "var(--good)" }}>
          {s.harms.length} harmful
        </p>
      </div>
      <ul className="mt-3 space-y-0.5">
        {s.decisions.map((x) => (
          <li key={x.c.n}>
            <button type="button" aria-pressed={x.c.n === pick} onClick={() => setPick(x.c.n)} className="grid min-h-11 w-full grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-1.5 text-left text-xs" style={{ background: x.c.n === pick ? `color-mix(in srgb, ${ACCENT} 14%, transparent)` : "transparent" }}>
              <span className="font-mono text-[var(--faint)]">{x.c.n}</span>
              <span className="min-w-0 truncate font-mono text-[11px]">
                {x.c.tool}({x.c.arg})
              </span>
              <span className="text-right text-[11px]" style={{ color: x.harm ? "var(--bad)" : x.how === "denied" || x.how === "asked-no" ? "var(--c2)" : x.how.startsWith("asked") ? "var(--muted)" : "var(--good)" }}>
                {x.harm ? "harm" : HOW[x.how]}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
