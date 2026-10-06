"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, PlaybackControls, usePlayback } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMapPanel } from "@/components/system/SystemMap";
import { WORDS, groupTrace, keyOf, type KeyKind } from "@/lib/dsaPatterns";

const ACCENT = "var(--dsa)";
const TINTS = ["var(--c1)", "var(--c3)", "var(--c4)", "var(--c5)", "var(--c2)"];

export default function HashMapDemo() {
  const [kind, setKind] = useState<KeyKind>("sorted");
  const frames = groupTrace(WORDS, kind);
  const playback = usePlayback(frames.length, 1100);
  const f = frames[playback.i];
  const word = f.i >= 0 ? WORDS[f.i] : null;
  const done = playback.atEnd;
  const tint = (key: string) => TINTS[frames.at(-1)!.buckets.findIndex((b) => b.key === key) % TINTS.length];

  const caption =
    word === null
      ? "An empty map. Press Play to read the words one at a time."
      : `“${word}” → key “${f.key}”. ${f.found ? "That key is already in the map, so it joins that group." : "New key: start a new group."}${done ? ` Done: ${f.buckets.length} groups in one pass.` : ""}`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DSA · interactive"
        title="Hash map: group anagrams in one pass"
        blurb="Anagrams use the same letters. Give every word a key that is equal for anagrams, then use a hash map from key to group. One lookup per word, no comparing every pair."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5" aria-label="Words flowing into hash map buckets">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">Input</p>
              <ol className="mt-2 flex flex-wrap gap-1.5">
                {WORDS.map((w, i) => (
                  <li
                    key={`${w}-${i}`}
                    className="rounded-md border px-2.5 py-1 font-mono text-sm transition-[opacity,border-color] duration-300"
                    style={{
                      borderColor: i === f.i ? ACCENT : "var(--line)",
                      opacity: i < f.i ? 0.35 : 1,
                      background: i === f.i ? "color-mix(in srgb, var(--dsa) 16%, transparent)" : "transparent",
                    }}
                  >
                    {w}
                  </li>
                ))}
              </ol>

              <p className="mt-5 font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">Hash map · key → group</p>
              <ul className="mt-2 space-y-2">
                {f.buckets.length === 0 && <li className="text-sm text-[var(--faint)]">empty</li>}
                {f.buckets.map((b) => (
                  <li
                    key={b.key}
                    className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 transition-[border-color] duration-300"
                    style={{ borderColor: b.key === f.key ? ACCENT : "var(--line)" }}
                  >
                    <span className="rounded px-1.5 py-0.5 font-mono text-xs" style={{ background: `color-mix(in srgb, ${tint(b.key)} 22%, transparent)` }}>
                      {b.key}
                    </span>
                    <span className="text-[var(--faint)]">→</span>
                    <span className="font-mono text-sm">[{b.words.join(", ")}]</span>
                  </li>
                ))}
              </ul>
            </section>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <Choices
                label="Key"
                accent={ACCENT}
                value={kind}
                onChange={(k) => {
                  setKind(k);
                  playback.reset();
                }}
                options={[
                  { id: "sorted", label: "Sorted letters" },
                  { id: "counts", label: "Letter counts" },
                ]}
              />
              <PlaybackControls playback={playback} accent={ACCENT} nextLabel="Next word" status={`Word ${Math.max(0, f.i + 1)} of ${WORDS.length}`} />
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Read the next word" what="Go through the list once, left to right." accent={ACCENT} active={f.i >= 0 && !done}>
                <p className="font-mono text-sm">{word ?? "—"}</p>
              </FlowStep>
              <FlowArrow label="one word" accent={ACCENT} />

              <FlowStep n={2} title="Build its key" what="Anagrams must get the same key. Sorting the letters works in O(k log k). Counting the letters works in O(k) for a fixed alphabet." accent={ACCENT} active={f.i >= 0}>
                <p className="font-mono text-sm">{word ? `${word} → ${keyOf(word, kind)}` : "—"}</p>
              </FlowStep>
              <FlowArrow label="a key" accent={ACCENT} />

              <FlowStep n={3} title="Look the key up" what="A hash map answers “have I seen this key?” in O(1) on average, however many groups there are." accent={ACCENT} active={f.found}>
                <p className="text-sm">{f.key === null ? "—" : f.found ? `Found “${f.key}”.` : `“${f.key}” is new.`}</p>
              </FlowStep>
              <FlowArrow label="found or new" accent={ACCENT} />

              <FlowStep n={4} title="Add the word to its group" what="Append to the existing group, or create one with just this word." accent={ACCENT} active={f.i >= 0 && !f.found}>
                <p className="text-sm">{f.buckets.length} {f.buckets.length === 1 ? "group" : "groups"} so far.</p>
              </FlowStep>
              <FlowArrow label="after the last word" accent={ACCENT} />

              <FlowStep n={5} title="Return the groups" what="The map's values are the answer. n words of length k: O(n·k log k) with sorted keys, versus comparing every pair of words." accent={ACCENT} active={done}>
                <p className="font-mono text-sm break-words">{done ? JSON.stringify(f.buckets.map((b) => b.words)) : "…"}</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
