"use client";

// Building blocks for "how does X work" visuals: a chain of steps with an arrow
// between each step saying what gets passed on.
// See "Explaining a process: the step flow" and "Choosing a session layout" in README.md.
//
// Write the chain once with FlowStep and FlowArrow, then wrap it in FlowSequence
// (SessionLayout does that for its `detail`). FlowSequence lays the same chain out
// for the session's layout:
//   scroll  top to bottom, every card open
//   rail    left to right, one card per step, swipe or use the arrows
//   stage   folded: every step title stays visible, the active step opens
// Colours are CSS transitions on theme tokens (not Motion), so they follow light/dark mode.

import { motion } from "motion/react";
import {
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { useSessionLayout } from "@/components/session/SessionLayoutContext";
import type { LayoutMode } from "@/lib/sessionLayout";

type StepVariant = "card" | "rail" | "fold";

type StepProps = {
  n: number; // 1-based step number
  title: string;
  what: string; // one plain sentence: what happens in this step
  active?: boolean; // highlighted while an animated run passes through
  accent?: string; // CSS colour, defaults to the AI accent
  children?: ReactNode;
  /** Set by FlowSequence. */
  variant?: StepVariant;
  /** Set by FlowSequence in the folded layout: is this step's body showing? */
  open?: boolean;
  /** Set by FlowSequence in the folded layout. */
  onOpen?: () => void;
};

export function FlowStep({
  n,
  title,
  what,
  active = false,
  accent = "var(--ai)",
  children,
  variant = "card",
  open = true,
  onOpen,
}: StepProps) {
  const fold = variant === "fold";
  const showBody = !fold || open;
  return (
    <section
      aria-current={active ? "step" : undefined}
      className={`relative rounded-xl border bg-[var(--panel)] transition-[border-color,box-shadow] duration-200 ${
        fold ? "p-3 sm:p-4" : "p-4 sm:p-5"
      } ${variant === "rail" ? "h-full" : ""}`}
      style={{
        borderColor: active ? accent : "var(--line)",
        boxShadow: active ? `0 0 0 3px color-mix(in srgb, ${accent} 18%, transparent)` : "none",
      }}
    >
      <header className="flex items-start gap-3">
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full border font-mono text-xs transition-colors duration-200"
          style={{
            borderColor: active ? accent : "var(--line-strong)",
            color: active ? "var(--on-accent)" : "var(--muted)",
            backgroundColor: active ? accent : "transparent",
          }}
        >
          {n}
        </span>
        <div className="min-w-0 flex-1">
          {fold && onOpen ? (
            <h2 className="font-semibold leading-7">
              <button
                type="button"
                aria-expanded={open}
                onClick={onOpen}
                className="-my-2 flex min-h-11 w-full items-center justify-between gap-3 text-left"
              >
                <span className="min-w-0">{title}</span>
                <span aria-hidden className="shrink-0 text-xs text-[var(--faint)]">
                  {open ? "▾" : "▸"}
                </span>
              </button>
            </h2>
          ) : (
            <h2 className="font-semibold leading-7">{title}</h2>
          )}
          {showBody && <p className="text-sm text-[var(--muted)]">{what}</p>}
        </div>
      </header>
      {children && showBody && <div className="mt-4 min-w-0">{children}</div>}
    </section>
  );
}

type ArrowDirection = "down" | "right" | "compact";

// The connector between two steps. `label` names what flows on, e.g. "5 raw scores".
export function FlowArrow({
  label,
  active = false,
  accent = "var(--ai)",
  direction = "down",
}: {
  label?: string;
  active?: boolean;
  accent?: string;
  /** Set by FlowSequence. */
  direction?: ArrowDirection;
}) {
  const stroke = { stroke: active ? accent : "var(--line-strong)", transition: "stroke 0.2s" };

  if (direction === "right") {
    return (
      <div className="flex w-16 shrink-0 flex-col items-center justify-center gap-1 px-1 sm:w-20" aria-hidden>
        <svg width="40" height="14" viewBox="0 0 40 14" className="overflow-visible">
          <line x1="0" y1="7" x2="32" y2="7" strokeWidth="2" strokeLinecap="round" style={stroke} />
          <path d="M28 1 L36 7 L28 13" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={stroke} />
          {active && (
            <motion.circle
              cy="7" r="3.5" style={{ fill: accent }}
              initial={{ cx: 0, opacity: 1 }}
              animate={{ cx: 34, opacity: [1, 1, 0] }}
              transition={{ duration: 0.35, ease: "easeIn" }}
            />
          )}
        </svg>
        {label && <span className="text-center font-mono text-[10px] leading-tight text-[var(--faint)]">{label}</span>}
      </div>
    );
  }

  const height = direction === "compact" ? 18 : 40;
  return (
    <div className="flex items-center gap-3 py-0.5 pl-[13px] sm:pl-[17px]" aria-hidden>
      <svg width="14" height={height} viewBox={`0 0 14 ${height}`} className="shrink-0 overflow-visible">
        <line x1="7" y1="0" x2="7" y2={height - 8} strokeWidth="2" strokeLinecap="round" style={stroke} />
        <path d={`M2 ${height - 11} L7 ${height - 4} L12 ${height - 11}`} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={stroke} />
        {active && (
          <motion.circle
            cx="7" r="3.5" style={{ fill: accent }}
            initial={{ cy: 0, opacity: 1 }}
            animate={{ cy: height - 6, opacity: [1, 1, 0] }}
            transition={{ duration: 0.35, ease: "easeIn" }}
          />
        )}
      </svg>
      {label && <span className="font-mono text-xs text-[var(--faint)]">{label}</span>}
    </div>
  );
}

type Item = { step: ReactElement<StepProps>; arrow?: ReactElement<Parameters<typeof FlowArrow>[0]> };

// Unwraps fragments and arrays so `{list.map(...)}` and `<>…</>` both work.
function flatten(children: ReactNode): ReactNode[] {
  const out: ReactNode[] = [];
  Children.forEach(children, (child) => {
    if (isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment) out.push(...flatten(child.props.children));
    else if (child !== null && child !== undefined && child !== false) out.push(child);
  });
  return out;
}

function collect(children: ReactNode) {
  const items: Item[] = [];
  const extra: ReactNode[] = [];
  for (const node of flatten(children)) {
    if (isValidElement<StepProps>(node) && node.type === FlowStep) items.push({ step: node });
    else if (isValidElement(node) && node.type === FlowArrow && items.length) items[items.length - 1].arrow = node as Item["arrow"];
    else extra.push(node);
  }
  return { items, extra };
}

/**
 * Follow the run: when a step turns active, that step becomes the open (stage)
 * or centred (rail) one. The reader can still pick any step themselves.
 */
function useFollowActive(items: Item[]) {
  const flags = items.map((it) => (it.step.props.active ? "1" : "0")).join("");
  const first = Math.max(0, flags.indexOf("1"));
  const [focus, setFocus] = useState(first);
  const [seen, setSeen] = useState(flags);

  if (seen !== flags) {
    // Adjust during render (React's pattern for state derived from props).
    let newest = -1;
    for (let i = 0; i < flags.length; i++) if (flags[i] === "1" && seen[i] !== "1") newest = i;
    setSeen(flags);
    if (newest >= 0) setFocus(newest);
  }

  const at = Math.min(focus, Math.max(0, items.length - 1));
  return [at, setFocus] as const;
}

export function FlowSequence({ children, mode: forced, accent = "var(--accent)" }: { children: ReactNode; mode?: LayoutMode; accent?: string }) {
  const context = useSessionLayout();
  const mode = forced ?? context.mode;
  const { items, extra } = collect(children);
  const [focus, setFocus] = useFollowActive(items);

  if (mode === "scroll" || items.length === 0) return <div className="min-w-0">{children}</div>;

  if (mode === "stage") {
    return (
      <div className="min-w-0">
        <ol className="space-y-0">
          {items.map(({ step, arrow }, i) => (
            <li key={step.key ?? i}>
              {cloneElement(step, { variant: "fold", open: i === focus, onOpen: () => setFocus(i) })}
              {arrow && i < items.length - 1 && cloneElement(arrow, { direction: "compact" })}
            </li>
          ))}
        </ol>
        {extra}
      </div>
    );
  }

  return <Rail items={items} extra={extra} focus={focus} setFocus={setFocus} accent={accent} />;
}

function Rail({
  items,
  extra,
  focus,
  setFocus,
  accent,
}: {
  items: Item[];
  extra: ReactNode[];
  focus: number;
  setFocus: (i: number) => void;
  accent: string;
}) {
  const railRef = useRef<HTMLOListElement>(null);
  const cardRefs = useRef<(HTMLLIElement | null)[]>([]);

  // Keep the focused card in view. Only the rail scrolls sideways, never the page.
  useEffect(() => {
    const rail = railRef.current;
    const card = cardRefs.current[focus];
    if (!rail || !card) return;
    const left = card.offsetLeft - rail.offsetLeft;
    const visible = left >= rail.scrollLeft && left + card.offsetWidth <= rail.scrollLeft + rail.clientWidth;
    if (visible) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rail.scrollTo({ left: Math.max(0, left - 4), behavior: reduce ? "auto" : "smooth" });
  }, [focus]);

  // When the reader swipes, the step counter follows the card nearest the left edge.
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  function onScroll() {
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const rail = railRef.current;
      if (!rail) return;
      let best = 0;
      let gap = Infinity;
      cardRefs.current.forEach((card, i) => {
        if (!card) return;
        const d = Math.abs(card.offsetLeft - rail.offsetLeft - rail.scrollLeft);
        if (d < gap) {
          gap = d;
          best = i;
        }
      });
      // At the far end the last cards cannot reach the left edge; count the last one.
      if (gap > 8 && rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4) best = cardRefs.current.length - 1;
      setFocus(best);
    }, 120);
  }
  useEffect(() => () => {
    if (settle.current) clearTimeout(settle.current);
  }, []);

  const last = items.length - 1;
  const move = (to: number) => setFocus(Math.max(0, Math.min(last, to)));

  return (
    <div className="min-w-0">
      <div className="mb-3 flex items-center gap-2">
        <p className="min-w-0 flex-1 font-mono text-xs text-[var(--muted)]">
          Step {focus + 1} of {items.length}
          <span className="hidden text-[var(--faint)] sm:inline"> · read left to right</span>
        </p>
        <button
          type="button"
          onClick={() => move(focus - 1)}
          disabled={focus === 0}
          aria-label="Previous step"
          className="grid h-11 w-11 place-items-center rounded-md border border-[var(--line-strong)] disabled:opacity-40"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => move(focus + 1)}
          disabled={focus === last}
          aria-label="Next step"
          className="grid h-11 w-11 place-items-center rounded-md border border-[var(--line-strong)] disabled:opacity-40"
        >
          →
        </button>
      </div>

      <ol
        ref={railRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain pb-3 [scrollbar-width:thin]"
        aria-label="Steps, left to right"
      >
        {items.map(({ step, arrow }, i) => (
          <li
            key={step.key ?? i}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            className="flex shrink-0 snap-start items-stretch"
          >
            <div className="w-[min(78vw,19rem)] min-w-0 py-1 sm:w-[20rem]" onFocusCapture={() => setFocus(i)}>
              {cloneElement(step, { variant: "rail" })}
            </div>
            {i < last &&
              (arrow ? cloneElement(arrow, { direction: "right" }) : <FlowArrow direction="right" accent={step.props.accent} />)}
          </li>
        ))}
      </ol>

      <div className="mt-1 flex justify-center gap-1.5" aria-hidden>
        {items.map(({ step }, i) => (
          <button
            key={step.key ?? i}
            type="button"
            tabIndex={-1}
            onClick={() => setFocus(i)}
            className="h-2 rounded-full transition-[width,background-color] duration-200"
            style={{ width: i === focus ? 20 : 8, background: i === focus ? accent : "var(--line-strong)" }}
          />
        ))}
      </div>
      {extra}
    </div>
  );
}
