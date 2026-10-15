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
| **optimal-lab** (this repo) | `../optimal-lab` | The website: interactive visuals and DSA practice |
| **[social-content](https://github.com/sarmadkung/social-content)** | `../social-content` | Content pipeline for LinkedIn, daily.dev, Instagram and X. Decides *which* concepts get a visual |
| **[optimal-round](https://github.com/sarmadkung/optimal-round)** | `../optimal-round` | 178 hand-solved DSA problems with a `./practice` test runner. The source for the Practice section |

### social-content

Every post lives in `social-content/generated/drafts/<pillar>/`. A post whose concept
teaches better when you can play with it gets a visual here. The flow:

1. The post is written in social-content.
2. The visual is built here as a session under `src/sessions/<track>/<session>/` (see
   "Adding a visual").
3. The post links to `optimallab.dev/tracks/<track>/<session>`, and a short screen recording
   of the visual becomes the post's clip.

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
| `/tracks/<track>` | One track: sessions, roadmap, projects. Tracks: `dsa`, `nodejs`, `system-design`, `devops`, `frontend`, `databases`, `networking`, `operating-systems`, `security`, `ai`, `ai-native`, `ai-automation`, `tools` | — |
| `/tracks/dsa/two-sum` | Two Sum, three ways: brute force, sort + two pointers, hash map, and how each scales | social-content DSA #01 |
| `/tracks/dsa/hash-map` | Group anagrams: one key per word, one lookup per word | — |
| `/tracks/dsa/two-pointers` | Container with most water: always move the shorter line | — |
| `/tracks/dsa/sliding-window` | Fixed window: drop the cell that left, add the cell that entered | — |
| `/tracks/dsa/monotonic-stack` | Daily temperatures: a stack of days still waiting for a warmer one | — |
| `/tracks/dsa/binary-search` | Halve a sorted list until the target is found or the range is empty | — |
| `/tracks/dsa/tree-recursion` | Max depth of a binary tree: calls go down, answers come back up, the stack height is the depth | — |
| `/tracks/dsa/bfs-vs-dfs` | Queue vs stack on the same graph; only BFS finds the fewest hops | — |
| `/tracks/dsa/dynamic-programming` | Coin change as a table filled from 0 upward; greedy fails on 6, plain recursion repeats work | — |
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
| `/tracks/ai/training-loss` | Fit a line by gradient descent: predict, loss, gradient, step; four learning rates from crawl to blow-up | — |
| `/tracks/ai/kv-cache` | Generate token by token with and without a KV cache: rows computed, and cache size by conversation length | — |
| `/tracks/ai/chunking` | Fixed size, overlap or by heading on one help page: which questions get their whole answer, and what it costs | — |
| `/tracks/ai/llm-as-judge` | Eight answer pairs graded by a judge with position and length bias; swap orders and a rubric remove confident wrong picks | — |
| `/tracks/ai/query-rewriting` | Search with the question as typed, rewritten, or as a HyDE fake answer, and see where the right page lands | — |
| `/tracks/ai/lora` | Freeze W, train thin B and A: an 8×8 picture of B·A and trainable parameters by rank for a 7B model | — |
| `/tracks/ai/token-embeddings` | Look up each token's row, add sinusoidal positions, and see “dog bit man” and “man bit dog” become different inputs | — |
| `/tracks/ai/transformer-block` | LayerNorm, attention, residual adds and feed-forward on real numbers; without residuals 4 tokens blur into one; parameters for GPT-2 and Llama 3 | — |
| `/tracks/ai/pretraining` | Clean a crawl, then train a tiny next-word model batch by batch and watch held-out loss fall; compute for real runs (6·N·D) | — |
| `/tracks/ai/instruction-tuning` | One prompt through pretrained, SFT and RLHF; slide the KL penalty β and watch reward rise while people's rating falls | — |
| `/tracks/ai/hallucinations` | Twelve questions seen 0 to 100,000 times in training: retrieval, a “not sure” threshold, and grading that stops rewarding guesses | — |
| `/tracks/system-design/idempotency` | A lost payment response and a retry: two charges without a key, one with an idempotency key | — |
| `/tracks/system-design/cap-theorem` | Three replicas and a partition: CP refuses the minority read, AP answers stale; then the network heals | — |
| `/tracks/devops/images-layers` | Which Dockerfile layers rebuild after a code or dependency change, for two instruction orders | — |
| `/tracks/nodejs/blocking-the-event-loop` | A 200 ms request on the main thread delays every 2 ms request; a worker thread keeps them at 2 ms | — |
| `/tracks/system-design/bloom-filters` | Add names to a 24-bit filter and check others: definitely not, or probably yes (with a false positive) | — |
| `/tracks/system-design/unique-ids` | Build a Snowflake id bit by bit (time, machine, sequence) and see ids from three servers sort by time | — |
| `/tracks/system-design/distributed-locks` | A GC pause outlives a lock's lease and two clients write; a fencing token makes storage reject the stale one | — |
| `/tracks/databases/mvcc` | Row versions with xmin/xmax: a reader keeps its snapshot while a writer commits, then VACUUM cleans up | — |
| `/tracks/databases/isolation-anomalies` | Two deposits at once: read-then-write loses one; FOR UPDATE, SERIALIZABLE (with retry) and an atomic UPDATE don't | — |
| `/tracks/networking/dns-resolution` | Resolve a name cold (browser, OS, resolver, root, TLD, authoritative: 103 ms) or warm (8 ms) | — |
| `/tracks/networking/congestion-control` | The congestion window per round trip: slow start, additive increase, and Reno vs Tahoe after a loss | — |
| `/tracks/operating-systems/deadlocks` | Two threads take two locks in opposite order and hang; one global lock order prevents it | — |
| `/tracks/operating-systems/cpu-scheduling` | Four processes under FCFS, shortest-job-first and round robin: a Gantt chart, waiting times and switches | — |
| `/tracks/security/password-hashing` | A leaked users table under plain text, SHA-256, salted SHA-256 and bcrypt: what the attacker sees and how long cracking takes | — |
| `/tracks/security/jwt` | Tamper with a token, switch it to alg none, or let it expire, and see which checks catch it | — |
| `/tracks/security/csrf` | A malicious page submits a form to your bank; try each defense and see which request gets through | — |
| `/tracks/security/sql-injection` | Type a login payload and compare string concatenation with a parameterized query | — |
| `/tracks/frontend/rendering-pipeline` | Change width, color or transform and see which of style, layout, paint and composite each one runs | — |
| `/tracks/frontend/browser-event-loop` | Step through sync code, a promise and a setTimeout to see why the output is A E C D B | — |
| `/tracks/frontend/hydration` | Compare client rendering, server rendering and islands: when content appears and when it can be clicked | — |
| `/tracks/frontend/core-web-vitals` | Toggle a CDN, deferred scripts, a preload and image compression and watch LCP drop below 2.5 s | — |
| `/tracks/frontend/flexbox` | Drag the container width and see grow split the extra space and shrink take it back | — |
| `/tracks/devops/probes` | An app warms up and later hangs; try no probes, readiness, liveness or both and count failed requests | — |
| `/tracks/devops/resource-limits` | A leaking app under different memory and CPU limits: OOM kills versus throttling | — |
| `/tracks/devops/ip-subnets` | Drag the prefix length to see network and host bits, split a /16 into subnets and test which IPs fall inside | — |
| `/tracks/devops/git-internals` | Step through commits and a branch and watch blobs, trees, commits and refs get written | — |
| `/tracks/devops/terraform-plan-apply` | Make a change, from adding a bucket to console drift, and read the create, update, replace or destroy plan | — |
| `/tracks/devops/slos-error-budgets` | The same incidents against 99%, 99.9% and 99.99% targets: how much budget is left | — |
| `/tracks/ai/react-loop` | Step through thought, action and observation with search, weather and calculator tools | — |
| `/tracks/ai-native/streaming-ui` | Stream a JSON answer and compare waiting, raw text, and parsing partial chunks | — |
| `/tracks/ai-automation/retries-errors` | Try no retries, immediate retries and backoff against a 503, a 429 and a 400 | — |
| `/tracks/ai-automation/confidence-fallbacks` | Slide the auto-approve threshold and trade automation rate against errors that slip through | — |
| `/tracks/tools/model-routers` | Twelve requests during a provider outage: one provider, a fallback chain, or routing by difficulty | — |
| `/tracks/system-design/streaming-responses` | Watch tokens move model to API to proxy to browser, and see one buffering proxy undo streaming | — |
| `/tracks/dsa/heap-top-k` | Push a stream through a min-heap of size k, with sift-up and sift-down drawn as a tree | — |
| `/tracks/dsa/fast-slow-pointers` | Slow and fast pointers on a linked list with and without a loop, then find where the loop starts | — |
| `/tracks/dsa/trie` | Pick a prefix and watch the walk down a trie of words, then the words collected below | — |
| `/tracks/dsa/union-find` | Add edges one at a time and watch groups merge, with the parent array and depths | — |
| `/tracks/dsa/prefix-sum` | Drag a range and see its sum come from two prefix totals instead of adding every cell | — |
| `/tracks/dsa/merge-intervals` | Sort intervals on a number line and sweep through, merging overlaps | — |
| `/tracks/dsa/backtracking` | Find subsets that hit a target in a take/skip decision tree, with and without pruning | — |
| `/tracks/dsa/dijkstra` | Watch Dijkstra settle nodes and relax edges on a weighted graph, then trace the path back | — |
| `/tracks/dsa/topological-sort` | Kahn's algorithm on a course plan: indegrees, a ready queue, and what a cycle looks like | — |
| `/tracks/dsa/lru-cache` | Run gets and puts against a 3-slot cache and watch hits, moves to front and evictions | — |
| `/tracks/system-design/autoscaling` | A traffic spike against a fixed fleet, naive per-minute scaling and target tracking with cooldown | — |
| `/tracks/system-design/delivery-guarantees` | A consumer crashes mid-stream: commit-first loses a payment, process-first doubles it, dedupe fixes it | — |
| `/tracks/system-design/sagas-outbox` | Step an order saga through four services, fail a step and watch compensations, and see why the outbox exists | — |
| `/tracks/databases/connection-pooling` | Add app servers and watch connections hit max_connections, with per-request, per-server pools and PgBouncer | — |
| `/tracks/databases/join-algorithms` | Step through nested loop, hash and merge joins on small tables and compare costs at scale | — |
| `/tracks/networking/nat` | Packets leave three private devices, get rewritten by the router, and replies are mapped back | — |
| `/tracks/operating-systems/virtual-memory` | Translate addresses through a TLB and page table, and trigger page faults that evict a page | — |
| `/tracks/frontend/css-grid` | Pick a grid template, drag the container width and watch fr, fixed and auto-fill tracks resize | — |
| `/tracks/frontend/promises-async` | Step through what await pauses and in what order logs appear, then compare sequential awaits with Promise.all | — |
| `/tracks/security/digital-signatures` | Sign with toy RSA and verify a genuine message, a tampered one, and a forgery | — |
| `/tracks/system-design/cache-invalidation` | A price changes under a cache: TTL, delete-on-write, a slow-reader race, and write-through | — |
| `/tracks/system-design/backpressure` | A fast producer and slow consumer with an unbounded queue, load shedding and backpressure | — |
| `/tracks/system-design/consensus` | Step through a Raft leader crash, election by majority, replication and commit | — |
| `/tracks/system-design/merkle-trees` | Compare two replicas through hash trees and walk down only the branches that differ | — |
| `/tracks/system-design/clocks` | Three processes and their messages ordered by wall clocks, Lamport clocks and vector clocks | — |
| `/tracks/system-design/deployment-strategies` | Ship a buggy version with rolling, blue-green and canary rollouts and count failed requests | — |
| `/tracks/system-design/hedged-requests` | Forty requests with a slow tail: send backups after a delay and watch p99 drop | — |
| `/tracks/security/key-exchange` | Pick Alice's and Bob's secrets and watch both reach the same key while Eve sees only public values | — |
| `/tracks/security/idor` | Change the invoice id in the URL with and without an ownership check | — |
| `/tracks/security/ssrf` | Paste internal and sneaky URLs into a link-preview feature against three defences | — |
| `/tracks/databases/window-functions` | Running totals, ranks and LAG over a sales table, with the partition and frame highlighted | — |
| `/tracks/databases/lsm-trees` | Step through writes, flushes to SSTables, reads across files and compaction | — |
| `/tracks/databases/write-ahead-log` | A committed transfer and a crash, with and without a write-ahead log and recovery | — |
| `/tracks/databases/read-replicas` | A user renames themselves and reloads: stale replicas, read-your-writes routing and waiting for catch-up | — |
| `/tracks/databases/composite-indexes` | Run five WHERE clauses against an index on (country, city, age) and see which entries are read | — |
| `/tracks/networking/routing` | Send packets to five destinations and see which routes match and which one wins | — |
| `/tracks/networking/http2` | Load ten files over HTTP/1.1, HTTP/2 and HTTP/3, then lose a packet | — |
| `/tracks/networking/traceroute` | Raise the TTL one hop at a time and watch each router reveal itself | — |
| `/tracks/networking/flow-control` | A receiving app stalls; watch the window shrink to zero and the sender pause | — |
| `/tracks/networking/latency-bandwidth` | Change bandwidth and round-trip time and see handshakes, slow start and transfer for three sizes | — |
| `/tracks/operating-systems/memory-hierarchy` | Access times from registers to cross-continent round trips, in real time and at human scale | — |
| `/tracks/operating-systems/cache-locality` | Sum an 8×8 array row by row and column by column through a tiny cache and count the misses | — |
| `/tracks/operating-systems/producer-consumer` | A fast producer and slow consumer share a 3-slot buffer, without coordination and with semaphores | — |
| `/tracks/operating-systems/epoll` | Five connections with requests at different times under blocking reads, a thread each, and epoll | — |
| `/tracks/operating-systems/gc` | Reference counting and mark-and-sweep on a small heap with an unreachable cycle | — |
| `/tracks/frontend/event-propagation` | Click a nested button and watch capture, target and bubble, then stopPropagation and delegation | — |
| `/tracks/frontend/closures` | var vs let in a loop and a private counter, with the scopes each function keeps alive | — |
| `/tracks/frontend/css-cascade` | Toggle seven competing rules and see which color wins and why | — |
| `/tracks/frontend/stacking-contexts` | A z-index 9999 modal trapped under a z-index 10 header, rendered live, and the fixes | — |
| `/tracks/frontend/code-splitting` | One bundle vs route splitting vs lazy heavy parts, and what a visitor downloads first | — |
| `/tracks/ai/overfitting` | Fit polynomials of degree 1 to 9 to noisy points and compare training and held-out error | — |
| `/tracks/ai/neural-networks` | A hand-weighted two-layer network solves XOR; step the inputs and follow every sum | — |
| `/tracks/ai/scaling-laws` | Pick a compute budget and see loss against model size, and where the optimum sits | — |
| `/tracks/ai/long-context-vs-rag` | Grow a document set and compare cost, latency and accuracy of stuffing the context vs RAG | — |
| `/tracks/ai/eval-metrics` | Move a spam threshold and watch the confusion matrix, precision, recall and F1 | — |
| `/tracks/ai-native/feature-cost` | Size a feature's monthly bill from users, calls, prompt and answer length, model and caching | — |
| `/tracks/ai-native/ab-testing-ai` | Two prompts with a small real difference: watch the confidence interval shrink as users grow | — |
| `/tracks/ai-native/latency-ux` | The same 6-second agent task shown as a spinner, progress steps, streaming and optimistic UI | — |
| `/tracks/ai-automation/classify-route` | Route support emails with free-text labels vs a fixed enum and see which ones fall through | — |
| `/tracks/tools/build-mcp-server` | Three versions of an order-lookup tool and how a model uses each: names, schemas and lean results | — |
| `/tracks/devops/files-permissions` | Flip rwx bits for owner, group and others and see the octal mode and who can read, edit or run the file | — |
| `/tracks/devops/services-ingress` | Route requests through Ingress rules to Services and pods, then break a selector and a pod's readiness | — |
| `/tracks/devops/prometheus-metrics` | A request counter with a pod restart, rate() smoothing it out, and p95 from a histogram | — |
| `/tracks/devops/gitops` | Merge a change and watch the controller sync it, then drift the cluster by hand with and without self-heal | — |
| `/tracks/devops/terraform-state` | Two engineers apply at once: without a lock state is overwritten and a resource orphaned; with one, they take turns | — |
| `/tracks/devops/backups-restore` | A table is dropped at 14:30: compare nightly, hourly and continuous backups by data lost and time to restore | — |
| `/tracks/security/certificates` | Check a site's certificate chain when it's valid, expired, for the wrong name, missing an intermediate or self-signed | — |
| `/tracks/security/oauth-flow` | Step through the authorization code flow, then see a stolen code succeed without PKCE and fail with it | — |
| `/tracks/system-design/estimation` | Size a photo-sharing app: QPS, peak reads, storage per year, egress and servers from a few assumptions | — |
| `/tracks/databases/table-partitioning` | Queries and retention on a 120M-row table, as one table and partitioned by month | — |
| `/tracks/system-design/scaling` | Raise traffic and compare one bigger machine with many small ones on cost, limits and failure | — |
| `/tracks/system-design/latency-throughput` | Increase traffic towards capacity and watch latency stay flat, then explode | — |
| `/tracks/system-design/top-k` | Hash words into a 3×8 count-min sketch and see why the minimum counter is the best estimate | — |
| `/tracks/system-design/probabilistic-counting` | Estimate distinct visitors from 48 bytes of registers and compare with an exact set | — |
| `/tracks/system-design/change-data-capture` | Sync a search index with dual writes and with CDC, then crash halfway | — |
| `/tracks/system-design/schema-migrations` | Rename a column during a rolling deploy in one step, then with expand and contract | — |
| `/tracks/system-design/api-gateway` | Send six requests through TLS, auth, rate limit, cache and routing and see where each stops | — |
| `/tracks/system-design/webhooks` | Receive webhooks when your endpoint is down, slow or forged, with signature checks and dedupe | — |
| `/tracks/system-design/graceful-degradation` | Break a product page's dependencies with and without timeouts and fallbacks | — |
| `/tracks/system-design/request-journey` | Follow one request through DNS, CDN, load balancer, app, cache and database, cold and warm | — |
| `/tracks/system-design/bulkheads` | A hanging payments dependency eats a shared thread pool; separate pools keep the catalog up | — |
| `/tracks/system-design/failover-dr` | Lose a region and compare four DR strategies by recovery time, data loss and cost | — |
| `/tracks/system-design/eventual-consistency` | Tune W and R across three lagging replicas and see when a read can return stale data | — |
| `/tracks/system-design/cqrs-event-sourcing` | Replay an account's events to any point and watch several read models rebuild | — |
| `/tracks/system-design/gossip` | Spread news through 32 nodes by random gossip and count the rounds for different fanouts | — |
| `/tracks/system-design/availability` | Chain a load balancer, app servers and a database, add redundancy, and watch the nines | — |
| `/tracks/system-design/feature-flags` | Roll a feature out to staff, then a percentage of 100 hashed users, then hit the kill switch | — |
| `/tracks/system-design/realtime` | Deliver four chat messages with polling, long polling, SSE and WebSockets and compare delay and cost | — |
| `/tracks/system-design/background-jobs` | Sign-up side effects done inline vs on a queue, with retries and a dead-letter queue | — |
| `/tracks/system-design/multi-tenancy` | Compare shared tables, schema per tenant and database per tenant, then forget a WHERE clause | — |
| `/tracks/devops/linux-processes` | Send SIGTERM and SIGKILL, kill a parent, and leave children unreaped in a small process tree | — |
| `/tracks/devops/system-resources` | Read load average and CPU breakdown on a 4-core box: healthy, busy, overloaded and stuck on disk | — |
| `/tracks/devops/dns-records` | Look up A, CNAME, MX and TXT records in a zone and follow CNAME chains | — |
| `/tracks/devops/reverse-proxy-config` | Route five requests through nginx location blocks to an upstream pool, WebSockets and static files | — |
| `/tracks/devops/vpc` | Trace five flows through public and private subnets, gateways and security groups | — |
| `/tracks/devops/dockerfiles` | Change code or dependencies and see which layers rebuild with two Dockerfile orderings | — |
| `/tracks/devops/container-networking` | Try five connections between the host and containers: published ports, names and the localhost trap | — |
| `/tracks/devops/volumes` | Insert rows, restart, remove and recreate a database container with three kinds of storage | — |
| `/tracks/devops/pod-autoscaling` | Change the app's CPU needs and step through the HPA's replica calculation, min and max | — |
| `/tracks/devops/scheduling` | Place seven pods on three nodes by CPU requests, with a taint and a pod left pending | — |
| `/tracks/devops/branching-strategies` | Three developers over two weeks with trunk-based, short and long-lived branches | — |
| `/tracks/devops/releases-versioning` | Pick what changed, get the next version, and see which dependency ranges accept it | — |
| `/tracks/devops/build-caching` | Change one package in a monorepo and compare building everything, affected only, and with a remote cache | — |
| `/tracks/devops/supply-chain` | Turn on lockfiles, scanning, CI builds, signing and verification and see which attacks get through | — |
| `/tracks/devops/regions-zones` | Deploy in one zone, three zones or two regions, then fail a server, a zone and a region | — |
| `/tracks/devops/serverless` | Compare function and container costs as traffic grows, and cold starts by traffic shape | — |
| `/tracks/devops/cloud-costs` | Apply six common savings to a monthly cloud bill and see which lines shrink | — |
| `/tracks/devops/structured-logging` | Find a user's errors with grep on free-text logs, then with a query on structured JSON | — |
| `/tracks/devops/opentelemetry` | Read a checkout trace waterfall: normal, a slow external API, and N+1 queries | — |
| `/tracks/devops/dora-metrics` | Compare quarterly, weekly and continuous delivery teams on the four DORA metrics | — |
| `/tracks/frontend/url-to-pixels` | Step through one page load from DNS lookup to an interactive page | — |
| `/tracks/frontend/web-workers` | Run a 1.2 s calculation on the main thread and in a Web Worker and count dropped frames | — |
| `/tracks/frontend/this-binding` | Call the same method five ways and see what this becomes each time | — |
| `/tracks/frontend/prototypes` | Look up five properties on an object and watch the engine walk the prototype chain | — |
| `/tracks/frontend/box-model` | Change padding, border and margin on a live box and compare content-box with border-box | — |
| `/tracks/frontend/responsive-design` | Drag the viewport width and watch breakpoints, columns, navigation and image choice change | — |
| `/tracks/frontend/css-animations` | Animate a real box with five easings, moving transform, left or width | — |
| `/tracks/frontend/reconciliation` | Insert at the top of two real React lists, one keyed by index and one by id | — |
| `/tracks/frontend/hooks` | An interval counter three ways: stuck on a stale closure, fixed with an updater, and with dependencies | — |
| `/tracks/frontend/memoization` | Type into a search box and see when an expensive chart re-renders with and without memo | — |
| `/tracks/frontend/data-fetching` | Load a profile page with effect-driven fetches, parallel requests and server-side fetching | — |
| `/tracks/frontend/optimistic-updates` | Like a post with a slow server, waiting vs optimistic, and roll back when it fails | — |
| `/tracks/frontend/csr-ssr-ssg` | Compare CSR, SSR, SSG and ISR on speed and cost, and when readers see a fix | — |
| `/tracks/frontend/images-fonts` | Apply image format, sizing, lazy loading and font fixes and watch weight, LCP and text visibility | — |
| `/tracks/frontend/browser-caching` | Four resources with different Cache-Control headers across repeat visits and a deploy | — |
| `/tracks/frontend/long-tasks` | A 300 ms click handler blocking, yielding in chunks, and moved to a worker | — |
| `/tracks/frontend/browser-storage` | Pick something to store and see which of five browser storage options fits and why | — |
| `/tracks/frontend/cors` | Call another origin's API with and without CORS headers, preflights and credentials | — |
| `/tracks/frontend/csp` | Tighten a Content-Security-Policy and see which legitimate and injected scripts run | — |
| `/tracks/frontend/keyboard-focus` | Tab through a page and dialog, then fix the non-button, missing outline, focus trap and focus restore | — |
| `/tracks/frontend/re-renders` | A component tree: state, parent and context changes, with and without memo, and why each component rendered | — |
| `/tracks/databases/btree-index` | Find an id through a three-level B+ tree vs a 9-page full scan; page reads at up to a billion rows | — |
| `/tracks/networking/tcp-handshake` | TCP + TLS 1.2, TLS 1.3, QUIC and 0-RTT as message diagrams; time to first byte by distance | — |
| `/tracks/operating-systems/race-conditions` | Two threads, one counter: taking turns, interleaved (lost update) and with a mutex; 1,000-increment stress run | — |
| `/tracks/security/xss` | Four comments rendered four ways (raw HTML, escaped, sanitized, CSP); what runs in the visitor's browser | — |
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

Every session in `tracks.ts` gets a page. Sessions marked `soon` show a "coming soon" page: title and one-line blurb only, no visual.

**System Design is grouped into sections.** A long track can list `sections` in `tracks.ts`
(id, title, blurb, and `related` live sessions from other tracks), and each session names its
`section`. The track page then shows the sessions under numbered section headings with jump
links, and `/tracks` shows only the live ones plus a "+N topics coming" card. System Design has
18 sections and 144 topics (9 live): scalability, data, networking, reliability, distributed
systems, architecture, security, production, web applications, seven AI system design
sections (LLM apps, RAG, agents, memory, evaluation, serving, security), specialized systems,
and case studies (design a URL shortener, chat app, news feed, payment system, coding agent…).
DevOps uses the same layout: 13 sections and 77 topics (3 live), from Linux, networking and Git
through containers, CI/CD, Kubernetes, infrastructure as code, cloud, observability, SRE,
DevSecOps and platform engineering, to end-to-end case studies.
The four AI tracks are split by question so they don't repeat each other or System Design
(which owns AI architecture: gateways, serving, RAG pipelines, memory, AI security):
**AI Engineering** (53 topics) covers how models work and the core techniques; **AI Native**
(28) covers AI features, AI UX and shipping them; **AI Automation** (28) covers workflows with
AI steps and people in the loop; **Tools** (27) covers the actual tools: coding agents, MCP,
workflow builders, model SDKs, vector databases and LLMOps.
Five more tracks have topic maps but no live sessions yet: **Frontend and the browser** (60
topics), **Databases in depth** (40), **Networking** (37), **Operating systems and concurrency**
(35) and **Security and cryptography** (40). Each has its own accent token in `globals.css`
(`--web`, `--db`, `--net`, `--os`, `--sec`) for dark and light mode.
Topics already live in another track (structured output, MCP, CI/CD, evals and so on) are
linked from the matching section through `related` instead of being repeated.
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
| Training loss, KV cache, chunking | algorithm 4 cycle; process 5 cycle; process 4 state | One view |
| LLM-as-judge, query rewriting, LoRA | process 4 state; process 4 state; algorithm 4 state | One view |
| Tree recursion, dynamic programming | algorithm, 4, state | One view |
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
