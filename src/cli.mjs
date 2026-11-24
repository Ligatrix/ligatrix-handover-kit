// Command-line front end. `run` takes its streams and environment as
// arguments so the whole CLI can be exercised in-process by the tests.

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { checkBundle } from "./check.mjs";
import { listDependencies, toMarkdown } from "./deps.mjs";
import { bar, painter, plural, useColour } from "./format.mjs";
import { readiness } from "./report.mjs";
import { skeleton } from "./templates.mjs";

export const EXIT = Object.freeze({ OK: 0, FAILED: 1, USAGE: 2 });

const VERSION = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")).version;

const HELP = {
  main: `handover: build and verify the package a client receives at handover

Usage:
  handover <command> [options]

Commands:
  init <dir> --name "<System name>"   write a new handover bundle skeleton
  check <dir>                          verify a bundle is complete; exit 1 if not
  deps <package.json>                  print a dependency table with licences
  report <dir>                         print a readiness summary per section
  help [command]                       show help for a command

Options:
  -h, --help       show help
  -v, --version    print the version

Exit codes: 0 success, 1 the bundle or input has problems, 2 wrong usage.`,
  init: `Usage: handover init <dir> --name "<System name>" [--force]

Writes the handover skeleton into <dir>, creating it if needed:
  HANDOVER.md, docs/architecture.md, docs/runbook.md, docs/access-transfer.md,
  docs/dependencies.md, docs/decisions/0001-record-architecture-decisions.md,
  checklists/handover-checklist.md

Options:
  --name <name>   the system's name, used in every title (required)
  --force         overwrite files that already exist`,
  check: `Usage: handover check <dir> [--json]

Verifies a handover bundle:
  - every required file is present and not empty
  - no section is empty
  - no placeholder is left (TODO, TBD, FIXME, <fill in ...>)
  - every checklist item is ticked
  - every row of the dependency table names a licence
  - every decision record has Status, Context, Decision and Consequences

Exits 0 when the bundle is ready, 1 with the list of problems otherwise.

Options:
  --json   print the result as JSON`,
  deps: `Usage: handover deps <package.json | folder> [--production]

Prints a Markdown table of every declared dependency. The version comes from
package-lock.json when present, otherwise the installed package, otherwise the
range in package.json. The licence comes from the installed package in
node_modules; when it cannot be read the cell says "check", which
"handover check" refuses until someone confirms it.

Options:
  --production   leave out devDependencies`,
  report: `Usage: handover report <dir> [--json]

Prints a one-page readiness summary: the share of each part of the bundle that
is filled in, and whether the bundle passes "handover check".

Options:
  --json   print the summary as JSON`,
};

const FLAGS = {
  init: { name: "string", force: "boolean" },
  check: { json: "boolean" },
  deps: { production: "boolean" },
  report: { json: "boolean" },
};

class UsageError extends Error {}

/** Parse `argv` for one command against its known flags. */
export function parseArgs(args, spec) {
  const positionals = [];
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--") {
      positionals.push(...args.slice(i + 1));
      break;
    }
    if (arg === "-h" || arg === "--help") {
      options.help = true;
      continue;
    }
    if (!arg.startsWith("--") || arg === "-") {
      if (arg.startsWith("-") && arg !== "-") throw new UsageError(`unknown option ${arg}`);
      positionals.push(arg);
      continue;
    }
    const eq = arg.indexOf("=");
    const key = arg.slice(2, eq < 0 ? undefined : eq);
    const type = spec[key];
    if (!type) throw new UsageError(`unknown option --${key}`);
    if (type === "boolean") {
      if (eq >= 0) throw new UsageError(`--${key} takes no value`);
      options[key] = true;
    } else {
      const value = eq >= 0 ? arg.slice(eq + 1) : args[++i];
      if (value === undefined || (eq < 0 && value.startsWith("--"))) throw new UsageError(`--${key} needs a value`);
      options[key] = value;
    }
  }
  return { positionals, options };
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function init(ctx, [dir], { name, force }) {
  if (!dir) throw new UsageError("init needs a folder: handover init <dir> --name \"<System name>\"");
  if (name === undefined) throw new UsageError("init needs --name \"<System name>\"");
  const trimmed = name.trim();
  if (!trimmed || /[\r\n]/.test(name)) throw new UsageError("--name must be a single non-empty line");
  const target = resolve(ctx.cwd, dir);
  const files = skeleton({ name: trimmed, date: ctx.now().toISOString().slice(0, 10) });
  if (!force) {
    const clashes = [];
    for (const file of Object.keys(files)) if (await exists(join(target, file))) clashes.push(file);
    if (clashes.length > 0) {
      ctx.err(`${ctx.paint.red("error:")} ${dir} already has ${clashes.join(", ")}`);
      ctx.err("Nothing was written. Use --force to overwrite.");
      return EXIT.FAILED;
    }
  }
  for (const [file, content] of Object.entries(files)) {
    await mkdir(dirname(join(target, file)), { recursive: true });
    await writeFile(join(target, file), content);
  }
  ctx.out(`${ctx.paint.green("Created")} the handover bundle for ${trimmed} in ${dir}`);
  for (const file of Object.keys(files)) ctx.out(`  ${file}`);
  ctx.out("");
  ctx.out(`Next: replace every <fill in: ...> marker, then run: handover check ${dir}`);
  return EXIT.OK;
}

