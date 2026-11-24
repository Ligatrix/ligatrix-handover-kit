#!/usr/bin/env node
import { run } from "../src/cli.mjs";

// A closed pipe (for example `handover check . | head`) is not an error.
process.stdout.on("error", (error) => {
  if (error.code === "EPIPE") process.exit(process.exitCode ?? 0);
  throw error;
});

try {
  process.exitCode = await run(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`error: ${error.message}\n`);
  process.exitCode = 1;
}
