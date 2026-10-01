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
| `/tracks/<track>` | One track: sessions, roadmap, projects. Tracks: `dsa`, `nodejs`, `system-design`, `devops`, `ai` | — |
| `/tracks/dsa/two-sum` | Two Sum, three ways: brute force, sort + two pointers, hash map, and how each scales | social-content DSA #01 |
| `/tracks/ai/next-token` | How an LLM picks the next token: logits, softmax, temperature, top-k, top-p, sampling | social-content AI Engineering #02 |

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
| `src/lib/tracks.ts` | The learning tracks (DSA, Node.js, System Design, DevOps, AI): sessions, planned roadmap stages and projects |
| `src/lib/theme.ts` | Light/dark mode: the storage key and the no-flash inline script |
| `src/lib/onboarding.ts` | First-visit tour: the storage key and the "open the tour" event |
| `src/components/Onboarding.tsx` | The tour itself |
| `src/app/page.tsx` | Home page, built from `TRACKS` |
| `src/app/tracks/page.tsx` | All tracks with their sessions |
| `src/app/tracks/[track]/` | One page per track: sessions, roadmap and projects |
| `src/app/tracks/[track]/[session]/` | One page per session: breadcrumbs, the demo, then previous/next in the track |
| `src/components/` | Shared UI: `SiteHeader`, `SiteFooter`, `ThemeToggle`, `Breadcrumbs`, `TrackCard`, `SessionCard`, and the step flow (`flow/Flow.tsx`) |
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

Comparisons of approaches (like `/tracks/dsa/two-sum`, three ways to solve Two Sum) can keep their own
layout. The step flow is for "how does X work, step by step".

## Adding a visual

1. Put the logic in `src/lib/<concept>.ts` and check its numbers by hand.
2. Build the demo in `src/sessions/<track>/<session>/`. If it explains a process, use the step flow (see above).
   Use colour tokens, not hex, so it works in light and dark mode.
3. Register it in `src/sessions/registry.tsx`, set the session's `status: "live"` in
   `src/lib/tracks.ts`, and add it to the Pages table above. The route
   `/tracks/<track>/<session>` and the previous/next links come for free.
4. Check it at phone width (390px) and tablet width (768px), in both themes: no sideways scroll. See "Responsive layout" above.
5. Link it from the matching post in social-content.
