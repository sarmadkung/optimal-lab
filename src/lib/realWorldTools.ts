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
