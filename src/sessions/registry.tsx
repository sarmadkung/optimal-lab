// Maps "<track id>/<session id>" to the interactive component for that session.
// A session in src/lib/tracks.ts with status "live" must have an entry here.

import type { ReactNode } from "react";
import AttentionDemo from "./ai/attention/AttentionDemo";
import ContextWindowDemo from "./ai/context-window/ContextWindowDemo";
import EmbeddingsDemo from "./ai/embeddings/EmbeddingsDemo";
import EvalsDemo from "./ai/evals/EvalsDemo";
import HybridSearchDemo from "./ai/hybrid-search/HybridSearchDemo";
import NextTokenDemo from "./ai/next-token/NextTokenDemo";
import AlignmentDemo from "./ai/alignment/AlignmentDemo";
import PrivacyTrainingDataDemo from "./ai/privacy-training-data/PrivacyTrainingDataDemo";
import AiRegulationDemo from "./ai/ai-regulation/AiRegulationDemo";
import RagDemo from "./ai/rag/RagDemo";
import TokenizationDemo from "./ai/tokenization/TokenizationDemo";
import PreferenceTuningDemo from "./ai/preference-tuning/PreferenceTuningDemo";
import ReasoningModelsDemo from "./ai/reasoning-models/ReasoningModelsDemo";
import OpenVsClosedDemo from "./ai/open-vs-closed/OpenVsClosedDemo";
import BiasFairnessDemo from "./ai/bias-fairness/BiasFairnessDemo";
import WorkflowDemo from "./ai-automation/workflow/WorkflowDemo";
import ApprovalDemo from "./ai-automation/human-approval/ApprovalDemo";
import StructuredDemo from "./ai-native/structured-output/StructuredDemo";
import ToolCallDemo from "./ai-native/tool-calling/ToolCallDemo";
import ClassificationDemo from "./ai-native/classification/ClassificationDemo";
import ExtractionDemo from "./ai-native/extraction/ExtractionDemo";
import SummarizationDemo from "./ai-native/summarization/SummarizationDemo";
import WritingAssistDemo from "./ai-native/writing-assist/WritingAssistDemo";
import SemanticSearchFeatureDemo from "./ai-native/semantic-search-feature/SemanticSearchFeatureDemo";
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
import PermissionRetrievalDemo from "./system-design/permission-aware-retrieval/PermissionRetrievalDemo";
import OutputValidationDemo from "./system-design/output-validation/OutputValidationDemo";
import AiAuditDemo from "./system-design/ai-audit/AiAuditDemo";
import GuardrailsDemo from "./system-design/guardrails/GuardrailsDemo";
import FailoverDemo from "./system-design/failover-dr/FailoverDemo";
import QuorumDemo from "./system-design/eventual-consistency/QuorumDemo";
import AnswerQualityDemo from "./system-design/answer-quality/AnswerQualityDemo";
import AgentTracingDemo from "./system-design/agent-tracing/AgentTracingDemo";
import PromptInjectionDemo from "./system-design/prompt-injection/PromptInjectionDemo";
import ToolPermissionsDemo from "./system-design/tool-permissions/ToolPermissionsDemo";
import DataLeakageDemo from "./system-design/data-leakage/DataLeakageDemo";
import EventSourcingDemo from "./system-design/cqrs-event-sourcing/EventSourcingDemo";
import GossipDemo from "./system-design/gossip/GossipDemo";
import ConversationStateDemo from "./system-design/conversation-state/ConversationStateDemo";
import AgentMemoryDemo from "./system-design/agent-memory/AgentMemoryDemo";
import MemoryUpdatesDemo from "./system-design/memory-updates/MemoryUpdatesDemo";
import ContextCompressionDemo from "./system-design/context-compression/ContextCompressionDemo";
import MemoryIsolationDemo from "./system-design/memory-isolation/MemoryIsolationDemo";
import NinesDemo from "./system-design/availability/NinesDemo";
import FeatureFlagsDemo from "./system-design/feature-flags/FeatureFlagsDemo";
import FrontendArchitectureDemo from "./system-design/frontend-architecture/FrontendArchitectureDemo";
import BackendArchitectureDemo from "./system-design/backend-architecture/BackendArchitectureDemo";
import ApiDesignDemo from "./system-design/api-design/ApiDesignDemo";
import SessionAuthDemo from "./system-design/session-auth/SessionAuthDemo";
import FileUploadsDemo from "./system-design/file-uploads/FileUploadsDemo";
import RealtimeDemo from "./system-design/realtime/RealtimeDemo";
import BackgroundJobsDemo from "./system-design/background-jobs/BackgroundJobsDemo";
import SearchDemo from "./system-design/search/SearchDemo";
import OfflineSyncDemo from "./system-design/offline-sync/OfflineSyncDemo";
import CollaborativeEditingDemo from "./system-design/collaborative-editing/CollaborativeEditingDemo";
import NotificationsDemo from "./system-design/email-notifications/NotificationsDemo";
import MultiTenancyDemo from "./system-design/multi-tenancy/MultiTenancyDemo";
import ScaleOutDemo from "./system-design/scaling/ScaleOutDemo";
import LittlesLawDemo from "./system-design/latency-throughput/LittlesLawDemo";
import CountMinDemo from "./system-design/top-k/CountMinDemo";
import UrlShortenerDemo from "./system-design/design-url-shortener/UrlShortenerDemo";
import RateLimiterDesignDemo from "./system-design/design-rate-limiter/RateLimiterDesignDemo";
import NotificationSystemDemo from "./system-design/design-notification-system/NotificationSystemDemo";
import ChatDesignDemo from "./system-design/design-chat/ChatDesignDemo";
import NewsFeedDemo from "./system-design/design-news-feed/NewsFeedDemo";
import HllDemo from "./system-design/probabilistic-counting/HllDemo";
import CdcDemo from "./system-design/change-data-capture/CdcDemo";
import SchemaMigrationDemo from "./system-design/schema-migrations/SchemaMigrationDemo";
import ApiGatewayDemo from "./system-design/api-gateway/ApiGatewayDemo";
import WebhooksDemo from "./system-design/webhooks/WebhooksDemo";
import AutocompleteDemo from "./system-design/design-autocomplete/AutocompleteDemo";
import FileSyncDemo from "./system-design/design-file-sync/FileSyncDemo";
import VideoStreamingDemo from "./system-design/design-video-streaming/VideoStreamingDemo";
import RideSharingDemo from "./system-design/design-ride-sharing/RideSharingDemo";
import DegradationDemo from "./system-design/graceful-degradation/DegradationDemo";
import RequestJourneyDemo from "./system-design/request-journey/RequestJourneyDemo";
import ApiStylesDemo from "./system-design/api-styles/ApiStylesDemo";
import SyncAsyncDemo from "./system-design/sync-vs-async/SyncAsyncDemo";
import ServiceMeshDemo from "./system-design/service-mesh/ServiceMeshDemo";
import EventDrivenDemo from "./system-design/event-driven/EventDrivenDemo";
import PubSubDemo from "./system-design/pub-sub/PubSubDemo";
import PermissionsDemo from "./devops/files-permissions/PermissionsDemo";
import ServicesDemo from "./devops/services-ingress/ServicesDemo";
import PromDemo from "./devops/prometheus-metrics/PromDemo";
import GitopsDemo from "./devops/gitops/GitopsDemo";
import TfStateDemo from "./devops/terraform-state/TfStateDemo";
import BackupsDemo from "./devops/backups-restore/BackupsDemo";
import CertChainDemo from "./security/certificates/CertChainDemo";
import OAuthDemo from "./security/oauth-flow/OAuthDemo";
import EstimationDemo from "./system-design/estimation/EstimationDemo";
import MonolithServicesDemo from "./system-design/monolith-vs-microservices/MonolithServicesDemo";
import CleanArchitectureDemo from "./system-design/clean-architecture/CleanArchitectureDemo";
import DomainDrivenDemo from "./system-design/domain-driven-design/DomainDrivenDemo";
import AdrDemo from "./system-design/adrs/AdrDemo";
import CapacityPlanningDemo from "./system-design/capacity-planning/CapacityPlanningDemo";
import ChaosDemo from "./system-design/chaos-engineering/ChaosDemo";
import IncidentResponseDemo from "./system-design/incident-response/IncidentResponseDemo";
import PartitioningDemo from "./databases/table-partitioning/PartitioningDemo";
import OverfittingDemo from "./ai/overfitting/OverfittingDemo";
import TinyNetDemo from "./ai/neural-networks/TinyNetDemo";
import ScalingDemo from "./ai/scaling-laws/ScalingDemo";
import ContextVsRagDemo from "./ai/long-context-vs-rag/ContextVsRagDemo";
import EvalMetricsDemo from "./ai/eval-metrics/EvalMetricsDemo";
import ReflectionDemo from "./ai/reflection/ReflectionDemo";
import ComputerUseDemo from "./ai/computer-use/ComputerUseDemo";
import AgentFailuresDemo from "./ai/agent-failures/AgentFailuresDemo";
import BenchmarksDemo from "./ai/benchmarks/BenchmarksDemo";
import RedTeamingDemo from "./ai/red-teaming/RedTeamingDemo";
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
import PaymentsLedgerDemo from "./system-design/payments-ledgers/PaymentsLedgerDemo";
import DataPipelinesDemo from "./system-design/data-pipelines/DataPipelinesDemo";
import ObjectStorageDemo from "./system-design/object-storage/ObjectStorageDemo";
import MultiRegionDemo from "./system-design/multi-region/MultiRegionDemo";
import EdgeIotDemo from "./system-design/edge-iot/EdgeIotDemo";
import KeyExchangeDemo from "./security/key-exchange/KeyExchangeDemo";
import IdorDemo from "./security/idor/IdorDemo";
import SsrfDemo from "./security/ssrf/SsrfDemo";
import AutoscalingDemo from "./system-design/autoscaling/AutoscalingDemo";
import DeliveryDemo from "./system-design/delivery-guarantees/DeliveryDemo";
import SagaDemo from "./system-design/sagas-outbox/SagaDemo";
import ToolExecutionDemo from "./system-design/tool-execution/ToolExecutionDemo";
import AgentStateMachineDemo from "./system-design/agent-state-machines/AgentStateMachineDemo";
import TaskPlanningDemo from "./system-design/task-planning/TaskPlanningDemo";
import MultiAgentDemo from "./system-design/multi-agent/MultiAgentDemo";
import DurableExecutionDemo from "./system-design/durable-execution/DurableExecutionDemo";
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
import WhatIsAModelDemo from "./ai/what-is-a-model/WhatIsAModelDemo";
import LearningTypesDemo from "./ai/learning-types/LearningTypesDemo";
import FineTuningDemo from "./ai/fine-tuning/FineTuningDemo";
import DistillationDemo from "./ai/distillation/DistillationDemo";
import SyntheticDataDemo from "./ai/synthetic-data/SyntheticDataDemo";
import StreamingUiDemo from "./ai-native/streaming-ui/StreamingUiDemo";
import RetriesDemo from "./ai-automation/retries-errors/RetriesDemo";
import ConfidenceDemo from "./ai-automation/confidence-fallbacks/ConfidenceDemo";
import RouterDemo from "./tools/model-routers/RouterDemo";
import StreamHopsDemo from "./system-design/streaming-responses/StreamHopsDemo";
import CitationsDemo from "./system-design/citations/CitationsDemo";
import IncrementalIndexingDemo from "./system-design/incremental-indexing/IncrementalIndexingDemo";
import ReEmbeddingDemo from "./system-design/re-embedding/ReEmbeddingDemo";
import InferenceBatchingDemo from "./system-design/inference-batching/InferenceBatchingDemo";
import ProviderLimitsDemo from "./system-design/provider-limits/ProviderLimitsDemo";
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
import ThreatModelingDemo from "./system-design/threat-modeling/ThreatModelingDemo";
import DdosWafDemo from "./system-design/ddos-waf/DdosWafDemo";
import PromptVersioningDemo from "./system-design/prompt-versioning/PromptVersioningDemo";
import SemanticCachingDemo from "./system-design/semantic-caching/SemanticCachingDemo";
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
import AuthnAuthzDemo from "./system-design/authn-vs-authz/AuthnAuthzDemo";
import AccessControlDemo from "./system-design/access-control/AccessControlDemo";
import EncryptionDemo from "./system-design/encryption/EncryptionDemo";
import SecretsDemo from "./system-design/secrets/SecretsDemo";
import AuditLogsDemo from "./system-design/audit-logs/AuditLogsDemo";
import BtreeDemo from "./databases/btree-index/BtreeDemo";
import ReRendersDemo from "./frontend/re-renders/ReRendersDemo";
import HandshakeDemo from "./networking/tcp-handshake/HandshakeDemo";
import RaceDemo from "./operating-systems/race-conditions/RaceDemo";
import XssDemo from "./security/xss/XssDemo";
import LlmJudgeDemo from "./ai/llm-as-judge/LlmJudgeDemo";
import LoraDemo from "./ai/lora/LoraDemo";
import TokenEmbeddingsDemo from "./ai/token-embeddings/TokenEmbeddingsDemo";
import TransformerBlockDemo from "./ai/transformer-block/TransformerBlockDemo";
import PretrainingDemo from "./ai/pretraining/PretrainingDemo";
import InstructionTuningDemo from "./ai/instruction-tuning/InstructionTuningDemo";
import HallucinationsDemo from "./ai/hallucinations/HallucinationsDemo";
import QueryRewriteDemo from "./ai/query-rewriting/QueryRewriteDemo";
import KvCacheDemo from "./ai/kv-cache/KvCacheDemo";
import LocalInferenceDemo from "./ai/local-inference/LocalInferenceDemo";
import SmallModelsDemo from "./ai/small-models/SmallModelsDemo";
import MultimodalDemo from "./ai/multimodal/MultimodalDemo";
import ImageGenerationDemo from "./ai/image-generation/ImageGenerationDemo";
import SpeechDemo from "./ai/speech/SpeechDemo";
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
import WebCrawlerDemo from "./system-design/design-web-crawler/WebCrawlerDemo";
import PaymentSystemDemo from "./system-design/design-payment-system/PaymentSystemDemo";
import DocumentAssistantDemo from "./system-design/design-document-assistant/DocumentAssistantDemo";
import CodingAgentDemo from "./system-design/design-coding-agent/CodingAgentDemo";
import MessageQueueDemo from "./system-design/message-queues/MessageQueueDemo";
import RateLimitDemo from "./system-design/rate-limiting/RateLimitDemo";
import ReplicationDemo from "./system-design/replication/ReplicationDemo";
import DatabaseBottlenecksDemo from "./system-design/database-bottlenecks/DatabaseBottlenecksDemo";
import DataModelsDemo from "./system-design/sql-vs-nosql/DataModelsDemo";
import DataModelingDemo from "./system-design/data-modeling/DataModelingDemo";
import TimeSeriesDemo from "./system-design/time-series/TimeSeriesDemo";
import TwoPhaseCommitDemo from "./system-design/distributed-transactions/TwoPhaseCommitDemo";
import ShardingDemo from "./system-design/sharding/ShardingDemo";
import RelationalModelDemo from "./databases/relational-model/RelationalModelDemo";
import SqlJoinsDemo from "./databases/sql-joins/SqlJoinsDemo";
import AggregationDemo from "./databases/aggregation/AggregationDemo";
import NormalFormsDemo from "./databases/normal-forms/NormalFormsDemo";
import QueryLifecycleDemo from "./databases/query-lifecycle/QueryLifecycleDemo";
import ExplainPlansDemo from "./databases/explain-plans/ExplainPlansDemo";
import StatisticsDemo from "./databases/statistics/StatisticsDemo";
import QueryTuningDemo from "./databases/query-tuning/QueryTuningDemo";
import PagesHeapDemo from "./databases/pages-heap/PagesHeapDemo";
import OtherIndexesDemo from "./databases/other-indexes/OtherIndexesDemo";
import NetworkLayersDemo from "./networking/network-layers/NetworkLayersDemo";
import PacketsDemo from "./networking/packets/PacketsDemo";
import IpAddressesDemo from "./networking/ip-addresses/IpAddressesDemo";
import MacArpDemo from "./networking/mac-arp/MacArpDemo";
import Ipv6Demo from "./networking/ipv6/Ipv6Demo";
import TcpReliabilityDemo from "./networking/tcp-reliability/TcpReliabilityDemo";
import UdpDemo from "./networking/udp/UdpDemo";
import TcpVsUdpDemo from "./networking/tcp-vs-udp/TcpVsUdpDemo";
import BgpDemo from "./networking/bgp/BgpDemo";
import AnycastDemo from "./networking/anycast/AnycastDemo";
import CpuCycleDemo from "./operating-systems/cpu-cycle/CpuCycleDemo";
import BinaryNumbersDemo from "./operating-systems/binary-numbers/BinaryNumbersDemo";
import SystemCallsDemo from "./operating-systems/system-calls/SystemCallsDemo";
import ProcessesDemo from "./operating-systems/processes-os/ProcessesDemo";
import ThreadsDemo from "./operating-systems/threads/ThreadsDemo";
import ContextSwitchDemo from "./operating-systems/context-switching/ContextSwitchDemo";
import ForkExecDemo from "./operating-systems/fork-exec/ForkExecDemo";
import IpcDemo from "./operating-systems/ipc/IpcDemo";
import StackHeapDemo from "./operating-systems/stack-heap/StackHeapDemo";
import PageFaultsDemo from "./operating-systems/page-faults/PageFaultsDemo";
import HashingDemo from "./security/hashing/HashingDemo";
import SymmetricDemo from "./security/symmetric-encryption/SymmetricDemo";
import PublicKeyDemo from "./security/public-key/PublicKeyDemo";
import RandomnessDemo from "./security/randomness/RandomnessDemo";
import TlsHandshakeDemo from "./security/tls-handshake/TlsHandshakeDemo";
import MutualTlsDemo from "./security/mutual-tls/MutualTlsDemo";
import HstsDemo from "./security/hsts/HstsDemo";
import SessionsCookiesDemo from "./security/sessions-cookies/SessionsCookiesDemo";
import OidcDemo from "./security/oidc/OidcDemo";
import PasskeysDemo from "./security/passkeys/PasskeysDemo";

