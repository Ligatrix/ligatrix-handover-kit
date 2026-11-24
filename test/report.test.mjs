import { test } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { readiness, scoreDocument } from "../src/report.mjs";
import { analyse } from "../src/check.mjs";
import { EXAMPLE, cli, edit, exampleCopy, tempDir } from "../test-support/helpers.mjs";

test("the complete example is 100% in every part and ready", async () => {
  const summary = await readiness(EXAMPLE);
  assert.equal(summary.ready, true);
  assert.equal(summary.overall, 100);
  assert.ok(summary.parts.every((p) => p.percent === 100));
});

test("a fresh skeleton is partly complete and not ready", async () => {
  const dir = join(await tempDir(), "fresh");
  await cli(["init", dir, "--name", "Fresh"]);
  const summary = await readiness(dir);
  const parts = Object.fromEntries(summary.parts.map((p) => [p.label, p.percent]));
  assert.equal(summary.ready, false);
  assert.equal(parts["Decision records"], 100);
  assert.equal(parts.Architecture, 0);
  assert.ok(summary.overall > 0 && summary.overall < 50);
});

test("a missing file counts as 0% and is marked missing", async () => {
  const dir = await exampleCopy();
  await rm(join(dir, "docs/runbook.md"));
  const runbook = (await readiness(dir)).parts.find((p) => p.label === "Runbook");
  assert.deepEqual([runbook.percent, runbook.missing], [0, true]);
});

test("one unticked item lowers only its own part", async () => {
  const dir = await exampleCopy();
  await edit(dir, "checklists/handover-checklist.md", (t) => t.replace("- [x] Handover meeting", "- [ ] Handover meeting"));
  const summary = await readiness(dir);
  const parts = Object.fromEntries(summary.parts.map((p) => [p.label, p.percent]));
  assert.equal(parts["Handover checklist"], 95);
  assert.equal(parts.Runbook, 100);
  assert.equal(summary.ready, false);
});

test("a section with a placeholder is not counted as filled", () => {
  const score = scoreDocument(analyse("# T\n\n## A\n\ntext\n\n## B\n\n<fill in: b>\n"));
  assert.deepEqual(score, { done: 1, total: 2 });
});
