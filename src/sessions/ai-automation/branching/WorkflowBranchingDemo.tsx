"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { BASE, BRANCH_LABEL, FIXED, ORDERS, intended, route, rulesInOrder, runAll, type Branch, type Options } from "@/lib/workflowRouting";

const ACCENT = "var(--auto)";
const BRANCHES: Branch[] = ["approval", "vat", "priority", "standard"];
const AT: Record<Branch, { at: [number, number]; mobileAt: [number, number] }> = {
  approval: { at: [84, 13], mobileAt: [25, 72] },
  vat: { at: [84, 38], mobileAt: [75, 72] },
  priority: { at: [84, 63], mobileAt: [25, 92] },
  standard: { at: [84, 87], mobileAt: [75, 92] },
};
const STATUS = { right: "var(--good)", partial: "var(--c2)", wrong: "var(--bad)", dropped: "var(--bad)" } as const;
const show = (a: number | string) => (typeof a === "string" ? `"${a}"` : String(a));

export default function WorkflowBranchingDemo() {
  const [o, setO] = useState<Options>(BASE);
  const [pick, setPick] = useState(2);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Options>) => setO((c) => ({ ...c, ...p }));
  const order = ORDERS.find((x) => x.id === pick)!;
  const got = route(order, o);
  const want = intended(order);
  const all = runAll(o);
  const row = all.rows.find((r) => r.order.id === pick)!;

  const nodes: MapNode[] = [
    { id: "src", label: "New orders", sub: `${ORDERS.length} items`, at: [14, 18], mobileAt: [50, 8], state: "active" },
    { id: "clean", label: "Set types", sub: o.clean ? "numbers, upper-case" : "off", at: [14, 62], mobileAt: [50, 30], state: o.clean ? "good" : "dim" },
    { id: "switch", label: "Switch", sub: o.mode === "first" ? "first match" : "every match", at: [48, 50], mobileAt: [50, 51], state: "active" },
    ...BRANCHES.map((b) => ({
      id: b,
      label: BRANCH_LABEL[b],
      sub: `${all.rows.filter((r) => r.got.includes(b)).length} orders`,
      ...AT[b],
      state: (got.includes(b) ? (want.includes(b) ? "good" : "bad") : want.includes(b) && stage !== null && stage >= 3 ? "wait" : b === "standard" && !o.fallback ? "dim" : "idle") as MapNode["state"],
    })),
  ];

  const packets: Packet[] =
    stage === 0 ? hops("in", ["src", "clean"], { label: `order ${order.id}` })
    : stage === 1 ? hops("c", ["clean", "switch"], { label: `amount ${o.clean ? Number(order.amount) : show(order.amount)}` })
    : stage === 2 ? hops("r", ["switch", got[0] ?? "switch"], { label: got.length ? BRANCH_LABEL[got[0]] : "no rule matched", tone: got.length && want.includes(got[0]) ? "good" : "bad" })
    : stage === 3 ? got.slice(1).flatMap((b, i) => hops(`m${i}`, ["switch", b], { label: BRANCH_LABEL[b], start: i * 0.2 }))
    : stage === 4 ? (got.length ? [] : hops("d", ["switch", "src"], { label: "dropped", tone: "bad" }))
    : [];

  const captions = [
    `Step 1: order ${order.id} arrives from the ${order.source}: amount ${show(order.amount)}, country ${order.country}, ${order.tier}.`,
    o.clean ? `Step 2: types are set first: the amount becomes the number ${Number(order.amount)}, the country ${order.country.toUpperCase()}.` : `Step 2: no cleaning: the amount stays ${typeof order.amount === "string" ? "text" : "a number"} and the country stays “${order.country}”.`,
    got.length ? `Step 3: ${rulesInOrder(o).map((r) => `${r.text}: ${r.test(order, o.clean) ? "yes" : "no"}`).join(" · ")}.` : "Step 3: no rule matches this order.",
    o.mode === "first" ? `Step 4: first match only: it goes to ${got.map((b) => BRANCH_LABEL[b]).join("") || "nowhere"}${want.length > 1 ? `, but it needs ${want.map((b) => BRANCH_LABEL[b]).join(" and ")}` : ""}.` : `Step 4: every matching branch runs: ${got.map((b) => BRANCH_LABEL[b]).join(", ") || "none"}.`,
    got.length ? `Step 5: ${row.status === "right" ? "routed exactly as intended" : `routed to ${got.map((b) => BRANCH_LABEL[b]).join(" + ")}; intended ${want.map((b) => BRANCH_LABEL[b]).join(" + ")}`}.` : o.fallback ? "Step 5: the default branch catches it." : "Step 5: no default branch, so the order silently goes nowhere.",
  ];
  const caption = stage !== null ? captions[stage] : `${all.right} of ${ORDERS.length} orders routed exactly as intended · ${all.wrong} to a wrong branch · ${all.partial} missing a branch · ${all.dropped} dropped.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Automation · interactive"
        title="Branches and routing"
        blurb="Three rules and a default should send each order to manager approval, the EU VAT check, priority handling or standard fulfilment. Then form orders arrive with the amount as text, one country code is lower-case, an order needs two branches, and one matches none. Run twelve real orders through the switch and fix it."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap title="New orders, a type-setting step, the switch and four branches" accent={ACCENT} chrome="split" nodes={nodes} links={[{ from: "src", to: "clean", label: "order" }, { from: "clean", to: "switch", label: "fields" }, ...BRANCHES.map((b) => ({ from: "switch", to: b, label: BRANCH_LABEL[b], dim: b === "standard" && !o.fallback }))]} packets={packets} aspect={1.45} mobileAspect={0.78} />
              <OrderTable o={o} pick={pick} setPick={setPick} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setO(BASE)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  As first built
                </button>
                <button type="button" onClick={() => setO(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Fixed
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Routing…">
                {`Route order ${order.id}`}
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Look at the data before writing rules" what="Orders from the API carry numbers; orders from the web form carry everything as text, typed by people. Open a few real items from each source before writing a condition against them." accent={ACCENT} active={at(0)}>
                <p className="font-mono text-xs">
                  order {order.id} from the {order.source}: {`{ amount: ${show(order.amount)}, country: "${order.country}", tier: "${order.tier}" }`}
                </p>
              </FlowStep>
              <FlowArrow label="raw fields" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Set types and formats first" what="Compared as text, “900” is greater than “1000”, because 9 comes after 1. Convert amounts to numbers and country codes to upper case in one step at the start, so every rule after it compares like with like." accent={ACCENT} active={at(1)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={o.clean} onChange={(e) => set({ clean: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Convert amount to a number and country to upper case
                </label>
                <p className="font-mono text-[11px] text-[var(--muted)]">&quot;900&quot; &gt; &quot;1000&quot; → {String("900" > "1000")} · 900 &gt; 1000 → {String(900 > 1000)}</p>
              </FlowStep>
              <FlowArrow label="clean fields" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Write each condition, and its order" what="In a switch that stops at the first match, the order of rules is a decision: put VIP first and a VIP's €15,000 order skips manager approval." accent={ACCENT} active={at(2)}>
                <Choices label="Rule order" accent={ACCENT} value={o.vipFirst ? "vip" : "amount"} onChange={(v) => set({ vipFirst: v === "vip" })} options={[{ id: "amount", label: "Amount, EU, VIP" }, { id: "vip", label: "VIP, amount, EU" }]} />
                <ol className="mt-2 space-y-0.5 font-mono text-[11px]">
                  {rulesInOrder(o).map((r, i) => (
                    <li key={r.branch} style={{ color: r.test(order, o.clean) ? "var(--text)" : "var(--faint)" }}>
                      {i + 1}. {r.text} → {BRANCH_LABEL[r.branch]} {r.test(order, o.clean) ? "✓" : ""}
                    </li>
                  ))}
                </ol>
              </FlowStep>
              <FlowArrow label="matches" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="First match, or every match" what="An EU order over €1,000 needs both approval and the VAT check. “First match” sends it to one; branches that are independent checks should all run, each on its own path." accent={ACCENT} active={at(3)}>
                <Choices label="When several rules match" accent={ACCENT} value={o.mode} onChange={(v: "first" | "all") => set({ mode: v })} options={[{ id: "first", label: "Take the first" }, { id: "all", label: "Run every match" }]} />
              </FlowStep>
              <FlowArrow label="branches" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Always have a default branch" what="An order that matches nothing should still go somewhere: standard fulfilment, or a queue a person looks at. Without a default it disappears with no error, and nobody notices until a customer asks." accent={ACCENT} active={at(4)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={o.fallback} onChange={(e) => set({ fallback: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Default branch: standard fulfilment
                </label>
                <p className="font-mono text-xs">
                  {all.right} right · {all.wrong} wrong branch · {all.partial} missing a branch · {all.dropped} dropped
                </p>
                <p className="mt-2 text-[11px] text-[var(--faint)]">Every rule, comparison and route runs for real on these twelve orders.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function OrderTable({ o, pick, setPick }: { o: Options; pick: number; setPick: (n: number) => void }) {
  const all = runAll(o);
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Twelve orders, where they went and where they should have gone">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">orders · pick one</p>
        <p className="font-mono text-xs" style={{ color: all.right === ORDERS.length ? "var(--good)" : "var(--bad)" }}>
          {all.right}/{ORDERS.length} right
        </p>
      </div>
      <ul className="mt-3 space-y-0.5">
        {all.rows.map((r) => (
          <li key={r.order.id}>
            <button type="button" aria-pressed={r.order.id === pick} onClick={() => setPick(r.order.id)} className="grid min-h-11 w-full grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-1.5 text-left text-xs" style={{ background: r.order.id === pick ? `color-mix(in srgb, ${ACCENT} 14%, transparent)` : "transparent" }}>
              <span className="font-mono text-[var(--faint)]">{r.order.id}</span>
              <span className="min-w-0 font-mono text-[11px]">
                {show(r.order.amount)} · {r.order.country} · {r.order.tier}
              </span>
              <span className="text-right text-[11px]" style={{ color: STATUS[r.status] }}>
                {r.got.length ? r.got.map((b) => BRANCH_LABEL[b].split(" ")[0]).join(" + ") : "dropped"}
                {r.status !== "right" && <span className="block text-[var(--faint)]">want {r.want.map((b) => BRANCH_LABEL[b].split(" ")[0]).join(" + ")}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
