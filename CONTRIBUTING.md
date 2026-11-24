# Contributing

Thank you for helping improve the handover kit.

## Run and test

You need Node.js 20 or later. There is nothing to install.

```sh
node bin/handover.mjs --help
npm test
npm run lint
```

## Branches

- Branch from `main`, with a short descriptive name: `fix/licence-column-detection`, `feat/yaml-lockfile`.
- Keep one change per branch, and rebase on `main` before opening a pull request.

## Commit style

- Write the subject in the imperative, under 72 characters: « Add pnpm lockfile support to deps ».
- Use the body to say why the change is needed and what it replaces.
- Keep commits logical: a refactor and a behaviour change go in separate commits.

## Pull request checklist

- [ ] `npm test` and `npm run lint` pass on Node.js 20 and 22
- [ ] New behaviour has tests, including the failure path
- [ ] A new check has a fixture bundle that fails in exactly that way
- [ ] `node bin/handover.mjs check examples/corvane-portal` still passes
- [ ] README and `CHANGELOG.md` updated where behaviour changed
- [ ] No new runtime dependencies
