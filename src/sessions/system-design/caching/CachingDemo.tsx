"use client";

import { useState } from "react";
import { Lesson, type LessonStep } from "@/components/lesson/Lesson";
import { Slider } from "@/components/session/ui";
import { applyLru, lru, type LruStep } from "@/lib/cache";
import { CacheStage, type CacheScene, type PlaySnap } from "./CacheStage";

const ACCENT = "var(--sys)";

const HIT_OR_MISS = [
  { id: "hit", label: "Hit" },
  { id: "miss", label: "Miss" },
];

type StoryStep = LessonStep & { scene: CacheScene | null };

const STEPS: StoryStep[] = [
  {
    id: "cold",
    chapter: "Chapter 01 · The slow path",
    title: "Every read hits the database",
    body: [
      "Alice, Bob and Carol keep asking for the same few keys.",
      "With no cache, every ask goes to the database, including a key that was just read.",
    ],
    scene: { kind: "cold" },
  },
  {
    id: "empty",
    chapter: "Chapter 01 · The slow path",
    title: "Put a cache in front",
    body: [
      "A cache is a small, fast memory for recent answers. The app checks it before the database.",
      "It starts empty, so the first read of a key still has to visit the database.",
    ],
    scene: {
      kind: "idle",
      size: 2,
      history: [],
      caption: "The cache has two slots, and both are empty.",
    },
  },
  {
    id: "store-a",
    chapter: "Chapter 02 · Hits and misses",
    title: "A miss stores a copy",
    body: [
      "“a” is not in the cache. That is a miss.",
      "The database answers, and the cache keeps a copy for next time.",
    ],
    scene: { kind: "request", size: 2, history: [], key: "a" },
  },
  {
    id: "hit-a",
    chapter: "Chapter 02 · Hits and misses",
    title: "The same key is free",
    body: [
      "“a” is asked for again. The cache already has it. That is a hit.",
      "The database is not called.",
    ],
    scene: { kind: "request", size: 2, history: ["a"], key: "a" },
  },
  {
    id: "predict-b",
    chapter: "Chapter 02 · Hits and misses",
    title: "Will this one hit?",
    body: ["The cache holds “a”. The next key is “b”.", "Decide before the request lands."],
    predict: {
      prompt: "Is “b” already in the cache?",
      choices: HIT_OR_MISS,
      correct: "miss",
      why: {
        hit: "A hit means the key is already stored. The only stored key is “a”.",
        miss: "“b” is new, so this is a miss. The database answers, and “b” is saved beside “a”.",
      },
    },
    scene: { kind: "request", size: 2, history: ["a", "a"], key: "b" },
  },
  {
    id: "predict-a",
    chapter: "Chapter 02 · Hits and misses",
    title: "Is “a” still there?",
    body: ["Both slots are now full. The next key is “a” again.", "Check the slots, then decide."],
    predict: {
      prompt: "Does “a” hit?",
      choices: HIT_OR_MISS,
      correct: "hit",
      why: {
        hit: "“a” is still stored, so the cache answers and moves “a” to most recent.",
        miss: "“a” is still in a slot. A miss is only for a key the cache does not have.",
      },
    },
    scene: { kind: "request", size: 2, history: ["a", "a", "b"], key: "a" },
  },
  {
    id: "order",
    chapter: "Chapter 03 · Eviction",
    title: "Recent keys stay at the end",
    body: [
      "The cache keeps keys in order of use. Left is least recent. Right is most recent.",
      "“a” was just requested, so it sits on the right. “b” has been waiting longer.",
    ],
    scene: {
      kind: "idle",
      size: 2,
      history: ["a", "a", "b", "a"],
      caption: "Order is now “b”, then “a”. Left would be the first to leave.",
    },
  },
  {
    id: "predict-evict",
    chapter: "Chapter 03 · Eviction",
    title: "Which key leaves?",
    body: ["A new key, “c”, arrives, and both slots are full.", "One stored key has to leave before “c” can be saved."],
    predict: {
      prompt: "Which key is evicted?",
      choices: [
        { id: "a", label: "a" },
        { id: "b", label: "b" },
        { id: "none", label: "Neither" },
      ],
      correct: "b",
      why: {
        a: "“a” was used most recently, so it stays. The left key is the one that leaves.",
        b: "“b” is least recent, so it leaves. The cache becomes “a”, then “c”.",
        none: "The cache has two slots. A new key needs a free slot, so one stored key leaves.",
      },
    },
    scene: { kind: "request", size: 2, history: ["a", "a", "b", "a"], key: "c" },
  },
  {
    id: "size",
    chapter: "Chapter 04 · Try it",
    title: "Make the cache bigger",
    body: [
      "The same seven requests play again: a b a c a b a.",
      "A bigger cache evicts less. It cannot help past the number of different keys.",
    ],
    scene: null,
  },
  {
    id: "playground",
    chapter: "Chapter 04 · Try it",
    title: "Send the keys yourself",
    body: [
      "Pick a cache size, then request a, b or c.",
      "Fill both slots, then ask for the key on the left. That one misses.",
    ],
    controls: false,
    scene: null,
  },
];

