import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { parseArgs } from "../src/cli.mjs";
import { REQUIRED_FILES } from "../src/bundle.mjs";
import { ROOT, cli, edit, exampleCopy, tempDir } from "../test-support/helpers.mjs";

const ANSI = /\u001b\[/;
const exec = promisify(execFile);

test("no command prints the help and exits 2", async () => {
  const { code, stdout } = await cli([]);
  assert.equal(code, 2);
  assert.match(stdout, /Usage:\n {2}handover <command>/);
});

test("--help exits 0 and --version prints the package version", async () => {
  assert.equal((await cli(["--help"])).code, 0);
  const version = await cli(["--version"]);
  assert.deepEqual([version.code, version.stdout], [0, "1.0.0\n"]);
});

test("help for each command, by 'help <command>' and by --help", async () => {
  for (const command of ["init", "check", "deps", "report"]) {
    const a = await cli(["help", command]);
    const b = await cli([command, "--help"]);
    assert.equal(a.code, 0);
    assert.equal(a.stdout, b.stdout);
    assert.match(a.stdout, new RegExp(`^Usage: handover ${command}`));
  }
  assert.equal((await cli(["help", "nope"])).code, 2);
});

test("an unknown command exits 2 and points to help", async () => {
  const { code, stderr } = await cli(["publish"]);
  assert.equal(code, 2);
  assert.match(stderr, /unknown command "publish"/);
  assert.match(stderr, /handover help/);
});

test("an unknown option or a stray argument exits 2", async () => {
  assert.equal((await cli(["check", "examples/corvane-portal", "--fast"])).code, 2);
  assert.equal((await cli(["check", "a", "b"])).code, 2);
  assert.match((await cli(["init", "x", "--name"])).stderr, /--name needs a value/);
});

test("parseArgs reads --key value, --key=value and booleans", () => {
  const spec = { name: "string", force: "boolean" };
  assert.deepEqual(parseArgs(["d", "--name", "A B", "--force"], spec), { positionals: ["d"], options: { name: "A B", force: true } });
  assert.deepEqual(parseArgs(["--name=X", "--", "--odd"], spec), { positionals: ["--odd"], options: { name: "X" } });
  assert.throws(() => parseArgs(["--force=yes"], spec), /takes no value/);
  assert.throws(() => parseArgs(["-x"], spec), /unknown option -x/);
});

test("init needs a folder and a non-empty name", async () => {
  assert.match((await cli(["init", "--name", "X"])).stderr, /init needs a folder/);
  assert.match((await cli(["init", "somewhere"])).stderr, /--name/);
  assert.equal((await cli(["init", "somewhere", "--name", "   "])).code, 2);
});

test("init writes every required file with the system's name", async () => {
  const dir = join(await tempDir(), "new-bundle");
  const { code, stdout } = await cli(["init", dir, "--name", "Corvane returns desk"]);
  assert.equal(code, 0);
  for (const { path } of REQUIRED_FILES) {
    const text = await readFile(join(dir, path), "utf8");
    assert.ok(text.length > 0, path);
    assert.match(stdout, new RegExp(path.replace(/\./g, "\\.")));
  }
  assert.match(await readFile(join(dir, "HANDOVER.md"), "utf8"), /^# Corvane returns desk: handover/);
  assert.match(await readFile(join(dir, "docs/decisions/0001-record-architecture-decisions.md"), "utf8"), /Date: 2026-11-24/);
});

test("init refuses to overwrite, and writes nothing, unless --force", async () => {
  const dir = join(await tempDir(), "existing");
  await cli(["init", dir, "--name", "First"]);
  await writeFile(join(dir, "docs/runbook.md"), "# Kept\n");
  const refused = await cli(["init", dir, "--name", "Second"]);
  assert.equal(refused.code, 1);
  assert.match(refused.stderr, /already has .*docs\/runbook\.md/);
  assert.match(await readFile(join(dir, "HANDOVER.md"), "utf8"), /^# First/);
  const forced = await cli(["init", dir, "--name", "Second", "--force"]);
  assert.equal(forced.code, 0);
  assert.match(await readFile(join(dir, "docs/runbook.md"), "utf8"), /^# Runbook: Second/);
});

test("check passes the example and exits 0", async () => {
  const { code, stdout } = await cli(["check", "examples/corvane-portal"]);
  assert.equal(code, 0);
  assert.match(stdout, /examples\/corvane-portal is ready for handover: 9 documents checked, no problems\./);
});

test("check lists each problem under its file with its line, and exits 1", async () => {
  const dir = await exampleCopy();
  await edit(dir, "docs/dependencies.md", (t) => t.replace("| pg | runtime | 8.12.0 | MIT |", "| pg | runtime | 8.12.0 | check |"));
  await edit(dir, "checklists/handover-checklist.md", (t) => t.replace("- [x] Handover meeting", "- [ ] Handover meeting"));
  const { code, stdout } = await cli(["check", dir]);
  assert.equal(code, 1);
  assert.match(stdout, /is not ready for handover: 2 problems/);
  assert.match(stdout, /docs\/dependencies\.md\n\s+\d+ {2}no licence for pg \(licence is "check"\)/);
  assert.match(stdout, /checklists\/handover-checklist\.md\n\s+\d+ {2}unticked: Handover meeting held/);
});

test("check --json gives a machine-readable result", async () => {
  const dir = await exampleCopy();
  await edit(dir, "HANDOVER.md", (t) => t.replace("| Handover date | 2026-11-24 |", "| Handover date | TBD |"));
  const { code, stdout } = await cli(["check", dir, "--json"]);
  const result = JSON.parse(stdout);
  assert.equal(code, 1);
  assert.equal(result.ok, false);
  assert.deepEqual(result.problems.map((p) => [p.file, p.code]), [["HANDOVER.md", "placeholder"]]);
});

test("check on a missing folder exits 1 with a clear message", async () => {
  const { code, stdout } = await cli(["check", "no/such/folder"]);
  assert.equal(code, 1);
  assert.match(stdout, /no\/such\/folder is not a directory/);
});

test("deps prints a Markdown table and flags licences to confirm on stderr", async () => {
  const { code, stdout, stderr } = await cli(["deps", "test/fixtures/deps/lockfile-app/package.json"]);
  assert.equal(code, 0);
  assert.match(stdout, /^\| Package \| Kind \| Version \| Licence \|\n\| --- /);
  assert.match(stdout, /\| fastify \| runtime \| 4\.28\.1 \| MIT \|/);
  assert.match(stderr, /3 licences to confirm by hand/);
});

test("deps on this repository reports that it has no dependencies", async () => {
  const { code, stdout } = await cli(["deps", "package.json"]);
  assert.deepEqual([code, stdout], [0, "@ligatrix/handover-kit declares no dependencies.\n"]);
});

test("deps on a missing file exits 1", async () => {
  const { code, stderr } = await cli(["deps", "nowhere/package.json"]);
  assert.equal(code, 1);
  assert.match(stderr, /cannot find nowhere\/package\.json/);
});

test("report prints every part with its percentage", async () => {
  const { code, stdout } = await cli(["report", "examples/corvane-portal"]);
  assert.equal(code, 0);
  assert.match(stdout, /^Handover readiness: examples\/corvane-portal/);
  for (const label of ["Overview", "Architecture", "Runbook", "Access transfer", "Dependencies", "Decision records", "Handover checklist"]) {
    assert.match(stdout, new RegExp(`${label} +█+ +100%`));
  }
  assert.match(stdout, /Ready for handover\./);
});

test("report --json and report on a missing folder", async () => {
  const json = JSON.parse((await cli(["report", "examples/corvane-portal", "--json"])).stdout);
  assert.equal(json.overall, 100);
  assert.equal((await cli(["report", "missing-folder"])).code, 1);
});

test("colour only on a terminal; NO_COLOR wins; FORCE_COLOR works in a pipe", async () => {
  const args = ["check", "examples/corvane-portal"];
  assert.doesNotMatch((await cli(args)).stdout, ANSI);
  assert.match((await cli(args, { isTTY: true })).stdout, ANSI);
  assert.doesNotMatch((await cli(args, { isTTY: true, env: { NO_COLOR: "1" } })).stdout, ANSI);
  assert.match((await cli(args, { env: { FORCE_COLOR: "1" } })).stdout, ANSI);
});

test("the installed binary runs end to end with the right exit codes", async () => {
  const bin = join(ROOT, "bin", "handover.mjs");
  const ok = await exec(process.execPath, [bin, "check", "examples/corvane-portal"], { cwd: ROOT });
  assert.match(ok.stdout, /ready for handover/);
  const dir = join(await tempDir(), "e2e");
  await exec(process.execPath, [bin, "init", dir, "--name", "End to end"], { cwd: ROOT });
  await assert.rejects(exec(process.execPath, [bin, "check", dir], { cwd: ROOT }), (error) => error.code === 1);
  await assert.rejects(exec(process.execPath, [bin, "frobnicate"], { cwd: ROOT }), (error) => error.code === 2);
});
