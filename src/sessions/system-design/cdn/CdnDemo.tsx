"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, PlaybackControls, usePlayback } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type NodeState, type Packet } from "@/components/system/SystemMap";
import { DEPLOY_AT, REGIONS, TICKS, UPDATES, simulate, totals, type Update } from "@/lib/cdn";

const ACCENT = "var(--sys)";
const TTLS = [0, 3, 10];
const EDGE_AT: Record<string, [number, number]> = { khi: [14, 22], lon: [14, 78], nyc: [52, 78] };
const EDGE_MOBILE_AT: Record<string, [number, number]> = { khi: [20, 14], lon: [80, 14], nyc: [20, 86] };

export default function CdnDemo() {
  const [ttl, setTtl] = useState(10);
  const [update, setUpdate] = useState<Update>("wait");
  const frames = simulate(ttl, update);
  const playback = usePlayback(frames.length, 1000);
  const f = frames[playback.i];
  const sum = totals(frames.slice(0, playback.i + 1));
  const misses = f.serves.filter((s) => !s.hit);

  const edgeState = (id: string): NodeState => {
    const s = f.serves.find((x) => x.region === id)!;
    return s.stale ? "bad" : s.hit ? "good" : "active";
  };
  const packets: Packet[] = misses.flatMap((s, i) => hops(`${ttl}-${update}-${f.tick}-${s.region}`, [s.region, "origin", s.region], { label: s.version === 2 ? "v2" : "v1", start: i * 0.15 }));

  const caption = `Tick ${f.tick}: ${f.event}`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="System design · interactive"
        title="CDNs: caching at the edge"
        blurb="Your origin server is in Virginia. Users in Karachi, London and New York each load your logo once per tick. Put a CDN in front, choose how long edges may keep a copy, then ship a new logo and see who still gets the old one."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-4">
              <SystemMap
                title="Three CDN edge locations in front of one origin server"
                accent={ACCENT}
                chrome="split"
                nodes={[
                  ...REGIONS.map((r) => {
                    const s = f.serves.find((x) => x.region === r.id)!;
                    const cached = f.edges[r.id];
                    return {
                      id: r.id,
                      label: `${r.city} edge`,
                      sub: `${s.hit ? "HIT" : "MISS"} · ${s.ms} ms${cached ? ` · v${cached.version} until t${cached.expires}` : ""}`,
                      at: EDGE_AT[r.id],
                      mobileAt: EDGE_MOBILE_AT[r.id],
                      state: edgeState(r.id),
                    };
                  }),
                  { id: "origin", label: "Origin (Virginia)", sub: `logo v${f.tick >= DEPLOY_AT ? 2 : 1} · ${sum.originHits} requests`, at: [86, 50], mobileAt: [72, 74], state: misses.length ? "active" : "idle" },
                ]}
                links={REGIONS.map((r) => ({ from: r.id, to: "origin", label: "miss → fetch" }))}
                packets={packets}
                aspect={2.1}
                mobileAspect={1}
              />
              <Timeline frames={frames} at={playback.i} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <Choices label="Cache-Control max-age (TTL)" accent={ACCENT} value={String(ttl)} onChange={(v) => { setTtl(Number(v)); playback.reset(); }} options={TTLS.map((t) => ({ id: String(t), label: t === 0 ? "No cache" : `${t} ticks` }))} />
              <Choices label={`When the new logo ships (tick ${DEPLOY_AT})`} accent={ACCENT} value={update} onChange={(u) => { setUpdate(u); playback.reset(); }} options={UPDATES.map((u) => ({ id: u.id, label: u.label }))} />
              <p className="w-full text-xs text-[var(--faint)]">{UPDATES.find((u) => u.id === update)!.detail}</p>
              <dl className="grid w-full grid-cols-3 gap-2 text-center">
                <Stat label="hit ratio" value={`${Math.round(sum.hitRatio * 100)}%`} />
                <Stat label="origin requests" value={String(sum.originHits)} />
                <Stat label="stale logos" value={String(sum.stale)} bad={sum.stale > 0} />
              </dl>
              <PlaybackControls playback={playback} accent={ACCENT} nextLabel="Next tick" status={`tick ${f.tick} of ${TICKS - 1}`} />
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="The user reaches the nearest edge" what="DNS or anycast routes each user to the closest CDN location, tens of milliseconds away instead of hundreds." accent={ACCENT}>
                <p className="text-sm">{REGIONS.map((r) => `${r.city} ${r.edgeMs} ms`).join(" · ")}</p>
              </FlowStep>
              <FlowArrow label="GET /logo.png" accent={ACCENT} />

              <FlowStep n={2} title="The edge checks its cache" what="A copy that hasn't expired is a hit: served straight from the edge. The origin never hears about it." accent={ACCENT} active={f.serves.some((s) => s.hit)}>
                <p className="text-sm">{f.serves.filter((s) => s.hit).length} of {REGIONS.length} hits this tick.</p>
              </FlowStep>
              <FlowArrow label="miss" accent={ACCENT} />

              <FlowStep n={3} title="A miss goes to the origin" what="The edge fetches from Virginia, stores the copy for max-age, and returns it. Far-away users pay the full round trip." accent={ACCENT} active={misses.length > 0}>
                <p className="text-sm">
                  {misses.length ? misses.map((s) => `${REGIONS.find((r) => r.id === s.region)!.city} +${REGIONS.find((r) => r.id === s.region)!.originMs} ms`).join(" · ") : "No misses this tick."}
                </p>
              </FlowStep>
              <FlowArrow label="cached for the TTL" accent={ACCENT} />

              <FlowStep n={4} title="Longer TTL: faster, but stale for longer" what="Every tick the edge keeps a copy is a tick the origin rests and users load fast, and a tick a changed file stays old." accent={ACCENT} active={f.serves.some((s) => s.stale)}>
                <p className="text-sm">
                  Average wait so far: {REGIONS.map((r) => `${r.city} ${sum.avgMs[r.id]} ms`).join(" · ")}
                </p>
              </FlowStep>
              <FlowArrow label="you ship a change" accent={ACCENT} />

              <FlowStep n={5} title="Update with a purge or a new file name" what="Purge tells every edge to drop the old copy. Better for static files: put a version or hash in the name (logo.3f9a.png) and cache it for a year, since a new file is a new URL." accent={ACCENT} active={f.tick === DEPLOY_AT}>
                <p className="text-sm" style={{ color: sum.stale ? "var(--bad)" : undefined }}>
                  {sum.stale ? `${sum.stale} stale logos served so far.` : "No stale logos so far."}
                </p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function Stat({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="flex flex-col-reverse rounded-lg bg-[var(--inset)] px-2 py-2">
      <dt className="text-[10px] uppercase tracking-wider text-[var(--faint)]">{label}</dt>
      <dd className="font-mono text-base" style={{ color: bad ? "var(--bad)" : undefined }}>
        {value}
      </dd>
    </div>
  );
}

function Timeline({ frames, at }: { frames: ReturnType<typeof simulate>; at: number }) {
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="Hits and misses for each city over time">
      <div className="grid gap-y-1.5 text-xs" style={{ gridTemplateColumns: `4.5rem repeat(${frames.length}, minmax(0, 1fr))` }}>
        <span />
        {frames.map((fr) => (
          <span key={fr.tick} className="text-center font-mono text-[9px]" style={{ color: fr.tick === DEPLOY_AT ? "var(--sys)" : "var(--faint)" }}>
            {fr.tick === DEPLOY_AT ? "▼" : fr.tick}
          </span>
        ))}
        {REGIONS.map((r) => (
          <div key={r.id} className="contents">
            <span className="truncate text-[var(--muted)]">{r.city}</span>
            {frames.map((fr) => {
              const s = fr.serves.find((x) => x.region === r.id)!;
              const seen = fr.tick <= at;
              return (
                <span
                  key={fr.tick}
                  title={`${s.hit ? "hit" : "miss"} · v${s.version}`}
                  className="mx-px grid h-6 place-items-center rounded-sm font-mono text-[9px] font-semibold"
                  style={{
                    opacity: seen ? 1 : 0.2,
                    background: s.stale ? "var(--bad)" : s.hit ? "color-mix(in srgb, var(--good) 70%, transparent)" : "var(--line-strong)",
                    color: s.stale || s.hit ? "var(--on-accent)" : "var(--text)",
                    outline: fr.tick === at ? "2px solid var(--text)" : undefined,
                  }}
                >
                  {s.hit ? "H" : "M"}
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-[var(--muted)]">
        H hit · M miss (went to origin) · <span style={{ color: "var(--bad)" }}>red = old logo after the deploy</span> · ▼ new logo ships
      </p>
    </section>
  );
}
