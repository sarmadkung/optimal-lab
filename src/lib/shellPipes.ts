// A cron job that reports which clients got the most 500 errors, run through a small
// shell: grep or awk, cut, sort, uniq -c, sort -rn and head behave like GNU coreutils,
// and bash's word splitting, exit status, set -e and pipefail rules decide what cron sees.

export type LogId = "today" | "rotated" | "space" | "quiet";
export type Field = 1 | 4;
export type Design = { field: Field; awk: boolean; sortFirst: boolean; pipefail: boolean; quote: boolean };

export const FIRST: Design = { field: 1, awk: false, sortFirst: true, pipefail: false, quote: false };
export const FIXED: Design = { field: 1, awk: true, sortFirst: true, pipefail: true, quote: true };

// ip time method path status seconds
const TODAY = [
  "203.0.113.7 2026-10-24T14:01:05 POST /checkout 500 0.81",
  "198.51.100.4 2026-10-24T14:01:09 GET /products 200 0.12",
  "192.0.2.15 2026-10-24T14:01:30 GET /orders/1500 200 0.30",
  "203.0.113.7 2026-10-24T14:02:11 POST /checkout 500 1.92",
  "192.0.2.44 2026-10-24T14:02:40 GET /search 500 0.95",
  "198.51.100.4 2026-10-24T14:03:02 GET /cart 200 0.08",
  "192.0.2.15 2026-10-24T14:03:15 GET /orders/5001 200 0.27",
  "203.0.113.7 2026-10-24T14:04:20 POST /checkout 500 2.10",
  "198.51.100.9 2026-10-24T14:05:01 POST /login 500 0.88",
  "192.0.2.15 2026-10-24T14:05:44 GET /orders/1500 304 0.02",
  "192.0.2.44 2026-10-24T14:06:12 GET /search 500 1.01",
  "198.51.100.4 2026-10-24T14:06:30 GET /products 200 0.11",
  "203.0.113.7 2026-10-24T14:07:55 POST /checkout 500 1.75",
  "198.51.100.23 2026-10-24T14:08:10 GET /reports 200 1.500",
  "198.51.100.4 2026-10-24T15:00:02 GET /cart 200 0.09",
  "192.0.2.44 2026-10-24T15:01:40 GET /products 200 0.14",
];
const QUIET = [
  "198.51.100.4 2026-10-24T06:00:12 GET /products 200 0.10",
  "192.0.2.44 2026-10-24T06:02:31 GET /cart 200 0.07",
  "198.51.100.4 2026-10-24T06:04:50 GET /products 304 0.01",
  "203.0.113.7 2026-10-24T06:05:13 GET /search 200 0.22",
];

export const LOGS: { id: LogId; label: string; path: string; one: string }[] = [
  { id: "today", label: "Today's log", path: "/var/log/nginx/access.log", one: `${TODAY.length} requests, 7 of them 500s.` },
  { id: "rotated", label: "Rotated overnight", path: "/var/log/nginx/access.log", one: "logrotate renamed the file to access.log.1 and nginx hasn't reopened it yet: the path doesn't exist." },
  { id: "space", label: "Path with a space", path: "/srv/my shop/access.log", one: "The same log, kept under a folder named “my shop”." },
  { id: "quiet", label: "A quiet morning", path: "/var/log/nginx/access.log", one: `${QUIET.length} requests and no errors at all.` },
];

const existing: Record<string, string[]> = {
  "/var/log/nginx/access.log": TODAY,
  "/srv/my shop/access.log": TODAY,
};
function filesFor(log: LogId): Record<string, string[]> {
  if (log === "rotated") return {};
  if (log === "quiet") return { "/var/log/nginx/access.log": QUIET };
  return existing;
}

// bash word splitting: an unquoted $LOG is split on spaces into separate arguments.
export function expand(path: string, quoted: boolean) {
  return quoted ? [path] : path.split(/[ \t\n]+/).filter(Boolean);
}

export type Stage = { cmd: string; out: string[]; status: number; stderr: string[] };

function readFiles(files: Record<string, string[]>, args: string[], missing: (path: string) => string) {
  const out: string[] = [];
  const stderr: string[] = [];
  for (const a of args) {
    if (files[a]) out.push(...files[a]);
    else stderr.push(missing(a));
  }
  return { out, stderr };
}

// grep exits 0 if a line matched, 1 if none, 2 on an error (even if others matched).
function grep(pattern: string, files: Record<string, string[]>, args: string[]): Stage {
  const r = readFiles(files, args, (a) => `grep: ${a}: No such file or directory`);
  const out = r.out.filter((l) => l.includes(pattern));
  return { cmd: `grep '${pattern}'`, out, status: r.stderr.length ? 2 : out.length ? 0 : 1, stderr: r.stderr };
}

