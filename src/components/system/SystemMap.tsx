"use client";

// A live picture of the system a step flow is describing: the parts (client, load
// balancer, cache, model, tool server…) as boxes, the links between them, and the
// requests or data moving along those links. It is driven by the same stage or frame
// as the step flow, so the map and the steps always show the same moment.
// See "Showing the system: the system map" in README.md.

import { motion, useReducedMotion } from "motion/react";
import { useSyncExternalStore, type ReactNode } from "react";

export type NodeState = "idle" | "active" | "wait" | "good" | "bad" | "dim";

export type MapNode = {
  id: string;
  label: string;
  sub?: string; // live state, e.g. "3 in flight" or "a · b"
  at: [number, number]; // centre in % of the map, desktop and tablet
  mobileAt?: [number, number]; // centre on a phone, if the layout changes
  state?: NodeState;
};

export type MapLink = {
  from: string;
  to: string;
  label?: string; // shown while something moves on this link
  active?: boolean;
  dim?: boolean; // a branch that is not taken
  dashed?: boolean; // a long-lived connection, not a single request
};

export type Tone = "accent" | "good" | "bad";

export type Packet = {
  id: string; // change it to replay the move
  from: string;
  to: string;
  label?: string;
  delay?: number; // seconds
  duration?: number; // seconds
  tone?: Tone;
};

type Props = {
  title: string; // what the map shows, read by screen readers
  nodes: MapNode[];
  links: MapLink[];
  packets?: Packet[];
  caption?: ReactNode; // one sentence: what is happening right now
  accent: string;
  aspect?: number; // width / height on desktop and tablet
  mobileAspect?: number; // width / height on a phone
  children?: ReactNode; // playback controls
  /** split: map only; put caption and controls in SystemMapPanel beside the map */
  chrome?: "inline" | "split";
};

const NARROW = "(max-width: 639px)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(NARROW);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function useNarrow() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(NARROW).matches,
    () => false,
  );
}

const TONE: Record<Tone, string> = { accent: "", good: "var(--good)", bad: "var(--bad)" };

function nodeLook(state: NodeState, accent: string) {
  switch (state) {
    case "active":
      return { borderColor: accent, boxShadow: `0 0 0 3px color-mix(in srgb, ${accent} 20%, transparent)` };
    case "wait":
      return { borderColor: accent, borderStyle: "dashed" as const };
    case "good":
      return { borderColor: "var(--good)", boxShadow: "0 0 0 3px color-mix(in srgb, var(--good) 18%, transparent)" };
    case "bad":
      return { borderColor: "var(--bad)", boxShadow: "0 0 0 3px color-mix(in srgb, var(--bad) 18%, transparent)" };
    case "dim":
      return { borderColor: "var(--line)", opacity: 0.4 };
    default:
      return { borderColor: "var(--line-strong)" };
  }
}

