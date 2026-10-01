"use client";

import { useEffect, useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Slider } from "@/components/session/ui";
import { REQUESTS, lru } from "@/lib/cache";

const ACCENT = "var(--sys)";

export default function CachingDemo() {
  const [size, setSize] = useState(2);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const frames = lru(size);
  const frame = frames[Math.min(i, frames.length - 1)];
  const seen = i + 1;
  const rate = Math.round((frame.hits / seen) * 100);

  const atEnd = i >= frames.length - 1;

  useEffect(() => {
    if (!playing || atEnd) return;
    const t = setTimeout(() => setI((n) => n + 1), 700);
    return () => clearTimeout(t);
  }, [playing, atEnd, i]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)]">System design · interactive</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Caching and eviction</h1>
      <p className="mt-3 text-[var(--muted)]">
        The same keys come back: {REQUESTS.join(" ")}. A hit is free. A full cache has to forget the
        least recently used key before it stores a new one.
      </p>

      <div className="mt-6">
        <FlowStep n={1} title="A request arrives" what="Each letter is a key someone just asked for." accent={ACCENT} active>
          <ol className="flex flex-wrap gap-1">
            {REQUESTS.map((key, idx) => (
              <li
                key={`${key}-${idx}`}
                className="grid h-11 w-11 place-items-center rounded-md border font-mono"
                style={{
                  borderColor: idx === i ? ACCENT : "var(--line)",
                  background: idx === i ? "color-mix(in srgb, var(--sys) 18%, transparent)" : "var(--inset)",
                  opacity: idx > i ? 0.4 : 1,
                }}
              >
                {key}
              </li>
            ))}
          </ol>
        </FlowStep>
        <FlowArrow label={`key ${frame.key}`} accent={ACCENT} active={playing} />

        <FlowStep n={2} title="Look in the cache" what="If the key is already stored, that is a hit. Move it to most recent and do not call the slow store." accent={ACCENT} active={frame.hit}>
          <p className="text-sm" style={{ color: frame.hit ? "var(--good)" : "var(--bad)" }}>
            {frame.hit ? `Hit. “${frame.key}” was already cached.` : `Miss. “${frame.key}” was not cached.`}
          </p>
        </FlowStep>
        <FlowArrow label={frame.evicted ? `evict ${frame.evicted}` : "nothing evicted"} accent={ACCENT} />

        <FlowStep
          n={3}
          title="Evict the least recent key when full"
          what="The cache holds a fixed number of keys. The one you have not used for the longest is the one that leaves."
          accent={ACCENT}
          active={frame.evicted !== null}
        >
          <Slider
            label="Cache size"
            hint="How many keys fit"
            value={size}
            min={1}
            max={4}
            step={1}
            format={(v) => String(v)}
            accent={ACCENT}
            onChange={(v) => {
              setSize(v);
              setI(0);
              setPlaying(false);
            }}
          />
          <p className="mt-3 text-sm text-[var(--muted)]">
            {frame.evicted ? `Dropped “${frame.evicted}” to make room.` : "There was room, or this was a hit."}
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {Array.from({ length: size }, (_, slot) => {
              const key = frame.cache[slot];
              return (
                <li
                  key={slot}
                  className="grid h-11 min-w-11 place-items-center rounded-md border px-3 font-mono"
                  style={{ borderColor: key ? ACCENT : "var(--line)", color: key ? "var(--text)" : "var(--faint)" }}
                >
                  {key ?? "·"}
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-[var(--faint)]">Left is least recent. Right is most recent.</p>
        </FlowStep>
        <FlowArrow label={`${frame.hits} hits / ${seen}`} accent={ACCENT} />

        <FlowStep n={4} title="Update the hit rate" what="A bigger cache helps only when the keys you evict are asked for again." accent={ACCENT}>
          <p className="font-mono text-lg tabular-nums">{rate}% hits</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setI((n) => (n >= frames.length - 1 ? 0 : n + 1))}
              className="min-h-11 rounded-md px-4 text-sm font-semibold text-[var(--on-accent)]"
              style={{ background: ACCENT }}
            >
              {i >= frames.length - 1 ? "Restart" : "Next request"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (atEnd) {
                  setI(0);
                  setPlaying(true);
                  return;
                }
                setPlaying((p) => !p);
              }}
              className="min-h-11 rounded-md border border-[var(--line-strong)] px-4 text-sm"
            >
              {playing && !atEnd ? "Pause" : "Play"}
            </button>
          </div>
        </FlowStep>
      </div>
    </div>
  );
}
