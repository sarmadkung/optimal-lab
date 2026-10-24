"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { FIRST, FIXED, KINDS, LATENCY, PRICE_GB, USES, evaluate, fit, monthly, type Design, type Kind, type UseId } from "@/lib/cloudStorage";

const ACCENT = "var(--ops)";
const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const tb = (gb: number) => (gb >= 1000 ? `${gb / 1000} TB` : `${gb} GB`);
const WHO = [
  { id: "dbserver", label: "Database server" },
  { id: "web", label: "Web servers ×4" },
  { id: "jobs", label: "Batch jobs" },
] as const;

function Options({ u, d, set }: { u: (typeof USES)[number]; d: Design; set: (p: Partial<Design>) => void }) {
  return (
    <>
      <Choices<Kind> label="Store it on" accent={ACCENT} value={d[u.id]} onChange={(x) => set({ [u.id]: x } as Partial<Design>)} options={KINDS.map((k) => ({ id: k.id, label: k.label }))} />
      <ul className="mt-2 space-y-0.5 font-mono text-[10px]">
        {KINDS.map((k) => {
          const f = fit(u.id, k.id);
          return (
            <li key={k.id} style={{ color: f.ok ? (k.id === d[u.id] ? "var(--text)" : "var(--muted)") : "var(--bad)" }}>
              {k.label}: {money(monthly(u, k.id, d.lifecycle))}/mo · {f.ok ? "" : "✕ "}
              {f.text}
            </li>
          );
        })}
      </ul>
    </>
  );
}

export default function CloudStorageDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const e = evaluate(d);
  const used = new Set(e.rows.map((r) => r.kind));

  const nodes: MapNode[] = [
    ...WHO.map((w, i) => {
      const rows = e.rows.filter((r) => r.u.who === w.id);
      return { id: w.id, label: w.label, sub: `${rows.length} need${rows.length === 1 ? "s" : ""}`, at: [16, 15 + i * 35] as [number, number], mobileAt: ([[18, 12], [50, 12], [82, 12]] as [number, number][])[i], state: (rows.every((r) => r.ok) ? "good" : "bad") as MapNode["state"] };
    }),
    ...KINDS.map((k, i) => {
      const rows = e.rows.filter((r) => r.kind === k.id);
      return { id: k.id, label: `${k.label} storage`, sub: rows.length ? `${tb(rows.reduce((a, r) => a + r.u.gb, 0))} · ${money(rows.reduce((a, r) => a + r.cost, 0))}` : "unused", at: [80, 15 + i * 35] as [number, number], mobileAt: ([[18, 84], [50, 84], [82, 84]] as [number, number][])[i], state: (used.has(k.id) ? "active" : "dim") as MapNode["state"] };
    }),
  ];
  const pairs = [...new Set(e.rows.map((r) => `${r.u.who}>${r.kind}`))];

  const hopFor = (id: UseId, i: number) => {
    const r = e.rows.find((x) => x.u.id === id)!;
    return hops(`u${i}`, [r.u.who, r.kind], { label: r.ok ? tb(r.u.gb) : "✕", tone: r.ok ? "good" : "bad" });
  };
  const packets: Packet[] = stage === null ? [] : hopFor(USES[stage].id, stage);

  const captions = e.rows.map((r, i) => `Step ${i + 1}: ${r.u.title} on ${r.kind} storage, ${money(r.cost)} a month: ${r.text}.`);
  const caption = stage !== null ? captions[stage] : `${e.ok} of ${USES.length} fit · ${money(e.total)} a month in storage.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="Block, file and object storage"
        blurb="Clouds sell storage three ways: a disk attached to one server, a shared folder many servers mount, or objects you read and write over HTTP. They differ in who can reach the data, how fast, and what a gigabyte costs. Place five real storage needs and watch the monthly bill. Prices are illustrative."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="A database server, four web servers and batch jobs store their data on block, file or object storage"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={pairs.map((p) => {
                  const [from, to] = p.split(">");
                  return { from, to, label: to };
                })}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Five storage needs">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">
                  five needs · {e.ok}/{USES.length} fit · {money(e.total)}/mo
                </p>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {e.rows.map((r) => (
                    <li key={r.u.id}>
                      <span style={{ color: r.ok ? "var(--good)" : "var(--bad)" }} aria-hidden>
                        {r.ok ? "✓ " : "✕ "}
                      </span>
                      {r.u.title} → {r.kind} <span className="font-mono text-[11px] text-[var(--muted)]">{money(r.cost)}/mo</span>
                      <span className="block text-[11px] text-[var(--muted)]">{r.text}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[11px] text-[var(--faint)]">
                  Per GB-month: block ${PRICE_GB.block}, file ${PRICE_GB.file}, object ${PRICE_GB.object}, archive ${PRICE_GB.archive}. First byte: block {LATENCY.block}, file {LATENCY.file}, object {LATENCY.object}.
                </p>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Disks for everything
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Each on the right kind
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Storing…">
                Store the data
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="A database wants a disk" what={`${USES[0].what}. Block storage is a disk on the network, attached to one machine: the lowest latency, sized and paid for in advance.`} accent={ACCENT} active={at(0)}>
                <Options u={USES[0]} d={d} set={set} />
              </FlowStep>
              <FlowArrow label="shared files" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Shared files want a file system" what={`${USES[1].what}. A managed file system (NFS) lets many servers mount the same folder without changing the app.`} accent={ACCENT} active={at(1)}>
                <Options u={USES[1]} d={d} set={set} />
              </FlowStep>
              <FlowArrow label="lots of files" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Lots of files served to people want objects" what={`${USES[2].what}. Object storage holds any number of files under keys, served over HTTP, priced per GB actually stored.`} accent={ACCENT} active={at(2)}>
                <Options u={USES[2]} d={d} set={set} />
              </FlowStep>
              <FlowArrow label="big reads" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Big parallel reads want objects too" what={`${USES[3].what}. Object storage serves each reader independently, so 50 jobs read about as fast as one.`} accent={ACCENT} active={at(3)}>
                <Options u={USES[3]} d={d} set={set} />
              </FlowStep>
              <FlowArrow label="old data" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Old data wants a cheaper tier" what={`${USES[4].what}. A lifecycle rule moves objects older than 30 days to an archive tier that costs a fraction per GB and takes hours to restore.`} accent={ACCENT} active={at(4)}>
                <Options u={USES[4]} d={d} set={set} />
                <label className="mt-2 flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.lifecycle} onChange={(ev) => set({ lifecycle: ev.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Lifecycle rule: archive after 30 days
                </label>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Costs are size × an illustrative price per GB-month; the fit rules follow how each kind is attached and read.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
