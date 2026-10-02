# Optimal Lab

**See how engineering works.** Interactive visuals for DSA, system design, DevOps and
AI concepts, with DSA practice alongside them.

Domain: [optimallab.dev](https://optimallab.dev)

---

## What it is

| Section | Priority | What it holds |
|---|---|---|
| **Explore** | Main | One interactive visual per concept. You drag, step and break things to see how they work |
| **Practice** | Second | A DSA editor with problems grouped by pattern, based on [Optimal Round](#optimal-round) |

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
| `/` | Home: start button, live sessions, how a session works, all tracks | — |
| `/tracks` | Every track with all its sessions | — |
| `/tracks/<track>` | One track: sessions, roadmap, projects. Tracks: `dsa`, `nodejs`, `system-design`, `devops`, `ai`, `ai-native`, `ai-automation`, `tools` | — |
| `/tracks/dsa/two-sum` | Two Sum, three ways: brute force, sort + two pointers, hash map, and how each scales | social-content DSA #01 |
| `/tracks/dsa/sliding-window` | Fixed window: drop the cell that left, add the cell that entered | — |
| `/tracks/dsa/binary-search` | Halve a sorted list until the target is found or the range is empty | — |
| `/tracks/nodejs/event-loop` | One turn of the event loop: sync, nextTick, promises, timers, poll, check | — |
| `/tracks/nodejs/streams-backpressure` | Producer, buffer, high water mark, consumer | — |
| `/tracks/system-design/load-balancing` | Round robin vs least connections when one server is faster | — |
| `/tracks/system-design/caching` | A guided cache: hits, misses, eviction, three predictions, then a playground | — |
| `/tracks/devops/ci-cd-pipeline` | Lint, test, build, deploy — stop at the first failure | — |
| `/tracks/devops/containers-vs-vms` | Start a container, or boot a virtual machine | — |
| `/tracks/ai/next-token` | How an LLM picks the next token: logits, softmax, temperature, top-k, top-p, sampling | social-content AI Engineering #02 |
| `/tracks/ai/embeddings` | Cosine similarity: move a query and see which notes return | — |
| `/tracks/ai/rag` | Chunk, retrieve, paste into the prompt, answer only from that | — |
| `/tracks/ai-native/structured-output` | A schema refuses tokens that would break the JSON | — |
| `/tracks/ai-native/tool-calling` | Call a tool for live data, or watch the model guess | — |
| `/tracks/ai-automation/workflow` | One email through classify → branch → action | — |
| `/tracks/ai-automation/human-approval` | Draft a reply, then wait for approve or reject | — |
| `/tracks/tools/cursor-agent` | Search, edit, check, repeat | — |
| `/tracks/tools/mcp` | A tool server lists tools; the app forwards the call | — |
| `/tracks/tools/n8n` | Webhook → IF → Slack or email | — |

Every session in `tracks.ts` gets a page. Sessions marked `soon` show a "coming soon" page.
The old URLs `/dsa-01` and `/next-token` redirect to the new ones (`next.config.ts`), so
links in published posts keep working.

## Light and dark mode

Dark is the default. The reader switches with the sun/moon button in the top bar; the
choice is saved in `localStorage`, and without one the site follows the OS setting.
`src/lib/theme.ts` holds the inline script that sets `data-theme` on `<html>` before the
first paint, so there is no flash. In components, use the colour tokens from
`globals.css` (`var(--text)`, `var(--panel)`, `var(--c1)` …), never raw hex, so both
themes work.

## First-visit onboarding

The first time someone opens the site on a device, a short tour explains tracks,
sessions, and the theme button. There is no account or database, so "already seen"
is saved in `localStorage` under the key `onboarding`. Skip and finish both count as
done, so the tour does not come back on the next visit. **Take the tour** in the
footer opens it again. The component is `src/components/Onboarding.tsx`.

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
5. Do this check for shared chrome too: header, menu, footer, onboarding, and 404.

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

## Layout

| Path | What lives there |
|---|---|
| `src/sessions/<track>/<session>/*Demo.tsx` | The interactive component for one session (`"use client"`) |
| `src/sessions/registry.tsx` | Maps `<track>/<session>` to its demo component |
| `src/lib/` | Pure logic behind each visual (sampling math, algorithm traces). No React, so it is easy to check |
| `src/lib/tracks.ts` | The learning tracks (DSA, Node.js, System Design, DevOps, AI, AI Native, AI Automation, Tools): sessions, planned roadmap stages and projects |
| `src/lib/theme.ts` | Light/dark mode: the storage key and the no-flash inline script |
| `src/lib/onboarding.ts` | First-visit tour: the storage key and whether the tour is open |
| `src/components/Onboarding.tsx` | The tour itself |
| `src/app/page.tsx` | Home page, built from `TRACKS` |
| `src/app/tracks/page.tsx` | All tracks with their sessions |
| `src/app/tracks/[track]/` | One page per track: sessions, roadmap and projects |
| `src/app/tracks/[track]/[session]/` | One page per session: breadcrumbs, the demo, then previous/next in the track |
| `src/components/` | Shared UI: `SiteHeader`, `SiteFooter`, `ThemeToggle`, `Breadcrumbs`, `TrackCard`, `SessionCard`, the step flow (`flow/Flow.tsx`), the system map (`system/SystemMap.tsx`) and the guided lesson (`lesson/Lesson.tsx`) |
| `src/components/session/ui.tsx` | Session controls: `useWalk` + `RunButton` for one walk through the steps, `usePlayback` + `PlaybackControls` for stepping through simulator frames, `Slider`, `Choices`, `Meter` |
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

Upcoming sessions that must use the system map when built: consistent hashing (the ring
and which keys move), rolling deploys (replicas, probes, rollback), GitHub Actions (push,
workflow, jobs), the thread pool (main thread vs workers), and scheduled automations
(clock, runner, missed run).

## Guided lessons

Use a guided lesson when the reader should watch one system change, commit to a guess, then break it. The stage stays on screen. Only the current chapter is written out. Back / Next moves the chapter, and the URL hash keeps the place (`#predict-b`).

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
7. **Check 390px and 768px.** The stage, the choices and Back / Next have to fit with no sideways scroll.

Reference implementation: `/tracks/system-design/caching`.

## Adding a visual

1. Put the logic in `src/lib/<concept>.ts` and check its numbers by hand.
2. Build the demo in `src/sessions/<track>/<session>/`. If it explains a process, use the step flow (see above).
   If things move between parts of a system, add a system map above it, driven by the same stage
   (see "Showing the system" and "Which visual to use"). If the reader should predict and break a running system, use a guided lesson instead.
   Use colour tokens, not hex, so it works in light and dark mode.
3. Register it in `src/sessions/registry.tsx`, set the session's `status: "live"` in
   `src/lib/tracks.ts`, and add it to the Pages table above. The route
   `/tracks/<track>/<session>` and the previous/next links come for free.
4. Check it at phone width (390px) and tablet width (768px), in both themes: no sideways scroll. See "Responsive layout" above.
5. Link it from the matching post in social-content.
