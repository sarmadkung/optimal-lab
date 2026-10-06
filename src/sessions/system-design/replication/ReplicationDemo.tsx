"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, PlaybackControls, Slider, usePlayback } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, type NodeState, type Packet } from "@/components/system/SystemMap";
import { NEW, OLD, READS, firstRead, simulate, type Mode, type ReadFrom } from "@/lib/replication";

const ACCENT = "var(--sys)";

export default function ReplicationDemo() {
  const [mode, setMode] = useState<Mode>("async");
  const [readFrom, setReadFrom] = useState<ReadFrom>("follower");
  const [lag, setLag] = useState(3);
  const [crash, setCrash] = useState(false);
  const frames = simulate(mode, readFrom, lag, crash);
  const playback = usePlayback(frames.length, 1400);
  const f = frames[playback.i];
  const read = firstRead(frames.slice(0, playback.i + 1));
  const reset = () => playback.reset();

  const nodeState = (id: "leader" | "f1" | "f2"): NodeState => {
    if (id === "leader" && f.values.leader === null) return "bad";
    if (f.read?.from === id) return f.read.value === NEW ? "good" : "bad";
    if (f.hops.some((h) => h.to === id || h.from === id)) return "active";
    return "idle";
  };
  const show = (v: string | null) => (v === null ? "down" : `name = ${v}`);
  const packets: Packet[] = f.hops.map((h, i) => ({ id: `${mode}-${readFrom}-${lag}-${crash}-${f.tick}-${i}`, from: h.from, to: h.to, label: h.label, tone: h.tone, delay: i * 0.35 }));

  return (
    <SessionPage>
      <SessionHeader
        kicker="System design · interactive"
        title="Replication and stale reads"
        blurb={`One database becomes three: a leader takes the writes and copies them to two followers, which serve reads. The copy takes time. Change your name from “${OLD}” to “${NEW}”, read it back, and see what you get.`}
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <SystemMap
              title="A client, a leader database and two follower replicas"
              accent={ACCENT}
              chrome="split"
              nodes={[
                { id: "client", label: "Client", sub: f.failed ? "timeout" : f.acked ? "got OK" : "writing…", at: [12, 50], mobileAt: [50, 10], state: f.failed ? "bad" : f.acked ? "good" : "wait" },
                { id: "leader", label: f.primary === "leader" ? "Leader" : "Old leader", sub: show(f.values.leader), at: [46, 50], mobileAt: [50, 42], state: nodeState("leader") },
                { id: "f1", label: f.primary === "f1" ? "Follower 1 → leader" : "Follower 1", sub: `name = ${f.values.f1}`, at: [84, 20], mobileAt: [22, 84], state: nodeState("f1") },
                { id: "f2", label: "Follower 2", sub: `name = ${f.values.f2}`, at: [84, 80], mobileAt: [78, 84], state: nodeState("f2") },
              ]}
              links={[
                { from: "client", to: "leader", label: "write", dim: f.values.leader === null },
                { from: "leader", to: "f1", label: "replication log", dashed: true, dim: f.values.leader === null },
                { from: "leader", to: "f2", label: "replication log", dashed: true, dim: f.values.leader === null },
                // reads and failover only appear while they happen
                ...f.hops
                  .filter((h) => !(["client-leader", "leader-client", "leader-f1", "leader-f2"] as string[]).includes(`${h.from}-${h.to}`))
                  .map((h) => ({ from: h.from, to: h.to, label: h.label })),
              ]}
              packets={packets}
              aspect={2.1}
              mobileAspect={0.95}
            />
          }
          panel={
            <SystemMapPanel caption={`Tick ${f.tick}: ${f.event}`}>
              <Choices label="Leader confirms the write" accent={ACCENT} value={mode} onChange={(m) => { setMode(m); reset(); }} options={[{ id: "async", label: "At once (async)" }, { id: "sync", label: "After follower 1 (semi-sync)" }]} />
              <Choices label="Your next read goes to" accent={ACCENT} value={readFrom} onChange={(r) => { setReadFrom(r); reset(); }} options={READS.map((r) => ({ id: r.id, label: r.label }))} />
              <div className="w-full">
                <Slider label="Replication lag" value={lag} min={1} max={4} step={1} format={(v) => `${v} ticks`} accent={ACCENT} onChange={(v) => { setLag(v); reset(); }} />
              </div>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" checked={crash} onChange={(e) => { setCrash(e.target.checked); reset(); }} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                Crash the leader right after the write
              </label>
              <PlaybackControls playback={playback} accent={ACCENT} nextLabel="Next tick" status={`tick ${f.tick}`} />
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="The write goes to the leader" what="Only the leader accepts writes, so there is one order of changes for everyone to copy." accent={ACCENT} active={f.tick === 0}>
                <p className="font-mono text-sm">UPDATE users SET name = &apos;{NEW}&apos; WHERE id = 7</p>
              </FlowStep>
              <FlowArrow label="1 change" accent={ACCENT} />

              <FlowStep n={2} title="The leader confirms" what="Async: right away, so writes are fast but a crash can lose them. Semi-sync: after one follower has it, which survives a leader crash but adds a round trip to every write." accent={ACCENT} active={f.acked && f.hops.some((h) => h.label === "OK")}>
                <p className="text-sm" style={{ color: f.failed ? "var(--bad)" : f.acked ? "var(--good)" : undefined }}>
                  {f.failed ? "No OK: the client got a timeout and can retry." : f.acked ? "The client has its OK." : "The client is still waiting."}
                </p>
              </FlowStep>
              <FlowArrow label="replication log" accent={ACCENT} />

              <FlowStep n={3} title="Followers copy the change" what="Each follower replays the leader's log in order. How far behind it is, is the replication lag: usually milliseconds, sometimes seconds under load." accent={ACCENT} active={f.hops.some((h) => h.label.startsWith("log"))}>
                <p className="font-mono text-sm">
                  leader {f.values.leader ?? "down"} · f1 {f.values.f1} · f2 {f.values.f2}
                </p>
              </FlowStep>
              <FlowArrow label="GET name" accent={ACCENT} />

              <FlowStep n={4} title="The client reads it back" what="A follower that hasn't caught up returns the old value. “Read your writes” sends a user's own reads to the leader for a short time after they write." accent={ACCENT} active={f.read !== null}>
                <p className="text-sm" style={{ color: read ? (read.stale ? "var(--bad)" : "var(--good)") : undefined }}>
                  {read ? `Read “${read.value}” from ${read.from === "leader" ? "the leader" : read.from === "f1" ? "follower 1" : "follower 2"}${read.stale ? ": stale." : "."}` : "Not read yet."}
                </p>
              </FlowStep>
              <FlowArrow label="if the leader dies" accent={ACCENT} />

              <FlowStep n={5} title="Failover promotes a follower" what="A follower becomes the new leader. Whatever the old leader confirmed but never shipped is gone. That is the price of async replication." accent={ACCENT} active={f.primary === "f1"}>
                <p className="text-sm">{crash ? (mode === "async" ? "The confirmed write was lost in the failover." : "Nothing confirmed was lost: the client never got an OK.") : "Turn on the crash to see it."}</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