export function SystemMap({
  title,
  nodes,
  links,
  packets = [],
  caption,
  accent,
  aspect = 2.2,
  mobileAspect,
  children,
  chrome = "inline",
}: Props) {
  const narrow = useNarrow();
  const still = useReducedMotion();
  const where = (id: string): [number, number] => {
    const node = nodes.find((n) => n.id === id);
    if (!node) return [50, 50];
    return narrow && node.mobileAt ? node.mobileAt : node.at;
  };
  const moving = (l: MapLink) =>
    packets.some((p) => (p.from === l.from && p.to === l.to) || (p.from === l.to && p.to === l.from));

  return (
    <section
      aria-label={title}
      className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3 sm:p-4"
    >
      <div
        className="relative w-full overflow-hidden rounded-lg bg-[var(--inset)]"
        style={{ aspectRatio: narrow && mobileAspect ? mobileAspect : aspect }}
      >
        <svg
          aria-hidden
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          {links.map((l) => {
            const [x1, y1] = where(l.from);
            const [x2, y2] = where(l.to);
            const on = !l.dim && (l.active || moving(l));
            return (
              <line
                key={`${l.from}-${l.to}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                vectorEffect="non-scaling-stroke"
                strokeWidth={on ? 2.5 : 1.5}
                strokeDasharray={l.dashed ? "5 4" : undefined}
                style={{
                  stroke: on ? accent : "var(--line-strong)",
                  opacity: l.dim ? 0.3 : 1,
                  transition: "stroke 0.2s, opacity 0.2s",
                }}
              />
            );
          })}
        </svg>

        {links.map((l) => {
          if (!l.label || l.dim || !(l.active || moving(l))) return null;
          const [x1, y1] = where(l.from);
          const [x2, y2] = where(l.to);
          return (
            <span
              key={`label-${l.from}-${l.to}`}
              aria-hidden
              className="absolute z-10 max-w-[38%] -translate-x-1/2 -translate-y-1/2 truncate rounded bg-[var(--panel)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted)] sm:text-xs"
              style={{ left: `${(x1 + x2) / 2}%`, top: `${(y1 + y2) / 2}%` }}
            >
              {l.label}
            </span>
          );
        })}

        {nodes.map((n) => {
          const [x, y] = where(n.id);
          return (
            <div
              key={n.id}
              className={`absolute z-20 w-[clamp(5.25rem,20%,8.5rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-[var(--panel)] px-2 py-1.5 text-center transition-[border-color,box-shadow,opacity] duration-200 ${
                n.state === "wait" && !still ? "animate-pulse" : ""
              }`}
              style={{ left: `${x}%`, top: `${y}%`, ...nodeLook(n.state ?? "idle", accent) }}
            >
              <p className="text-xs font-semibold leading-tight break-words sm:text-sm">{n.label}</p>
              {n.sub && (
                <p className="mt-0.5 font-mono text-[10px] leading-tight break-words text-[var(--muted)] sm:text-[11px]">
                  {n.sub}
                </p>
              )}
            </div>
          );
        })}

        {!still &&
          packets.map((p) => {
            const [x1, y1] = where(p.from);
            const [x2, y2] = where(p.to);
            const duration = p.duration ?? 0.45;
            const delay = p.delay ?? 0;
            const bg = p.tone && p.tone !== "accent" ? TONE[p.tone] : accent;
            return (
              <motion.span
                key={p.id}
                aria-hidden
                className={`absolute z-30 -translate-x-1/2 -translate-y-1/2 rounded-full font-mono text-[10px] font-semibold whitespace-nowrap text-[var(--on-accent)] shadow ${
                  p.label ? "px-2 py-0.5" : "h-3 w-3"
                }`}
                style={{ background: bg }}
                initial={{ left: `${x1}%`, top: `${y1}%`, opacity: 0 }}
                animate={{ left: `${x2}%`, top: `${y2}%`, opacity: [0, 1, 1, 0] }}
                transition={{
                  default: { duration, delay, ease: "easeInOut" },
                  opacity: { duration: duration + 0.15, delay, times: [0, 0.1, 0.85, 1] },
                }}
              >
                {p.label}
              </motion.span>
            );
          })}
      </div>

      {chrome === "inline" && caption && (
        <p aria-live="polite" className="mt-3 min-h-10 text-sm text-[var(--text)]">
          {caption}
        </p>
      )}
      {chrome === "inline" && children && <div className="mt-3 flex flex-wrap items-center gap-2">{children}</div>}
    </section>
  );
}

/** Live caption and controls when the map uses chrome="split". One aria-live region. */
export function SystemMapPanel({ caption, children }: { caption?: ReactNode; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
      {caption ? (
        <p aria-live="polite" className="min-h-10 text-sm text-[var(--text)]">
          {caption}
        </p>
      ) : (
        <p className="min-h-10 text-sm text-[var(--muted)]">Press Play or Step to move the request.</p>
      )}
      {children ? <div className="mt-3 flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

// Each move starts after the one before it ends, so a request visibly travels hop by hop.
export function hops(id: string, path: string[], opts: { label?: string; tone?: Tone; start?: number; step?: number } = {}): Packet[] {
  const step = opts.step ?? 0.45;
  const start = opts.start ?? 0;
  return path.slice(1).map((to, i) => ({
    id: `${id}-${i}`,
    from: path[i],
    to,
    label: opts.label,
    tone: opts.tone,
    delay: start + i * step,
    duration: step,
  }));
}
