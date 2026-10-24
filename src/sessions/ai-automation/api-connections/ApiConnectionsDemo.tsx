"use client";

import { useMemo, useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { ADD_EVERY, CONTACTS, DELETE_EVERY, FIRST, FIXED, LIMIT_PER_SEC, MAX_RETRIES, PAGE, TOKEN_MIN, simulate, type Auth, type Design, type Result, type Details, type On429, type Paging } from "@/lib/apiConnections";

const ACCENT = "var(--auto)";
const fmt = (n: number) => n.toLocaleString("en-US");
const dur = (s: number) => (s < 120 ? `${s} s` : `${Math.round(s / 60)} min`);

export default function ApiConnectionsDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const r = useMemo(() => simulate(d), [d]);
  const missing = r.expected - r.synced;

  const nodes: MapNode[] = [
    { id: "job", label: "Nightly sync job", sub: r.ok ? `done in ${dur(r.seconds)}` : `stopped at ${dur(r.seconds)}`, at: [14, 50], mobileAt: [50, 12], state: r.ok ? "good" : "bad" },
    { id: "auth", label: "OAuth server", sub: d.auth === "refresh" ? `${r.refreshes} refreshes` : `token for ${TOKEN_MIN} min`, at: [50, 14], mobileAt: [20, 40], state: r.stoppedBy?.startsWith("401") ? "bad" : "active" },
    { id: "limit", label: "Rate limiter", sub: `${LIMIT_PER_SEC}/s · ${fmt(r.rejected429)} × 429`, at: [50, 86], mobileAt: [80, 40], state: r.stoppedBy?.startsWith("429") || r.gaveUp ? "bad" : r.rejected429 ? "wait" : "good" },
    { id: "api", label: "CRM API", sub: `${fmt(CONTACTS)} contacts, changing`, at: [86, 50], mobileAt: [50, 66], state: "active" },
    { id: "sheet", label: "Warehouse table", sub: `${fmt(r.synced)} of ${fmt(r.expected)}`, at: [14, 86], mobileAt: [50, 90], state: missing || r.duplicates ? "bad" : "good" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("t", ["job", "auth", "job"], { label: d.auth === "refresh" ? "refresh token → access" : "pasted token" })
    : stage === 1 ? hops("l", ["job", "limit", "api"], { label: d.paging === "offset" ? "?offset=200" : "?after=17800" })
    : stage === 2 ? hops("g", ["job", "limit", "api"], { label: d.details === "batch" ? "batch read 100" : "GET /contacts/17,799" })
    : stage === 3 ? hops("r", ["limit", "job"], { label: d.on429 === "retry-after" ? "429 · Retry-After: 1" : "429", tone: "bad" })
    : stage === 4 ? hops("w", ["job", "sheet"], { label: `${fmt(r.synced)} rows`, tone: missing || r.duplicates ? "bad" : "good" })
    : [];

  const captions = [
    d.auth === "refresh" ? "Step 1: the job swaps a stored refresh token for a fresh access token, and again whenever it nears expiry." : `Step 1: the job uses a token someone pasted in; it expires ${TOKEN_MIN} minutes after it was issued.`,
    d.paging === "offset" ? `Step 2: it lists ${PAGE} contacts at a time by offset, while new contacts push the list down and deletions pull it up.` : `Step 2: it lists ${PAGE} at a time after the last id it saw, so changes elsewhere in the list don't move its place.`,
    d.details === "batch" ? "Step 3: one batch call reads the details of a whole page." : `Step 3: one call per contact: ${fmt(CONTACTS)} calls for details alone.`,
    d.on429 === "fail" ? "Step 4: the first 429 is treated as an error and the run stops." : d.on429 === "immediate" ? `Step 4: on 429 it retries at once, up to ${MAX_RETRIES} times, then skips the item.` : "Step 4: on 429 it waits for the time in Retry-After and sends again.",
    r.ok ? `Step 5: ${fmt(r.synced)} of ${fmt(r.expected)} contacts copied, ${r.duplicates} twice, ${missing} missing, in ${dur(r.seconds)}.` : `Step 5: the run stopped: ${r.stoppedBy}.`,
  ];
  const caption = stage !== null ? captions[stage] : r.ok ? `Finished in ${dur(r.seconds)}: ${fmt(r.synced)} of ${fmt(r.expected)} contacts · ${r.duplicates} duplicates · ${missing} missing · ${fmt(r.requests)} requests.` : `Stopped after ${dur(r.seconds)}: ${r.stoppedBy}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Automation · interactive"
        title="Connecting APIs"
        blurb="A nightly job copies 18,000 contacts out of a CRM's API while the sales team keeps adding and deleting them. The API allows 10 requests a second, sorts newest first, and gives out access tokens that last 30 minutes. Tokens, paging, batch reads and 429 handling decide whether the copy finishes, and whether it's right."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="The sync job, an OAuth server, the API's rate limiter, the CRM API and the warehouse table"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "job", to: "auth", label: "token" },
                  { from: "job", to: "limit", label: "requests" },
                  { from: "limit", to: "api", label: "allowed" },
                  { from: "job", to: "sheet", label: "rows" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <Timeline r={r} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  As first built
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Fixed
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Syncing…">
                Walk through one request
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Authenticate in a way that renews itself" what="A token pasted into the workflow works on the day you test it. OAuth access tokens expire (here after 30 minutes); store the refresh token and get a new access token before the old one runs out." accent={ACCENT} active={at(0)}>
                <Choices<Auth> label="Access token" accent={ACCENT} value={d.auth} onChange={(v) => set({ auth: v })} options={[{ id: "static", label: "Pasted once" }, { id: "refresh", label: "OAuth with refresh" }]} />
                <p className="mt-2 text-[11px] text-[var(--faint)]">{r.stoppedBy?.startsWith("401") ? `The run hit 401 at minute ${TOKEN_MIN}.` : d.auth === "refresh" ? `${r.refreshes} refresh${r.refreshes === 1 ? "" : "es"} during this run.` : r.seconds < TOKEN_MIN * 60 ? "This run finished before the token expired." : ""}</p>
              </FlowStep>
              <FlowArrow label="Bearer token" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Page with a cursor, not an offset" what={`The list changes while you read it: a contact added every ${ADD_EVERY} s pushes everything down one place, a deletion every ${DELETE_EVERY} s pulls it up. Offsets then return some contacts twice and skip others. A cursor (“after id X”) keeps its place.`} accent={ACCENT} active={at(1)}>
                <Choices<Paging> label="Paging" accent={ACCENT} value={d.paging} onChange={(v) => set({ paging: v })} options={[{ id: "offset", label: "offset=0, 100, 200…" }, { id: "cursor", label: "after=<last id>" }]} />
                <p className="mt-2 font-mono text-xs">
                  {r.duplicates} seen twice · {r.skipped} skipped
                </p>
              </FlowStep>
              <FlowArrow label="100 ids" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Read in batches" what="Fetching details one record at a time multiplies requests by the page size and spends the rate limit on overhead. Most APIs have a batch read; one call per page instead of a hundred." accent={ACCENT} active={at(2)}>
                <Choices<Details> label="Details" accent={ACCENT} value={d.details} onChange={(v) => set({ details: v })} options={[{ id: "each", label: "One call per contact" }, { id: "batch", label: "Batch read per page" }]} />
                <p className="mt-2 font-mono text-xs">{fmt(r.requests)} requests</p>
              </FlowStep>
              <FlowArrow label="requests" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Treat 429 as “wait”, not “fail”" what="A 429 says you're early, and Retry-After says how long to wait. Failing the run throws away the work; retrying at once burns more of the limit and, with a retry cap, silently drops records." accent={ACCENT} active={at(3)}>
                <Choices<On429> label="On 429 Too Many Requests" accent={ACCENT} value={d.on429} onChange={(v) => set({ on429: v })} options={[{ id: "fail", label: "Fail the run" }, { id: "immediate", label: `Retry at once (max ${MAX_RETRIES})` }, { id: "retry-after", label: "Wait Retry-After" }]} />
                <p className="mt-2 font-mono text-xs">
                  {fmt(r.rejected429)} rejected · {fmt(r.gaveUp)} given up
                </p>
              </FlowStep>
              <FlowArrow label="contacts" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Check the copy against the source" what="A run that ends without an error can still be wrong. Compare counts with the source, look for duplicate ids, and alert when they differ." accent={ACCENT} active={at(4)}>
                <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-xs">
                  <dt>Finished</dt>
                  <dd className="text-right font-mono" style={{ color: r.ok ? "var(--good)" : "var(--bad)" }}>{r.ok ? `yes, ${dur(r.seconds)}` : `no, ${dur(r.seconds)}`}</dd>
                  <dt>Contacts copied</dt>
                  <dd className="text-right font-mono">{fmt(r.synced)} / {fmt(r.expected)}</dd>
                  <dt>Missing</dt>
                  <dd className="text-right font-mono" style={{ color: missing ? "var(--bad)" : "var(--good)" }}>{fmt(missing)}</dd>
                  <dt>Listed twice</dt>
                  <dd className="text-right font-mono" style={{ color: r.duplicates ? "var(--bad)" : "var(--good)" }}>{r.duplicates}</dd>
                </dl>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The API, its rate limiter, token expiry, the changes during the run and the client run here request by request.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Timeline({ r }: { r: Result }) {
  const W = 340;
  const H = 90;
  const span = Math.max(60, r.seconds);
  const max = Math.max(1, ...r.timeline.map((b) => b.ok + b.r429));
  const bw = Math.max(1, ((W - 16) * 10) / span - 0.4);
  const x = (t: number) => 8 + (t / span) * (W - 16);
  const y = (n: number) => (n / max) * (H - 22);
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Requests every 10 seconds, accepted and rejected">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">requests per 10 s</p>
        <p className="flex gap-3 font-mono text-[11px]">
          <span style={{ color: "var(--good)" }}>■ accepted</span>
          <span style={{ color: "var(--bad)" }}>■ 429</span>
        </p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label={`${r.requests} requests over ${dur(r.seconds)}, ${r.rejected429} rejected`}>
        {r.timeline.map((b) => (
          <g key={b.t}>
            <rect x={x(b.t)} y={H - 14 - y(b.ok)} width={bw} height={y(b.ok)} fill="var(--good)" />
            <rect x={x(b.t)} y={H - 14 - y(b.ok) - y(b.r429)} width={bw} height={y(b.r429)} fill="var(--bad)" />
          </g>
        ))}
        {span >= TOKEN_MIN * 60 && <line x1={x(TOKEN_MIN * 60)} x2={x(TOKEN_MIN * 60)} y1={4} y2={H - 14} stroke="var(--c2)" strokeDasharray="2 2" strokeWidth={0.8} />}
        <line x1={8} x2={W - 8} y1={H - 14} y2={H - 14} stroke="var(--line)" strokeWidth={0.6} />
        <text x={8} y={H - 4} fontSize={7} fill="var(--faint)" fontFamily="var(--font-mono)">0</text>
        <text x={W - 8} y={H - 4} fontSize={7} textAnchor="end" fill="var(--faint)" fontFamily="var(--font-mono)">{dur(span)}</text>
        {span >= TOKEN_MIN * 60 && (
          <text x={x(TOKEN_MIN * 60) - 2} y={10} fontSize={6.5} textAnchor="end" fill="var(--faint)" fontFamily="var(--font-mono)">
            token expires
          </text>
        )}
      </svg>
      <p className="mt-1 font-mono text-[11px] text-[var(--muted)]">{r.ok ? "run finished" : r.stoppedBy}</p>
    </section>
  );
}