async function check(ctx, [dir], { json }) {
  if (!dir) throw new UsageError("check needs a folder: handover check <dir>");
  const result = await checkBundle(resolve(ctx.cwd, dir));
  if (json) {
    ctx.out(JSON.stringify({ dir, ok: result.ok, problems: result.problems }, null, 2));
    return result.ok ? EXIT.OK : EXIT.FAILED;
  }
  const { paint } = ctx;
  if (result.ok) {
    ctx.out(`${paint.green("✓")} ${dir} is ready for handover: ${plural(result.documents.size, "document")} checked, no problems.`);
    return EXIT.OK;
  }
  ctx.out(`${paint.red("✗")} ${dir} is not ready for handover: ${plural(result.problems.length, "problem")}`);
  let current;
  for (const problem of result.problems) {
    if (problem.file !== current) {
      current = problem.file;
      ctx.out("");
      ctx.out(`  ${paint.bold(current)}`);
    }
    const where = problem.line > 0 ? String(problem.line).padStart(5) : "    -";
    ctx.out(`  ${paint.dim(where)}  ${problem.message}`);
  }
  return EXIT.FAILED;
}

async function deps(ctx, [path], { production }) {
  if (!path) throw new UsageError("deps needs a path: handover deps <package.json>");
  let result;
  try {
    result = await listDependencies(resolve(ctx.cwd, path), { production });
  } catch (error) {
    ctx.err(`${ctx.paint.red("error:")} ${error.message.replaceAll(resolve(ctx.cwd) + sep, "")}`);
    return EXIT.FAILED;
  }
  if (result.rows.length === 0) {
    ctx.out(`${result.name ?? path} declares no dependencies.`);
    return EXIT.OK;
  }
  ctx.out(toMarkdown(result.rows).trimEnd());
  const unknown = result.rows.filter((r) => r.licence === "check").length;
  if (unknown > 0) {
    ctx.err(ctx.paint.yellow(`${plural(unknown, "licence")} to confirm by hand (marked "check").`));
  }
  return EXIT.OK;
}

async function report(ctx, [dir], { json }) {
  if (!dir) throw new UsageError("report needs a folder: handover report <dir>");
  const target = resolve(ctx.cwd, dir);
  try {
    if (!(await stat(target)).isDirectory()) throw new Error();
  } catch {
    ctx.err(`${ctx.paint.red("error:")} ${dir} is not a directory`);
    return EXIT.FAILED;
  }
  const summary = await readiness(target);
  summary.dir = dir;
  if (json) {
    ctx.out(JSON.stringify(summary, null, 2));
    return EXIT.OK;
  }
  const { paint } = ctx;
  const width = Math.max(...summary.parts.map((p) => p.label.length), "Overall".length);
  const tone = (percent) => (percent === 100 ? paint.green : percent >= 50 ? paint.yellow : paint.red);
  ctx.out(paint.bold(`Handover readiness: ${dir}`));
  ctx.out("");
  for (const part of summary.parts) {
    const detail = part.missing ? "missing" : `${part.done} of ${part.total}`;
    const percent = `${String(part.percent).padStart(3)}%`;
    ctx.out(`  ${part.label.padEnd(width)}  ${tone(part.percent)(bar(part.percent))}  ${percent}  ${paint.dim(detail)}`);
  }
  ctx.out(`  ${"".padEnd(width)}  ${"".padEnd(20, "─")}`);
  ctx.out(`  ${paint.bold("Overall".padEnd(width))}  ${tone(summary.overall)(bar(summary.overall))}  ${String(summary.overall).padStart(3)}%`);
  ctx.out("");
  if (summary.ready) {
    ctx.out(paint.green("Ready for handover."));
  } else {
    ctx.out(`Not ready: ${plural(summary.problems, "problem")}. Run "handover check ${dir}" for the list.`);
  }
  return EXIT.OK;
}

const COMMANDS = { init, check, deps, report };

/**
 * Run the CLI.
 * @param {string[]} argv arguments after the program name
 * @param {{ stdout?: { write(s: string): void, isTTY?: boolean }, stderr?: { write(s: string): void }, cwd?: string, env?: Record<string, string | undefined>, now?: () => Date }} [io]
 * @returns {Promise<number>} the exit code
 */
export async function run(argv, io = {}) {
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;
  const env = io.env ?? process.env;
  const ctx = {
    cwd: io.cwd ?? process.cwd(),
    now: io.now ?? (() => new Date()),
    paint: painter(useColour({ isTTY: stdout.isTTY, env })),
    out: (line) => stdout.write(`${line}\n`),
    err: (line) => stderr.write(`${line}\n`),
  };
  const [command, ...rest] = argv;
  if (command === undefined || command === "-h" || command === "--help") {
    ctx.out(HELP.main);
    return command === undefined ? EXIT.USAGE : EXIT.OK;
  }
  if (command === "-v" || command === "--version" || command === "version") {
    ctx.out(VERSION);
    return EXIT.OK;
  }
  if (command === "help") {
    const topic = rest[0];
    if (topic && !HELP[topic]) {
      ctx.err(`${ctx.paint.red("error:")} no help for "${topic}"`);
      return EXIT.USAGE;
    }
    ctx.out(HELP[topic ?? "main"]);
    return EXIT.OK;
  }
  const handler = COMMANDS[command];
  if (!handler) {
    ctx.err(`${ctx.paint.red("error:")} unknown command "${command}"`);
    ctx.err('Run "handover help" for the list of commands.');
    return EXIT.USAGE;
  }
  try {
    const { positionals, options } = parseArgs(rest, FLAGS[command]);
    if (options.help) {
      ctx.out(HELP[command]);
      return EXIT.OK;
    }
    if (positionals.length > 1) throw new UsageError(`unexpected argument "${positionals[1]}"`);
    return await handler(ctx, positionals, options);
  } catch (error) {
    if (error instanceof UsageError) {
      ctx.err(`${ctx.paint.red("error:")} ${error.message}`);
      ctx.err(`Run "handover help ${command}" for usage.`);
      return EXIT.USAGE;
    }
    throw error;
  }
}
