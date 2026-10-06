#!/usr/bin/env node
// Copies problem statements from ../optimal-round into src/data/practice.json.
//
//   node scripts/sync-practice.mjs [path/to/optimal-round]
//
// Only the header comment of each problem file is read: the problem, constraints,
// examples, edge cases, and (behind a spoiler on the site) the target complexity.
// Reading stops at the first "*/", so the solution body below it — written by hand,
// with no AI — is never opened, copied or shown. Run it again after adding problems.

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(process.argv[2] ?? join(here, "../../optimal-round"));
const problemsDir = join(root, "problems");
const out = join(here, "../src/data/practice.json");

/** Read a file only up to the end of its first block comment. */
function header(path) {
  const text = readFileSync(path, "utf8");
  const start = text.indexOf("/**");
  const end = text.indexOf("*/", start);
  if (start !== 0 || end < 0) return null;
  const lines = text
    .slice(start + 3, end)
    .split("\n")
    .map((line) => line.replace(/^\s*\* ?/, ""));
  while (lines.length && !lines[0].trim()) lines.shift();
  return lines;
}

const SECTIONS = ["PROBLEM", "CONSTRAINTS", "EXAMPLES", "EDGE CASES", "COMPLEXITY"];

function parse(lines) {
  // line 0: "007 — Valid Palindrome"; line 1: "Difficulty: Easy · Topic: Two Pointers"
  const [num, ...titleParts] = lines[0].trim().split(" — ");
  const meta = lines[1];
  const difficulty = /Difficulty:\s*(\w+)/.exec(meta)?.[1];
  const topic = /Topic:\s*(.+)$/.exec(meta)?.[1]?.trim();
  const sections = {};
  let current = null;
  for (const raw of lines.slice(2)) {
    const line = raw.replace(/\s+$/, "");
    const heading = line.trim();
    if (SECTIONS.includes(heading)) {
      current = heading;
      sections[current] = [];
      continue;
    }
    if (/^-{5,}/.test(heading) || /SPOILERS BELOW/.test(heading)) {
      current = heading.includes("SPOILERS") ? null : current;
      continue;
    }
    if (current) sections[current].push(line.replace(/^ {2}/, ""));
  }
  const block = (name) => (sections[name] ?? []).join("\n").replace(/^\n+|\n+$/g, "");
  const list = (name) =>
    block(name)
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

  const complexity = list("COMPLEXITY");
  const target = complexity.findIndex((l) => l.startsWith("Target:"));
  return {
    number: num.trim(),
    title: titleParts.join(" — ").trim(),
    difficulty,
    topic,
    problem: block("PROBLEM").replace(/\n(?!\n)/g, " ").replace(/\s+/g, " ").trim(),
    constraints: list("CONSTRAINTS"),
    examples: list("EXAMPLES"),
    edgeCases: list("EDGE CASES").map((l) => l.replace(/^-\s*/, "")),
    complexity: {
      naive: complexity.find((l) => l.startsWith("Naive:"))?.replace("Naive:", "").trim() ?? null,
      target:
        target < 0
          ? null
          : [complexity[target].replace("Target:", "").trim(), ...complexity.slice(target + 1).filter((l) => !/^(Naive|Target):/.test(l))].join(" "),
    },
  };
}

const topics = readdirSync(problemsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^\d\d-/.test(d.name))
  .map((d) => d.name)
  .sort();

const data = topics.map((folder) => {
  const files = readdirSync(join(problemsDir, folder)).filter((f) => /^\d+-.+\.js$/.test(f)).sort();
  const problems = files
    .map((file) => {
      const lines = header(join(problemsDir, folder, file));
      if (!lines) return null;
      return { ...parse(lines), slug: file.replace(/^\d+-/, "").replace(/\.js$/, ""), file: `problems/${folder}/${file}` };
    })
    .filter(Boolean);
  return { folder, problems };
});

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ source: "https://github.com/sarmadkung/optimal-round", topics: data }, null, 2) + "\n");
const count = data.reduce((s, t) => s + t.problems.length, 0);
console.log(`Wrote ${count} problems in ${data.length} topics to ${out}`);
