// Shared test helpers (kept outside test/ so the runner does not load them as
// a test file): throwaway copies of the example bundle, and an in-process
// runner for the CLI that captures its output.

import { after } from "node:test";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "../src/cli.mjs";

export const ROOT = fileURLToPath(new URL("..", import.meta.url));
export const EXAMPLE = join(ROOT, "examples", "corvane-portal");
export const FIXTURES = join(ROOT, "test", "fixtures");

const made = [];
after(async () => {
  await Promise.all(made.map((dir) => rm(dir, { recursive: true, force: true })));
});

/** A fresh, empty temporary folder, removed when the test file ends. */
export async function tempDir() {
  const dir = await mkdtemp(join(tmpdir(), "handover-test-"));
  made.push(dir);
  return dir;
}

/** A copy of the complete example bundle that tests can break on purpose. */
export async function exampleCopy() {
  const dir = join(await tempDir(), "bundle");
  await cp(EXAMPLE, dir, { recursive: true });
  return dir;
}

/** Rewrite one file of a bundle with `change(text)`. */
export async function edit(dir, file, change) {
  const path = join(dir, file);
  await writeFile(path, change(await readFile(path, "utf8")));
}

/** Run the CLI in-process and capture what it prints. */
export async function cli(args, { cwd = ROOT, env = {}, isTTY = false } = {}) {
  let stdout = "";
  let stderr = "";
  const code = await run(args, {
    cwd,
    env,
    now: () => new Date("2026-11-24T12:00:00Z"),
    stdout: { isTTY, write: (s) => { stdout += s; } },
    stderr: { write: (s) => { stderr += s; } },
  });
  return { code, stdout, stderr };
}
