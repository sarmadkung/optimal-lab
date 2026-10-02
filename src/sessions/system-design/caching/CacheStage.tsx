"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { LessonContext } from "@/components/lesson/Lesson";
import { REQUESTS, lru, preview, type LruStep } from "@/lib/cache";

export type PlaySnap = {
  size: number;
  cache: string[];
  hits: number;
  seen: number;
  last: LruStep & { key: string } | null;
  pulse: number;
};

export type CacheScene =
  | { kind: "cold" }
  | { kind: "idle"; size: number; history: string[]; caption: string }
  | { kind: "request"; size: number; history: string[]; key: string }
  | { kind: "replay"; size: number }
  | { kind: "play"; play: PlaySnap };

type Pt = [number, number];
type Who = "alice" | "bob" | "carol";

const PEOPLE: Record<string, { id: Who; name: string; letter: string; color: string }> = {
  a: { id: "alice", name: "Alice", letter: "A", color: "var(--c4)" },
  b: { id: "bob", name: "Bob", letter: "B", color: "var(--c3)" },
  c: { id: "carol", name: "Carol", letter: "C", color: "var(--c2)" },
};

const NARROW = "(max-width: 639px)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(NARROW);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function useNarrow() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(NARROW).matches, () => false);
}

function useTrip(runId: number, paused: boolean, ms: number, reduced: boolean) {
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const [t, setT] = useState(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      setT(1);
      return;
    }
    setT(0);
    let elapsed = 0;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      if (!pausedRef.current) elapsed += now - last;
      last = now;
      const next = Math.min(1, elapsed / ms);
      setT(next);
      if (next < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [runId, ms, reduced]);

  return t;
}

function layout(narrow: boolean) {
  if (narrow) {
    return { alice: [20, 28] as Pt, bob: [50, 28] as Pt, carol: [80, 28] as Pt, app: [32, 50] as Pt, cache: [50, 76] as Pt, db: [76, 50] as Pt, dbCold: [50, 68] as Pt };
  }
  return { alice: [16, 26] as Pt, bob: [34, 26] as Pt, carol: [52, 26] as Pt, app: [22, 62] as Pt, cache: [56, 64] as Pt, db: [86, 62] as Pt, dbCold: [50, 66] as Pt };
}

function lerp(a: Pt, b: Pt, u: number): Pt {
  const x = Math.max(0, Math.min(1, u));
  return [a[0] + (b[0] - a[0]) * x, a[1] + (b[1] - a[1]) * x];
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1">
      <p className="font-mono text-[9px] uppercase tracking-wider text-[var(--faint)]">{label}</p>
      <p className="font-mono text-sm tabular-nums">{value}</p>
    </div>
  );
}

function Person({ who, at, hot }: { who: (typeof PEOPLE)["a"]; at: Pt; hot: boolean }) {
  return (
    <div
      className="absolute z-20 w-16 -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-[var(--panel)] px-1 py-1 sm:w-32 sm:px-2 sm:py-1.5"
      style={{
        left: `${at[0]}%`,
        top: `${at[1]}%`,
        borderColor: hot ? who.color : "var(--line-strong)",
        boxShadow: hot ? `0 0 0 3px color-mix(in srgb, ${who.color} 25%, transparent)` : undefined,
      }}
    >
      <div className="flex flex-col items-center gap-0.5 sm:flex-row sm:gap-2">
        <span
          className="grid h-5 w-5 shrink-0 place-items-center rounded-full font-mono text-[10px] sm:h-6 sm:w-6 sm:text-xs"
          style={{ color: who.color, border: `1px solid ${who.color}` }}
        >
          {who.letter}
        </span>
        <span className="text-[10px] font-semibold sm:truncate sm:text-xs">{who.name}</span>
      </div>
    </div>
  );
}

