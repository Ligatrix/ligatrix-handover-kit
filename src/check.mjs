// Validates a handover bundle and lists every problem that would stop it
// being handed to a client.

import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import {
  DECISION_FILE,
  DECISION_SECTIONS,
  DECISIONS_DIR,
  DEPENDENCIES_FILE,
  PLACEHOLDERS,
  REQUIRED_FILES,
  UNKNOWN_LICENCE,
  isLicenceHeader,
} from "./bundle.mjs";
import { readLines, sections, tables, tasks } from "./markdown.mjs";

const SKIP_DIRS = new Set([".git", "node_modules"]);

/** Relative paths of every Markdown file under `dir`, with `/` separators. */
export async function listMarkdown(dir) {
  const found = [];
  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) await walk(join(current, entry.name));
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        found.push(relative(dir, join(current, entry.name)).split(sep).join("/"));
      }
    }
  }
  await walk(dir);
  return found.sort();
}

/** Every unfilled placeholder in a document, with its line. */
export function findPlaceholders(lines) {
  const found = [];
  for (const line of lines) {
    for (const { pattern, name } of PLACEHOLDERS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(line.text)) !== null) {
        found.push({ line: line.number, name, text: match[0] });
      }
    }
  }
  return found.sort((a, b) => a.line - b.line);
}

/** Everything the checks and the report need to know about one document. */
export function analyse(text) {
  const lines = readLines(text);
  return {
    lines,
    sections: sections(lines),
    tasks: tasks(lines),
    tables: tables(lines),
    placeholders: findPlaceholders(lines),
  };
}

/** Licence problems in the dependency tables of an analysed document. */
export function licenceProblems(analysis) {
  const problems = [];
  const licenceTables = analysis.tables
    .map((table) => ({ table, column: table.headers.findIndex(isLicenceHeader) }))
    .filter(({ column }) => column >= 0);
  if (licenceTables.length === 0) {
    problems.push({ line: 0, code: "no-dependency-table", message: "no table with a Licence column" });
    return problems;
  }
  for (const { table, column } of licenceTables) {
    if (table.rows.length === 0) {
      problems.push({ line: table.line, code: "empty-table", message: "dependency table has no rows" });
    }
    for (const row of table.rows) {
      const cell = row.cells[column] ?? "";
      const placeholder = PLACEHOLDERS.some(({ pattern }) => new RegExp(pattern.source, "i").test(cell));
      if (placeholder) continue; // reported once, as a placeholder
      if (UNKNOWN_LICENCE.test(cell.trim())) {
        const label = row.cells[0] || "row";
        const shown = cell.trim() === "" ? "empty" : `"${cell.trim()}"`;
        problems.push({ line: row.line, code: "missing-licence", message: `no licence for ${label} (licence is ${shown})` });
      }
    }
  }
  return problems;
}

const shorten = (text, max = 60) => (text.length > max ? `${text.slice(0, max - 2)}…>` : text);

function documentProblems(analysis) {
  const problems = [];
  if (!analysis.sections.some((s) => s.level === 1)) {
    problems.push({ line: 1, code: "missing-title", message: "no top-level heading (# Title)" });
  }
  for (const section of analysis.sections) {
    if (section.empty) {
      problems.push({ line: section.line, code: "empty-section", message: `empty section "${"#".repeat(section.level)} ${section.title}"` });
    }
  }
  for (const found of analysis.placeholders) {
    problems.push({ line: found.line, code: "placeholder", message: `unfilled placeholder ${shorten(found.text)}` });
  }
  for (const task of analysis.tasks) {
    if (!task.done) problems.push({ line: task.line, code: "unticked", message: `unticked: ${task.text}` });
  }
  return problems;
}

function decisionProblems(analysis) {
  const titles = new Set(analysis.sections.filter((s) => s.level === 2).map((s) => s.title.toLowerCase()));
  return DECISION_SECTIONS.filter((name) => !titles.has(name.toLowerCase())).map((name) => ({
    line: 0,
    code: "decision-section",
    message: `decision record has no "## ${name}" section`,
  }));
}

async function isDirectory(path) {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check a bundle.
 * @param {string} dir
 * @returns {Promise<{ dir: string, ok: boolean, problems: { file: string, line: number, code: string, message: string }[], documents: Map<string, ReturnType<typeof analyse>> }>}
 */
export async function checkBundle(dir) {
  if (!(await isDirectory(dir))) {
    const problems = [{ file: ".", line: 0, code: "not-a-directory", message: `${dir} is not a directory` }];
    return { dir, ok: false, problems, documents: new Map() };
  }
  const present = await listMarkdown(dir);
  const documents = new Map();
  const problems = [];
  const add = (file, list) => list.forEach((p) => problems.push({ file, ...p }));

  for (const required of REQUIRED_FILES) {
    if (!present.includes(required.path)) {
      add(required.path, [{ line: 0, code: "missing-file", message: `required file is missing (${required.label})` }]);
    }
  }

  for (const file of present) {
    const text = await readFile(join(dir, file), "utf8");
    const analysis = analyse(text);
    documents.set(file, analysis);
    if (text.trim() === "") {
      add(file, [{ line: 0, code: "empty-file", message: "file is empty" }]);
      continue;
    }
    add(file, documentProblems(analysis));
    if (file === DEPENDENCIES_FILE) add(file, licenceProblems(analysis));
    if (file.startsWith(`${DECISIONS_DIR}/`)) {
      const name = file.slice(DECISIONS_DIR.length + 1);
      if (!DECISION_FILE.test(name)) {
        add(file, [{ line: 0, code: "decision-name", message: "decision record name must look like 0002-short-title.md" }]);
      }
      add(file, decisionProblems(analysis));
    }
  }

  const order = new Map(REQUIRED_FILES.map((r, i) => [r.path, i]));
  const rank = (file) => (order.has(file) ? order.get(file) : REQUIRED_FILES.length);
  problems.sort((a, b) => rank(a.file) - rank(b.file) || a.file.localeCompare(b.file) || a.line - b.line);
  return { dir, ok: problems.length === 0, problems, documents };
}
