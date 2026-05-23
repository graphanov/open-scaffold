# 096 — Glass Cockpit Webhooks Public-Surface Sync

Date: 2026-05-23
Plan: `.osc/plans/done/096-glass-cockpit-webhooks-public-surface-sync.md`
Final package version: `open-scaffold@0.4.17`
Release: https://github.com/graphanov/open-scaffold/releases/tag/v0.4.17

## Summary

PR #100 added push-only glass-cockpit webhook commands to repo `main`: `osc cockpit config`, `osc cockpit test`, and `osc cockpit post`. Because `open-scaffold@0.4.16` was already published before that work reached `main`, fresh public `npx open-scaffold@latest cockpit --help` still serves the older package and does not expose the cockpit command.

This release-sync slice prepares `open-scaffold@0.4.17` and records the proof needed to align npm/latest, fresh `npx`, and GitHub Latest Release with the already-reviewed cockpit webhook CLI.

## Traceability

- Source feature slice: PR #100 — `Add glass cockpit webhooks`
- Source feature evidence: `.osc/releases/2026-05-23-062-glass-cockpit-webhooks.md`
- Source feature plan: `.osc/plans/done/062-glass-cockpit-webhooks.md`
- Source feature merge commit: `928c7d7a8013de215261cfbfedc13095774a09cf`
- Release-sync plan: `.osc/plans/done/096-glass-cockpit-webhooks-public-surface-sync.md`
- Release-sync branch: `release/glass-cockpit-webhooks-public-surface-sync`
- Release-sync PR: https://github.com/graphanov/open-scaffold/pull/101
- Release-sync closeout branch: `release/glass-cockpit-webhooks-closeout`
- Trusted publishing run: https://github.com/graphanov/open-scaffold/actions/runs/26342576290
- GitHub Release: https://github.com/graphanov/open-scaffold/releases/tag/v0.4.17

## Pre-release drift baseline

Observed after PR #100 reached `main` and before this release-sync candidate:

```text
repo main package.json: 0.4.16
npm latest: 0.4.16
GitHub Latest Release: v0.4.16 — Local task database CLI
local repo npm run --silent osc -- cockpit --help: lists osc cockpit config/test/post
fresh isolated-cache npx open-scaffold@latest cockpit --help: exit 2, Unknown command: cockpit
```

## Candidate changes

- `package.json`
  - Candidate version: `0.4.17`.
- `package-lock.json`
  - Candidate root package version aligned to `0.4.17`.
- `.osc/plans/active/096-glass-cockpit-webhooks-public-surface-sync.md`
  - Tracks release-sync acceptance criteria until final public proof exists.
- `.osc/releases/2026-05-23-096-glass-cockpit-webhooks-public-surface-sync.md`
  - This evidence note.

## Outcome

Completed. `open-scaffold@0.4.17` is published on npm as `latest`, fresh isolated-cache `npx` smokes pass for `--help`, `cockpit --help`, and `init --tier min`, GitHub Release `v0.4.17 — Glass cockpit webhooks` is marked Latest, and plan `096` has been moved to `done/` for closeout.

## Verification

Candidate-prep verification from `release/glass-cockpit-webhooks-public-surface-sync`:

```text
git diff --check — passed
./verify.sh --strict — 10 pass, 0 fail, 0 warn
npm test -- tests/cockpit.test.ts tests/package-payload.test.ts --reporter=verbose — 2 files / 14 tests passed
npm test -- --reporter=verbose — 35 files / 326 tests passed
npm run build — passed, core and runtime-omx TypeScript builds
npm run --silent osc -- cockpit --help — passed and listed cockpit config/test/post
npm pack --dry-run --json — open-scaffold-0.4.17.tgz, 123 files, unpackedSize 851406
npm publish --dry-run — + open-scaffold@0.4.17
PR #101 CI — success
Codex latest-head review — clean comment at 2026-05-23T20:15:59Z, no inline comments, zero unresolved review threads
```

Post-merge publish verification from `main`:

```text
git diff --check — passed
./verify.sh --strict — 10 pass, 0 fail, 0 warn
npm test -- --reporter=verbose — 35 files / 326 tests passed
npm run build — passed
npm run --silent osc -- cockpit --help — passed
npm pack --dry-run --json — open-scaffold-0.4.17.tgz, 123 files, unpackedSize 851406
npm publish --dry-run — + open-scaffold@0.4.17
trusted publishing run 26342576290 — success, published open-scaffold@0.4.17
npm latest — 0.4.17 / latest
fresh isolated-cache npx open-scaffold@latest --help — passed and listed cockpit commands
fresh isolated-cache npx open-scaffold@latest cockpit --help — passed and listed cockpit config/test/post
fresh isolated-cache npx open-scaffold@latest init --tier min --target <tmp> — passed and created .osc/.gitignore containing tasks.db*
GitHub Release v0.4.17 — created and marked Latest
```

Package payload spot-check from `npm pack --dry-run --json`:

```text
dist/cockpit.js YES
dist/cockpit.d.ts YES
.osc/cockpit.example.json YES
dist/cli.js YES
forbidden .osc/plans/active 0
.osc/releases payload .osc/releases/README.md only
```

Final public-surface verification:

```text
trusted publishing run 26342576290 — success
npm latest — 0.4.17
fresh isolated-cache npx open-scaffold@latest cockpit --help — passed
GitHub Release v0.4.17 — Latest
```

## Remaining gates

None for this release-sync slice. Control Room runner automation remains a separate resume/re-qualification gate and should start from refreshed selector/current truth after this closeout lands.