function Box({ at, title, sub, hot, dim, wide }: { at: Pt; title: string; sub: string; hot?: boolean; dim?: boolean; wide?: boolean }) {
  return (
    <div
      className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-[var(--panel)] px-2 py-1.5 text-center ${wide ? "w-[min(17rem,78%)]" : "w-[4.75rem] sm:w-28"}`}
      style={{
        left: `${at[0]}%`,
        top: `${at[1]}%`,
        borderColor: hot ? "var(--sys)" : "var(--line-strong)",
        opacity: dim ? 0.4 : 1,
        boxShadow: hot ? "0 0 0 3px color-mix(in srgb, var(--sys) 22%, transparent)" : undefined,
      }}
    >
      <p className="text-xs font-semibold sm:text-sm">{title}</p>
      <p className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">{sub}</p>
    </div>
  );
}

function Picture({
  label,
  points,
  links,
  people,
  hotPerson,
  cache,
  size,
  cacheAt,
  dbAt,
  dbDim,
  dbHot,
  appAt,
  packet,
  evicted,
  hits,
  seen,
  caption,
  children,
}: {
  label: string;
  points: ReturnType<typeof layout>;
  links: { a: Pt; b: Pt; hot?: boolean; dim?: boolean }[];
  people: boolean;
  hotPerson: Who | null;
  cache: string[] | null;
  size: number;
  cacheAt: Pt | null;
  dbAt: Pt | null;
  dbDim: boolean;
  dbHot: boolean;
  appAt: Pt | null;
  packet: { at: Pt; label: string; tone: string } | null;
  evicted: string | null;
  hits: number;
  seen: number;
  caption: string;
  children?: ReactNode;
}) {
  const rate = seen === 0 ? "—" : `${Math.round((hits / seen) * 100)}%`;
  return (
    <div>
      <section aria-label={label} className="relative aspect-square overflow-hidden rounded-xl border border-[var(--line)] sm:aspect-[16/10]" style={{ backgroundColor: "var(--inset)", backgroundImage: "linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)", backgroundSize: "28px 28px" }}>
        <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          {links.map((link, i) => (
            <line
              key={i}
              x1={link.a[0]}
              y1={link.a[1]}
              x2={link.b[0]}
              y2={link.b[1]}
              vectorEffect="non-scaling-stroke"
              strokeWidth={link.hot ? 2.5 : 1.5}
              style={{ stroke: link.hot ? "var(--sys)" : "var(--line-strong)", opacity: link.dim ? 0.35 : 1 }}
            />
          ))}
        </svg>

        <div className="absolute top-2 left-2 z-40 flex gap-1.5 sm:top-3 sm:left-3">
          <Chip label="Hits" value={String(hits)} />
          <Chip label="Hit rate" value={rate} />
        </div>

        {people &&
          (Object.keys(PEOPLE) as (keyof typeof PEOPLE)[]).map((key) => {
            const person = PEOPLE[key];
            return <Person key={person.id} who={person} at={points[person.id]} hot={hotPerson === person.id} />;
          })}

        {appAt && <Box at={appAt} title="App" sub="checks cache" hot />}
        {dbAt && <Box at={dbAt} title="Database" sub={dbDim ? "not called" : "slow"} hot={dbHot} dim={dbDim} />}

        {cache && cacheAt && (
          <div
            className="absolute z-20 w-[min(18rem,86%)] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-[var(--panel)] px-2 py-2"
            style={{ left: `${cacheAt[0]}%`, top: `${cacheAt[1]}%`, borderColor: "var(--sys)" }}
          >
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs font-semibold sm:text-sm">Cache</p>
              <p className="font-mono text-[10px] text-[var(--muted)]">
                {cache.length}/{size}
              </p>
            </div>
            <ul className="mt-1.5 flex gap-1">
              {Array.from({ length: size }, (_, slot) => {
                const key = cache[slot];
                return (
                  <li
                    key={slot}
                    className="grid h-9 min-w-0 flex-1 place-items-center rounded-md border font-mono text-sm"
                    style={{ borderColor: key ? "var(--sys)" : "var(--line)", color: key ? "var(--text)" : "var(--faint)" }}
                  >
                    {key ?? "·"}
                  </li>
                );
              })}
            </ul>
            <p className="mt-1 text-[10px] text-[var(--faint)]">least recent → most recent</p>
            {evicted && <p className="mt-1 font-mono text-[10px] text-[var(--bad)]">dropped {evicted}</p>}
          </div>
        )}

        {packet && (
          <span
            aria-hidden
            className="absolute z-30 grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full font-mono text-xs font-semibold text-[var(--on-accent)]"
            style={{ left: `${packet.at[0]}%`, top: `${packet.at[1]}%`, background: packet.tone }}
          >
            {packet.label}
          </span>
        )}
      </section>
      {children}
      <p aria-live="polite" className="mt-3 min-h-10 text-sm text-[var(--text)]">
        {caption}
      </p>
    </div>
  );
}

function trip(points: ReturnType<typeof layout>, from: Who, t: number, hit: boolean, revealed: boolean): { at: Pt; hot: string } {
  const origin = points[from];
  if (!revealed) {
    return { at: lerp(origin, points.app, t / 0.34), hot: "user-app" };
  }
  if (hit) {
    if (t < 0.4) return { at: lerp(origin, points.app, t / 0.4), hot: "user-app" };
    if (t < 0.7) return { at: lerp(points.app, points.cache, (t - 0.4) / 0.3), hot: "app-cache" };
    return { at: lerp(points.cache, origin, (t - 0.7) / 0.3), hot: "cache-user" };
  }
  if (t < 0.2) return { at: lerp(origin, points.app, t / 0.2), hot: "user-app" };
  if (t < 0.4) return { at: lerp(points.app, points.cache, (t - 0.2) / 0.2), hot: "app-cache" };
  if (t < 0.65) return { at: lerp(points.cache, points.db, (t - 0.4) / 0.25), hot: "cache-db" };
  if (t < 0.85) return { at: lerp(points.db, points.cache, (t - 0.65) / 0.2), hot: "db-cache" };
  return { at: lerp(points.cache, origin, (t - 0.85) / 0.15), hot: "cache-user" };
}

export function CacheStage({ scene, ctx }: { scene: CacheScene; ctx: LessonContext }) {
  const narrow = useNarrow();
  const reduced = useReducedMotion() ?? false;
  const points = layout(narrow);

  if (scene.kind === "cold") return <Cold points={points} ctx={ctx} reduced={reduced} />;
  if (scene.kind === "replay") return <Replay points={points} size={scene.size} ctx={ctx} reduced={reduced} />;
  if (scene.kind === "play") return <Playfield points={points} play={scene.play} ctx={ctx} reduced={reduced} />;
  if (scene.kind === "request") return <Request points={points} scene={scene} ctx={ctx} reduced={reduced} />;

  const snap = lru(scene.size, scene.history).at(-1);
  return (
    <Picture
      label="Readers, an app, a cache and a database"
      points={points}
      links={links(points, null, true)}
      people
      hotPerson={null}
      cache={snap?.cache ?? []}
      size={scene.size}
      cacheAt={points.cache}
      dbAt={points.db}
      dbDim
      dbHot={false}
      appAt={points.app}
      packet={null}
      evicted={null}
      hits={snap?.hits ?? 0}
      seen={scene.history.length}
      caption={scene.caption}
    />
  );
}

function links(points: ReturnType<typeof layout>, hot: string | null, dbDim: boolean) {
  const people: Who[] = ["alice", "bob", "carol"];
  return [
    ...people.map((id) => ({ a: points[id], b: points.app, hot: hot === "user-app" || hot === "cache-user" })),
    { a: points.app, b: points.cache, hot: hot === "app-cache" || hot === "db-cache" },
    { a: points.cache, b: points.db, hot: hot === "cache-db", dim: dbDim },
  ];
}

function Cold({ points, ctx, reduced }: { points: ReturnType<typeof layout>; ctx: LessonContext; reduced: boolean }) {
  const keys = ["a", "b", "a", "c"];
  const [cycle, setCycle] = useState(0);
  const ms = Math.round(1400 / ctx.speed);
  const t = useTrip(ctx.runId + cycle, ctx.paused, ms, reduced);
  const key = keys[cycle % keys.length];
  const person = PEOPLE[key];

  useEffect(() => {
    if (reduced || ctx.paused || t < 1) return;
    const id = setTimeout(() => setCycle((n) => n + 1), 320);
    return () => clearTimeout(id);
  }, [reduced, ctx.paused, t]);

  useEffect(() => setCycle(0), [ctx.runId]);

  const at = reduced ? points.dbCold : lerp(points[person.id], points.dbCold, t);
  return (
    <Picture
      label="Readers sending every request to the database"
      points={points}
      links={(["alice", "bob", "carol"] as Who[]).map((id) => ({
        a: points[id],
        b: points.dbCold,
        hot: id === person.id,
      }))}
      people
      hotPerson={person.id}
      cache={null}
      size={0}
      cacheAt={null}
      dbAt={points.dbCold}
      dbDim={false}
      dbHot
      appAt={null}
      packet={reduced || t >= 0.98 ? null : { at, label: key, tone: "var(--sys)" }}
      evicted={null}
      hits={0}
      seen={cycle + 1}
      caption={`“${key}” is read from the database. The same keys will be computed again.`}
    />
  );
}

function Request({
  points,
  scene,
  ctx,
  reduced,
}: {
  points: ReturnType<typeof layout>;
  scene: Extract<CacheScene, { kind: "request" }>;
  ctx: LessonContext;
  reduced: boolean;
}) {
  const look = preview(scene.size, scene.history, scene.key);
  const ms = Math.round(1600 / ctx.speed);
  const t = useTrip(ctx.runId, ctx.paused, ms, reduced);
  const shown = reduced ? (ctx.revealed ? 1 : 0.2) : ctx.revealed ? t : Math.min(t, 0.34);
  const showAfter = ctx.revealed && (reduced || shown > 0.72);
  const person = PEOPLE[scene.key];
  const moved = trip(points, person.id, shown, look.after.hit, ctx.revealed);
  const dbDim = showAfter && look.after.hit;
  const tone = !showAfter ? "var(--sys)" : look.after.hit ? "var(--good)" : "var(--bad)";

  let caption = `“${scene.key}” is on its way. Look at the cache before it lands.`;
  if (showAfter && look.after.hit) caption = `Hit. “${scene.key}” came from the cache. The database was not called.`;
  if (showAfter && !look.after.hit && look.after.evicted) caption = `Miss. “${look.after.evicted}” left to make room for “${scene.key}”.`;
  if (showAfter && !look.after.hit && !look.after.evicted) caption = `Miss. The database answered, and “${scene.key}” was stored.`;

  return (
    <Picture
      label={`Request ${scene.key} reaching the cache`}
      points={points}
      links={links(points, moved.hot, dbDim)}
      people
      hotPerson={person.id}
      cache={showAfter ? look.after.cache : look.cache}
      size={scene.size}
      cacheAt={points.cache}
      dbAt={points.db}
      dbDim={dbDim}
      dbHot={!dbDim && moved.hot === "cache-db"}
      appAt={points.app}
      packet={reduced || shown >= 0.98 ? null : { at: moved.at, label: scene.key, tone }}
      evicted={showAfter ? look.after.evicted : null}
      hits={showAfter ? look.after.hits : look.hits}
      seen={look.seen + (showAfter ? 1 : 0)}
      caption={caption}
    />
  );
}

function Replay({ points, size, ctx, reduced }: { points: ReturnType<typeof layout>; size: number; ctx: LessonContext; reduced: boolean }) {
  const frames = lru(size);
  const [i, setI] = useState(0);
  const ms = Math.round(1200 / ctx.speed);
  const t = useTrip(ctx.runId * 20 + i + size * 100, ctx.paused, Math.round(ms * 0.85), reduced);

  useEffect(() => setI(0), [ctx.runId, size]);

  useEffect(() => {
    if (ctx.paused || i >= frames.length - 1) return;
    if (reduced) {
      setI(frames.length - 1);
      return;
    }
    const id = setTimeout(() => setI((n) => n + 1), ms);
    return () => clearTimeout(id);
  }, [ctx.paused, reduced, i, frames.length, ms]);

  const frame = frames[Math.min(i, frames.length - 1)];
  const person = PEOPLE[frame.key];
  const moved = trip(points, person.id, reduced ? 1 : t, frame.hit, true);

  return (
    <Picture
      label="The same requests replayed against the cache"
      points={points}
      links={links(points, moved.hot, frame.hit)}
      people
      hotPerson={person.id}
      cache={frame.cache}
      size={size}
      cacheAt={points.cache}
      dbAt={points.db}
      dbDim={frame.hit}
      dbHot={!frame.hit}
      appAt={points.app}
      packet={reduced || t >= 0.98 ? null : { at: moved.at, label: frame.key, tone: frame.hit ? "var(--good)" : "var(--sys)" }}
      evicted={frame.evicted}
      hits={frame.hits}
      seen={i + 1}
      caption={
        frame.hit
          ? `Hit. “${frame.key}” was already stored.`
          : frame.evicted
            ? `Miss. “${frame.evicted}” was dropped so “${frame.key}” could be stored.`
            : `Miss. “${frame.key}” was stored.`
      }
    >
      <ol className="mt-3 flex flex-wrap gap-1" aria-label="Request sequence">
        {REQUESTS.map((key, idx) => (
          <li
            key={`${key}-${idx}`}
            className="grid h-11 w-11 place-items-center rounded-md border font-mono"
            style={{
              borderColor: idx === i ? "var(--sys)" : "var(--line)",
              background: idx === i ? "color-mix(in srgb, var(--sys) 18%, transparent)" : "var(--inset)",
              opacity: idx > i ? 0.4 : 1,
            }}
          >
            {key}
          </li>
        ))}
      </ol>
    </Picture>
  );
}

function Playfield({ points, play, ctx, reduced }: { points: ReturnType<typeof layout>; play: PlaySnap; ctx: LessonContext; reduced: boolean }) {
  const t = useTrip(play.pulse, ctx.paused, Math.round(900 / ctx.speed), reduced);
  const last = play.last;
  const person = last ? PEOPLE[last.key] : null;
  const moved = person ? trip(points, person.id, reduced ? 1 : t, last?.hit ?? false, true) : null;

  let caption = "Send a, b or c. A full cache forgets the least recent key.";
  if (last?.hit) caption = `Hit. “${last.key}” was already stored, so it moves to most recent.`;
  if (last && !last.hit && last.evicted) caption = `Miss. “${last.evicted}” left to make room for “${last.key}”.`;
  if (last && !last.hit && !last.evicted) caption = `Miss. “${last.key}” was fetched and stored.`;

  return (
    <Picture
      label="A cache you can fill yourself"
      points={points}
      links={links(points, moved?.hot ?? null, Boolean(last?.hit))}
      people
      hotPerson={person?.id ?? null}
      cache={play.cache}
      size={play.size}
      cacheAt={points.cache}
      dbAt={points.db}
      dbDim={Boolean(last?.hit)}
      dbHot={Boolean(last && !last.hit)}
      appAt={points.app}
      packet={moved && last && !reduced && t < 0.98 ? { at: moved.at, label: last.key, tone: last.hit ? "var(--good)" : "var(--sys)" } : null}
      evicted={last?.evicted ?? null}
      hits={play.hits}
      seen={play.seen}
      caption={caption}
    />
  );
}
