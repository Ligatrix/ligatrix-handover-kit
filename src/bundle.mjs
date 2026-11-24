// The shape of a handover bundle: which files it holds and what each is for.

/** Files every bundle must contain, in the order a new owner reads them. */
export const REQUIRED_FILES = Object.freeze([
  { path: "HANDOVER.md", label: "Overview" },
  { path: "docs/architecture.md", label: "Architecture" },
  { path: "docs/runbook.md", label: "Runbook" },
  { path: "docs/access-transfer.md", label: "Access transfer" },
  { path: "docs/dependencies.md", label: "Dependencies" },
  { path: "docs/decisions/0001-record-architecture-decisions.md", label: "Decision records" },
  { path: "checklists/handover-checklist.md", label: "Handover checklist" },
]);

export const DECISIONS_DIR = "docs/decisions";
export const DEPENDENCIES_FILE = "docs/dependencies.md";

/** Headings a decision record must carry. */
export const DECISION_SECTIONS = Object.freeze(["Status", "Context", "Decision", "Consequences"]);

/** Decision record file names: four digits, a dash, a slug. */
export const DECISION_FILE = /^\d{4}-[a-z0-9][a-z0-9-]*\.md$/;

/** Text that marks a value nobody has filled in yet. */
export const PLACEHOLDERS = Object.freeze([
  { pattern: /<fill in\b[^>]*>/gi, name: "<fill in>" },
  { pattern: /\bTODO\b/g, name: "TODO" },
  { pattern: /\bTBD\b/g, name: "TBD" },
  { pattern: /\bFIXME\b/g, name: "FIXME" },
]);

/** Licence cells that do not name a licence. */
export const UNKNOWN_LICENCE = /^(?:|-+|—|\?+|check|unknown|n\/a|none|unlicensed)$/i;

/** True when a table header names a licence column. */
export const isLicenceHeader = (header) => /licen[cs]e/i.test(header);
