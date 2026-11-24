# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-24

### Added

- `handover init`: writes the seven-part handover skeleton, with `<fill in: …>` markers and a ready first decision record;
  refuses to overwrite without `--force`.
- `handover check`: refuses missing or empty files, empty sections, placeholders (`TODO`, `TBD`, `FIXME`, `<fill in>`),
  unticked checklist items, dependency rows without a licence, and incomplete or misnamed decision records; `--json` output.
- `handover deps`: dependency table from `package.json`, lockfile versions 1 to 3 and installed packages' licences;
  `--production` leaves out development dependencies.
- `handover report`: readiness per part of the bundle and overall; `--json` output.
- Programmatic API (`checkBundle`, `readiness`, `listDependencies`, `skeleton`, `run`) with hand-written types.
- `examples/corvane-portal`: a complete handover bundle for a fictional operations portal.
- Test suite on `node:test` with a failing fixture bundle for each check, and a lint script.

[1.0.0]: https://github.com/Ligatrix/ligatrix-handover-kit/releases/tag/v1.0.0
