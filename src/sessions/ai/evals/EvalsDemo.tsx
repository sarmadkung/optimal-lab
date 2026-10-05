"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, Meter, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMapPanel } from "@/components/system/SystemMap";
import { BANNED, CASES, MAX_WORDS, VERSIONS, codeChecks, summary, type Graders, type Version } from "@/lib/evals";

const ACCENT = "var(--ai)";

export default function EvalsDemo() {
  const [version, setVersion] = useState<Version>("v2");
  const [graders, setGraders] = useState<Graders>({ code: false, judge: true });
  const [caseId, setCaseId] = useState(CASES[1].id);
  const { stage, busy, run } = useWalk(6, 800);
  const on = (s: number) => stage === s;

  const s = summary(version, graders);
  const both = { v1: summary("v1", graders), v2: summary("v2", graders) };
  const picked = s.rows.find((r) => r.c.id === caseId) ?? s.rows[0];
  const noGraders = !graders.code && !graders.judge;
  const autoWinner = both.v1.passed === both.v2.passed ? null : both.v1.passed > both.v2.passed ? "v1" : "v2";
  const humanWinner = both.v1.human === both.v2.human ? null : both.v1.human > both.v2.human ? "v1" : "v2";
  const label = (v: Version) => VERSIONS.find((x) => x.id === v)!.label;

  const caption = noGraders
    ? "No graders on: every answer “passes”. Switch at least one on."
    : autoWinner === humanWinner
      ? `Your graders and the people agree: ${autoWinner ? `${label(autoWinner)} is better` : "it's a tie"}. This is an eval you can trust on the next change.`
      : `Your graders pick ${autoWinner ? label(autoWinner) : "a tie"}, but the people prefer ${humanWinner ? label(humanWinner) : "neither"}. The eval is wrong, not the people.`;

  const toggle = (k: keyof Graders) => setGraders((g) => ({ ...g, [k]: !g[k] }));

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Engineering · interactive"
        title="Evals: is the new prompt actually better?"
        blurb="You changed the prompt and the answers read nicer. Are they better? An eval runs both versions over the same cases and grades them: code checks for hard rules, an LLM judge for meaning, and people to keep the judge honest."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5" aria-label="Results for every test case">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">{label(version)} · 8 cases</p>
                <p className="font-mono text-sm">
                  {s.passed}/{s.total} pass · people {s.human}/{s.total}
                </p>
              </div>
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[var(--faint)]">
                    <th className="py-1 font-normal">Case</th>
                    <th className="w-14 py-1 text-center font-normal">Code</th>
                    <th className="w-14 py-1 text-center font-normal">Judge</th>
                    <th className="w-14 py-1 text-center font-normal">Person</th>
                  </tr>
                </thead>
                <tbody>
                  {s.rows.map((row) => {
                    const codeOk = row.checks.every((c) => c.pass);
                    const selected = row.c.id === picked.c.id;
                    return (
                      <tr key={row.c.id} className="border-t border-[var(--line)]" style={selected ? { background: `color-mix(in srgb, ${ACCENT} 10%, transparent)` } : undefined}>
                        <td className="max-w-0 py-0">
                          <button type="button" onClick={() => setCaseId(row.c.id)} className="min-h-11 w-full truncate text-left" aria-pressed={selected}>
                            {row.c.question}
                          </button>
                        </td>
                        <Mark ok={codeOk} off={!graders.code} />
                        <Mark ok={row.judge} off={!graders.judge} />
                        <Mark ok={row.human} />
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="mt-4 rounded-lg bg-[var(--inset)] p-3">
                <p className="text-xs text-[var(--faint)]">{picked.c.question}</p>
                <p className="mt-1 text-sm">{picked.c.answers[version].text}</p>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Judge: {picked.judge ? "pass" : "fail"}, “{picked.c.answers[version].judge.why}” · Person: {picked.human ? "pass" : "fail"}
                </p>
              </div>
            </section>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <Choices label="Version" accent={ACCENT} value={version} onChange={setVersion} options={VERSIONS.map((v) => ({ id: v.id, label: v.label }))} />
              <div className="w-full">
                <p className="mb-2 text-sm font-medium">Graders that count</p>
                <div className="flex flex-wrap gap-2">
                  {(["code", "judge"] as const).map((k) => (
                    <label key={k} className="flex min-h-11 items-center gap-2 rounded-md border border-[var(--line)] px-3 text-sm">
                      <input type="checkbox" checked={graders[k]} onChange={() => toggle(k)} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                      {k === "code" ? "Code checks" : "LLM judge"}
                    </label>
                  ))}
                </div>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Running the eval…">
                Run the eval
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Write the test cases" what="Real questions from users, including the awkward ones. Each case says what a good answer must contain." accent={ACCENT} active={on(0)}>
                <ul className="space-y-1 text-sm">
                  {CASES.map((c) => (
                    <li key={c.id} className="flex justify-between gap-3">
                      <span className="min-w-0 truncate">{c.question}</span>
                      <span className="shrink-0 font-mono text-xs text-[var(--faint)]">“{c.mustSay}”</span>
                    </li>
                  ))}
                </ul>
              </FlowStep>
              <FlowArrow label="8 questions" accent={ACCENT} active={on(1)} />

              <FlowStep n={2} title="Run each version on every case" what="Same questions, same model, only the prompt changes. Save every output so you can read them." accent={ACCENT} active={on(1)}>
                <ul className="space-y-2 text-sm">
                  {VERSIONS.map((v) => (
                    <li key={v.id}>
                      <span className="font-medium">{v.label}</span> <span className="text-[var(--muted)]">“{v.prompt}”</span>
                    </li>
                  ))}
                </ul>
              </FlowStep>
              <FlowArrow label="16 answers" accent={ACCENT} active={on(2)} />

              <FlowStep n={3} title="Run the code checks" what="Plain code, no model: does it state the fact, is it short enough, does it promise what policy forbids? Fast, cheap, and never moody." accent={ACCENT} active={on(2)}>
                <ul className="space-y-1.5 text-sm">
                  {codeChecks(CASES[0], version).map((check, idx) => {
                    const passed = s.rows.filter((r) => r.checks[idx].pass).length;
                    return (
                      <li key={check.id} className="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-2">
                        <span className="min-w-0">{check.label}</span>
                        <span className="text-right font-mono tabular-nums">{passed}/8</span>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-2 text-xs text-[var(--faint)]">
                  Limit {MAX_WORDS} words. Forbidden: {BANNED.map((b) => `“${b}”`).join(", ")}.
                </p>
              </FlowStep>
              <FlowArrow label="hard failures" accent={ACCENT} active={on(3)} />

              <FlowStep n={4} title="Ask an LLM judge" what="A second model grades meaning that code can't: is it correct, honest, on policy? It reads the answer and the policy and says pass or fail." accent={ACCENT} active={on(3)}>
                <p className="text-sm">
                  The judge passes <span className="font-mono">{s.rows.filter((r) => r.judge).length}/8</span> answers from {label(version)}.
                </p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Judges are known to favour long, warm, confident answers. Watch what that does to Prompt v2.
                </p>
              </FlowStep>
              <FlowArrow label="model verdicts" accent={ACCENT} active={on(4)} />

              <FlowStep n={5} title="Check the judge against people" what="A person labels the same answers. Until the judge agrees with them, its score is an opinion, not a measurement." accent={ACCENT} active={on(4)}>
                <p className="text-sm">
                  Judge agrees with the person on <span className="font-mono">{s.judgeAgree}/8</span> answers.
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  {s.rows
                    .filter((r) => r.judge !== r.human)
                    .map((r) => (
                      <li key={r.c.id}>
                        <button type="button" onClick={() => setCaseId(r.c.id)} className="min-h-11 text-left underline-offset-2 hover:underline">
                          {r.c.question} <span className="text-[var(--bad)]">judge {r.judge ? "passed" : "failed"}, person {r.human ? "passed" : "failed"}</span>
                        </button>
                      </li>
                    ))}
                </ul>
              </FlowStep>
              <FlowArrow label="trusted scores" accent={ACCENT} active={on(5)} />

              <FlowStep n={6} title="Compare the versions, then decide" what="Ship only if the new version wins on graders you have checked against people. Then add the cases you got wrong to the set, and run it on every change." accent={ACCENT} active={on(5)}>
                <ul className="space-y-3">
                  {VERSIONS.map((v) => (
                    <li key={v.id}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{v.label}</span>
                        <span className="font-mono tabular-nums">
                          graders {both[v.id].passed}/8 · people {both[v.id].human}/8
                        </span>
                      </div>
                      <Meter value={both[v.id].passed} max={8} color={ACCENT} />
                      <div className="mt-1">
                        <Meter value={both[v.id].human} max={8} color="var(--c3)" />
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm" style={{ color: autoWinner === humanWinner && !noGraders ? "var(--good)" : "var(--bad)" }}>
                  {caption}
                </p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Mark({ ok, off = false }: { ok: boolean; off?: boolean }) {
  return (
    <td className="text-center font-mono" style={{ color: off ? "var(--faint)" : ok ? "var(--good)" : "var(--bad)", opacity: off ? 0.5 : 1 }}>
      <span aria-label={off ? (ok ? "pass, not counted" : "fail, not counted") : ok ? "pass" : "fail"}>{ok ? "✓" : "✗"}</span>
    </td>
  );
}
