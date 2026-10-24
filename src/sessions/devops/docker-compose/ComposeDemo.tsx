"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { COMMANDS, FIRST, FIXED, RETRY_S, composeFile, run, scorecard, startOrder, type Command, type Design, type Host, type Restart, type Wait } from "@/lib/composeStack";

const ACCENT = "var(--ops)";

export default function ComposeDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [cmd, setCmd] = useState<Command>("downUp");
  const { stage, busy, run: walk } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const r = run(d, cmd);
  const card = scorecard(d);
  const c = COMMANDS.find((x) => x.id === cmd)!;
  const webUp = r.readyAt !== null;

  const nodes: MapNode[] = [
    { id: "compose", label: "docker compose", sub: c.label, at: [14, 18], mobileAt: [25, 12], state: "active" },
    { id: "web", label: "web", sub: webUp ? `up at ${r.readyAt} s` : "exited", at: [50, 18], mobileAt: [75, 12], state: webUp ? (r.crashes ? "wait" : "good") : "bad" },
    { id: "worker", label: "worker", sub: webUp ? "running" : "exited", at: [86, 18], mobileAt: [75, 45], state: webUp ? "active" : "bad" },
    { id: "cache", label: "cache", sub: "redis:7", at: [86, 82], mobileAt: [25, 45], state: "good" },
    { id: "db", label: "db", sub: "pg 16 · ready at 6 s", at: [50, 82], mobileAt: [75, 80], state: "good" },
    { id: "volume", label: d.volume ? "pgdata volume" : "anonymous volume", sub: `${r.rows.toLocaleString("en-US")} orders`, at: [14, 82], mobileAt: [25, 80], state: r.dataLost ? "bad" : d.volume ? "good" : "wait" },
  ];

  const packets: Packet[] =
    stage === 0 ? [...hops("s1", ["compose", "db"], { label: "start 1" }), ...hops("s2", ["compose", "cache"], { label: "start 1" })]
    : stage === 1 ? (d.wait === "healthy" ? [...hops("h", ["db", "compose"], { label: "healthy" }), ...hops("w", ["compose", "web"], { label: "start", start: 1 })] : hops("w", ["compose", "web"], { label: "start now", tone: "bad" }))
    : stage === 2 ? (d.host === "db" ? hops("c", ["web", "db"], { label: "db:5432", tone: "good" }) : [])
    : stage === 3 ? (r.crashes ? hops("r", ["compose", "web"], { label: d.restart === "no" ? "stays down" : `restart ×${r.crashes}`, tone: d.restart === "no" ? "bad" : undefined }) : [])
    : stage === 4 ? hops("v", ["db", "volume"], { label: r.dataLost ? "empty" : "data", tone: r.dataLost ? "bad" : "good" })
    : [];

  const captions = [
    `Step 1: Compose sorts depends_on and starts ${startOrder().join(", then ")}.`,
    d.wait === "healthy" ? "Step 2: web waits until db's healthcheck (pg_isready) passes." : "Step 2: web starts as soon as db's container exists, while Postgres is still initialising.",
    d.host === "db" ? "Step 3: web connects to db:5432; Compose's network resolves the service name." : "Step 3: web connects to localhost:5432, which inside a container is the web container itself.",
    r.crashes ? (d.restart === "no" ? "Step 4: web exits with an error and restart: no leaves it down." : `Step 4: the restart policy brings it back every ${RETRY_S} s until it connects.`) : "Step 4: nothing crashed, so nothing to restart.",
    `Step 5: ${r.text}.`,
  ];
  const caption = stage !== null ? captions[stage] : `${c.line}: ${r.text}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="Docker Compose"
        blurb="One file describes a web app, a worker, Postgres and Redis, and one command starts them on a private network. The file is short; the four mistakes in it are common. Start the stack, take it down and bring it back, second by second."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="docker compose starts web, worker, Redis and Postgres with its data volume on one project network"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "compose", to: "web", label: "start" },
                  { from: "compose", to: "db", label: "start" },
                  { from: "web", to: "db", label: d.host === "db" ? "db:5432" : "localhost?", dim: d.host !== "db" },
                  { from: "worker", to: "db", label: "db:5432", dim: d.host !== "db" },
                  { from: "web", to: "cache", label: "cache:6379" },
                  { from: "db", to: "volume", label: "/var/lib/postgresql/data" },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="What happened, second by second">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">{c.line}</p>
                <ul className="mt-2 max-h-56 space-y-0.5 overflow-auto font-mono text-[10px]">
                  {r.events.map((e, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="w-9 shrink-0 text-right text-[var(--faint)]">{e.t}s</span>
                      <span className="w-12 shrink-0 text-[var(--muted)]">{e.svc}</span>
                      <span className="min-w-0" style={{ color: e.tone === "bad" ? "var(--bad)" : e.tone === "good" ? "var(--good)" : "var(--text)" }}>
                        {e.text}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">three commands</p>
                <ul className="mt-1 space-y-1 text-xs">
                  {card.map((x) => (
                    <li key={x.cmd.id}>
                      <span style={{ color: x.ok ? "var(--good)" : "var(--bad)" }} aria-hidden>
                        {x.ok ? "✓ " : "✕ "}
                      </span>
                      {x.cmd.label}: <span className="text-[var(--muted)]">{x.text}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices<Command> label="Command" accent={ACCENT} value={cmd} onChange={setCmd} options={COMMANDS.map((x) => ({ id: x.id, label: x.label }))} />
              </div>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  First draft
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  Healthcheck, name, restart, volume
                </button>
              </div>
              <RunButton busy={busy} onClick={walk} accent={ACCENT} running="Starting…">
                Run the command
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Describe the stack, start it in order" what="Each service is an image plus its ports, environment and dependencies. Compose sorts depends_on and starts the database and cache before the apps that need them." accent={ACCENT} active={at(0)}>
                <pre className="max-h-64 overflow-auto whitespace-pre rounded-md bg-[var(--inset)] p-2 font-mono text-[10px] leading-relaxed">{composeFile(d).join("\n")}</pre>
              </FlowStep>
              <FlowArrow label="containers" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Wait until the database is ready" what="Plain depends_on only waits for the container to start, not for Postgres to accept connections. A healthcheck plus condition: service_healthy makes web wait for pg_isready." accent={ACCENT} active={at(1)}>
                <Choices<Wait> label="web waits for db to be" accent={ACCENT} value={d.wait} onChange={(x) => set({ wait: x })} options={[{ id: "started", label: "started" }, { id: "healthy", label: "healthy" }]} />
              </FlowStep>
              <FlowArrow label="connection" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Connect by service name" what="Every service joins the project's network, where its name is a hostname. localhost inside the web container means the web container; it worked on your laptop only because Postgres ran there too." accent={ACCENT} active={at(2)}>
                <Choices<Host> label="DATABASE_URL host" accent={ACCENT} value={d.host} onChange={(x) => set({ host: x })} options={[{ id: "localhost", label: "localhost" }, { id: "db", label: "db" }]} />
              </FlowStep>
              <FlowArrow label="crash?" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Restart what crashes" what="Apps should retry their first connection, and Docker can restart a container that exits. Without a restart policy, one early failure leaves the service down until someone notices." accent={ACCENT} active={at(3)}>
                <Choices<Restart> label="restart" accent={ACCENT} value={d.restart} onChange={(x) => set({ restart: x })} options={[{ id: "no", label: "no (default)" }, { id: "unless-stopped", label: "unless-stopped" }]} />
              </FlowStep>
              <FlowArrow label="data" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Keep the data in a named volume" what="A named volume outlives the containers: down and up again reattaches it. Without one, Postgres writes to an anonymous volume that a new container never reattaches. down -v deletes named volumes too." accent={ACCENT} active={at(4)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.volume} onChange={(e) => set({ volume: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  pgdata named volume
                </label>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The start order, waits, restarts and what each command keeps run here; startup times are illustrative.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
