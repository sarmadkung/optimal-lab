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
import MessageRolesDemo from "./ai/message-roles/MessageRolesDemo";
import FewShotDemo from "./ai/few-shot/FewShotDemo";
import ChainOfThoughtDemo from "./ai/chain-of-thought/ChainOfThoughtDemo";
import PromptPatternsDemo from "./ai/prompt-patterns/PromptPatternsDemo";
import GraphRagDemo from "./ai/graph-rag/GraphRagDemo";
import ChunkingDemo from "./ai/chunking/ChunkingDemo";
import FetchWaterfallDemo from "./frontend/data-fetching/FetchWaterfallDemo";
import OptimisticDemo from "./frontend/optimistic-updates/OptimisticDemo";
import RenderingModesDemo from "./frontend/csr-ssr-ssg/RenderingModesDemo";
import PageWeightDemo from "./frontend/images-fonts/PageWeightDemo";
import HttpCacheDemo from "./frontend/browser-caching/HttpCacheDemo";
import InpDemo from "./frontend/long-tasks/InpDemo";
import StorageDemo from "./frontend/browser-storage/StorageDemo";
import CorsDemo from "./frontend/cors/CorsDemo";
import CspDemo from "./frontend/csp/CspDemo";
import FocusDemo from "./frontend/keyboard-focus/FocusDemo";
import UrlToPixelsDemo from "./frontend/url-to-pixels/UrlToPixelsDemo";
import WorkerDemo from "./frontend/web-workers/WorkerDemo";
import ThisBindingDemo from "./frontend/this-binding/ThisBindingDemo";
import PrototypesDemo from "./frontend/prototypes/PrototypesDemo";
import BoxModelDemo from "./frontend/box-model/BoxModelDemo";
import ResponsiveDemo from "./frontend/responsive-design/ResponsiveDemo";
import AnimationsDemo from "./frontend/css-animations/AnimationsDemo";
import KeysDemo from "./frontend/reconciliation/KeysDemo";
import StaleClosureDemo from "./frontend/hooks/StaleClosureDemo";
import MemoDemo from "./frontend/memoization/MemoDemo";
import BranchingDemo from "./devops/branching-strategies/BranchingDemo";
import SemverDemo from "./devops/releases-versioning/SemverDemo";
import AffectedDemo from "./devops/build-caching/AffectedDemo";
import SupplyChainDemo from "./devops/supply-chain/SupplyChainDemo";
import ZonesDemo from "./devops/regions-zones/ZonesDemo";
import ServerlessDemo from "./devops/serverless/ServerlessDemo";
import CloudCostsDemo from "./devops/cloud-costs/CloudCostsDemo";
import StructuredLogsDemo from "./devops/structured-logging/StructuredLogsDemo";
import TraceDemo from "./devops/opentelemetry/TraceDemo";
import DoraDemo from "./devops/dora-metrics/DoraDemo";
import ProcessTreeDemo from "./devops/linux-processes/ProcessTreeDemo";
import LoadAverageDemo from "./devops/system-resources/LoadAverageDemo";
import DnsRecordsDemo from "./devops/dns-records/DnsRecordsDemo";
import ReverseProxyDemo from "./devops/reverse-proxy-config/ReverseProxyDemo";
import VpcDemo from "./devops/vpc/VpcDemo";
import LayerCacheDemo from "./devops/dockerfiles/LayerCacheDemo";
import ContainerNetDemo from "./devops/container-networking/ContainerNetDemo";
import VolumesDemo from "./devops/volumes/VolumesDemo";
import HpaDemo from "./devops/pod-autoscaling/HpaDemo";
import SchedulerDemo from "./devops/scheduling/SchedulerDemo";
import BulkheadsDemo from "./system-design/bulkheads/BulkheadsDemo";
import FailoverDemo from "./system-design/failover-dr/FailoverDemo";
import QuorumDemo from "./system-design/eventual-consistency/QuorumDemo";
import EventSourcingDemo from "./system-design/cqrs-event-sourcing/EventSourcingDemo";
import GossipDemo from "./system-design/gossip/GossipDemo";
import NinesDemo from "./system-design/availability/NinesDemo";
import FeatureFlagsDemo from "./system-design/feature-flags/FeatureFlagsDemo";
import RealtimeDemo from "./system-design/realtime/RealtimeDemo";
import BackgroundJobsDemo from "./system-design/background-jobs/BackgroundJobsDemo";
import MultiTenancyDemo from "./system-design/multi-tenancy/MultiTenancyDemo";
import ScaleOutDemo from "./system-design/scaling/ScaleOutDemo";
import LittlesLawDemo from "./system-design/latency-throughput/LittlesLawDemo";
import CountMinDemo from "./system-design/top-k/CountMinDemo";
import HllDemo from "./system-design/probabilistic-counting/HllDemo";
import CdcDemo from "./system-design/change-data-capture/CdcDemo";
import SchemaMigrationDemo from "./system-design/schema-migrations/SchemaMigrationDemo";
import ApiGatewayDemo from "./system-design/api-gateway/ApiGatewayDemo";
import WebhooksDemo from "./system-design/webhooks/WebhooksDemo";
import DegradationDemo from "./system-design/graceful-degradation/DegradationDemo";
import RequestJourneyDemo from "./system-design/request-journey/RequestJourneyDemo";
import PermissionsDemo from "./devops/files-permissions/PermissionsDemo";
import ServicesDemo from "./devops/services-ingress/ServicesDemo";
import PromDemo from "./devops/prometheus-metrics/PromDemo";
import GitopsDemo from "./devops/gitops/GitopsDemo";
import TfStateDemo from "./devops/terraform-state/TfStateDemo";
import BackupsDemo from "./devops/backups-restore/BackupsDemo";
import CertChainDemo from "./security/certificates/CertChainDemo";
import OAuthDemo from "./security/oauth-flow/OAuthDemo";
import EstimationDemo from "./system-design/estimation/EstimationDemo";
import PartitioningDemo from "./databases/table-partitioning/PartitioningDemo";
import OverfittingDemo from "./ai/overfitting/OverfittingDemo";
import TinyNetDemo from "./ai/neural-networks/TinyNetDemo";
import ScalingDemo from "./ai/scaling-laws/ScalingDemo";
import ContextVsRagDemo from "./ai/long-context-vs-rag/ContextVsRagDemo";
import EvalMetricsDemo from "./ai/eval-metrics/EvalMetricsDemo";
import FeatureCostDemo from "./ai-native/feature-cost/FeatureCostDemo";
import AbTestDemo from "./ai-native/ab-testing-ai/AbTestDemo";
import LatencyUxDemo from "./ai-native/latency-ux/LatencyUxDemo";
import ClassifyRouteDemo from "./ai-automation/classify-route/ClassifyRouteDemo";
import McpServerDemo from "./tools/build-mcp-server/McpServerDemo";
import MemoryHierarchyDemo from "./operating-systems/memory-hierarchy/MemoryHierarchyDemo";
import CacheLocalityDemo from "./operating-systems/cache-locality/CacheLocalityDemo";
import ProducerConsumerDemo from "./operating-systems/producer-consumer/ProducerConsumerDemo";
import EpollDemo from "./operating-systems/epoll/EpollDemo";
import GcDemo from "./operating-systems/gc/GcDemo";
import EventPropagationDemo from "./frontend/event-propagation/EventPropagationDemo";
import ClosuresDemo from "./frontend/closures/ClosuresDemo";
import CascadeDemo from "./frontend/css-cascade/CascadeDemo";
import StackingDemo from "./frontend/stacking-contexts/StackingDemo";
import CodeSplittingDemo from "./frontend/code-splitting/CodeSplittingDemo";
import WindowFunctionsDemo from "./databases/window-functions/WindowFunctionsDemo";
import LsmDemo from "./databases/lsm-trees/LsmDemo";
import WalDemo from "./databases/write-ahead-log/WalDemo";
import ReplicasDemo from "./databases/read-replicas/ReplicasDemo";
import CompositeIndexDemo from "./databases/composite-indexes/CompositeIndexDemo";
import RoutingDemo from "./networking/routing/RoutingDemo";
import Http2Demo from "./networking/http2/Http2Demo";
import TracerouteDemo from "./networking/traceroute/TracerouteDemo";
import FlowControlDemo from "./networking/flow-control/FlowControlDemo";
import LatencyBandwidthDemo from "./networking/latency-bandwidth/LatencyBandwidthDemo";
import CacheInvalidationDemo from "./system-design/cache-invalidation/CacheInvalidationDemo";
import QueueBackpressureDemo from "./system-design/backpressure/QueueBackpressureDemo";
import RaftDemo from "./system-design/consensus/RaftDemo";
import MerkleDemo from "./system-design/merkle-trees/MerkleDemo";
import ClocksDemo from "./system-design/clocks/ClocksDemo";
import DeployDemo from "./system-design/deployment-strategies/DeployDemo";
import HedgedDemo from "./system-design/hedged-requests/HedgedDemo";
import KeyExchangeDemo from "./security/key-exchange/KeyExchangeDemo";
import IdorDemo from "./security/idor/IdorDemo";
import SsrfDemo from "./security/ssrf/SsrfDemo";
import AutoscalingDemo from "./system-design/autoscaling/AutoscalingDemo";
import DeliveryDemo from "./system-design/delivery-guarantees/DeliveryDemo";
import SagaDemo from "./system-design/sagas-outbox/SagaDemo";
import PoolDemo from "./databases/connection-pooling/PoolDemo";
import JoinDemo from "./databases/join-algorithms/JoinDemo";
import NatDemo from "./networking/nat/NatDemo";
import VirtualMemoryDemo from "./operating-systems/virtual-memory/VirtualMemoryDemo";
import CssGridDemo from "./frontend/css-grid/CssGridDemo";
import AsyncAwaitDemo from "./frontend/promises-async/AsyncAwaitDemo";
import SignatureDemo from "./security/digital-signatures/SignatureDemo";
import HeapDemo from "./dsa/heap-top-k/HeapDemo";
import FastSlowDemo from "./dsa/fast-slow-pointers/FastSlowDemo";
import TrieDemo from "./dsa/trie/TrieDemo";
import UnionFindDemo from "./dsa/union-find/UnionFindDemo";
import PrefixSumDemo from "./dsa/prefix-sum/PrefixSumDemo";
import MergeIntervalsDemo from "./dsa/merge-intervals/MergeIntervalsDemo";
import BacktrackingDemo from "./dsa/backtracking/BacktrackingDemo";
import DijkstraDemo from "./dsa/dijkstra/DijkstraDemo";
import TopoSortDemo from "./dsa/topological-sort/TopoSortDemo";
import LruDemo from "./dsa/lru-cache/LruDemo";
import SubnetDemo from "./devops/ip-subnets/SubnetDemo";
import GitObjectsDemo from "./devops/git-internals/GitObjectsDemo";
import TerraformDemo from "./devops/terraform-plan-apply/TerraformDemo";
import SloDemo from "./devops/slos-error-budgets/SloDemo";
import ReactLoopDemo from "./ai/react-loop/ReactLoopDemo";
import StreamingUiDemo from "./ai-native/streaming-ui/StreamingUiDemo";
import RetriesDemo from "./ai-automation/retries-errors/RetriesDemo";
import ConfidenceDemo from "./ai-automation/confidence-fallbacks/ConfidenceDemo";
import RouterDemo from "./tools/model-routers/RouterDemo";
import StreamHopsDemo from "./system-design/streaming-responses/StreamHopsDemo";
import JwtDemo from "./security/jwt/JwtDemo";
import CsrfDemo from "./security/csrf/CsrfDemo";
import SqliDemo from "./security/sql-injection/SqliDemo";
import PipelineStagesDemo from "./frontend/rendering-pipeline/PipelineStagesDemo";
import BrowserLoopDemo from "./frontend/browser-event-loop/BrowserLoopDemo";
import HydrationDemo from "./frontend/hydration/HydrationDemo";
import LcpDemo from "./frontend/core-web-vitals/LcpDemo";
import FlexboxDemo from "./frontend/flexbox/FlexboxDemo";
import ProbesDemo from "./devops/probes/ProbesDemo";
import LimitsDemo from "./devops/resource-limits/LimitsDemo";
import BloomDemo from "./system-design/bloom-filters/BloomDemo";
import SnowflakeDemo from "./system-design/unique-ids/SnowflakeDemo";
import LockDemo from "./system-design/distributed-locks/LockDemo";
import MvccDemo from "./databases/mvcc/MvccDemo";
import LostUpdateDemo from "./databases/isolation-anomalies/LostUpdateDemo";
import DnsDemo from "./networking/dns-resolution/DnsDemo";
import CongestionDemo from "./networking/congestion-control/CongestionDemo";
import DeadlockDemo from "./operating-systems/deadlocks/DeadlockDemo";
import SchedulingDemo from "./operating-systems/cpu-scheduling/SchedulingDemo";
import PasswordDemo from "./security/password-hashing/PasswordDemo";
import LayersDemo from "./devops/images-layers/LayersDemo";
import BlockingDemo from "./nodejs/blocking-the-event-loop/BlockingDemo";
import CapDemo from "./system-design/cap-theorem/CapDemo";
import IdempotencyDemo from "./system-design/idempotency/IdempotencyDemo";
import BtreeDemo from "./databases/btree-index/BtreeDemo";
import ReRendersDemo from "./frontend/re-renders/ReRendersDemo";
import HandshakeDemo from "./networking/tcp-handshake/HandshakeDemo";
import RaceDemo from "./operating-systems/race-conditions/RaceDemo";
import XssDemo from "./security/xss/XssDemo";
import LlmJudgeDemo from "./ai/llm-as-judge/LlmJudgeDemo";
import LoraDemo from "./ai/lora/LoraDemo";
import QueryRewriteDemo from "./ai/query-rewriting/QueryRewriteDemo";
import KvCacheDemo from "./ai/kv-cache/KvCacheDemo";
import TrainingDemo from "./ai/training-loss/TrainingDemo";
import SchedulesDemo from "./ai-automation/schedules/SchedulesDemo";
import RollingDeployDemo from "./devops/rolling-deploys/RollingDeployDemo";
import BfsDfsDemo from "./dsa/bfs-vs-dfs/BfsDfsDemo";
import DynamicProgrammingDemo from "./dsa/dynamic-programming/DynamicProgrammingDemo";
import TreeRecursionDemo from "./dsa/tree-recursion/TreeRecursionDemo";
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
  "ai/training-loss": <TrainingDemo />,
  "ai/kv-cache": <KvCacheDemo />,
  "ai/chunking": <ChunkingDemo />,
  "frontend/data-fetching": <FetchWaterfallDemo />,
  "frontend/optimistic-updates": <OptimisticDemo />,
  "frontend/csr-ssr-ssg": <RenderingModesDemo />,
  "frontend/images-fonts": <PageWeightDemo />,
  "frontend/browser-caching": <HttpCacheDemo />,
  "frontend/long-tasks": <InpDemo />,
  "frontend/browser-storage": <StorageDemo />,
  "frontend/cors": <CorsDemo />,
  "frontend/csp": <CspDemo />,
  "frontend/keyboard-focus": <FocusDemo />,
  "frontend/url-to-pixels": <UrlToPixelsDemo />,
  "frontend/web-workers": <WorkerDemo />,
  "frontend/this-binding": <ThisBindingDemo />,
  "frontend/prototypes": <PrototypesDemo />,
  "frontend/box-model": <BoxModelDemo />,
  "frontend/responsive-design": <ResponsiveDemo />,
  "frontend/css-animations": <AnimationsDemo />,
  "frontend/reconciliation": <KeysDemo />,
  "frontend/hooks": <StaleClosureDemo />,
  "frontend/memoization": <MemoDemo />,
  "devops/branching-strategies": <BranchingDemo />,
  "devops/releases-versioning": <SemverDemo />,
  "devops/build-caching": <AffectedDemo />,
  "devops/supply-chain": <SupplyChainDemo />,
  "devops/regions-zones": <ZonesDemo />,
  "devops/serverless": <ServerlessDemo />,
  "devops/cloud-costs": <CloudCostsDemo />,
  "devops/structured-logging": <StructuredLogsDemo />,
  "devops/opentelemetry": <TraceDemo />,
  "devops/dora-metrics": <DoraDemo />,
  "devops/linux-processes": <ProcessTreeDemo />,
  "devops/system-resources": <LoadAverageDemo />,
  "devops/dns-records": <DnsRecordsDemo />,
  "devops/reverse-proxy-config": <ReverseProxyDemo />,
  "devops/vpc": <VpcDemo />,
  "devops/dockerfiles": <LayerCacheDemo />,
  "devops/container-networking": <ContainerNetDemo />,
  "devops/volumes": <VolumesDemo />,
  "devops/pod-autoscaling": <HpaDemo />,
  "devops/scheduling": <SchedulerDemo />,
  "system-design/bulkheads": <BulkheadsDemo />,
  "system-design/failover-dr": <FailoverDemo />,
  "system-design/eventual-consistency": <QuorumDemo />,
  "system-design/cqrs-event-sourcing": <EventSourcingDemo />,
  "system-design/gossip": <GossipDemo />,
  "system-design/availability": <NinesDemo />,
  "system-design/feature-flags": <FeatureFlagsDemo />,
  "system-design/realtime": <RealtimeDemo />,
  "system-design/background-jobs": <BackgroundJobsDemo />,
  "system-design/multi-tenancy": <MultiTenancyDemo />,
  "system-design/scaling": <ScaleOutDemo />,
  "system-design/latency-throughput": <LittlesLawDemo />,
  "system-design/top-k": <CountMinDemo />,
  "system-design/probabilistic-counting": <HllDemo />,
  "system-design/change-data-capture": <CdcDemo />,
  "system-design/schema-migrations": <SchemaMigrationDemo />,
  "system-design/api-gateway": <ApiGatewayDemo />,
  "system-design/webhooks": <WebhooksDemo />,
  "system-design/graceful-degradation": <DegradationDemo />,
  "system-design/request-journey": <RequestJourneyDemo />,
  "devops/files-permissions": <PermissionsDemo />,
  "devops/services-ingress": <ServicesDemo />,
  "devops/prometheus-metrics": <PromDemo />,
  "devops/gitops": <GitopsDemo />,
  "devops/terraform-state": <TfStateDemo />,
  "devops/backups-restore": <BackupsDemo />,
  "security/certificates": <CertChainDemo />,
  "security/oauth-flow": <OAuthDemo />,
  "system-design/estimation": <EstimationDemo />,
  "databases/table-partitioning": <PartitioningDemo />,
  "ai/overfitting": <OverfittingDemo />,
  "ai/neural-networks": <TinyNetDemo />,
  "ai/scaling-laws": <ScalingDemo />,
  "ai/long-context-vs-rag": <ContextVsRagDemo />,
  "ai/eval-metrics": <EvalMetricsDemo />,
  "ai-native/feature-cost": <FeatureCostDemo />,
  "ai-native/ab-testing-ai": <AbTestDemo />,
  "ai-native/latency-ux": <LatencyUxDemo />,
  "ai-automation/classify-route": <ClassifyRouteDemo />,
  "tools/build-mcp-server": <McpServerDemo />,
  "operating-systems/memory-hierarchy": <MemoryHierarchyDemo />,
  "operating-systems/cache-locality": <CacheLocalityDemo />,
  "operating-systems/producer-consumer": <ProducerConsumerDemo />,
  "operating-systems/epoll": <EpollDemo />,
  "operating-systems/gc": <GcDemo />,
  "frontend/event-propagation": <EventPropagationDemo />,
  "frontend/closures": <ClosuresDemo />,
  "frontend/css-cascade": <CascadeDemo />,
  "frontend/stacking-contexts": <StackingDemo />,
  "frontend/code-splitting": <CodeSplittingDemo />,
  "databases/window-functions": <WindowFunctionsDemo />,
  "databases/lsm-trees": <LsmDemo />,
  "databases/write-ahead-log": <WalDemo />,
  "databases/read-replicas": <ReplicasDemo />,
  "databases/composite-indexes": <CompositeIndexDemo />,
  "networking/routing": <RoutingDemo />,
  "networking/http2": <Http2Demo />,
  "networking/traceroute": <TracerouteDemo />,
  "networking/flow-control": <FlowControlDemo />,
  "networking/latency-bandwidth": <LatencyBandwidthDemo />,
  "system-design/cache-invalidation": <CacheInvalidationDemo />,
  "system-design/backpressure": <QueueBackpressureDemo />,
  "system-design/consensus": <RaftDemo />,
  "system-design/merkle-trees": <MerkleDemo />,
  "system-design/clocks": <ClocksDemo />,
  "system-design/deployment-strategies": <DeployDemo />,
  "system-design/hedged-requests": <HedgedDemo />,
  "security/key-exchange": <KeyExchangeDemo />,
  "security/idor": <IdorDemo />,
  "security/ssrf": <SsrfDemo />,
  "system-design/autoscaling": <AutoscalingDemo />,
  "system-design/delivery-guarantees": <DeliveryDemo />,
  "system-design/sagas-outbox": <SagaDemo />,
  "databases/connection-pooling": <PoolDemo />,
  "databases/join-algorithms": <JoinDemo />,
  "networking/nat": <NatDemo />,
  "operating-systems/virtual-memory": <VirtualMemoryDemo />,
  "frontend/css-grid": <CssGridDemo />,
  "frontend/promises-async": <AsyncAwaitDemo />,
  "security/digital-signatures": <SignatureDemo />,
  "dsa/heap-top-k": <HeapDemo />,
  "dsa/fast-slow-pointers": <FastSlowDemo />,
  "dsa/trie": <TrieDemo />,
  "dsa/union-find": <UnionFindDemo />,
  "dsa/prefix-sum": <PrefixSumDemo />,
  "dsa/merge-intervals": <MergeIntervalsDemo />,
  "dsa/backtracking": <BacktrackingDemo />,
  "dsa/dijkstra": <DijkstraDemo />,
  "dsa/topological-sort": <TopoSortDemo />,
  "dsa/lru-cache": <LruDemo />,
  "devops/ip-subnets": <SubnetDemo />,
  "devops/git-internals": <GitObjectsDemo />,
  "devops/terraform-plan-apply": <TerraformDemo />,
  "devops/slos-error-budgets": <SloDemo />,
  "ai/react-loop": <ReactLoopDemo />,
  "ai-native/streaming-ui": <StreamingUiDemo />,
  "ai-automation/retries-errors": <RetriesDemo />,
  "ai-automation/confidence-fallbacks": <ConfidenceDemo />,
  "tools/model-routers": <RouterDemo />,
  "system-design/streaming-responses": <StreamHopsDemo />,
  "security/jwt": <JwtDemo />,
  "security/csrf": <CsrfDemo />,
  "security/sql-injection": <SqliDemo />,
  "frontend/rendering-pipeline": <PipelineStagesDemo />,
  "frontend/browser-event-loop": <BrowserLoopDemo />,
  "frontend/hydration": <HydrationDemo />,
  "frontend/core-web-vitals": <LcpDemo />,
  "frontend/flexbox": <FlexboxDemo />,
  "devops/probes": <ProbesDemo />,
  "devops/resource-limits": <LimitsDemo />,
  "system-design/bloom-filters": <BloomDemo />,
  "system-design/unique-ids": <SnowflakeDemo />,
  "system-design/distributed-locks": <LockDemo />,
  "databases/mvcc": <MvccDemo />,
  "databases/isolation-anomalies": <LostUpdateDemo />,
  "networking/dns-resolution": <DnsDemo />,
  "networking/congestion-control": <CongestionDemo />,
  "operating-systems/deadlocks": <DeadlockDemo />,
  "operating-systems/cpu-scheduling": <SchedulingDemo />,
  "security/password-hashing": <PasswordDemo />,
  "system-design/idempotency": <IdempotencyDemo />,
  "system-design/cap-theorem": <CapDemo />,
  "devops/images-layers": <LayersDemo />,
  "nodejs/blocking-the-event-loop": <BlockingDemo />,
  "frontend/re-renders": <ReRendersDemo />,
  "databases/btree-index": <BtreeDemo />,
  "networking/tcp-handshake": <HandshakeDemo />,
  "operating-systems/race-conditions": <RaceDemo />,
  "security/xss": <XssDemo />,
  "ai/llm-as-judge": <LlmJudgeDemo />,
  "ai/query-rewriting": <QueryRewriteDemo />,
  "ai/lora": <LoraDemo />,
  "dsa/hash-map": <HashMapDemo />,
  "dsa/two-pointers": <TwoPointersDemo />,
  "dsa/sliding-window": <SlidingWindowDemo />,
  "dsa/monotonic-stack": <MonotonicStackDemo />,
  "dsa/binary-search": <BinarySearchDemo />,
  "dsa/bfs-vs-dfs": <BfsDfsDemo />,
  "dsa/tree-recursion": <TreeRecursionDemo />,
  "dsa/dynamic-programming": <DynamicProgrammingDemo />,
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
  "ai/message-roles": <MessageRolesDemo />,
  "ai/few-shot": <FewShotDemo />,
  "ai/chain-of-thought": <ChainOfThoughtDemo />,
  "ai/prompt-patterns": <PromptPatternsDemo />,
  "ai/graph-rag": <GraphRagDemo />,
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
