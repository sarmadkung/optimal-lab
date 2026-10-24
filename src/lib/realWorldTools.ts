/** Language-agnostic products, services, and open standards readers can look up after a session. */

export type RealWorldTool = {
  name: string;
  /** What kind of thing it is — not a programming language. */
  kind: "service" | "software" | "protocol" | "platform" | "standard";
  note: string;
  /** Official project site or canonical GitHub repository — required for every entry. */
  href: string;
};

/** Label for the outbound link on tool cards (GitHub vs docs vs marketing site). */
export function realWorldLinkLabel(href: string): string {
  try {
    const { hostname, pathname } = new URL(href);
    if (hostname === "github.com") return "GitHub ↗";
    if (hostname.endsWith("readthedocs.io") || pathname.includes("/docs")) return "Documentation ↗";
    if (hostname === "raw.githubusercontent.com") return "GitHub ↗";
  } catch {
    /* invalid URL — fall through */
  }
  return "Official site ↗";
}

export type RealWorldEntry = {
  /** One sentence: these work with any stack. */
  lead: string;
  tools: RealWorldTool[];
};

/** Key: `<track-id>/<session-id>` */
export const REAL_WORLD_TOOLS: Record<string, RealWorldEntry> = {
  "system-design/caching": {
    lead: "The same hit / miss / eviction ideas show up in dedicated cache servers and in front of your app — in any language.",
    tools: [
      { name: "Redis", kind: "service", note: "In-memory key–value store with TTL, LRU-style eviction policies, and replication.", href: "https://redis.io/" },
      { name: "Memcached", kind: "service", note: "Simple, fast distributed memory cache for hot keys.", href: "https://memcached.org/" },
      { name: "Amazon ElastiCache", kind: "platform", note: "Managed Redis or Memcached on AWS.", href: "https://aws.amazon.com/elasticache/" },
      { name: "CDN edge cache", kind: "platform", note: "Cloudflare, Fastly, Akamai — cache HTTP responses close to users.", href: "https://www.cloudflare.com/learning/cdn/what-is-a-cdn/" },
      { name: "HTTP Cache-Control", kind: "standard", note: "Browser and proxy caching without a custom app cache.", href: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control" },
    ],
  },
  "system-design/load-balancing": {
    lead: "Load balancers sit between clients and your app tier regardless of how the backends are written.",
    tools: [
      { name: "NGINX", kind: "software", note: "Reverse proxy with round robin, least connections, weighted upstreams, and health checks.", href: "https://nginx.org/" },
      { name: "HAProxy", kind: "software", note: "L4/L7 balancing and observability for large deployments.", href: "https://www.haproxy.org/" },
      { name: "Envoy", kind: "software", note: "Service mesh data plane; advanced routing and retries.", href: "https://envoyproxy.io/" },
      { name: "AWS Application Load Balancer", kind: "platform", note: "Managed HTTP balancing with target groups.", href: "https://aws.amazon.com/elasticloadbalancing/" },
      { name: "Kubernetes Service", kind: "platform", note: "Cluster IP / Ingress distributes traffic to pods.", href: "https://kubernetes.io/docs/concepts/services-networking/service/" },
    ],
  },
  "nodejs/event-loop": {
    lead: "One thread interleaves work with I/O callbacks; similar patterns appear outside Node too.",
    tools: [
      { name: "libuv", kind: "software", note: "Cross-platform async I/O library (used by Node and others).", href: "https://github.com/libuv/libuv" },
      { name: "Node.js", kind: "platform", note: "Reference runtime for the phases shown in this visual.", href: "https://nodejs.org/" },
      { name: "Tokio", kind: "software", note: "Rust async runtime: tasks, timers, and I/O drivers.", href: "https://github.com/tokio-rs/tokio" },
      { name: "asyncio", kind: "software", note: "Python’s event loop for coroutines and non-blocking I/O.", href: "https://docs.python.org/3/library/asyncio.html" },
    ],
  },
  "nodejs/streams-backpressure": {
    lead: "Backpressure appears anywhere a producer can outrun a consumer — not only in Node streams.",
    tools: [
      { name: "Apache Kafka", kind: "service", note: "Log-based streaming; consumers pull at their own pace.", href: "https://kafka.apache.org/" },
      { name: "RabbitMQ", kind: "service", note: "Queues with prefetch and consumer acks to slow producers.", href: "https://www.rabbitmq.com/" },
      { name: "gRPC streaming", kind: "protocol", note: "Flow-controlled bidirectional streams between services.", href: "https://grpc.io/docs/what-is-grpc/core-concepts/" },
      { name: "Reactive Streams", kind: "standard", note: "Publisher / subscriber contract for demand-driven flow.", href: "https://www.reactive-streams.org/" },
    ],
  },
  "system-design/cdn": {
    lead: "Every CDN works the same way: edges near users, a cache with a TTL, and a way to purge.",
    tools: [
      { name: "Cloudflare CDN", kind: "service", note: "Reverse-proxy CDN in hundreds of cities; purge by URL, tag or everything.", href: "https://www.cloudflare.com/application-services/products/cdn/" },
      { name: "Amazon CloudFront", kind: "service", note: "AWS's CDN with invalidations and cache policies.", href: "https://aws.amazon.com/cloudfront/" },
      { name: "Fastly", kind: "service", note: "Programmable edge cache with near-instant purge.", href: "https://www.fastly.com/products/cdn" },
      { name: "Varnish Cache", kind: "software", note: "The open-source HTTP cache many CDNs grew from.", href: "https://github.com/varnishcache/varnish-cache" },
      { name: "HTTP Cache-Control", kind: "standard", note: "max-age, s-maxage and immutable decide how long edges keep a copy.", href: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control" },
    ],
  },
  "system-design/rate-limiting": {
    lead: "Rate limits live in the gateway in front of your API, with counters in a shared store.",
    tools: [
      { name: "Redis", kind: "software", note: "INCR and EXPIRE make a shared counter every gateway can see.", href: "https://github.com/redis/redis" },
      { name: "Envoy rate limit service", kind: "software", note: "Global rate limiting for Envoy and Istio, backed by Redis.", href: "https://github.com/envoyproxy/ratelimit" },
      { name: "NGINX limit_req", kind: "software", note: "Leaky-bucket request limiting in the web server.", href: "https://nginx.org/" },
      { name: "Kong Gateway", kind: "software", note: "API gateway with rate-limiting plugins per consumer.", href: "https://github.com/Kong/kong" },
      { name: "HTTP 429", kind: "standard", note: "Too Many Requests, with a Retry-After header.", href: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/429" },
    ],
  },
  "system-design/replication": {
    lead: "Every major database ships leader–follower replication; the knobs are sync vs async and where reads go.",
    tools: [
      { name: "PostgreSQL streaming replication", kind: "software", note: "WAL shipped to standbys; synchronous_commit picks sync or async.", href: "https://github.com/postgres/postgres" },
      { name: "MySQL replication", kind: "software", note: "Binlog replication, with semi-synchronous mode.", href: "https://github.com/mysql/mysql-server" },
      { name: "Amazon RDS read replicas", kind: "service", note: "Managed async replicas and Multi-AZ failover.", href: "https://aws.amazon.com/rds/" },
      { name: "MongoDB replica sets", kind: "software", note: "Write concern and read preference control durability and staleness.", href: "https://github.com/mongodb/mongo" },
    ],
  },
  "system-design/database-bottlenecks": {
    lead: "Each bottleneck has a tool that shows it and a tool that fixes it.",
    tools: [
      { name: "pg_stat_statements", kind: "software", note: "Which queries take the most total time in PostgreSQL.", href: "https://www.postgresql.org/docs/current/pgstatstatements.html" },
      { name: "EXPLAIN ANALYZE", kind: "standard", note: "The query plan with real timings: the sequential scan an index would remove.", href: "https://www.postgresql.org/docs/current/sql-explain.html" },
      { name: "PgBouncer", kind: "software", note: "A connection pooler in front of PostgreSQL.", href: "https://github.com/pgbouncer/pgbouncer" },
      { name: "ProxySQL", kind: "software", note: "Pooling and read/write splitting for MySQL.", href: "https://github.com/sysown/proxysql" },
      { name: "Amazon RDS Proxy", kind: "service", note: "Managed pooling and failover handling for RDS databases.", href: "https://aws.amazon.com/rds/proxy/" },
    ],
  },
  "system-design/sql-vs-nosql": {
    lead: "One well-known database per model, and the languages they're asked in.",
    tools: [
      { name: "PostgreSQL", kind: "software", note: "Relational, with JSON columns when a document fits better.", href: "https://github.com/postgres/postgres" },
      { name: "MongoDB", kind: "software", note: "Document database: one JSON-like document per entity.", href: "https://github.com/mongodb/mongo" },
      { name: "Amazon DynamoDB", kind: "service", note: "Key-value and document store designed around access patterns.", href: "https://aws.amazon.com/dynamodb/" },
      { name: "Neo4j", kind: "software", note: "Graph database queried with Cypher.", href: "https://neo4j.com/" },
      { name: "openCypher", kind: "standard", note: "The open graph query language behind MATCH … RETURN.", href: "https://opencypher.org/" },
    ],
  },
  "system-design/data-modeling": {
    lead: "Keeping copies in sync is the hard part; these are the usual ways to do it.",
    tools: [
      { name: "PostgreSQL materialized views", kind: "software", note: "A precomputed, refreshable copy of a query's result.", href: "https://www.postgresql.org/docs/current/sql-creatematerializedview.html" },
      { name: "Debezium", kind: "software", note: "Change data capture to update copies from the database's own log.", href: "https://github.com/debezium/debezium" },
      { name: "DynamoDB single-table design", kind: "standard", note: "Amazon's guide to modeling around access patterns rather than entities.", href: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-general-nosql-design.html" },
      { name: "Designing Data-Intensive Applications", kind: "standard", note: "Kleppmann's book: the chapters on data models and storage.", href: "https://dataintensive.net/" },
    ],
  },
  "system-design/time-series": {
    lead: "Purpose-built time-series stores, and the paper the compression comes from.",
    tools: [
      { name: "Prometheus", kind: "software", note: "Metrics scraping and storage with Gorilla-style compression and label-based series.", href: "https://github.com/prometheus/prometheus" },
      { name: "VictoriaMetrics", kind: "software", note: "A Prometheus-compatible store built for high cardinality and long retention.", href: "https://github.com/VictoriaMetrics/VictoriaMetrics" },
      { name: "TimescaleDB", kind: "software", note: "Time-series on PostgreSQL: hypertables, compression and continuous aggregates.", href: "https://github.com/timescale/timescaledb" },
      { name: "InfluxDB", kind: "software", note: "A time-series database with retention policies and downsampling.", href: "https://github.com/influxdata/influxdb" },
      { name: "ClickHouse", kind: "software", note: "A column store often used for metrics and events at scale.", href: "https://github.com/ClickHouse/ClickHouse" },
      { name: "Gorilla", kind: "standard", note: "Pelkonen et al., 2015: Facebook's in-memory time-series store and its 1.37-bytes-a-point compression.", href: "https://www.vldb.org/pvldb/vol8/p1816-teller.pdf" },
    ],
  },
  "system-design/distributed-transactions": {
    lead: "Two-phase commit lives inside databases and transaction managers; across services, people reach for sagas and workflow engines instead.",
    tools: [
      { name: "PostgreSQL PREPARE TRANSACTION", kind: "software", note: "The participant side of 2PC, built into the database.", href: "https://www.postgresql.org/docs/current/sql-prepare-transaction.html" },
      { name: "Seata", kind: "software", note: "A distributed transaction framework with XA and saga modes.", href: "https://github.com/seata/seata" },
      { name: "Google Spanner", kind: "service", note: "2PC over Paxos groups: atomic commits across machines, with the coordinator itself replicated.", href: "https://cloud.google.com/spanner" },
      { name: "Temporal", kind: "software", note: "Durable workflows: the saga alternative for work that spans services.", href: "https://github.com/temporalio/temporal" },
      { name: "Consensus on Transaction Commit", kind: "standard", note: "Gray and Lamport, 2004: why 2PC blocks, and Paxos commit as the fix.", href: "https://www.microsoft.com/en-us/research/publication/consensus-on-transaction-commit/" },
    ],
  },
  "system-design/sharding": {
    lead: "When one database is too big, these systems split it by a shard key and route queries for you.",
    tools: [
      { name: "Vitess", kind: "software", note: "Sharding layer for MySQL, born at YouTube.", href: "https://github.com/vitessio/vitess" },
      { name: "Citus", kind: "software", note: "Distributed PostgreSQL: pick a distribution column, queries fan out.", href: "https://github.com/citusdata/citus" },
      { name: "CockroachDB", kind: "software", note: "Range-sharded SQL that splits and moves ranges automatically.", href: "https://github.com/cockroachdb/cockroach" },
      { name: "MongoDB sharding", kind: "software", note: "Hashed or ranged shard keys, with a router (mongos).", href: "https://github.com/mongodb/mongo" },
    ],
  },
  "system-design/message-queues": {
    lead: "Queues decouple producers from consumers in every stack; the delivery guarantees are what differ.",
    tools: [
      { name: "Amazon SQS", kind: "service", note: "Visibility timeout, at-least-once delivery, dead-letter queues.", href: "https://aws.amazon.com/sqs/" },
      { name: "RabbitMQ", kind: "software", note: "Acks, redelivery and dead-letter exchanges.", href: "https://github.com/rabbitmq/rabbitmq-server" },
      { name: "Apache Kafka", kind: "software", note: "A replicated log; consumers commit offsets after processing.", href: "https://github.com/apache/kafka" },
      { name: "Redis Streams", kind: "software", note: "Consumer groups with pending entries and claims.", href: "https://github.com/redis/redis" },
    ],
  },
  "system-design/design-web-crawler": {
    lead: "Crawlers, crawl data and the robots standard.",
    tools: [
      { name: "RFC 9309 (robots.txt)", kind: "standard", note: "The Robots Exclusion Protocol.", href: "https://www.rfc-editor.org/rfc/rfc9309" },
      { name: "Apache Nutch", kind: "software", note: "Scalable open-source web crawler.", href: "https://nutch.apache.org/" },
      { name: "Heritrix", kind: "software", note: "The Internet Archive's archival crawler.", href: "https://github.com/internetarchive/heritrix3" },
      { name: "Common Crawl", kind: "service", note: "An open crawl of billions of pages, released monthly.", href: "https://commoncrawl.org/" },
    ],
  },
  "system-design/design-payment-system": {
    lead: "Payment APIs built around idempotency and explicit states.",
    tools: [
      { name: "Stripe Payment Intents", kind: "service", note: "A payment as a state machine from creation to capture.", href: "https://docs.stripe.com/payments/payment-intents" },
      { name: "Stripe idempotent requests", kind: "service", note: "Idempotency keys on every write.", href: "https://docs.stripe.com/api/idempotent_requests" },
      { name: "Adyen API idempotency", kind: "service", note: "Idempotency keys for payment requests.", href: "https://docs.adyen.com/development-resources/api-idempotency" },
      { name: "PCI DSS", kind: "standard", note: "Security standard for handling card data.", href: "https://www.pcisecuritystandards.org/" },
    ],
  },
  "system-design/design-document-assistant": {
    lead: "Vector stores, permission systems and hosted assistants.",
    tools: [
      { name: "pgvector", kind: "software", note: "Vectors with metadata filters inside PostgreSQL.", href: "https://github.com/pgvector/pgvector" },
      { name: "Qdrant", kind: "software", note: "Vector database with payload filtering and quantization.", href: "https://github.com/qdrant/qdrant" },
      { name: "Vespa", kind: "software", note: "Search engine with vectors, filters and ranking.", href: "https://github.com/vespa-engine/vespa" },
      { name: "OpenFGA", kind: "software", note: "Fine-grained authorization checks at query time.", href: "https://github.com/openfga/openfga" },
      { name: "Glean", kind: "service", note: "Hosted workplace search and assistant over company apps.", href: "https://www.glean.com/" },
    ],
  },
  "system-design/design-coding-agent": {
    lead: "Coding agents, their sandboxes and how they're measured.",
    tools: [
      { name: "Claude Code", kind: "software", note: "Terminal coding agent with permission prompts.", href: "https://github.com/anthropics/claude-code" },
      { name: "OpenHands", kind: "software", note: "Open-source coding agent running in a sandbox.", href: "https://github.com/All-Hands-AI/OpenHands" },
      { name: "Model Context Protocol", kind: "protocol", note: "Standard way to give an agent tools.", href: "https://modelcontextprotocol.io/" },
      { name: "Dev Containers", kind: "standard", note: "Reproducible containers for development and agents.", href: "https://containers.dev/" },
      { name: "gVisor", kind: "software", note: "Sandboxed container runtime.", href: "https://github.com/google/gvisor" },
      { name: "SWE-bench", kind: "standard", note: "Benchmark of real GitHub issues fixed with passing tests.", href: "https://www.swebench.com/" },
    ],
  },
  "system-design/circuit-breaker": {
    lead: "Timeouts, retries with backoff and circuit breakers are built into service meshes and resilience libraries.",
    tools: [
      { name: "Envoy", kind: "software", note: "Retry policies, timeouts and outlier detection between services.", href: "https://github.com/envoyproxy/envoy" },
      { name: "Istio", kind: "platform", note: "Service mesh that configures Envoy's retries and circuit breaking.", href: "https://github.com/istio/istio" },
      { name: "Resilience4j", kind: "software", note: "Circuit breaker, retry and bulkhead for JVM services.", href: "https://github.com/resilience4j/resilience4j" },
      { name: "CircuitBreaker (Martin Fowler)", kind: "standard", note: "The classic write-up of the pattern and its three states.", href: "https://martinfowler.com/bliki/CircuitBreaker.html" },
    ],
  },
  "devops/ci-cd-pipeline": {
    lead: "The same lint → test → build → deploy gates run in CI products and self-hosted runners.",
    tools: [
      { name: "GitHub Actions", kind: "platform", note: "Workflow YAML on every push and pull request.", href: "https://github.com/features/actions" },
      { name: "GitLab CI/CD", kind: "platform", note: "Pipelines defined in `.gitlab-ci.yml`.", href: "https://docs.gitlab.com/ee/ci/" },
      { name: "Jenkins", kind: "software", note: "Self-hosted automation server with plugins.", href: "https://www.jenkins.io/" },
      { name: "Argo CD", kind: "software", note: "GitOps deploys: cluster state tracks repo commits.", href: "https://github.com/argoproj/argo-cd" },
      { name: "CircleCI", kind: "platform", note: "Hosted CI with parallel jobs and caches.", href: "https://circleci.com/" },
    ],
  },
  "devops/containers-vs-vms": {
    lead: "Containers share one kernel; VMs boot a full guest OS — the tradeoff is the same on any cloud.",
    tools: [
      { name: "Docker", kind: "software", note: "Build and run OCI images with namespaces and cgroups.", href: "https://www.docker.com/" },
      { name: "containerd", kind: "software", note: "Industry-standard container runtime beneath Kubernetes.", href: "https://github.com/containerd/containerd" },
      { name: "Kubernetes", kind: "platform", note: "Orchestrates many containers across nodes.", href: "https://kubernetes.io/" },
      { name: "Podman", kind: "software", note: "Daemonless containers compatible with Docker images.", href: "https://github.com/containers/podman" },
      { name: "KVM / VMware / Hyper-V", kind: "platform", note: "Hypervisors that run full virtual machines.", href: "https://www.linux-kvm.org/" },
    ],
  },
  "ai/next-token": {
    lead: "Inference stacks all implement the same scoring → filter → sample loop for each token.",
    tools: [
      { name: "OpenAI Chat Completions", kind: "service", note: "Hosted models with temperature, top-p, and logit bias.", href: "https://platform.openai.com/docs/api-reference/chat" },
      { name: "Anthropic Messages API", kind: "service", note: "Claude with temperature and sampling controls.", href: "https://docs.anthropic.com/en/api/messages" },
      { name: "Ollama", kind: "software", note: "Run open models locally with the same sampling knobs.", href: "https://github.com/ollama/ollama" },
      { name: "Hugging Face Transformers", kind: "software", note: "Load models and call generate() with temperature and top-k.", href: "https://github.com/huggingface/transformers" },
      { name: "vLLM", kind: "software", note: "High-throughput GPU inference server.", href: "https://github.com/vllm-project/vllm" },
      { name: "llama.cpp", kind: "software", note: "Local CPU/GPU inference for open weights.", href: "https://github.com/ggerganov/llama.cpp" },
    ],
  },
  "ai/alignment": {
    lead: "Specs, constitutions and safety research all answer the same question: how do you optimize for what you can't measure?",
    tools: [
      { name: "Specification gaming", kind: "standard", note: "DeepMind, 2020: documented cases of agents gaming their objectives.", href: "https://deepmind.google/discover/blog/specification-gaming-the-flip-side-of-ai-ingenuity/" },
      { name: "Concrete Problems in AI Safety", kind: "standard", note: "Amodei et al., 2016: reward hacking and the other failure modes, named.", href: "https://arxiv.org/abs/1606.06565" },
      { name: "Towards Understanding Sycophancy", kind: "standard", note: "Sharma et al., 2023: preference training rewards agreement.", href: "https://arxiv.org/abs/2310.13548" },
      { name: "Constitutional AI", kind: "standard", note: "Bai et al., 2022: written principles as the training signal.", href: "https://arxiv.org/abs/2212.08073" },
      { name: "OpenAI Model Spec", kind: "standard", note: "The written behaviour a model is trained toward.", href: "https://model-spec.openai.com/" },
      { name: "Claude's constitution", kind: "standard", note: "Anthropic's written principles for Claude.", href: "https://www.anthropic.com/news/claudes-constitution" },
    ],
  },
  "ai/privacy-training-data": {
    lead: "Memorization is measured in the research; the defenses are tools you run on the data and the training loop.",
    tools: [
      { name: "Quantifying Memorization", kind: "standard", note: "Carlini et al., 2022: memorization grows with copies, model size and context.", href: "https://arxiv.org/abs/2202.07646" },
      { name: "Extracting Training Data from LLMs", kind: "standard", note: "Carlini et al., 2020: the attack, demonstrated on GPT-2.", href: "https://arxiv.org/abs/2012.07805" },
      { name: "Deduplicating Training Data", kind: "standard", note: "Lee et al., 2021: fewer repeats, less memorization, a slightly better model.", href: "https://arxiv.org/abs/2107.06499" },
      { name: "Microsoft Presidio", kind: "software", note: "Detects and redacts personal data with patterns and entity models.", href: "https://github.com/microsoft/presidio" },
      { name: "Opacus", kind: "software", note: "Differentially private training for PyTorch.", href: "https://github.com/pytorch/opacus" },
      { name: "OpenAI data controls", kind: "service", note: "Whether API and product data is used for training, and how to opt out.", href: "https://platform.openai.com/docs/guides/your-data" },
      { name: "Anthropic Privacy Center", kind: "service", note: "How Anthropic handles data from its products and API.", href: "https://privacy.anthropic.com/" },
    ],
  },
  "ai/ai-regulation": {
    lead: "The EU AI Act is the one binding, general AI law so far; elsewhere, frameworks and sector rules.",
    tools: [
      { name: "EU AI Act (Regulation 2024/1689)", kind: "standard", note: "The official consolidated text on EUR-Lex.", href: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj" },
      { name: "European Commission: regulatory framework for AI", kind: "standard", note: "The Commission's overview of the tiers, duties and timeline.", href: "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai" },
      { name: "AI Act Service Desk", kind: "service", note: "The Commission's help desk and compliance tools for the Act.", href: "https://digital-strategy.ec.europa.eu/en/policies/ai-act-service-desk" },
      { name: "NIST AI Risk Management Framework", kind: "standard", note: "The US voluntary framework for managing AI risk.", href: "https://www.nist.gov/itl/ai-risk-management-framework" },
      { name: "OECD AI Principles", kind: "standard", note: "Intergovernmental principles that many national AI policies build on.", href: "https://oecd.ai/en/ai-principles" },
    ],
  },
  "ai/embeddings": {
    lead: "Embedding models plus a vector index power similarity search in any application stack.",
    tools: [
      { name: "OpenAI Embeddings", kind: "service", note: "Hosted embedding API for text.", href: "https://platform.openai.com/docs/guides/embeddings" },
      { name: "Cohere Embed", kind: "service", note: "Multilingual embedding models as an API.", href: "https://cohere.com/embed" },
      { name: "sentence-transformers", kind: "software", note: "Open embedding models you can run yourself.", href: "https://github.com/UKPLab/sentence-transformers" },
      { name: "Chroma", kind: "software", note: "Embeddings + vector store in one open-source package.", href: "https://github.com/chroma-core/chroma" },
      { name: "pgvector", kind: "software", note: "Vector similarity inside PostgreSQL.", href: "https://github.com/pgvector/pgvector" },
      { name: "Pinecone", kind: "service", note: "Managed vector database for similarity search.", href: "https://www.pinecone.io/" },
      { name: "Weaviate", kind: "service", note: "Open-source vector store with hybrid search.", href: "https://weaviate.io/" },
    ],
  },
  "ai/rag": {
    lead: "RAG pipelines chunk documents, retrieve vectors, and inject context — usually with off-the-shelf pieces.",
    tools: [
      { name: "LangChain", kind: "software", note: "Retrieval chains, loaders, and prompt templates.", href: "https://github.com/langchain-ai/langchain" },
      { name: "LlamaIndex", kind: "software", note: "Connectors, chunking, and query engines over your data.", href: "https://github.com/run-llama/llama_index" },
      { name: "Haystack", kind: "software", note: "Open-source RAG and search pipelines.", href: "https://github.com/deepset-ai/haystack" },
      { name: "Unstructured", kind: "software", note: "Parse PDFs and HTML into clean chunks for indexing.", href: "https://github.com/Unstructured-IO/unstructured" },
      { name: "Chroma", kind: "software", note: "Persist retrieved chunks with embeddings.", href: "https://github.com/chroma-core/chroma" },
      { name: "Azure AI Search", kind: "service", note: "Hybrid keyword + vector retrieval in one index.", href: "https://azure.microsoft.com/en-us/products/ai-services/ai-search" },
    ],
  },
  "ai/training-loss": {
    lead: "Every framework trains models with this same loop; they compute the gradients for you.",
    tools: [
      { name: "PyTorch", kind: "software", note: "Autograd computes every gradient; optimizers take the step.", href: "https://github.com/pytorch/pytorch" },
      { name: "JAX", kind: "software", note: "Gradients of plain numerical functions, compiled for GPUs and TPUs.", href: "https://github.com/jax-ml/jax" },
      { name: "TensorFlow Playground", kind: "software", note: "Train a small neural network in the browser and watch the loss.", href: "https://playground.tensorflow.org" },
      { name: "scikit-learn SGD", kind: "software", note: "Linear models trained with stochastic gradient descent.", href: "https://scikit-learn.org/stable/modules/sgd.html" },
    ],
  },
  "ai/kv-cache": {
    lead: "Every serving stack keeps a KV cache; the differences are in how they store and share it.",
    tools: [
      { name: "vLLM", kind: "software", note: "PagedAttention stores the KV cache in pages to fit more users per GPU.", href: "https://github.com/vllm-project/vllm" },
      { name: "Hugging Face Transformers", kind: "software", note: "Cache classes for generation, including quantized and offloaded caches.", href: "https://huggingface.co/docs/transformers/kv_cache" },
      { name: "llama.cpp", kind: "software", note: "Local inference with a configurable context size and cache type.", href: "https://github.com/ggml-org/llama.cpp" },
      { name: "Prompt caching", kind: "service", note: "Providers reuse the cached prefix of a repeated prompt and charge less for it.", href: "https://platform.claude.com/docs/en/build-with-claude/prompt-caching" },
    ],
  },
  "ai/local-inference": {
    lead: "A handful of runtimes load quantized open models on laptops and gaming PCs; the arithmetic is the same in all of them.",
    tools: [
      { name: "llama.cpp", kind: "software", note: "Runs GGUF models on CPU and GPU, with Q8_0, Q4_K_M and other quantizations.", href: "https://github.com/ggml-org/llama.cpp" },
      { name: "Ollama", kind: "software", note: "Download and run open models with one command; built on llama.cpp.", href: "https://github.com/ollama/ollama" },
      { name: "LM Studio", kind: "software", note: "A desktop app to find, download and chat with local models.", href: "https://lmstudio.ai/" },
      { name: "MLX", kind: "software", note: "Apple's array framework for running models on Apple-silicon unified memory.", href: "https://github.com/ml-explore/mlx" },
      { name: "Hugging Face Hub", kind: "service", note: "Where open weights and their quantized versions are published.", href: "https://huggingface.co/models" },
    ],
  },
  "ai/small-models": {
    lead: "Small open models run on phones and laptops; the platforms ship runtimes and their own on-device models.",
    tools: [
      { name: "Gemma", kind: "software", note: "Google's open models, from sizes that fit on a phone upward.", href: "https://github.com/google-deepmind/gemma" },
      { name: "Phi", kind: "software", note: "Microsoft's small language models.", href: "https://github.com/microsoft/PhiCookBook" },
      { name: "Apple Foundation Models", kind: "platform", note: "An on-device model that apps on Apple platforms can call.", href: "https://developer.apple.com/documentation/foundationmodels" },
      { name: "ExecuTorch", kind: "software", note: "PyTorch's runtime for models on phones and edge devices.", href: "https://github.com/pytorch/executorch" },
      { name: "llama.cpp", kind: "software", note: "Runs small quantized models on laptops and phones.", href: "https://github.com/ggml-org/llama.cpp" },
    ],
  },
  "ai/multimodal": {
    lead: "Hosted models take images in the same request as text; the limits and per-image token cost differ by provider.",
    tools: [
      { name: "Claude vision", kind: "service", note: "Image limits, resizing and the 28-pixel patch token count used here.", href: "https://docs.anthropic.com/en/docs/build-with-claude/vision" },
      { name: "OpenAI images and vision", kind: "service", note: "Image inputs with a detail setting that trades tokens for resolution.", href: "https://platform.openai.com/docs/guides/images-vision" },
      { name: "Gemini image understanding", kind: "service", note: "Images, video and audio in one prompt.", href: "https://ai.google.dev/gemini-api/docs/image-understanding" },
      { name: "An Image is Worth 16x16 Words", kind: "standard", note: "Dosovitskiy et al., 2020: the Vision Transformer that reads images as patches.", href: "https://arxiv.org/abs/2010.11929" },
      { name: "LLaVA", kind: "software", note: "An open model that joins a vision encoder to an LLM.", href: "https://github.com/haotian-liu/LLaVA" },
    ],
  },
  "ai/image-generation": {
    lead: "Open diffusion pipelines expose the same knobs as this page: steps, guidance scale and seed.",
    tools: [
      { name: "Hugging Face Diffusers", kind: "software", note: "Diffusion pipelines and schedulers, including DDIM.", href: "https://github.com/huggingface/diffusers" },
      { name: "ComfyUI", kind: "software", note: "A node editor for diffusion workflows.", href: "https://github.com/comfyanonymous/ComfyUI" },
      { name: "Denoising Diffusion Probabilistic Models", kind: "standard", note: "Ho et al., 2020: the noise schedule and training objective.", href: "https://arxiv.org/abs/2006.11239" },
      { name: "DDIM", kind: "standard", note: "Song et al., 2020: sampling in far fewer steps.", href: "https://arxiv.org/abs/2010.02502" },
      { name: "Classifier-Free Diffusion Guidance", kind: "standard", note: "Ho and Salimans, 2022: the guidance scale.", href: "https://arxiv.org/abs/2207.12598" },
    ],
  },
  "ai/speech": {
    lead: "Voice agents combine speech-to-text, an LLM and text-to-speech, or use one speech-to-speech model.",
    tools: [
      { name: "Whisper", kind: "software", note: "OpenAI's open speech recognition model.", href: "https://github.com/openai/whisper" },
      { name: "Deepgram", kind: "service", note: "Streaming speech-to-text with keyword boosting.", href: "https://deepgram.com/" },
      { name: "ElevenLabs", kind: "service", note: "Text-to-speech voices with streaming output.", href: "https://elevenlabs.io/" },
      { name: "Silero VAD", kind: "software", note: "A small voice-activity detector for spotting the end of a turn.", href: "https://github.com/snakers4/silero-vad" },
      { name: "Pipecat", kind: "software", note: "An open framework for real-time voice agents.", href: "https://github.com/pipecat-ai/pipecat" },
      { name: "OpenAI Realtime API", kind: "service", note: "Speech-to-speech in one model, without the text hops.", href: "https://platform.openai.com/docs/guides/realtime" },
    ],
  },
  "ai/chunking": {
    lead: "Every RAG pipeline has a splitter; most offer the same three choices: size, overlap and structure.",
    tools: [
      { name: "LangChain text splitters", kind: "software", note: "Character, recursive, Markdown-header and token splitters.", href: "https://python.langchain.com/docs/concepts/text_splitters/" },
      { name: "LlamaIndex node parsers", kind: "software", note: "Sentence, semantic and hierarchical chunking.", href: "https://docs.llamaindex.ai/en/stable/module_guides/loading/node_parsers/" },
      { name: "Unstructured", kind: "software", note: "Parse PDFs, slides and HTML into titled elements before chunking.", href: "https://github.com/Unstructured-IO/unstructured" },
      { name: "Chonkie", kind: "software", note: "A small chunking library with token, sentence and semantic chunkers.", href: "https://github.com/chonkie-inc/chonkie" },
    ],
  },
  "ai/llm-as-judge": {
    lead: "Eval tools ship LLM judges; the bias fixes (swap order, rubrics, human spot checks) are up to you.",
    tools: [
      { name: "promptfoo", kind: "software", note: "LLM-rubric and pairwise grading in test configs.", href: "https://github.com/promptfoo/promptfoo" },
      { name: "OpenAI Evals", kind: "software", note: "Model-graded eval templates you can adapt.", href: "https://github.com/openai/evals" },
      { name: "Chatbot Arena", kind: "service", note: "Pairwise human votes, the ground truth many judges are checked against.", href: "https://lmarena.ai" },
    ],
  },
  "ai/query-rewriting": {
    lead: "Most RAG frameworks can rewrite or expand the query before retrieval with one setting.",
    tools: [
      { name: "LlamaIndex query transforms", kind: "software", note: "HyDE and multi-step query rewriting.", href: "https://docs.llamaindex.ai/en/stable/optimizing/advanced_retrieval/query_transformations/" },
      { name: "LangChain MultiQueryRetriever", kind: "software", note: "Generate several rephrasings and merge what they retrieve.", href: "https://python.langchain.com/docs/how_to/MultiQueryRetriever/" },
      { name: "Elasticsearch synonyms", kind: "software", note: "The pre-LLM fix: map user words to document words.", href: "https://www.elastic.co/docs/solutions/search/full-text/search-with-synonyms" },
    ],
  },
  "ai/lora": {
    lead: "LoRA is the default way to fine-tune open models, and many hosted APIs fine-tune with adapters too.",
    tools: [
      { name: "Hugging Face PEFT", kind: "software", note: "LoRA, QLoRA and other adapters for Transformers models.", href: "https://github.com/huggingface/peft" },
      { name: "Unsloth", kind: "software", note: "Faster, lower-memory LoRA fine-tuning on one GPU.", href: "https://github.com/unslothai/unsloth" },
      { name: "vLLM multi-LoRA", kind: "software", note: "Serve one base model with many adapters loaded per request.", href: "https://docs.vllm.ai/en/latest/features/lora.html" },
      { name: "LoRA paper", kind: "standard", note: "Hu et al., 2021: Low-Rank Adaptation of Large Language Models.", href: "https://arxiv.org/abs/2106.09685" },
    ],
  },
  "ai/token-embeddings": {
    lead: "Every transformer starts with an embedding lookup; models differ mainly in how they encode position.",
    tools: [
      { name: "Attention Is All You Need", kind: "standard", note: "The paper that introduced sinusoidal position encodings.", href: "https://arxiv.org/abs/1706.03762" },
      { name: "RoPE (RoFormer)", kind: "standard", note: "Rotary position embeddings, used by Llama, Mistral and Qwen.", href: "https://arxiv.org/abs/2104.09864" },
      { name: "Hugging Face Transformers", kind: "software", note: "Inspect any open model's embedding table and position settings in its config.", href: "https://github.com/huggingface/transformers" },
      { name: "Embedding Projector", kind: "software", note: "Explore word embeddings in 3D and find nearest neighbours.", href: "https://projector.tensorflow.org" },
    ],
  },
  "ai/transformer-block": {
    lead: "GPT-2, Llama and nearly every LLM since stack this same block; the configs only change its size and count.",
    tools: [
      { name: "nanoGPT", kind: "software", note: "A GPT whose whole block fits on one screen of code.", href: "https://github.com/karpathy/nanoGPT" },
      { name: "LLM Visualization", kind: "software", note: "A 3D walk through every matrix in a small GPT.", href: "https://bbycroft.net/llm" },
      { name: "Transformer Explainer", kind: "software", note: "GPT-2 running in the browser, block by block.", href: "https://github.com/poloclub/transformer-explainer" },
      { name: "Llama models", kind: "software", note: "Meta's reference code and configs: width, layers, heads and feed-forward size.", href: "https://github.com/meta-llama/llama-models" },
      { name: "Pure attention loses rank", kind: "standard", note: "Dong et al., 2021: why stacks without residual connections collapse.", href: "https://arxiv.org/abs/2103.03404" },
    ],
  },
  "ai/pretraining": {
    lead: "Open pretraining runs share the same parts: a web crawl, a cleaning pipeline, a tokenizer and a distributed trainer.",
    tools: [
      { name: "Common Crawl", kind: "platform", note: "The open web crawl behind most pretraining datasets.", href: "https://commoncrawl.org" },
      { name: "FineWeb", kind: "platform", note: "15T tokens of filtered, deduplicated web text, with the recipe published.", href: "https://huggingface.co/datasets/HuggingFaceFW/fineweb" },
      { name: "datatrove", kind: "software", note: "Filtering and deduplication pipelines for large text datasets.", href: "https://github.com/huggingface/datatrove" },
      { name: "Megatron-LM", kind: "software", note: "NVIDIA's framework for training large transformers across many GPUs.", href: "https://github.com/NVIDIA/Megatron-LM" },
      { name: "torchtitan", kind: "software", note: "PyTorch's reference for large-scale LLM pretraining.", href: "https://github.com/pytorch/torchtitan" },
    ],
  },
  "ai/instruction-tuning": {
    lead: "The same three stages, SFT, preference data and a KL-leashed optimizer, sit behind every chat model.",
    tools: [
      { name: "TRL", kind: "software", note: "SFT, reward modelling, PPO and DPO trainers for open models.", href: "https://github.com/huggingface/trl" },
      { name: "OpenRLHF", kind: "software", note: "RLHF at scale with PPO, DPO and reward models.", href: "https://github.com/OpenRLHF/OpenRLHF" },
      { name: "InstructGPT paper", kind: "standard", note: "Ouyang et al., 2022: SFT, a reward model and PPO.", href: "https://arxiv.org/abs/2203.02155" },
      { name: "DPO paper", kind: "standard", note: "Rafailov et al., 2023: preference tuning without a separate reward model.", href: "https://arxiv.org/abs/2305.18290" },
      { name: "Constitutional AI", kind: "standard", note: "Bai et al., 2022: AI feedback guided by written principles.", href: "https://arxiv.org/abs/2212.08073" },
      { name: "Reward model overoptimization", kind: "standard", note: "Gao et al., 2022: reward keeps rising while real quality falls.", href: "https://arxiv.org/abs/2210.10760" },
    ],
  },
  "ai/hallucinations": {
    lead: "No setting turns hallucination off; teams ground answers in sources, measure faithfulness, and reward “not sure”.",
    tools: [
      { name: "Why Language Models Hallucinate", kind: "standard", note: "Kalai et al., 2025: rare facts and guess-rewarding grading.", href: "https://arxiv.org/abs/2509.04664" },
      { name: "Claude citations", kind: "service", note: "Answers that point to the exact passages in your documents.", href: "https://platform.claude.com/docs/en/build-with-claude/citations" },
      { name: "Ragas", kind: "software", note: "Faithfulness and answer-relevance scores for RAG outputs.", href: "https://github.com/explodinggradients/ragas" },
      { name: "Vectara hallucination leaderboard", kind: "platform", note: "How often popular models invent facts when summarizing.", href: "https://github.com/vectara/hallucination-leaderboard" },
      { name: "simple-evals (SimpleQA)", kind: "software", note: "Short factual questions graded right, wrong or not attempted.", href: "https://github.com/openai/simple-evals" },
    ],
  },
  "frontend/re-renders": {
    lead: "Every React app re-renders by these rules; the tools show you which renders happened and why.",
    tools: [
      { name: "React Developer Tools", kind: "software", note: "Profiler with \"why did this render?\" and highlight-on-render.", href: "https://react.dev/learn/react-developer-tools" },
      { name: "React Compiler", kind: "software", note: "Adds memoization automatically at build time.", href: "https://react.dev/learn/react-compiler" },
      { name: "React docs: memo", kind: "standard", note: "When memo skips a render, and when it can't.", href: "https://react.dev/reference/react/memo" },
    ],
  },
  "databases/btree-index": {
    lead: "B-trees are the default index in almost every relational database.",
    tools: [
      { name: "PostgreSQL indexes", kind: "software", note: "CREATE INDEX makes a B-tree unless you ask for another type.", href: "https://www.postgresql.org/docs/current/indexes-types.html" },
      { name: "MySQL InnoDB", kind: "software", note: "Tables are stored as B+ trees ordered by the primary key.", href: "https://dev.mysql.com/doc/refman/8.4/en/innodb-physical-structure.html" },
      { name: "SQLite", kind: "software", note: "Every table and index is a B-tree in one file.", href: "https://www.sqlite.org/fileformat2.html" },
      { name: "EXPLAIN", kind: "standard", note: "Shows whether a query used an index scan or a sequential scan.", href: "https://www.postgresql.org/docs/current/using-explain.html" },
    ],
  },
  "networking/tcp-handshake": {
    lead: "Every HTTPS request pays these round trips; the protocols and providers below exist to cut them.",
    tools: [
      { name: "TLS 1.3 (RFC 8446)", kind: "protocol", note: "One-round-trip handshake, and 0-RTT resumption.", href: "https://www.rfc-editor.org/rfc/rfc8446" },
      { name: "QUIC (RFC 9000)", kind: "protocol", note: "Transport over UDP with the TLS handshake built in.", href: "https://www.rfc-editor.org/rfc/rfc9000" },
      { name: "Chrome DevTools timing", kind: "software", note: "See DNS, connection, TLS and waiting time for every request.", href: "https://developer.chrome.com/docs/devtools/network/reference#timing" },
      { name: "curl -w", kind: "software", note: "Print time_connect, time_appconnect and time_starttransfer from the terminal.", href: "https://curl.se/docs/manpage.html#-w" },
    ],
  },
  "operating-systems/race-conditions": {
    lead: "Any language with threads has this bug and the same fixes: locks, atomics or not sharing memory.",
    tools: [
      { name: "ThreadSanitizer", kind: "software", note: "Finds data races in C, C++ and Go at run time.", href: "https://clang.llvm.org/docs/ThreadSanitizer.html" },
      { name: "Go race detector", kind: "software", note: "go test -race reports conflicting accesses.", href: "https://go.dev/doc/articles/race_detector" },
      { name: "Atomics.add", kind: "standard", note: "JavaScript's atomic increment on shared memory between workers.", href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/add" },
    ],
  },
  "security/xss": {
    lead: "Frameworks escape by default; XSS comes back wherever code opts out.",
    tools: [
      { name: "OWASP XSS Prevention Cheat Sheet", kind: "standard", note: "Which encoding to use in each context.", href: "https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html" },
      { name: "DOMPurify", kind: "software", note: "The common HTML sanitizer for when you must allow some markup.", href: "https://github.com/cure53/DOMPurify" },
      { name: "Content Security Policy", kind: "standard", note: "Tell the browser which scripts may run.", href: "https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP" },
      { name: "Trusted Types", kind: "standard", note: "Make the browser reject raw strings in innerHTML.", href: "https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API" },
    ],
  },
  "system-design/idempotency": {
    lead: "Payment and messaging APIs accept idempotency keys so clients can retry safely.",
    tools: [
      { name: "Stripe idempotent requests", kind: "service", note: "Send Idempotency-Key and Stripe replays the first result for 24 hours.", href: "https://docs.stripe.com/api/idempotent_requests" },
      { name: "IETF Idempotency-Key header", kind: "standard", note: "Draft standard for the header and its error codes.", href: "https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/" },
      { name: "AWS Lambda Powertools idempotency", kind: "software", note: "Store keys and results in DynamoDB around a handler.", href: "https://docs.powertools.aws.dev/lambda/python/latest/utilities/idempotency/" },
    ],
  },
  "system-design/cap-theorem": {
    lead: "Every replicated database makes this choice; most let you tune it per request.",
    tools: [
      { name: "Cassandra consistency levels", kind: "software", note: "Choose ONE, QUORUM or ALL per read and write.", href: "https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html" },
      { name: "etcd", kind: "software", note: "Raft-based key-value store that refuses writes without a majority (CP).", href: "https://etcd.io" },
      { name: "Amazon DynamoDB", kind: "service", note: "Eventually consistent reads by default; strongly consistent on request.", href: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html" },
      { name: "Jepsen", kind: "software", note: "Tests what databases really do during partitions.", href: "https://jepsen.io" },
    ],
  },
  "devops/images-layers": {
    lead: "Layer caching works the same in every OCI image builder; order decides how much is reused.",
    tools: [
      { name: "Docker build cache", kind: "software", note: "How cache invalidation works, and how to order instructions.", href: "https://docs.docker.com/build/cache/" },
      { name: "BuildKit cache mounts", kind: "software", note: "Keep the npm or pip cache between builds even when a layer reruns.", href: "https://docs.docker.com/build/cache/optimize/" },
      { name: "dive", kind: "software", note: "Inspect each layer of an image and what it added.", href: "https://github.com/wagoodman/dive" },
    ],
  },
  "nodejs/blocking-the-event-loop": {
    lead: "Every single-threaded runtime has this rule: keep long CPU work off the thread that serves requests.",
    tools: [
      { name: "worker_threads", kind: "platform", note: "Run JavaScript on another thread and message results back.", href: "https://nodejs.org/api/worker_threads.html" },
      { name: "Piscina", kind: "software", note: "A worker thread pool for Node.js.", href: "https://github.com/piscinajs/piscina" },
      { name: "perf_hooks.monitorEventLoopDelay", kind: "platform", note: "Measure how long the event loop is blocked.", href: "https://nodejs.org/api/perf_hooks.html#perf_hooksmonitoreventloopdelayoptions" },
      { name: "Clinic.js", kind: "software", note: "Find what is blocking the event loop in a running app.", href: "https://github.com/clinicjs/node-clinic" },
    ],
  },
  "system-design/authn-vs-authz": {
    lead: "Identity providers handle authentication; authorization stays in your service, checked on every request.",
    tools: [
      { name: "OWASP API Security Top 10", kind: "standard", note: "Broken object-level and function-level authorization top the list.", href: "https://owasp.org/API-Security/" },
      { name: "OpenID Connect", kind: "standard", note: "The identity layer on OAuth 2.0: signed ID tokens that say who the user is.", href: "https://openid.net/developers/how-connect-works/" },
      { name: "RFC 8725 JWT Best Current Practices", kind: "standard", note: "Verify the algorithm, the signature, the issuer and the audience.", href: "https://www.rfc-editor.org/rfc/rfc8725" },
      { name: "Keycloak", kind: "software", note: "Open-source identity provider issuing signed tokens with roles.", href: "https://github.com/keycloak/keycloak" },
      { name: "Auth0", kind: "service", note: "Hosted authentication with roles and permissions in the token.", href: "https://auth0.com/" },
    ],
  },
  "system-design/access-control": {
    lead: "Policy engines take the decision out of scattered if-statements; Zanzibar-style systems handle sharing at scale.",
    tools: [
      { name: "Zanzibar", kind: "standard", note: "Google's paper on relationship-based authorization for Drive, YouTube and more.", href: "https://research.google/pubs/zanzibar-googles-consistent-global-authorization-system/" },
      { name: "OpenFGA", kind: "software", note: "An open-source Zanzibar-style authorization service (CNCF).", href: "https://github.com/openfga/openfga" },
      { name: "SpiceDB", kind: "software", note: "Another open-source Zanzibar implementation, with a schema language for relations.", href: "https://github.com/authzed/spicedb" },
      { name: "Open Policy Agent", kind: "software", note: "Attribute rules written as policy (Rego), evaluated anywhere.", href: "https://github.com/open-policy-agent/opa" },
      { name: "Cedar", kind: "software", note: "AWS's open policy language for RBAC and ABAC, with automated reasoning.", href: "https://github.com/cedar-policy/cedar" },
    ],
  },
  "system-design/encryption": {
    lead: "TLS everywhere, KMS-managed keys for storage, and application-level encryption for the few fields that matter most.",
    tools: [
      { name: "Let's Encrypt", kind: "service", note: "Free, automated TLS certificates for public endpoints.", href: "https://letsencrypt.org/" },
      { name: "AWS Key Management Service", kind: "service", note: "Master keys that never leave the service; envelope encryption and logged key use.", href: "https://aws.amazon.com/kms/" },
      { name: "Google Cloud KMS", kind: "service", note: "The same model on Google Cloud, with automatic rotation.", href: "https://cloud.google.com/security/products/security-key-management" },
      { name: "HashiCorp Vault Transit", kind: "software", note: "Encryption as a service: the app sends data, Vault returns ciphertext, keys never leave.", href: "https://developer.hashicorp.com/vault/docs/secrets/transit" },
      { name: "Tink", kind: "software", note: "Google's cryptography library with safe defaults for field-level and envelope encryption.", href: "https://github.com/tink-crypto" },
    ],
  },
  "system-design/secrets": {
    lead: "Secrets managers, scanners and workload identity exist on every platform; the hard part is getting secrets out of code first.",
    tools: [
      { name: "HashiCorp Vault", kind: "software", note: "Secrets per service, dynamic database credentials and leases.", href: "https://github.com/hashicorp/vault" },
      { name: "AWS Secrets Manager", kind: "service", note: "Stored secrets with scheduled rotation and per-role access.", href: "https://aws.amazon.com/secrets-manager/" },
      { name: "GitHub secret scanning", kind: "service", note: "Push protection blocks commits that contain known key formats.", href: "https://docs.github.com/en/code-security/secret-scanning" },
      { name: "gitleaks", kind: "software", note: "Scan repositories and history for committed secrets, in CI or a pre-commit hook.", href: "https://github.com/gitleaks/gitleaks" },
      { name: "SPIFFE", kind: "standard", note: "Workload identity: services prove who they are without a stored secret.", href: "https://spiffe.io/" },
    ],
  },
  "system-design/audit-logs": {
    lead: "Write-once storage and verifiable logs make tampering impossible or visible; the format of the entries is up to you.",
    tools: [
      { name: "S3 Object Lock", kind: "service", note: "Write-once-read-many storage: objects can't be changed or deleted until retention ends.", href: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html" },
      { name: "AWS CloudTrail", kind: "service", note: "An audit log of API calls, with digest files that chain hashes for validation.", href: "https://aws.amazon.com/cloudtrail/" },
      { name: "Trillian", kind: "software", note: "Google's verifiable log, the basis of Certificate Transparency.", href: "https://github.com/google/trillian" },
      { name: "pgAudit", kind: "software", note: "Detailed session and object audit logging for PostgreSQL.", href: "https://github.com/pgaudit/pgaudit" },
      { name: "OWASP Logging Cheat Sheet", kind: "standard", note: "What to log, what never to log, and protecting logs from tampering.", href: "https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html" },
    ],
  },
  "system-design/bloom-filters": {
    lead: "Bloom filters sit in front of slow lookups in databases, caches and browsers.",
    tools: [
      { name: "RedisBloom", kind: "software", note: "BF.ADD and BF.EXISTS inside Redis.", href: "https://redis.io/docs/latest/develop/data-types/probabilistic/bloom-filter/" },
      { name: "Cassandra", kind: "software", note: "A Bloom filter per SSTable skips files that can't hold a key.", href: "https://cassandra.apache.org/doc/latest/cassandra/managing/operating/bloom_filters.html" },
      { name: "PostgreSQL bloom index", kind: "software", note: "An index type built on Bloom filters.", href: "https://www.postgresql.org/docs/current/bloom.html" },
    ],
  },
  "system-design/unique-ids": {
    lead: "Most large systems generate ids without a central counter.",
    tools: [
      { name: "Twitter Snowflake", kind: "software", note: "The original 64-bit time + machine + sequence design.", href: "https://github.com/twitter-archive/snowflake" },
      { name: "UUIDv7 (RFC 9562)", kind: "standard", note: "A time-ordered UUID standard.", href: "https://www.rfc-editor.org/rfc/rfc9562" },
      { name: "ULID", kind: "standard", note: "Sortable 128-bit ids encoded as 26 characters.", href: "https://github.com/ulid/spec" },
    ],
  },
  "system-design/threat-modeling": {
    lead: "Threat modeling is a practice more than a tool; these are the methods and the tools teams use to draw and track it.",
    tools: [
      { name: "Threat Modeling Manifesto", kind: "standard", note: "The four questions and the values behind them, from practitioners.", href: "https://www.threatmodelingmanifesto.org/" },
      { name: "STRIDE", kind: "standard", note: "Microsoft's six threat categories, with the security property each one breaks.", href: "https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats" },
      { name: "OWASP Threat Dragon", kind: "software", note: "Open-source tool to draw data-flow diagrams and record threats per element.", href: "https://github.com/OWASP/threat-dragon" },
      { name: "OWASP Threat Modeling Cheat Sheet", kind: "standard", note: "A practical walkthrough: scope, diagram, threats, mitigations, review.", href: "https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html" },
    ],
  },
  "system-design/ddos-waf": {
    lead: "Volumetric attacks are absorbed by networks built for it; WAF rules and bot management run at the same edge.",
    tools: [
      { name: "Cloudflare DDoS protection", kind: "service", note: "Anycast network that absorbs L3/4 and L7 attacks at the edge.", href: "https://www.cloudflare.com/ddos/" },
      { name: "AWS Shield", kind: "service", note: "DDoS protection for AWS resources, with AWS WAF for L7 rules.", href: "https://aws.amazon.com/shield/" },
      { name: "Google Cloud Armor", kind: "service", note: "Edge DDoS defence and WAF rules in front of Google Cloud load balancers.", href: "https://cloud.google.com/security/products/armor" },
      { name: "OWASP Core Rule Set", kind: "software", note: "Open WAF rules for ModSecurity and Coraza: SQL injection, XSS and more.", href: "https://github.com/coreruleset/coreruleset" },
      { name: "Coraza", kind: "software", note: "An open-source WAF engine that runs the Core Rule Set.", href: "https://github.com/corazawaf/coraza" },
    ],
  },
  "system-design/prompt-versioning": {
    lead: "Prompt registries and eval runners treat prompts like code: versions, diffs, gates and rollbacks.",
    tools: [
      { name: "Langfuse prompt management", kind: "software", note: "Versioned prompts with labels like production, fetched at run time.", href: "https://langfuse.com/docs/prompts/get-started" },
      { name: "promptfoo", kind: "software", note: "Run prompt evals in CI and compare versions case by case.", href: "https://github.com/promptfoo/promptfoo" },
      { name: "OpenAI Evals", kind: "software", note: "A framework and registry of evals for comparing model and prompt versions.", href: "https://github.com/openai/evals" },
      { name: "MLflow Prompt Registry", kind: "software", note: "Prompt versions and aliases alongside model tracking.", href: "https://mlflow.org/docs/latest/genai/prompt-registry/" },
    ],
  },
  "system-design/semantic-caching": {
    lead: "Semantic caches are a vector search in front of the model; gateways and libraries ship them ready to use.",
    tools: [
      { name: "GPTCache", kind: "software", note: "An open-source semantic cache for LLM calls with pluggable embeddings and stores.", href: "https://github.com/zilliztech/GPTCache" },
      { name: "Redis vector search", kind: "software", note: "Store question embeddings and look up the nearest one with a distance threshold.", href: "https://redis.io/docs/latest/develop/ai/search-and-query/vectors/" },
      { name: "LiteLLM caching", kind: "software", note: "A model gateway with exact and semantic caching built in.", href: "https://docs.litellm.ai/docs/proxy/caching" },
      { name: "Anthropic prompt caching", kind: "service", note: "A different idea worth knowing: reuse the processed prompt prefix, not the answer.", href: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching" },
    ],
  },
  "system-design/distributed-locks": {
    lead: "Lock services give you leases; correctness under pauses needs fencing at the storage.",
    tools: [
      { name: "etcd leases", kind: "software", note: "Keys that expire unless kept alive; revisions work as fencing tokens.", href: "https://etcd.io/docs/latest/learning/api/#lease-api" },
      { name: "ZooKeeper recipes", kind: "software", note: "Locks built from ephemeral sequential nodes.", href: "https://zookeeper.apache.org/doc/current/recipes.html#sc_recipes_Locks" },
      { name: "Redis SET NX PX", kind: "software", note: "A simple lease lock, with the caveats shown here.", href: "https://redis.io/docs/latest/develop/use/patterns/distributed-locks/" },
    ],
  },
  "databases/mvcc": {
    lead: "Postgres, MySQL InnoDB and Oracle all use multi-version concurrency control.",
    tools: [
      { name: "PostgreSQL MVCC", kind: "software", note: "How snapshots and row versions work.", href: "https://www.postgresql.org/docs/current/mvcc-intro.html" },
      { name: "VACUUM", kind: "software", note: "Reclaims dead row versions.", href: "https://www.postgresql.org/docs/current/routine-vacuuming.html" },
      { name: "InnoDB consistent reads", kind: "software", note: "MySQL's snapshot reads from undo logs.", href: "https://dev.mysql.com/doc/refman/8.4/en/innodb-consistent-read.html" },
    ],
  },
  "databases/isolation-anomalies": {
    lead: "The same bug appears in any database; the fixes are standard SQL.",
    tools: [
      { name: "PostgreSQL isolation levels", kind: "software", note: "What each level allows and prevents.", href: "https://www.postgresql.org/docs/current/transaction-iso.html" },
      { name: "SELECT \u2026 FOR UPDATE", kind: "standard", note: "Row-level locks on read.", href: "https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-ROWS" },
      { name: "Hermitage", kind: "software", note: "Tests of which anomalies each database really prevents.", href: "https://github.com/ept/hermitage" },
    ],
  },
  "networking/dns-resolution": {
    lead: "Every connection starts with a lookup like this one.",
    tools: [
      { name: "dig +trace", kind: "software", note: "Follow the referrals from the root yourself.", href: "https://www.isc.org/bind/" },
      { name: "Cloudflare 1.1.1.1", kind: "service", note: "A public recursive resolver.", href: "https://1.1.1.1/dns/" },
      { name: "DNS (RFC 1034)", kind: "protocol", note: "The original design of names, zones and referrals.", href: "https://www.rfc-editor.org/rfc/rfc1034" },
    ],
  },
  "networking/congestion-control": {
    lead: "Every TCP stack runs a congestion controller; the default differs by OS.",
    tools: [
      { name: "CUBIC (RFC 9438)", kind: "protocol", note: "The default in Linux, Windows and macOS.", href: "https://www.rfc-editor.org/rfc/rfc9438" },
      { name: "BBR", kind: "software", note: "Google's model-based congestion control.", href: "https://github.com/google/bbr" },
      { name: "TCP congestion control (RFC 5681)", kind: "protocol", note: "Slow start, congestion avoidance and fast recovery.", href: "https://www.rfc-editor.org/rfc/rfc5681" },
    ],
  },
  "operating-systems/deadlocks": {
    lead: "Deadlocks appear in threads and in database transactions alike.",
    tools: [
      { name: "PostgreSQL deadlock detection", kind: "software", note: "Finds wait cycles and aborts one transaction.", href: "https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-DEADLOCKS" },
      { name: "Go runtime", kind: "platform", note: "Reports \u201call goroutines are asleep - deadlock!\u201d.", href: "https://go.dev/doc/effective_go#concurrency" },
      { name: "Java thread dumps", kind: "software", note: "jstack shows which thread holds and waits for which lock.", href: "https://docs.oracle.com/en/java/javase/21/docs/specs/man/jstack.html" },
    ],
  },
  "operating-systems/cpu-scheduling": {
    lead: "Every OS has a scheduler; you mostly influence it through priorities and limits.",
    tools: [
      { name: "Linux EEVDF scheduler", kind: "software", note: "The Linux scheduler since 6.6, successor to CFS.", href: "https://docs.kernel.org/scheduler/sched-eevdf.html" },
      { name: "nice and renice", kind: "software", note: "Change a process's priority.", href: "https://man7.org/linux/man-pages/man1/nice.1.html" },
      { name: "Kubernetes CPU requests", kind: "platform", note: "Become scheduler weights for containers.", href: "https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/" },
    ],
  },
  "security/password-hashing": {
    lead: "Use a password-hashing function from your platform; never design your own.",
    tools: [
      { name: "OWASP Password Storage Cheat Sheet", kind: "standard", note: "Recommended algorithms and parameters.", href: "https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html" },
      { name: "Argon2", kind: "standard", note: "Winner of the Password Hashing Competition.", href: "https://github.com/P-H-C/phc-winner-argon2" },
      { name: "bcrypt", kind: "standard", note: "The long-standing slow, salted password hash.", href: "https://en.wikipedia.org/wiki/Bcrypt" },
      { name: "Have I Been Pwned", kind: "service", note: "Check passwords against known breaches.", href: "https://haveibeenpwned.com/Passwords" },
    ],
  },
  "security/jwt": {
    lead: "JWTs carry identity between services; the libraries decide how safe they are.",
    tools: [
      { name: "jose", kind: "software", note: "A widely used JavaScript JWT/JWS library.", href: "https://github.com/panva/jose" },
      { name: "RFC 7519", kind: "standard", note: "The JSON Web Token spec.", href: "https://www.rfc-editor.org/rfc/rfc7519" },
      { name: "jwt.io", kind: "software", note: "Decode a token and see its header and claims.", href: "https://jwt.io/" },
    ],
  },
  "security/csrf": {
    lead: "Frameworks and browsers now ship most CSRF defenses by default.",
    tools: [
      { name: "SameSite cookies", kind: "standard", note: "Browsers default to Lax, blocking most cross-site POSTs.", href: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#samesitesamesite-value" },
      { name: "OWASP CSRF cheat sheet", kind: "standard", note: "Tokens, origin checks and their trade-offs.", href: "https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html" },
      { name: "Django CSRF", kind: "software", note: "Token middleware on by default.", href: "https://docs.djangoproject.com/en/stable/ref/csrf/" },
    ],
  },
  "security/sql-injection": {
    lead: "Parameterized queries are built into every major driver and ORM.",
    tools: [
      { name: "node-postgres", kind: "software", note: "Placeholders like $1 are sent separately from the SQL.", href: "https://node-postgres.com/features/queries" },
      { name: "sqlmap", kind: "software", note: "Finds injection flaws in testing.", href: "https://sqlmap.org/" },
      { name: "OWASP SQL injection", kind: "standard", note: "Prevention cheat sheet.", href: "https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html" },
    ],
  },
  "frontend/rendering-pipeline": {
    lead: "Browser devtools show exactly which pipeline stages each frame runs.",
    tools: [
      { name: "Chrome DevTools Performance", kind: "software", note: "Layout, paint and composite per frame.", href: "https://developer.chrome.com/docs/devtools/performance" },
      { name: "CSS Triggers", kind: "standard", note: "Which properties trigger layout, paint or composite.", href: "https://web.dev/articles/rendering-performance" },
      { name: "Firefox Profiler", kind: "software", note: "Frame-by-frame timing in Firefox.", href: "https://profiler.firefox.com/" },
    ],
  },
  "frontend/browser-event-loop": {
    lead: "Every browser follows the same HTML event loop spec.",
    tools: [
      { name: "HTML event loop spec", kind: "standard", note: "Tasks, microtasks and rendering steps.", href: "https://html.spec.whatwg.org/multipage/webappapis.html#event-loops" },
      { name: "Loupe", kind: "software", note: "Visualizes the call stack and queues.", href: "http://latentflip.com/loupe/" },
      { name: "queueMicrotask", kind: "platform", note: "Schedule a microtask directly.", href: "https://developer.mozilla.org/en-US/docs/Web/API/Window/queueMicrotask" },
    ],
  },
  "frontend/hydration": {
    lead: "Modern frameworks compete on how little they hydrate.",
    tools: [
      { name: "React Server Components", kind: "software", note: "Server-only components ship no client JS.", href: "https://react.dev/reference/rsc/server-components" },
      { name: "Astro islands", kind: "software", note: "Hydrate only the interactive parts.", href: "https://docs.astro.build/en/concepts/islands/" },
      { name: "Qwik", kind: "software", note: "Resumability instead of hydration.", href: "https://qwik.dev/docs/concepts/resumable/" },
    ],
  },
  "frontend/core-web-vitals": {
    lead: "Core Web Vitals are measured in the field and in the lab.",
    tools: [
      { name: "PageSpeed Insights", kind: "software", note: "Real-user LCP, INP and CLS for a URL.", href: "https://pagespeed.web.dev/" },
      { name: "web-vitals", kind: "software", note: "Measure the vitals in your own analytics.", href: "https://github.com/GoogleChrome/web-vitals" },
      { name: "Lighthouse", kind: "software", note: "Lab audits with fix suggestions.", href: "https://developer.chrome.com/docs/lighthouse/overview" },
    ],
  },
  "frontend/flexbox": {
    lead: "Flexbox is the default for one-dimensional layout in every browser.",
    tools: [
      { name: "CSS Flexbox spec", kind: "standard", note: "The flex sizing algorithm in full.", href: "https://www.w3.org/TR/css-flexbox-1/#resolve-flexible-lengths" },
      { name: "Flexbox Froggy", kind: "software", note: "A game for learning flex properties.", href: "https://flexboxfroggy.com/" },
      { name: "MDN flexbox guide", kind: "standard", note: "Controlling ratios of flex items.", href: "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_flexible_box_layout/Controlling_ratios_of_flex_items_along_the_main_axis" },
    ],
  },
  "devops/probes": {
    lead: "Probes are how Kubernetes decides to route to or restart a container.",
    tools: [
      { name: "Kubernetes probes", kind: "software", note: "Liveness, readiness and startup probes.", href: "https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/" },
      { name: "Spring Boot Actuator", kind: "software", note: "Ready-made /liveness and /readiness endpoints.", href: "https://docs.spring.io/spring-boot/reference/actuator/endpoints.html#actuator.endpoints.kubernetes-probes" },
      { name: "AWS ALB health checks", kind: "service", note: "The same idea at the load balancer.", href: "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html" },
    ],
  },
  "devops/resource-limits": {
    lead: "Requests and limits are enforced by the kernel through cgroups.",
    tools: [
      { name: "Kubernetes resources", kind: "software", note: "Requests, limits and QoS classes.", href: "https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/" },
      { name: "Vertical Pod Autoscaler", kind: "software", note: "Recommends requests from real usage.", href: "https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler" },
      { name: "cAdvisor", kind: "software", note: "Per-container memory and CPU throttling metrics.", href: "https://github.com/google/cadvisor" },
    ],
  },
  "devops/ip-subnets": {
    lead: "Every cloud network starts with a CIDR block.",
    tools: [
      { name: "AWS VPC sizing", kind: "service", note: "Plan VPC and subnet CIDR blocks.", href: "https://docs.aws.amazon.com/vpc/latest/userguide/vpc-cidr-blocks.html" },
      { name: "RFC 1918", kind: "standard", note: "The private address ranges.", href: "https://www.rfc-editor.org/rfc/rfc1918" },
      { name: "ipcalc", kind: "software", note: "Subnet maths on the command line.", href: "https://gitlab.com/ipcalc/ipcalc" },
    ],
  },
  "devops/git-internals": {
    lead: "Every Git host stores the same content-addressed objects.",
    tools: [
      { name: "Git internals", kind: "software", note: "The Pro Git chapter on objects.", href: "https://git-scm.com/book/en/v2/Git-Internals-Git-Objects" },
      { name: "GitHub", kind: "platform", note: "Hosts Git repositories and pull requests.", href: "https://github.com/" },
      { name: "git cat-file", kind: "software", note: "Inspect any object by its hash.", href: "https://git-scm.com/docs/git-cat-file" },
    ],
  },
  "devops/terraform-plan-apply": {
    lead: "Infrastructure as code tools all follow plan, review, apply.",
    tools: [
      { name: "Terraform", kind: "software", note: "HashiCorp's plan/apply workflow.", href: "https://developer.hashicorp.com/terraform/cli/commands/plan" },
      { name: "OpenTofu", kind: "software", note: "The open-source Terraform fork.", href: "https://opentofu.org/" },
      { name: "Atlantis", kind: "software", note: "Posts plans on pull requests.", href: "https://www.runatlantis.io/" },
    ],
  },
  "devops/slos-error-budgets": {
    lead: "SLOs are built into most observability platforms.",
    tools: [
      { name: "Google SRE book", kind: "standard", note: "The chapter that defined error budgets.", href: "https://sre.google/sre-book/embracing-risk/" },
      { name: "Sloth", kind: "software", note: "Generates Prometheus SLO and burn-rate rules.", href: "https://sloth.dev/" },
      { name: "Datadog SLOs", kind: "service", note: "Track SLOs and budgets in Datadog.", href: "https://docs.datadoghq.com/service_management/service_level_objectives/" },
    ],
  },
  "ai/react-loop": {
    lead: "Most agent frameworks run a version of this loop.",
    tools: [
      { name: "ReAct paper", kind: "standard", note: "Reasoning and acting, Yao et al.", href: "https://arxiv.org/abs/2210.03629" },
      { name: "LangGraph", kind: "software", note: "Build agent loops as graphs.", href: "https://langchain-ai.github.io/langgraph/" },
      { name: "Claude Agent SDK", kind: "software", note: "Anthropic's agent loop with tools.", href: "https://docs.claude.com/en/api/agent-sdk/overview" },
    ],
  },
  "ai/what-is-a-model": {
    lead: "Every library fits parameters to data; the shapes range from a line to a transformer.",
    tools: [
      { name: "scikit-learn", kind: "software", note: "Linear models, trees and more, each with a fit() that sets the parameters.", href: "https://github.com/scikit-learn/scikit-learn" },
      { name: "PyTorch", kind: "software", note: "Build any shape from layers; autograd fits the parameters.", href: "https://github.com/pytorch/pytorch" },
      { name: "TensorFlow Playground", kind: "software", note: "Watch a small network's parameters move as it trains, in the browser.", href: "https://playground.tensorflow.org" },
      { name: "Hugging Face Hub", kind: "service", note: "Where trained parameters, the weights, are published and downloaded.", href: "https://huggingface.co/models" },
    ],
  },
  "ai/learning-types": {
    lead: "The three kinds of learning each have their own libraries and their own benchmarks.",
    tools: [
      { name: "scikit-learn", kind: "software", note: "Supervised classifiers and unsupervised clustering, including the perceptron and k-means.", href: "https://github.com/scikit-learn/scikit-learn" },
      { name: "Gymnasium", kind: "software", note: "Standard environments for reinforcement learning agents.", href: "https://github.com/Farama-Foundation/Gymnasium" },
      { name: "Stable-Baselines3", kind: "software", note: "Reliable implementations of reinforcement learning algorithms.", href: "https://github.com/DLR-RM/stable-baselines3" },
      { name: "TRL", kind: "software", note: "Supervised fine-tuning and RLHF for language models, the same ideas at LLM scale.", href: "https://github.com/huggingface/trl" },
    ],
  },
  "ai/fine-tuning": {
    lead: "Hosted APIs fine-tune from a file of examples; open models fine-tune with a few libraries.",
    tools: [
      { name: "OpenAI fine-tuning", kind: "service", note: "Upload examples, pick epochs, get a model id to call.", href: "https://platform.openai.com/docs/guides/model-optimization" },
      { name: "Google Vertex AI tuning", kind: "service", note: "Supervised tuning of Gemini models on your examples.", href: "https://cloud.google.com/vertex-ai/generative-ai/docs/models/tune-models" },
      { name: "Hugging Face TRL", kind: "software", note: "Supervised fine-tuning for open models.", href: "https://github.com/huggingface/trl" },
      { name: "Axolotl", kind: "software", note: "Config-driven fine-tuning of open models.", href: "https://github.com/axolotl-ai-cloud/axolotl" },
      { name: "Unsloth", kind: "software", note: "Faster, lower-memory fine-tuning on one GPU.", href: "https://github.com/unslothai/unsloth" },
    ],
  },
  "ai/distillation": {
    lead: "Distillation is how most small models are made, from logit matching to training on a teacher's outputs.",
    tools: [
      { name: "Distilling the Knowledge in a Neural Network", kind: "standard", note: "Hinton, Vinyals and Dean, 2015: soft targets at a temperature.", href: "https://arxiv.org/abs/1503.02531" },
      { name: "DistilBERT", kind: "standard", note: "Sanh et al., 2019: a 40% smaller BERT keeping 97% of its ability.", href: "https://arxiv.org/abs/1910.01108" },
      { name: "OpenAI model distillation", kind: "service", note: "Capture a large model's outputs and fine-tune a smaller one on them.", href: "https://platform.openai.com/docs/guides/distillation" },
      { name: "Gemma", kind: "software", note: "Google's small open models, trained with distillation from larger ones.", href: "https://github.com/google-deepmind/gemma" },
      { name: "DeepSeek-R1 distilled models", kind: "software", note: "Small models trained on a reasoning model's outputs.", href: "https://github.com/deepseek-ai/DeepSeek-R1" },
    ],
  },
  "ai/synthetic-data": {
    lead: "Synthetic data pipelines generate, filter and verify; the research names the trap.",
    tools: [
      { name: "The Curse of Recursion", kind: "standard", note: "Shumailov et al., 2023 (Nature, 2024): models trained on generated data forget the tails (model collapse).", href: "https://arxiv.org/abs/2305.17493" },
      { name: "Self-Instruct", kind: "standard", note: "Wang et al., 2022: bootstrapping instruction data from a model's own outputs.", href: "https://arxiv.org/abs/2212.10560" },
      { name: "distilabel", kind: "software", note: "Pipelines for generating and judging synthetic datasets.", href: "https://github.com/argilla-io/distilabel" },
      { name: "Cosmopedia", kind: "standard", note: "A 25-billion-token synthetic textbook dataset, with its generation recipe.", href: "https://huggingface.co/datasets/HuggingFaceTB/cosmopedia" },
      { name: "Argilla", kind: "software", note: "Review and label generated examples before training on them.", href: "https://github.com/argilla-io/argilla" },
    ],
  },
  "ai-native/streaming-ui": {
    lead: "AI SDKs ship partial-object streaming helpers.",
    tools: [
      { name: "Vercel AI SDK", kind: "software", note: "streamObject renders partial JSON.", href: "https://ai-sdk.dev/docs/ai-sdk-ui/object-generation" },
      { name: "partial-json", kind: "software", note: "Parse incomplete JSON.", href: "https://www.npmjs.com/package/partial-json" },
      { name: "Server-Sent Events", kind: "standard", note: "The usual transport for token streams.", href: "https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events" },
    ],
  },
  "ai-automation/retries-errors": {
    lead: "Workflow tools have retries built in; the policy is yours to set.",
    tools: [
      { name: "Temporal", kind: "software", note: "Retry policies per activity.", href: "https://docs.temporal.io/encyclopedia/retry-policies" },
      { name: "n8n", kind: "software", note: "Retry on fail and error workflows.", href: "https://docs.n8n.io/flow-logic/error-handling/" },
      { name: "AWS backoff and jitter", kind: "standard", note: "Why jitter matters.", href: "https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/" },
    ],
  },
  "ai-automation/confidence-fallbacks": {
    lead: "Human review queues are a standard part of document automation.",
    tools: [
      { name: "Amazon A2I", kind: "service", note: "Human review for low-confidence predictions.", href: "https://aws.amazon.com/augmented-ai/" },
      { name: "Label Studio", kind: "software", note: "Review and correct model outputs.", href: "https://labelstud.io/" },
      { name: "Azure Document Intelligence", kind: "service", note: "Field-level confidence scores.", href: "https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/concept/accuracy-confidence" },
    ],
  },
  "tools/model-routers": {
    lead: "Routers and gateways put many providers behind one API.",
    tools: [
      { name: "OpenRouter", kind: "service", note: "One API for hundreds of models, with fallbacks.", href: "https://openrouter.ai/docs/features/model-routing" },
      { name: "LiteLLM", kind: "software", note: "Self-hosted proxy with fallbacks and budgets.", href: "https://docs.litellm.ai/docs/routing" },
      { name: "Cloudflare AI Gateway", kind: "service", note: "Caching, retries and fallbacks.", href: "https://developers.cloudflare.com/ai-gateway/" },
    ],
  },
  "system-design/citations": {
    lead: "RAG frameworks keep source metadata on every chunk; some model APIs return citations as structured data.",
    tools: [
      { name: "Anthropic citations", kind: "service", note: "The model returns each claim with the exact passages it came from.", href: "https://docs.anthropic.com/en/docs/build-with-claude/citations" },
      { name: "LlamaIndex citation query engine", kind: "software", note: "Splits sources into numbered chunks and asks for inline references.", href: "https://github.com/run-llama/llama_index" },
      { name: "RAGAS faithfulness", kind: "software", note: "Measures whether each claim in an answer is supported by the retrieved context.", href: "https://github.com/explodinggradients/ragas" },
      { name: "Vectara HHEM", kind: "software", note: "An open model that scores whether a text is supported by its source.", href: "https://huggingface.co/vectara/hallucination_evaluation_model" },
    ],
  },
  "system-design/incremental-indexing": {
    lead: "Change data capture and upsert-friendly vector stores make indexing incremental; content hashes keep it cheap.",
    tools: [
      { name: "Debezium", kind: "software", note: "Streams inserts, updates and deletes from a database's log as events.", href: "https://github.com/debezium/debezium" },
      { name: "pgvector", kind: "software", note: "Vectors in Postgres, updated in the same transaction as the source rows.", href: "https://github.com/pgvector/pgvector" },
      { name: "Qdrant", kind: "software", note: "A vector database with upserts and deletes by id and payload filters.", href: "https://github.com/qdrant/qdrant" },
      { name: "LlamaIndex ingestion pipeline", kind: "software", note: "Caches each node by content hash so unchanged chunks aren't re-embedded.", href: "https://docs.llamaindex.ai/en/stable/module_guides/loading/ingestion_pipeline/" },
    ],
  },
  "system-design/re-embedding": {
    lead: "Vector databases support the pattern directly: a second collection, an alias, and an atomic switch.",
    tools: [
      { name: "Qdrant collection aliases", kind: "software", note: "Point an alias at the new collection in one call; switch back the same way.", href: "https://qdrant.tech/documentation/concepts/collections/#collection-aliases" },
      { name: "Elasticsearch index aliases", kind: "software", note: "Reindex into a new index and move the alias atomically.", href: "https://www.elastic.co/guide/en/elasticsearch/reference/current/aliases.html" },
      { name: "MTEB leaderboard", kind: "standard", note: "Benchmarks for embedding models; a starting point, not a substitute for your own eval.", href: "https://huggingface.co/spaces/mteb/leaderboard" },
      { name: "Weaviate", kind: "software", note: "A vector database with named vectors, so two embeddings can live side by side.", href: "https://github.com/weaviate/weaviate" },
    ],
  },
  "system-design/inference-batching": {
    lead: "Open-source inference servers do continuous batching and paged KV caches out of the box.",
    tools: [
      { name: "vLLM", kind: "software", note: "Continuous batching with PagedAttention for the KV cache.", href: "https://github.com/vllm-project/vllm" },
      { name: "Text Generation Inference", kind: "software", note: "Hugging Face's server with continuous batching and token streaming.", href: "https://github.com/huggingface/text-generation-inference" },
      { name: "SGLang", kind: "software", note: "A fast serving engine with prefix caching and continuous batching.", href: "https://github.com/sgl-project/sglang" },
      { name: "NVIDIA TensorRT-LLM", kind: "software", note: "Optimised kernels and in-flight batching on NVIDIA GPUs.", href: "https://github.com/NVIDIA/TensorRT-LLM" },
    ],
  },
  "system-design/provider-limits": {
    lead: "Every provider publishes its limits; gateways put a shared limiter, priorities and fallbacks in front of them.",
    tools: [
      { name: "Anthropic rate limits", kind: "standard", note: "Requests, input tokens and output tokens per minute, by tier, with Retry-After on 429.", href: "https://docs.anthropic.com/en/api/rate-limits" },
      { name: "OpenAI rate limits", kind: "standard", note: "RPM and TPM per model and tier, and how to handle 429s.", href: "https://platform.openai.com/docs/guides/rate-limits" },
      { name: "LiteLLM", kind: "software", note: "A gateway with per-key limits, retries, and fallbacks across providers.", href: "https://github.com/BerriAI/litellm" },
      { name: "Envoy AI Gateway", kind: "software", note: "Token-based rate limiting and provider fallback on Envoy.", href: "https://github.com/envoyproxy/ai-gateway" },
    ],
  },
  "system-design/streaming-responses": {
    lead: "Streaming has to be enabled at every hop.",
    tools: [
      { name: "Server-Sent Events", kind: "standard", note: "text/event-stream from server to browser.", href: "https://html.spec.whatwg.org/multipage/server-sent-events.html" },
      { name: "Nginx proxy_buffering", kind: "software", note: "Turn buffering off for streams.", href: "https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_buffering" },
      { name: "Anthropic streaming", kind: "service", note: "Streaming Messages API events.", href: "https://docs.claude.com/en/docs/build-with-claude/streaming" },
    ],
  },
  "dsa/heap-top-k": {
    lead: "Heaps back every priority queue.",
    tools: [
      { name: "Python heapq", kind: "software", note: "heappush, heappop and nlargest.", href: "https://docs.python.org/3/library/heapq.html" },
      { name: "Java PriorityQueue", kind: "software", note: "A binary heap in the standard library.", href: "https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/PriorityQueue.html" },
      { name: "Kafka Streams top-N", kind: "software", note: "Top-k over an endless stream.", href: "https://kafka.apache.org/documentation/streams/" },
    ],
  },
  "dsa/fast-slow-pointers": {
    lead: "Floyd's trick appears wherever memory is tight.",
    tools: [
      { name: "Floyd's cycle detection", kind: "standard", note: "The tortoise and hare algorithm.", href: "https://en.wikipedia.org/wiki/Cycle_detection#Floyd's_tortoise_and_hare" },
      { name: "Pollard's rho", kind: "standard", note: "Factoring integers with the same idea.", href: "https://en.wikipedia.org/wiki/Pollard%27s_rho_algorithm" },
      { name: "Linux list debugging", kind: "software", note: "Kernel list-corruption checks.", href: "https://www.kernel.org/doc/html/latest/core-api/kernel-api.html#list-management-functions" },
    ],
  },
  "dsa/trie": {
    lead: "Tries power prefix search in many systems.",
    tools: [
      { name: "Redis autocomplete", kind: "software", note: "FT.SUGGET prefix suggestions.", href: "https://redis.io/docs/latest/commands/ft.sugget/" },
      { name: "Linux routing (LC-trie)", kind: "software", note: "IP lookups use a compressed trie.", href: "https://www.kernel.org/doc/html/latest/networking/fib_trie.html" },
      { name: "marisa-trie", kind: "software", note: "A compact static trie library.", href: "https://github.com/s-yata/marisa-trie" },
    ],
  },
  "dsa/union-find": {
    lead: "Union-find shows up in graphs, images and compilers.",
    tools: [
      { name: "Kruskal's algorithm", kind: "standard", note: "Minimum spanning trees with union-find.", href: "https://en.wikipedia.org/wiki/Kruskal%27s_algorithm" },
      { name: "scipy connected_components", kind: "software", note: "Graph components in SciPy.", href: "https://docs.scipy.org/doc/scipy/reference/generated/scipy.sparse.csgraph.connected_components.html" },
      { name: "NetworkX UnionFind", kind: "software", note: "A ready-made disjoint set.", href: "https://networkx.org/documentation/stable/reference/utils.html" },
    ],
  },
  "dsa/prefix-sum": {
    lead: "Running totals hide inside databases and image libraries.",
    tools: [
      { name: "NumPy cumsum", kind: "software", note: "Prefix sums in one call.", href: "https://numpy.org/doc/stable/reference/generated/numpy.cumsum.html" },
      { name: "OpenCV integral image", kind: "software", note: "2D prefix sums for fast box filters.", href: "https://docs.opencv.org/4.x/d7/d1b/group__imgproc__misc.html" },
      { name: "SQL window SUM", kind: "standard", note: "SUM() OVER (ORDER BY \u2026) is a prefix sum.", href: "https://www.postgresql.org/docs/current/tutorial-window.html" },
    ],
  },
  "dsa/merge-intervals": {
    lead: "Interval merging runs in calendars and genome tools.",
    tools: [
      { name: "Google Calendar free/busy", kind: "service", note: "Merges busy blocks across calendars.", href: "https://developers.google.com/calendar/api/v3/reference/freebusy" },
      { name: "bedtools merge", kind: "software", note: "Merges overlapping genome ranges.", href: "https://bedtools.readthedocs.io/en/latest/content/tools/merge.html" },
      { name: "PostgreSQL range types", kind: "software", note: "Ranges with overlap operators.", href: "https://www.postgresql.org/docs/current/rangetypes.html" },
    ],
  },
  "dsa/backtracking": {
    lead: "Backtracking is the core of constraint solvers.",
    tools: [
      { name: "Sudoku solvers", kind: "standard", note: "Classic backtracking with pruning.", href: "https://en.wikipedia.org/wiki/Sudoku_solving_algorithms#Backtracking" },
      { name: "OR-Tools CP-SAT", kind: "software", note: "Google's constraint solver.", href: "https://developers.google.com/optimization/cp" },
      { name: "Prolog", kind: "software", note: "A language built on backtracking search.", href: "https://www.swi-prolog.org/" },
    ],
  },
  "dsa/dijkstra": {
    lead: "Shortest-path search runs maps and networks.",
    tools: [
      { name: "OSRM", kind: "software", note: "Open-source route planning on OpenStreetMap.", href: "https://project-osrm.org/" },
      { name: "OSPF", kind: "protocol", note: "Routers run Dijkstra on the link-state map.", href: "https://www.rfc-editor.org/rfc/rfc2328" },
      { name: "NetworkX shortest paths", kind: "software", note: "dijkstra_path and friends.", href: "https://networkx.org/documentation/stable/reference/algorithms/shortest_paths.html" },
    ],
  },
  "dsa/topological-sort": {
    lead: "Every build and package tool sorts dependencies.",
    tools: [
      { name: "make", kind: "software", note: "Builds targets in dependency order.", href: "https://www.gnu.org/software/make/manual/make.html" },
      { name: "Airflow DAGs", kind: "software", note: "Runs tasks once upstream tasks finish.", href: "https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/dags.html" },
      { name: "npm", kind: "software", note: "Installs packages in dependency order.", href: "https://docs.npmjs.com/cli/commands/npm-install" },
    ],
  },
  "dsa/lru-cache": {
    lead: "LRU and its approximations sit in front of most slow storage.",
    tools: [
      { name: "Redis eviction", kind: "software", note: "allkeys-lru, approximated by sampling.", href: "https://redis.io/docs/latest/develop/reference/eviction/" },
      { name: "lru-cache (npm)", kind: "software", note: "The common Node.js LRU.", href: "https://www.npmjs.com/package/lru-cache" },
      { name: "functools.lru_cache", kind: "software", note: "Memoise Python functions.", href: "https://docs.python.org/3/library/functools.html#functools.lru_cache" },
    ],
  },
  "system-design/autoscaling": {
    lead: "Every cloud has an autoscaler; the policy is the hard part.",
    tools: [
      { name: "Kubernetes HPA", kind: "software", note: "Scale pods on CPU or custom metrics.", href: "https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/" },
      { name: "AWS Auto Scaling", kind: "service", note: "Target tracking, step and scheduled policies.", href: "https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-target-tracking.html" },
      { name: "KEDA", kind: "software", note: "Scale on queue length and events.", href: "https://keda.sh/" },
    ],
  },
  "system-design/delivery-guarantees": {
    lead: "Queues give you at-least-once; consumers make it safe.",
    tools: [
      { name: "Kafka delivery semantics", kind: "software", note: "At-most, at-least and exactly-once.", href: "https://kafka.apache.org/documentation/#semantics" },
      { name: "Amazon SQS", kind: "service", note: "At-least-once standard queues, FIFO with dedupe.", href: "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-exactly-once-processing.html" },
      { name: "RabbitMQ acks", kind: "software", note: "Consumer acknowledgements and redelivery.", href: "https://www.rabbitmq.com/docs/confirms" },
    ],
  },
  "system-design/tool-execution": {
    lead: "Code-execution sandboxes for agents are built from the same isolation pieces as any multi-tenant platform.",
    tools: [
      { name: "gVisor", kind: "software", note: "A user-space kernel that sits between a container and the host kernel.", href: "https://github.com/google/gvisor" },
      { name: "Firecracker", kind: "software", note: "MicroVMs that start in about 125 ms, used by AWS Lambda.", href: "https://github.com/firecracker-microvm/firecracker" },
      { name: "E2B", kind: "software", note: "Open-source sandboxes for running AI-generated code in Firecracker microVMs.", href: "https://github.com/e2b-dev/E2B" },
      { name: "nsjail", kind: "software", note: "Process isolation with namespaces, seccomp and resource limits.", href: "https://github.com/google/nsjail" },
      { name: "OWASP Top 10 for LLM Applications", kind: "standard", note: "Excessive agency and insecure output handling, with mitigations.", href: "https://genai.owasp.org/llm-top-10/" },
    ],
  },
  "system-design/agent-state-machines": {
    lead: "Graph and state-machine frameworks make an agent's steps explicit, persisted and resumable.",
    tools: [
      { name: "LangGraph", kind: "software", note: "Agents as graphs of nodes and edges, with checkpoints and human-in-the-loop interrupts.", href: "https://github.com/langchain-ai/langgraph" },
      { name: "XState", kind: "software", note: "State machines and statecharts with typed events and visual inspection.", href: "https://github.com/statelyai/xstate" },
      { name: "AWS Step Functions", kind: "service", note: "Workflows as states and transitions, with waits for callbacks lasting up to a year.", href: "https://aws.amazon.com/step-functions/" },
      { name: "Building effective agents", kind: "standard", note: "Anthropic's guide: when to use fixed workflows and when to let the model decide.", href: "https://www.anthropic.com/engineering/building-effective-agents" },
    ],
  },
  "system-design/task-planning": {
    lead: "Planning patterns are documented in research and built into agent frameworks.",
    tools: [
      { name: "Plan-and-Solve prompting", kind: "standard", note: "Wang et al., 2023: ask for a plan first, then execute it, instead of reasoning step by step.", href: "https://arxiv.org/abs/2305.04091" },
      { name: "LLMCompiler", kind: "standard", note: "Kim et al., 2023: plan a graph of tool calls and run independent ones in parallel.", href: "https://arxiv.org/abs/2312.04511" },
      { name: "LangGraph", kind: "software", note: "Plan-and-execute and replanning agents as graphs.", href: "https://github.com/langchain-ai/langgraph" },
      { name: "Apache Airflow", kind: "software", note: "The classic task-dependency scheduler: DAGs, retries and parallel tasks.", href: "https://github.com/apache/airflow" },
    ],
  },
  "system-design/multi-agent": {
    lead: "Orchestrator-worker setups are the common production pattern; frameworks provide hand-offs and shared state.",
    tools: [
      { name: "How we built our multi-agent research system", kind: "standard", note: "Anthropic's write-up of a lead agent with parallel subagents, and what it costs.", href: "https://www.anthropic.com/engineering/multi-agent-research-system" },
      { name: "OpenAI Agents SDK", kind: "software", note: "Agents, hand-offs between them, and guardrails.", href: "https://github.com/openai/openai-agents-python" },
      { name: "AutoGen", kind: "software", note: "Microsoft's framework for conversations between multiple agents.", href: "https://github.com/microsoft/autogen" },
      { name: "CrewAI", kind: "software", note: "Role-based agent teams with sequential or hierarchical processes.", href: "https://github.com/crewAIInc/crewAI" },
    ],
  },
  "system-design/durable-execution": {
    lead: "Durable execution engines record each step so a workflow survives crashes; idempotency keys close the last gap.",
    tools: [
      { name: "Temporal", kind: "software", note: "Workflows as code with an event history; a new worker replays it and continues.", href: "https://github.com/temporalio/temporal" },
      { name: "Restate", kind: "software", note: "Durable execution for functions and agents, with journaled side effects.", href: "https://github.com/restatedev/restate" },
      { name: "AWS Step Functions", kind: "service", note: "Managed state machines that persist every transition.", href: "https://aws.amazon.com/step-functions/" },
      { name: "Inngest", kind: "software", note: "Durable steps for background jobs and AI workflows, retried individually.", href: "https://github.com/inngest/inngest" },
      { name: "Stripe idempotent requests", kind: "standard", note: "The Idempotency-Key header: retry a charge without charging twice.", href: "https://docs.stripe.com/api/idempotent_requests" },
    ],
  },
  "system-design/sagas-outbox": {
    lead: "Workflow engines run sagas; CDC tools relay outboxes.",
    tools: [
      { name: "Temporal", kind: "software", note: "Durable orchestration with compensation.", href: "https://docs.temporal.io/" },
      { name: "AWS Step Functions", kind: "service", note: "Orchestrated sagas with catch and retry.", href: "https://docs.aws.amazon.com/step-functions/latest/dg/welcome.html" },
      { name: "Debezium outbox", kind: "software", note: "Relays outbox rows to Kafka via CDC.", href: "https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html" },
    ],
  },
  "databases/connection-pooling": {
    lead: "Poolers sit between apps and Postgres in most production setups.",
    tools: [
      { name: "PgBouncer", kind: "software", note: "Lightweight Postgres connection pooler.", href: "https://www.pgbouncer.org/" },
      { name: "Amazon RDS Proxy", kind: "service", note: "Managed pooling for RDS and Aurora.", href: "https://aws.amazon.com/rds/proxy/" },
      { name: "Supavisor", kind: "software", note: "Supabase's pooler; limits come with the compute size.", href: "https://supabase.com/docs/guides/database/connecting-to-postgres" },
      { name: "Neon pooling", kind: "service", note: "PgBouncer in transaction mode, up to 10,000 clients.", href: "https://neon.com/docs/connect/connection-pooling" },
      { name: "HikariCP", kind: "software", note: "The standard JVM connection pool.", href: "https://github.com/brettwooldridge/HikariCP" },
    ],
  },
  "databases/join-algorithms": {
    lead: "Every SQL planner chooses between these three.",
    tools: [
      { name: "PostgreSQL EXPLAIN", kind: "software", note: "See the join method your query used.", href: "https://www.postgresql.org/docs/current/using-explain.html" },
      { name: "MySQL hash join", kind: "software", note: "Added in MySQL 8.0.18.", href: "https://dev.mysql.com/doc/refman/8.0/en/hash-joins.html" },
      { name: "explain.dalibo.com", kind: "software", note: "Visualise Postgres plans.", href: "https://explain.dalibo.com/" },
    ],
  },
  "networking/nat": {
    lead: "NAT is in every home router and cloud network.",
    tools: [
      { name: "AWS NAT gateway", kind: "service", note: "Outbound internet for private subnets.", href: "https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html" },
      { name: "RFC 3022", kind: "standard", note: "Traditional NAT.", href: "https://www.rfc-editor.org/rfc/rfc3022" },
      { name: "STUN (RFC 8489)", kind: "protocol", note: "Lets peers discover their public address.", href: "https://www.rfc-editor.org/rfc/rfc8489" },
    ],
  },
  "operating-systems/virtual-memory": {
    lead: "Every modern OS and CPU translates addresses this way.",
    tools: [
      { name: "Linux memory management", kind: "software", note: "Page tables, the TLB and page faults.", href: "https://www.kernel.org/doc/html/latest/admin-guide/mm/concepts.html" },
      { name: "perf", kind: "software", note: "Count TLB misses and page faults.", href: "https://perf.wiki.kernel.org/" },
      { name: "Huge pages", kind: "software", note: "2 MB pages to cut TLB misses.", href: "https://www.kernel.org/doc/html/latest/admin-guide/mm/hugetlbpage.html" },
    ],
  },
  "frontend/css-grid": {
    lead: "Grid is supported in every modern browser.",
    tools: [
      { name: "MDN CSS Grid", kind: "standard", note: "The full guide.", href: "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout" },
      { name: "Grid Garden", kind: "software", note: "A game for learning grid.", href: "https://cssgridgarden.com/" },
      { name: "Firefox grid inspector", kind: "software", note: "Overlay grid lines in devtools.", href: "https://firefox-source-docs.mozilla.org/devtools-user/page_inspector/how_to/examine_grid_layouts/" },
    ],
  },
  "frontend/promises-async": {
    lead: "async/await is built into every JavaScript runtime.",
    tools: [
      { name: "MDN async function", kind: "standard", note: "How await suspends a function.", href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function" },
      { name: "Promise.all", kind: "standard", note: "Run independent promises together.", href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all" },
      { name: "Chrome DevTools async stacks", kind: "software", note: "Debug across awaits.", href: "https://developer.chrome.com/docs/devtools/javascript/reference" },
    ],
  },
  "security/digital-signatures": {
    lead: "Signatures secure TLS, software updates and tokens.",
    tools: [
      { name: "Ed25519", kind: "standard", note: "Fast modern signatures (RFC 8032).", href: "https://www.rfc-editor.org/rfc/rfc8032" },
      { name: "Sigstore", kind: "software", note: "Sign and verify software artifacts.", href: "https://www.sigstore.dev/" },
      { name: "OpenSSL dgst", kind: "software", note: "Sign and verify files on the command line.", href: "https://docs.openssl.org/master/man1/openssl-dgst/" },
    ],
  },
  "system-design/cache-invalidation": {
    lead: "Every cache layer needs an invalidation story.",
    tools: [
      { name: "Redis", kind: "software", note: "DEL on write, EXPIRE as a backstop.", href: "https://redis.io/docs/latest/commands/expire/" },
      { name: "Memcache at Facebook", kind: "standard", note: "Leases to stop stale sets.", href: "https://www.usenix.org/conference/nsdi13/technical-sessions/presentation/nishtala" },
      { name: "Debezium", kind: "software", note: "Invalidate caches from database change streams.", href: "https://debezium.io/" },
    ],
  },
  "system-design/backpressure": {
    lead: "Every queue and stream library has a backpressure mechanism.",
    tools: [
      { name: "Node.js streams", kind: "software", note: "write() returns false; wait for drain.", href: "https://nodejs.org/en/learn/modules/backpressuring-in-streams" },
      { name: "Reactive Streams", kind: "standard", note: "Demand-based flow control for the JVM.", href: "https://www.reactive-streams.org/" },
      { name: "Kafka consumer lag", kind: "software", note: "Measure how far consumers fall behind.", href: "https://kafka.apache.org/documentation/#monitoring" },
    ],
  },
  "system-design/consensus": {
    lead: "Consensus sits under most coordination services.",
    tools: [
      { name: "etcd", kind: "software", note: "Raft-based store behind Kubernetes.", href: "https://etcd.io/" },
      { name: "Raft visualisation", kind: "standard", note: "The paper and an interactive demo.", href: "https://raft.github.io/" },
      { name: "HashiCorp Consul", kind: "software", note: "Service discovery on Raft.", href: "https://developer.hashicorp.com/consul/docs/architecture/consensus" },
    ],
  },
  "system-design/merkle-trees": {
    lead: "Merkle trees verify and sync data everywhere.",
    tools: [
      { name: "Cassandra repair", kind: "software", note: "Merkle trees find out-of-sync ranges.", href: "https://cassandra.apache.org/doc/latest/cassandra/managing/operating/repair.html" },
      { name: "Git", kind: "software", note: "Commits and trees are a Merkle structure.", href: "https://git-scm.com/book/en/v2/Git-Internals-Git-Objects" },
      { name: "Certificate Transparency", kind: "standard", note: "Inclusion proofs in public logs.", href: "https://certificate.transparency.dev/howctworks/" },
    ],
  },
  "system-design/clocks": {
    lead: "Distributed databases choose a clock to order events.",
    tools: [
      { name: "Lamport 1978", kind: "standard", note: "Time, clocks and the ordering of events.", href: "https://lamport.azurewebsites.net/pubs/time-clocks.pdf" },
      { name: "CockroachDB HLC", kind: "software", note: "Hybrid logical clocks in practice.", href: "https://www.cockroachlabs.com/docs/stable/architecture/transaction-layer" },
      { name: "Google Spanner TrueTime", kind: "service", note: "Bounded clock uncertainty.", href: "https://cloud.google.com/spanner/docs/true-time-external-consistency" },
    ],
  },
  "system-design/deployment-strategies": {
    lead: "Deploy tooling automates these rollouts.",
    tools: [
      { name: "Kubernetes Deployments", kind: "software", note: "Rolling updates by default.", href: "https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-update-deployment" },
      { name: "Argo Rollouts", kind: "software", note: "Canary and blue-green with analysis.", href: "https://argoproj.github.io/rollouts/" },
      { name: "LaunchDarkly", kind: "service", note: "Feature flags to separate deploy from release.", href: "https://launchdarkly.com/" },
    ],
  },
  "system-design/payments-ledgers": {
    lead: "Ledger databases and payment APIs build in double entry and idempotency.",
    tools: [
      { name: "TigerBeetle", kind: "software", note: "A database built for double-entry financial transactions.", href: "https://github.com/tigerbeetle/tigerbeetle" },
      { name: "Formance Ledger", kind: "software", note: "Open-source programmable double-entry ledger.", href: "https://github.com/formancehq/ledger" },
      { name: "Modern Treasury Ledgers", kind: "service", note: "Hosted double-entry ledger API.", href: "https://www.moderntreasury.com/products/ledgers" },
      { name: "Stripe idempotent requests", kind: "service", note: "Idempotency keys on payment API calls.", href: "https://docs.stripe.com/api/idempotent_requests" },
      { name: "PostgreSQL transactions", kind: "software", note: "All entries of a transaction commit together or not at all.", href: "https://www.postgresql.org/docs/current/tutorial-transactions.html" },
    ],
  },
  "system-design/data-pipelines": {
    lead: "Event logs, stream processors and warehouses.",
    tools: [
      { name: "Apache Kafka", kind: "software", note: "The durable event log most pipelines start from.", href: "https://kafka.apache.org/" },
      { name: "Apache Flink", kind: "software", note: "Stream processing with event time, watermarks and late data.", href: "https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/time/" },
      { name: "Apache Beam", kind: "software", note: "One model for batch and streaming, with triggers for late data.", href: "https://beam.apache.org/" },
      { name: "Apache Iceberg", kind: "software", note: "Table format for raw and corrected data on object storage.", href: "https://iceberg.apache.org/" },
      { name: "Google BigQuery", kind: "service", note: "Serverless data warehouse with streaming inserts.", href: "https://cloud.google.com/bigquery" },
    ],
  },
  "system-design/object-storage": {
    lead: "Object stores replicate and erasure-code behind a simple key API.",
    tools: [
      { name: "Amazon S3", kind: "service", note: "Object storage across availability zones.", href: "https://aws.amazon.com/s3/" },
      { name: "Google Cloud Storage", kind: "service", note: "Regional, dual-region and multi-region buckets.", href: "https://cloud.google.com/storage" },
      { name: "Ceph", kind: "software", note: "Open-source storage with replicated and erasure-coded pools.", href: "https://github.com/ceph/ceph" },
      { name: "MinIO", kind: "software", note: "S3-compatible object store with erasure coding.", href: "https://github.com/minio/minio" },
      { name: "SeaweedFS", kind: "software", note: "Blob store with a separate metadata layer.", href: "https://github.com/seaweedfs/seaweedfs" },
    ],
  },
  "system-design/multi-region": {
    lead: "Routing and databases built for several regions.",
    tools: [
      { name: "Amazon Route 53", kind: "service", note: "Latency and geolocation routing with health checks.", href: "https://aws.amazon.com/route53/" },
      { name: "Aurora Global Database", kind: "service", note: "One writer region, read replicas in others.", href: "https://aws.amazon.com/rds/aurora/global-database/" },
      { name: "DynamoDB global tables", kind: "service", note: "Active-active replication with last-writer-wins.", href: "https://aws.amazon.com/dynamodb/global-tables/" },
      { name: "CockroachDB table localities", kind: "software", note: "Pin each row to a home region.", href: "https://www.cockroachlabs.com/docs/stable/table-localities" },
      { name: "Google Cloud Spanner", kind: "service", note: "Synchronous replication across regions.", href: "https://cloud.google.com/spanner" },
    ],
  },
  "system-design/edge-iot": {
    lead: "Messaging, brokers and update systems for device fleets.",
    tools: [
      { name: "MQTT", kind: "protocol", note: "Lightweight publish/subscribe for unreliable networks.", href: "https://mqtt.org/" },
      { name: "Eclipse Mosquitto", kind: "software", note: "Small open-source MQTT broker.", href: "https://github.com/eclipse-mosquitto/mosquitto" },
      { name: "EMQX", kind: "software", note: "MQTT broker for millions of connections.", href: "https://github.com/emqx/emqx" },
      { name: "AWS IoT Core", kind: "service", note: "Managed device connections, shadows and rules.", href: "https://aws.amazon.com/iot-core/" },
      { name: "Mender", kind: "software", note: "Over-the-air updates with A/B partitions and rollback.", href: "https://github.com/mendersoftware/mender" },
      { name: "RAUC", kind: "software", note: "Fail-safe A/B updates for embedded Linux.", href: "https://github.com/rauc/rauc" },
    ],
  },
  "system-design/hedged-requests": {
    lead: "Hedging is built into some RPC frameworks.",
    tools: [
      { name: "The Tail at Scale", kind: "standard", note: "Dean and Barroso on tail latency.", href: "https://research.google/pubs/the-tail-at-scale/" },
      { name: "gRPC hedging", kind: "software", note: "Hedging policy in service config.", href: "https://grpc.io/docs/guides/request-hedging/" },
      { name: "Envoy", kind: "software", note: "Request hedging on timeouts.", href: "https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/http/http_routing#request-hedging" },
    ],
  },
  "security/key-exchange": {
    lead: "Every TLS connection starts with a key exchange.",
    tools: [
      { name: "X25519 (RFC 7748)", kind: "standard", note: "The elliptic-curve exchange TLS 1.3 uses.", href: "https://www.rfc-editor.org/rfc/rfc7748" },
      { name: "Signal protocol", kind: "software", note: "Chains of DH exchanges for messaging.", href: "https://signal.org/docs/" },
      { name: "libsodium", kind: "software", note: "crypto_kx key exchange.", href: "https://doc.libsodium.org/key_exchange" },
    ],
  },
  "security/idor": {
    lead: "Broken object-level authorisation tops the API risk list.",
    tools: [
      { name: "OWASP API1:2023", kind: "standard", note: "Broken Object Level Authorization.", href: "https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/" },
      { name: "Postgres row-level security", kind: "software", note: "Enforce ownership in the database.", href: "https://www.postgresql.org/docs/current/ddl-rowsecurity.html" },
      { name: "Burp Suite Autorize", kind: "software", note: "Replays requests as another user.", href: "https://portswigger.net/bappstore/f9bbac8c4acf4aefa4d7dc92a991af2f" },
    ],
  },
  "security/ssrf": {
    lead: "Cloud metadata endpoints make SSRF especially dangerous.",
    tools: [
      { name: "OWASP SSRF prevention", kind: "standard", note: "Cheat sheet with bypasses.", href: "https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html" },
      { name: "AWS IMDSv2", kind: "service", note: "Token-protected instance metadata.", href: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html" },
      { name: "ssrf-req-filter", kind: "software", note: "Node agent that blocks private IPs.", href: "https://www.npmjs.com/package/ssrf-req-filter" },
    ],
  },
  "databases/window-functions": {
    lead: "Every modern SQL database supports window functions.",
    tools: [
      { name: "PostgreSQL window functions", kind: "software", note: "The tutorial and reference.", href: "https://www.postgresql.org/docs/current/tutorial-window.html" },
      { name: "BigQuery analytic functions", kind: "service", note: "Window functions at warehouse scale.", href: "https://cloud.google.com/bigquery/docs/reference/standard-sql/window-function-calls" },
      { name: "DuckDB", kind: "software", note: "Fast local SQL with QUALIFY.", href: "https://duckdb.org/docs/sql/functions/window_functions" },
    ],
  },
  "databases/lsm-trees": {
    lead: "Most write-heavy databases are built on LSM trees.",
    tools: [
      { name: "RocksDB", kind: "software", note: "The embedded LSM engine behind many databases.", href: "https://rocksdb.org/" },
      { name: "Apache Cassandra", kind: "software", note: "Memtables, SSTables and compaction.", href: "https://cassandra.apache.org/doc/latest/cassandra/architecture/storage-engine.html" },
      { name: "ScyllaDB", kind: "software", note: "An LSM-based Cassandra-compatible store.", href: "https://www.scylladb.com/" },
    ],
  },
  "databases/write-ahead-log": {
    lead: "Every durable database writes a log before data pages.",
    tools: [
      { name: "PostgreSQL WAL", kind: "software", note: "Write-ahead logging and checkpoints.", href: "https://www.postgresql.org/docs/current/wal-intro.html" },
      { name: "SQLite WAL mode", kind: "software", note: "Readers don't block writers.", href: "https://www.sqlite.org/wal.html" },
      { name: "ARIES", kind: "standard", note: "The classic recovery algorithm.", href: "https://cs.stanford.edu/people/chrismre/cs345/rl/aries.pdf" },
    ],
  },
  "databases/read-replicas": {
    lead: "Managed databases make replicas one click; lag is still yours.",
    tools: [
      { name: "Amazon RDS read replicas", kind: "service", note: "Asynchronous replicas for read scaling.", href: "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html" },
      { name: "PostgreSQL streaming replication", kind: "software", note: "WAL shipping to standbys.", href: "https://www.postgresql.org/docs/current/warm-standby.html" },
      { name: "ProxySQL", kind: "software", note: "Route reads and writes for MySQL.", href: "https://proxysql.com/" },
    ],
  },
  "databases/composite-indexes": {
    lead: "Column order in an index decides which queries it helps.",
    tools: [
      { name: "Use The Index, Luke", kind: "standard", note: "The free guide to SQL indexing.", href: "https://use-the-index-luke.com/sql/where-clause/the-equals-operator/concatenated-keys" },
      { name: "PostgreSQL multicolumn indexes", kind: "software", note: "How Postgres uses them.", href: "https://www.postgresql.org/docs/current/indexes-multicolumn.html" },
      { name: "MySQL index merge", kind: "software", note: "When MySQL combines indexes.", href: "https://dev.mysql.com/doc/refman/8.0/en/multiple-column-indexes.html" },
    ],
  },
  "networking/routing": {
    lead: "Every router and cloud network uses longest-prefix routing.",
    tools: [
      { name: "AWS route tables", kind: "service", note: "Longest prefix match in a VPC.", href: "https://docs.aws.amazon.com/vpc/latest/userguide/how-route-tables-work.html" },
      { name: "ip route", kind: "software", note: "See and edit Linux routes.", href: "https://man7.org/linux/man-pages/man8/ip-route.8.html" },
      { name: "BGP (RFC 4271)", kind: "protocol", note: "How networks share routes.", href: "https://www.rfc-editor.org/rfc/rfc4271" },
    ],
  },
  "networking/http2": {
    lead: "Browsers and CDNs negotiate HTTP/2 and HTTP/3 automatically.",
    tools: [
      { name: "RFC 9113 (HTTP/2)", kind: "standard", note: "Streams, frames and HPACK.", href: "https://www.rfc-editor.org/rfc/rfc9113" },
      { name: "RFC 9114 (HTTP/3)", kind: "standard", note: "HTTP over QUIC.", href: "https://www.rfc-editor.org/rfc/rfc9114" },
      { name: "Chrome DevTools Network", kind: "software", note: "The Protocol column shows h2 or h3.", href: "https://developer.chrome.com/docs/devtools/network" },
    ],
  },
  "networking/traceroute": {
    lead: "Path tools are the first step in debugging the network.",
    tools: [
      { name: "traceroute", kind: "software", note: "The classic TTL-based path tracer.", href: "https://man7.org/linux/man-pages/man8/traceroute.8.html" },
      { name: "mtr", kind: "software", note: "Continuous traceroute with loss per hop.", href: "https://github.com/traviscross/mtr" },
      { name: "RIPE Atlas", kind: "service", note: "Traceroutes from probes worldwide.", href: "https://atlas.ripe.net/" },
    ],
  },
  "networking/flow-control": {
    lead: "Flow control is built into TCP and QUIC.",
    tools: [
      { name: "RFC 9293 (TCP)", kind: "standard", note: "The receive window and zero-window probes.", href: "https://www.rfc-editor.org/rfc/rfc9293" },
      { name: "Wireshark", kind: "software", note: "Spot TCP ZeroWindow in captures.", href: "https://www.wireshark.org/" },
      { name: "ss", kind: "software", note: "See socket buffers on Linux.", href: "https://man7.org/linux/man-pages/man8/ss.8.html" },
    ],
  },
  "networking/latency-bandwidth": {
    lead: "CDNs exist because latency beats bandwidth for most web traffic.",
    tools: [
      { name: "Cloudflare", kind: "service", note: "Edge servers close to users.", href: "https://www.cloudflare.com/learning/cdn/what-is-a-cdn/" },
      { name: "High Performance Browser Networking", kind: "standard", note: "Ilya Grigorik's free book.", href: "https://hpbn.co/" },
      { name: "WebPageTest", kind: "service", note: "Waterfalls with real round trips.", href: "https://www.webpagetest.org/" },
    ],
  },
  "operating-systems/memory-hierarchy": {
    lead: "Every performance decision sits on these numbers.",
    tools: [
      { name: "Latency numbers", kind: "standard", note: "Jeff Dean's numbers, updated by year.", href: "https://colin-scott.github.io/personal_website/research/interactive_latency.html" },
      { name: "perf", kind: "software", note: "Measure cache misses on Linux.", href: "https://perf.wiki.kernel.org/" },
      { name: "Intel VTune", kind: "software", note: "Memory access analysis.", href: "https://www.intel.com/content/www/us/en/developer/tools/oneapi/vtune-profiler.html" },
    ],
  },
  "operating-systems/cache-locality": {
    lead: "Data layout decides cache performance.",
    tools: [
      { name: "perf stat", kind: "software", note: "Count cache misses for any program.", href: "https://man7.org/linux/man-pages/man1/perf-stat.1.html" },
      { name: "What every programmer should know about memory", kind: "standard", note: "Ulrich Drepper's classic paper.", href: "https://people.freebsd.org/~lstewart/articles/cpumemory.pdf" },
      { name: "Apache Arrow", kind: "software", note: "Columnar memory layout for analytics.", href: "https://arrow.apache.org/" },
    ],
  },
  "operating-systems/producer-consumer": {
    lead: "Blocking queues implement this pattern for you.",
    tools: [
      { name: "Java BlockingQueue", kind: "software", note: "Bounded producer-consumer queues.", href: "https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/BlockingQueue.html" },
      { name: "Go channels", kind: "software", note: "Buffered channels block when full.", href: "https://go.dev/tour/concurrency/3" },
      { name: "Python queue", kind: "software", note: "Thread-safe queue.Queue.", href: "https://docs.python.org/3/library/queue.html" },
    ],
  },
  "operating-systems/epoll": {
    lead: "Every high-concurrency server waits on sockets this way.",
    tools: [
      { name: "epoll(7)", kind: "software", note: "The Linux readiness API.", href: "https://man7.org/linux/man-pages/man7/epoll.7.html" },
      { name: "libuv", kind: "software", note: "The event loop under Node.js.", href: "https://libuv.org/" },
      { name: "io_uring", kind: "software", note: "Linux's newer async I/O interface.", href: "https://kernel.dk/io_uring.pdf" },
    ],
  },
  "operating-systems/gc": {
    lead: "Managed runtimes all trace the heap; some also count references.",
    tools: [
      { name: "V8 Orinoco", kind: "software", note: "JavaScript's concurrent garbage collector.", href: "https://v8.dev/blog/trash-talk" },
      { name: "Go GC guide", kind: "software", note: "Tuning Go's collector.", href: "https://go.dev/doc/gc-guide" },
      { name: "Chrome heap snapshots", kind: "software", note: "Find what keeps objects alive.", href: "https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots" },
    ],
  },
  "frontend/event-propagation": {
    lead: "Every DOM event follows this path.",
    tools: [
      { name: "MDN event bubbling", kind: "standard", note: "Capture, target and bubble.", href: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Event_bubbling" },
      { name: "DOM spec: dispatch", kind: "standard", note: "How events are dispatched.", href: "https://dom.spec.whatwg.org/#concept-event-dispatch" },
      { name: "React events", kind: "software", note: "React delegates to the root.", href: "https://react.dev/learn/responding-to-events#event-propagation" },
    ],
  },
  "frontend/closures": {
    lead: "Closures are everywhere in JavaScript: callbacks, hooks, modules.",
    tools: [
      { name: "MDN closures", kind: "standard", note: "The guide with examples.", href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures" },
      { name: "Chrome DevTools scope pane", kind: "software", note: "See closure variables while paused.", href: "https://developer.chrome.com/docs/devtools/javascript/reference#scope" },
      { name: "You Don't Know JS: Scope & Closures", kind: "standard", note: "Kyle Simpson's free book.", href: "https://github.com/getify/You-Dont-Know-JS" },
    ],
  },
  "frontend/css-cascade": {
    lead: "Browsers resolve conflicting styles the same way.",
    tools: [
      { name: "MDN specificity", kind: "standard", note: "How specificity is calculated.", href: "https://developer.mozilla.org/en-US/docs/Web/CSS/Specificity" },
      { name: "Specificity calculator", kind: "software", note: "Paste selectors, compare scores.", href: "https://specificity.keegan.st/" },
      { name: "Cascade layers", kind: "standard", note: "@layer for controlling order.", href: "https://developer.mozilla.org/en-US/docs/Web/CSS/@layer" },
    ],
  },
  "frontend/stacking-contexts": {
    lead: "Overlays break the same way in every codebase.",
    tools: [
      { name: "MDN stacking context", kind: "standard", note: "What creates one.", href: "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_positioned_layout/Stacking_context" },
      { name: "React createPortal", kind: "software", note: "Render overlays outside the parent.", href: "https://react.dev/reference/react-dom/createPortal" },
      { name: "<dialog> top layer", kind: "standard", note: "Native modals above everything.", href: "https://developer.mozilla.org/en-US/docs/Glossary/Top_layer" },
    ],
  },
  "frontend/code-splitting": {
    lead: "Bundlers split code by route and dynamic import.",
    tools: [
      { name: "Next.js lazy loading", kind: "software", note: "next/dynamic and route chunks.", href: "https://nextjs.org/docs/app/building-your-application/optimizing/lazy-loading" },
      { name: "webpack-bundle-analyzer", kind: "software", note: "See what's in each chunk.", href: "https://github.com/webpack-contrib/webpack-bundle-analyzer" },
      { name: "Vite code splitting", kind: "software", note: "Dynamic imports become chunks.", href: "https://vite.dev/guide/features#dynamic-import" },
    ],
  },
  "ai/overfitting": {
    lead: "Every training tool reports train and validation loss for this reason.",
    tools: [
      { name: "scikit-learn validation curves", kind: "software", note: "Plot error against model complexity.", href: "https://scikit-learn.org/stable/modules/learning_curve.html" },
      { name: "Weights & Biases", kind: "service", note: "Track train vs eval loss per run.", href: "https://wandb.ai/" },
      { name: "Hugging Face Trainer", kind: "software", note: "Early stopping on eval loss.", href: "https://huggingface.co/docs/transformers/main_classes/callback" },
    ],
  },
  "ai/neural-networks": {
    lead: "Neural network libraries do this arithmetic at enormous scale.",
    tools: [
      { name: "TensorFlow Playground", kind: "software", note: "Train tiny networks in the browser.", href: "https://playground.tensorflow.org/" },
      { name: "PyTorch", kind: "software", note: "The most used deep learning framework.", href: "https://pytorch.org/" },
      { name: "3Blue1Brown: neural networks", kind: "standard", note: "The visual video series.", href: "https://www.3blue1brown.com/topics/neural-networks" },
    ],
  },
  "ai/scaling-laws": {
    lead: "Labs plan training runs with fitted scaling curves.",
    tools: [
      { name: "Chinchilla paper", kind: "standard", note: "Training compute-optimal LLMs (Hoffmann et al.).", href: "https://arxiv.org/abs/2203.15556" },
      { name: "Kaplan et al. 2020", kind: "standard", note: "The first LLM scaling laws.", href: "https://arxiv.org/abs/2001.08361" },
      { name: "Epoch AI", kind: "service", note: "Data on training compute over time.", href: "https://epoch.ai/data" },
    ],
  },
  "ai/long-context-vs-rag": {
    lead: "Long context and retrieval are both standard features now.",
    tools: [
      { name: "Anthropic prompt caching", kind: "service", note: "Cheaper repeated long prompts.", href: "https://docs.claude.com/en/docs/build-with-claude/prompt-caching" },
      { name: "Lost in the Middle", kind: "standard", note: "Why mid-context facts get missed.", href: "https://arxiv.org/abs/2307.03172" },
      { name: "LlamaIndex", kind: "software", note: "RAG pipelines and indexing.", href: "https://www.llamaindex.ai/" },
    ],
  },
  "ai/eval-metrics": {
    lead: "Classification metrics apply to LLM features too.",
    tools: [
      { name: "scikit-learn metrics", kind: "software", note: "precision_recall_fscore_support.", href: "https://scikit-learn.org/stable/modules/model_evaluation.html#precision-recall-f-measure-metrics" },
      { name: "Google ML crash course", kind: "standard", note: "Precision and recall explained.", href: "https://developers.google.com/machine-learning/crash-course/classification/precision-and-recall" },
      { name: "promptfoo", kind: "software", note: "Score prompts against labelled tests.", href: "https://www.promptfoo.dev/" },
    ],
  },
  "ai/reflection": {
    lead: "Reflection works when the loop has a real check in it: tests, a compiler, a validator or a tool result.",
    tools: [
      { name: "Reflexion", kind: "standard", note: "Shinn et al., 2023: agents that retry with feedback from the environment.", href: "https://arxiv.org/abs/2303.11366" },
      { name: "Self-Refine", kind: "standard", note: "Madaan et al., 2023: draft, self-feedback, refine.", href: "https://arxiv.org/abs/2303.17651" },
      { name: "LLMs Cannot Self-Correct Reasoning Yet", kind: "standard", note: "Huang et al., 2023: without outside feedback, revising often doesn't help.", href: "https://arxiv.org/abs/2310.01798" },
      { name: "Aider", kind: "software", note: "A coding agent that runs your tests and lint and fixes what fails.", href: "https://github.com/Aider-AI/aider" },
      { name: "SWE-bench", kind: "standard", note: "Real GitHub issues, judged by the repository's own tests.", href: "https://github.com/SWE-bench/SWE-bench" },
    ],
  },
  "ai/computer-use": {
    lead: "Computer-use models plus a harness that takes screenshots and performs actions in a sandboxed browser or VM.",
    tools: [
      { name: "Claude computer use", kind: "service", note: "A tool for screenshots, clicks and typing, run by your own harness.", href: "https://docs.anthropic.com/en/docs/agents-and-tools/computer-use" },
      { name: "OpenAI computer use", kind: "service", note: "A computer-use tool in the Responses API.", href: "https://platform.openai.com/docs/guides/tools-computer-use" },
      { name: "Playwright", kind: "software", note: "Drives real browsers; many harnesses use it to act and take screenshots.", href: "https://github.com/microsoft/playwright" },
      { name: "Browser Use", kind: "software", note: "Open-source browser agent that combines screenshots with the page structure.", href: "https://github.com/browser-use/browser-use" },
      { name: "OSWorld", kind: "standard", note: "A benchmark of real desktop tasks for computer-use agents.", href: "https://github.com/xlang-ai/OSWorld" },
    ],
  },
  "ai/agent-failures": {
    lead: "Agent frameworks give you the safeguards; tracing and repeated-trial evals tell you how often runs actually succeed.",
    tools: [
      { name: "τ-bench", kind: "standard", note: "Measures pass^k: does the agent succeed every time, not just once.", href: "https://github.com/sierra-research/tau-bench" },
      { name: "LangGraph", kind: "software", note: "Agent graphs with checkpoints, retries and a recursion limit.", href: "https://github.com/langchain-ai/langgraph" },
      { name: "OpenAI Agents SDK", kind: "software", note: "Agents with guardrails, handoffs, max turns and tracing.", href: "https://github.com/openai/openai-agents-python" },
      { name: "Langfuse", kind: "software", note: "Traces every step of a run, so you can see where it went wrong.", href: "https://github.com/langfuse/langfuse" },
      { name: "Building effective agents", kind: "standard", note: "Anthropic: keep agents simple, add checks, prefer workflows when you can.", href: "https://www.anthropic.com/engineering/building-effective-agents" },
    ],
  },
  "ai/benchmarks": {
    lead: "Public benchmarks run through a few shared harnesses; fresh, harder sets replace the saturated ones.",
    tools: [
      { name: "MMLU", kind: "standard", note: "57 subjects of multiple-choice questions; now saturated.", href: "https://github.com/hendrycks/test" },
      { name: "Are We Done with MMLU?", kind: "standard", note: "Gema et al., 2024: an estimated 6.49% of MMLU questions contain errors.", href: "https://arxiv.org/abs/2406.04127" },
      { name: "GPQA", kind: "standard", note: "Graduate-level science questions written to be hard to look up.", href: "https://github.com/idavidrein/gpqa" },
      { name: "Humanity's Last Exam", kind: "standard", note: "A newer, harder benchmark with a private held-out set.", href: "https://lastexam.ai" },
      { name: "lm-evaluation-harness", kind: "software", note: "Runs hundreds of benchmarks the same way across models.", href: "https://github.com/EleutherAI/lm-evaluation-harness" },
    ],
  },
  "ai/red-teaming": {
    lead: "Red-teaming tools generate and replay attacks; the frameworks name what to test for.",
    tools: [
      { name: "garak", kind: "software", note: "NVIDIA's scanner that probes a model for jailbreaks, leaks and injection.", href: "https://github.com/NVIDIA/garak" },
      { name: "PyRIT", kind: "software", note: "Microsoft's toolkit for automated, multi-turn red-teaming.", href: "https://github.com/Azure/PyRIT" },
      { name: "promptfoo red teaming", kind: "software", note: "Generates attacks for your app and grades the results.", href: "https://www.promptfoo.dev/docs/red-team/" },
      { name: "OWASP Top 10 for LLM apps", kind: "standard", note: "Prompt injection, data leaks, excessive agency and the rest.", href: "https://genai.owasp.org/llm-top-10/" },
      { name: "MITRE ATLAS", kind: "standard", note: "A catalogue of real attack techniques against AI systems.", href: "https://atlas.mitre.org/" },
    ],
  },
  "ai-native/feature-cost": {
    lead: "Every provider bills by tokens; observability tools track it.",
    tools: [
      { name: "Anthropic pricing", kind: "service", note: "Per-model token prices.", href: "https://www.anthropic.com/pricing" },
      { name: "OpenAI pricing", kind: "service", note: "Per-model token prices.", href: "https://openai.com/api/pricing/" },
      { name: "Helicone", kind: "service", note: "Cost and usage per request and user.", href: "https://www.helicone.ai/" },
    ],
  },
  "ai-native/ab-testing-ai": {
    lead: "Experiment platforms handle the statistics for you.",
    tools: [
      { name: "Statsig", kind: "service", note: "Experiments and feature gates.", href: "https://www.statsig.com/" },
      { name: "GrowthBook", kind: "software", note: "Open-source A/B testing.", href: "https://www.growthbook.io/" },
      { name: "Evan Miller's calculator", kind: "software", note: "Sample size for A/B tests.", href: "https://www.evanmiller.org/ab-testing/sample-size.html" },
    ],
  },
  "ai-native/latency-ux": {
    lead: "Design systems for AI products ship these patterns.",
    tools: [
      { name: "Vercel AI SDK UI", kind: "software", note: "Streaming and status hooks.", href: "https://ai-sdk.dev/docs/ai-sdk-ui/overview" },
      { name: "Nielsen: response times", kind: "standard", note: "The 0.1 / 1 / 10 second limits.", href: "https://www.nngroup.com/articles/response-times-3-important-limits/" },
      { name: "Material skeleton loaders", kind: "standard", note: "Placeholder patterns.", href: "https://m3.material.io/components/progress-indicators/overview" },
    ],
  },
  "ai-automation/classify-route": {
    lead: "Workflow tools pair an LLM step with a switch node.",
    tools: [
      { name: "n8n Switch node", kind: "software", note: "Route items by value.", href: "https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.switch/" },
      { name: "Zapier Paths", kind: "service", note: "Branch workflows by conditions.", href: "https://zapier.com/features/paths" },
      { name: "Structured outputs", kind: "standard", note: "Constrain model output to a schema.", href: "https://docs.claude.com/en/docs/build-with-claude/structured-outputs" },
    ],
  },
  "tools/build-mcp-server": {
    lead: "Official SDKs make writing MCP servers quick.",
    tools: [
      { name: "MCP TypeScript SDK", kind: "software", note: "Build servers in TypeScript.", href: "https://github.com/modelcontextprotocol/typescript-sdk" },
      { name: "MCP Python SDK", kind: "software", note: "FastMCP and the low-level server.", href: "https://github.com/modelcontextprotocol/python-sdk" },
      { name: "MCP Inspector", kind: "software", note: "Test servers interactively.", href: "https://github.com/modelcontextprotocol/inspector" },
    ],
  },
  "devops/files-permissions": {
    lead: "Every Linux system and container uses these bits.",
    tools: [
      { name: "chmod(1)", kind: "software", note: "Change file mode bits.", href: "https://man7.org/linux/man-pages/man1/chmod.1.html" },
      { name: "Docker USER", kind: "software", note: "Run containers as a non-root user.", href: "https://docs.docker.com/reference/dockerfile/#user" },
      { name: "chmod calculator", kind: "software", note: "Convert between rwx and octal.", href: "https://chmod-calculator.com/" },
    ],
  },
  "devops/services-ingress": {
    lead: "Every Kubernetes app is reached through Services and an Ingress or Gateway.",
    tools: [
      { name: "Kubernetes Services", kind: "software", note: "Selectors, endpoints and ClusterIP.", href: "https://kubernetes.io/docs/concepts/services-networking/service/" },
      { name: "ingress-nginx", kind: "software", note: "The common Ingress controller.", href: "https://kubernetes.github.io/ingress-nginx/" },
      { name: "Gateway API", kind: "standard", note: "The successor to Ingress.", href: "https://gateway-api.sigs.k8s.io/" },
    ],
  },
  "devops/prometheus-metrics": {
    lead: "Prometheus is the default metrics system for cloud-native apps.",
    tools: [
      { name: "Prometheus", kind: "software", note: "Metrics collection and PromQL.", href: "https://prometheus.io/docs/prometheus/latest/querying/functions/#rate" },
      { name: "Grafana", kind: "software", note: "Dashboards over Prometheus.", href: "https://grafana.com/" },
      { name: "OpenTelemetry metrics", kind: "standard", note: "Vendor-neutral instrumentation.", href: "https://opentelemetry.io/docs/concepts/signals/metrics/" },
    ],
  },
  "devops/gitops": {
    lead: "GitOps controllers run in most Kubernetes platforms.",
    tools: [
      { name: "Argo CD", kind: "software", note: "Declarative GitOps for Kubernetes.", href: "https://argo-cd.readthedocs.io/" },
      { name: "Flux", kind: "software", note: "GitOps toolkit from the CNCF.", href: "https://fluxcd.io/" },
      { name: "OpenGitOps principles", kind: "standard", note: "The four GitOps principles.", href: "https://opengitops.dev/" },
    ],
  },
  "devops/terraform-state": {
    lead: "Remote state with locking is standard for any team using Terraform.",
    tools: [
      { name: "Terraform S3 backend", kind: "software", note: "Remote state with locking.", href: "https://developer.hashicorp.com/terraform/language/backend/s3" },
      { name: "HCP Terraform", kind: "service", note: "Managed state and runs.", href: "https://developer.hashicorp.com/terraform/cloud-docs" },
      { name: "terraform import", kind: "software", note: "Adopt existing resources.", href: "https://developer.hashicorp.com/terraform/cli/commands/import" },
    ],
  },
  "devops/backups-restore": {
    lead: "Managed databases offer snapshots and point-in-time restore.",
    tools: [
      { name: "PostgreSQL PITR", kind: "software", note: "Continuous archiving and point-in-time recovery.", href: "https://www.postgresql.org/docs/current/continuous-archiving.html" },
      { name: "pgBackRest", kind: "software", note: "Backup and restore for Postgres.", href: "https://pgbackrest.org/" },
      { name: "AWS Backup", kind: "service", note: "Policy-based backups across services.", href: "https://aws.amazon.com/backup/" },
    ],
  },
  "security/certificates": {
    lead: "Every HTTPS connection validates a certificate chain.",
    tools: [
      { name: "Let's Encrypt", kind: "service", note: "Free automated certificates.", href: "https://letsencrypt.org/" },
      { name: "cert-manager", kind: "software", note: "Certificates in Kubernetes.", href: "https://cert-manager.io/" },
      { name: "SSL Labs", kind: "service", note: "Test a server's TLS setup.", href: "https://www.ssllabs.com/ssltest/" },
    ],
  },
  "security/oauth-flow": {
    lead: "OAuth and OIDC power every \u201cSign in with\u2026\u201d button.",
    tools: [
      { name: "OAuth 2.1 draft", kind: "standard", note: "Authorization code + PKCE everywhere.", href: "https://oauth.net/2.1/" },
      { name: "RFC 7636 (PKCE)", kind: "standard", note: "Proof Key for Code Exchange.", href: "https://www.rfc-editor.org/rfc/rfc7636" },
      { name: "Auth0", kind: "service", note: "Hosted OAuth and OIDC.", href: "https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow-with-pkce" },
    ],
  },
  "system-design/monolith-vs-microservices": {
    lead: "The choice is about teams and deploys more than technology; these are the reference points people cite.",
    tools: [
      { name: "MonolithFirst", kind: "standard", note: "Martin Fowler: start with a monolith and split once the boundaries are known.", href: "https://martinfowler.com/bliki/MonolithFirst.html" },
      { name: "Microservices (Lewis and Fowler)", kind: "standard", note: "The 2014 article that defined the term and its trade-offs.", href: "https://martinfowler.com/articles/microservices.html" },
      { name: "Shopify's modular monolith", kind: "standard", note: "How Shopify enforces boundaries inside one large Rails codebase.", href: "https://shopify.engineering/deconstructing-monolith-designing-software-maximizes-developer-productivity" },
      { name: "Packwerk", kind: "software", note: "Shopify's tool that fails the build when a module reaches past another's public interface.", href: "https://github.com/Shopify/packwerk" },
      { name: "Team Topologies", kind: "standard", note: "Matching service boundaries to team boundaries, and the cognitive load of each.", href: "https://teamtopologies.com/" },
    ],
  },
  "system-design/clean-architecture": {
    lead: "These are patterns, not frameworks; the original write-ups and a tool that enforces the import rule.",
    tools: [
      { name: "Hexagonal architecture", kind: "standard", note: "Alistair Cockburn's original description of ports and adapters.", href: "https://alistair.cockburn.us/hexagonal-architecture/" },
      { name: "The Clean Architecture", kind: "standard", note: "Robert C. Martin: the dependency rule, drawn as concentric circles.", href: "https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html" },
      { name: "ArchUnit", kind: "software", note: "Tests that fail when an import points the wrong way between layers.", href: "https://github.com/TNG/ArchUnit" },
      { name: "dependency-cruiser", kind: "software", note: "Validates and draws module dependencies against rules you write.", href: "https://github.com/sverweij/dependency-cruiser" },
    ],
  },
  "system-design/domain-driven-design": {
    lead: "DDD is a modelling practice; the sources and the workshop formats teams use to find the boundaries.",
    tools: [
      { name: "Domain-Driven Design Reference", kind: "standard", note: "Eric Evans' summary of the patterns: bounded contexts, aggregates, context maps.", href: "https://www.domainlanguage.com/ddd/reference/" },
      { name: "Bounded Context", kind: "standard", note: "Martin Fowler's short explanation, with the classic two-meanings diagram.", href: "https://martinfowler.com/bliki/BoundedContext.html" },
      { name: "EventStorming", kind: "standard", note: "A workshop format for finding events, aggregates and context boundaries with the business.", href: "https://www.eventstorming.com/" },
      { name: "DDD Crew", kind: "standard", note: "Open templates: bounded context canvas, context mapping, aggregate design canvas.", href: "https://github.com/ddd-crew" },
    ],
  },
  "system-design/adrs": {
    lead: "ADRs are plain text in the repository; the template and the tooling are small on purpose.",
    tools: [
      { name: "Documenting Architecture Decisions", kind: "standard", note: "Michael Nygard's 2011 post that introduced the format: context, decision, status, consequences.", href: "https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions" },
      { name: "MADR", kind: "standard", note: "Markdown Architectural Decision Records: a template with considered options.", href: "https://github.com/adr/madr" },
      { name: "adr-tools", kind: "software", note: "Command-line tools to create, number and supersede ADRs.", href: "https://github.com/npryce/adr-tools" },
      { name: "ADR GitHub organisation", kind: "standard", note: "Templates, examples and tooling collected in one place.", href: "https://adr.github.io/" },
    ],
  },
  "system-design/capacity-planning": {
    lead: "Every cloud has the same three levers: right-size, commit for a discount, and scale with the curve.",
    tools: [
      { name: "AWS Savings Plans", kind: "service", note: "Commit to an hourly spend for 1 or 3 years for a lower rate.", href: "https://aws.amazon.com/savingsplans/" },
      { name: "Google Cloud committed use discounts", kind: "service", note: "The same commitment model on Google Cloud.", href: "https://cloud.google.com/docs/cuds" },
      { name: "Kubernetes Horizontal Pod Autoscaler", kind: "software", note: "Adds and removes pods from a utilisation target, with a scale-in stabilisation window.", href: "https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/" },
      { name: "OpenCost", kind: "software", note: "Cost per workload in Kubernetes, to see what's idle.", href: "https://github.com/opencost/opencost" },
      { name: "FinOps Foundation", kind: "standard", note: "The practice of engineering and finance owning cloud cost together.", href: "https://www.finops.org/" },
    ],
  },
  "system-design/chaos-engineering": {
    lead: "Fault injection is a product category now; these run experiments with blast radius and stop conditions built in.",
    tools: [
      { name: "Principles of Chaos Engineering", kind: "standard", note: "Steady state, hypothesis, real-world events, minimal blast radius.", href: "https://principlesofchaos.org/" },
      { name: "Chaos Mesh", kind: "software", note: "Kubernetes fault injection: pod kill, network delay, IO faults.", href: "https://github.com/chaos-mesh/chaos-mesh" },
      { name: "LitmusChaos", kind: "software", note: "Chaos experiments as Kubernetes resources, with probes that check the steady state.", href: "https://github.com/litmuschaos/litmus" },
      { name: "AWS Fault Injection Service", kind: "service", note: "Managed experiments on AWS resources with stop conditions on CloudWatch alarms.", href: "https://aws.amazon.com/fis/" },
      { name: "Toxiproxy", kind: "software", note: "A proxy that adds latency, drops or cuts connections between services in tests.", href: "https://github.com/Shopify/toxiproxy" },
    ],
  },
  "system-design/incident-response": {
    lead: "Paging, status pages and postmortems have standard tools; the roles come from emergency services.",
    tools: [
      { name: "Google SRE book: Managing Incidents", kind: "standard", note: "Incident commander, operations, communications: roles and a worked example.", href: "https://sre.google/sre-book/managing-incidents/" },
      { name: "Google SRE book: Postmortem Culture", kind: "standard", note: "Blameless postmortems and why they work.", href: "https://sre.google/sre-book/postmortem-culture/" },
      { name: "PagerDuty Incident Response", kind: "standard", note: "PagerDuty's open incident response guide, roles and checklists.", href: "https://response.pagerduty.com/" },
      { name: "Grafana OnCall", kind: "software", note: "Open-source on-call schedules, escalation and paging.", href: "https://github.com/grafana/oncall" },
      { name: "Atlassian Statuspage", kind: "service", note: "A hosted status page for incident updates to customers.", href: "https://www.atlassian.com/software/statuspage" },
    ],
  },
  "system-design/estimation": {
    lead: "Every system design starts with rough numbers.",
    tools: [
      { name: "Latency numbers", kind: "standard", note: "Reference numbers for estimates.", href: "https://colin-scott.github.io/personal_website/research/interactive_latency.html" },
      { name: "System Design Primer", kind: "standard", note: "Back-of-envelope worked examples.", href: "https://github.com/donnemartin/system-design-primer#back-of-the-envelope-calculations" },
      { name: "Google SRE: capacity", kind: "standard", note: "Planning capacity from demand.", href: "https://sre.google/sre-book/software-engineering-in-sre/" },
    ],
  },
  "databases/table-partitioning": {
    lead: "Large time-series tables are almost always partitioned.",
    tools: [
      { name: "PostgreSQL partitioning", kind: "software", note: "Declarative range, list and hash partitions.", href: "https://www.postgresql.org/docs/current/ddl-partitioning.html" },
      { name: "pg_partman", kind: "software", note: "Automates creating and dropping partitions.", href: "https://github.com/pgpartman/pg_partman" },
      { name: "BigQuery partitioned tables", kind: "service", note: "Partition pruning to cut scan costs.", href: "https://cloud.google.com/bigquery/docs/partitioned-tables" },
    ],
  },
  "system-design/scaling": {
    lead: "Clouds make both kinds of scaling a configuration change.",
    tools: [
      { name: "AWS EC2 instance types", kind: "service", note: "From 2 to hundreds of vCPUs.", href: "https://aws.amazon.com/ec2/instance-types/" },
      { name: "Kubernetes HPA", kind: "software", note: "Scale out pods automatically.", href: "https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/" },
      { name: "The Twelve-Factor App", kind: "standard", note: "Stateless processes that scale out.", href: "https://12factor.net/processes" },
    ],
  },
  "system-design/latency-throughput": {
    lead: "Every load test shows this curve.",
    tools: [
      { name: "Little's law", kind: "standard", note: "L = \u03bbW, for any stable queue.", href: "https://en.wikipedia.org/wiki/Little%27s_law" },
      { name: "k6", kind: "software", note: "Load testing to find the knee.", href: "https://k6.io/" },
      { name: "USE method", kind: "standard", note: "Utilisation, saturation, errors.", href: "https://www.brendangregg.com/usemethod.html" },
    ],
  },
  "system-design/design-url-shortener": {
    lead: "The parts a URL shortener is usually built from.",
    tools: [
      { name: "Bitly API", kind: "service", note: "A production URL shortener with click analytics.", href: "https://dev.bitly.com/" },
      { name: "Redis", kind: "software", note: "Cache for the hottest code → URL mappings.", href: "https://redis.io/" },
      { name: "Amazon DynamoDB", kind: "service", note: "Key-value store for billions of mappings.", href: "https://aws.amazon.com/dynamodb/" },
      { name: "RFC 9110 redirects", kind: "standard", note: "What 301, 302 and 308 mean, and which are cached.", href: "https://www.rfc-editor.org/rfc/rfc9110#name-redirection-3xx" },
      { name: "Apache Kafka", kind: "software", note: "Queue click events for analytics.", href: "https://kafka.apache.org/" },
    ],
  },
  "system-design/design-rate-limiter": {
    lead: "Shared rate limiting in proxies, stores and standards.",
    tools: [
      { name: "Redis INCR", kind: "software", note: "Atomic counters with expiry for window limits.", href: "https://redis.io/docs/latest/commands/incr/" },
      { name: "Envoy global rate limiting", kind: "software", note: "Proxies ask a shared rate-limit service per request.", href: "https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/other_features/global_rate_limiting" },
      { name: "envoyproxy/ratelimit", kind: "software", note: "The Redis-backed rate-limit service Envoy calls.", href: "https://github.com/envoyproxy/ratelimit" },
      { name: "Cloudflare rate limiting rules", kind: "service", note: "Limits enforced at the edge.", href: "https://developers.cloudflare.com/waf/rate-limiting-rules/" },
      { name: "RFC 6585", kind: "standard", note: "Defines 429 Too Many Requests.", href: "https://www.rfc-editor.org/rfc/rfc6585" },
      { name: "RateLimit header fields", kind: "standard", note: "IETF draft for telling clients their remaining budget.", href: "https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/" },
    ],
  },
  "system-design/design-notification-system": {
    lead: "Delivery providers and notification infrastructure.",
    tools: [
      { name: "Firebase Cloud Messaging", kind: "service", note: "Push to Android, iOS and the web.", href: "https://firebase.google.com/docs/cloud-messaging" },
      { name: "Apple Push Notification service", kind: "service", note: "Push to Apple devices.", href: "https://developer.apple.com/documentation/usernotifications" },
      { name: "Amazon SES", kind: "service", note: "Bulk and transactional email with sending quotas.", href: "https://aws.amazon.com/ses/" },
      { name: "Twilio Messaging", kind: "service", note: "SMS with per-number throughput limits.", href: "https://www.twilio.com/docs/messaging" },
      { name: "Novu", kind: "software", note: "Open-source notification infrastructure with preferences.", href: "https://github.com/novuhq/novu" },
    ],
  },
  "system-design/design-chat": {
    lead: "Protocols and servers chat systems are built on.",
    tools: [
      { name: "WebSocket (RFC 6455)", kind: "protocol", note: "A long-lived two-way connection per client.", href: "https://www.rfc-editor.org/rfc/rfc6455" },
      { name: "Matrix", kind: "protocol", note: "Open standard for federated chat with ordered room events.", href: "https://matrix.org/" },
      { name: "Synapse", kind: "software", note: "The reference Matrix homeserver.", href: "https://github.com/element-hq/synapse" },
      { name: "XMPP", kind: "protocol", note: "Messaging and presence protocol.", href: "https://xmpp.org/" },
      { name: "ejabberd", kind: "software", note: "XMPP server holding millions of connections.", href: "https://github.com/processone/ejabberd" },
      { name: "Apache Cassandra", kind: "software", note: "Message history partitioned by conversation.", href: "https://cassandra.apache.org/" },
    ],
  },
  "system-design/design-news-feed": {
    lead: "Stores and services behind feeds.",
    tools: [
      { name: "Redis sorted sets", kind: "software", note: "Per-user feed lists of post ids, ordered by score.", href: "https://redis.io/docs/latest/develop/data-types/sorted-sets/" },
      { name: "Apache Kafka", kind: "software", note: "Carries new posts to fan-out workers.", href: "https://kafka.apache.org/" },
      { name: "Apache Cassandra", kind: "software", note: "Post storage at write-heavy scale.", href: "https://cassandra.apache.org/" },
      { name: "Stream Activity Feeds", kind: "service", note: "Hosted feeds with push and pull built in.", href: "https://getstream.io/activity-feeds/" },
      { name: "TAO (USENIX ATC 2013)", kind: "standard", note: "Facebook's store for the social graph.", href: "https://www.usenix.org/conference/atc13/technical-sessions/presentation/bronson" },
    ],
  },
  "system-design/top-k": {
    lead: "Sketches power trending lists and heavy-hitter detection.",
    tools: [
      { name: "RedisBloom Count-Min", kind: "software", note: "CMS.INCRBY and CMS.QUERY.", href: "https://redis.io/docs/latest/develop/data-types/probabilistic/count-min-sketch/" },
      { name: "Redis Top-K", kind: "software", note: "Heavy hitters in Redis.", href: "https://redis.io/docs/latest/develop/data-types/probabilistic/top-k/" },
      { name: "Apache DataSketches", kind: "software", note: "Production sketch library.", href: "https://datasketches.apache.org/" },
    ],
  },
  "system-design/probabilistic-counting": {
    lead: "HyperLogLog counts uniques in most analytics systems.",
    tools: [
      { name: "Redis HyperLogLog", kind: "software", note: "PFADD, PFCOUNT, PFMERGE.", href: "https://redis.io/docs/latest/develop/data-types/probabilistic/hyperloglogs/" },
      { name: "BigQuery HLL functions", kind: "service", note: "Approximate distinct counts.", href: "https://cloud.google.com/bigquery/docs/reference/standard-sql/hll_functions" },
      { name: "HyperLogLog paper", kind: "standard", note: "Flajolet et al., 2007.", href: "https://algo.inria.fr/flajolet/Publications/FlFuGaMe07.pdf" },
    ],
  },
  "system-design/change-data-capture": {
    lead: "CDC keeps search, caches and warehouses in sync with the database.",
    tools: [
      { name: "Debezium", kind: "software", note: "Open-source CDC for many databases.", href: "https://debezium.io/" },
      { name: "AWS DMS", kind: "service", note: "Managed change data capture.", href: "https://aws.amazon.com/dms/" },
      { name: "Postgres logical decoding", kind: "software", note: "The feature CDC builds on.", href: "https://www.postgresql.org/docs/current/logicaldecoding.html" },
    ],
  },
  "system-design/schema-migrations": {
    lead: "Migration tools help, but expand and contract is a process.",
    tools: [
      { name: "gh-ost", kind: "software", note: "Online schema changes for MySQL.", href: "https://github.com/github/gh-ost" },
      { name: "pgroll", kind: "software", note: "Zero-downtime Postgres migrations.", href: "https://github.com/xataio/pgroll" },
      { name: "Parallel change", kind: "standard", note: "Martin Fowler on expand and contract.", href: "https://martinfowler.com/bliki/ParallelChange.html" },
    ],
  },
  "system-design/api-gateway": {
    lead: "Most API platforms put a gateway in front of services.",
    tools: [
      { name: "Kong", kind: "software", note: "Open-source API gateway.", href: "https://konghq.com/" },
      { name: "AWS API Gateway", kind: "service", note: "Managed gateway with auth and throttling.", href: "https://aws.amazon.com/api-gateway/" },
      { name: "Envoy", kind: "software", note: "Proxy used as gateway and mesh.", href: "https://www.envoyproxy.io/" },
    ],
  },
  "system-design/design-autocomplete": {
    lead: "Search engines and stores with prefix suggestions built in.",
    tools: [
      { name: "Elasticsearch suggesters", kind: "software", note: "Completion suggester backed by an in-memory FST.", href: "https://www.elastic.co/guide/en/elasticsearch/reference/current/search-suggesters.html" },
      { name: "Apache Lucene", kind: "software", note: "The search library with finite-state transducers for prefixes.", href: "https://lucene.apache.org/" },
      { name: "Typesense", kind: "software", note: "Open-source search with typo-tolerant search-as-you-type.", href: "https://github.com/typesense/typesense" },
      { name: "Algolia", kind: "service", note: "Hosted search-as-you-type with query suggestions.", href: "https://www.algolia.com/" },
    ],
  },
  "system-design/design-file-sync": {
    lead: "Chunking, resumable uploads and sync in real tools.",
    tools: [
      { name: "Dropbox: streaming file synchronization", kind: "standard", note: "How Dropbox's client syncs blocks.", href: "https://dropbox.tech/infrastructure/streaming-file-synchronization" },
      { name: "rsync", kind: "software", note: "Rolling checksums to send only changed parts of files.", href: "https://github.com/RsyncProject/rsync" },
      { name: "restic", kind: "software", note: "Backups with content-defined chunking and deduplication.", href: "https://github.com/restic/restic" },
      { name: "Syncthing", kind: "software", note: "Peer-to-peer continuous file sync with conflict copies.", href: "https://github.com/syncthing/syncthing" },
      { name: "S3 multipart upload", kind: "service", note: "Upload big objects in parts that can be retried.", href: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html" },
      { name: "tus", kind: "protocol", note: "Open protocol for resumable uploads over HTTP.", href: "https://tus.io/" },
    ],
  },
  "system-design/design-video-streaming": {
    lead: "Encoders, packaging standards and players.",
    tools: [
      { name: "FFmpeg", kind: "software", note: "Transcode and segment video into a ladder.", href: "https://ffmpeg.org/" },
      { name: "HLS (RFC 8216)", kind: "standard", note: "HTTP Live Streaming playlists and segments.", href: "https://www.rfc-editor.org/rfc/rfc8216" },
      { name: "DASH Industry Forum", kind: "standard", note: "MPEG-DASH guidelines and reference player.", href: "https://dashif.org/" },
      { name: "AWS Elemental MediaConvert", kind: "service", note: "Managed transcoding into adaptive bitrate ladders.", href: "https://aws.amazon.com/mediaconvert/" },
      { name: "hls.js", kind: "software", note: "Browser HLS player with bitrate adaptation.", href: "https://github.com/video-dev/hls.js" },
      { name: "Shaka Player", kind: "software", note: "DASH and HLS player with its own ABR logic.", href: "https://github.com/shaka-project/shaka-player" },
    ],
  },
  "system-design/design-ride-sharing": {
    lead: "Spatial indexes and routing engines.",
    tools: [
      { name: "Redis geospatial", kind: "software", note: "GEOADD and GEOSEARCH on geohash-encoded sorted sets.", href: "https://redis.io/docs/latest/develop/data-types/geospatial/" },
      { name: "H3", kind: "software", note: "Uber's hexagonal grid index.", href: "https://github.com/uber/h3" },
      { name: "S2 Geometry", kind: "software", note: "Google's spherical cell index.", href: "https://github.com/google/s2geometry" },
      { name: "PostGIS", kind: "software", note: "Spatial queries in PostgreSQL.", href: "https://postgis.net/" },
      { name: "OSRM", kind: "software", note: "Road routing for real ETAs.", href: "https://github.com/Project-OSRM/osrm-backend" },
    ],
  },
  "system-design/webhooks": {
    lead: "Every payment and SaaS platform sends webhooks.",
    tools: [
      { name: "Stripe webhooks", kind: "service", note: "Signatures, retries and best practices.", href: "https://docs.stripe.com/webhooks" },
      { name: "Standard Webhooks", kind: "standard", note: "A common spec for signing.", href: "https://www.standardwebhooks.com/" },
      { name: "Svix", kind: "service", note: "Webhook sending as a service.", href: "https://www.svix.com/" },
    ],
  },
  "system-design/graceful-degradation": {
    lead: "Resilience libraries provide timeouts and fallbacks.",
    tools: [
      { name: "Resilience4j", kind: "software", note: "Timeouts, circuit breakers, fallbacks.", href: "https://resilience4j.readme.io/" },
      { name: "Polly", kind: "software", note: "Resilience policies for .NET.", href: "https://www.pollydocs.org/" },
      { name: "AWS: avoiding fallback pitfalls", kind: "standard", note: "When fallbacks hurt.", href: "https://aws.amazon.com/builders-library/avoiding-fallback-in-distributed-systems/" },
    ],
  },
  "system-design/request-journey": {
    lead: "Tracing tools show the whole path of a request.",
    tools: [
      { name: "WebPageTest", kind: "service", note: "Waterfall of a real page load.", href: "https://www.webpagetest.org/" },
      { name: "Jaeger", kind: "software", note: "Distributed tracing.", href: "https://www.jaegertracing.io/" },
      { name: "Cloudflare CDN", kind: "service", note: "Edge caching close to users.", href: "https://www.cloudflare.com/application-services/products/cdn/" },
    ],
  },
  "system-design/permission-aware-retrieval": {
    lead: "Vector databases filter by metadata inside the search; authorization services answer “may this user see this document?” at query time.",
    tools: [
      { name: "Qdrant payload filtering", kind: "software", note: "Filter by metadata such as groups inside the vector search, not after it.", href: "https://qdrant.tech/documentation/concepts/filtering/" },
      { name: "pgvector", kind: "software", note: "Vectors in Postgres, so row-level security and joins on ACL tables apply to search.", href: "https://github.com/pgvector/pgvector" },
      { name: "OpenFGA", kind: "software", note: "Relationship-based authorization to check document access per user at query time.", href: "https://github.com/openfga/openfga" },
      { name: "Microsoft Entra groups", kind: "service", note: "The groups most enterprise documents are shared with, synced into the index.", href: "https://learn.microsoft.com/en-us/entra/fundamentals/concept-learn-about-groups" },
    ],
  },
  "system-design/output-validation": {
    lead: "Structured outputs, schema validation and policy checks sit between a model's proposal and anything that changes the world.",
    tools: [
      { name: "JSON Schema", kind: "standard", note: "Describe and validate the action format a model must produce.", href: "https://json-schema.org/" },
      { name: "Anthropic tool use", kind: "service", note: "Models return tool calls as JSON matching the input schema you declare.", href: "https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview" },
      { name: "Pydantic", kind: "software", note: "Validate model output into typed objects and reject what doesn't fit.", href: "https://github.com/pydantic/pydantic" },
      { name: "Open Policy Agent", kind: "software", note: "Business rules as policy, evaluated before an action runs.", href: "https://github.com/open-policy-agent/opa" },
      { name: "OWASP LLM05: Improper Output Handling", kind: "standard", note: "Treat model output as untrusted input to everything downstream.", href: "https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/" },
    ],
  },
  "system-design/ai-audit": {
    lead: "Regulation sets what must be recorded and for how long; logging standards and tools make the records consistent.",
    tools: [
      { name: "EU AI Act (Regulation 2024/1689)", kind: "standard", note: "Article 12, record-keeping: high-risk AI systems must automatically log events over their lifetime.", href: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj" },
      { name: "NIST AI Risk Management Framework", kind: "standard", note: "Documentation and traceability as part of governing AI systems.", href: "https://www.nist.gov/itl/ai-risk-management-framework" },
      { name: "GDPR Article 5", kind: "standard", note: "Data minimisation and storage limitation, which pull against keeping everything.", href: "https://gdpr-info.eu/art-5-gdpr/" },
      { name: "OpenTelemetry GenAI conventions", kind: "standard", note: "Standard attributes for model name, version and token use on every call.", href: "https://opentelemetry.io/docs/specs/semconv/gen-ai/" },
    ],
  },
  "system-design/guardrails": {
    lead: "Moderation models, guardrail frameworks and grounding checks are available off the shelf; the policy and the labelled examples are yours.",
    tools: [
      { name: "Llama Guard", kind: "software", note: "An open model that classifies prompts and responses against a safety policy.", href: "https://github.com/meta-llama/PurpleLlama" },
      { name: "NeMo Guardrails", kind: "software", note: "NVIDIA's toolkit for input, output and dialogue rails around an LLM app.", href: "https://github.com/NVIDIA/NeMo-Guardrails" },
      { name: "Guardrails AI", kind: "software", note: "Validators for LLM inputs and outputs, from PII to off-topic checks.", href: "https://github.com/guardrails-ai/guardrails" },
      { name: "OpenAI moderation", kind: "service", note: "A free classifier for harmful content categories.", href: "https://platform.openai.com/docs/guides/moderation" },
      { name: "Microsoft Presidio", kind: "software", note: "Detect and mask personal data before it reaches the model.", href: "https://github.com/microsoft/presidio" },
    ],
  },
  "system-design/bulkheads": {
    lead: "Resilience libraries implement bulkheads as separate pools.",
    tools: [
      { name: "Resilience4j Bulkhead", kind: "software", note: "Semaphore and thread-pool bulkheads.", href: "https://resilience4j.readme.io/docs/bulkhead" },
      { name: "Envoy circuit breaking", kind: "software", note: "Per-cluster connection limits.", href: "https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/circuit_breaking" },
      { name: "Release It!", kind: "standard", note: "Michael Nygard's stability patterns.", href: "https://pragprog.com/titles/mnee2/release-it-second-edition/" },
    ],
  },
  "system-design/failover-dr": {
    lead: "Clouds document these DR tiers explicitly.",
    tools: [
      { name: "AWS DR strategies", kind: "standard", note: "Backup, pilot light, warm standby, active-active.", href: "https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html" },
      { name: "Route 53 failover", kind: "service", note: "DNS health checks and failover.", href: "https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover.html" },
      { name: "Google SRE: DR testing", kind: "standard", note: "Practising disaster recovery.", href: "https://sre.google/sre-book/emergency-response/" },
    ],
  },
  "system-design/answer-quality": {
    lead: "RAG evaluation tools score retrieval and generation separately, which is what lets you find the failing stage.",
    tools: [
      { name: "RAGAS", kind: "software", note: "Context recall and precision for retrieval; faithfulness and answer relevance for generation.", href: "https://github.com/explodinggradients/ragas" },
      { name: "TruLens", kind: "software", note: "The RAG triad: context relevance, groundedness and answer relevance.", href: "https://github.com/truera/trulens" },
      { name: "DeepEval", kind: "software", note: "Unit-test style metrics for retrieval and answers, run in CI.", href: "https://github.com/confident-ai/deepeval" },
      { name: "Cohere Rerank", kind: "service", note: "A cross-encoder reranker that reorders retrieved chunks by relevance.", href: "https://cohere.com/rerank" },
    ],
  },
  "system-design/agent-tracing": {
    lead: "LLM observability tools record agent runs as traces, usually on OpenTelemetry, with tokens and cost per span.",
    tools: [
      { name: "OpenTelemetry GenAI conventions", kind: "standard", note: "Standard span names and attributes for model and tool calls.", href: "https://opentelemetry.io/docs/specs/semconv/gen-ai/" },
      { name: "Langfuse", kind: "software", note: "Open-source tracing, cost tracking and evals for LLM apps.", href: "https://github.com/langfuse/langfuse" },
      { name: "Arize Phoenix", kind: "software", note: "Open-source tracing and evaluation built on OpenTelemetry.", href: "https://github.com/Arize-ai/phoenix" },
      { name: "LangSmith", kind: "service", note: "Hosted tracing and debugging for agent runs.", href: "https://www.langchain.com/langsmith" },
      { name: "OpenTelemetry tail sampling", kind: "software", note: "Decide which traces to keep after they finish: errors, slow runs, a sample of the rest.", href: "https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor" },
    ],
  },
  "system-design/prompt-injection": {
    lead: "No model is immune; the published guidance stresses design over filters.",
    tools: [
      { name: "OWASP LLM01: Prompt Injection", kind: "standard", note: "Direct and indirect injection, with prevention and mitigation strategies.", href: "https://genai.owasp.org/llmrisk/llm01-prompt-injection/" },
      { name: "The dual LLM pattern", kind: "standard", note: "Simon Willison: a quarantined model reads untrusted text, a privileged one has the tools.", href: "https://simonwillison.net/2023/Apr/25/dual-llm-pattern/" },
      { name: "CaMeL", kind: "standard", note: "Debenedetti et al., 2025: defeating prompt injections by design with capabilities and data flow control.", href: "https://arxiv.org/abs/2503.18813" },
      { name: "Not what you've signed up for", kind: "standard", note: "Greshake et al., 2023: the paper that showed indirect prompt injection against real apps.", href: "https://arxiv.org/abs/2302.12173" },
      { name: "Llama Prompt Guard", kind: "software", note: "An open classifier that flags injection and jailbreak attempts.", href: "https://github.com/meta-llama/PurpleLlama" },
    ],
  },
  "system-design/tool-permissions": {
    lead: "OAuth scopes, short-lived tokens and fine-grained authorization are how least privilege is enforced for agents.",
    tools: [
      { name: "OAuth 2.0 scopes", kind: "standard", note: "RFC 6749 §3.3: request only the scopes the task needs.", href: "https://www.rfc-editor.org/rfc/rfc6749#section-3.3" },
      { name: "RFC 8693 token exchange", kind: "standard", note: "Swap a user's token for a narrower, shorter-lived one for a specific job.", href: "https://www.rfc-editor.org/rfc/rfc8693" },
      { name: "Model Context Protocol authorization", kind: "standard", note: "How MCP servers authorize clients and scope tool access.", href: "https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization" },
      { name: "OWASP LLM06: Excessive Agency", kind: "standard", note: "Too much functionality, permission or autonomy, and how to limit each.", href: "https://genai.owasp.org/llmrisk/llm062025-excessive-agency/" },
    ],
  },
  "system-design/data-leakage": {
    lead: "PII detection, provider data controls and scrubbed telemetry each cover part of the path; none covers all of it.",
    tools: [
      { name: "Microsoft Presidio", kind: "software", note: "Detect and anonymize PII in text before it reaches a model or a log.", href: "https://github.com/microsoft/presidio" },
      { name: "Google Cloud Sensitive Data Protection", kind: "service", note: "Managed detection and de-identification of sensitive data.", href: "https://cloud.google.com/security/products/sensitive-data-protection" },
      { name: "Anthropic data retention", kind: "standard", note: "How long API inputs are kept and the zero-retention options.", href: "https://privacy.anthropic.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data" },
      { name: "OWASP LLM02: Sensitive Information Disclosure", kind: "standard", note: "How personal data and secrets leak through LLM apps, and mitigations.", href: "https://genai.owasp.org/llmrisk/llm022025-sensitive-information-disclosure/" },
      { name: "gitleaks", kind: "software", note: "Catch API keys before they reach a prompt, a log or a repository.", href: "https://github.com/gitleaks/gitleaks" },
    ],
  },
  "system-design/eventual-consistency": {
    lead: "Leaderless stores let you tune R and W per query.",
    tools: [
      { name: "Cassandra consistency levels", kind: "software", note: "ONE, QUORUM, ALL.", href: "https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html#tunable-consistency" },
      { name: "Amazon Dynamo paper", kind: "standard", note: "Quorums, hinted handoff, read repair.", href: "https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf" },
      { name: "Jepsen", kind: "standard", note: "Testing consistency claims.", href: "https://jepsen.io/" },
    ],
  },
  "system-design/cqrs-event-sourcing": {
    lead: "Event stores and stream processors make this practical.",
    tools: [
      { name: "EventStoreDB", kind: "software", note: "A database built for event sourcing.", href: "https://www.eventstore.com/" },
      { name: "Axon Framework", kind: "software", note: "CQRS and event sourcing on the JVM.", href: "https://www.axoniq.io/" },
      { name: "Martin Fowler: Event Sourcing", kind: "standard", note: "The pattern explained.", href: "https://martinfowler.com/eaaDev/EventSourcing.html" },
    ],
  },
  "system-design/conversation-state": {
    lead: "Chat products keep conversations server-side and stream answers from resumable buffers; model APIs offer caching and stored conversations.",
    tools: [
      { name: "Redis Streams", kind: "software", note: "An append-only log per message that a client can resume reading from by id.", href: "https://redis.io/docs/latest/develop/data-types/streams/" },
      { name: "Server-sent events", kind: "standard", note: "Last-Event-ID lets a reconnecting client say where it stopped.", href: "https://html.spec.whatwg.org/multipage/server-sent-events.html" },
      { name: "Anthropic prompt caching", kind: "service", note: "Charge the unchanged conversation prefix at a fraction of the input price.", href: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching" },
      { name: "OpenAI Conversations API", kind: "service", note: "Store conversation state on the provider's side and reference it by id.", href: "https://platform.openai.com/docs/guides/conversation-state" },
    ],
  },
  "system-design/agent-memory": {
    lead: "Memory layers for assistants extract, store and retrieve facts and episodes; the ideas come from cognitive science and a few well-known papers.",
    tools: [
      { name: "Mem0", kind: "software", note: "A memory layer that extracts and retrieves user memories across sessions.", href: "https://github.com/mem0ai/mem0" },
      { name: "Letta (MemGPT)", kind: "software", note: "Agents that manage their own memory tiers, from the MemGPT paper.", href: "https://github.com/letta-ai/letta" },
      { name: "Generative Agents", kind: "standard", note: "Park et al., 2023: a memory stream with retrieval by recency, importance and relevance.", href: "https://arxiv.org/abs/2304.03442" },
      { name: "LangGraph memory", kind: "software", note: "Short-term thread state and long-term stores for agents.", href: "https://langchain-ai.github.io/langgraph/concepts/memory/" },
    ],
  },
  "system-design/memory-updates": {
    lead: "Temporal knowledge stores keep when each fact was true; memory products add review and deletion.",
    tools: [
      { name: "Zep / Graphiti", kind: "software", note: "A temporal knowledge graph: facts with validity intervals, updated as conversations arrive.", href: "https://github.com/getzep/graphiti" },
      { name: "Mem0", kind: "software", note: "Adds, updates and deletes memories by comparing new facts with stored ones.", href: "https://github.com/mem0ai/mem0" },
      { name: "GDPR right to erasure", kind: "standard", note: "Article 17: a user's request to delete personal data, which includes derived memories.", href: "https://gdpr-info.eu/art-17-gdpr/" },
    ],
  },
  "system-design/context-compression": {
    lead: "Agent frameworks ship trimming, summarising and compaction; the research shows why long prompts still need curating.",
    tools: [
      { name: "Lost in the Middle", kind: "standard", note: "Liu et al., 2023: models use information at the start and end of long contexts best.", href: "https://arxiv.org/abs/2307.03172" },
      { name: "LLMLingua", kind: "software", note: "Prompt compression that drops low-information tokens.", href: "https://github.com/microsoft/LLMLingua" },
      { name: "Effective context engineering", kind: "standard", note: "Anthropic's guide to compaction, note-taking and sub-agents for long tasks.", href: "https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents" },
      { name: "LangGraph memory", kind: "software", note: "Trimming and summarising message history in agent threads.", href: "https://langchain-ai.github.io/langgraph/concepts/memory/" },
    ],
  },
  "system-design/memory-isolation": {
    lead: "Isolation is enforced in the store and the cache, not left to every query; the AI-specific risks are catalogued.",
    tools: [
      { name: "PostgreSQL row-level security", kind: "software", note: "Policies that filter every query by the current user, whatever the application code does.", href: "https://www.postgresql.org/docs/current/ddl-rowsecurity.html" },
      { name: "Pinecone namespaces", kind: "service", note: "Partition vectors per tenant so a query can only see one namespace.", href: "https://docs.pinecone.io/guides/index-data/indexing-overview" },
      { name: "Qdrant multitenancy", kind: "software", note: "Payload-based partitioning with a tenant index, enforced per request.", href: "https://qdrant.tech/documentation/guides/multiple-partitions/" },
      { name: "OWASP Top 10 for LLM Applications", kind: "standard", note: "Sensitive information disclosure and prompt injection, with mitigations.", href: "https://genai.owasp.org/llm-top-10/" },
    ],
  },
  "system-design/gossip": {
    lead: "Gossip runs membership in many distributed databases.",
    tools: [
      { name: "HashiCorp Serf", kind: "software", note: "SWIM-based gossip membership.", href: "https://github.com/hashicorp/serf" },
      { name: "SWIM paper", kind: "standard", note: "Scalable membership protocol.", href: "https://www.cs.cornell.edu/projects/Quicksilver/public_pdfs/SWIM.pdf" },
      { name: "Cassandra gossip", kind: "software", note: "How nodes learn cluster state.", href: "https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html#gossip" },
    ],
  },
  "system-design/availability": {
    lead: "Every SLA is expressed in nines.",
    tools: [
      { name: "Uptime calculator", kind: "software", note: "Downtime for any percentage.", href: "https://uptime.is/" },
      { name: "Google SRE: availability", kind: "standard", note: "Embracing risk.", href: "https://sre.google/sre-book/embracing-risk/" },
      { name: "AWS SLAs", kind: "service", note: "Per-service availability commitments.", href: "https://aws.amazon.com/legal/service-level-agreements/" },
    ],
  },
  "system-design/frontend-architecture": {
    lead: "Server-state caches and stores exist for every framework; the split between server and UI state is the same everywhere.",
    tools: [
      { name: "TanStack Query", kind: "software", note: "A server-state cache: fetch by key, dedupe, invalidate after mutations; for React, Vue, Solid and Svelte.", href: "https://github.com/TanStack/query" },
      { name: "SWR", kind: "software", note: "Stale-while-revalidate data fetching with request deduplication.", href: "https://github.com/vercel/swr" },
      { name: "Redux Toolkit", kind: "software", note: "A global client store with selectors, and RTK Query for server state.", href: "https://github.com/reduxjs/redux-toolkit" },
      { name: "Zustand", kind: "software", note: "A small store where components subscribe to exactly the slice they read.", href: "https://github.com/pmndrs/zustand" },
      { name: "URLSearchParams", kind: "standard", note: "The browser API for keeping shareable UI state, like filters, in the URL.", href: "https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams" },
    ],
  },
  "system-design/backend-architecture": {
    lead: "Every backend framework has the same seams: middleware, handlers, services, a transaction boundary, and somewhere to put side effects.",
    tools: [
      { name: "JSON Schema", kind: "standard", note: "Describe and validate request bodies at the edge, in any language.", href: "https://json-schema.org/" },
      { name: "Open Policy Agent", kind: "software", note: "Authorization rules as policy, evaluated next to the service that owns the data.", href: "https://github.com/open-policy-agent/opa" },
      { name: "OWASP API Security Top 10", kind: "standard", note: "Broken object-level authorization is number one: the “someone else's account” request.", href: "https://owasp.org/API-Security/" },
      { name: "Transactional outbox", kind: "standard", note: "Chris Richardson's write-up of the outbox pattern for side effects after commit.", href: "https://microservices.io/patterns/data/transactional-outbox.html" },
      { name: "Debezium", kind: "software", note: "Relays outbox rows from the database log to a broker.", href: "https://github.com/debezium/debezium" },
    ],
  },
  "system-design/api-design": {
    lead: "Public API guidelines from large providers agree on most of this; the standards are short and worth reading.",
    tools: [
      { name: "RFC 9457 Problem Details", kind: "standard", note: "The standard JSON shape for HTTP API errors.", href: "https://www.rfc-editor.org/rfc/rfc9457" },
      { name: "RFC 8594 Sunset header", kind: "standard", note: "Tell clients when a deprecated endpoint or field will stop working.", href: "https://www.rfc-editor.org/rfc/rfc8594" },
      { name: "Google API Improvement Proposals", kind: "standard", note: "Google's API design rules: resource names, pagination tokens, errors, versioning.", href: "https://google.aip.dev/" },
      { name: "Stripe API versioning", kind: "standard", note: "How Stripe ships breaking changes as dated versions while old integrations keep working.", href: "https://stripe.com/blog/api-versioning" },
      { name: "OpenAPI", kind: "standard", note: "Describe the API so clients, docs and contract tests come from one file.", href: "https://www.openapis.org/" },
    ],
  },
  "system-design/session-auth": {
    lead: "The building blocks are standards; hosted identity providers implement refresh rotation and revocation for you.",
    tools: [
      { name: "OAuth 2.0 Security Best Current Practice", kind: "standard", note: "RFC 9700: refresh token rotation, sender-constrained tokens, short lifetimes.", href: "https://www.rfc-editor.org/rfc/rfc9700" },
      { name: "RFC 7519 JSON Web Token", kind: "standard", note: "The JWT format: claims, expiry, signatures.", href: "https://www.rfc-editor.org/rfc/rfc7519" },
      { name: "OWASP Session Management Cheat Sheet", kind: "standard", note: "Cookie flags, session ids, timeouts and revocation.", href: "https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html" },
      { name: "Redis", kind: "software", note: "The usual server-side session store: a lookup per request, delete to sign out.", href: "https://github.com/redis/redis" },
      { name: "Keycloak", kind: "software", note: "Open-source identity server with refresh rotation and session revocation.", href: "https://github.com/keycloak/keycloak" },
    ],
  },
  "system-design/file-uploads": {
    lead: "All three big clouds support direct, resumable uploads to private buckets and events when an object lands.",
    tools: [
      { name: "Amazon S3 presigned URLs", kind: "service", note: "Let a browser PUT one object without your credentials.", href: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html" },
      { name: "S3 multipart upload", kind: "service", note: "Upload in parts, retry a part, join them at the end; required above 5 GB.", href: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html" },
      { name: "Google Cloud Storage resumable uploads", kind: "service", note: "The same idea on Google Cloud: resume from the last byte received.", href: "https://cloud.google.com/storage/docs/resumable-uploads" },
      { name: "tus", kind: "protocol", note: "An open protocol for resumable uploads over HTTP, with servers and clients for many stacks.", href: "https://tus.io/" },
      { name: "MinIO", kind: "software", note: "S3-compatible object storage you can run yourself, including presigned URLs and bucket events.", href: "https://github.com/minio/minio" },
    ],
  },
  "system-design/feature-flags": {
    lead: "Flag platforms handle targeting and rollout for you.",
    tools: [
      { name: "LaunchDarkly", kind: "service", note: "Feature management platform.", href: "https://launchdarkly.com/" },
      { name: "Unleash", kind: "software", note: "Open-source feature flags.", href: "https://www.getunleash.io/" },
      { name: "OpenFeature", kind: "standard", note: "A vendor-neutral flag API.", href: "https://openfeature.dev/" },
    ],
  },
  "system-design/realtime": {
    lead: "Real-time services wrap these transports for you.",
    tools: [
      { name: "Socket.IO", kind: "software", note: "WebSockets with fallbacks.", href: "https://socket.io/" },
      { name: "Ably", kind: "service", note: "Managed pub/sub and presence.", href: "https://ably.com/" },
      { name: "MDN Server-Sent Events", kind: "standard", note: "EventSource in the browser.", href: "https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events" },
    ],
  },
  "system-design/background-jobs": {
    lead: "Every web framework has a job queue library.",
    tools: [
      { name: "BullMQ", kind: "software", note: "Redis-backed jobs for Node.js.", href: "https://docs.bullmq.io/" },
      { name: "Sidekiq", kind: "software", note: "Background jobs for Ruby.", href: "https://sidekiq.org/" },
      { name: "Amazon SQS dead-letter queues", kind: "service", note: "Park messages that keep failing.", href: "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html" },
    ],
  },
  "system-design/search": {
    lead: "Inverted indexes and BM25 are the default in every mainstream search engine, hosted or self-run.",
    tools: [
      { name: "Elasticsearch", kind: "software", note: "Analysers, an inverted index per field, BM25 by default, filters and aggregations for facets.", href: "https://github.com/elastic/elasticsearch" },
      { name: "OpenSearch", kind: "software", note: "The open-source fork of Elasticsearch, with the same index and query model.", href: "https://github.com/opensearch-project/OpenSearch" },
      { name: "PostgreSQL full-text search", kind: "software", note: "tsvector, GIN indexes and ts_rank inside the database you already run.", href: "https://www.postgresql.org/docs/current/textsearch.html" },
      { name: "Meilisearch", kind: "software", note: "A small search engine with typo tolerance and facets out of the box.", href: "https://github.com/meilisearch/meilisearch" },
      { name: "Apache Lucene", kind: "software", note: "The library under Elasticsearch, OpenSearch and Solr: analysers, postings, BM25.", href: "https://github.com/apache/lucene" },
    ],
  },
  "system-design/offline-sync": {
    lead: "Local-first sync is a product category: a database on the device, a sync protocol, and a conflict policy.",
    tools: [
      { name: "SQLite", kind: "software", note: "The database on almost every phone, and the usual local store for offline apps.", href: "https://www.sqlite.org/" },
      { name: "PowerSync", kind: "software", note: "Syncs Postgres to SQLite on the device, with an upload queue for offline writes.", href: "https://github.com/powersync-ja" },
      { name: "CouchDB replication", kind: "software", note: "Revision trees and conflict documents: keep both, let the app choose.", href: "https://docs.couchdb.org/en/stable/replication/conflicts.html" },
      { name: "Firebase Cloud Messaging", kind: "service", note: "Silent pushes that wake an Android or web app to sync.", href: "https://firebase.google.com/docs/cloud-messaging" },
      { name: "Apple Push Notification service", kind: "service", note: "Background pushes that tell an iOS app new data is waiting.", href: "https://developer.apple.com/documentation/usernotifications" },
    ],
  },
  "system-design/collaborative-editing": {
    lead: "Most collaborative editors use one of a few open CRDT libraries, or OT behind a central server.",
    tools: [
      { name: "Yjs", kind: "software", note: "A CRDT for shared text, lists and maps, with bindings for common editors.", href: "https://github.com/yjs/yjs" },
      { name: "Automerge", kind: "software", note: "A JSON-like CRDT with history, built for local-first apps.", href: "https://github.com/automerge/automerge" },
      { name: "ShareDB", kind: "software", note: "Operational transformation over JSON documents with a central server.", href: "https://github.com/share/sharedb" },
      { name: "CRDT resources", kind: "standard", note: "Papers, implementations and talks collected by the CRDT research community.", href: "https://crdt.tech/" },
    ],
  },
  "system-design/email-notifications": {
    lead: "Providers handle delivery; the preferences, deduplication, retries and suppression around them are yours.",
    tools: [
      { name: "Amazon SES", kind: "service", note: "Email sending with per-account rate limits, and bounce and complaint notifications.", href: "https://aws.amazon.com/ses/" },
      { name: "Postmark", kind: "service", note: "Transactional email with bounce webhooks and a suppression list per stream.", href: "https://postmarkapp.com/" },
      { name: "Novu", kind: "software", note: "Open-source notification infrastructure: preferences, digests and channels.", href: "https://github.com/novuhq/novu" },
      { name: "Gmail sender guidelines", kind: "standard", note: "Authentication, one-click unsubscribe and the spam-rate threshold for bulk senders.", href: "https://support.google.com/a/answer/81126" },
      { name: "RFC 8058 one-click unsubscribe", kind: "standard", note: "The List-Unsubscribe-Post header mailbox providers now expect.", href: "https://www.rfc-editor.org/rfc/rfc8058" },
    ],
  },
  "system-design/multi-tenancy": {
    lead: "SaaS platforms choose a tenancy model early.",
    tools: [
      { name: "Postgres row-level security", kind: "software", note: "The database enforces tenant filters.", href: "https://www.postgresql.org/docs/current/ddl-rowsecurity.html" },
      { name: "AWS SaaS Lens", kind: "standard", note: "Silo, bridge and pool models.", href: "https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/saas-lens.html" },
      { name: "Citus", kind: "software", note: "Sharding multi-tenant Postgres.", href: "https://www.citusdata.com/use-cases/multi-tenant-apps/" },
    ],
  },
  "system-design/api-styles": {
    lead: "Each style has a standard and a toolchain behind it; the choice is about the job, not the language.",
    tools: [
      { name: "OpenAPI", kind: "standard", note: "Describe a REST API so clients, docs and validators can be generated from it.", href: "https://www.openapis.org/" },
      { name: "GraphQL", kind: "standard", note: "The query language and spec: one request names the fields it wants.", href: "https://graphql.org/" },
      { name: "gRPC", kind: "software", note: "Typed RPC over HTTP/2 with streaming, generated clients and servers.", href: "https://grpc.io/" },
      { name: "Protocol Buffers", kind: "standard", note: "The binary message format gRPC uses: small, typed, versionable.", href: "https://protobuf.dev/" },
      { name: "The WebSocket Protocol (RFC 6455)", kind: "protocol", note: "The HTTP upgrade and the frame format that keep a connection open both ways.", href: "https://datatracker.ietf.org/doc/html/rfc6455" },
    ],
  },
  "system-design/sync-vs-async": {
    lead: "Handing work to a queue is the same move on every platform; pick the broker, then make the worker idempotent.",
    tools: [
      { name: "Amazon SQS", kind: "service", note: "A managed queue: at-least-once delivery, visibility timeouts and dead-letter queues.", href: "https://aws.amazon.com/sqs/" },
      { name: "RabbitMQ", kind: "software", note: "A message broker with acks, retries and routing between producers and workers.", href: "https://github.com/rabbitmq/rabbitmq-server" },
      { name: "NATS", kind: "software", note: "A small, fast messaging system for request/reply and asynchronous work.", href: "https://github.com/nats-io/nats-server" },
      { name: "Azure Service Bus", kind: "service", note: "Queues and topics with sessions, dead-lettering and scheduled delivery.", href: "https://azure.microsoft.com/en-us/products/service-bus" },
      { name: "Enterprise Integration Patterns", kind: "standard", note: "Hohpe and Woolf's catalogue of messaging patterns: the vocabulary everyone borrows.", href: "https://www.enterpriseintegrationpatterns.com/" },
    ],
  },
  "system-design/service-mesh": {
    lead: "A mesh is a data plane of proxies and a control plane that configures them; these are the ones in production.",
    tools: [
      { name: "Istio", kind: "software", note: "Envoy sidecars (or ambient mode without them) with mTLS, retries, traffic splitting and telemetry.", href: "https://github.com/istio/istio" },
      { name: "Linkerd", kind: "software", note: "A lighter mesh with its own small Rust proxy; mTLS and retries by default.", href: "https://github.com/linkerd/linkerd2" },
      { name: "Envoy", kind: "software", note: "The proxy most meshes use as the sidecar: retries, timeouts, circuit breaking, per-route metrics.", href: "https://github.com/envoyproxy/envoy" },
      { name: "Cilium", kind: "software", note: "Networking and a sidecar-free mesh built on eBPF in the kernel.", href: "https://github.com/cilium/cilium" },
      { name: "SPIFFE", kind: "standard", note: "The identity format the certificates carry: spiffe://trust-domain/ns/…/sa/….", href: "https://spiffe.io/" },
    ],
  },
  "system-design/event-driven": {
    lead: "The broker carries the events; the standards say what an event looks like and who publishes what.",
    tools: [
      { name: "Apache Kafka", kind: "software", note: "The usual backbone for events that several services consume.", href: "https://github.com/apache/kafka" },
      { name: "Amazon EventBridge", kind: "service", note: "An event bus with rules that route events to consumers, no broker to run.", href: "https://aws.amazon.com/eventbridge/" },
      { name: "CloudEvents", kind: "standard", note: "A common envelope for events: id, source, type, time, data.", href: "https://cloudevents.io/" },
      { name: "AsyncAPI", kind: "standard", note: "Describe the events a service publishes and subscribes to, the way OpenAPI describes endpoints.", href: "https://www.asyncapi.com/" },
      { name: "What do you mean by “Event-Driven”?", kind: "standard", note: "Martin Fowler's four patterns: notification, carried state, event sourcing, CQRS.", href: "https://martinfowler.com/articles/201701-event-driven.html" },
    ],
  },
  "system-design/pub-sub": {
    lead: "Partitioned logs with consumer groups and offsets are a product category now, hosted or self-run.",
    tools: [
      { name: "Apache Kafka", kind: "software", note: "Topics, partitions, consumer groups, committed offsets and retention: the reference design.", href: "https://github.com/apache/kafka" },
      { name: "Apache Pulsar", kind: "software", note: "A log with tiered storage and several subscription modes per topic.", href: "https://github.com/apache/pulsar" },
      { name: "Amazon Kinesis Data Streams", kind: "service", note: "Shards, sequence numbers and a retention window, as a managed service.", href: "https://aws.amazon.com/kinesis/data-streams/" },
      { name: "Redpanda", kind: "software", note: "A Kafka-compatible log without ZooKeeper or the JVM.", href: "https://github.com/redpanda-data/redpanda" },
      { name: "Google Cloud Pub/Sub", kind: "service", note: "Topics and subscriptions with replay by timestamp and ordering keys.", href: "https://cloud.google.com/pubsub" },
    ],
  },
  "devops/linux-processes": {
    lead: "Every container and service manager works with these signals.",
    tools: [
      { name: "signal(7)", kind: "software", note: "The full list of Linux signals.", href: "https://man7.org/linux/man-pages/man7/signal.7.html" },
      { name: "tini", kind: "software", note: "A tiny init for containers.", href: "https://github.com/krallin/tini" },
      { name: "Kubernetes pod termination", kind: "software", note: "SIGTERM, grace period, SIGKILL.", href: "https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination" },
    ],
  },
  "devops/system-resources": {
    lead: "The first tools anyone runs on a slow server.",
    tools: [
      { name: "htop", kind: "software", note: "Interactive process viewer.", href: "https://htop.dev/" },
      { name: "sysstat", kind: "software", note: "iostat, mpstat, sar.", href: "https://github.com/sysstat/sysstat" },
      { name: "Linux load averages explained", kind: "standard", note: "Brendan Gregg on what load means.", href: "https://www.brendangregg.com/blog/2017-08-08/linux-load-averages.html" },
    ],
  },
  "devops/dns-records": {
    lead: "Every domain is managed through a zone like this.",
    tools: [
      { name: "Cloudflare DNS", kind: "service", note: "Managed DNS with ALIAS-style flattening.", href: "https://developers.cloudflare.com/dns/" },
      { name: "dig", kind: "software", note: "Query DNS from the command line.", href: "https://www.isc.org/bind/" },
      { name: "OctoDNS", kind: "software", note: "DNS records as code.", href: "https://github.com/octodns/octodns" },
    ],
  },
  "devops/reverse-proxy-config": {
    lead: "Reverse proxies front almost every web app.",
    tools: [
      { name: "nginx", kind: "software", note: "The most common reverse proxy.", href: "https://nginx.org/en/docs/http/ngx_http_proxy_module.html" },
      { name: "Caddy", kind: "software", note: "Automatic HTTPS and simple config.", href: "https://caddyserver.com/" },
      { name: "Traefik", kind: "software", note: "Proxy configured from container labels.", href: "https://traefik.io/" },
    ],
  },
  "devops/vpc": {
    lead: "Every cloud network is built from these pieces.",
    tools: [
      { name: "AWS VPC", kind: "service", note: "Subnets, route tables, gateways.", href: "https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html" },
      { name: "Security groups", kind: "service", note: "Stateful firewalls per resource.", href: "https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html" },
      { name: "VPC flow logs", kind: "service", note: "See accepted and rejected traffic.", href: "https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html" },
    ],
  },
  "devops/dockerfiles": {
    lead: "Build caching is the biggest lever on Docker build time.",
    tools: [
      { name: "Dockerfile best practices", kind: "standard", note: "Ordering, caching, multi-stage.", href: "https://docs.docker.com/build/building/best-practices/" },
      { name: "BuildKit cache", kind: "software", note: "Cache mounts and remote caches.", href: "https://docs.docker.com/build/cache/" },
      { name: "hadolint", kind: "software", note: "Lint Dockerfiles.", href: "https://github.com/hadolint/hadolint" },
    ],
  },
  "devops/container-networking": {
    lead: "Docker and Compose networking is where most local setups break.",
    tools: [
      { name: "Docker networking", kind: "software", note: "Bridge networks and DNS.", href: "https://docs.docker.com/engine/network/" },
      { name: "Compose networking", kind: "software", note: "Services reach each other by name.", href: "https://docs.docker.com/compose/how-tos/networking/" },
      { name: "Kubernetes networking model", kind: "software", note: "Pods, Services, DNS.", href: "https://kubernetes.io/docs/concepts/services-networking/" },
    ],
  },
  "devops/volumes": {
    lead: "Persistent data in containers lives in volumes.",
    tools: [
      { name: "Docker volumes", kind: "software", note: "Named volumes and bind mounts.", href: "https://docs.docker.com/engine/storage/volumes/" },
      { name: "Kubernetes PersistentVolumes", kind: "software", note: "Storage that outlives pods.", href: "https://kubernetes.io/docs/concepts/storage/persistent-volumes/" },
      { name: "Compose volumes", kind: "software", note: "Declaring volumes in compose.yaml.", href: "https://docs.docker.com/reference/compose-file/volumes/" },
    ],
  },
  "devops/pod-autoscaling": {
    lead: "The HPA is built into Kubernetes.",
    tools: [
      { name: "Horizontal Pod Autoscaler", kind: "software", note: "The algorithm and its settings.", href: "https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/#algorithm-details" },
      { name: "KEDA", kind: "software", note: "Autoscale on events and queues.", href: "https://keda.sh/" },
      { name: "Cluster Autoscaler", kind: "software", note: "Adds nodes for pending pods.", href: "https://github.com/kubernetes/autoscaler" },
    ],
  },
  "devops/scheduling": {
    lead: "Every pod goes through the scheduler.",
    tools: [
      { name: "kube-scheduler", kind: "software", note: "Filtering and scoring.", href: "https://kubernetes.io/docs/concepts/scheduling-eviction/kube-scheduler/" },
      { name: "Taints and tolerations", kind: "software", note: "Keep pods off special nodes.", href: "https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/" },
      { name: "Karpenter", kind: "software", note: "Just-in-time node provisioning.", href: "https://karpenter.sh/" },
    ],
  },
  "devops/branching-strategies": {
    lead: "How a team branches shapes how fast it ships.",
    tools: [
      { name: "Trunk-based development", kind: "standard", note: "The practice explained.", href: "https://trunkbaseddevelopment.com/" },
      { name: "GitHub flow", kind: "standard", note: "Short-lived branches and PRs.", href: "https://docs.github.com/en/get-started/using-github/github-flow" },
      { name: "Merge queues", kind: "software", note: "Keep main green while merging often.", href: "https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue" },
    ],
  },
  "devops/pull-requests": {
    lead: "Branch protection decides where a problem gets caught.",
    tools: [
      { name: "Protected branches", kind: "platform", note: "Required checks, reviews and up-to-date rules.", href: "https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches" },
      { name: "CODEOWNERS", kind: "standard", note: "Route a path to the team that owns it.", href: "https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners" },
      { name: "GitHub merge queue", kind: "platform", note: "Tests each PR on top of the ones ahead of it.", href: "https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue" },
      { name: "GitLab merge trains", kind: "platform", note: "The same idea in GitLab.", href: "https://docs.gitlab.com/ci/pipelines/merge_trains/" },
      { name: "Gerrit", kind: "software", note: "Review per commit, with required votes.", href: "https://www.gerritcodereview.com/" },
    ],
  },
  "devops/monorepo-vs-polyrepo": {
    lead: "Build tools that know the graph, and bots that keep versions moving.",
    tools: [
      { name: "Nx", kind: "software", note: "Affected builds and caching for monorepos.", href: "https://github.com/nrwl/nx" },
      { name: "Turborepo", kind: "software", note: "Task graph and remote cache.", href: "https://github.com/vercel/turborepo" },
      { name: "Bazel", kind: "software", note: "Hermetic builds at very large scale.", href: "https://github.com/bazelbuild/bazel" },
      { name: "Renovate", kind: "software", note: "Opens dependency bump PRs automatically.", href: "https://github.com/renovatebot/renovate" },
      { name: "Dependabot", kind: "platform", note: "GitHub's built-in bump PRs.", href: "https://docs.github.com/en/code-security/dependabot" },
    ],
  },
  "devops/pipeline-tests": {
    lead: "Fast tests on every push, real dependencies in containers, slow tests on a schedule.",
    tools: [
      { name: "Testcontainers", kind: "software", note: "Real databases and queues in tests.", href: "https://testcontainers.com/" },
      { name: "Playwright", kind: "software", note: "End-to-end browser tests with sharding.", href: "https://github.com/microsoft/playwright" },
      { name: "Grafana k6", kind: "software", note: "Scripted load tests.", href: "https://github.com/grafana/k6" },
      { name: "GitHub Actions", kind: "platform", note: "Triggers on push, pull request and schedule.", href: "https://github.com/features/actions" },
    ],
  },
  "devops/environments": {
    lead: "Same build, same infrastructure code, checked config, realistic data.",
    tools: [
      { name: "Terraform", kind: "software", note: "One module for every environment.", href: "https://github.com/hashicorp/terraform" },
      { name: "OpenTofu", kind: "software", note: "Open-source Terraform fork.", href: "https://github.com/opentofu/opentofu" },
      { name: "OCI image digests", kind: "standard", note: "Deploy the exact image you tested.", href: "https://github.com/opencontainers/image-spec" },
      { name: "Neon branching", kind: "service", note: "A database copy per preview environment.", href: "https://neon.com/docs/introduction/branching" },
      { name: "Vercel preview deployments", kind: "platform", note: "A URL per pull request.", href: "https://vercel.com/docs/deployments/environments" },
    ],
  },
  "devops/releases-versioning": {
    lead: "Package managers rely on semantic versions.",
    tools: [
      { name: "Semantic Versioning", kind: "standard", note: "The spec.", href: "https://semver.org/" },
      { name: "Conventional Commits", kind: "standard", note: "Commit messages that drive versions.", href: "https://www.conventionalcommits.org/" },
      { name: "release-please", kind: "software", note: "Automated releases and changelogs.", href: "https://github.com/googleapis/release-please" },
    ],
  },
  "devops/build-caching": {
    lead: "Monorepo tools skip work that a change can't affect.",
    tools: [
      { name: "Turborepo", kind: "software", note: "Task graph and remote caching.", href: "https://turbo.build/repo" },
      { name: "Nx affected", kind: "software", note: "Run only affected projects.", href: "https://nx.dev/ci/features/affected" },
      { name: "Bazel", kind: "software", note: "Hermetic, cached builds at scale.", href: "https://bazel.build/" },
    ],
  },
  "devops/supply-chain": {
    lead: "Supply chain security tooling is now standard in CI.",
    tools: [
      { name: "SLSA", kind: "standard", note: "Supply-chain levels for software artifacts.", href: "https://slsa.dev/" },
      { name: "Sigstore cosign", kind: "software", note: "Sign and verify container images.", href: "https://docs.sigstore.dev/cosign/signing/overview/" },
      { name: "Trivy", kind: "software", note: "Scan images and dependencies.", href: "https://trivy.dev/" },
    ],
  },
  "devops/regions-zones": {
    lead: "Every cloud is organised into regions and zones.",
    tools: [
      { name: "AWS regions and AZs", kind: "service", note: "How the infrastructure is laid out.", href: "https://aws.amazon.com/about-aws/global-infrastructure/regions_az/" },
      { name: "Google Cloud zones", kind: "service", note: "Regions and zones on GCP.", href: "https://cloud.google.com/compute/docs/regions-zones" },
      { name: "Azure availability zones", kind: "service", note: "Zone-redundant services.", href: "https://learn.microsoft.com/en-us/azure/reliability/availability-zones-overview" },
    ],
  },
  "devops/serverless": {
    lead: "Serverless platforms bill per request and compute time.",
    tools: [
      { name: "AWS Lambda", kind: "service", note: "Functions billed per request and ms.", href: "https://aws.amazon.com/lambda/pricing/" },
      { name: "Google Cloud Run", kind: "service", note: "Containers that scale to zero.", href: "https://cloud.google.com/run" },
      { name: "Cloudflare Workers", kind: "service", note: "Functions at the edge, tiny cold starts.", href: "https://workers.cloudflare.com/" },
    ],
  },
  "devops/cloud-costs": {
    lead: "FinOps tools break the bill down by team and service.",
    tools: [
      { name: "AWS Cost Explorer", kind: "service", note: "Spend by service and tag.", href: "https://aws.amazon.com/aws-cost-management/aws-cost-explorer/" },
      { name: "Infracost", kind: "software", note: "Cost estimates in pull requests.", href: "https://www.infracost.io/" },
      { name: "Kubecost", kind: "software", note: "Kubernetes cost allocation.", href: "https://www.kubecost.com/" },
    ],
  },
  "devops/structured-logging": {
    lead: "Log platforms index structured fields.",
    tools: [
      { name: "Grafana Loki", kind: "software", note: "Log aggregation with labels.", href: "https://grafana.com/oss/loki/" },
      { name: "pino", kind: "software", note: "Fast JSON logging for Node.js.", href: "https://getpino.io/" },
      { name: "structlog", kind: "software", note: "Structured logging for Python.", href: "https://www.structlog.org/" },
    ],
  },
  "devops/opentelemetry": {
    lead: "OpenTelemetry is the standard for instrumentation.",
    tools: [
      { name: "OpenTelemetry", kind: "standard", note: "APIs, SDKs and the collector.", href: "https://opentelemetry.io/" },
      { name: "Jaeger", kind: "software", note: "Open-source trace storage and UI.", href: "https://www.jaegertracing.io/" },
      { name: "Grafana Tempo", kind: "software", note: "Scalable trace backend.", href: "https://grafana.com/oss/tempo/" },
    ],
  },
  "devops/dora-metrics": {
    lead: "DORA metrics are built into many engineering dashboards.",
    tools: [
      { name: "DORA research", kind: "standard", note: "The State of DevOps reports.", href: "https://dora.dev/" },
      { name: "Four Keys", kind: "software", note: "Open-source DORA metrics pipeline.", href: "https://github.com/dora-team/fourkeys" },
      { name: "Accelerate", kind: "standard", note: "The book behind the metrics.", href: "https://itrevolution.com/product/accelerate/" },
    ],
  },
  "frontend/url-to-pixels": {
    lead: "Browser devtools show every one of these steps.",
    tools: [
      { name: "How browsers work", kind: "standard", note: "web.dev's walkthrough.", href: "https://web.dev/articles/howbrowserswork" },
      { name: "Chrome DevTools Network", kind: "software", note: "Waterfalls with DNS, TLS and TTFB.", href: "https://developer.chrome.com/docs/devtools/network" },
      { name: "WebPageTest", kind: "service", note: "Filmstrips of page loads.", href: "https://www.webpagetest.org/" },
    ],
  },
  "frontend/web-workers": {
    lead: "Workers are built into every browser.",
    tools: [
      { name: "MDN Web Workers", kind: "standard", note: "The Worker API.", href: "https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers" },
      { name: "Comlink", kind: "software", note: "Call worker functions like local ones.", href: "https://github.com/GoogleChromeLabs/comlink" },
      { name: "Partytown", kind: "software", note: "Move third-party scripts to a worker.", href: "https://partytown.qwik.dev/" },
    ],
  },
  "frontend/this-binding": {
    lead: "Every JavaScript developer meets this eventually.",
    tools: [
      { name: "MDN this", kind: "standard", note: "All the rules for this.", href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this" },
      { name: "Function.prototype.bind", kind: "standard", note: "Fix this permanently.", href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind" },
      { name: "TypeScript noImplicitThis", kind: "software", note: "Catch unbound this at compile time.", href: "https://www.typescriptlang.org/tsconfig/#noImplicitThis" },
    ],
  },
  "frontend/prototypes": {
    lead: "Classes in JavaScript are built on prototypes.",
    tools: [
      { name: "MDN prototype chain", kind: "standard", note: "Inheritance and the prototype chain.", href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain" },
      { name: "Object.getPrototypeOf", kind: "standard", note: "Inspect the chain.", href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/getPrototypeOf" },
      { name: "Prototype pollution", kind: "standard", note: "The security bug.", href: "https://portswigger.net/web-security/prototype-pollution" },
    ],
  },
  "frontend/box-model": {
    lead: "Every element on every page is a box.",
    tools: [
      { name: "MDN box model", kind: "standard", note: "Content, padding, border, margin.", href: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Box_model" },
      { name: "box-sizing", kind: "standard", note: "content-box vs border-box.", href: "https://developer.mozilla.org/en-US/docs/Web/CSS/box-sizing" },
      { name: "DevTools box model view", kind: "software", note: "Inspect any element's box.", href: "https://developer.chrome.com/docs/devtools/css/reference" },
    ],
  },
  "frontend/responsive-design": {
    lead: "Responsive layout is the default for the web.",
    tools: [
      { name: "MDN responsive design", kind: "standard", note: "Media queries, flexible layouts.", href: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design" },
      { name: "Responsive images", kind: "standard", note: "srcset and sizes.", href: "https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images" },
      { name: "Container queries", kind: "standard", note: "Respond to a component's width.", href: "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries" },
    ],
  },
  "frontend/css-animations": {
    lead: "Smooth motion depends on easing and which property moves.",
    tools: [
      { name: "MDN CSS transitions", kind: "standard", note: "Transitions and timing functions.", href: "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_transitions/Using_CSS_transitions" },
      { name: "cubic-bezier.com", kind: "software", note: "Design easing curves.", href: "https://cubic-bezier.com/" },
      { name: "Motion", kind: "software", note: "Animation library for React.", href: "https://motion.dev/" },
    ],
  },
  "frontend/reconciliation": {
    lead: "Keys are how React matches list items between renders.",
    tools: [
      { name: "React: preserving state", kind: "standard", note: "Keys and identity.", href: "https://react.dev/learn/preserving-and-resetting-state" },
      { name: "React: rendering lists", kind: "standard", note: "Why keys matter.", href: "https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key" },
      { name: "React DevTools", kind: "software", note: "Inspect the component tree.", href: "https://react.dev/learn/react-developer-tools" },
    ],
  },
  "frontend/hooks": {
    lead: "Every React developer hits this with effects and intervals.",
    tools: [
      { name: "React useEffect", kind: "standard", note: "Dependencies and cleanup.", href: "https://react.dev/reference/react/useEffect" },
      { name: "eslint-plugin-react-hooks", kind: "software", note: "exhaustive-deps catches stale reads.", href: "https://www.npmjs.com/package/eslint-plugin-react-hooks" },
      { name: "You might not need an effect", kind: "standard", note: "When to avoid effects.", href: "https://react.dev/learn/you-might-not-need-an-effect" },
    ],
  },
  "frontend/memoization": {
    lead: "React apps memoise to skip expensive re-renders.",
    tools: [
      { name: "React memo", kind: "standard", note: "Skip re-rendering when props are equal.", href: "https://react.dev/reference/react/memo" },
      { name: "useCallback", kind: "standard", note: "Stable function references.", href: "https://react.dev/reference/react/useCallback" },
      { name: "React Compiler", kind: "software", note: "Automatic memoisation.", href: "https://react.dev/learn/react-compiler" },
    ],
  },
  "frontend/data-fetching": {
    lead: "Data libraries and frameworks exist largely to avoid waterfalls.",
    tools: [
      { name: "TanStack Query", kind: "software", note: "Caching, deduping and prefetching.", href: "https://tanstack.com/query" },
      { name: "React Server Components", kind: "software", note: "Fetch on the server, near the data.", href: "https://react.dev/reference/rsc/server-components" },
      { name: "Chrome DevTools Network", kind: "software", note: "Spot request staircases.", href: "https://developer.chrome.com/docs/devtools/network" },
    ],
  },
  "frontend/optimistic-updates": {
    lead: "Snappy apps update the UI before the server confirms.",
    tools: [
      { name: "React useOptimistic", kind: "standard", note: "Optimistic state in React.", href: "https://react.dev/reference/react/useOptimistic" },
      { name: "TanStack Query optimistic updates", kind: "software", note: "Snapshot and roll back.", href: "https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates" },
      { name: "SWR mutation", kind: "software", note: "Optimistic data with rollback.", href: "https://swr.vercel.app/docs/mutation" },
    ],
  },
  "frontend/csr-ssr-ssg": {
    lead: "Frameworks let each route choose how it renders.",
    tools: [
      { name: "Next.js rendering", kind: "software", note: "Static, dynamic and revalidated routes.", href: "https://nextjs.org/docs/app/building-your-application/rendering" },
      { name: "Astro", kind: "software", note: "Static-first with islands.", href: "https://astro.build/" },
      { name: "web.dev: rendering on the web", kind: "standard", note: "The trade-offs explained.", href: "https://web.dev/articles/rendering-on-the-web" },
    ],
  },
  "frontend/images-fonts": {
    lead: "Images and fonts are most of a typical page's weight.",
    tools: [
      { name: "Squoosh", kind: "software", note: "Compare image formats in the browser.", href: "https://squoosh.app/" },
      { name: "next/image", kind: "software", note: "Resizing, formats and lazy loading.", href: "https://nextjs.org/docs/app/api-reference/components/image" },
      { name: "web.dev: font best practices", kind: "standard", note: "Loading fonts without blocking text.", href: "https://web.dev/articles/font-best-practices" },
    ],
  },
  "frontend/browser-caching": {
    lead: "Cache headers decide how repeat visits load.",
    tools: [
      { name: "MDN HTTP caching", kind: "standard", note: "Cache-Control and validation.", href: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching" },
      { name: "RFC 9111", kind: "standard", note: "HTTP caching spec.", href: "https://www.rfc-editor.org/rfc/rfc9111" },
      { name: "web.dev: HTTP cache", kind: "standard", note: "Practical header recipes.", href: "https://web.dev/articles/http-cache" },
    ],
  },
  "frontend/long-tasks": {
    lead: "INP is a Core Web Vital measured on real users.",
    tools: [
      { name: "web.dev INP", kind: "standard", note: "Interaction to Next Paint.", href: "https://web.dev/articles/inp" },
      { name: "scheduler.yield()", kind: "standard", note: "Yield to the browser between chunks.", href: "https://developer.chrome.com/blog/use-scheduler-yield" },
      { name: "React useTransition", kind: "standard", note: "Interruptible updates.", href: "https://react.dev/reference/react/useTransition" },
    ],
  },
  "frontend/browser-storage": {
    lead: "Every web app stores something in the browser.",
    tools: [
      { name: "MDN Web Storage", kind: "standard", note: "localStorage and sessionStorage.", href: "https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API" },
      { name: "Dexie", kind: "software", note: "A friendly IndexedDB wrapper.", href: "https://dexie.org/" },
      { name: "Workbox", kind: "software", note: "Service worker caching strategies.", href: "https://developer.chrome.com/docs/workbox" },
    ],
  },
  "frontend/cors": {
    lead: "Cross-origin requests are governed by CORS in every browser.",
    tools: [
      { name: "MDN CORS", kind: "standard", note: "Headers, preflights, credentials.", href: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS" },
      { name: "Fetch standard", kind: "standard", note: "The CORS protocol spec.", href: "https://fetch.spec.whatwg.org/#http-cors-protocol" },
      { name: "cors (npm)", kind: "software", note: "CORS middleware for Express.", href: "https://www.npmjs.com/package/cors" },
    ],
  },
  "frontend/csp": {
    lead: "CSP is a standard defence against XSS.",
    tools: [
      { name: "MDN CSP", kind: "standard", note: "Directives and reporting.", href: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP" },
      { name: "CSP Evaluator", kind: "software", note: "Check a policy for weaknesses.", href: "https://csp-evaluator.withgoogle.com/" },
      { name: "Strict CSP", kind: "standard", note: "Nonce-based policies.", href: "https://web.dev/articles/strict-csp" },
    ],
  },
  "frontend/keyboard-focus": {
    lead: "Keyboard access is a baseline accessibility requirement.",
    tools: [
      { name: "WAI-ARIA dialog pattern", kind: "standard", note: "Focus handling in modals.", href: "https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/" },
      { name: "MDN :focus-visible", kind: "standard", note: "Focus styles for keyboard users.", href: "https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible" },
      { name: "axe DevTools", kind: "software", note: "Automated accessibility checks.", href: "https://www.deque.com/axe/devtools/" },
    ],
  },
  "ai/tokenization": {
    lead: "Every model ships with its own tokenizer; you count tokens to budget prompts and estimate cost, whatever your stack.",
    tools: [
      { name: "tiktoken", kind: "software", note: "OpenAI's fast BPE tokenizer for GPT models.", href: "https://github.com/openai/tiktoken" },
      { name: "Hugging Face Tokenizers", kind: "software", note: "Train and run BPE, WordPiece and Unigram tokenizers.", href: "https://github.com/huggingface/tokenizers" },
      { name: "SentencePiece", kind: "software", note: "Language-independent subword tokenizer used by Llama, Gemma and T5.", href: "https://github.com/google/sentencepiece" },
      { name: "Tiktokenizer", kind: "software", note: "Paste a prompt and see its tokens for many models.", href: "https://github.com/dqbd/tiktokenizer" },
      { name: "Anthropic token counting", kind: "service", note: "Count tokens for a Claude request before you send it.", href: "https://platform.claude.com/docs/en/build-with-claude/token-counting" },
    ],
  },
  "ai/preference-tuning": {
    lead: "The same libraries implement both: a PPO loop with a reward model, or a DPO loss on pairs.",
    tools: [
      { name: "Hugging Face TRL", kind: "software", note: "Reward modelling, PPO and DPO trainers for open models.", href: "https://github.com/huggingface/trl" },
      { name: "OpenRLHF", kind: "software", note: "Scalable RLHF with PPO, DPO and friends.", href: "https://github.com/OpenRLHF/OpenRLHF" },
      { name: "InstructGPT", kind: "standard", note: "Ouyang et al., 2022: the RLHF recipe of SFT, reward model and PPO.", href: "https://arxiv.org/abs/2203.02155" },
      { name: "Direct Preference Optimization", kind: "standard", note: "Rafailov et al., 2023: your language model is secretly a reward model.", href: "https://arxiv.org/abs/2305.18290" },
      { name: "Length correlations in RLHF", kind: "standard", note: "Singhal et al., 2023: why preference-tuned models get longer.", href: "https://arxiv.org/abs/2310.03716" },
    ],
  },
  "ai/reasoning-models": {
    lead: "Every provider's reasoning models take a thinking budget or an effort setting; the research names the overthinking problem.",
    tools: [
      { name: "Claude extended thinking", kind: "service", note: "A budget_tokens cap on thinking before the answer.", href: "https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking" },
      { name: "OpenAI reasoning models", kind: "service", note: "A reasoning-effort setting from low to high.", href: "https://platform.openai.com/docs/guides/reasoning" },
      { name: "Gemini thinking", kind: "service", note: "A thinking budget per request.", href: "https://ai.google.dev/gemini-api/docs/thinking" },
      { name: "DeepSeek-R1", kind: "software", note: "An open-weight reasoning model, with its thinking visible.", href: "https://github.com/deepseek-ai/DeepSeek-R1" },
      { name: "s1: simple test-time scaling", kind: "standard", note: "Muennighoff et al., 2025: forcing a thinking budget up or down.", href: "https://arxiv.org/abs/2501.19393" },
      { name: "Do NOT think that much for 2+3=?", kind: "standard", note: "Chen et al., 2024: overthinking on easy problems, measured.", href: "https://arxiv.org/abs/2412.21187" },
    ],
  },
  "ai/open-vs-closed": {
    lead: "Open weights come from a few labs and run on a few serving stacks; comparison sites track price and quality across both kinds.",
    tools: [
      { name: "Llama", kind: "software", note: "Meta's open-weight models and reference code.", href: "https://github.com/meta-llama/llama-models" },
      { name: "Mistral", kind: "service", note: "Open-weight models and a hosted API from the same lab.", href: "https://mistral.ai/" },
      { name: "vLLM", kind: "software", note: "The usual way to serve open weights at scale, with batching.", href: "https://github.com/vllm-project/vllm" },
      { name: "OpenRouter", kind: "service", note: "One API in front of hosted and open models, with prices side by side.", href: "https://openrouter.ai/" },
      { name: "Artificial Analysis", kind: "service", note: "Independent quality, speed and price comparisons across models.", href: "https://artificialanalysis.ai/" },
    ],
  },
  "ai/bias-fairness": {
    lead: "Fairness toolkits compute these measures per group; the papers prove you can't have them all.",
    tools: [
      { name: "Fairlearn", kind: "software", note: "Fairness metrics by group and mitigation algorithms.", href: "https://github.com/fairlearn/fairlearn" },
      { name: "AI Fairness 360", kind: "software", note: "IBM's toolkit of bias metrics and mitigations.", href: "https://github.com/Trusted-AI/AIF360" },
      { name: "Aequitas", kind: "software", note: "A bias audit toolkit for decision systems.", href: "https://github.com/dssg/aequitas" },
      { name: "Fair prediction with disparate impact", kind: "standard", note: "Chouldechova, 2017: calibration and equal error rates can't both hold when base rates differ.", href: "https://arxiv.org/abs/1703.00056" },
      { name: "Inherent trade-offs in fair risk scores", kind: "standard", note: "Kleinberg, Mullainathan and Raghavan, 2016: the impossibility theorem.", href: "https://arxiv.org/abs/1609.05807" },
    ],
  },
  "ai/attention": {
    lead: "Every transformer runs this same score, mask, softmax and blend, in every head and every layer.",
    tools: [
      { name: "Attention Is All You Need", kind: "standard", note: "The 2017 paper that introduced the transformer and scaled dot-product attention.", href: "https://arxiv.org/abs/1706.03762" },
      { name: "Transformer Explainer", kind: "software", note: "Interactive GPT-2 in the browser, from Georgia Tech's Polo Club.", href: "https://github.com/poloclub/transformer-explainer" },
      { name: "BertViz", kind: "software", note: "Visualize attention heads of real models.", href: "https://github.com/jessevig/bertviz" },
      { name: "nanoGPT", kind: "software", note: "A small, readable GPT you can train yourself.", href: "https://github.com/karpathy/nanoGPT" },
      { name: "FlashAttention", kind: "software", note: "The fast, memory-efficient attention kernel most inference stacks use.", href: "https://github.com/Dao-AILab/flash-attention" },
    ],
  },
  "ai/context-window": {
    lead: "Every hosted model bills per token and caps the window; prompt caching and trimming are the levers in any stack.",
    tools: [
      { name: "Anthropic prompt caching", kind: "service", note: "Cache a long, unchanged prefix and pay a fraction to reuse it.", href: "https://platform.claude.com/docs/en/build-with-claude/prompt-caching" },
      { name: "OpenAI prompt caching", kind: "service", note: "Automatic discount on repeated prompt prefixes.", href: "https://developers.openai.com/api/docs/guides/prompt-caching" },
      { name: "Gemini context caching", kind: "service", note: "Store a large context once and reference it across calls.", href: "https://ai.google.dev/gemini-api/docs/caching" },
      { name: "vLLM", kind: "software", note: "Self-hosted inference with automatic prefix caching.", href: "https://github.com/vllm-project/vllm" },
    ],
  },
  "ai/hybrid-search": {
    lead: "Search engines and vector databases now ship BM25, vectors and fusion together; rerankers sit on top as a service.",
    tools: [
      { name: "Elasticsearch", kind: "software", note: "BM25 plus dense vectors, with reciprocal rank fusion built in.", href: "https://github.com/elastic/elasticsearch" },
      { name: "OpenSearch", kind: "software", note: "Open-source search with hybrid queries and normalization.", href: "https://opensearch.org/" },
      { name: "Weaviate", kind: "service", note: "Vector database with a hybrid (BM25 + vector) query.", href: "https://weaviate.io/" },
      { name: "Qdrant", kind: "software", note: "Vector database with sparse + dense vectors and fusion.", href: "https://github.com/qdrant/qdrant" },
      { name: "Vespa", kind: "platform", note: "Search and ranking engine with multi-phase ranking.", href: "https://vespa.ai/" },
      { name: "Cohere Rerank", kind: "service", note: "Hosted cross-encoder reranker for search results.", href: "https://cohere.com/rerank" },
    ],
  },
  "ai/evals": {
    lead: "Eval tools all do the same three things: run a test set, grade it with code and models, and compare versions over time.",
    tools: [
      { name: "promptfoo", kind: "software", note: "Test prompts against cases with assertions and model graders, from the command line.", href: "https://github.com/promptfoo/promptfoo" },
      { name: "OpenAI Evals", kind: "software", note: "Framework and registry of evals for language models.", href: "https://github.com/openai/evals" },
      { name: "Inspect", kind: "software", note: "The UK AI Security Institute's open evaluation framework.", href: "https://github.com/UKGovernmentBEIS/inspect_ai" },
      { name: "Ragas", kind: "software", note: "Metrics for RAG: faithfulness, answer relevance, context recall.", href: "https://github.com/explodinggradients/ragas" },
      { name: "Braintrust", kind: "platform", note: "Hosted evals, scoring and experiment comparison.", href: "https://www.braintrust.dev/" },
      { name: "LangSmith", kind: "platform", note: "Tracing, datasets and evaluators for LLM apps.", href: "https://www.langchain.com/langsmith" },
    ],
  },
  "dsa/hash-map": {
    lead: "Grouping by a computed key is how databases and data tools group rows, not just an interview trick.",
    tools: [
      { name: "Optimal Round: arrays & hashing", kind: "software", note: "19 problems to practise this pattern, with a test runner.", href: "https://github.com/sarmadkung/optimal-round/tree/main/problems/01-arrays-hashing" },
      { name: "Redis hashes", kind: "service", note: "A hash map per key, served over the network.", href: "https://github.com/redis/redis" },
      { name: "SQL GROUP BY", kind: "standard", note: "Databases group rows with a hash table on the grouping key.", href: "https://www.postgresql.org/docs/current/queries-table-expressions.html" },
    ],
  },
  "dsa/two-pointers": {
    lead: "Two indices walking a sorted sequence is how merge joins and merge sort combine data.",
    tools: [
      { name: "Optimal Round: two pointers", kind: "software", note: "Explainer plus 15 problems to practise, with a test runner.", href: "https://github.com/sarmadkung/optimal-round/tree/main/algorithms/03-two-pointers" },
      { name: "Merge join", kind: "standard", note: "Databases join two sorted inputs with one pointer in each.", href: "https://www.postgresql.org/docs/current/planner-optimizer.html" },
    ],
  },
  "dsa/monotonic-stack": {
    lead: "“Next greater element” questions show up in stock spans, histograms and skyline problems.",
    tools: [
      { name: "Optimal Round: monotonic stack", kind: "software", note: "Explainer plus stack problems, with a test runner.", href: "https://github.com/sarmadkung/optimal-round/tree/main/algorithms/10-monotonic-stack" },
      { name: "Optimal Round: stack problems", kind: "software", note: "Daily temperatures, largest rectangle, car fleet and more.", href: "https://github.com/sarmadkung/optimal-round/tree/main/problems/04-stack" },
    ],
  },
  "dsa/bfs-vs-dfs": {
    lead: "Graph search runs inside route planners, web crawlers, dependency resolvers and garbage collectors.",
    tools: [
      { name: "Optimal Round: BFS and DFS", kind: "software", note: "Explainer for both searches and when to pick each.", href: "https://github.com/sarmadkung/optimal-round/tree/main/algorithms/11-bfs-and-dfs" },
      { name: "Optimal Round: graph problems", kind: "software", note: "Islands, course schedule, clone graph and more.", href: "https://github.com/sarmadkung/optimal-round/tree/main/problems/08-graphs" },
      { name: "Neo4j", kind: "software", note: "Graph database with built-in breadth- and depth-first traversals.", href: "https://github.com/neo4j/neo4j" },
    ],
  },
  "nodejs/thread-pool": {
    lead: "Any runtime with one event loop needs somewhere to put blocking work: a pool, a worker, or the OS.",
    tools: [
      { name: "libuv", kind: "software", note: "The thread pool itself: 4 threads by default, UV_THREADPOOL_SIZE up to 1024.", href: "https://github.com/libuv/libuv" },
      { name: "Node.js", kind: "platform", note: "fs, crypto, zlib and dns.lookup run on the pool; sockets don't.", href: "https://github.com/nodejs/node" },
      { name: "Tokio", kind: "software", note: "Rust's async runtime uses a separate blocking pool for the same reason.", href: "https://github.com/tokio-rs/tokio" },
    ],
  },
  "system-design/consistent-hashing": {
    lead: "Distributed caches, databases and load balancers all use rings or similar schemes to move as little data as possible.",
    tools: [
      { name: "Apache Cassandra", kind: "software", note: "Token ring with virtual nodes for data placement.", href: "https://github.com/apache/cassandra" },
      { name: "Amazon DynamoDB", kind: "service", note: "Partitioning descended from the Dynamo paper's consistent hashing.", href: "https://aws.amazon.com/dynamodb/" },
      { name: "Envoy ring hash / Maglev", kind: "software", note: "Load balancing that keeps a client on the same backend.", href: "https://github.com/envoyproxy/envoy" },
      { name: "Memcached clients", kind: "software", note: "Ketama consistent hashing spreads keys over cache servers.", href: "https://github.com/memcached/memcached" },
    ],
  },
  "devops/rolling-deploys": {
    lead: "Rolling updates, readiness probes and rollbacks are the same idea on every orchestrator and cloud.",
    tools: [
      { name: "Kubernetes Deployments", kind: "platform", note: "maxSurge, maxUnavailable, readiness probes, rollout undo.", href: "https://github.com/kubernetes/kubernetes" },
      { name: "Argo Rollouts", kind: "software", note: "Canary and blue-green with automatic rollback on bad metrics.", href: "https://github.com/argoproj/argo-rollouts" },
      { name: "Flagger", kind: "software", note: "Progressive delivery that promotes or rolls back from metrics.", href: "https://github.com/fluxcd/flagger" },
      { name: "Amazon ECS", kind: "service", note: "Rolling deployments with health checks and circuit breaker rollback.", href: "https://aws.amazon.com/ecs/" },
    ],
  },
  "ai-automation/schedules": {
    lead: "Every scheduler has to decide what a missed run means; the names differ, the choice doesn't.",
    tools: [
      { name: "Apache Airflow", kind: "software", note: "catchup and backfill decide whether missed intervals run.", href: "https://github.com/apache/airflow" },
      { name: "Temporal Schedules", kind: "software", note: "Durable schedules with a catch-up window and overlap policy.", href: "https://github.com/temporalio/temporal" },
      { name: "Kubernetes CronJob", kind: "platform", note: "startingDeadlineSeconds and concurrencyPolicy.", href: "https://github.com/kubernetes/kubernetes" },
      { name: "n8n Schedule Trigger", kind: "software", note: "Cron-based triggers for workflows.", href: "https://github.com/n8n-io/n8n" },
    ],
  },
  "tools/github-actions": {
    lead: "Event-triggered YAML pipelines are the norm across CI products; the keywords change, the model doesn't.",
    tools: [
      { name: "GitHub Actions", kind: "platform", note: "Workflows in .github/workflows, triggered by repository events.", href: "https://github.com/features/actions" },
      { name: "actions/runner", kind: "software", note: "The open-source runner; self-host it on your own machines.", href: "https://github.com/actions/runner" },
      { name: "actions/cache", kind: "software", note: "Cache dependencies between runs to cut install time.", href: "https://github.com/actions/cache" },
      { name: "act", kind: "software", note: "Run your workflows locally in containers before pushing.", href: "https://github.com/nektos/act" },
    ],
  },
  "ai/message-roles": {
    lead: "Every chat API takes roles; open models ship the chat template that turns them into one string.",
    tools: [
      { name: "Hugging Face chat templates", kind: "software", note: "apply_chat_template renders messages with the template stored in each model.", href: "https://huggingface.co/docs/transformers/main/en/chat_templating" },
      { name: "Anthropic system prompts", kind: "service", note: "The system prompt as a separate parameter of the Messages API.", href: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/system-prompts" },
      { name: "OpenAI Model Spec", kind: "standard", note: "The chain of command between developer, user and tool messages.", href: "https://model-spec.openai.com/" },
      { name: "Llama models", kind: "software", note: "Meta's reference code, including the Llama 3 prompt format.", href: "https://github.com/meta-llama/llama-models" },
      { name: "Gemma prompt format", kind: "standard", note: "Two roles only, user and model, for Gemma 1 to 3.", href: "https://ai.google.dev/gemma/docs/core/prompt-structure" },
      { name: "Ollama", kind: "software", note: "Runs open models locally and applies each one's template for you.", href: "https://github.com/ollama/ollama" },
    ],
  },
  "ai/few-shot": {
    lead: "Few-shot examples are plain prompt text; tools help you pick them and measure whether they help.",
    tools: [
      { name: "Language Models are Few-Shot Learners", kind: "standard", note: "Brown et al., 2020: the GPT-3 paper that named zero-, one- and few-shot prompting.", href: "https://arxiv.org/abs/2005.14165" },
      { name: "Calibrate Before Use", kind: "standard", note: "Zhao et al., 2021: majority-label and recency bias in few-shot prompts.", href: "https://arxiv.org/abs/2102.09690" },
      { name: "DSPy", kind: "software", note: "Chooses and tunes few-shot examples automatically against a metric.", href: "https://github.com/stanfordnlp/dspy" },
      { name: "promptfoo", kind: "software", note: "Runs prompt variants over a test set and scores every output.", href: "https://github.com/promptfoo/promptfoo" },
    ],
  },
  "ai/chain-of-thought": {
    lead: "Prompted chain of thought works with any model; reasoning models do it on their own, with a budget you set.",
    tools: [
      { name: "Chain-of-Thought Prompting", kind: "standard", note: "Wei et al., 2022: worked steps in the prompt lift multi-step accuracy.", href: "https://arxiv.org/abs/2201.11903" },
      { name: "Self-Consistency", kind: "standard", note: "Wang et al., 2022: sample several chains and take the majority answer.", href: "https://arxiv.org/abs/2203.11171" },
      { name: "Claude extended thinking", kind: "service", note: "Thinking tokens before the answer, with a token budget.", href: "https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking" },
      { name: "OpenAI reasoning models", kind: "service", note: "o-series models with a reasoning-effort setting.", href: "https://platform.openai.com/docs/guides/reasoning" },
      { name: "DeepSeek-R1", kind: "software", note: "Open-weight reasoning model trained with reinforcement learning.", href: "https://github.com/deepseek-ai/DeepSeek-R1" },
    ],
  },
  "ai/prompt-patterns": {
    lead: "Provider guides agree on the same patterns; eval tools tell you whether a change actually helped.",
    tools: [
      { name: "Anthropic prompt engineering", kind: "standard", note: "XML tags, examples, letting the model think, and prefilling.", href: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview" },
      { name: "OpenAI prompt engineering", kind: "standard", note: "Delimiters, clear output formats and step-by-step instructions.", href: "https://platform.openai.com/docs/guides/prompt-engineering" },
      { name: "OWASP LLM01: Prompt injection", kind: "standard", note: "Why delimiters reduce injection but can't be the only defence.", href: "https://genai.owasp.org/llmrisk/llm01-prompt-injection/" },
      { name: "Personas in system prompts", kind: "standard", note: "Zheng et al., 2024: personas don't improve accuracy on factual questions.", href: "https://arxiv.org/abs/2311.10054" },
      { name: "promptfoo", kind: "software", note: "Code and model-graded checks over every prompt version.", href: "https://github.com/promptfoo/promptfoo" },
      { name: "Langfuse", kind: "software", note: "Version prompts and trace which version produced each reply.", href: "https://github.com/langfuse/langfuse" },
    ],
  },
  "ai/graph-rag": {
    lead: "Graph retrieval pairs an LLM that extracts entities with a graph store you can walk.",
    tools: [
      { name: "Microsoft GraphRAG", kind: "software", note: "Entity extraction, Leiden communities, and local and global search.", href: "https://github.com/microsoft/graphrag" },
      { name: "From Local to Global", kind: "standard", note: "Edge et al., 2024: the GraphRAG paper on community summaries.", href: "https://arxiv.org/abs/2404.16130" },
      { name: "Neo4j", kind: "software", note: "Graph database with Cypher queries and vector indexes.", href: "https://neo4j.com/" },
      { name: "LightRAG", kind: "software", note: "A lighter graph RAG with cheaper indexing and incremental updates.", href: "https://github.com/HKUDS/LightRAG" },
      { name: "LlamaIndex property graphs", kind: "software", note: "Build a knowledge graph from documents and retrieve by walking it.", href: "https://docs.llamaindex.ai/en/stable/module_guides/indexing/lpg_index_guide/" },
    ],
  },
  "ai/agent-patterns": {
    lead: "Agent frameworks are mostly ways to wire these patterns; the patterns work with a plain model API too.",
    tools: [
      { name: "Building effective agents", kind: "standard", note: "Anthropic's write-up of these six patterns (Dec 2024).", href: "https://www.anthropic.com/engineering/building-effective-agents" },
      { name: "LangGraph", kind: "software", note: "Graphs of model calls with loops, branches and state.", href: "https://github.com/langchain-ai/langgraph" },
      { name: "OpenAI Agents SDK", kind: "software", note: "Agents, handoffs and guardrails.", href: "https://github.com/openai/openai-agents-python" },
      { name: "AutoGen", kind: "software", note: "Multi-agent conversations and orchestration.", href: "https://github.com/microsoft/autogen" },
      { name: "Temporal", kind: "software", note: "Durable execution for long-running agent workflows.", href: "https://github.com/temporalio/temporal" },
    ],
  },
  "ai-native/structured-output": {
    lead: "Schemas constrain generation so parsers never see invalid shapes — across vendors and runtimes.",
    tools: [
      { name: "JSON Schema", kind: "standard", note: "Describe object shape; many validators and model APIs accept it.", href: "https://json-schema.org/" },
      { name: "OpenAI Structured Outputs", kind: "service", note: "Response format enforced to a JSON schema.", href: "https://platform.openai.com/docs/guides/structured-outputs" },
      { name: "Google Gemini response schema", kind: "service", note: "Constrained JSON from Gemini models.", href: "https://ai.google.dev/gemini-api/docs/json-mode" },
      { name: "Outlines / Guidance", kind: "software", note: "Open-source constrained decoding for local models.", href: "https://github.com/dottxt-ai/outlines" },
    ],
  },
  "ai-native/tool-calling": {
    lead: "Models emit structured call requests; your app runs the tool and returns results — same pattern everywhere.",
    tools: [
      { name: "OpenAI function calling", kind: "service", note: "Tools defined in the API; model returns JSON arguments.", href: "https://platform.openai.com/docs/guides/function-calling" },
      { name: "Anthropic tool use", kind: "service", note: "Claude requests tools with typed inputs.", href: "https://docs.anthropic.com/en/docs/build-with-claude/tool-use" },
      { name: "Model Context Protocol (MCP)", kind: "protocol", note: "Standard way to expose tools to agents and IDEs.", href: "https://modelcontextprotocol.io/" },
      { name: "OpenAPI tools", kind: "standard", note: "Describe HTTP tools once; many agents can call them.", href: "https://www.openapis.org/" },
    ],
  },
  "ai-automation/workflow": {
    lead: "Visual or code-defined workflows route events through branches and actions — no single language required.",
    tools: [
      { name: "n8n", kind: "software", note: "Self-hosted or cloud workflow automation with webhooks.", href: "https://github.com/n8n-io/n8n" },
      { name: "Zapier", kind: "platform", note: "SaaS trigger → action automations.", href: "https://zapier.com/" },
      { name: "Temporal", kind: "software", note: "Durable workflows with retries and timers in code.", href: "https://github.com/temporalio/temporal" },
      { name: "AWS Step Functions", kind: "platform", note: "State machines for serverless orchestration.", href: "https://aws.amazon.com/step-functions/" },
    ],
  },
  "ai-automation/human-approval": {
    lead: "Human-in-the-loop steps pause automation until someone approves — common in ticketing and chat ops.",
    tools: [
      { name: "Slack Workflow Builder", kind: "platform", note: "Approval buttons and routed messages in Slack.", href: "https://slack.com/features/workflow-automation" },
      { name: "ServiceNow approval flows", kind: "platform", note: "Enterprise change and approval records.", href: "https://www.servicenow.com/" },
      { name: "Temporal signals", kind: "software", note: "Wait for human input inside a durable workflow.", href: "https://docs.temporal.io/workflows" },
      { name: "n8n Wait / approval nodes", kind: "software", note: "Pause a workflow until a webhook or form response.", href: "https://github.com/n8n-io/n8n" },
    ],
  },
  "tools/cursor-agent": {
    lead: "Coding agents loop: read context, edit files, run checks — similar products share the same shape.",
    tools: [
      { name: "Cursor", kind: "software", note: "IDE agent with repo search, edits, and terminal.", href: "https://cursor.com/" },
      { name: "GitHub Copilot Workspace", kind: "platform", note: "Issue → plan → edit flow in GitHub.", href: "https://github.com/features/copilot" },
      { name: "Devin", kind: "platform", note: "Autonomous software engineering agent.", href: "https://devin.ai/" },
      { name: "Aider", kind: "software", note: "Terminal pair-programmer with git integration.", href: "https://github.com/Aider-AI/aider" },
    ],
  },
  "tools/mcp": {
    lead: "MCP is the wire format between an app and a tool server — any language can implement either side.",
    tools: [
      { name: "Model Context Protocol", kind: "protocol", note: "List tools, call them, stream results.", href: "https://modelcontextprotocol.io/" },
      { name: "MCP SDKs", kind: "software", note: "Official TypeScript, Python, and other server/client kits.", href: "https://github.com/modelcontextprotocol" },
      { name: "Claude Desktop connectors", kind: "platform", note: "Local MCP servers wired into Claude.", href: "https://modelcontextprotocol.io/" },
    ],
  },
  "tools/n8n": {
    lead: "Webhook-driven automation with branching is a category — n8n is one open-source option.",
    tools: [
      { name: "n8n", kind: "software", note: "Self-host or cloud; IF nodes, Slack, email, HTTP.", href: "https://github.com/n8n-io/n8n" },
      { name: "Make (Integromat)", kind: "platform", note: "Visual scenarios with routers and filters.", href: "https://www.make.com/" },
      { name: "Zapier", kind: "platform", note: "Multi-step Zaps with paths and filters.", href: "https://zapier.com/" },
      { name: "Pipedream", kind: "platform", note: "Code + no-code steps triggered by HTTP.", href: "https://pipedream.com/" },
    ],
  },
  "dsa/two-sum": {
    lead: "The pattern is universal; runtimes give you hash maps and sorting without a separate product.",
    tools: [
      { name: "Hash map / dictionary", kind: "standard", note: "O(1) average lookups — built into every mainstream language.", href: "https://en.wikipedia.org/wiki/Hash_table" },
      { name: "Sort + two pointers", kind: "standard", note: "After sorting, walk from both ends; no extra library.", href: "https://en.wikipedia.org/wiki/Two-pointer_technique" },
    ],
  },
  "dsa/sliding-window": {
    lead: "Fixed windows are implemented with arrays or deques in memory — the technique, not a vendor SKU.",
    tools: [
      { name: "Deque / ring buffer", kind: "standard", note: "O(1) push/pop at both ends for streaming windows.", href: "https://en.wikipedia.org/wiki/Double-ended_queue" },
      { name: "Stream processing", kind: "software", note: "Flink, Kafka Streams — windows over live events at scale.", href: "https://flink.apache.org/" },
    ],
  },
  "dsa/tree-recursion": {
    lead: "Trees are everywhere software keeps a hierarchy, and most code that walks them is this same recursion.",
    tools: [
      { name: "Optimal Round: tree problems", kind: "software", note: "Invert, depth, validate a BST, level order and more.", href: "https://github.com/sarmadkung/optimal-round/tree/main/problems/07-trees" },
      { name: "The DOM", kind: "standard", note: "A web page is a tree; browsers walk it to style, lay out and paint.", href: "https://dom.spec.whatwg.org/" },
      { name: "TypeScript compiler", kind: "software", note: "Parses code into a syntax tree and checks it node by node.", href: "https://github.com/microsoft/TypeScript" },
    ],
  },
  "dsa/dynamic-programming": {
    lead: "Dynamic programming shows up wherever a big choice splits into smaller ones that repeat.",
    tools: [
      { name: "Optimal Round: DP problems", kind: "software", note: "Climbing stairs, coin change, edit distance and 15 more.", href: "https://github.com/sarmadkung/optimal-round/tree/main/problems/09-dynamic-programming" },
      { name: "git diff", kind: "software", note: "Finds the smallest set of line edits between two files with a DP-style search.", href: "https://git-scm.com/docs/git-diff" },
      { name: "PostgreSQL query planner", kind: "software", note: "Picks the cheapest join order by building it up from smaller joins.", href: "https://www.postgresql.org/docs/current/planner-optimizer.html" },
    ],
  },
  "dsa/binary-search": {
    lead: "Binary search is an algorithm on sorted data; libraries only save you from writing the loop.",
    tools: [
      { name: "Standard library search", kind: "standard", note: "e.g. C++ `lower_bound`, Java `Arrays.binarySearch`, .NET `BinarySearch`.", href: "https://en.wikipedia.org/wiki/Binary_search_algorithm" },
      { name: "Database indexes", kind: "service", note: "B-trees inside Postgres, MySQL, etc. — same halving idea on disk.", href: "https://www.postgresql.org/docs/current/indexes.html" },
    ],
  },
  // Databases: relational basics, query engine, storage
  "databases/relational-model": {
    lead: "Primary and foreign keys work the same way in every relational database.",
    tools: [
      { name: "PostgreSQL constraints", kind: "software", note: "PRIMARY KEY, FOREIGN KEY and ON DELETE actions.", href: "https://www.postgresql.org/docs/current/ddl-constraints.html" },
      { name: "MySQL foreign keys", kind: "software", note: "How InnoDB checks references and cascades.", href: "https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html" },
      { name: "SQLite foreign keys", kind: "software", note: "Off by default; turn on with PRAGMA foreign_keys.", href: "https://www.sqlite.org/foreignkeys.html" },
    ],
  },
  "databases/sql-joins": {
    lead: "Join semantics are part of the SQL standard, so the same rows come out everywhere.",
    tools: [
      { name: "PostgreSQL joined tables", kind: "software", note: "INNER, LEFT, RIGHT and FULL joins, and ON vs WHERE.", href: "https://www.postgresql.org/docs/current/queries-table-expressions.html" },
      { name: "SQLite SELECT", kind: "software", note: "Join syntax and processing in SQLite.", href: "https://www.sqlite.org/lang_select.html" },
      { name: "MySQL JOIN", kind: "software", note: "MySQL's join syntax.", href: "https://dev.mysql.com/doc/refman/8.4/en/join.html" },
    ],
  },
  "databases/aggregation": {
    lead: "GROUP BY, aggregates and HAVING behave the same in every SQL database.",
    tools: [
      { name: "PostgreSQL aggregate functions", kind: "software", note: "COUNT, SUM, AVG, MAX and many more.", href: "https://www.postgresql.org/docs/current/functions-aggregate.html" },
      { name: "PostgreSQL GROUP BY and HAVING", kind: "software", note: "How grouping and group filters run.", href: "https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-GROUP" },
      { name: "MySQL GROUP BY handling", kind: "software", note: "ONLY_FULL_GROUP_BY and columns outside the group.", href: "https://dev.mysql.com/doc/refman/8.4/en/group-by-handling.html" },
    ],
  },
  "databases/normal-forms": {
    lead: "Normalizing is schema design; the database enforces it with keys and constraints.",
    tools: [
      { name: "PostgreSQL data definition", kind: "software", note: "Tables, keys and constraints for a normalized schema.", href: "https://www.postgresql.org/docs/current/ddl.html" },
      { name: "dbdiagram.io", kind: "service", note: "Draw tables and relations before you create them.", href: "https://dbdiagram.io" },
      { name: "SQLite foreign keys", kind: "software", note: "Keeps the split tables consistent.", href: "https://www.sqlite.org/foreignkeys.html" },
    ],
  },
  "databases/query-lifecycle": {
    lead: "Every SQL database parses, plans and executes; Postgres documents each stage.",
    tools: [
      { name: "PostgreSQL internals overview", kind: "software", note: "Parser, rewriter, planner and executor.", href: "https://www.postgresql.org/docs/current/overview.html" },
      { name: "PREPARE", kind: "standard", note: "Parse and plan once, execute many times.", href: "https://www.postgresql.org/docs/current/sql-prepare.html" },
      { name: "PostgreSQL wire protocol", kind: "protocol", note: "How the SQL text and the rows travel.", href: "https://www.postgresql.org/docs/current/protocol.html" },
      { name: "SQLite architecture", kind: "software", note: "Tokenizer, parser, code generator and virtual machine.", href: "https://www.sqlite.org/arch.html" },
    ],
  },
  "databases/explain-plans": {
    lead: "EXPLAIN is how you see the plan in any database.",
    tools: [
      { name: "PostgreSQL EXPLAIN", kind: "software", note: "Costs, row estimates and EXPLAIN ANALYZE.", href: "https://www.postgresql.org/docs/current/using-explain.html" },
      { name: "MySQL EXPLAIN", kind: "software", note: "Plan output, including EXPLAIN ANALYZE.", href: "https://dev.mysql.com/doc/refman/8.4/en/explain.html" },
      { name: "PEV2", kind: "software", note: "Paste a Postgres plan and see it as a tree.", href: "https://github.com/dalibo/pev2" },
    ],
  },
  "databases/statistics": {
    lead: "The planner is only as good as the statistics ANALYZE saves.",
    tools: [
      { name: "PostgreSQL planner statistics", kind: "software", note: "Most common values, histograms and n_distinct.", href: "https://www.postgresql.org/docs/current/planner-stats.html" },
      { name: "CREATE STATISTICS", kind: "software", note: "Extended statistics for correlated columns.", href: "https://www.postgresql.org/docs/current/sql-createstatistics.html" },
      { name: "ANALYZE", kind: "software", note: "Refresh statistics after big data changes.", href: "https://www.postgresql.org/docs/current/sql-analyze.html" },
      { name: "MySQL optimizer statistics", kind: "software", note: "Index statistics and histograms in MySQL.", href: "https://dev.mysql.com/doc/refman/8.4/en/optimizer-statistics.html" },
    ],
  },
  "databases/query-tuning": {
    lead: "Find the slow query, read its plan, change one thing, measure again.",
    tools: [
      { name: "pg_stat_statements", kind: "software", note: "Which queries take the most total time.", href: "https://www.postgresql.org/docs/current/pgstatstatements.html" },
      { name: "auto_explain", kind: "software", note: "Logs the plans of slow queries automatically.", href: "https://www.postgresql.org/docs/current/auto-explain.html" },
      { name: "Index-only scans", kind: "software", note: "Covering indexes with INCLUDE.", href: "https://www.postgresql.org/docs/current/indexes-index-only-scans.html" },
      { name: "Indexes on expressions", kind: "software", note: "When you can't rewrite the function out of the query.", href: "https://www.postgresql.org/docs/current/indexes-expressional.html" },
    ],
  },
  "databases/pages-heap": {
    lead: "Postgres, MySQL and SQLite all store tables in fixed-size pages.",
    tools: [
      { name: "PostgreSQL page layout", kind: "software", note: "Header, line pointers, free space and tuples.", href: "https://www.postgresql.org/docs/current/storage-page-layout.html" },
      { name: "pageinspect", kind: "software", note: "Look inside a real page from SQL.", href: "https://www.postgresql.org/docs/current/pageinspect.html" },
      { name: "TOAST", kind: "software", note: "Where rows too big for a page go.", href: "https://www.postgresql.org/docs/current/storage-toast.html" },
      { name: "InnoDB physical structure", kind: "software", note: "MySQL's 16 KB pages.", href: "https://dev.mysql.com/doc/refman/8.4/en/innodb-physical-structure.html" },
    ],
  },
  "databases/other-indexes": {
    lead: "Postgres ships several index types beyond the B-tree.",
    tools: [
      { name: "PostgreSQL index types", kind: "software", note: "B-tree, Hash, GiST, SP-GiST, GIN and BRIN.", href: "https://www.postgresql.org/docs/current/indexes-types.html" },
      { name: "GIN", kind: "software", note: "Inverted indexes for arrays, jsonb and full text.", href: "https://www.postgresql.org/docs/current/gin.html" },
      { name: "GiST", kind: "software", note: "Trees of bounding boxes for ranges and geometry.", href: "https://www.postgresql.org/docs/current/gist.html" },
      { name: "PostGIS", kind: "software", note: "Spatial types and queries built on GiST.", href: "https://postgis.net" },
    ],
  },
  // Networking: fundamentals, transport, internet
  "networking/network-layers": {
    lead: "Every packet capture tool shows traffic split into these layers.",
    tools: [
      { name: "Wireshark", kind: "software", note: "Shows each layer of a captured packet as its own section.", href: "https://www.wireshark.org/" },
      { name: "RFC 1122", kind: "standard", note: "The internet's host requirements, organised by layer.", href: "https://www.rfc-editor.org/rfc/rfc1122" },
      { name: "OSI model (ISO/IEC 7498-1)", kind: "standard", note: "The seven-layer reference model.", href: "https://www.iso.org/standard/20269.html" },
      { name: "Cloudflare: the OSI model", kind: "service", note: "Plain-language guide to each layer.", href: "https://www.cloudflare.com/learning/ddos/glossary/open-systems-interconnection-model-osi/" },
    ],
  },
  "networking/packets": {
    lead: "Capture real traffic to see every header in front of the data.",
    tools: [
      { name: "Wireshark", kind: "software", note: "Decodes Ethernet, IP and TCP headers byte by byte.", href: "https://www.wireshark.org/" },
      { name: "tcpdump", kind: "software", note: "Command-line packet capture on servers.", href: "https://www.tcpdump.org/" },
      { name: "RFC 791 (IPv4)", kind: "standard", note: "The IP header: addresses, TTL, length.", href: "https://www.rfc-editor.org/rfc/rfc791" },
      { name: "RFC 9293 (TCP)", kind: "standard", note: "The TCP header: ports and sequence numbers.", href: "https://www.rfc-editor.org/rfc/rfc9293" },
    ],
  },
  "networking/ip-addresses": {
    lead: "Every host and cloud subnet makes the local-or-gateway decision this way.",
    tools: [
      { name: "ip route (iproute2)", kind: "software", note: "Shows your connected subnet and default gateway.", href: "https://man7.org/linux/man-pages/man8/ip-route.8.html" },
      { name: "RFC 4632 (CIDR)", kind: "standard", note: "Prefixes and masks.", href: "https://www.rfc-editor.org/rfc/rfc4632" },
      { name: "RFC 1918", kind: "standard", note: "The private ranges like 192.168.0.0/16.", href: "https://www.rfc-editor.org/rfc/rfc1918" },
    ],
  },
  "networking/mac-arp": {
    lead: "ARP runs on every IPv4 Ethernet and Wi-Fi network.",
    tools: [
      { name: "RFC 826 (ARP)", kind: "protocol", note: "The Address Resolution Protocol.", href: "https://www.rfc-editor.org/rfc/rfc826" },
      { name: "ip neigh (iproute2)", kind: "software", note: "Shows and clears the ARP / neighbour cache.", href: "https://man7.org/linux/man-pages/man8/ip-neighbour.8.html" },
      { name: "Wireshark", kind: "software", note: "Filter on arp to watch requests and replies.", href: "https://www.wireshark.org/" },
    ],
  },
  "networking/ipv6": {
    lead: "IPv6 now carries a large share of traffic to big sites.",
    tools: [
      { name: "RFC 8200 (IPv6)", kind: "standard", note: "The IPv6 header and rules.", href: "https://www.rfc-editor.org/rfc/rfc8200" },
      { name: "RFC 5952", kind: "standard", note: "How to write an IPv6 address short.", href: "https://www.rfc-editor.org/rfc/rfc5952" },
      { name: "RFC 4862 (SLAAC)", kind: "protocol", note: "Devices build their own addresses.", href: "https://www.rfc-editor.org/rfc/rfc4862" },
      { name: "Google IPv6 statistics", kind: "service", note: "Share of users reaching Google over IPv6.", href: "https://www.google.com/intl/en/ipv6/statistics.html" },
    ],
  },
  "networking/tcp-reliability": {
    lead: "Every TCP stack recovers losses with ACKs, fast retransmit and a timer.",
    tools: [
      { name: "RFC 9293 (TCP)", kind: "standard", note: "Sequence numbers and cumulative ACKs.", href: "https://www.rfc-editor.org/rfc/rfc9293" },
      { name: "RFC 6298", kind: "standard", note: "How the retransmission timer is computed.", href: "https://www.rfc-editor.org/rfc/rfc6298" },
      { name: "RFC 5681", kind: "standard", note: "Fast retransmit after 3 duplicate ACKs.", href: "https://www.rfc-editor.org/rfc/rfc5681" },
      { name: "Wireshark", kind: "software", note: "Flags duplicate ACKs and retransmissions.", href: "https://www.wireshark.org/" },
    ],
  },
  "networking/udp": {
    lead: "DNS, games, video calls and QUIC all run on UDP.",
    tools: [
      { name: "RFC 768 (UDP)", kind: "standard", note: "The whole protocol: three pages.", href: "https://www.rfc-editor.org/rfc/rfc768" },
      { name: "RFC 8085", kind: "standard", note: "Guidelines for apps that use UDP.", href: "https://www.rfc-editor.org/rfc/rfc8085" },
      { name: "tcpdump", kind: "software", note: "Capture UDP traffic, e.g. udp port 53.", href: "https://www.tcpdump.org/" },
    ],
  },
  "networking/tcp-vs-udp": {
    lead: "Real protocols pick a transport by whether late data is still useful.",
    tools: [
      { name: "QUIC (RFC 9000)", kind: "protocol", note: "Reliable streams built on UDP, used by HTTP/3.", href: "https://www.rfc-editor.org/rfc/rfc9000" },
      { name: "WebRTC", kind: "platform", note: "Real-time audio and video over UDP.", href: "https://webrtc.org/" },
      { name: "RFC 7766", kind: "standard", note: "When DNS uses TCP instead of UDP.", href: "https://www.rfc-editor.org/rfc/rfc7766" },
    ],
  },
  "networking/bgp": {
    lead: "BGP connects every network on the internet; RPKI is how operators stop bad routes.",
    tools: [
      { name: "RFC 4271 (BGP-4)", kind: "protocol", note: "The Border Gateway Protocol.", href: "https://www.rfc-editor.org/rfc/rfc4271" },
      { name: "RFC 6811 (RPKI origin validation)", kind: "standard", note: "Reject routes from the wrong origin.", href: "https://www.rfc-editor.org/rfc/rfc6811" },
      { name: "bgp.tools", kind: "service", note: "Look up any prefix, AS number and its routes.", href: "https://bgp.tools/" },
      { name: "Is BGP safe yet?", kind: "service", note: "Checks whether your ISP validates routes.", href: "https://isbgpsafeyet.com/" },
    ],
  },
  "networking/anycast": {
    lead: "Public DNS resolvers, root servers and CDNs all use anycast.",
    tools: [
      { name: "Cloudflare: what is anycast?", kind: "service", note: "How one address reaches the nearest data centre.", href: "https://www.cloudflare.com/learning/cdn/glossary/anycast-network/" },
      { name: "RFC 4786", kind: "standard", note: "Operating anycast services.", href: "https://www.rfc-editor.org/rfc/rfc4786" },
      { name: "Root server system", kind: "service", note: "13 root names, 1,900+ anycast sites.", href: "https://root-servers.org/" },
      { name: "1.1.1.1", kind: "service", note: "An anycast DNS resolver.", href: "https://one.one.one.one/" },
    ],
  },
  // Operating systems: hardware, processes, memory
  "operating-systems/cpu-cycle": {
    lead: "Every CPU runs this loop; these show what it actually executes.",
    tools: [
      { name: "Compiler Explorer", kind: "service", note: "See the machine instructions any code compiles to.", href: "https://godbolt.org/" },
      { name: "perf", kind: "software", note: "Count cycles and instructions per cycle on Linux.", href: "https://perf.wiki.kernel.org/" },
      { name: "RISC-V specifications", kind: "standard", note: "An open instruction set you can read end to end.", href: "https://riscv.org/technical/specifications/" },
    ],
  },
  "operating-systems/binary-numbers": {
    lead: "Every language stores integers and floats the same way underneath.",
    tools: [
      { name: "IEEE 754", kind: "standard", note: "The floating-point format behind 0.1 + 0.2.", href: "https://standards.ieee.org/ieee/754/6210/" },
      { name: "Float Toy", kind: "software", note: "Flip the bits of a float and see its value.", href: "https://evanw.github.io/float-toy/" },
      { name: "General Decimal Arithmetic", kind: "standard", note: "Decimal floating point for money and exact fractions.", href: "https://speleotrove.com/decimal/" },
    ],
  },
  "operating-systems/system-calls": {
    lead: "Watch the system calls any program makes, whatever language it is written in.",
    tools: [
      { name: "strace", kind: "software", note: "Prints every system call a process makes.", href: "https://strace.io/" },
      { name: "syscalls(2)", kind: "standard", note: "The list of Linux system calls.", href: "https://man7.org/linux/man-pages/man2/syscalls.2.html" },
      { name: "bpftrace", kind: "software", note: "Count and time system calls across the whole machine.", href: "https://github.com/bpftrace/bpftrace" },
    ],
  },
  "operating-systems/processes-os": {
    lead: "Every process's state, memory and open files can be inspected.",
    tools: [
      { name: "htop", kind: "software", note: "Live view of processes, states and memory.", href: "https://github.com/htop-dev/htop" },
      { name: "proc(5)", kind: "standard", note: "/proc/<pid>: state, memory map and open files.", href: "https://man7.org/linux/man-pages/man5/proc.5.html" },
      { name: "procps-ng", kind: "software", note: "ps, top and vmstat.", href: "https://gitlab.com/procps-ng/procps" },
    ],
  },
  "operating-systems/threads": {
    lead: "Most runtimes map their threads onto these OS threads.",
    tools: [
      { name: "pthreads(7)", kind: "standard", note: "POSIX threads: what they share and what they don't.", href: "https://man7.org/linux/man-pages/man7/pthreads.7.html" },
      { name: "clone(2)", kind: "standard", note: "The Linux call that creates both threads and processes.", href: "https://man7.org/linux/man-pages/man2/clone.2.html" },
      { name: "htop", kind: "software", note: "Press H to see every thread of a process.", href: "https://github.com/htop-dev/htop" },
    ],
  },
  "operating-systems/context-switching": {
    lead: "Context switches are counted by the kernel; these read the counters.",
    tools: [
      { name: "perf", kind: "software", note: "perf stat -e context-switches,cpu-migrations.", href: "https://perf.wiki.kernel.org/" },
      { name: "sysstat (pidstat)", kind: "software", note: "pidstat -w shows switches per second per process.", href: "https://github.com/sysstat/sysstat" },
      { name: "Linux scheduler docs", kind: "standard", note: "How the kernel picks the next task.", href: "https://docs.kernel.org/scheduler/sched-design-CFS.html" },
    ],
  },
  "operating-systems/fork-exec": {
    lead: "Every shell, init system and container runtime starts programs this way.",
    tools: [
      { name: "fork(2)", kind: "standard", note: "Copy the calling process.", href: "https://man7.org/linux/man-pages/man2/fork.2.html" },
      { name: "execve(2)", kind: "standard", note: "Replace the process with a new program.", href: "https://man7.org/linux/man-pages/man2/execve.2.html" },
      { name: "posix_spawn", kind: "standard", note: "fork + exec in one call.", href: "https://pubs.opengroup.org/onlinepubs/9699919799/functions/posix_spawn.html" },
      { name: "GNU Bash", kind: "software", note: "A shell that forks and execs for every command.", href: "https://www.gnu.org/software/bash/" },
    ],
  },
  "operating-systems/ipc": {
    lead: "The kernel offers a handful of channels; everything else is built on them.",
    tools: [
      { name: "pipe(7)", kind: "standard", note: "Pipes and FIFOs, including the 64 KiB buffer.", href: "https://man7.org/linux/man-pages/man7/pipe.7.html" },
      { name: "unix(7)", kind: "standard", note: "Unix domain sockets, used by Docker and databases.", href: "https://man7.org/linux/man-pages/man7/unix.7.html" },
      { name: "shm_overview(7)", kind: "standard", note: "POSIX shared memory.", href: "https://man7.org/linux/man-pages/man7/shm_overview.7.html" },
      { name: "signal(7)", kind: "standard", note: "Signals and their default actions.", href: "https://man7.org/linux/man-pages/man7/signal.7.html" },
    ],
  },
  "operating-systems/stack-heap": {
    lead: "These find leaks, dangling pointers and stack overflows in native code.",
    tools: [
      { name: "Valgrind", kind: "software", note: "Memcheck reports leaks and invalid reads.", href: "https://valgrind.org/" },
      { name: "AddressSanitizer", kind: "software", note: "Catches use-after-return and use-after-free.", href: "https://github.com/google/sanitizers" },
      { name: "heaptrack", kind: "software", note: "Shows where heap memory is allocated and leaked.", href: "https://github.com/KDE/heaptrack" },
      { name: "jemalloc", kind: "software", note: "A widely used heap allocator.", href: "https://github.com/jemalloc/jemalloc" },
    ],
  },
  "operating-systems/page-faults": {
    lead: "Fault counts and swap activity are visible on any Linux machine.",
    tools: [
      { name: "perf", kind: "software", note: "perf stat -e minor-faults,major-faults.", href: "https://perf.wiki.kernel.org/" },
      { name: "procps-ng (vmstat)", kind: "software", note: "vmstat 1: si/so columns show swapping.", href: "https://gitlab.com/procps-ng/procps" },
      { name: "Linux vm sysctls", kind: "standard", note: "swappiness and other memory-pressure knobs.", href: "https://docs.kernel.org/admin-guide/sysctl/vm.html" },
    ],
  },
  // Security: crypto, TLS, identity
  "security/hashing": {
    lead: "Hashes identify files, commits and messages everywhere.",
    tools: [
      { name: "SHA-2 (FIPS 180-4)", kind: "standard", note: "The SHA-256 standard this page runs.", href: "https://csrc.nist.gov/pubs/fips/180-4/upd1/final" },
      { name: "BLAKE3", kind: "software", note: "A fast modern hash for checksums and content addressing.", href: "https://github.com/BLAKE3-team/BLAKE3" },
      { name: "Web Crypto API", kind: "standard", note: "crypto.subtle.digest in every browser.", href: "https://www.w3.org/TR/WebCryptoAPI/" },
    ],
  },
  "security/symmetric-encryption": {
    lead: "Bulk data is always encrypted with an AEAD cipher and a fresh nonce.",
    tools: [
      { name: "AES-GCM (NIST SP 800-38D)", kind: "standard", note: "Counter mode plus an authentication tag.", href: "https://csrc.nist.gov/pubs/sp/800/38/d/final" },
      { name: "ChaCha20-Poly1305 (RFC 8439)", kind: "protocol", note: "The AEAD used by TLS and WireGuard where AES hardware is missing.", href: "https://www.rfc-editor.org/rfc/rfc8439" },
      { name: "libsodium", kind: "software", note: "AEAD and secretbox with safe defaults.", href: "https://doc.libsodium.org/secret-key_cryptography/aead" },
      { name: "age", kind: "software", note: "Simple file encryption tool and format.", href: "https://github.com/FiloSottile/age" },
    ],
  },
  "security/public-key": {
    lead: "Public keys usually wrap or agree on a symmetric key rather than encrypt data directly.",
    tools: [
      { name: "RSA PKCS #1 v2.2 (RFC 8017)", kind: "standard", note: "RSA with OAEP padding.", href: "https://www.rfc-editor.org/rfc/rfc8017" },
      { name: "HPKE (RFC 9180)", kind: "standard", note: "Hybrid public-key encryption: a key exchange plus an AEAD.", href: "https://www.rfc-editor.org/rfc/rfc9180" },
      { name: "OpenPGP (RFC 9580)", kind: "standard", note: "Public-key encryption for email and files.", href: "https://www.rfc-editor.org/rfc/rfc9580" },
    ],
  },
  "security/randomness": {
    lead: "Tokens, keys and nonces come from the operating system's cryptographic generator.",
    tools: [
      { name: "RFC 4086", kind: "standard", note: "Randomness requirements for security.", href: "https://www.rfc-editor.org/rfc/rfc4086" },
      { name: "NIST SP 800-90A", kind: "standard", note: "Deterministic random bit generators behind OS CSPRNGs.", href: "https://csrc.nist.gov/pubs/sp/800/90/a/r1/final" },
      { name: "libsodium randombytes", kind: "software", note: "Portable access to the OS generator.", href: "https://doc.libsodium.org/generating_random_data" },
      { name: "Web Crypto getRandomValues", kind: "standard", note: "The browser's CSPRNG.", href: "https://www.w3.org/TR/WebCryptoAPI/" },
    ],
  },
  "security/tls-handshake": {
    lead: "Every HTTPS connection starts with this handshake.",
    tools: [
      { name: "TLS 1.3 (RFC 8446)", kind: "protocol", note: "The handshake shown here.", href: "https://www.rfc-editor.org/rfc/rfc8446" },
      { name: "Let's Encrypt", kind: "service", note: "Free certificates for the server's identity.", href: "https://letsencrypt.org" },
      { name: "OpenSSL", kind: "software", note: "openssl s_client shows a real handshake.", href: "https://github.com/openssl/openssl" },
      { name: "Wireshark", kind: "software", note: "See which handshake bytes are plain and which are encrypted.", href: "https://www.wireshark.org" },
    ],
  },
  "security/mutual-tls": {
    lead: "Service meshes give every service a short-lived certificate and turn on mTLS.",
    tools: [
      { name: "SPIFFE / SPIRE", kind: "standard", note: "Service identities like spiffe://shop.internal/orders.", href: "https://spiffe.io" },
      { name: "Istio", kind: "platform", note: "Mesh with automatic mTLS between pods.", href: "https://istio.io" },
      { name: "Linkerd", kind: "platform", note: "Lightweight mesh, mTLS on by default.", href: "https://linkerd.io" },
      { name: "OAuth mTLS (RFC 8705)", kind: "standard", note: "Client certificates for OAuth clients and bound tokens.", href: "https://www.rfc-editor.org/rfc/rfc8705" },
    ],
  },
  "security/hsts": {
    lead: "One response header and a preload entry keep browsers off plain HTTP.",
    tools: [
      { name: "HSTS (RFC 6797)", kind: "standard", note: "The Strict-Transport-Security header.", href: "https://www.rfc-editor.org/rfc/rfc6797" },
      { name: "HSTS preload list", kind: "service", note: "Submit a domain to the list built into browsers.", href: "https://hstspreload.org" },
      { name: "OWASP HSTS Cheat Sheet", kind: "standard", note: "Rollout advice and pitfalls.", href: "https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html" },
    ],
  },
  "security/sessions-cookies": {
    lead: "Server-side sessions live in a fast store; the cookie carries only the id.",
    tools: [
      { name: "HTTP cookies (RFC 6265)", kind: "standard", note: "Set-Cookie and its attributes.", href: "https://www.rfc-editor.org/rfc/rfc6265" },
      { name: "OWASP Session Management Cheat Sheet", kind: "standard", note: "Ids, flags, timeouts and rotation.", href: "https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html" },
      { name: "Redis", kind: "software", note: "A common session store with per-key expiry.", href: "https://redis.io" },
    ],
  },
  "security/oidc": {
    lead: "\"Sign in with …\" buttons are OpenID Connect.",
    tools: [
      { name: "OpenID Connect Core 1.0", kind: "standard", note: "The ID token and the checks on it.", href: "https://openid.net/specs/openid-connect-core-1_0.html" },
      { name: "OpenID Connect Discovery", kind: "standard", note: "Where to find the issuer's endpoints and JWKS keys.", href: "https://openid.net/specs/openid-connect-discovery-1_0.html" },
      { name: "JSON Web Key (RFC 7517)", kind: "standard", note: "The published public-key format.", href: "https://www.rfc-editor.org/rfc/rfc7517" },
      { name: "Keycloak", kind: "software", note: "Open-source identity provider.", href: "https://github.com/keycloak/keycloak" },
    ],
  },
  "security/passkeys": {
    lead: "Passkeys are WebAuthn credentials, synced or bound to one device.",
    tools: [
      { name: "Web Authentication (W3C)", kind: "standard", note: "The browser API and the checks a server runs.", href: "https://www.w3.org/TR/webauthn-3/" },
      { name: "FIDO Alliance passkeys", kind: "standard", note: "The FIDO2 / CTAP side for authenticators.", href: "https://fidoalliance.org/passkeys/" },
      { name: "passkeys.dev", kind: "platform", note: "Developer guide and device support tables.", href: "https://passkeys.dev" },
    ],
  },
  // AI Engineering: foundations, LLM internals, prompting
};

export function realWorldKey(trackId: string, sessionId: string) {
  return `${trackId}/${sessionId}`;
}

export function getRealWorldTools(trackId: string, sessionId: string): RealWorldEntry | undefined {
  return REAL_WORLD_TOOLS[realWorldKey(trackId, sessionId)];
}

export type RealWorldSessionGroup = {
  sessionId: string;
  sessionTitle: string;
  lead: string;
  tools: RealWorldTool[];
};

/** One group per live session that has an entry in REAL_WORLD_TOOLS. */
export function listRealWorldToolsForTrack(
  trackId: string,
  liveSessions: { id: string; title: string }[],
): RealWorldSessionGroup[] {
  const groups: RealWorldSessionGroup[] = [];
  for (const session of liveSessions) {
    const entry = getRealWorldTools(trackId, session.id);
    if (!entry?.tools.length) continue;
    groups.push({
      sessionId: session.id,
      sessionTitle: session.title,
      lead: entry.lead,
      tools: entry.tools,
    });
  }
  return groups;
}

/** Unique tool names across a track (for counts and summaries). */
export function uniqueToolCount(groups: RealWorldSessionGroup[]) {
  const seen = new Set<string>();
  for (const g of groups) {
    for (const t of g.tools) seen.add(t.name);
  }
  return seen.size;
}
