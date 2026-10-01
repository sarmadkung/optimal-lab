// Maps "<track id>/<session id>" to the interactive component for that session.
// A session in src/lib/tracks.ts with status "live" must have an entry here.

import type { ReactNode } from "react";
import NextTokenDemo from "./ai/next-token/NextTokenDemo";
import BinarySearchDemo from "./dsa/binary-search/BinarySearchDemo";
import SlidingWindowDemo from "./dsa/sliding-window/SlidingWindowDemo";
import TwoSumDemo from "./dsa/two-sum/TwoSumDemo";
import BackpressureDemo from "./nodejs/streams-backpressure/BackpressureDemo";
import EventLoopDemo from "./nodejs/event-loop/EventLoopDemo";
import CachingDemo from "./system-design/caching/CachingDemo";
import LoadBalanceDemo from "./system-design/load-balancing/LoadBalanceDemo";

const SESSIONS: Record<string, ReactNode> = {
  "dsa/two-sum": <TwoSumDemo />,
  "dsa/sliding-window": <SlidingWindowDemo />,
  "dsa/binary-search": <BinarySearchDemo />,
  "nodejs/event-loop": <EventLoopDemo />,
  "nodejs/streams-backpressure": <BackpressureDemo />,
  "system-design/load-balancing": <LoadBalanceDemo />,
  "system-design/caching": <CachingDemo />,
  "ai/next-token": <NextTokenDemo />,
};

export const sessionDemo = (trackId: string, sessionId: string): ReactNode =>
  SESSIONS[`${trackId}/${sessionId}`];
