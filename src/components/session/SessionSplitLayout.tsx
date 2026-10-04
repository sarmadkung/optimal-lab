import type { ReactNode } from "react";

type Props = {
  visual: ReactNode;
  panel: ReactNode;
  /** Step flow or extra explanation below the split row */
  detail?: ReactNode;
};

/** Map or stage on the left; live caption and controls on the right from lg up. Stacks on a phone. */
export function SessionSplitLayout({ visual, panel, detail }: Props) {
  return (
    <>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(17rem,0.85fr)]">
        <div className="min-w-0 lg:sticky lg:top-20">{visual}</div>
        <div className="min-w-0">{panel}</div>
      </div>
      {detail ? <div className="mt-8 min-w-0">{detail}</div> : null}
    </>
  );
}
