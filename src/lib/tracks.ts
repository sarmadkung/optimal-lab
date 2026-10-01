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
      { id: "event-loop", title: "The event loop, phase by phase", blurb: "Queue timers, promises and I/O, then step through each loop phase.", status: "soon" },
      { id: "streams-backpressure", title: "Streams & backpressure", blurb: "Push data faster than it drains and watch the buffer fill.", status: "soon" },
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
      { id: "load-balancing", title: "Load balancing strategies", blurb: "Compare round robin and least connections under uneven load.", status: "soon" },
      { id: "caching", title: "Caching & eviction", blurb: "Tune cache size and TTL and watch the hit rate change.", status: "soon" },
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
      { id: "ci-cd-pipeline", title: "A CI/CD pipeline, stage by stage", blurb: "Break a test or a build and see where the pipeline stops.", status: "soon" },
      { id: "containers-vs-vms", title: "Containers vs VMs", blurb: "Stack the layers and compare what each one shares.", status: "soon" },
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
    accent: "var(--ai)",
    sessions: [
      {
        id: "next-token",
        tag: "AI #02",
        title: "How an LLM picks the next token",
        blurb: "Drag temperature, top-k and top-p. Watch the odds move, then sample.",
        status: "live",
      },
      { id: "embeddings", title: "Embeddings & similarity search", blurb: "Move points in vector space and see which ones come back.", status: "soon" },
      { id: "rag", title: "RAG, step by step", blurb: "Chunk, retrieve and prompt, and see what the model actually gets.", status: "soon" },
    ],
    roadmap: ["How LLMs work", "Prompting & sampling", "Embeddings & retrieval", "Agents & tools", "Evaluation"],
    projects: ["Build a RAG chatbot over your docs", "Build a tool-using agent", "Write an eval harness"],
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
