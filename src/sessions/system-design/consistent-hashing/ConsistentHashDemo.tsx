"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, Meter } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMapPanel } from "@/components/system/SystemMap";
import { ALL_SERVERS, KEYS, angle, assign, hash, moved, type Strategy } from "@/lib/consistentHash";

const ACCENT = "var(--sys)";
const SERVER_COLOR: Record<string, string> = { A: "var(--c1)", B: "var(--c2)", C: "var(--c3)", D: "var(--c4)", E: "var(--c5)" };
const VNODES = [1, 4, 16, 64];

type Change = { label: string; before: string[] } | null;

export default function ConsistentHashDemo() {
  const [servers, setServers] = useState(["A", "B", "C", "D"]);
  const [vnodes, setVnodes] = useState(1);
  const [strategy, setStrategy] = useState<Strategy>("ring");
  const [change, setChange] = useState<Change>(null);
  const [lastStep, setLastStep] = useState(1);

  const now = assign(servers, vnodes, strategy);
  const prev = change ? assign(change.before, vnodes, strategy) : null;
  const movedKeys = prev ? moved(prev.owner, now.owner) : [];
  const ideal = KEYS.length / servers.length;
  const heaviest = Math.max(...Object.values(now.load));

  const toggle = (s: string) => {
    const on = servers.includes(s);
    if (on && servers.length <= 2) return;
    const next = on ? servers.filter((x) => x !== s) : [...servers, s].sort();
    setChange({ label: on ? `Removed ${s}` : `Added ${s}`, before: servers });
    setServers(next);
    setLastStep(4);
  };

  const caption = change
    ? `${change.label}: ${movedKeys.length} of ${KEYS.length} keys moved${strategy === "ring" ? ` (ideal ≈ ${Math.round(KEYS.length / Math.max(servers.length, change.before.length))})` : ""}. ${strategy === "modulo" ? "With hash % n, changing n reshuffles almost everything." : "Only keys in the changed slice moved."}`
    : `${KEYS.length} keys on ${servers.length} servers. Busiest server holds ${heaviest} keys; a perfect split is ${ideal.toFixed(0)}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="System design · interactive"
        title="Consistent hashing"
        blurb="Spread keys over cache or database servers. With hash(key) % n, adding one server moves almost every key. Put servers and keys on a ring instead, and only one slice moves."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5" aria-label="The hash ring with servers and keys">
              <Ring servers={servers} vnodes={vnodes} owner={now.owner} points={now.points} moved={movedKeys} strategy={strategy} />
              <ul className="mt-4 space-y-2">
                {ALL_SERVERS.filter((s) => servers.includes(s)).map((s) => (
                  <li key={s} className="grid grid-cols-[5.5rem_minmax(0,1fr)_2.5rem] items-center gap-2 text-sm">
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: SERVER_COLOR[s] }} />
                      Server {s}
                    </span>
                    <Meter value={now.load[s]} max={Math.max(heaviest, ideal * 1.6)} color={SERVER_COLOR[s]} />
                    <span className="text-right font-mono tabular-nums">{now.load[s]}</span>
                  </li>
                ))}
              </ul>
            </section>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <Choices
                label="Placement"
                accent={ACCENT}
                value={strategy}
                onChange={(s) => {
                  setStrategy(s);
                  setChange(null);
                  setLastStep(s === "ring" ? 3 : 1);
                }}
                options={[
                  { id: "ring", label: "Hash ring" },
                  { id: "modulo", label: "hash % n" },
                ]}
              />
              <div className="w-full">
                <p className="mb-2 text-sm font-medium">Servers (tap to add or remove)</p>
                <div className="flex flex-wrap gap-2">
                  {ALL_SERVERS.map((s) => {
                    const on = servers.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggle(s)}
                        className="min-h-11 min-w-11 rounded-md border px-3 font-mono text-sm"
                        style={{
                          borderColor: on ? SERVER_COLOR[s] : "var(--line)",
                          background: on ? `color-mix(in srgb, ${SERVER_COLOR[s]} 18%, transparent)` : "transparent",
                          color: on ? "var(--text)" : "var(--faint)",
                        }}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
              {strategy === "ring" && (
                <Choices
                  label="Virtual nodes per server"
                  accent={ACCENT}
                  value={String(vnodes)}
                  onChange={(v) => {
                    setVnodes(Number(v));
                    setChange(null);
                    setLastStep(5);
                  }}
                  options={VNODES.map((v) => ({ id: String(v), label: String(v) }))}
                />
              )}
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Hash each server onto the ring" what="A hash turns a name into a number from 0 to 2³²−1. Bend that range into a circle, and each server sits at its hash." accent={ACCENT} active={lastStep === 1}>
                <p className="font-mono text-xs leading-6">
                  {servers.map((s) => `${s}#0 → ${Math.round(angle(hash(`${s}#0`)))}°`).join(" · ")}
                </p>
              </FlowStep>
              <FlowArrow label="servers on the ring" accent={ACCENT} />

              <FlowStep n={2} title="Hash each key onto the same ring" what="Keys use the same hash function, so they land on the same circle." accent={ACCENT}>
                <p className="font-mono text-xs">{KEYS.slice(0, 3).map((k) => `${k} → ${Math.round(angle(hash(k)))}°`).join(" · ")} …</p>
              </FlowStep>
              <FlowArrow label="a key's position" accent={ACCENT} />

              <FlowStep n={3} title="Walk clockwise to the first server" what="That server owns the key. Each server owns the arc just before it." accent={ACCENT} active={lastStep === 3}>
                <p className="text-sm">
                  {strategy === "ring" ? `user:1 → server ${now.owner["user:1"]}` : `hash % ${servers.length} picks the server instead: user:1 → ${now.owner["user:1"]}`}
                </p>
              </FlowStep>
              <FlowArrow label="change the servers" accent={ACCENT} />

              <FlowStep n={4} title="Add or remove a server" what="A new server takes keys only from the arc it lands in. A removed server hands its arc to the next one clockwise. Everyone else keeps their keys, so their caches stay warm." accent={ACCENT} active={lastStep === 4}>
                <p className="text-sm">
                  {change ? `${change.label}: ${movedKeys.length} keys moved (${Math.round((movedKeys.length / KEYS.length) * 100)}%).` : "Tap a server in the panel."}
                </p>
              </FlowStep>
              <FlowArrow label="uneven arcs" accent={ACCENT} />

              <FlowStep n={5} title="Even it out with virtual nodes" what="One point per server leaves random, uneven arcs. Put each server on the ring many times and the arcs average out. DynamoDB and Cassandra do this." accent={ACCENT} active={lastStep === 5}>
                <p className="text-sm">
                  {vnodes} {vnodes === 1 ? "point" : "points"} per server · busiest {heaviest} keys vs {ideal.toFixed(0)} ideal ({Math.round((heaviest / ideal - 1) * 100)}% over)
                </p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Ring({
  servers,
  vnodes,
  owner,
  points,
  moved: movedKeys,
  strategy,
}: {
  servers: string[];
  vnodes: number;
  owner: Record<string, string>;
  points: ReturnType<typeof assign>["points"];
  moved: string[];
  strategy: Strategy;
}) {
  const R = 40;
  const xy = (deg: number, r = R) => {
    const a = ((deg - 90) * Math.PI) / 180;
    // Rounded so the server render and the browser agree to the last digit (no hydration mismatch).
    const round = (n: number) => Math.round(n * 1000) / 1000;
    return [round(50 + r * Math.cos(a)), round(50 + r * Math.sin(a))] as const;
  };
  return (
    <svg viewBox="0 0 100 100" className="mx-auto aspect-square w-full max-w-[22rem]" role="img" aria-label={`${servers.length} servers and ${KEYS.length} keys on a hash ring`}>
      <circle cx="50" cy="50" r={R} fill="none" strokeWidth="0.6" style={{ stroke: "var(--line-strong)" }} />
      {strategy === "ring" &&
        points.map((p) => {
          const [x1, y1] = xy(angle(p.pos), R - 4);
          const [x2, y2] = xy(angle(p.pos), R + 4);
          return <line key={`${p.server}-${p.vnode}`} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={vnodes > 16 ? 0.6 : 1.4} style={{ stroke: SERVER_COLOR[p.server] }} />;
        })}
      {strategy === "ring" &&
        vnodes <= 4 &&
        points.map((p) => {
          const [x, y] = xy(angle(p.pos), R + 8);
          return (
            <text key={`l-${p.server}-${p.vnode}`} x={x} y={y + 1.5} textAnchor="middle" fontSize="4" fontWeight="600" style={{ fill: SERVER_COLOR[p.server] }}>
              {p.server}
            </text>
          );
        })}
      {KEYS.map((k) => {
        const [x, y] = xy(angle(hash(k)), R);
        const isMoved = movedKeys.includes(k);
        return (
          <g key={k}>
            {isMoved && <circle cx={x} cy={y} r="2.8" fill="none" strokeWidth="0.6" style={{ stroke: "var(--text)" }} />}
            <circle cx={x} cy={y} r="1.5" style={{ fill: SERVER_COLOR[owner[k]], transition: "fill 0.3s" }} />
          </g>
        );
      })}
      <text x="50" y="49" textAnchor="middle" fontSize="4.5" style={{ fill: "var(--muted)" }}>
        {strategy === "ring" ? "clockwise →" : `hash % ${servers.length}`}
      </text>
      <text x="50" y="55" textAnchor="middle" fontSize="3.5" style={{ fill: "var(--faint)" }}>
        ◯ = moved
      </text>
    </svg>
  );
}