const EMPTY_PLAY: PlaySnap = { size: 2, cache: [], hits: 0, seen: 0, last: null, pulse: 0 };

export default function CachingDemo() {
  const [benchSize, setBenchSize] = useState(2);
  const [play, setPlay] = useState<PlaySnap>(EMPTY_PLAY);
  const ending = lru(benchSize).at(-1);

  function send(key: string) {
    setPlay((current) => {
      const step: LruStep = applyLru(current.cache, current.size, key);
      return {
        ...current,
        cache: step.cache,
        hits: current.hits + (step.hit ? 1 : 0),
        seen: current.seen + 1,
        last: { ...step, key },
        pulse: current.pulse + 1,
      };
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)]">System design · interactive</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Caching and eviction</h1>
      <p className="mt-3 text-[var(--muted)]">
        Watch a small cache hit, miss and forget a key. Three moments stop and ask you to predict before the picture answers.
      </p>

      <div className="mt-6">
        <Lesson
          steps={STEPS}
          accent={ACCENT}
          renderStage={(step, ctx) => {
            const story = STEPS.find((item) => item.id === step.id);
            if (step.id === "size") return <CacheStage scene={{ kind: "replay", size: benchSize }} ctx={ctx} />;
            if (step.id === "playground") return <CacheStage scene={{ kind: "play", play }} ctx={ctx} />;
            if (!story?.scene) return null;
            return <CacheStage scene={story.scene} ctx={ctx} />;
          }}
          renderExtra={(step) => {
            if (step.id === "size" && ending) {
              return (
                <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
                  <Slider
                    label="Cache size"
                    hint="How many keys fit"
                    value={benchSize}
                    min={1}
                    max={4}
                    step={1}
                    format={(value) => String(value)}
                    accent={ACCENT}
                    onChange={setBenchSize}
                  />
                  <p className="mt-3 text-sm text-[var(--text)]">
                    This sequence ends at {ending.hits} hits of {lru(benchSize).length}.
                    {benchSize >= 3 && " Only a, b and c are ever requested, so a fourth slot does not add hits."}
                  </p>
                </div>
              );
            }
            if (step.id !== "playground") return null;
            return (
              <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
                <Slider
                  label="Cache size"
                  hint="Changing the size clears what was stored"
                  value={play.size}
                  min={1}
                  max={4}
                  step={1}
                  format={(value) => String(value)}
                  accent={ACCENT}
                  onChange={(size) => setPlay({ ...EMPTY_PLAY, size })}
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  {["a", "b", "c"].map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => send(key)}
                      className="min-h-11 rounded-md px-4 font-mono text-sm font-semibold text-[var(--on-accent)]"
                      style={{ background: ACCENT }}
                    >
                      Request {key}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPlay({ ...EMPTY_PLAY, size: play.size })}
                    className="min-h-11 rounded-md border border-[var(--line-strong)] px-4 text-sm"
                  >
                    Reset
                  </button>
                </div>
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}
