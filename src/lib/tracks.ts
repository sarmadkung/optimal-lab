// Learning tracks: one per subject. Each track holds interactive sessions today,
// and will hold a roadmap and hands-on projects later.
// Routes: /tracks/<track.id> for a track, /tracks/<track.id>/<session.id> for a session.
// To add a visual: build it in src/sessions/<track>/<session>/, register it in
// src/sessions/registry.tsx, then set the session's status to "live" here.

export type SessionStatus = "live" | "soon";

export type Session = {
  id: string; // URL segment, e.g. "two-sum" -> /tracks/dsa/two-sum
  title: string;
  blurb: string;
  status: SessionStatus;
  tag?: string; // small label, e.g. "DSA #01"
};

export type Track = {
  id: string; // used in /tracks/<id>
  title: string;
  short: string; // label for the top bar
  tagline: string;
  /** Optional one-liner on session pages: how live sessions fit together */
  learningPathBlurb?: string;
  accent: string; // CSS colour token from globals.css
  sessions: Session[];
  roadmap: string[]; // planned stages, shown as "coming soon" for now
  projects: string[]; // planned build-it projects, shown as "coming soon" for now
};

export const TRACKS: Track[] = [
  {
    id: "dsa",
    title: "Data Structures & Algorithms",
    short: "DSA",
    tagline: "Spot the pattern, then watch each approach run and scale.",
    accent: "var(--dsa)",
    sessions: [
      {
        id: "two-sum",
        tag: "DSA #01",
        title: "Two Sum, three ways",
        blurb: "Step through brute force, two pointers and a hash map. Then scale n and see the gap.",
        status: "live",
      },
      { id: "sliding-window", title: "Sliding window", blurb: "Slide a fixed window and watch each step add one cell and drop one.", status: "live" },
      { id: "binary-search", title: "Binary search", blurb: "Halve the search space and see why it takes log n steps.", status: "live" },
      { id: "bfs-vs-dfs", title: "BFS vs DFS", blurb: "Run both on the same graph and compare the order they visit nodes.", status: "soon" },
    ],
    roadmap: ["Arrays & hashing", "Two pointers & sliding window", "Stacks, queues & linked lists", "Trees & graphs", "Dynamic programming"],
    projects: ["Build an LRU cache", "Autocomplete with a trie", "Route finder with Dijkstra"],
  },
  {
    id: "nodejs",
    title: "Node.js Internals",
    short: "Node.js",
    tagline: "See what really happens inside the runtime when your code runs.",
    accent: "var(--node)",
    sessions: [
      { id: "event-loop", title: "The event loop, phase by phase", blurb: "Queue timers, promises and I/O, then step through each loop phase.", status: "live" },
      { id: "streams-backpressure", title: "Streams and backpressure", blurb: "Push data faster than it drains and watch the buffer fill.", status: "live" },
      { id: "thread-pool", title: "The libuv thread pool", blurb: "Fire file and crypto work and see which calls block the pool.", status: "soon" },
    ],
    roadmap: ["Runtime & V8 basics", "Event loop & async", "Streams & buffers", "Workers & clustering", "Profiling & performance"],
    projects: ["Write a tiny HTTP server from sockets", "Build a rate-limited job queue", "Stream a large CSV into a database"],
  },
  {
    id: "system-design",
    title: "System Design",
    short: "System Design",
    tagline: "Push traffic through real architectures and watch where they break.",
    accent: "var(--sys)",
    sessions: [
      { id: "load-balancing", title: "Load balancing strategies", blurb: "Compare round robin and least connections under uneven load.", status: "live" },
      { id: "caching", title: "Caching and eviction", blurb: "Watch a cache hit, miss and evict, then predict the next request.", status: "live" },
      { id: "consistent-hashing", title: "Consistent hashing", blurb: "Add and remove nodes and see how few keys move.", status: "soon" },
    ],
    roadmap: ["Scaling basics", "Caching & CDNs", "Databases, replication & sharding", "Queues & async work", "Designing for failure"],
    projects: ["Design a URL shortener", "Design a chat service", "Design a news feed"],
  },
  {
    id: "devops",
    title: "DevOps",
    short: "DevOps",
    tagline: "Ship, scale and recover. See every step of the pipeline move.",
    accent: "var(--ops)",
    sessions: [
      { id: "ci-cd-pipeline", title: "A CI/CD pipeline, stage by stage", blurb: "Break a test or a build and see where the pipeline stops.", status: "live" },
      { id: "containers-vs-vms", title: "Containers vs virtual machines", blurb: "Start a container, then boot a VM, and see what each one shares.", status: "live" },
      { id: "rolling-deploys", title: "Kubernetes rolling deploys", blurb: "Roll out a bad version and watch probes and rollback kick in.", status: "soon" },
    ],
    roadmap: ["Linux & networking", "Containers & Docker", "CI/CD", "Kubernetes", "Observability & incidents"],
    projects: ["Containerise and deploy a Node app", "Build a CI pipeline with tests and previews", "Set up metrics, logs and alerts"],
  },
  {
    id: "ai",
    title: "AI Engineering",
    short: "AI",
    tagline: "Open up the model and tune the knobs yourself.",
    learningPathBlurb:
      "One token at a time, then vectors for search, then retrieval into the prompt — the usual stack for building with LLMs.",
    accent: "var(--ai)",
    sessions: [
      {
        id: "next-token",
        tag: "AI #02",
        title: "How an LLM picks the next token",
        blurb: "Drag temperature, top-k and top-p. Watch the odds move, then sample.",
        status: "live",
      },
      { id: "embeddings", title: "Embeddings and similarity search", blurb: "Move a query in vector space and see which notes come back.", status: "live" },
      { id: "rag", title: "RAG, step by step", blurb: "Chunk, retrieve and prompt, and see what the model actually gets.", status: "live" },
    ],
    roadmap: ["How LLMs work", "Prompting & sampling", "Embeddings & retrieval", "Agents & tools", "Evaluation"],
    projects: ["Build a RAG chatbot over your docs", "Build a tool-using agent", "Write an eval harness"],
  },
  {
    id: "ai-native",
    title: "AI Native",
    short: "AI Native",
    tagline: "Build products where the model is the interface, and the output has a shape.",
    accent: "var(--native)",
    sessions: [
      {
        id: "structured-output",
        title: "Force valid JSON",
        blurb: "Turn a schema on and watch illegal tokens get refused.",
        status: "live",
      },
      {
        id: "tool-calling",
        title: "Call a tool, then answer",
        blurb: "Give the model a weather tool, then take it away and watch it guess.",
        status: "live",
      },
      {
        id: "evals",
        title: "Evals: did the answer hold up?",
        blurb: "Score a set of answers and see a prompt change move the pass rate.",
        status: "soon",
      },
    ],
    roadmap: ["The model as the product", "Structured output", "Tools and agents", "Evals", "Shipping a model feature"],
    projects: ["A support reply that only returns JSON", "An agent with two tools", "An eval set of 20 questions"],
  },
  {
    id: "ai-automation",
    title: "AI Automation",
    short: "Automation",
    tagline: "Run work without a person in every step, and pause where a person still matters.",
    accent: "var(--auto)",
    sessions: [
      {
        id: "workflow",
        title: "One item through a workflow",
        blurb: "Send three different emails down the same path and watch the branch change.",
        status: "live",
      },
      {
        id: "human-approval",
        title: "Pause for a person",
        blurb: "Draft a refund, then approve or reject it before anything is sent.",
        status: "live",
      },
      {
        id: "schedules",
        title: "Run it on a schedule",
        blurb: "Fire the same workflow on a clock and see what a missed run does.",
        status: "soon",
      },
    ],
    roadmap: ["Triggers", "Branches", "Human approval", "Schedules and retries", "Watching failures"],
    projects: ["Triage an inbox into Slack", "Approve refunds before they send", "A daily digest that runs at 8am"],
  },
  {
    id: "tools",
    title: "Tools",
    short: "Tools",
    tagline: "See how the tools around the model actually move: agents, MCP, and workflow builders.",
    accent: "var(--tools)",
    sessions: [
      {
        id: "cursor-agent",
        title: "A coding agent's loop",
        blurb: "Watch search, edit, and a check repeat until the test passes.",
        status: "live",
      },
      {
        id: "mcp",
        title: "MCP: tools the model can call",
        blurb: "A server lists tools. The app forwards the one the model picks.",
        status: "live",
      },
      {
        id: "n8n",
        title: "An n8n workflow, node by node",
        blurb: "Cross a threshold and see the run switch from email to Slack.",
        status: "live",
      },
      {
        id: "github-actions",
        title: "GitHub Actions on every push",
        blurb: "Follow a workflow file from the push event to the job log.",
        status: "soon",
      },
    ],
    roadmap: ["Coding agents", "MCP and tool servers", "Workflow builders", "CI tools", "Model APIs"],
    projects: ["Connect one MCP tool", "An n8n flow with a branch", "A GitHub Action that runs tests"],
  },
];

export const getTrack = (id: string) => TRACKS.find((t) => t.id === id);

export const trackHref = (t: Track) => `/tracks/${t.id}`;
export const sessionHref = (t: Track, s: Session) => `/tracks/${t.id}/${s.id}`;

export const getSession = (trackId: string, sessionId: string) => {
  const track = getTrack(trackId);
  const session = track?.sessions.find((s) => s.id === sessionId);
  return track && session ? { track, session } : undefined;
};

// every live session, in track order: used for static routes and "Start here"
export const liveSessions = () =>
  TRACKS.flatMap((track) =>
    track.sessions.filter((s) => s.status === "live").map((session) => ({ track, session })),
  );

// previous and next session in the same track, so a learner can keep going
export const neighbours = (track: Track, sessionId: string) => {
  const i = track.sessions.findIndex((s) => s.id === sessionId);
  return { prev: track.sessions[i - 1], next: track.sessions[i + 1] };
};

export const liveCount = (t: Track) => t.sessions.filter((s) => s.status === "live").length;

// the first live session in a track: where its "Start" button goes
export const firstLive = (t: Track) => t.sessions.find((s) => s.status === "live");
