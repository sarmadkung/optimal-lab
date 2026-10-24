"use client";

import { useState, type ReactNode } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { ACK_LIMIT, FIRST, FIXED, INCOMING, MAX_AGE, NOW, POSTS_PER_SEC, RETRIES, handle, runAll, sign, verify, type Design } from "@/lib/chatBots";

const ACCENT = "var(--auto)";

export default function ChatBotsDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [pick, setPick] = useState(2);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const i = INCOMING.find((x) => x.id === pick)!;
  const r = handle(i, d);
  const all = runAll(d);
  const signed = i.kind === "forged" || i.kind === "replay";
  const bad = r.userError || r.answers > 1 || r.posts > 3 || r.rejected429 > 0 || r.acceptedBad;

  const toggle = (k: keyof Design, label: string, extra?: ReactNode) => (
    <>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={d[k]} onChange={(e) => set({ [k]: e.target.checked } as Partial<Design>)} className="h-4 w-4" style={{ accentColor: ACCENT }} />
        {label}
      </label>
      {extra}
    </>
  );

  const nodes: MapNode[] = [
    { id: "user", label: signed ? "Whoever sent it" : "Team member", sub: i.kind === "own" ? "nobody: the bot itself" : "in Slack", at: [14, 18], mobileAt: [25, 12], state: i.kind === "forged" || i.kind === "replay" ? "bad" : "active" },
    { id: "slack", label: "Slack", sub: `waits ${ACK_LIMIT} s, then retries`, at: [50, 18], mobileAt: [75, 12], state: r.userError ? "bad" : "active" },
    { id: "bot", label: "Bot endpoint", sub: d.verify ? "checks signatures" : "trusts every request", at: [86, 18], mobileAt: [75, 42], state: r.acceptedBad ? "bad" : "good" },
    { id: "worker", label: "Background worker", sub: d.ackFirst ? "does the slow part" : "not used", at: [86, 80], mobileAt: [75, 72], state: d.ackFirst && (i.kind === "slash" || i.kind === "mention") ? "active" : "dim" },
    { id: "model", label: "Model", sub: i.work ? `${i.work} s to answer` : "not needed", at: [50, 80], mobileAt: [25, 72], state: i.work ? "active" : "dim" },
    { id: "channel", label: i.kind === "burst" || i.kind === "own" ? "#deploys" : "Channel", sub: `${r.posts} message${r.posts === 1 ? "" : "s"}`, at: [14, 80], mobileAt: [25, 42], state: bad ? "bad" : r.posts ? "good" : "idle" },
  ];

  const packets: Packet[] =
    stage === 0 ? hops("in", ["user", "slack", "bot"], { label: i.kind === "slash" ? "/ask" : i.kind === "mention" ? "app_mention" : i.kind === "own" ? "message (bot_id)" : i.kind === "burst" ? "40 updates" : "block_actions" })
    : stage === 1 ? (i.kind === "slash" || i.kind === "mention" ? (d.ackFirst ? hops("ack", ["bot", "slack"], { label: "200 in 0.1 s", tone: "good" }) : hops("late", ["slack", "bot"], { label: i.kind === "mention" ? `retry ×${RETRIES}` : "timeout", tone: "bad" })) : [])
    : stage === 2 ? (i.kind === "own" ? (d.ignoreSelf ? [] : hops("loop", ["bot", "channel", "slack", "bot"], { label: "reply to self", tone: "bad" })) : i.work ? hops("m", [d.ackFirst ? "worker" : "bot", "model"], { label: "prompt" }) : [])
    : stage === 3 ? (i.kind === "burst" ? hops("u", ["bot", "channel"], { label: d.updateInPlace ? "chat.update" : "40 × postMessage", tone: d.updateInPlace ? "good" : "bad" }) : [])
    : stage === 4 ? (signed ? hops("v", ["bot", "user"], { label: r.acceptedBad ? "approved" : "401", tone: r.acceptedBad ? "bad" : "good" }) : r.answers ? hops("a", ["model", "channel"], { label: r.answers > 1 ? `${r.answers} answers` : "answer", tone: r.answers > 1 ? "bad" : "good" }) : [])
    : [];

  const captions = [
    `Step 1: ${i.what}.`,
    i.kind === "slash" || i.kind === "mention" ? (d.ackFirst ? "Step 2: the bot answers 200 at once and hands the slow part to a worker." : `Step 2: the bot works for ${i.work} s before answering; Slack gave up after ${ACK_LIMIT} s${i.kind === "mention" ? " and redelivers the event" : ""}.`) : "Step 2: nothing slow here.",
    i.kind === "own" ? (d.ignoreSelf ? "Step 3: the event comes from the bot's own user id, so it's ignored." : "Step 3: the bot replies to its own message, and then to its reply.") : i.kind === "mention" ? (d.dedupe ? "Step 3: repeated deliveries carry the same event_id and are dropped." : "Step 3: every delivery is treated as new.") : "Step 3: not a repeat or a self-message.",
    i.kind === "burst" ? (d.updateInPlace ? "Step 4: one message is edited as the deploy moves on." : `Step 4: 40 separate posts against a limit of ${POSTS_PER_SEC} a second per channel.`) : "Step 4: no flood of messages here.",
    `Step 5: ${r.lines[r.lines.length - 1]}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${all.userErrors} error${all.userErrors === 1 ? "" : "s"} shown to people · ${all.extraAnswers} duplicate answer${all.extraAnswers === 1 ? "" : "s"} · ${all.posts} messages posted · ${all.rejected429} rate-limited · ${all.acceptedBad} forged or replayed clicks accepted.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Automation · interactive"
        title="Slack and Teams bots"
        blurb="A team bot answers questions with a model, posts deploy progress and takes approval clicks. Chat platforms have rules of their own: answer within 3 seconds or the user sees an error and the event is sent again, at most one message a second per channel, and requests that anyone can forge unless you check the signature. Send six real situations at the bot."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="A person, Slack, the bot's endpoint, a background worker, the model and the channel"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "user", to: "slack", label: "action" },
                  { from: "slack", to: "bot", label: "HTTP" },
                  { from: "bot", to: "worker", label: "queue", dim: !d.ackFirst },
                  { from: "worker", to: "model", label: "prompt", dim: !d.ackFirst },
                  { from: "model", to: "channel", label: "answer" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <Events d={d} pick={pick} setPick={setPick} />
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
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Sending…">
                {`Send event ${i.id}`}
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Acknowledge first, work after" what={`Slack waits ${ACK_LIMIT} seconds for a 200. A model call takes longer, so the user sees an error and the Events API sends the event again. Return 200 at once, then do the work in the background and post the answer (to response_url, or as a new message).`} accent={ACCENT} active={at(0)}>
                {toggle("ackFirst", `Reply 200 within ${ACK_LIMIT} s, then work in the background`)}
              </FlowStep>
              <FlowArrow label="event" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Handle each event once" what="Retries carry X-Slack-Retry-Num and the same event_id. Even with fast acknowledgements, networks drop responses; keep handled event_ids for a while and skip repeats." accent={ACCENT} active={at(1)}>
                {toggle("dedupe", "Skip event_ids already handled")}
              </FlowStep>
              <FlowArrow label="new events" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Ignore your own messages" what="A bot that reacts to messages in a channel also receives the messages it posts. Without a check on bot_id or its own user id, it answers itself forever." accent={ACCENT} active={at(2)}>
                {toggle("ignoreSelf", "Ignore events from the bot's own user")}
              </FlowStep>
              <FlowArrow label="messages" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Edit one message instead of posting many" what={`Chat APIs allow about ${POSTS_PER_SEC} message a second per channel; bursts get 429s and the updates that matter are the ones dropped. Post once and edit it with chat.update, or reply in a thread.`} accent={ACCENT} active={at(3)}>
                {toggle("updateInPlace", "Post once, then update that message")}
              </FlowStep>
              <FlowArrow label="request" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Verify every request's signature" what={`The endpoint URL is public. Slack signs each request: v0= HMAC-SHA256 of “v0:timestamp:body” with your signing secret. Recompute it, compare, and reject timestamps more than ${MAX_AGE / 60} minutes old so a captured request can't be replayed.`} accent={ACCENT} active={at(4)}>
                {toggle("verify", "Check X-Slack-Signature and the timestamp")}
                {signed && (
                  <div className="mt-1 space-y-0.5 break-all font-mono text-[10px] text-[var(--muted)]">
                    <p>X-Slack-Request-Timestamp: {i.ts} ({Math.round((NOW - i.ts!) / 60)} min ago)</p>
                    <p>sent: {i.signature!.slice(0, 27)}…</p>
                    <p>expected: {sign(i.ts!, i.body!).slice(0, 27)}…</p>
                    <p style={{ color: verify(i).ok ? "var(--good)" : "var(--bad)" }}>{verify(i).why}</p>
                  </div>
                )}
                <ul className="mt-2 space-y-0.5 font-mono text-[11px]">
                  {r.lines.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The 3-second rule, retries, the rate limit, the loop and the HMAC-SHA256 signature check run here; the signature is computed for real.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Events({ d, pick, setPick }: { d: Design; pick: number; setPick: (n: number) => void }) {
  const all = runAll(d);
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Six things sent to the bot and what happened">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">events · pick one</p>
      <ul className="mt-3 space-y-0.5">
        {all.results.map((r) => {
          const bad = r.userError || r.answers > 1 || r.posts > 3 || r.rejected429 > 0 || r.acceptedBad;
          const word = r.userError ? "user saw an error" : r.answers > 1 ? `${r.answers} answers` : r.posts > 3 && r.i.kind === "own" ? "loop" : r.rejected429 ? `${r.rejected429} rate-limited` : r.acceptedBad ? "accepted" : r.i.kind === "forged" || r.i.kind === "replay" ? "rejected" : "fine";
          return (
            <li key={r.i.id}>
              <button type="button" aria-pressed={r.i.id === pick} onClick={() => setPick(r.i.id)} className="grid min-h-11 w-full grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-1.5 text-left text-xs" style={{ background: r.i.id === pick ? `color-mix(in srgb, ${ACCENT} 14%, transparent)` : "transparent" }}>
                <span className="font-mono text-[var(--faint)]">{r.i.id}</span>
                <span className="min-w-0 truncate">{r.i.what}</span>
                <span className="text-right text-[11px]" style={{ color: bad ? "var(--bad)" : "var(--good)" }}>
                  {word}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
