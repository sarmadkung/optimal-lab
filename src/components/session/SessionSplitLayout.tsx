"use client";

import type { ReactNode } from "react";
import { FlowSequence } from "@/components/flow/Flow";
import { useSessionLayout } from "@/components/session/SessionLayoutContext";

type Props = {
  /** The picture: a SystemMap (chrome="split"), a state visual, a chart. */
  visual: ReactNode;
  /** One live caption plus the controls that apply to the whole run. */
  panel: ReactNode;
  /** The FlowStep / FlowArrow chain. Laid out by FlowSequence for this session's layout. */
  detail?: ReactNode;
};

/**
 * The page shape for a live session, picked by the layout rule in src/lib/sessionLayout.ts.
 * See "Choosing a session layout" in README.md.
 *
 *  stage   picture on the left (pinned); caption, controls and the folded steps beside it.
 *  rail    picture and panel side by side on top; the steps run left to right under them.
 *  scroll  picture and panel pinned on the left; the steps read top to bottom on the right.
 *
 * Under 1024px everything stacks in one column, in reading order.
 */
export function SessionLayout({ visual, panel, detail }: Props) {
  const { mode } = useSessionLayout();
  const steps = detail ? <FlowSequence>{detail}</FlowSequence> : null;

  if (mode === "rail") {
    return (
      <>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,1fr)]">
          <div className="min-w-0">{visual}</div>
          <div className="min-w-0">{panel}</div>
        </div>
        {steps ? <div className="mt-6 min-w-0">{steps}</div> : null}
      </>
    );
  }

  if (mode === "scroll" && steps) {
    return (
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="min-w-0 space-y-4 lg:sticky lg:top-20">
          {visual}
          {panel}
        </div>
        <div className="min-w-0">{steps}</div>
      </div>
    );
  }

  // stage (and scroll with nothing to scroll)
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.9fr)]">
      <div className="min-w-0 lg:sticky lg:top-20">{visual}</div>
      <div className="min-w-0 space-y-4">
        {panel}
        {steps}
      </div>
    </div>
  );
}

/** Older name, kept so existing demos keep working. */
export const SessionSplitLayout = SessionLayout;
