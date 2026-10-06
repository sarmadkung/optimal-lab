# Optimal Lab

**See how engineering works.** Interactive visuals for DSA, system design, DevOps and
AI concepts, with DSA practice alongside them.

Domain: [optimallab.dev](https://optimallab.dev)

---

## What it is

| Section | Priority | What it holds |
|---|---|---|
| **Explore** | Main | One interactive visual per concept. You drag, step and break things to see how they work |
| **Practice** | Second | DSA problems grouped by pattern, from [Optimal Round](#optimal-round), each linked to the session that teaches it |

Each visual ends with a "now solve it" link to Practice, and each problem links back
to the visual that explains its pattern.

## Related repositories

Optimal Lab is one of three projects that work together. All three sit side by side
in `~/Documents/startups/`.

| Repo | Local path | Role |
|---|---|---|
| **optimal-lab** (this repo) | `../optimal-lab` | The website: interactive visuals and, later, practice |
| **[social-content](https://github.com/sarmadkung/social-content)** | `../social-content` | Content pipeline for LinkedIn, daily.dev, Instagram and X. Decides *which* concepts get a visual |
| **[optimal-round](https://github.com/sarmadkung/optimal-round)** | `../optimal-round` | 178 hand-solved DSA problems with a `./practice` test runner. The source for the Practice section |

### social-content

Every post lives in `social-content/generated/drafts/<pillar>/`. A post whose concept
teaches better when you can play with it gets a visual here. The flow:

1. The post is written in social-content.
2. The visual is built here as a page under `src/app/<slug>/`.
3. The post links to `optimallab.dev/<slug>`, and a short screen recording of the
   visual becomes the post's clip.

Only concepts with a mechanism you can vary get a visual (algorithms, sampling
settings, failure scenarios). Stories, opinions and lists stay as static images in
social-content.

### optimal-round

Each problem in `optimal-round/problems/<NN-topic>/` states the problem, constraints,
examples and target complexity, with an empty stub to fill in. The topics (two pointers,
sliding window, hash map and so on) map to Explore pages here. Solutions in that repo
are written by hand, with no AI; keep that pledge when bringing problems into Practice.

## Pages

| Route | Concept | From |
|---|---|---|
| `/` | Home: hero + tabs for Tracks, Roadmaps, Projects and Practice (hash e.g. `/#projects`; default tab is Tracks; `/#sessions` redirects to Tracks) | — |
| *(header)* | Site chrome only: logo, **Home**, **All tracks**, quick search (⌘K), theme — not the per-track list (that lives on Home tabs and `/tracks`) | — |
| `/tracks` | Every track with all its sessions | — |
| `/practice` | Every practice pattern, with counts by difficulty and what you've solved | optimal-round |
| `/practice/<pattern>` | One pattern's problems, its session and its written explainer | optimal-round |
| `/practice/<pattern>/<problem>` | Statement, constraints, examples, edge cases, target complexity behind a spoiler, how to run it | optimal-round |
| `/tracks/<track>` | One track: sessions, roadmap, projects. Tracks: `dsa`, `nodejs`, `system-design`, `devops`, `ai`, `ai-native`, `ai-automation`, `tools` | — |
| `/tracks/dsa/two-sum` | Two Sum, three ways: brute force, sort + two pointers, hash map, and how each scales | social-content DSA #01 |
| `/tracks/dsa/hash-map` | Group anagrams: one key per word, one lookup per word | — |
| `/tracks/dsa/two-pointers` | Container with most water: always move the shorter line | — |
| `/tracks/dsa/sliding-window` | Fixed window: drop the cell that left, add the cell that entered | — |
| `/tracks/dsa/monotonic-stack` | Daily temperatures: a stack of days still waiting for a warmer one | — |
| `/tracks/dsa/binary-search` | Halve a sorted list until the target is found or the range is empty | — |
| `/tracks/dsa/bfs-vs-dfs` | Queue vs stack on the same graph; only BFS finds the fewest hops | — |
| `/tracks/nodejs/event-loop` | One turn of the event loop: sync, nextTick, promises, timers, poll, check | — |
| `/tracks/nodejs/streams-backpressure` | Producer, buffer, high water mark, consumer | — |
| `/tracks/nodejs/thread-pool` | libuv pool: crypto fills the threads, a file read waits; UV_THREADPOOL_SIZE | — |
| `/tracks/system-design/load-balancing` | Round robin, least connections, and weighted routing — queues, health checks, LB timeouts | — |
| `/tracks/system-design/caching` | A guided cache: hits, misses, eviction, three predictions, then a playground | — |
| `/tracks/system-design/consistent-hashing` | Hash ring vs hash % n, keys moved on add/remove, virtual nodes | — |
| `/tracks/system-design/cdn` | Edges in three cities: TTL, hit ratio, and stale files after a deploy (wait, purge, versioned names) | — |
| `/tracks/system-design/rate-limiting` | Fixed window, sliding window and token bucket on the same bursts | — |
| `/tracks/system-design/replication` | Async vs semi-sync, replication lag, stale reads, read-your-writes, failover losing a write | — |
| `/tracks/system-design/sharding` | Hash, country or month as the shard key: hot shards and scatter queries | — |
| `/tracks/system-design/message-queues` | At-least-once delivery: visibility timeout, duplicate charges, idempotency, dead-letter queue | — |
| `/tracks/system-design/circuit-breaker` | Retry storms, backoff with jitter, and a breaker that lets a failing service recover | — |
| `/tracks/devops/ci-cd-pipeline` | Lint, test, build, deploy — stop at the first failure | — |
| `/tracks/devops/containers-vs-vms` | Start a container, or boot a virtual machine | — |
| `/tracks/devops/rolling-deploys` | maxSurge, readiness probes, a stalled rollout, kubectl rollout undo | — |
| `/tracks/ai/tokenization` | Train a tiny BPE tokenizer merge by merge, then tokenize your own text | — |
| `/tracks/ai/attention` | One attention head: query, key, value, score, scale, mask, softmax, blend | — |
| `/tracks/ai/next-token` | How an LLM picks the next token: logits, softmax, temperature, top-k, top-p, sampling | social-content AI Engineering #02 |
| `/tracks/ai/context-window` | A long chat fills the window: trimming strategies, max_tokens and prompt caching cost | — |
| `/tracks/ai/embeddings` | Cosine similarity: move a query and see which notes return | — |
| `/tracks/ai/hybrid-search` | BM25 + vector search, Reciprocal Rank Fusion, then a reranker | — |
| `/tracks/ai/rag` | Chunk, retrieve, paste into the prompt, answer only from that | — |
| `/tracks/ai/evals` | Two prompt versions graded by code checks and an LLM judge, checked against people | — |
| `/tracks/ai/agent-patterns` | Chaining, routing, parallel, orchestrator-workers, evaluator-optimizer, agent | — |
| `/tracks/ai-native/structured-output` | A schema refuses tokens that would break the JSON | — |
| `/tracks/ai-native/tool-calling` | Call a tool for live data, or watch the model guess | — |
| `/tracks/ai-automation/workflow` | One email through classify → branch → action | — |
| `/tracks/ai-automation/human-approval` | Draft a reply, then wait for approve or reject | — |
| `/tracks/ai-automation/schedules` | Cron with a runner outage: skip, catch up once, or backfill | — |
| `/tracks/tools/cursor-agent` | Search, edit, check, repeat | — |
| `/tracks/tools/mcp` | A tool server lists tools; the app forwards the call | — |
| `/tracks/tools/n8n` | Webhook → IF → Slack or email | — |
| `/tracks/tools/github-actions` | on:, parallel jobs, a matrix, needs: and if: on three different events | — |

Every session in `tracks.ts` gets a page. Sessions marked `soon` show a "coming soon" page (none right now).
The old URLs `/dsa-01` and `/next-token` redirect to the new ones (`next.config.ts`), so
links in published posts keep working.

## Practice

The Practice section shows the problems from optimal-round, grouped by pattern. Statements are
copied into `src/data/practice.json` by a script; the site never reads or shows solutions.

```bash
pnpm sync:practice              # reads ../optimal-round (or pass a path)
```

The script reads each problem file only up to the end of its header comment (problem,
constraints, examples, edge cases, complexity). The solution below it is written by hand,
with no AI, and stays in optimal-round. Run the script again after adding problems, and commit
the JSON so the site builds without the sibling repo.

- `src/lib/practice.ts` maps each optimal-round topic folder to its sessions and its explainer
  in `optimal-round/algorithms/`. Add a mapping there when a new DSA session teaches a pattern.
- Session pages show **Now solve it** (`SolveIt`) for any pattern that lists them; problem pages
  link back with **Stuck? Watch the pattern run**.
- Solving happens locally: clone optimal-round, fill in the stub, run `./practice c <number>`.
- `src/data/practice.json` is large; import `practice.ts` from server components only.

## Progress

Readers can mark a session done and a problem solved. There are no accounts, so progress lives
in `localStorage` under `progress` (`src/lib/progress.ts`; keys from `src/lib/progressKeys.ts`
and `problemKey`). `DoneToggle`, `DoneMark` and `DoneCount` in `src/components/Progress.tsx`
read the same store, so every mark on a page updates together, and other tabs follow.

## Light and dark mode

Dark is the default. The reader switches with the sun/moon button in the top bar; the
choice is saved in `localStorage`, and without one the site follows the OS setting.
`src/lib/theme.ts` holds the inline script that sets `data-theme` on `<html>` before the
first paint, so there is no flash. In components, use the colour tokens from
`globals.css` (`var(--text)`, `var(--panel)`, `var(--c1)` …), never raw hex, so both
themes work.

## Responsive layout

Every page and every visual must work on a phone and on a tablet, as well as on a
desktop. Check these widths before finishing any UI change, in both themes:

| Width | What it stands for |
|---|---|
| 390px | Phone |
| 768px | Tablet |
| 1280px | Desktop |

1. **No sideways scroll.** The page width must match the viewport. Long titles, notes and button rows wrap or stack.
2. **Phone:** one column. The top bar collapses to the Menu button. Tap targets are at least 44px tall.
3. **Tablet:** two columns where a grid has several cards. Track links in the top bar are visible, and nothing overflows the bar.
4. **A row that is the visual itself** (the eight Two Sum cells, a bar chart) may stay in a row, but the labels and controls around it must still fit.
5. Do this check for shared chrome too: header, menu, footer, and 404.

## Run it

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # production build
pnpm lint
```

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com) for layout
- [Motion](https://motion.dev) for animation
- Deployed on [Vercel](https://vercel.com)
- Optional [Supabase](https://supabase.com) Postgres for project **started** counts (see below)

### Optional Supabase (public stats + project starts)

Free tier is enough. The app works without it; with it you get **anonymous** metrics only (no accounts yet):

| Metric | Meaning |
|---|---|
| **Visitors** | Unique browsers (random cookie id `ol_vid`) |
| **Page views** | One ping per tab session (`VisitTracker` in the root layout) |
| **Project starts** | Clicks on **I'm starting** on Home → Projects |

Catalog copy stays in `src/lib/projects.ts`. Counts live in Postgres.

**Setup**

1. Create a [Supabase](https://supabase.com) project.
2. In the SQL editor, run **both** files in order:
   - `supabase/migrations/20260322120000_project_start_counts.sql`
   - `supabase/migrations/20260322130000_site_analytics.sql`
3. **Project settings → API** — copy URL, anon key, and **service role** key.
4. **Local:** `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (service role never ships to the browser).
5. **Vercel:** same three variables on the production project → redeploy.

Public totals appear in the site footer when any count is &gt; 0. APIs: `src/app/api/analytics/` and `src/app/api/projects/`.

**Not included yet (add when you need them):** signed-in users, Vercel Web Analytics, email waitlist. Supabase Auth can reuse the same project for “join with account” later.

## Layout

| Path | What lives there |
|---|---|
| `src/sessions/<track>/<session>/*Demo.tsx` | The interactive component for one session (`"use client"`) |
| `src/sessions/registry.tsx` | Maps `<track>/<session>` to its demo component |
| `src/lib/` | Pure logic behind each visual (sampling math, algorithm traces). No React, so it is easy to check |
| `src/lib/tracks.ts` | The learning tracks (DSA, Node.js, System Design, DevOps, AI, AI Native, AI Automation, Tools): sessions, planned roadmap stages and track-scoped project teasers |
| `src/lib/projects.ts` | Project catalog by pillar (AI engineering, backend, frontend) with categories and planned builds — rendered on Home → Projects |
| `src/components/ProjectCatalog.tsx` | Home Projects tab: filters + project idea cards (`src/app/api/projects/` for counts) |
| `supabase/migrations/` | SQL for optional project start counters |
| `src/lib/theme.ts` | Light/dark mode: the storage key and the no-flash inline script |
| `src/app/page.tsx` | Home page, built from `TRACKS` |
| `src/app/tracks/page.tsx` | All tracks with their sessions |
| `src/app/tracks/[track]/` | One page per track: sessions, roadmap and projects |
| `src/app/tracks/[track]/[session]/` | One page per session: breadcrumbs, the demo, then previous/next in the track |
| `src/components/` | Shared UI: `SiteHeader`, `SiteFooter`, `ThemeToggle`, `Breadcrumbs`, `TrackCard`, `SessionCard`, `HomeTabs` (the home page tab bar), the step flow (`flow/Flow.tsx`), the system map (`system/SystemMap.tsx`) and the guided lesson (`lesson/Lesson.tsx`) |
| `src/components/session/ui.tsx` | Session controls: `useWalk` + `RunButton` for one walk through the steps, `usePlayback` + `PlaybackControls` for stepping through simulator frames, `Slider`, `Choices`, `Meter` |
| `src/components/session/SessionHeader.tsx` | `SessionPage` (`max-w-6xl`) and `SessionHeader` (kicker, title, blurb) for live demos |
| `src/lib/sessionLayout.ts` | The layout rule: a session's `shape` → one view, left to right, or top to bottom |
| `src/components/session/SessionSplitLayout.tsx` | `SessionLayout`: arranges `visual`, `panel` and the step flow (`detail`) for the chosen layout |
| `src/components/session/SessionLayoutContext.tsx` | Passes the layout from the session page to the demo; dev-only layout switcher |
| `src/components/session/SessionControlBar.tsx` | Sticky run strip so Play / Generate stays reachable on long step flows |
| `src/lib/realWorldTools.ts` | Per-session list of language-agnostic tools (Redis, NGINX, MCP, …) |
| `src/components/session/RealWorldTools.tsx` | **In production** on session pages and aggregated on each track page (`/tracks/<track>#tools`) |
| `src/components/session/TrackLearningPath.tsx` | Step strip for live sessions in a track (optional `learningPathBlurb` on `Track` in `tracks.ts`) |
| `src/lib/searchIndex.ts` | Search index built from tracks, sessions, and in-production tools |
| `src/components/QuickSearch.tsx` | Header quick search (⌘K): sessions, tracks, tools |
| `src/app/globals.css` | Colour tokens, shared with the social-content post visuals |

## Explaining a process: the step flow

**Rule for every visual that explains how something works** (how an LLM picks the next
token, how a request reaches a server, how a deploy rolls out, how the event loop runs):
show it as a **step flow**. Steps run top to bottom, one card per step, with a down arrow
between them. The reader should always know where they are, what just happened and what
comes next.

Use the shared components in `src/components/flow/Flow.tsx`:

```tsx
<FlowStep n={1} title="Read the text so far" what="The prompt and the output so far go in." active={stage === 0}>
  {/* the live part of this step: a value, a chart, a slider */}
</FlowStep>
<FlowArrow label="the text so far" active={stage === 1} />
<FlowStep n={2} title="Score every possible token" what="..." active={stage === 1} />
```

How to write the flow:

1. **One step = one action.** Split the process into 4 to 8 steps. If a step needs "and"
   in its title, it is probably two steps.
2. **Title is a short verb phrase** ("Divide by temperature", "Cut the long tail"). The
   `what` line is one plain sentence a beginner can follow. No jargon without explaining it
   in the same sentence.
3. **Every arrow says what flows down** ("5 raw scores", "1 token", "HTTP request"). This is
   what makes the chain readable.
4. **Show the real data at each step.** Each card holds the live state of that step:
   numbers, bars, a list, a log line. Not a static icon.
5. **Put each control in the step it changes.** The temperature slider lives in the
   temperature step, not in a settings panel somewhere else.
6. **Add a "run it" button that walks the flow.** Highlight one step at a time (`active`),
   and pulse the arrow as the result moves down. The reader watches one input travel
   through the whole chain.
7. **Close the loop.** If the process repeats (the next token, the next request, the next
   tick), say so in the last step and point back to step 1.
8. **Check it at 390px and 768px.** Steps stack naturally, so there should be no sideways scroll. See "Responsive layout" above.

Reference implementation: `/tracks/ai/next-token` (`src/sessions/ai/next-token/NextTokenDemo.tsx`).

A guided lesson (see below) uses the same idea one chapter at a time, with Back / Next, instead of showing every card at once.

Comparisons of approaches (like `/tracks/dsa/two-sum`, three ways to solve Two Sum) can keep their own
layout. The step flow is for "how does X work, step by step".

## Showing the system: the system map

**Rule for every visual where things move between parts of a real system** (a request
going from client to server, a cache miss reaching the database, a tool call leaving the
model, a commit moving through a pipeline): put a **system map** above the step flow. The
map draws the actual infrastructure as boxes and links, and animates each request or
piece of data travelling along those links. The step flow still tells the story; the map
shows *where* each step happens.

Use `SystemMap` from `src/components/system/SystemMap.tsx`:

```tsx
<SystemMap
  title="A client, a cache and the slow database behind it"   // read by screen readers
  accent={ACCENT}
  nodes={[
    { id: "client", label: "Client", sub: "asks for a", at: [13, 50], mobileAt: [50, 13], state: "active" },
    { id: "cache", label: "Cache", sub: "a · b", at: [50, 50], state: hit ? "good" : "active" },
    { id: "db", label: "Database", at: [87, 50], mobileAt: [50, 87], state: hit ? "dim" : "active" },
  ]}
  links={[
    { from: "client", to: "cache", label: "key a" },
    { from: "cache", to: "db", label: "miss: fetch", dim: hit },
  ]}
  packets={hops(`req-${i}`, ["client", "cache", "db"], { label: "a" })}
  aspect={2.6}
  mobileAspect={1}
  caption="Miss. “a” went to the database and back."
>
  <PlaybackControls playback={playback} accent={ACCENT} nextLabel="Next request" />
</SystemMap>
```

How to build the map:

1. **Draw the real parts.** Each node is something an engineer would name: client, load
   balancer, server, cache, database, model, your app, MCP server, queue, test runner.
   3 to 6 nodes. Not "Step 1".
2. **One source of truth.** The map, the packets, the step highlight and the caption are
   all computed from the same `stage` (from `useWalk`) or frame (from `usePlayback` and a
   `src/lib/` simulator). Never animate the map on its own timer.
3. **Move the data, not the boxes.** A packet is one request, key, chunk, or result. Give it
   a short label ("req 2", "GET", "top 2"). Use `hops(id, [a, b, c])` for a multi-hop trip
   so each hop starts when the last one ends. Change the packet `id` to replay it.
4. **Show the path not taken.** Dim the branch that does not run (`dim: true` on the link,
   `state: "dim"` on the node): the false branch of an IF, the database on a cache hit, the
   tool API when tools are off.
5. **Node state is live state.** `sub` holds the current number or value ("3 busy", "a · b",
   "red"). `state` is `active` (working now), `wait` (blocked on someone), `good`, `bad`,
   `dim` or `idle`.
6. **The caption says what is happening now** in one plain sentence. It is announced to
   screen readers (`aria-live`), so the animation is never the only way to follow along.
7. **Playback lives in the map.** Put the run button (`RunButton`) or `PlaybackControls`
   as the map's children, so the reader can press play and watch in the same place. Controls
   that change a step's input (sliders, choices) stay in that step.
8. **Lay it out for a phone too.** `at` is the desktop/tablet position in % of the map;
   `mobileAt` (under 640px) usually turns a left-to-right chain into top-to-bottom, or a
   row into a 2×2. Keep at least ~30% between node centres so links and labels show.
9. **Respect reduced motion.** `SystemMap` already skips packet animation when the OS
   asks for reduced motion; the highlighted links, node states and caption still tell
   the story.

### Which visual to use

| The concept is about… | Use | Examples |
|---|---|---|
| Requests or data moving between parts of a system | System map + step flow | load balancing, backpressure, RAG, tool calling, MCP, n8n, email workflow, human approval, CI/CD, agent loop, event loop |
| A running system the reader should predict and break | Guided lesson | caching |
| A process with no meaningful "where" | Step flow only | next token, structured output, embeddings |
| How an algorithm's state changes | Step flow with a state visual inside a step (array cells, pointers, a range) | sliding window, binary search |
| Several approaches side by side | Comparison layout | Two Sum, containers vs VMs |

A system map can sit beside a second, specialised picture driven by the same frame: the
thread pool adds a timeline of which thread ran which task, scheduled workflows add the day's
hourly slots, GitHub Actions adds the workflow file with the active lines lit. Consistent
hashing and rolling deploys use one specialised picture (the ring, the pod board) instead.

For live system-map sessions, use **`SessionLayout`** (see "Choosing a session layout" below for how the page is arranged). Put `<SystemMap chrome="split" … />` in `visual`, and **`SystemMapPanel`** in `panel` (one `aria-live` caption plus playback and any inputs that apply to the whole run). Put the `FlowStep` chain in `detail`. Wrap the page in **`SessionPage`** + **`SessionHeader`**. Reference: `/tracks/system-design/load-balancing`.

Step-flow-only sessions with no picture can keep a single column but should use **`SessionControlBar`** for the main run action and global toggles, wrap the chain in `FlowSequence`, and leave per-step sliders inside the step they change. Reference: `/tracks/ai/next-token`.

Comparison layouts (Two Sum, containers vs VMs) keep their own tabs or side-by-side lanes inside **`SessionPage`** + **`SessionHeader`**, and must fit one view for up to three approaches.

## Choosing a session layout

Every live session is shown in one of three layouts. The author never picks one by
feel: each session declares its **shape** in `src/lib/tracks.ts`, and
`chooseLayout` in `src/lib/sessionLayout.ts` turns that shape into a layout. A new
session follows the same rule for free, and `next build` fails if a live session
has no shape.

| Layout | What the reader sees | Good for |
|---|---|---|
| **One view** (`stage`) | The picture stays pinned on the left. The caption, the controls and the steps sit beside it. Every step title is visible; the active step opens, the rest fold. | A few repeating steps, one structure changing in place, a guided lesson, 2–3 approaches side by side |
| **Left to right** (`rail`) | The picture and the panel sit side by side on top. The steps run sideways underneath, one card each, with ← / → and a step counter. On a phone it is a swipe carousel. | A pipeline: one input travels start → finish once (CI/CD, RAG-like chains, MCP, n8n, workflows) |
| **Top to bottom** (`scroll`) | The picture and the panel stay pinned on the left; long steps read down the page on the right. | Many steps, or steps that each hold their own charts, tables, sliders or long text |

Below 1024px every layout stacks in one column, in reading order, with no sideways
page scroll (the rail scrolls inside itself).

### The shape

```ts
{ id: "n8n", …, status: "live", shape: { kind: "system", steps: 5, flow: "pipeline" } }
```

| Field | Values | Meaning |
|---|---|---|
| `kind` | `system`, `process`, `algorithm`, `comparison`, `simulation` | Same as "Which visual to use" above |
| `steps` | number | Flow steps, lesson chapters, or approaches in a comparison |
| `flow` | `pipeline`, `cycle`, `state` | One trip start → finish, the same steps repeating, or one structure changing in place |
| `richSteps` | boolean | Steps hold their own charts, tables, long text or sliders |
| `layout` + `reason` | optional | Override the rule. A `reason` is required so the exception is written down |

### The rule (first match wins)

1. `layout` set by hand → use it.
2. `simulation` → **one view** (a guided lesson).
3. `comparison` → **one view** for up to 3 approaches, otherwise **left to right**.
4. More than 6 steps → **top to bottom**.
5. Rich steps and more than 4 of them → **top to bottom**.
6. `pipeline` → **left to right**.
7. Anything else (cycles, state) → **one view**.

The limits (`STAGE_MAX_STEPS`, `RICH_MAX_STEPS`, `COMPARE_MAX_OPTIONS`) live at the top of
`sessionLayout.ts`.

### Building for it

- Use **`SessionLayout`** (`src/components/session/SessionSplitLayout.tsx`) with `visual`,
  `panel` and `detail`. It reads the layout from context, so the demo does not choose.
  `SessionSplitLayout` is the old name for the same component.
- Write the steps once as `FlowStep` / `FlowArrow` in `detail`. **`FlowSequence`** lays them
  out top to bottom, folded, or as a rail. Keep steps and arrows as direct children or inside
  fragments (`<Fragment key>`), not wrapped in a `div`, so it can find them.
- Mark the running step with `active`. In one view the newly active step opens; in a rail it
  scrolls into view. The reader can still open or scroll to any step.
- A session with no system map still passes a `visual`: the state picture (array cells, a
  range). Global controls (k, the target, Play) go in the `panel`.
- A step-flow-only session with no picture (next token, structured output) wraps its chain in
  `<FlowSequence>` directly, under its `SessionControlBar`.
- Comparisons and guided lessons lay themselves out (`Lesson`, side-by-side lanes) and use
  `<FlowSequence mode="stage">` for each lane's steps.

**Try another layout locally:** in `pnpm dev`, every session shows a **Layout** switcher in the
bottom-right corner with the rule's reason, or open the page with `?layout=stage|rail|scroll`.
It never ships to production.

| Session | Shape | Layout |
|---|---|---|
| Two Sum | comparison, 3 | One view |
| Sliding window | algorithm, 5, state | One view |
| Binary search | algorithm, 4, state | One view |
| Event loop | system, 6, cycle | One view |
| Streams and backpressure | system, 4, cycle, rich | One view |
| Load balancing | system, 4, cycle, rich | One view |
| Caching | simulation, 10 | One view |
| Containers vs VMs | comparison, 2 | One view |
| CI/CD pipeline | system, 5, pipeline | Left to right |
| Embeddings | process, 4, pipeline, rich | Left to right |
| Structured output | process, 4, pipeline, rich | Left to right |
| Tool calling | system, 5, pipeline | Left to right |
| Email workflow | system, 5, pipeline | Left to right |
| Human approval | system, 4, pipeline | Left to right |
| MCP | system, 6, pipeline | Left to right |
| n8n | system, 5, pipeline | Left to right |
| Tokenization | algorithm, 5, state | One view |
| Context window | process, 6, cycle | One view |
| Hybrid search | system, 5, pipeline | Left to right |
| Attention | process, 6, pipeline, rich | Top to bottom |
| Evals | process, 6, pipeline, rich | Top to bottom |
| Next token | process, 8, cycle, rich | Top to bottom |
| RAG | system, 6, pipeline, rich | Top to bottom |
| Coding agent loop | system, 5, cycle, rich | Top to bottom |
| Hash map, two pointers | algorithm, 5, state | One view |
| Monotonic stack | algorithm, 4, state | One view |
| BFS vs DFS | comparison, 2 | One view |
| Thread pool, rolling deploys, schedules | system, 5, cycle | One view |
| Consistent hashing | system, 5, state | One view |
| GitHub Actions | system, 5, pipeline | Left to right |
| Agent patterns | comparison, 6 | Left to right |
| CDN, message queues, retries and circuit breakers | system, 5, cycle | One view |
| Rate limiting | comparison, 3 | One view |
| Replication | system, 5, pipeline | Left to right |
| Sharding | system, 5, state | One view |

## Guided lessons

Use a guided lesson when the reader should watch one system change, commit to a guess, then break it. The stage stays on screen. Only the current chapter is written out. Back / Next moves the chapter, and the URL hash keeps the place (`#predict-b`). From 1024px up, the chapter, the prediction and Back / Next sit to the right of the stage, so the picture and the controls share one view. Below that they stack under the stage.

Use `Lesson` from `src/components/lesson/Lesson.tsx`. The stage is the system picture for this concept (a specialised picture, or `SystemMap` when the generic boxes are enough). Drive the picture from the lesson index plus one pure simulator in `src/lib/`, the same way a system map shares its frame with a step flow.

```tsx
<Lesson
  steps={steps} // id, chapter, title, body, optional predict
  accent={ACCENT}
  renderStage={(step, ctx) => <CacheStage scene={sceneFor(step)} ctx={ctx} />}
  renderExtra={(step) => (step.id === "size" ? <Slider ... /> : null)}
/>
```

How to write one:

1. **One chapter, one change.** 6 to 12 chapters. A chapter title is a short phrase ("A miss stores a copy").
2. **The stage shows the real parts** and moves one request or value along them. Pause, replay and 0.5× / 1× / 2× come from `Lesson`. `ctx.runId` restarts the motion. `ctx.paused` and `ctx.speed` drive it.
3. **Predict before the reveal.** A `predict` block hides the outcome until the reader chooses, or skips. The explanation says why that choice follows from the picture.
4. **Put the control in the chapter it changes.** A cache-size slider belongs to the chapter that replays the sequence at that size.
5. **End on a playground** when the reader should send their own input. Set `controls: false` on that chapter so Pause / Replay does not fight their clicks.
6. **The caption states what just happened**, in one sentence, including when motion is reduced. The stage already respects `prefers-reduced-motion`.
7. **Check 390px, 768px and 1280px.** The stage, the choices and Back / Next have to fit with no sideways scroll. At 1280px they share one view: the picture on the left, the chapter and Back / Next on the right.

Reference implementation: `/tracks/system-design/caching`.

## Adding a visual

1. Put the logic in `src/lib/<concept>.ts` and check its numbers by hand.
2. Build the demo in `src/sessions/<track>/<session>/`. If it explains a process, use the step flow (see above).
   If things move between parts of a system, add a system map above it, driven by the same stage
   (see "Showing the system" and "Which visual to use"). If the reader should predict and break a running system, use a guided lesson instead.
   Use colour tokens, not hex, so it works in light and dark mode.
3. Register it in `src/sessions/registry.tsx`, set the session's `status: "live"` and its
   `shape` in `src/lib/tracks.ts` (see "Choosing a session layout"), and add it to the Pages table above. The route
   `/tracks/<track>/<session>` and the previous/next links come for free.
4. Add an **In production** entry in `src/lib/realWorldTools.ts`: name real services and
   standards (Redis, NGINX, JSON Schema), not language-specific libraries. Each tool needs
   an **`href`** to its official site or GitHub repo. Session and track pages render the
   list automatically.
5. Check it at phone width (390px) and tablet width (768px), in both themes: no sideways scroll. See "Responsive layout" above.
6. Link it from the matching post in social-content.
