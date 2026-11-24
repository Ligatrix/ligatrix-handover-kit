// Reads a package.json, its lockfile and installed packages, and lists every
// dependency with its resolved version and declared licence.

import { readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";

const KINDS = [
  ["dependencies", "runtime"],
  ["optionalDependencies", "optional"],
  ["peerDependencies", "peer"],
  ["devDependencies", "development"],
];

async function readJson(path) {
  let text;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return undefined;
    throw error;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${path} is not valid JSON: ${error.message}`);
  }
}

/** Turn the many historical shapes of a licence field into one string. */
export function normaliseLicence(pkg) {
  if (!pkg) return undefined;
  const pick = (value) => (typeof value === "string" ? value : value && typeof value.type === "string" ? value.type : undefined);
  const single = pick(pkg.license);
  if (single && single.trim()) return single.trim();
  if (Array.isArray(pkg.licenses)) {
    const all = pkg.licenses.map(pick).filter(Boolean);
    if (all.length === 1) return all[0];
    if (all.length > 1) return `(${all.join(" OR ")})`;
  }
  return undefined;
}

/** The version a lockfile resolved for a top-level package, if any. */
export function lockedVersion(lock, name) {
  if (!lock) return undefined;
  const fromPackages = lock.packages?.[`node_modules/${name}`]?.version;
  if (fromPackages) return fromPackages;
  return lock.dependencies?.[name]?.version;
}

/**
 * List the dependencies declared in a package.json.
 * @param {string} path a package.json file or the folder that holds one
 * @param {{ production?: boolean }} [options]
 */
export async function listDependencies(path, { production = false } = {}) {
  let manifestPath = path;
  try {
    if ((await stat(path)).isDirectory()) manifestPath = join(path, "package.json");
  } catch {
    // fall through: the read below reports the missing file
  }
  const manifest = await readJson(manifestPath);
  if (manifest === undefined) throw new Error(`cannot find ${manifestPath}`);
  if (typeof manifest !== "object" || manifest === null || Array.isArray(manifest)) {
    throw new Error(`${manifestPath} does not hold a package.json object`);
  }
  const root = dirname(manifestPath);
  const lock = (await readJson(join(root, "package-lock.json"))) ?? (await readJson(join(root, "npm-shrinkwrap.json")));
  const rows = [];
  const seen = new Set();
  for (const [field, kind] of KINDS) {
    if (production && kind === "development") continue;
    const declared = manifest[field] ?? {};
    for (const name of Object.keys(declared).sort()) {
      if (seen.has(name)) continue;
      seen.add(name);
      const installed = await readJson(join(root, "node_modules", name, "package.json")).catch(() => undefined);
      const locked = lockedVersion(lock, name);
      rows.push({
        name,
        kind,
        version: locked ?? installed?.version ?? String(declared[name]),
        source: locked ? "lockfile" : installed?.version ? "installed" : "package.json",
        licence: normaliseLicence(installed) ?? "check",
      });
    }
  }
  return { manifest: manifestPath, name: manifest.name, rows };
}

const escapeCell = (value) => String(value).replace(/\|/g, "\\|");

/** Render rows as the Markdown table docs/dependencies.md expects. */
export function toMarkdown(rows) {
  const lines = ["| Package | Kind | Version | Licence |", "| --- | --- | --- | --- |"];
  for (const row of rows) {
    lines.push(`| ${[row.name, row.kind, row.version, row.licence].map(escapeCell).join(" | ")} |`);
  }
  return `${lines.join("\n")}\n`;
}
