import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { listDependencies, lockedVersion, normaliseLicence, toMarkdown } from "../src/deps.mjs";
import { FIXTURES } from "../test-support/helpers.mjs";

const fixture = (name) => join(FIXTURES, "deps", name, "package.json");
const byName = (rows) => Object.fromEntries(rows.map((r) => [r.name, r]));

test("versions come from a version 3 lockfile before the package.json range", async () => {
  const { rows } = await listDependencies(fixture("lockfile-app"));
  const found = byName(rows);
  assert.equal(found.fastify.version, "4.28.1");
  assert.equal(found.fastify.source, "lockfile");
  assert.equal(found.c8.version, "10.1.2");
});

test("versions are read from a version 1 lockfile too", async () => {
  const { rows } = await listDependencies(fixture("lockfile-v1"));
  assert.deepEqual(rows.map((r) => [r.name, r.version, r.source]), [["zod", "3.22.4", "lockfile"]]);
});

test("without a lockfile the installed version is used, then the declared range", async () => {
  const { rows } = await listDependencies(fixture("installed-only"));
  const found = byName(rows);
  assert.equal(found["csv-parse"].version, "5.5.6");
  assert.equal(found["csv-parse"].source, "installed");
  assert.equal(found["a|b"].version, "^1.0.0");
  assert.equal(found["a|b"].source, "package.json");
});

test("licences are read as a string, an object, or a list", async () => {
  const found = byName((await listDependencies(fixture("lockfile-app"))).rows);
  assert.equal(found.fastify.licence, "MIT");
  assert.equal(found.pg.licence, "MIT");
  assert.equal(found["legacy-lib"].licence, "(MIT OR Apache-2.0)");
});

test("a licence that cannot be read is marked check", async () => {
  const found = byName((await listDependencies(fixture("lockfile-app"))).rows);
  assert.equal(found["old-style"].licence, "check");
  assert.equal(found["unpublished-helper"].licence, "check");
  assert.equal(found["unpublished-helper"].version, "^0.3.0");
});

test("rows are runtime first, then development, each sorted by name", async () => {
  const { rows } = await listDependencies(fixture("lockfile-app"));
  assert.deepEqual(rows.map((r) => `${r.kind}:${r.name}`), [
    "runtime:fastify",
    "runtime:legacy-lib",
    "runtime:old-style",
    "runtime:pg",
    "runtime:unpublished-helper",
    "development:c8",
  ]);
});

test("production mode leaves out development dependencies", async () => {
  const { rows } = await listDependencies(fixture("lockfile-app"), { production: true });
  assert.ok(rows.every((r) => r.kind === "runtime"));
  assert.equal(rows.length, 5);
});

test("a folder is accepted in place of its package.json", async () => {
  const { manifest, rows } = await listDependencies(join(FIXTURES, "deps", "lockfile-v1"));
  assert.match(manifest, /lockfile-v1[\\/]package\.json$/);
  assert.equal(rows.length, 1);
});

test("a package.json with no dependencies gives no rows", async () => {
  assert.deepEqual((await listDependencies(fixture("no-deps"))).rows, []);
});

test("a missing package.json is a clear error", async () => {
  await assert.rejects(listDependencies(fixture("does-not-exist")), /cannot find .*package\.json/);
});

test("invalid JSON is a clear error", async () => {
  await assert.rejects(listDependencies(fixture("invalid")), /is not valid JSON/);
});

test("normaliseLicence ignores blanks and unknown shapes", () => {
  assert.equal(normaliseLicence(undefined), undefined);
  assert.equal(normaliseLicence({ license: "  " }), undefined);
  assert.equal(normaliseLicence({ license: 42 }), undefined);
  assert.equal(normaliseLicence({ licenses: [{ type: "ISC" }] }), "ISC");
});

test("lockedVersion finds nothing when there is no lockfile entry", () => {
  assert.equal(lockedVersion(undefined, "x"), undefined);
  assert.equal(lockedVersion({ packages: {} }, "x"), undefined);
});

test("the Markdown table escapes pipes and matches the dependencies file layout", () => {
  const text = toMarkdown([{ name: "a|b", kind: "runtime", version: "1.0.0", licence: "MIT" }]);
  assert.equal(text, "| Package | Kind | Version | Licence |\n| --- | --- | --- | --- |\n| a\\|b | runtime | 1.0.0 | MIT |\n");
});
