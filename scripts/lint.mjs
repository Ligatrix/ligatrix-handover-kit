// Checks tracked text files for trailing whitespace, tab indentation and a
// missing final newline. Uses `git ls-files` when available, otherwise walks
// the tree.

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const CHECKED = new Set([".mjs", ".js", ".cjs", ".ts", ".json", ".md", ".yml", ".yaml"]);
const SKIP = new Set([".git", "node_modules"]);

function trackedFiles() {
  try {
    const out = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    const files = out.split("\0").filter(Boolean);
    if (files.length > 0) return files;
  } catch {
    // not a git checkout: fall back to walking the tree
  }
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP.has(entry.name) && dir === root) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else files.push(relative(root, path));
    }
  };
  walk(root);
  return files;
}

const problems = [];
const files = trackedFiles().filter((file) => CHECKED.has(extname(file)) || file === ".editorconfig" || file === ".gitignore");
for (const file of files) {
  let text;
  try {
    text = readFileSync(join(root, file), "utf8");
  } catch {
    continue; // deleted in the working tree
  }
  if (text.length > 0 && !text.endsWith("\n")) problems.push(`${file}: missing final newline`);
  text.split("\n").forEach((line, index) => {
    if (/[ \t]+$/.test(line)) problems.push(`${file}:${index + 1}: trailing whitespace`);
    if (line.includes("\t")) problems.push(`${file}:${index + 1}: tab character`);
  });
}

if (problems.length > 0) {
  process.stderr.write(`${problems.join("\n")}\n${problems.length} lint problem(s)\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`lint: ${files.length} files clean\n`);
}
