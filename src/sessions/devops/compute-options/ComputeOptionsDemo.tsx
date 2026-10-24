"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { ALL_VMS, COLD_START_MS, FIRST, FIXED, FUNCTION_MAX_MIN, OPS_HOURS, WORKLOADS, evaluate, grid, type Design, type Option, type WorkloadId } from "@/lib/computeOptions";

const ACCENT = "var(--ops)";
const OPT_LABEL: Record<Option, string> = { vm: "VMs", container: "Containers", function: "Functions" };
const OPTS = (["vm", "container", "function"] as Option[]).map((o) => ({ id: o, label: OPT_LABEL[o] }));
const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

function Cell({ cells, chosen }: { cells: ReturnType<typeof grid>[number]["cells"]; chosen: Option }) {
  return (
    <ul className="mt-2 space-y-0.5 font-mono text-[10px]">
      {cells.map((c) => (
        <li key={c.o} style={{ color: c.ok ? (c.o === chosen ? "var(--text)" : "var(--muted)") : "var(--bad)" }}>
          {OPT_LABEL[c.o]}: {money(c.cost)}/mo · {c.ok ? c.text : `✕ ${c.text}`}
        </li>
      ))}
    </ul>
  );
}

export default function ComputeOptionsDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const e = evaluate(d);
  const g = grid(d.warm);
  const used = new Set(e.rows.map((r) => r.option));

  const nodes: MapNode[] = [
    ...WORKLOADS.map((w, i) => {
      const r = e.rows[i];
      return { id: w.id, label: w.title, sub: `${OPT_LABEL[r.option]} · ${money(r.cost)}/mo`, at: [16, 15 + i * 35] as [number, number], mobileAt: ([[18, 12], [50, 12], [82, 12]] as [number, number][])[i], state: (r.ok ? "good" : "bad") as MapNode["state"] };
    }),
    ...(["vm", "container", "function"] as Option[]).map((o, i) => ({
      id: o,
      label: OPT_LABEL[o],
      sub: o === "function" ? `max ${FUNCTION_MAX_MIN} min · per call` : o === "vm" ? "always on · you patch" : "billed while running",
      at: [80, 15 + i * 35] as [number, number],
      mobileAt: ([[18, 84], [50, 84], [82, 84]] as [number, number][])[i],
      state: (used.has(o) ? "active" : "dim") as MapNode["state"],
    })),
  ];

  const toOpt = (wid: WorkloadId, i: number) => {
    const r = e.rows.find((x) => x.w.id === wid)!;
    return hops(`w${i}`, [wid, r.option], { label: r.ok ? "runs" : "fails", tone: r.ok ? "good" : "bad" });
  };
  const packets: Packet[] =
    stage === 0 ? toOpt("api", 0)
    : stage === 1 ? toOpt("webhook", 1)
    : stage === 2 ? toOpt("video", 2)
    : stage === 3 ? (d.api === "function" ? hops("c", ["api", "function"], { label: d.warm ? "warm" : `+${COLD_START_MS} ms`, tone: d.warm ? "good" : "bad" }) : hops("c", ["api", d.api], { label: "no cold start" }))
    : stage === 4 ? WORKLOADS.flatMap((w, i) => toOpt(w.id, i + 10))
    : [];

  const row = (id: WorkloadId) => e.rows.find((r) => r.w.id === id)!;
  const captions = [
    `Step 1: the shop API on ${OPT_LABEL[d.api]}: ${money(row("api").cost)} a month; ${row("api").text}.`,
    `Step 2: webhooks on ${OPT_LABEL[d.webhook]}: ${money(row("webhook").cost)} a month; ${row("webhook").text}.`,
    `Step 3: the video job on ${OPT_LABEL[d.video]}: ${money(row("video").cost)} a month; ${row("video").text}.`,
    d.warm ? "Step 4: latency-sensitive services keep warm instances, so no request waits for a cold start." : `Step 4: nothing is kept warm; the first request on a new instance waits about ${COLD_START_MS} ms.`,
    `Step 5: ${money(e.total)} a month in compute and about ${e.ops} hours of operations; ${e.ok} of 3 workloads fit.`,
  ];
  const caption = stage !== null ? captions[stage] : `${e.ok} of 3 fit · ${money(e.total)} a month · ~${e.ops} ops hours a month.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="VMs, containers or functions"
        blurb="Three workloads with very different shapes: a steady API, bursts of webhooks, and a three-hour job once a night. Put each on VMs, managed containers or functions, and see the monthly bill, the hours someone spends running it, and the limits that make some pairs simply fail. Prices are illustrative."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Three workloads, the shop API, payment webhooks and a nightly video job, each placed on VMs, containers or functions"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={WORKLOADS.map((w) => ({ from: w.id, to: d[w.id], label: OPT_LABEL[d[w.id]].toLowerCase() }))}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="The monthly picture">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">the month · {e.ok}/3 fit</p>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {e.rows.map((r) => (
                    <li key={r.w.id}>
                      <span style={{ color: r.ok ? "var(--good)" : "var(--bad)" }} aria-hidden>
                        {r.ok ? "✓ " : "✕ "}
                      </span>
                      {r.w.title} on {OPT_LABEL[r.option]} <span className="font-mono text-[11px] text-[var(--muted)]">{money(r.cost)}/mo · {OPS_HOURS[r.option]} h ops</span>
                      <span className="block text-[11px] text-[var(--muted)]">{r.text}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 font-mono text-xs">
                  {money(e.total)} compute · ~{e.ops} ops hours a month
                </p>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Everything serverless
                </button>
                <button type="button" onClick={() => setD(ALL_VMS)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Everything on VMs
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Each where it fits
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Placing…">
                Place the workloads
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Steady traffic: pay for capacity" what={WORKLOADS[0].what + ". When a machine is busy all day, per-request billing costs more than renting the machine; a container platform or VMs fit."} accent={ACCENT} active={at(0)}>
                <Choices<Option> label="Shop API on" accent={ACCENT} value={d.api} onChange={(x) => set({ api: x })} options={OPTS} />
                <Cell cells={g.find((x) => x.w.id === "api")!.cells} chosen={d.api} />
              </FlowStep>
              <FlowArrow label="bursts" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Bursty traffic: pay per call" what={WORKLOADS[1].what + ". Something always-on sits idle most of the day; functions scale out for the burst and back to zero."} accent={ACCENT} active={at(1)}>
                <Choices<Option> label="Webhooks on" accent={ACCENT} value={d.webhook} onChange={(x) => set({ webhook: x })} options={OPTS} />
                <Cell cells={g.find((x) => x.w.id === "webhook")!.cells} chosen={d.webhook} />
              </FlowStep>
              <FlowArrow label="long jobs" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Long jobs: check the limits" what={`${WORKLOADS[2].what}. Functions cap each run (${FUNCTION_MAX_MIN} minutes on the common platforms), so a long job needs a container task or a VM, started for the job and stopped after.`} accent={ACCENT} active={at(2)}>
                <Choices<Option> label="Video job on" accent={ACCENT} value={d.video} onChange={(x) => set({ video: x })} options={OPTS} />
                <Cell cells={g.find((x) => x.w.id === "video")!.cells} chosen={d.video} />
              </FlowStep>
              <FlowArrow label="latency" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Pay to keep latency-sensitive things warm" what={`A new function or scaled-to-zero container needs a moment to start (~${COLD_START_MS} ms here) before its first request. Keeping a few instances warm costs a little every month and removes that from user-facing paths.`} accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.warm} onChange={(e) => set({ warm: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Warm instances for the API
                </label>
              </FlowStep>
              <FlowArrow label="the bill" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Count the hours, not just the bill" what="VMs are often cheapest per CPU and most expensive in people: patching, resizing and scaling them is your job. The cheapest machine bill isn't always the cheapest month." accent={ACCENT} active={at(4)}>
                <p className="font-mono text-xs">
                  {money(e.total)} a month · ~{e.ops} hours of operations
                </p>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Costs are computed here from traffic and billing models with illustrative prices; the time limit and cold starts follow common platform behaviour.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
