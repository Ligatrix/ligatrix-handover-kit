import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { checkBundle } from "../src/check.mjs";
import { REQUIRED_FILES } from "../src/bundle.mjs";
import { skeleton } from "../src/templates.mjs";
import { EXAMPLE, edit, exampleCopy, tempDir } from "../test-support/helpers.mjs";

const codes = (result) => result.problems.map((p) => p.code);

test("the Corvane example bundle passes every check", async () => {
  const result = await checkBundle(EXAMPLE);
  assert.deepEqual(result.problems, []);
  assert.equal(result.ok, true);
  assert.ok(result.documents.size >= REQUIRED_FILES.length);
});

test("a fresh skeleton fails on placeholders and unticked items, not on structure", async () => {
  const dir = await tempDir();
  for (const [file, text] of Object.entries(skeleton({ name: "Fresh", date: "2026-11-24" }))) {
    await mkdir(join(dir, file, ".."), { recursive: true });
    await writeFile(join(dir, file), text);
  }
  const result = await checkBundle(dir);
  assert.equal(result.ok, false);
  const kinds = new Set(codes(result));
  assert.deepEqual([...kinds].sort(), ["placeholder", "unticked"]);
});

// One fixture bundle per way a bundle can fail: each starts from the complete
// example and breaks exactly one thing.
const FAILURES = [
  {
    name: "a required file is missing",
    breaks: (dir) => rm(join(dir, "docs/runbook.md")),
    expect: { file: "docs/runbook.md", code: "missing-file", line: 0 },
  },
  {
    name: "a required file is empty",
    breaks: (dir) => writeFile(join(dir, "docs/architecture.md"), "\n\n"),
    expect: { file: "docs/architecture.md", code: "empty-file" },
  },
  {
    name: "a section has no content",
    breaks: (dir) => edit(dir, "docs/runbook.md", (t) => t.replace(/## Escalation[\s\S]*$/, "## Escalation\n\n<!-- later -->\n")),
    expect: { file: "docs/runbook.md", code: "empty-section", message: 'empty section "## Escalation"' },
  },
  {
    name: "a TODO is left in the text",
    breaks: (dir) => edit(dir, "docs/architecture.md", (t) => t.replace("## Known limitations\n", "## Known limitations\n\nTODO: sizing\n")),
    expect: { file: "docs/architecture.md", code: "placeholder", message: "unfilled placeholder TODO" },
  },
  {
    name: "a TBD is left in a table cell",
    breaks: (dir) => edit(dir, "HANDOVER.md", (t) => t.replace("| Handover date | 2026-11-24 |", "| Handover date | TBD |")),
    expect: { file: "HANDOVER.md", code: "placeholder", message: "unfilled placeholder TBD" },
  },
  {
    name: "a FIXME is left inside a code block",
    breaks: (dir) => edit(dir, "docs/runbook.md", (t) => t.replace("npm ci\n", "npm ci   # FIXME pin npm\n")),
    expect: { file: "docs/runbook.md", code: "placeholder", message: "unfilled placeholder FIXME" },
  },
  {
    name: "a <fill in> marker is left",
    breaks: (dir) => edit(dir, "HANDOVER.md", (t) => t.replace("https://portal.corvane.example |", "<fill in: URL> |")),
    expect: { file: "HANDOVER.md", code: "placeholder", message: "unfilled placeholder <fill in: URL>" },
  },
  {
    name: "a handover checklist item is not ticked",
    breaks: (dir) => edit(dir, "checklists/handover-checklist.md", (t) => t.replace("- [x] Every dependency", "- [ ] Every dependency")),
    expect: { file: "checklists/handover-checklist.md", code: "unticked", message: "unticked: Every dependency has a confirmed licence" },
  },
  {
    name: "an access transfer item is not ticked",
    breaks: (dir) => edit(dir, "docs/access-transfer.md", (t) => t.replace("- [x] Sending side's users", "- [ ] Sending side's users")),
    expect: { file: "docs/access-transfer.md", code: "unticked" },
  },
  {
    name: "a dependency's licence says check",
    breaks: (dir) => edit(dir, "docs/dependencies.md", (t) => t.replace("| pg | runtime | 8.12.0 | MIT |", "| pg | runtime | 8.12.0 | check |")),
    expect: { file: "docs/dependencies.md", code: "missing-licence", message: 'no licence for pg (licence is "check")' },
  },
  {
    name: "a dependency's licence cell is empty",
    breaks: (dir) => edit(dir, "docs/dependencies.md", (t) => t.replace("| zod | runtime | 3.23.8 | MIT |", "| zod | runtime | 3.23.8 |  |")),
    expect: { file: "docs/dependencies.md", code: "missing-licence", message: "no licence for zod (licence is empty)" },
  },
  {
    name: "a dependency row is cut short",
    breaks: (dir) => edit(dir, "docs/dependencies.md", (t) => t.replace("| argon2 | runtime | 0.40.3 | MIT |", "| argon2 | runtime |")),
    expect: { file: "docs/dependencies.md", code: "missing-licence" },
  },
  {
    name: "the dependencies file has no licence column",
    breaks: (dir) => edit(dir, "docs/dependencies.md", (t) => t.replaceAll("Licence", "Notes")),
    expect: { file: "docs/dependencies.md", code: "no-dependency-table" },
  },
  {
    name: "the dependency table has no rows",
    breaks: (dir) => edit(dir, "docs/dependencies.md", (t) => t.replace(/\| @fastify[\s\S]*?\| eslint .*\n/, "")),
    expect: { file: "docs/dependencies.md", code: "empty-table" },
  },
  {
    name: "a decision record has no Consequences",
    breaks: (dir) => edit(dir, "docs/decisions/0002-postgresql-as-the-job-queue.md", (t) => t.replace(/## Consequences[\s\S]*$/, "")),
    expect: { file: "docs/decisions/0002-postgresql-as-the-job-queue.md", code: "decision-section", message: 'decision record has no "## Consequences" section' },
  },
  {
    name: "a decision record is badly named",
    breaks: (dir) => writeFile(join(dir, "docs/decisions/use-redis.md"), "# Use Redis\n\n## Status\n\nRejected\n\n## Context\n\nc\n\n## Decision\n\nd\n\n## Consequences\n\ne\n"),
    expect: { file: "docs/decisions/use-redis.md", code: "decision-name" },
  },
  {
    name: "a document has no title",
    breaks: (dir) => edit(dir, "docs/architecture.md", (t) => t.replace(/^# .*\n/, "")),
    expect: { file: "docs/architecture.md", code: "missing-title", line: 1 },
  },
  {
    name: "an extra document holds a placeholder",
    breaks: (dir) => writeFile(join(dir, "docs/extra-notes.md"), "# Extra notes\n\n<fill in>\n"),
    expect: { file: "docs/extra-notes.md", code: "placeholder", line: 3 },
  },
];

for (const failure of FAILURES) {
  test(`check fails when ${failure.name}`, async () => {
    const dir = await exampleCopy();
    await failure.breaks(dir);
    const result = await checkBundle(dir);
    assert.equal(result.ok, false);
    const match = result.problems.find((p) => p.file === failure.expect.file && p.code === failure.expect.code);
    assert.ok(match, `expected ${failure.expect.code} in ${failure.expect.file}, got ${JSON.stringify(result.problems)}`);
    if (failure.expect.message) assert.equal(match.message, failure.expect.message);
    if (failure.expect.line !== undefined) assert.equal(match.line, failure.expect.line);
  });
}

test("each failure is reported with the line it is on", async () => {
  const dir = await exampleCopy();
  let expected;
  await edit(dir, "docs/runbook.md", (t) => {
    expected = t.split("\n").indexOf("## Deploy") + 3; // heading, blank line, TODO
    return t.replace("## Deploy\n", "## Deploy\n\nTODO\n");
  });
  const { problems } = await checkBundle(dir);
  assert.equal(problems.length, 1);
  assert.equal(problems[0].line, expected);
});

test("a placeholder in a licence cell is reported once, as a placeholder", async () => {
  const dir = await exampleCopy();
  await edit(dir, "docs/dependencies.md", (t) => t.replace("| pino | runtime | 9.3.2 | MIT |", "| pino | runtime | 9.3.2 | <fill in: licence> |"));
  const { problems } = await checkBundle(dir);
  assert.deepEqual(problems.map((p) => p.code), ["placeholder"]);
});

test("lower-case words such as 'todo list' are not placeholders", async () => {
  const dir = await exampleCopy();
  await edit(dir, "docs/architecture.md", (t) => t.replace("## Known limitations\n", "## Known limitations\n\nThe todo list screen is read-only.\n"));
  assert.equal((await checkBundle(dir)).ok, true);
});

test("problems are listed in reading order: required files first, by line", async () => {
  const dir = await exampleCopy();
  await edit(dir, "checklists/handover-checklist.md", (t) => t.replace("- [x] Handover meeting", "- [ ] Handover meeting"));
  await edit(dir, "HANDOVER.md", (t) => t.replace("## Support after handover\n", "## Support after handover\n\nTBD\n"));
  await writeFile(join(dir, "docs/aaa.md"), "# A\n\nTODO\n");
  const { problems } = await checkBundle(dir);
  assert.deepEqual(problems.map((p) => p.file), ["HANDOVER.md", "checklists/handover-checklist.md", "docs/aaa.md"]);
});

test("Markdown inside node_modules and .git is not checked", async () => {
  const dir = await exampleCopy();
  await mkdir(join(dir, "node_modules/some-lib"), { recursive: true });
  await writeFile(join(dir, "node_modules/some-lib/README.md"), "TODO\n");
  assert.equal((await checkBundle(dir)).ok, true);
});

test("a path that is not a folder fails with one clear problem", async () => {
  const result = await checkBundle(join(EXAMPLE, "HANDOVER.md"));
  assert.equal(result.ok, false);
  assert.deepEqual(codes(result), ["not-a-directory"]);
});

test("an empty folder reports every required file as missing", async () => {
  const result = await checkBundle(await tempDir());
  assert.deepEqual(result.problems.map((p) => p.file), REQUIRED_FILES.map((r) => r.path));
  assert.ok(result.problems.every((p) => p.code === "missing-file"));
});
