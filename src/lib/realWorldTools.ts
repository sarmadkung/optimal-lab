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
  "system-design/multi-tenancy": {
    lead: "SaaS platforms choose a tenancy model early.",
    tools: [
      { name: "Postgres row-level security", kind: "software", note: "The database enforces tenant filters.", href: "https://www.postgresql.org/docs/current/ddl-rowsecurity.html" },
      { name: "AWS SaaS Lens", kind: "standard", note: "Silo, bridge and pool models.", href: "https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/saas-lens.html" },
      { name: "Citus", kind: "software", note: "Sharding multi-tenant Postgres.", href: "https://www.citusdata.com/use-cases/multi-tenant-apps/" },
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
