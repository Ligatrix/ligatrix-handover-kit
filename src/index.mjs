// Programmatic entry point, for teams that want the checks inside their own
// scripts or CI rather than through the CLI.

export { REQUIRED_FILES, DECISION_SECTIONS } from "./bundle.mjs";
export { checkBundle, analyse } from "./check.mjs";
export { listDependencies, toMarkdown, normaliseLicence } from "./deps.mjs";
export { readiness } from "./report.mjs";
export { skeleton } from "./templates.mjs";
export { run, EXIT } from "./cli.mjs";
