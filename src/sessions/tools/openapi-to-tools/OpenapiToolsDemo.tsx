"use client";

import { useState, type ReactNode } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { CURATED, FIRST, FIXED, OPS, OTHER_OP_TOKENS, TOTAL_OPS, build, toTool, validateRefund, type Descriptions, type Design } from "@/lib/openapiTools";

const ACCENT = "var(--tools)";

export default function OpenapiToolsDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [pick, setPick] = useState("createRefund");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const b = build(d);
  const op = OPS.find((o) => o.id === pick)!;
  const tool = toTool(op, d);
  const included = !d.curate || CURATED.includes(op.id);
  // the same refund request, as a model writes it against each schema (illustrative)
  const refundCall = d.flatten ? { orderId: "ord_8F2K", amount_cents: 1250, reason: "damaged" } : { orderId: "ord_8F2K", amount: 12.5, reason: "broken" };
  const refundErrors = validateRefund(refundCall, d);

  const toggle = (k: "curate" | "flatten" | "trim", label: string, extra?: ReactNode) => (
    <>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={d[k]} onChange={(e) => set({ [k]: e.target.checked } as Partial<Design>)} className="h-4 w-4" style={{ accentColor: ACCENT }} />
        {label}
      </label>
      {extra}
    </>
  );

  const nodes: MapNode[] = [
    { id: "spec", label: "OpenAPI spec", sub: `${TOTAL_OPS} operations`, at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "gen", label: "Converter", sub: d.curate ? `${b.toolCount} picked` : "all of them", at: [50, 18], mobileAt: [75, 12], state: "active" },
    { id: "model", label: "Model", sub: `${b.toolCount} tools · ${b.defTokens.toLocaleString("en-US")} tokens`, at: [86, 18], mobileAt: [75, 42], state: b.toolCount > 20 ? "wait" : "good" },
    { id: "server", label: "Tool server", sub: d.trim ? "trims responses" : "passes JSON through", at: [50, 80], mobileAt: [25, 42], state: "active" },
    { id: "api", label: "Shop API", sub: "REST, v1 + v2", at: [14, 80], mobileAt: [25, 74], state: "active" },
    { id: "check", label: "Argument check", sub: refundErrors.length ? `${refundErrors.length} error${refundErrors.length > 1 ? "s" : ""}` : "valid", at: [86, 80], mobileAt: [75, 74], state: refundErrors.length ? "bad" : "good" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("c", ["spec", "gen"], { label: `${TOTAL_OPS} operations` })
    : stage === 1 ? hops("t", ["gen", "model"], { label: `${b.toolCount} tool definitions` })
    : stage === 2 ? hops("call", ["model", "check"], { label: "createRefund(…)", tone: refundErrors.length ? "bad" : "good" })
    : stage === 3 ? (refundErrors.length ? [] : hops("x", ["check", "server", "api"], { label: "POST /refunds" }))
    : stage === 4 ? hops("r", ["api", "server", "model"], { label: d.trim ? "~350 tokens" : `${b.responseTokens.toLocaleString("en-US")} tokens`, tone: d.trim ? "good" : undefined })
    : [];

  const captions = [
    `Step 1: the converter reads the spec: ${TOTAL_OPS} operations, from orders to admin and webhooks.`,
    d.curate ? `Step 2: only the ${b.toolCount} operations a support assistant needs become tools.` : `Step 2: every operation becomes a tool; the model sees ${TOTAL_OPS} tools (${b.defTokens.toLocaleString("en-US")} tokens) on every request.`,
    `Step 3: the model writes a refund call: ${refundErrors.length ? refundErrors.join("; ") : "valid against the schema"}.`,
    refundErrors.length ? "Step 4: the call is rejected before it reaches the API; the model gets the error and tries again." : "Step 4: the tool server calls the API.",
    d.trim ? "Step 5: the tool server returns only the fields the assistant uses." : `Step 5: the full API response goes back: about ${b.responseTokens.toLocaleString("en-US")} tokens for an order and a shipment.`,
  ];
  const caption = stage !== null ? captions[stage] : `${b.toolCount} tools · ${b.perRequest.toLocaleString("en-US")} tokens a request · right tool with valid arguments about ${Math.round(b.correct * 100)}% of the time · $${b.costPer1k.toFixed(2)} per 1,000 requests.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="Tools · interactive"
        title="Turning an API into tools"
        blurb="A shop has an OpenAPI spec with 48 operations, and a support assistant needs to look up orders, track shipments and refund. Converting the whole spec into tools is one command. The model then chooses among 48 similar tools on every request, guesses nested schemas and reads 4 KB responses. Shape the tools for the model instead."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="An OpenAPI spec, a converter, the model, an argument check, a tool server and the shop API"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "spec", to: "gen", label: "spec" },
                  { from: "gen", to: "model", label: "tool list" },
                  { from: "model", to: "check", label: "call" },
                  { from: "check", to: "server", label: "valid" },
                  { from: "server", to: "api", label: "HTTP" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="The generated tool definition">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">generated tool</p>
                  <p className="font-mono text-[11px]" style={{ color: included ? "var(--good)" : "var(--faint)" }}>
                    {included ? "given to the model" : "left out"}
                  </p>
                </div>
                <div className="mt-2">
                  <Choices label="Operation" accent={ACCENT} value={pick} onChange={setPick} options={OPS.map((o) => ({ id: o.id, label: o.id }))} />
                </div>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] leading-relaxed">{JSON.stringify(tool, null, 1)}</pre>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Convert everything
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Shaped for the model
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Calling…">
                Run a refund request
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Generate tools from the spec" what="Each operation becomes a tool: its operationId as the name, its parameters as a JSON Schema. Tools like MCP OpenAPI bridges do this in one command, and the result works, in the sense that every call is possible." accent={ACCENT} active={at(0)}>
                <p className="font-mono text-[11px] text-[var(--muted)]">
                  {OPS.length} operations shown here, plus {TOTAL_OPS - OPS.length} more at about {OTHER_OP_TOKENS} tokens each
                </p>
              </FlowStep>
              <FlowArrow label="tool definitions" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Expose only what the job needs" what="Every tool is described to the model on every request. Deprecated v1 copies, admin and delete operations make choices harder and calls riskier. Pick the handful the assistant needs." accent={ACCENT} active={at(1)}>
                {toggle("curate", `Only the ${CURATED.length} operations a support assistant needs`)}
              </FlowStep>
              <FlowArrow label="fewer tools" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Write descriptions for a model, not a docs page" what="“Get order. GET /v2/orders/{orderId}” says what, not when. Say when to use the tool, what the id looks like, and what it returns that the next step needs." accent={ACCENT} active={at(2)}>
                <Choices<Descriptions> label="Descriptions" accent={ACCENT} value={d.descriptions} onChange={(v) => set({ descriptions: v })} options={[{ id: "summary", label: "From the spec's summary" }, { id: "written", label: "Written for the model" }]} />
              </FlowStep>
              <FlowArrow label="a call" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Flatten and constrain the arguments" what="Nested request bodies and free-text fields are where calls go wrong. Flatten them to a few top-level arguments, with integer cents and enums, and validate before calling the API." accent={ACCENT} active={at(3)}>
                {toggle("flatten", "Flat arguments with types and enums", <p className="font-mono text-[11px]" style={{ color: refundErrors.length ? "var(--bad)" : "var(--good)" }}>{JSON.stringify(refundCall)} → {refundErrors.length ? refundErrors.join("; ") : "valid"}</p>)}
              </FlowStep>
              <FlowArrow label="response" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Return what the model needs" what="A full order object is 4 KB of fields the assistant never uses, read on every call. Return the few fields that matter." accent={ACCENT} active={at(4)}>
                {toggle("trim", "Trim responses to the fields that matter")}
                <dl className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-xs">
                  <dt>Tools on every request</dt>
                  <dd className="text-right font-mono">{b.toolCount}</dd>
                  <dt>Tokens a request (tools + responses)</dt>
                  <dd className="text-right font-mono">{b.perRequest.toLocaleString("en-US")}</dd>
                  <dt>Right tool, valid arguments</dt>
                  <dd className="text-right font-mono" style={{ color: b.correct < 0.85 ? "var(--bad)" : "var(--good)" }}>~{Math.round(b.correct * 100)}%</dd>
                  <dt>Input cost per 1,000 requests</dt>
                  <dd className="text-right font-mono">${b.costPer1k.toFixed(2)}</dd>
                </dl>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The conversion, schemas, validation and token counts run here. How often a model picks the right tool is illustrative.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
