import { test } from "node:test";
import assert from "node:assert/strict";
import { headings, readLines, sections, splitRow, stripComments, tables, tasks } from "../src/markdown.mjs";

const doc = (...lines) => readLines(lines.join("\n"));

test("headings inside fenced code are ignored", () => {
  const lines = doc("# Title", "```sh", "# not a heading", "```", "## Real");
  assert.deepEqual(headings(lines).map((h) => h.title), ["Title", "Real"]);
});

test("tilde fences are not closed by backtick fences", () => {
  const lines = doc("~~~", "```", "# hidden", "~~~", "# shown");
  assert.deepEqual(headings(lines).map((h) => h.title), ["shown"]);
});

test("stripComments blanks comments but keeps every line number", () => {
  const text = "a\n<!-- one\ntwo -->\nb";
  const stripped = stripComments(text);
  assert.equal(stripped.split("\n").length, 4);
  assert.equal(stripped.split("\n")[3], "b");
  assert.doesNotMatch(stripped, /one|two/);
});

test("a heading followed directly by another heading is an empty section", () => {
  const found = sections(doc("# T", "", "## Empty", "", "## Full", "text"));
  assert.deepEqual(found.map((s) => [s.title, s.empty]), [["T", false], ["Empty", true], ["Full", false]]);
});

test("a section whose sub-sections hold content is not empty", () => {
  const found = sections(doc("## Services", "### API", "Serves pages.", "### Worker", ""));
  const byTitle = Object.fromEntries(found.map((s) => [s.title, s.empty]));
  assert.deepEqual(byTitle, { Services: false, API: false, Worker: true });
});

test("a section holding only an HTML comment is empty", () => {
  const found = sections(doc("## Notes", "<!-- write something here -->", ""));
  assert.equal(found[0].empty, true);
});

test("task items are read ticked and unticked, in bullet and numbered lists", () => {
  const found = tasks(doc("- [x] done", "* [ ] open", "1. [X] numbered", "```", "- [ ] in code", "```"));
  assert.deepEqual(found.map((t) => [t.done, t.text, t.line]), [
    [true, "done", 1],
    [false, "open", 2],
    [true, "numbered", 3],
  ]);
});

test("table cells honour escaped pipes", () => {
  assert.deepEqual(splitRow("| a\\|b | c |"), ["a|b", "c"]);
  assert.deepEqual(splitRow("x | y"), ["x", "y"]);
});

test("tables need a separator row and keep their row line numbers", () => {
  const found = tables(doc("| not | a table |", "", "| A | B |", "| --- | :---: |", "| 1 | 2 |", "| 3 | 4 |", "", "after"));
  assert.equal(found.length, 1);
  assert.deepEqual(found[0].headers, ["A", "B"]);
  assert.deepEqual(found[0].rows.map((r) => r.line), [5, 6]);
});

test("Windows line endings are read the same as Unix ones", () => {
  const found = sections(readLines("# T\r\n\r\n## A\r\nbody\r\n"));
  assert.deepEqual(found.map((s) => [s.title, s.line, s.empty]), [["T", 1, false], ["A", 3, false]]);
});