const SESSIONS: Record<string, ReactNode> = {
  "dsa/two-sum": <TwoSumDemo />,
  "ai/training-loss": <TrainingDemo />,
  "ai/kv-cache": <KvCacheDemo />,
  "ai/local-inference": <LocalInferenceDemo />,
  "ai/small-models": <SmallModelsDemo />,
  "ai/multimodal": <MultimodalDemo />,
  "ai/image-generation": <ImageGenerationDemo />,
  "ai/speech": <SpeechDemo />,
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
  "system-design/permission-aware-retrieval": <PermissionRetrievalDemo />,
  "system-design/output-validation": <OutputValidationDemo />,
  "system-design/ai-audit": <AiAuditDemo />,
  "system-design/guardrails": <GuardrailsDemo />,
  "system-design/failover-dr": <FailoverDemo />,
  "system-design/eventual-consistency": <QuorumDemo />,
  "system-design/answer-quality": <AnswerQualityDemo />,
  "system-design/agent-tracing": <AgentTracingDemo />,
  "system-design/prompt-injection": <PromptInjectionDemo />,
  "system-design/tool-permissions": <ToolPermissionsDemo />,
  "system-design/data-leakage": <DataLeakageDemo />,
  "system-design/cqrs-event-sourcing": <EventSourcingDemo />,
  "system-design/gossip": <GossipDemo />,
  "system-design/conversation-state": <ConversationStateDemo />,
  "system-design/agent-memory": <AgentMemoryDemo />,
  "system-design/memory-updates": <MemoryUpdatesDemo />,
  "system-design/context-compression": <ContextCompressionDemo />,
  "system-design/memory-isolation": <MemoryIsolationDemo />,
  "system-design/availability": <NinesDemo />,
  "system-design/feature-flags": <FeatureFlagsDemo />,
  "system-design/frontend-architecture": <FrontendArchitectureDemo />,
  "system-design/backend-architecture": <BackendArchitectureDemo />,
  "system-design/api-design": <ApiDesignDemo />,
  "system-design/session-auth": <SessionAuthDemo />,
  "system-design/file-uploads": <FileUploadsDemo />,
  "system-design/realtime": <RealtimeDemo />,
  "system-design/background-jobs": <BackgroundJobsDemo />,
  "system-design/search": <SearchDemo />,
  "system-design/offline-sync": <OfflineSyncDemo />,
  "system-design/collaborative-editing": <CollaborativeEditingDemo />,
  "system-design/email-notifications": <NotificationsDemo />,
  "system-design/multi-tenancy": <MultiTenancyDemo />,
  "system-design/scaling": <ScaleOutDemo />,
  "system-design/latency-throughput": <LittlesLawDemo />,
  "system-design/top-k": <CountMinDemo />,
  "system-design/design-url-shortener": <UrlShortenerDemo />,
  "system-design/design-rate-limiter": <RateLimiterDesignDemo />,
  "system-design/design-notification-system": <NotificationSystemDemo />,
  "system-design/design-chat": <ChatDesignDemo />,
  "system-design/design-news-feed": <NewsFeedDemo />,
  "system-design/probabilistic-counting": <HllDemo />,
  "system-design/change-data-capture": <CdcDemo />,
  "system-design/schema-migrations": <SchemaMigrationDemo />,
  "system-design/api-gateway": <ApiGatewayDemo />,
  "system-design/webhooks": <WebhooksDemo />,
  "system-design/design-autocomplete": <AutocompleteDemo />,
  "system-design/design-file-sync": <FileSyncDemo />,
  "system-design/design-video-streaming": <VideoStreamingDemo />,
  "system-design/design-ride-sharing": <RideSharingDemo />,
  "system-design/graceful-degradation": <DegradationDemo />,
  "system-design/request-journey": <RequestJourneyDemo />,
  "system-design/api-styles": <ApiStylesDemo />,
  "system-design/sync-vs-async": <SyncAsyncDemo />,
  "system-design/service-mesh": <ServiceMeshDemo />,
  "system-design/event-driven": <EventDrivenDemo />,
  "system-design/pub-sub": <PubSubDemo />,
  "devops/files-permissions": <PermissionsDemo />,
  "devops/services-ingress": <ServicesDemo />,
  "devops/prometheus-metrics": <PromDemo />,
  "devops/gitops": <GitopsDemo />,
  "devops/terraform-state": <TfStateDemo />,
  "devops/backups-restore": <BackupsDemo />,
  "security/certificates": <CertChainDemo />,
  "security/oauth-flow": <OAuthDemo />,
  "system-design/estimation": <EstimationDemo />,
  "system-design/monolith-vs-microservices": <MonolithServicesDemo />,
  "system-design/clean-architecture": <CleanArchitectureDemo />,
  "system-design/domain-driven-design": <DomainDrivenDemo />,
  "system-design/adrs": <AdrDemo />,
  "system-design/capacity-planning": <CapacityPlanningDemo />,
  "system-design/chaos-engineering": <ChaosDemo />,
  "system-design/incident-response": <IncidentResponseDemo />,
  "databases/table-partitioning": <PartitioningDemo />,
  "ai/overfitting": <OverfittingDemo />,
  "ai/neural-networks": <TinyNetDemo />,
  "ai/scaling-laws": <ScalingDemo />,
  "ai/long-context-vs-rag": <ContextVsRagDemo />,
  "ai/eval-metrics": <EvalMetricsDemo />,
  "ai/reflection": <ReflectionDemo />,
  "ai/computer-use": <ComputerUseDemo />,
  "ai/agent-failures": <AgentFailuresDemo />,
  "ai/benchmarks": <BenchmarksDemo />,
  "ai/red-teaming": <RedTeamingDemo />,
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
  "system-design/payments-ledgers": <PaymentsLedgerDemo />,
  "system-design/data-pipelines": <DataPipelinesDemo />,
  "system-design/object-storage": <ObjectStorageDemo />,
  "system-design/multi-region": <MultiRegionDemo />,
  "system-design/edge-iot": <EdgeIotDemo />,
  "security/key-exchange": <KeyExchangeDemo />,
  "security/idor": <IdorDemo />,
  "security/ssrf": <SsrfDemo />,
  "system-design/autoscaling": <AutoscalingDemo />,
  "system-design/delivery-guarantees": <DeliveryDemo />,
  "system-design/sagas-outbox": <SagaDemo />,
  "system-design/tool-execution": <ToolExecutionDemo />,
  "system-design/agent-state-machines": <AgentStateMachineDemo />,
  "system-design/task-planning": <TaskPlanningDemo />,
  "system-design/multi-agent": <MultiAgentDemo />,
  "system-design/durable-execution": <DurableExecutionDemo />,
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
  "ai/what-is-a-model": <WhatIsAModelDemo />,
  "ai/learning-types": <LearningTypesDemo />,
  "ai/fine-tuning": <FineTuningDemo />,
  "ai/distillation": <DistillationDemo />,
  "ai/synthetic-data": <SyntheticDataDemo />,
  "ai-native/streaming-ui": <StreamingUiDemo />,
  "ai-automation/retries-errors": <RetriesDemo />,
  "ai-automation/confidence-fallbacks": <ConfidenceDemo />,
  "tools/model-routers": <RouterDemo />,
  "system-design/streaming-responses": <StreamHopsDemo />,
  "system-design/citations": <CitationsDemo />,
  "system-design/incremental-indexing": <IncrementalIndexingDemo />,
  "system-design/re-embedding": <ReEmbeddingDemo />,
  "system-design/inference-batching": <InferenceBatchingDemo />,
  "system-design/provider-limits": <ProviderLimitsDemo />,
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
  "system-design/threat-modeling": <ThreatModelingDemo />,
  "system-design/ddos-waf": <DdosWafDemo />,
  "system-design/prompt-versioning": <PromptVersioningDemo />,
  "system-design/semantic-caching": <SemanticCachingDemo />,
  "databases/mvcc": <MvccDemo />,
  "databases/isolation-anomalies": <LostUpdateDemo />,
  "networking/dns-resolution": <DnsDemo />,
  "networking/congestion-control": <CongestionDemo />,
  "operating-systems/deadlocks": <DeadlockDemo />,
  "operating-systems/cpu-scheduling": <SchedulingDemo />,
  "security/password-hashing": <PasswordDemo />,
  "system-design/idempotency": <IdempotencyDemo />,
  "system-design/cap-theorem": <CapDemo />,
  "system-design/authn-vs-authz": <AuthnAuthzDemo />,
  "system-design/access-control": <AccessControlDemo />,
  "system-design/encryption": <EncryptionDemo />,
  "system-design/secrets": <SecretsDemo />,
  "system-design/audit-logs": <AuditLogsDemo />,
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
  "ai/token-embeddings": <TokenEmbeddingsDemo />,
  "ai/transformer-block": <TransformerBlockDemo />,
  "ai/pretraining": <PretrainingDemo />,
  "ai/instruction-tuning": <InstructionTuningDemo />,
  "ai/hallucinations": <HallucinationsDemo />,
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
  "system-design/database-bottlenecks": <DatabaseBottlenecksDemo />,
  "system-design/sql-vs-nosql": <DataModelsDemo />,
  "system-design/data-modeling": <DataModelingDemo />,
  "system-design/time-series": <TimeSeriesDemo />,
  "system-design/distributed-transactions": <TwoPhaseCommitDemo />,
  "system-design/sharding": <ShardingDemo />,
  "system-design/message-queues": <MessageQueueDemo />,
  "system-design/circuit-breaker": <CircuitBreakerDemo />,
  "system-design/design-web-crawler": <WebCrawlerDemo />,
  "system-design/design-payment-system": <PaymentSystemDemo />,
  "system-design/design-document-assistant": <DocumentAssistantDemo />,
  "system-design/design-coding-agent": <CodingAgentDemo />,
  "devops/ci-cd-pipeline": <PipelineDemo />,
  "devops/containers-vs-vms": <ContainersDemo />,
  "devops/rolling-deploys": <RollingDeployDemo />,
  "ai/tokenization": <TokenizationDemo />,
  "ai/preference-tuning": <PreferenceTuningDemo />,
  "ai/reasoning-models": <ReasoningModelsDemo />,
  "ai/open-vs-closed": <OpenVsClosedDemo />,
  "ai/bias-fairness": <BiasFairnessDemo />,
  "ai/attention": <AttentionDemo />,
  "ai/next-token": <NextTokenDemo />,
  "ai/alignment": <AlignmentDemo />,
  "ai/privacy-training-data": <PrivacyTrainingDataDemo />,
  "ai/ai-regulation": <AiRegulationDemo />,
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
  "ai-native/classification": <ClassificationDemo />,
  "ai-native/extraction": <ExtractionDemo />,
  "ai-native/summarization": <SummarizationDemo />,
  "ai-native/writing-assist": <WritingAssistDemo />,
  "ai-native/semantic-search-feature": <SemanticSearchFeatureDemo />,
  "ai-automation/workflow": <WorkflowDemo />,
  "ai-automation/human-approval": <ApprovalDemo />,
  "ai-automation/schedules": <SchedulesDemo />,
  "tools/cursor-agent": <AgentLoopDemo />,
  "tools/mcp": <McpDemo />,
  "tools/n8n": <N8nDemo />,
  "tools/github-actions": <GithubActionsDemo />,
  "databases/relational-model": <RelationalModelDemo />,
  "databases/sql-joins": <SqlJoinsDemo />,
  "databases/aggregation": <AggregationDemo />,
  "databases/normal-forms": <NormalFormsDemo />,
  "databases/query-lifecycle": <QueryLifecycleDemo />,
  "databases/explain-plans": <ExplainPlansDemo />,
  "databases/statistics": <StatisticsDemo />,
  "databases/query-tuning": <QueryTuningDemo />,
  "databases/pages-heap": <PagesHeapDemo />,
  "databases/other-indexes": <OtherIndexesDemo />,
  "networking/network-layers": <NetworkLayersDemo />,
  "networking/packets": <PacketsDemo />,
  "networking/ip-addresses": <IpAddressesDemo />,
  "networking/mac-arp": <MacArpDemo />,
  "networking/ipv6": <Ipv6Demo />,
  "networking/tcp-reliability": <TcpReliabilityDemo />,
  "networking/udp": <UdpDemo />,
  "networking/tcp-vs-udp": <TcpVsUdpDemo />,
  "networking/bgp": <BgpDemo />,
  "networking/anycast": <AnycastDemo />,
  "operating-systems/cpu-cycle": <CpuCycleDemo />,
  "operating-systems/binary-numbers": <BinaryNumbersDemo />,
  "operating-systems/system-calls": <SystemCallsDemo />,
  "operating-systems/processes-os": <ProcessesDemo />,
  "operating-systems/threads": <ThreadsDemo />,
  "operating-systems/context-switching": <ContextSwitchDemo />,
  "operating-systems/fork-exec": <ForkExecDemo />,
  "operating-systems/ipc": <IpcDemo />,
  "operating-systems/stack-heap": <StackHeapDemo />,
  "operating-systems/page-faults": <PageFaultsDemo />,
  "security/hashing": <HashingDemo />,
  "security/symmetric-encryption": <SymmetricDemo />,
  "security/public-key": <PublicKeyDemo />,
  "security/randomness": <RandomnessDemo />,
  "security/tls-handshake": <TlsHandshakeDemo />,
  "security/mutual-tls": <MutualTlsDemo />,
  "security/hsts": <HstsDemo />,
  "security/sessions-cookies": <SessionsCookiesDemo />,
  "security/oidc": <OidcDemo />,
  "security/passkeys": <PasskeysDemo />,
};

export const sessionDemo = (trackId: string, sessionId: string): ReactNode =>
  SESSIONS[`${trackId}/${sessionId}`];
