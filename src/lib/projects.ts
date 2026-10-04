// Hands-on project catalog by pillar (not the same shape as learning tracks).
// Home → Projects tab renders this tree; track pages still list track-scoped teasers for now.

export type ProjectLevel = "beginner" | "intermediate" | "advanced";

export type ProjectEntry = {
  id: string;
  title: string;
  blurb: string;
  level?: ProjectLevel;
  format?: string;
};

export type ProjectCategory = {
  id: string;
  title: string;
  blurb: string;
  /** Default difficulty for projects in this area (overridable per project) */
  level: ProjectLevel;
  /** Build shape tag, e.g. API, CLI, Web app — shown on cards like roadmap.sh */
  format: string;
  projects: ProjectEntry[];
};

export type CatalogProject = {
  key: string;
  pillarId: string;
  pillarTitle: string;
  pillarShort: string;
  accent: string;
  categoryId: string;
  categoryTitle: string;
  level: ProjectLevel;
  format: string;
  id: string;
  title: string;
  blurb: string;
};

export type ProjectPillar = {
  id: string;
  title: string;
  short: string;
  tagline: string;
  accent: string;
  categories: ProjectCategory[];
};

export const PROJECT_PILLARS: ProjectPillar[] = [
  {
    id: "ai-engineering",
    title: "AI Engineering",
    short: "AI",
    tagline: "Ship with models — retrieval, tools, structure, evals, and automation.",
    accent: "var(--ai)",
    categories: [
      {
        id: "llms",
        title: "LLMs & generation",
        blurb: "Sampling, prompts, and chat experiences you can measure.",
        level: "intermediate",
        format: "Web app",
        projects: [
          { id: "chat-ui", title: "Streaming chat UI with stop and retry", blurb: "Token stream, cancel in flight, and log each turn." },
          { id: "sampling-lab", title: "Temperature and top-p playground", blurb: "Same prompt, many samples — compare distributions." },
          { id: "prompt-variants", title: "Prompt A/B harness", blurb: "Run two system prompts on one eval set and diff pass rate." },
        ],
      },
      {
        id: "embeddings",
        title: "Embeddings & vector search",
        blurb: "Turn text into vectors and search by meaning.",
        level: "intermediate",
        format: "API",
        projects: [
          { id: "semantic-search", title: "Semantic search over your notes", blurb: "Chunk, embed, and query with cosine similarity." },
          { id: "hybrid-search", title: "Hybrid keyword + vector search", blurb: "Combine BM25-style filters with embedding rank." },
        ],
      },
      {
        id: "rag",
        title: "RAG",
        blurb: "Retrieve context before the model answers.",
        level: "intermediate",
        format: "Full stack",
        projects: [
          { id: "rag-chatbot", title: "RAG chatbot over your docs", blurb: "Ingest PDFs, retrieve chunks, cite sources in the reply." },
          { id: "rag-eval", title: "RAG eval set with groundedness checks", blurb: "Score answers that must stay inside retrieved text." },
        ],
      },
      {
        id: "structured-tools",
        title: "Structured output & tool calling",
        blurb: "JSON-shaped products and live data through tools.",
        level: "intermediate",
        format: "API",
        projects: [
          { id: "json-support", title: "Support reply that only returns JSON", blurb: "Schema-constrained generation for a ticket form." },
          { id: "tool-agent", title: "Tool-using agent with two APIs", blurb: "Weather plus calendar — model picks which tool to call." },
          { id: "mcp-server", title: "MCP server with one custom tool", blurb: "Expose an internal API the model can call safely." },
        ],
      },
      {
        id: "evals",
        title: "Evaluation & quality",
        blurb: "Know when a prompt or pipeline regressed.",
        level: "intermediate",
        format: "CLI",
        projects: [
          { id: "eval-harness", title: "Eval harness for 20 golden questions", blurb: "Batch run, score, and track pass rate over time." },
          { id: "llm-judge", title: "LLM-as-judge with human spot checks", blurb: "Automated rubric plus a sample queue for review." },
        ],
      },
      {
        id: "automation",
        title: "Automation & workflows",
        blurb: "Branching flows, schedules, and human approval.",
        level: "intermediate",
        format: "Workflow",
        projects: [
          { id: "inbox-triage", title: "Triage an inbox into Slack", blurb: "Classify, route, and post a summary thread." },
          { id: "approval-flow", title: "Approve refunds before send", blurb: "Draft, hold, approve or reject, then act." },
          { id: "scheduled-digest", title: "Daily digest on a cron", blurb: "Pull metrics, summarize, deliver at 8am." },
        ],
      },
    ],
  },
  {
    id: "backend",
    title: "Backend Development",
    short: "Backend",
    tagline: "JavaScript and Go services, APIs, and data stores.",
    accent: "var(--node)",
    categories: [
      {
        id: "node-apis",
        title: "Node.js & TypeScript",
        blurb: "HTTP APIs and workers in the JS runtime.",
        level: "intermediate",
        format: "API",
        projects: [
          { id: "express-rest", title: "REST API with Express or Fastify", blurb: "CRUD, validation, structured errors, and OpenAPI." },
          { id: "job-queue", title: "Rate-limited job queue", blurb: "Enqueue, backoff, dead-letter, and a small dashboard." },
          { id: "socket-room", title: "WebSocket room server", blurb: "Join rooms, broadcast, and reconnect handling." },
          { id: "csv-ingest", title: "Stream a large CSV into Postgres", blurb: "Backpressure, batch inserts, and progress reporting." },
        ],
      },
      {
        id: "go-services",
        title: "Go",
        blurb: "Small, fast services with explicit concurrency.",
        level: "intermediate",
        format: "API",
        projects: [
          { id: "go-http", title: "HTTP API with chi or stdlib", blurb: "Routing, middleware, request IDs, and health checks." },
          { id: "go-worker", title: "Worker pool with graceful shutdown", blurb: "Context cancel, drain in-flight, and signal handling." },
          { id: "go-auth", title: "JWT middleware and role checks", blurb: "Issue tokens, validate claims, and protect routes." },
        ],
      },
      {
        id: "postgres",
        title: "PostgreSQL",
        blurb: "Relational data, migrations, and query patterns.",
        level: "intermediate",
        format: "Database",
        projects: [
          { id: "pg-migrations", title: "Schema migrations with rollbacks", blurb: "Versioned SQL and seed data for local dev." },
          { id: "pg-pool", title: "Connection pooling and timeouts", blurb: "Pool sizing, statement timeout, and slow-query logs." },
          { id: "pg-transactions", title: "Transfer money safely", blurb: "Serializable or row-lock pattern with idempotency keys." },
        ],
      },
      {
        id: "redis",
        title: "Redis",
        blurb: "Cache, sessions, and lightweight messaging.",
        level: "intermediate",
        format: "Cache",
        projects: [
          { id: "redis-cache", title: "Cache-aside for hot reads", blurb: "TTL, stampede protection, and invalidation hooks." },
          { id: "redis-sessions", title: "Session store for an API", blurb: "Login, rotate, and revoke session keys." },
          { id: "redis-pubsub", title: "Pub/sub fan-out", blurb: "Publish events and fan to multiple subscribers." },
        ],
      },
      {
        id: "document-db",
        title: "MongoDB & document stores",
        blurb: "Flexible documents when the shape evolves.",
        level: "intermediate",
        format: "Database",
        projects: [
          { id: "mongo-model", title: "Model nested documents and indexes", blurb: "Compound indexes and aggregation for a feed." },
          { id: "mongo-sync", title: "Change streams to a worker", blurb: "React to inserts and push side effects." },
        ],
      },
      {
        id: "vector-db",
        title: "Vector databases",
        blurb: "Embeddings at scale alongside your app data.",
        level: "advanced",
        format: "Database",
        projects: [
          { id: "pgvector", title: "pgvector similarity search", blurb: "Store embeddings in Postgres and query by distance." },
          { id: "dedicated-vector", title: "Dedicated vector index", blurb: "Upsert chunks and hybrid-filter metadata." },
        ],
      },
    ],
  },
  {
    id: "frontend",
    title: "Frontend Development",
    short: "Frontend",
    tagline: "JavaScript UI — React, Next.js, and data on the client.",
    accent: "var(--native)",
    categories: [
      {
        id: "react",
        title: "React",
        blurb: "Components, hooks, and client-side state.",
        level: "beginner",
        format: "UI",
        projects: [
          { id: "design-system-slice", title: "Mini design system slice", blurb: "Button, input, modal — tokens and accessible focus." },
          { id: "hooks-patterns", title: "Custom hooks for async and forms", blurb: "useFetch, useDebouncedValue, and form state." },
          { id: "virtual-list", title: "Virtualized list for 10k rows", blurb: "Window rows and keep scroll position stable." },
        ],
      },
      {
        id: "nextjs",
        title: "Next.js",
        blurb: "Full-stack React with routing and server pieces.",
        level: "intermediate",
        format: "Full stack",
        projects: [
          { id: "next-dashboard", title: "Dashboard with server and client components", blurb: "Split data fetching and interactive widgets." },
          { id: "next-auth-flow", title: "Sign-in and protected routes", blurb: "Session cookie, middleware gate, and profile page." },
          { id: "next-actions", title: "Forms with server actions", blurb: "Validate on the server, optimistic UI on the client." },
        ],
      },
      {
        id: "data-ui",
        title: "Data fetching & UI state",
        blurb: "Talk to APIs without spaghetti.",
        level: "intermediate",
        format: "UI",
        projects: [
          { id: "tanstack-table", title: "TanStack Query + table", blurb: "Paginate, cache, invalidate, and show stale data." },
          { id: "optimistic-ui", title: "Optimistic updates with rollback", blurb: "Edit inline, revert on error, toast on success." },
        ],
      },
    ],
  },
];

