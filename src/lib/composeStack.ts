// A Compose project with a web app, a worker, Postgres and Redis, started second by
// second. Start order comes from depends_on (a topological sort); whether web waits for
// Postgres to be healthy or only started, where it connects, its restart policy and the
// volume decide what `docker compose up` produces. Startup times are illustrative.

export type Host = "localhost" | "db";
export type Wait = "started" | "healthy";
export type Restart = "no" | "unless-stopped";
export type Command = "up" | "downUp" | "downVUp";
export type Design = { host: Host; wait: Wait; restart: Restart; volume: boolean };

export const FIRST: Design = { host: "localhost", wait: "started", restart: "no", volume: false };
export const FIXED: Design = { host: "db", wait: "healthy", restart: "unless-stopped", volume: true };

export const COMMANDS: { id: Command; label: string; line: string }[] = [
  { id: "up", label: "First up", line: "docker compose up -d" },
  { id: "downUp", label: "down, then up", line: "docker compose down && docker compose up -d" },
  { id: "downVUp", label: "down -v, then up", line: "docker compose down -v && docker compose up -d" },
];

type Svc = { id: string; image: string; deps: string[]; readyAfter: number };
export const SERVICES: Svc[] = [
  { id: "web", image: "shop-web", deps: ["db", "cache"], readyAfter: 1 },
  { id: "worker", image: "shop-web", deps: ["db", "cache"], readyAfter: 1 },
  { id: "db", image: "postgres:16", deps: [], readyAfter: 6 },
  { id: "cache", image: "redis:7", deps: [], readyAfter: 1 },
];
export const ROWS_BEFORE = 1240; // orders written before the restart
export const RETRY_S = 2;

// Kahn's algorithm over depends_on.
export function startOrder() {
  const left = new Map(SERVICES.map((s) => [s.id, s.deps.length]));
  const order: string[] = [];
  const ready = SERVICES.filter((s) => s.deps.length === 0).map((s) => s.id);
  while (ready.length) {
    const id = ready.shift()!;
    order.push(id);
    for (const s of SERVICES) if (s.deps.includes(id)) {
      left.set(s.id, left.get(s.id)! - 1);
      if (left.get(s.id) === 0) ready.push(s.id);
    }
  }
  return order;
}

export function composeFile(d: Design) {
  const lines = [
    "services:",
    "  web:",
    "    image: shop-web",
    '    ports: ["8080:8080"]',
    `    environment:`,
    `      DATABASE_URL: postgres://app@${d.host}:5432/shop`,
    ...(d.restart === "unless-stopped" ? ["    restart: unless-stopped"] : []),
    "    depends_on:",
    ...(d.wait === "healthy" ? ["      db: { condition: service_healthy }", "      cache: { condition: service_started }"] : ["      - db", "      - cache"]),
    "  worker: …same image, command: worker",
    "  db:",
    "    image: postgres:16",
    ...(d.wait === "healthy" ? ["    healthcheck:", '      test: ["CMD", "pg_isready", "-U", "app"]', "      interval: 2s"] : []),
    ...(d.volume ? ["    volumes: [pgdata:/var/lib/postgresql/data]"] : []),
    "  cache:",
    "    image: redis:7",
    ...(d.volume ? ["volumes:", "  pgdata: {}"] : []),
  ];
  return lines;
}

export type Event = { t: number; svc: string; text: string; tone: "info" | "good" | "bad" };

export function run(d: Design, cmd: Command) {
  const events: Event[] = [];
  const order = startOrder();
  // Data: a named volume survives `down` but not `down -v`. Without one, the postgres image's
  // VOLUME gives the container an anonymous volume, which a new container never reattaches.
  const rows = cmd === "up" ? 0 : d.volume && cmd === "downUp" ? ROWS_BEFORE : 0;
  if (cmd !== "up") events.push({ t: 0, svc: "db", text: d.volume ? (cmd === "downVUp" ? "down -v deletes the pgdata volume" : "down removes containers; the pgdata volume stays") : "down removes the db container; its data sat in an anonymous volume the new container won't reuse", tone: rows ? "good" : "bad" });

  const dbReady = SERVICES.find((s) => s.id === "db")!.readyAfter;
  events.push({ t: 0, svc: "db", text: "container started; Postgres initialising", tone: "info" });
  events.push({ t: 0, svc: "cache", text: "container started", tone: "info" });
  events.push({ t: 1, svc: "cache", text: "ready", tone: "good" });
  events.push({ t: dbReady, svc: "db", text: "accepting connections", tone: "good" });

  const appStart = d.wait === "healthy" ? dbReady + 1 : 0.5; // healthcheck runs every 2 s
  let crashes = 0;
  let readyAt: number | null = null;
  let t = appStart;
  for (const app of ["web", "worker"]) {
    t = appStart;
    let crashesHere = 0;
    events.push({ t, svc: app, text: d.wait === "healthy" ? "starts once db reports healthy" : "starts as soon as db's container is running", tone: "info" });
    for (let tries = 0; tries < 6; tries++) {
      if (d.host === "localhost") {
        events.push({ t: t + 0.5, svc: app, text: "connect localhost:5432: connection refused (that is the app's own container)", tone: "bad" });
      } else if (t + 0.5 < dbReady) {
        events.push({ t: t + 0.5, svc: app, text: "connect db:5432: the database system is starting up", tone: "bad" });
      } else {
        events.push({ t: t + 1, svc: app, text: `connected to db:5432 · ${rows.toLocaleString("en-US")} orders`, tone: rows || cmd === "up" ? "good" : "bad" });
        if (app === "web") readyAt = t + 1;
        break;
      }
      crashesHere++;
      if (d.restart === "no") {
        events.push({ t: t + 0.6, svc: app, text: "exited (1); restart: no, so it stays down", tone: "bad" });
        break;
      }
      t += RETRY_S;
      events.push({ t: t, svc: app, text: "restarted by the restart policy", tone: "info" });
    }
    crashes += crashesHere;
  }
  events.sort((a, b) => a.t - b.t);
  const dataLost = cmd !== "up" && rows === 0;
  const ok = readyAt !== null && !dataLost;
  const text = readyAt === null
    ? d.host === "localhost" ? "web never reaches Postgres: inside a container, localhost is that container" : "web crashed before Postgres was ready and nothing restarted it"
    : dataLost ? `web is up at ${readyAt} s, but the ${ROWS_BEFORE.toLocaleString("en-US")} orders are gone` : crashes ? `up at ${readyAt} s after ${crashes} crash${crashes === 1 ? "" : "es"} and restarts` : `up at ${readyAt} s with no crashes`;
  return { order, events, readyAt, crashes, rows, dataLost, ok, text };
}

export function scorecard(d: Design) {
  return COMMANDS.map((c) => ({ cmd: c, ...run(d, c.id) }));
}
