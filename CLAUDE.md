@AGENTS.md
@README.md

## Rules for agents

- Any visual that explains how something works step by step must use the step flow: top-to-bottom steps with an arrow between each. Follow "Explaining a process: the step flow" in README.md and use `src/components/flow/Flow.tsx`.
- Any visual where requests or data move between parts of a real system (load balancer, cache, database, model, tool server, pipeline) must add a system map above the step flow, with the request animated hop by hop. Follow "Showing the system: the system map" in README.md and use `src/components/system/SystemMap.tsx`.
- A simulation the reader should predict and break uses a guided lesson: one live stage, one chapter at a time, then a playground. Follow "Guided lessons" in README.md and use `src/components/lesson/Lesson.tsx`.

## Related repositories

This site works with two sibling repos in `~/Documents/startups/`:

- `../social-content`: the post pipeline. Each visual here comes from a post there (`generated/drafts/<pillar>/`); follow its brand tokens and writing rules.
- `../optimal-round`: hand-solved DSA problems and the `./practice` runner. Source for the Practice section. Its solutions are written by hand with no AI: never generate or fill in solutions from it.