export const projectCatalogCount = () =>
  PROJECT_PILLARS.reduce(
    (n, pillar) => n + pillar.categories.reduce((m, cat) => m + cat.projects.length, 0),
    0,
  );

export const projectPillarHash = (pillarId: string) => `#projects-${pillarId}`;

export const pillarStats = (pillar: ProjectPillar) => {
  const areas = pillar.categories.length;
  const projects = pillar.categories.reduce((n, c) => n + c.projects.length, 0);
  return { areas, projects };
};

/** Stable id for API + Supabase rows: pillar/category/project */
export const catalogProjectKey = (pillarId: string, categoryId: string, projectId: string) =>
  `${pillarId}/${categoryId}/${projectId}`;

export const flattenProjectCatalog = (): CatalogProject[] =>
  PROJECT_PILLARS.flatMap((pillar) =>
    pillar.categories.flatMap((category) =>
      category.projects.map((project) => ({
        key: catalogProjectKey(pillar.id, category.id, project.id),
        pillarId: pillar.id,
        pillarTitle: pillar.title,
        pillarShort: pillar.short,
        accent: pillar.accent,
        categoryId: category.id,
        categoryTitle: category.title,
        level: project.level ?? category.level,
        format: project.format ?? category.format,
        id: project.id,
        title: project.title,
        blurb: project.blurb,
      })),
    ),
  );

const VALID_PROJECT_KEYS = new Set(flattenProjectCatalog().map((p) => p.key));

export const isCatalogProjectKey = (key: string) => VALID_PROJECT_KEYS.has(key);

export const pillarIdFromProjectsHash = (hash: string) => {
  const raw = hash.replace(/^#/, "");
  if (!raw.startsWith("projects-")) return null;
  const id = raw.slice("projects-".length);
  return PROJECT_PILLARS.some((p) => p.id === id) ? id : null;
};
