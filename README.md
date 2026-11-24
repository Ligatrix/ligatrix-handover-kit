# ligatrix-handover-kit

The package a client receives when we hand over a system, and the command-line tool that builds it and proves it is complete.

![CI](https://github.com/Ligatrix/ligatrix-handover-kit/actions/workflows/ci.yml/badge.svg)

## Why

A company that pays for a custom system has one fear above the others: being locked in. If the people who built it walk away,
can the company still run it, change it, deploy it and restore it? Do they own the repository, the domain, the cloud account and
every secret, or does someone else still hold a key?

A handover answers that with documents, but documents are easy to leave half-written. This kit makes the handover checkable:
a fixed set of files, and a command that refuses the bundle while any section is empty, any placeholder is left, any checklist
item is unticked or any dependency has no licence.

## What a client receives at handover

Every bundle holds the same seven parts:

| File | What it gives the new owner |
| --- | --- |
| `HANDOVER.md` | The one page to read first: what the system does, who handed it to whom and when, where the code and production live, what support continues, and both sides' sign-off. |
| `docs/architecture.md` | The parts of the system and how they fit: components, data and storage, integrations, environments, security, known limitations. |
| `docs/runbook.md` | Command-by-command procedures: start locally, deploy and roll back, back up, restore, rotate every key, daily on-call checks, escalation. |
| `docs/access-transfer.md` | Every account moved to the client and confirmed: repository ownership, cloud accounts, DNS and domains, secrets, admin users, third-party services. |
| `docs/dependencies.md` | Every library and hosted service, with its version and its licence. |
| `docs/decisions/` | Numbered decision records: why the system is built the way it is, so a sound choice is not undone by accident. |
| `checklists/handover-checklist.md` | What was verified, item by item: clean build, tests, restore drill, access removed, sign-off. |

## Quick start

Node.js 20 or later; nothing to install.

```sh
node bin/handover.mjs check examples/corvane-portal
node bin/handover.mjs init my-handover --name "Order desk portal"
node bin/handover.mjs report my-handover
```

The first command passes on the complete example. The second writes a fresh skeleton, and the third shows how much of it is
filled in. Once installed as a package, the same commands run as `handover check`, `handover init` and so on.

## Usage

### `handover init <dir> --name "<System name>"`

Writes the skeleton. Every value the sending team must supply is marked `<fill in: …>`, so nothing can be forgotten silently.
Existing files are never overwritten unless `--force` is given.

```text
$ node bin/handover.mjs init my-handover --name "Order desk portal"
Created the handover bundle for Order desk portal in my-handover
  HANDOVER.md
  docs/architecture.md
  docs/runbook.md
  docs/access-transfer.md
  docs/dependencies.md
  docs/decisions/0001-record-architecture-decisions.md
  checklists/handover-checklist.md

Next: replace every <fill in: ...> marker, then run: handover check my-handover
```

### `handover check <dir> [--json]`

Verifies the bundle and exits 1 with the list of problems, by file and line. It refuses:

- a required file that is missing or empty;
- a section with nothing under it (HTML comments do not count as content);
- a placeholder left anywhere, code blocks included: `TODO`, `TBD`, `FIXME`, `<fill in …>`;
- an unticked `- [ ]` item in any document;
- a dependency table row whose licence is empty, `check`, `unknown` or `?`, or a dependencies file with no licence column;
- a decision record without `Status`, `Context`, `Decision` and `Consequences`, or not named `NNNN-short-title.md`.

```text
$ node bin/handover.mjs check my-handover
✗ my-handover is not ready for handover: 63 problems

  HANDOVER.md
      8  unfilled placeholder <fill in: what the system does, who uses it and what would…>
     15  unfilled placeholder <fill in: team or company>
     ...
     37  unticked: Sending side: every access item transferred and its own access removed
     38  unticked: Receiving side: the system started and deployed from the runbook by your own team

  docs/architecture.md
      5  unfilled placeholder <fill in: one paragraph: the problem the system solves and…>
     ...

$ node bin/handover.mjs check examples/corvane-portal
✓ examples/corvane-portal is ready for handover: 9 documents checked, no problems.
```

`--json` prints `{ "dir", "ok", "problems": [{ "file", "line", "code", "message" }] }` for CI.

### `handover deps <package.json> [--production]`

Prints the table `docs/dependencies.md` expects. Versions come from `package-lock.json` (lockfile versions 1 to 3), then the
installed package, then the range in `package.json`. Licences come from the installed package in `node_modules`; when one cannot
be read the cell says `check`, and `handover check` refuses the bundle until someone confirms it.

```text
$ node bin/handover.mjs deps test/fixtures/deps/lockfile-app/package.json
| Package | Kind | Version | Licence |
| --- | --- | --- | --- |
| fastify | runtime | 4.28.1 | MIT |
| legacy-lib | runtime | 2.0.3 | (MIT OR Apache-2.0) |
| old-style | runtime | 1.4.0 | check |
| pg | runtime | 8.12.0 | MIT |
| unpublished-helper | runtime | ^0.3.0 | check |
| c8 | development | 10.1.2 | check |
3 licences to confirm by hand (marked "check").

$ node bin/handover.mjs deps package.json
@ligatrix/handover-kit declares no dependencies.
```

The note about licences to confirm goes to stderr, so `deps … > table.md` captures the table alone.

### `handover report <dir> [--json]`

A one-page readiness summary. Each part counts its sections (filled and free of placeholders), its checklist items (ticked) and,
for dependencies, its rows (with a licence).

```text
$ node bin/handover.mjs report my-handover
Handover readiness: my-handover

  Overview            ██████░░░░░░░░░░░░░░   28%  2 of 7
  Architecture        ░░░░░░░░░░░░░░░░░░░░    0%  0 of 7
  Runbook             ░░░░░░░░░░░░░░░░░░░░    0%  0 of 8
  Access transfer     ████░░░░░░░░░░░░░░░░   21%  4 of 19
  Dependencies        ░░░░░░░░░░░░░░░░░░░░    0%  0 of 5
  Decision records    ████████████████████  100%  8 of 8
  Handover checklist  █████░░░░░░░░░░░░░░░   27%  5 of 18
                      ────────────────────
  Overall             █████░░░░░░░░░░░░░░░   26%

Not ready: 63 problems. Run "handover check my-handover" for the list.
```

### Exit codes and output

| Code | Meaning |
| --- | --- |
| `0` | Success; for `check`, the bundle is ready |
| `1` | The bundle or the input has problems (or `init` would overwrite files) |
| `2` | Wrong usage: unknown command or option, missing argument |

Colour is used only on a terminal. `NO_COLOR` turns it off; `FORCE_COLOR=1` turns it on in a pipe. `handover help <command>`
and `handover <command> --help` print each command's help.

### From code

```js
import { checkBundle, readiness } from "@ligatrix/handover-kit";

const { ok, problems } = await checkBundle("handover");
```

Types are in `src/index.d.ts`.

## The example

[`examples/corvane-portal/`](examples/corvane-portal/) is a complete handover for the operations portal of Corvane Supply Co.,
a fictional distributor used in this demo. It shows the level of detail a bundle should reach:

- [Architecture](examples/corvane-portal/docs/architecture.md): a Node.js web process and worker, PostgreSQL as both database
  and job queue, an S3-compatible bucket, Caddy in front; environments, roles, encryption and audit trail.
- [Runbook](examples/corvane-portal/docs/runbook.md): local start, tag-based deploys with a one-command rollback, a backup
  table, a seven-step restore with verification, a rotation procedure for every secret, daily on-call checks.
- [Access transfer](examples/corvane-portal/docs/access-transfer.md): repository, hosting account, domain, secrets, admin users
  and third-party services, each confirmed by the receiving side.
- [Dependencies](examples/corvane-portal/docs/dependencies.md) with licences, and three
  [decision records](examples/corvane-portal/docs/decisions/), including why the stock import is a nightly file.

`node bin/handover.mjs check examples/corvane-portal` passes, and the test suite keeps it that way.

## Design notes

- **Placeholders are explicit.** The skeleton marks every value with `<fill in: hint>` rather than leaving blanks, so the check
  can tell "not written yet" from "intentionally short", and the hint stays next to the gap.
- **A small Markdown reader, not a full parser.** The checks need headings, task items, pipe tables, code fences and comments.
  About 130 lines handle those with exact line numbers; a full CommonMark parser would be a dependency for no gain.
- **Placeholders are caught inside code blocks too.** A runbook command with `<fill in>` in it is as unusable as a sentence, so
  fences do not hide placeholders, though they do hide headings and task items.
- **`check` is strict; `report` is forgiving.** `check` is the gate at handover; `report` shows progress on the way there.
  Both read the same analysis, so they never disagree about what is filled in.
- **Unknown licences are written as `check`, not guessed.** `deps` reads only what a package declares; anything else needs a
  person, and `handover check` makes sure that person looked.

## Testing

```sh
npm test
```

76 tests on `node:test`: the Markdown reader, one fixture bundle for each way a bundle can fail (each a copy of the example
broken in exactly one place), dependency resolution against lockfile fixtures, readiness scoring, and the CLI in-process and as
a real process. `npm run lint` checks for trailing whitespace, tabs and missing final newlines.

## Licence

[MIT](LICENSE), Copyright (c) 2026 Ligatrix LLC.

---
Built and maintained by the [Ligatrix](https://ligatrix.com) team. We build systems like this for companies: [book a call](https://ligatrix.com/contact/sales).
