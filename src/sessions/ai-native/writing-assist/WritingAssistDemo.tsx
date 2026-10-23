"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type Packet } from "@/components/system/SystemMap";
import { OPS, ORIGINAL, PROTECTED, diff, render, rewrite, type Op } from "@/lib/writingAssist";

const ACCENT = "var(--native)";

export default function WritingAssistDemo() {
  const [op, setOp] = useState<Op>("german");
  const [protect, setProtect] = useState(false);
  const [choice, setChoice] = useState<"pending" | "accepted" | "kept">("pending");
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const r = rewrite(op, protect);
  const o = OPS.find((x) => x.id === op)!;
  const broken = r.lost.length > 0 || r.leftover.length > 0;
  const pickOp = (v: Op) => {
    setOp(v);
    setChoice("pending");
  };

  const packets: Packet[] =
    stage === 0 ? hops("sel", ["editor", "protect"], { label: "selection + instruction" })
    : stage === 1 ? hops("m", ["protect", "model"], { label: protect ? `${PROTECTED.length} parts masked` : "raw text" })
    : stage === 2 ? hops("out", ["model", "check"], { label: o.label.toLowerCase() })
    : stage === 3 ? hops("d", ["check", "editor"], { label: r.lost.length ? `${r.lost.length} lost` : "all parts back", tone: r.lost.length ? "bad" : "good" })
    : stage === 4 ? hops("send", ["editor", "send"], { label: r.leftover.length ? `“${r.leftover[0]}” unfilled` : "Hi Ana…", tone: broken ? "bad" : "good" })
    : [];

  const captions = [
    `Step 1: the user selects the email and asks: “${o.instruction}”`,
    protect ? `Step 2: before sending, ${PROTECTED.length} parts that must not change become markers ⟦1⟧…⟦${PROTECTED.length}⟧.` : "Step 2: the raw text goes to the model, placeholders and all.",
    `Step 3: the model rewrites it${protect ? ", leaving the markers where they belong in the new sentence" : ""}.`,
    r.lost.length ? `Step 4: ${r.lost.length} protected part${r.lost.length === 1 ? " is" : "s are"} missing: ${r.lost.join(", ")}.` : "Step 4: every protected part is back, exactly as it was.",
    r.leftover.length ? `Step 5: the template engine doesn't know ${r.leftover.join(" or ")}, so the customer sees it literally.`
    : r.lost.length ? `Step 5: the email renders, without ${r.lost.join(", ")}: the changes showed it, if anyone looked.`
    : "Step 5: the user reviews the changes, accepts, and the email renders with every value filled in.",
  ];
  const caption = stage !== null ? captions[stage] : `${o.label}${protect ? " with protected parts" : ""}: ${r.lost.length ? `lost ${r.lost.join(", ")}` : "nothing lost"}${r.leftover.length ? `; ${r.leftover.join(", ")} left unfilled` : ""} · ${r.lengthChange >= 0 ? "+" : ""}${Math.round(r.lengthChange * 100)}% length.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="AI Native · interactive"
        title="Writing and rewriting features"
        blurb="A “rewrite” button in an email editor looks like one model call. Then the German version translates {first_name} into {vorname}, the short one drops the storage limit, and the user can't see what changed. Protect what must not change, check it came back, and show the changes before anything is replaced."
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="Editor, protect step, model, check step and the email that is sent"
                accent={ACCENT}
                chrome="split"
                nodes={[
                  { id: "editor", label: "Editor", sub: choice === "accepted" ? "accepted" : choice === "kept" ? "kept original" : "changes shown", at: [12, 50], mobileAt: [24, 12], state: "active" },
                  { id: "protect", label: "Protect", sub: protect ? `${PROTECTED.length} markers` : "off", at: [42, 18], mobileAt: [76, 12], state: protect ? "active" : "dim" },
                  { id: "model", label: "Model", sub: o.label.toLowerCase(), at: [80, 18], mobileAt: [76, 50], state: "active" },
                  { id: "check", label: "Restore + check", sub: r.lost.length ? `${r.lost.length} lost` : "all back", at: [80, 82], mobileAt: [76, 88], state: r.lost.length ? "bad" : "good" },
                  { id: "send", label: "Email to Ana", sub: r.leftover.length ? "unfilled tags" : "renders", at: [42, 82], mobileAt: [24, 88], state: broken ? "bad" : "good" },
                ]}
                links={[
                  { from: "editor", to: "protect", label: "text" },
                  { from: "protect", to: "model", label: "masked" },
                  { from: "model", to: "check", label: "rewrite" },
                  { from: "check", to: "editor", label: "changes" },
                  { from: "editor", to: "send", label: "accept" },
                ]}
                packets={packets}
                aspect={2}
                mobileAspect={0.9}
              />
              <DiffCard op={op} protect={protect} choice={choice} setChoice={setChoice} />
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Choices label="Rewrite" accent={ACCENT} value={op} onChange={pickOp} options={OPS.map((x) => ({ id: x.id, label: x.label }))} />
              </div>
              <label className="flex min-h-11 w-full items-center gap-2 text-sm">
                <input type="checkbox" checked={protect} onChange={(e) => setProtect(e.target.checked)} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                Protect placeholders, names, numbers and links
              </label>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Rewriting…">
                Rewrite the email
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Send the selection with a narrow instruction" what="The feature sends what the user selected and one instruction from a fixed menu: friendlier, shorter, more formal, German. A menu keeps prompts tested; a free “ask AI” box is a different feature with different risks." accent={ACCENT} active={at(0)}>
                <Choices label="Rewrite" accent={ACCENT} value={op} onChange={pickOp} options={OPS.map((x) => ({ id: x.id, label: x.label }))} />
                <p className="mt-2 rounded-md bg-[var(--inset)] p-2 text-xs">{ORIGINAL}</p>
              </FlowStep>
              <FlowArrow label="text" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Mask what must not change" what="Placeholders, product names, prices and links are not the model's to rewrite. Replace each with a numbered marker before sending; the model moves the markers with the sentence and leaves them alone." accent={ACCENT} active={at(1)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={protect} onChange={(e) => setProtect(e.target.checked)} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Replace protected parts with markers
                </label>
                <p className="rounded-md bg-[var(--inset)] p-2 font-mono text-[11px] leading-relaxed break-words">{r.sent}</p>
                <ul className="mt-2 flex flex-wrap gap-1.5 font-mono text-[11px] text-[var(--muted)]">
                  {PROTECTED.map((p, i) => (
                    <li key={p} className="rounded bg-[var(--inset)] px-1.5 py-0.5 break-all">
                      ⟦{i + 1}⟧ {p}
                    </li>
                  ))}
                </ul>
              </FlowStep>
              <FlowArrow label={protect ? "masked text" : "raw text"} accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Let the model rewrite" what="Translation is where unprotected text breaks first: the model translates {first_name} into {vorname} and the product name into German. Shortening is next: it drops details it thinks are minor." accent={ACCENT} active={at(2)}>
                <p className="rounded-md bg-[var(--inset)] p-2 font-mono text-[11px] leading-relaxed break-words">{r.returned}</p>
              </FlowStep>
              <FlowArrow label="rewrite" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Restore the parts, then check every one came back" what="Swap the markers back for the originals. Masking stops the model changing a part, not dropping it, so check each protected part is in the result and warn the user about any that went missing." accent={ACCENT} active={at(3)}>
                <ul className="grid gap-x-3 gap-y-0.5 font-mono text-[11px] sm:grid-cols-2">
                  {r.parts.map((x) => (
                    <li key={x.part} className="break-all" style={{ color: x.ok ? "var(--good)" : "var(--bad)" }}>
                      {x.ok ? "✓" : "✗"} {x.part}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Length {r.lengthChange >= 0 ? "+" : ""}
                  {Math.round(r.lengthChange * 100)}%{op === "german" ? ": German usually runs 20–30% longer, so buttons and subject lines need room." : "."}
                </p>
              </FlowStep>
              <FlowArrow label="changes" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Show the changes and let the user decide" what="Never replace text in place. Show what was removed and added (side by side for a translation), flag lost parts, and keep the original one click away. Only accepted text goes out, through the template engine, which fills each placeholder for the reader's language." accent={ACCENT} active={at(4)}>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--faint)]">what Ana receives</p>
                <p className="mt-1 rounded-md bg-[var(--inset)] p-2 text-xs leading-relaxed">{choice === "kept" ? render(ORIGINAL, "en") : r.rendered}</p>
                {r.leftover.length > 0 && choice !== "kept" && (
                  <p className="mt-1 text-xs text-[var(--bad)]">
                    {r.leftover.join(" and ")} {r.leftover.length === 1 ? "is not a field" : "are not fields"} the engine knows, so {r.leftover.length === 1 ? "it goes" : "they go"} out as written.
                  </p>
                )}
                <p className="mt-2 text-[11px] text-[var(--faint)]">The rewrites are illustrative. Masking, restoring, the checks, the diff and the template rendering really run.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}

function DiffCard({ op, protect, choice, setChoice }: { op: Op; protect: boolean; choice: string; setChoice: (c: "accepted" | "kept") => void }) {
  const r = rewrite(op, protect);
  const parts = diff(ORIGINAL, r.result);
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="What the rewrite changed, with accept and keep buttons">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">changes</p>
        <p className="font-mono text-xs" style={{ color: r.lost.length ? "var(--bad)" : "var(--good)" }}>
          {r.lost.length ? `lost: ${r.lost.join(", ")}` : "all protected parts kept"}
        </p>
      </div>
      {op === "german" ? (
        // a translation changes every word, so a word diff says nothing: show both side by side
        <div className="mt-3 grid gap-2 text-sm leading-relaxed sm:grid-cols-2">
          <p className="rounded-md bg-[var(--inset)] p-2 break-words text-[var(--muted)]">{ORIGINAL}</p>
          <p className="rounded-md bg-[var(--inset)] p-2 break-words">{r.result}</p>
        </div>
      ) : (
        <p className="mt-3 text-sm leading-relaxed break-words">
          {parts.map((p, i) =>
            p.kind === "same" ? (
              <span key={i}>{p.text}</span>
            ) : p.kind === "del" ? (
              <del key={i} className="mr-1 rounded-sm text-[var(--muted)]" style={{ background: "color-mix(in srgb, var(--bad) 22%, transparent)" }}>
                {p.text}
              </del>
            ) : (
              <ins key={i} className="rounded-sm no-underline" style={{ background: "color-mix(in srgb, var(--good) 22%, transparent)" }}>
                {p.text}
              </ins>
            ),
          )}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => setChoice("accepted")} aria-pressed={choice === "accepted"} className="min-h-11 rounded-md px-4 text-sm font-semibold text-[var(--on-accent)]" style={{ background: ACCENT }}>
          Accept
        </button>
        <button type="button" onClick={() => setChoice("kept")} aria-pressed={choice === "kept"} className="min-h-11 rounded-md border border-[var(--line)] px-4 text-sm">
          Keep original
        </button>
      </div>
    </section>
  );
}
