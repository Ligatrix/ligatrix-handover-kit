// Readiness per part of the bundle: how much of each document is filled in.

import { DECISIONS_DIR, DECISION_SECTIONS, DEPENDENCIES_FILE, REQUIRED_FILES, UNKNOWN_LICENCE, isLicenceHeader } from "./bundle.mjs";
import { checkBundle } from "./check.mjs";

/** Count the filled and total units of one analysed document. */
export function scoreDocument(analysis, { file = "", decision = false } = {}) {
  let done = 0;
  let total = 0;
  const placeholderLines = new Set(analysis.placeholders.map((p) => p.line));
  const inner = analysis.sections.filter((s) => s.level >= 2);
  const units = inner.length > 0 ? inner : analysis.sections;
  for (const section of units) {
    total++;
    const filled = !section.empty && !section.ownLines.some((l) => placeholderLines.has(l.number));
    if (filled) done++;
  }
  if (units.length === 0) total++;
  for (const task of analysis.tasks) {
    total++;
    if (task.done) done++;
  }
  if (file === DEPENDENCIES_FILE) {
    for (const table of analysis.tables) {
      const column = table.headers.findIndex(isLicenceHeader);
      if (column < 0) continue;
      for (const row of table.rows) {
        total++;
        const cell = (row.cells[column] ?? "").trim();
        if (!UNKNOWN_LICENCE.test(cell) && !placeholderLines.has(row.line)) done++;
      }
    }
  }
  if (decision) {
    const titles = new Set(inner.filter((s) => s.level === 2).map((s) => s.title.toLowerCase()));
    for (const name of DECISION_SECTIONS) {
      total++;
      if (titles.has(name.toLowerCase())) done++;
    }
  }
  return { done, total };
}

/**
 * Readiness of every part of a bundle.
 * @returns {Promise<{ dir: string, ready: boolean, problems: number, parts: { label: string, files: string[], done: number, total: number, percent: number, missing: boolean }[], overall: number }>}
 */
export async function readiness(dir) {
  const result = await checkBundle(dir);
  const parts = [];
  for (const required of REQUIRED_FILES) {
    const isDecisions = required.path.startsWith(`${DECISIONS_DIR}/`);
    const files = isDecisions
      ? [...result.documents.keys()].filter((f) => f.startsWith(`${DECISIONS_DIR}/`))
      : result.documents.has(required.path) ? [required.path] : [];
    const missing = !result.documents.has(required.path);
    let done = 0;
    let total = missing ? 1 : 0;
    for (const file of files) {
      const score = scoreDocument(result.documents.get(file), { file, decision: isDecisions });
      done += score.done;
      total += score.total;
    }
    const percent = total === 0 ? 0 : Math.floor((done / total) * 100);
    parts.push({ label: required.label, files, done, total, percent, missing });
  }
  const done = parts.reduce((sum, p) => sum + p.done, 0);
  const total = parts.reduce((sum, p) => sum + p.total, 0);
  return {
    dir,
    ready: result.ok,
    problems: result.problems.length,
    parts,
    overall: total === 0 ? 0 : Math.floor((done / total) * 100),
  };
}
