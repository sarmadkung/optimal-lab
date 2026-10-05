// How a session is laid out on screen, decided from what the session contains.
// See "Choosing a session layout" in README.md.
//
// Every live session declares its `shape` in src/lib/tracks.ts. `chooseLayout`
// turns that shape into one of three layouts. Authors describe the content; the
// rule picks the screen. A new session follows the same rule without any extra work.
//
//   stage   One view. The picture and its controls never leave the screen.
//           Steps (or chapters) open one at a time beside the picture.
//   rail    Left to right. The picture sits on top; the steps run sideways
//           underneath, one card each, like the pipeline they describe.
//   scroll  Top to bottom. Long or heavy steps read down the page while the
//           picture and the run controls stay pinned beside them.
//
// No React here, so the rule is easy to check by hand.

export type LayoutMode = "stage" | "rail" | "scroll";

export type SessionKind =
  /** Requests or data move between parts of a system (system map + steps). */
  | "system"
  /** A process with no meaningful "where" (step flow only). */
  | "process"
  /** One data structure changes in place (array cells, pointers, a range). */
  | "algorithm"
  /** Several approaches to the same problem, side by side. */
  | "comparison"
  /** A running system the reader predicts and breaks (guided lesson). */
  | "simulation";

export type FlowShape =
  /** One input travels from the first step to the last, once (CI, RAG, MCP). */
  | "pipeline"
  /** The same steps repeat: a tick, a turn of the loop, the next token. */
  | "cycle"
  /** The steps describe one structure changing in place. */
  | "state";

export type SessionShape = {
  kind: SessionKind;
  /** Flow steps, lesson chapters, or approaches for a comparison. */
  steps: number;
  flow?: FlowShape;
  /**
   * True when steps carry their own charts, tables, long text or sliders.
   * Rich steps need width and height, so they are bad at sitting in a narrow
   * sideways card or folding away behind a header.
   */
  richSteps?: boolean;
  /** Escape hatch. Needs a `reason` so the exception is written down. */
  layout?: LayoutMode;
  reason?: string;
};

export type LayoutDecision = {
  mode: LayoutMode;
  /** The rule that fired, in plain words. Shown in the dev layout switcher. */
  why: string;
};

/** Most steps that can share one view as a list of headers with one open. */
export const STAGE_MAX_STEPS = 6;
/** Most rich steps before they need the full height of the page. */
export const RICH_MAX_STEPS = 4;
/** Most approaches that fit side by side before they need to scroll sideways. */
export const COMPARE_MAX_OPTIONS = 3;

// The rules run in order; the first one that matches decides.
export function chooseLayout(shape: SessionShape): LayoutDecision {
  if (shape.layout) {
    if (!shape.reason) throw new Error("A session that sets `layout` must also give a `reason`.");
    return { mode: shape.layout, why: `Set by hand: ${shape.reason}` };
  }

  if (shape.kind === "simulation") {
    return { mode: "stage", why: "A guided lesson keeps one live picture on screen and changes one chapter at a time." };
  }

  if (shape.kind === "comparison") {
    return shape.steps <= COMPARE_MAX_OPTIONS
      ? { mode: "stage", why: `${shape.steps} approaches fit side by side, so the reader compares them in one view.` }
      : { mode: "rail", why: `${shape.steps} approaches are too many for one row, so they scroll sideways.` };
  }

  if (shape.steps > STAGE_MAX_STEPS) {
    return { mode: "scroll", why: `${shape.steps} steps are too many to fold into one view, so they read top to bottom.` };
  }

  if (shape.richSteps && shape.steps > RICH_MAX_STEPS) {
    return { mode: "scroll", why: `${shape.steps} steps each hold their own data, so they need the page's height.` };
  }

  if (shape.flow === "pipeline") {
    return { mode: "rail", why: "One input travels start to finish once, so the steps read left to right like the pipeline." };
  }

  return {
    mode: "stage",
    why:
      shape.flow === "cycle"
        ? "The same few steps repeat, so they stay beside the picture and the active one opens."
        : "One picture changes in place, so it stays on screen and each step opens beside it.",
  };
}

export const LAYOUT_LABEL: Record<LayoutMode, string> = {
  stage: "One view",
  rail: "Left to right",
  scroll: "Top to bottom",
};
