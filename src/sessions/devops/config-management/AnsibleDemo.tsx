"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { BATCH, DRIFTED, FIRST, FIXED, HOSTS, RUNS, grouped, judge, playbook, scorecard, type Design, type RunId } from "@/lib/ansibleRun";

const ACCENT = "var(--ops)";
const GROUPS = [HOSTS.slice(0, 4), HOSTS.slice(4, 8), HOSTS.slice(8, 12)];

export default function AnsibleDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [rid, setRid] = useState<RunId>(2);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const v = judge(rid, d);
  const s = v.s;
  const card = scorecard(d);
  const runInfo = RUNS.find((r) => r.id === rid)!;
  const gid = (i: number) => `g${i}`;

  const nodes: MapNode[] = [
    { id: "ctl", label: "ansible-playbook", sub: `${HOSTS.length} hosts over SSH`, at: [14, 18], mobileAt: [25, 10], state: "active" },
    { id: "check", label: "--check --diff", sub: d.check ? `${d.modules ? s.preview.length : 0} changes shown` : "skipped", at: [50, 18], mobileAt: [75, 10], state: d.check ? (d.modules ? "good" : "wait") : "dim" },
    { id: "lb", label: "Load balancer", sub: `${HOSTS.length - s.down} of ${HOSTS.length} healthy`, at: [86, 18], mobileAt: [50, 36], state: s.down ? "bad" : s.together === HOSTS.length && rid !== 1 ? "wait" : "good" },
    ...GROUPS.map((g, i) => {
      const rs = s.recaps.filter((r) => g.includes(r.host));
      const down = rs.filter((r) => !r.up).length;
      const changed = rs.filter((r) => r.changed > 0).length;
      return {
        id: gid(i),
        label: `${g[0]}–${g.at(-1)!.slice(4)}`,
        sub: down ? `${down} down` : rs.some((r) => r.skipped) ? "not reached" : `${changed} changed`,
        at: ([[14, 82], [50, 82], [86, 82]] as [number, number][])[i],
        mobileAt: ([[20, 68], [80, 68], [50, 92]] as [number, number][])[i],
        state: (down ? "bad" : rs.some((r) => r.skipped) ? "dim" : changed ? "active" : "good") as MapNode["state"],
      };
    }),
  ];

  const restartedIn = (i: number) => s.recaps.some((r) => GROUPS[i].includes(r.host) && (r.restarted || r.failed));
  const packets: Packet[] =
    stage === 0 ? GROUPS.flatMap((_, i) => hops(`t${i}`, ["ctl", gid(i)], { label: d.modules ? "template" : "echo >>", start: d.serial ? i * 0.8 : 0 }))
    : stage === 1 ? GROUPS.flatMap((_, i) => (restartedIn(i) ? hops(`r${i}`, ["ctl", gid(i)], { label: "restart", tone: s.recaps.some((r) => GROUPS[i].includes(r.host) && r.failed) ? "bad" : undefined, start: d.serial ? i * 0.8 : 0 }) : []))
    : stage === 2 ? (d.check ? hops("c", ["ctl", "check"], { label: "dry run", tone: d.modules ? "good" : "bad" }) : [])
    : stage === 3 ? GROUPS.flatMap((_, i) => hops(`h${i}`, [gid(i), "lb"], { label: "health", start: d.serial ? i * 0.8 : 0, tone: s.recaps.some((r) => GROUPS[i].includes(r.host) && !r.up) ? "bad" : "good" }))
    : stage === 4 ? GROUPS.flatMap((_, i) => hops(`p${i}`, [gid(i), "ctl"], { label: "recap", tone: v.ok ? "good" : "bad" }))
    : [];

  const captions = [
    d.modules ? `Step 1: the template module compares each server's nginx.conf with the desired file and writes it only if different.` : "Step 1: the shell task runs echo >> on every server, every time.",
    d.handlers ? `Step 2: only servers whose config changed are notified to restart nginx: ${s.restarted} of ${HOSTS.length}.` : `Step 2: a restart task runs on every server: ${s.recaps.filter((r) => r.restarted || r.failed).length} restarts.`,
    d.check ? (d.modules ? `Step 3: a dry run listed ${s.preview.length} file${s.preview.length === 1 ? "" : "s"} that would change.` : "Step 3: the dry run skipped the shell tasks, so it showed nothing.") : "Step 3: no dry run.",
    d.serial ? `Step 4: hosts go ${BATCH} at a time; a failure stops the play before the next batch.` : "Step 4: all twelve hosts run at once.",
    `Step 5: ${v.text}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${card.filter((c) => c.ok).length} of ${RUNS.length} runs go well · ${runInfo.title}: ${v.text}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="Configuration management with Ansible"
        blurb="Twelve web servers should have the same nginx with the same config. An Ansible playbook says so, over SSH, with nothing installed on the servers. Run it three times: on fresh servers, again after someone hand-edited one, and to change a setting everywhere."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="ansible-playbook configures three groups of web servers over SSH, optionally after a dry run, behind a load balancer"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "ctl", to: "check", label: "dry run", dim: !d.check },
                  ...GROUPS.map((_, i) => ({ from: "ctl", to: gid(i), label: "SSH" })),
                  ...GROUPS.map((_, i) => ({ from: gid(i), to: "lb", label: "health" })),
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.75}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Play recap and three runs">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">play recap · run {rid}</p>
                <ul className="mt-1 space-y-0.5 font-mono text-[10px]">
                  {grouped(s.recaps).map((g) => (
                    <li key={g.hosts} className="break-words" style={{ color: g.r.failed ? "var(--bad)" : g.r.skipped ? "var(--faint)" : "var(--muted)" }}>
                      {g.hosts} : ok={g.r.ok} changed={g.r.changed} failed={g.r.failed}
                      {g.r.skipped ? ` skipped=${g.r.skipped}` : ""}
                      {g.r.note ? ` · ${g.r.note}` : ""}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">three runs · {card.filter((c) => c.ok).length}/{RUNS.length}</p>
                <ul className="mt-1 space-y-1.5 text-xs">
                  {card.map((c) => (
                    <li key={c.run.id}>
                      <span style={{ color: c.ok ? "var(--good)" : "var(--bad)" }} aria-hidden>
                        {c.ok ? "✓ " : "✕ "}
                      </span>
                      {c.run.title}
                      <span className="block text-[11px] text-[var(--muted)]">{c.text}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices<string> label="Run" accent={ACCENT} value={String(rid)} onChange={(x) => setRid(Number(x) as RunId)} options={RUNS.map((r) => ({ id: String(r.id), label: r.title }))} />
              </div>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  A shell script in YAML
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Idempotent, rolling, previewed
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Running…">
                Run the playbook
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Describe the end state, not the commands" what="Modules like apt and template check the current state and change only what differs, so running the playbook twice changes nothing the second time. A shell command just runs: echo >> appends another line every run." accent={ACCENT} active={at(0)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.modules} onChange={(e) => set({ modules: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Use modules (apt, template), not shell
                </label>
                <pre className="mt-2 max-h-56 overflow-auto whitespace-pre rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] leading-relaxed">{playbook(d, runInfo.wc).join("\n")}</pre>
              </FlowStep>
              <FlowArrow label="changed?" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Restart only when something changed" what="A handler runs once, at the end, and only on hosts where a task that notifies it reported a change. A restart task restarts nginx on every server on every run." accent={ACCENT} active={at(1)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.handlers} onChange={(e) => set({ handlers: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  notify: restart nginx (a handler)
                </label>
              </FlowStep>
              <FlowArrow label="preview" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Preview with check mode" what="--check --diff asks every module what it would change and prints the diff, without changing anything. Shell tasks can't be predicted, so check mode skips them and shows nothing." accent={ACCENT} active={at(2)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.check} onChange={(e) => set({ check: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Dry run first
                </label>
                {d.check && (
                  <ul className="max-h-32 overflow-auto font-mono text-[10px] text-[var(--muted)]">
                    {(s.preview.length ? s.preview : ["no changes"]).map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                )}
              </FlowStep>
              <FlowArrow label="hosts" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Roll through in batches" what={`serial: ${BATCH} runs the play on ${BATCH} hosts at a time, so most servers keep serving while a batch restarts. max_fail_percentage: 0 stops the play at the first failed batch instead of breaking all twelve.`} accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.serial} onChange={(e) => set({ serial: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  serial: {BATCH}, stop on failure
                </label>
              </FlowStep>
              <FlowArrow label="recap" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Run it again: nothing should change" what={`The test of a playbook is the second run. With everything in place it should report changed=0 everywhere, except where reality drifted, like ${DRIFTED}, which it quietly puts back.`} accent={ACCENT} active={at(4)}>
                <p className="text-xs" style={{ color: v.ok ? "var(--good)" : "var(--bad)" }}>
                  {v.text}.
                </p>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Each host&apos;s file and service state is simulated here across the three runs, carried from one run to the next.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
