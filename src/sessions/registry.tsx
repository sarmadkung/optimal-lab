// Maps "<track id>/<session id>" to the interactive component for that session.
// A session in src/lib/tracks.ts with status "live" must have an entry here.

import type { ReactNode } from "react";
import AttentionDemo from "./ai/attention/AttentionDemo";
import ContextWindowDemo from "./ai/context-window/ContextWindowDemo";
import EmbeddingsDemo from "./ai/embeddings/EmbeddingsDemo";
import EvalsDemo from "./ai/evals/EvalsDemo";
import HybridSearchDemo from "./ai/hybrid-search/HybridSearchDemo";
import NextTokenDemo from "./ai/next-token/NextTokenDemo";
import RagDemo from "./ai/rag/RagDemo";
import TokenizationDemo from "./ai/tokenization/TokenizationDemo";
import WorkflowDemo from "./ai-automation/workflow/WorkflowDemo";
import ApprovalDemo from "./ai-automation/human-approval/ApprovalDemo";
import StructuredDemo from "./ai-native/structured-output/StructuredDemo";
import ToolCallDemo from "./ai-native/tool-calling/ToolCallDemo";
import PipelineDemo from "./devops/ci-cd-pipeline/PipelineDemo";
import ContainersDemo from "./devops/containers-vs-vms/ContainersDemo";
import BinarySearchDemo from "./dsa/binary-search/BinarySearchDemo";
import SlidingWindowDemo from "./dsa/sliding-window/SlidingWindowDemo";
import TwoSumDemo from "./dsa/two-sum/TwoSumDemo";
import BackpressureDemo from "./nodejs/streams-backpressure/BackpressureDemo";
import EventLoopDemo from "./nodejs/event-loop/EventLoopDemo";
import CachingDemo from "./system-design/caching/CachingDemo";
import LoadBalanceDemo from "./system-design/load-balancing/LoadBalanceDemo";
import AgentLoopDemo from "./tools/cursor-agent/AgentLoopDemo";
import McpDemo from "./tools/mcp/McpDemo";
import N8nDemo from "./tools/n8n/N8nDemo";

const SESSIONS: Record<string, ReactNode> = {
  "dsa/two-sum": <TwoSumDemo />,
  "dsa/sliding-window": <SlidingWindowDemo />,
  "dsa/binary-search": <BinarySearchDemo />,
  "nodejs/event-loop": <EventLoopDemo />,
  "nodejs/streams-backpressure": <BackpressureDemo />,
  "system-design/load-balancing": <LoadBalanceDemo />,
  "system-design/caching": <CachingDemo />,
  "devops/ci-cd-pipeline": <PipelineDemo />,
  "devops/containers-vs-vms": <ContainersDemo />,
  "ai/tokenization": <TokenizationDemo />,
  "ai/attention": <AttentionDemo />,
  "ai/next-token": <NextTokenDemo />,
  "ai/context-window": <ContextWindowDemo />,
  "ai/embeddings": <EmbeddingsDemo />,
  "ai/hybrid-search": <HybridSearchDemo />,
  "ai/rag": <RagDemo />,
  "ai/evals": <EvalsDemo />,
  "ai-native/structured-output": <StructuredDemo />,
  "ai-native/tool-calling": <ToolCallDemo />,
  "ai-automation/workflow": <WorkflowDemo />,
  "ai-automation/human-approval": <ApprovalDemo />,
  "tools/cursor-agent": <AgentLoopDemo />,
  "tools/mcp": <McpDemo />,
  "tools/n8n": <N8nDemo />,
};

export const sessionDemo = (trackId: string, sessionId: string): ReactNode =>
  SESSIONS[`${trackId}/${sessionId}`];