// awk exits 0 whether or not anything matched, 2 if an input file is missing.
function awkStatus(files: Record<string, string[]>, args: string[]): Stage {
  const r = readFiles(files, args, (a) => `awk: cannot open ${a} (No such file or directory)`);
  const out = r.out.filter((l) => l.split(" ")[4] === "500");
  return { cmd: "awk '$5 == 500'", out, status: r.stderr.length ? 2 : 0, stderr: r.stderr };
}

export const cut = (lines: string[], f: number) => lines.map((l) => l.split(" ")[f - 1] ?? "");
export const sortLines = (lines: string[]) => [...lines].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

// uniq -c only merges *adjacent* equal lines; GNU pads the count to 7 columns.
export function uniqC(lines: string[]) {
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    let j = i;
    while (j < lines.length && lines[j] === lines[i]) j++;
    out.push(`${String(j - i).padStart(7)} ${lines[i]}`);
    i = j;
  }
  return out;
}

// sort -rn: by the leading number, largest first; ties fall back to a reversed byte compare.
export function sortRn(lines: string[]) {
  const num = (l: string) => parseFloat(l.trim()) || 0;
  return [...lines].sort((a, b) => num(b) - num(a) || (a < b ? 1 : a > b ? -1 : 0));
}

export function script(log: LogId, d: Design) {
  const path = LOGS.find((l) => l.id === log)!.path;
  const v = d.quote ? '"$LOG"' : "$LOG";
  const filter = d.awk ? `awk '$5 == 500' ${v}` : `grep '500' ${v}`;
  return [
    "#!/usr/bin/env bash",
    ...(d.pipefail ? ["set -euo pipefail"] : []),
    `LOG=${path.includes(" ") ? `"${path}"` : path}`,
    `${filter} | cut -d' ' -f${d.field} | ${d.sortFirst ? "sort | " : ""}uniq -c | sort -rn | head -3`,
    "mail -s 'Top 500s' ops@example.com",
  ];
}

export function run(log: LogId, d: Design) {
  const path = LOGS.find((l) => l.id === log)!.path;
  const files = filesFor(log);
  const args = expand(path, d.quote);
  const first = d.awk ? awkStatus(files, args) : grep("500", files, args);
  const cutS: Stage = { cmd: `cut -d' ' -f${d.field}`, out: cut(first.out, d.field), status: 0, stderr: [] };
  const sorted = d.sortFirst ? sortLines(cutS.out) : cutS.out;
  const countS: Stage = { cmd: d.sortFirst ? "sort | uniq -c" : "uniq -c", out: uniqC(sorted), status: 0, stderr: [] };
  const rankS: Stage = { cmd: "sort -rn | head -3", out: sortRn(countS.out).slice(0, 3), status: 0, stderr: [] };
  const stages = [first, cutS, countS, rankS];

  // $? of a pipeline: the last command's status, or with pipefail the rightmost non-zero one.
  const exit = d.pipefail ? [...stages].reverse().find((s) => s.status !== 0)?.status ?? 0 : rankS.status;
  const aborted = d.pipefail && exit !== 0; // set -e stops before mail
  const truth = truthFor(log, d.field);
  const right = rankS.out.join("\n") === truth.join("\n");
  const fileProblem = first.stderr.length > 0;

  let verdict: { good: boolean; text: string };
  if (aborted && fileProblem) verdict = { good: true, text: `the script stops with exit ${exit}; cron emails the error, so someone fixes the path today` };
  else if (aborted) verdict = { good: false, text: `grep found nothing and exited 1, so pipefail and set -e abort a healthy run: a false alarm every quiet morning` };
  else if (fileProblem) verdict = { good: false, text: `the pipeline exits 0 because head succeeded; an empty report goes out and cron logs success. Nobody notices for days` };
  else if (!right) verdict = { good: false, text: d.awk ? "the counts are wrong" : `the report is wrong: ${d.sortFirst ? "grep '500' also matches /orders/1500, /orders/5001 and 1.500 s" : "uniq -c only merges neighbouring lines, so counts are split"}` };
  else if (!rankS.out.length) verdict = { good: true, text: "an empty report on a day with no 500s, and exit 0: correct" };
  else verdict = { good: true, text: "the report is right and the script exits 0" };
  return { args, stages, exit, aborted, mailed: !aborted, right, verdict, script: script(log, d) };
}

// What the report should say: the correct pipeline on the real file.
export function truthFor(log: LogId, field: Field) {
  const lines = log === "quiet" ? QUIET : TODAY;
  return sortRn(uniqC(sortLines(cut(lines.filter((l) => l.split(" ")[4] === "500"), field)))).slice(0, 3);
}

export function scorecard(d: Design) {
  return LOGS.map((l) => ({ log: l, ...run(l.id, d).verdict }));
}
