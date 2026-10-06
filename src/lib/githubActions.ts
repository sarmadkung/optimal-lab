// One GitHub Actions workflow file, run for different events.
// `on:` decides whether the workflow runs at all. Jobs without `needs:` start together on
// separate fresh runners. A matrix fans one job out into copies. `needs:` makes a job wait
// for others and skips it if any of them failed. `if:` can skip a job for this event.

export const WORKFLOW = `name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  lint:
    runs-on: ubuntu-latest
    steps: [checkout, setup-node, npm ci, npm run lint]

  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [18, 20, 22]
    steps: [checkout, setup-node, npm ci, npm test]

  deploy:
    needs: [lint, test]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps: [checkout, deploy]`;

export type EventId = "pr" | "main" | "branch";

export const EVENTS: { id: EventId; label: string; detail: string; lines: number[] }[] = [
  { id: "pr", label: "Open a pull request", detail: "pull_request on feature/login", lines: [5] },
  { id: "main", label: "Merge to main", detail: "push to main", lines: [3, 4] },
  { id: "branch", label: "Push a feature branch", detail: "push to feature/login", lines: [3, 4] },
];

export type JobStatus = "success" | "failure" | "skipped";
export type Job = { id: string; name: string; start: number; end: number; status: JobStatus; why: string; runner: boolean };

export const SECONDS = { checkout: 3, setup: 5, installCold: 38, installCached: 7, lint: 12, test: 45, deploy: 25 };

export function run(event: EventId, failNode18: boolean, cache: boolean) {
  const triggered = event !== "branch";
  if (!triggered) return { triggered, jobs: [] as Job[], total: 0, checks: "none" as const };

  const install = cache ? SECONDS.installCached : SECONDS.installCold;
  const base = SECONDS.checkout + SECONDS.setup + install;
  const jobs: Job[] = [
    { id: "lint", name: "lint", start: 0, end: base + SECONDS.lint, status: "success", why: "No needs: starts at once.", runner: true },
    ...[18, 20, 22].map((n) => {
      const fails = failNode18 && n === 18;
      return {
        id: `test-${n}`,
        name: `test (node ${n})`,
        start: 0,
        end: base + SECONDS.test - (fails ? 20 : 0),
        status: (fails ? "failure" : "success") as JobStatus,
        why: fails ? "A test fails only on Node 18." : "Matrix copy, own runner.",
        runner: true,
      };
    }),
  ];
  const upstreamEnd = Math.max(...jobs.map((j) => j.end));
  const upstreamOk = jobs.every((j) => j.status === "success");
  const onMain = event === "main";
  jobs.push(
    !upstreamOk
      ? { id: "deploy", name: "deploy", start: upstreamEnd, end: upstreamEnd, status: "skipped", why: "needs: a job it waits on failed.", runner: false }
      : !onMain
        ? { id: "deploy", name: "deploy", start: upstreamEnd, end: upstreamEnd, status: "skipped", why: "if: this run is not on main.", runner: false }
        : { id: "deploy", name: "deploy", start: upstreamEnd, end: upstreamEnd + SECONDS.checkout + SECONDS.deploy, status: "success", why: "needs: lint and every test passed.", runner: true },
  );
  const total = Math.max(...jobs.map((j) => j.end));
  const checks = jobs.some((j) => j.status === "failure") ? ("failing" as const) : ("passing" as const);
  return { triggered, jobs, total, checks };
}

/** Billable runner minutes: GitHub rounds each job up to the whole minute. */
export const runnerMinutes = (jobs: Job[]) => jobs.filter((j) => j.runner).reduce((s, j) => s + Math.ceil((j.end - j.start) / 60), 0);
