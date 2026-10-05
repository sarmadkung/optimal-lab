<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Optimal Lab rules

- Read README.md first: it covers the layout, the tracks and how to add a visual.
- Any visual that explains how something works step by step must use the **step flow**: top-to-bottom steps, one card each, with a labelled arrow between them. Follow "Explaining a process: the step flow" in README.md and use `src/components/flow/Flow.tsx`. Reference: `/tracks/ai/next-token`.
- Any visual where requests or data move between parts of a system (client → server, cache → database, model → app → tool, commit → pipeline) must also show a **system map** above the step flow: the real infrastructure as nodes and links, with each request animated along them. Use `src/components/system/SystemMap.tsx`, drive it from the same stage/frame as the step flow, and follow "Showing the system: the system map" and "Which visual to use" in README.md. Reference: `/tracks/system-design/load-balancing`.
- A simulation the reader should predict and break uses a **guided lesson** instead of showing every step at once: one live stage, one chapter at a time, then a playground. Follow "Guided lessons" in README.md and use `src/components/lesson/Lesson.tsx`. Reference: `/tracks/system-design/caching`.
- Every live session declares a **`shape`** in `src/lib/tracks.ts`; `chooseLayout` in `src/lib/sessionLayout.ts` picks one view, left to right, or top to bottom from it. Do not hand-pick a layout in the demo: build with `SessionLayout` + `FlowSequence` and let the rule decide. Follow "Choosing a session layout" in README.md.
- Every page and visual must stay usable on a phone (390px) and a tablet (768px), with no sideways scroll. Follow "Responsive layout" in README.md and check both widths before finishing UI work.
- Every **live** session should name real-world **technologies** (services, platforms, protocols, standards) — not language-specific packages. Add or update entries in `src/lib/realWorldTools.ts`; the session and track pages render them via `RealWorldTools`. Mention Redis for caching, not a JS client library.
- Every tool in `realWorldTools.ts` must include **`href`**: the official marketing site or the canonical **GitHub** repository (`https://github.com/org/repo`). Prefer GitHub for open-source software; prefer the vendor site for hosted services. Cards link out with a GitHub / Documentation / Official site label via `realWorldLinkLabel`.
