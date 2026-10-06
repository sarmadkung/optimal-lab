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

import AgentPatternsDemo from "./ai/agent-patterns/AgentPatternsDemo";
import SchedulesDemo from "./ai-automation/schedules/SchedulesDemo";
import RollingDeployDemo from "./devops/rolling-deploys/RollingDeployDemo";
import BfsDfsDemo from "./dsa/bfs-vs-dfs/BfsDfsDemo";
import HashMapDemo from "./dsa/hash-map/HashMapDemo";
import MonotonicStackDemo from "./dsa/monotonic-stack/MonotonicStackDemo";
import TwoPointersDemo from "./dsa/two-pointers/TwoPointersDemo";
import ThreadPoolDemo from "./nodejs/thread-pool/ThreadPoolDemo";
import ConsistentHashDemo from "./system-design/consistent-hashing/ConsistentHashDemo";
import GithubActionsDemo from "./tools/github-actions/GithubActionsDemo";

import CdnDemo from "./system-design/cdn/CdnDemo";
import CircuitBreakerDemo from "./system-design/circuit-breaker/CircuitBreakerDemo";
import MessageQueueDemo from "./system-design/message-queues/MessageQueueDemo";
import RateLimitDemo from "./system-design/rate-limiting/RateLimitDemo";
import ReplicationDemo from "./system-design/replication/ReplicationDemo";
import ShardingDemo from "./system-design/sharding/ShardingDemo";

const SESSIONS: Record<string, ReactNode> = {
  "dsa/two-sum": <TwoSumDemo />,
  "dsa/hash-map": <HashMapDemo />,
  "dsa/two-pointers": <TwoPointersDemo />,
  "dsa/sliding-window": <SlidingWindowDemo />,
  "dsa/monotonic-stack": <MonotonicStackDemo />,
  "dsa/binary-search": <BinarySearchDemo />,
  "dsa/bfs-vs-dfs": <BfsDfsDemo />,
  "nodejs/event-loop": <EventLoopDemo />,
  "nodejs/streams-backpressure": <BackpressureDemo />,
  "nodejs/thread-pool": <ThreadPoolDemo />,
  "system-design/load-balancing": <LoadBalanceDemo />,
  "system-design/caching": <CachingDemo />,
  "system-design/cdn": <CdnDemo />,
  "system-design/rate-limiting": <RateLimitDemo />,
  "system-design/consistent-hashing": <ConsistentHashDemo />,
  "system-design/replication": <ReplicationDemo />,
  "system-design/sharding": <ShardingDemo />,
  "system-design/message-queues": <MessageQueueDemo />,
  "system-design/circuit-breaker": <CircuitBreakerDemo />,
  "devops/ci-cd-pipeline": <PipelineDemo />,
  "devops/containers-vs-vms": <ContainersDemo />,
  "devops/rolling-deploys": <RollingDeployDemo />,
  "ai/tokenization": <TokenizationDemo />,
  "ai/attention": <AttentionDemo />,
  "ai/next-token": <NextTokenDemo />,
  "ai/context-window": <ContextWindowDemo />,
  "ai/embeddings": <EmbeddingsDemo />,
  "ai/hybrid-search": <HybridSearchDemo />,
  "ai/rag": <RagDemo />,
  "ai/evals": <EvalsDemo />,
  "ai/agent-patterns": <AgentPatternsDemo />,
  "ai-native/structured-output": <StructuredDemo />,
  "ai-native/tool-calling": <ToolCallDemo />,
  "ai-automation/workflow": <WorkflowDemo />,
  "ai-automation/human-approval": <ApprovalDemo />,
  "ai-automation/schedules": <SchedulesDemo />,
  "tools/cursor-agent": <AgentLoopDemo />,
  "tools/mcp": <McpDemo />,
  "tools/n8n": <N8nDemo />,
  "tools/github-actions": <GithubActionsDemo />,
};

export const sessionDemo = (trackId: string, sessionId: string): ReactNode =>
  SESSIONS[`${trackId}/${sessionId}`];
