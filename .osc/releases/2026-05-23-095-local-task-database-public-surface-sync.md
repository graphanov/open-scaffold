# 095 — Local Task Database Public-Surface Sync Candidate

Date: 2026-05-23
Plan: `.osc/plans/active/095-local-task-database-public-surface-sync.md`
Branch: `release/local-task-database-public-surface-sync`
Package version: `open-scaffold@0.4.15`
Release: pending owner-gated follow-through

## Summary

PR #96 added the optional local SQLite task database CLI to repo `main`, but the public npm / `npx` surface is still `open-scaffold@0.4.14`, where `osc task` is not available. This candidate prepares `open-scaffold@0.4.15` so the local task database work can be published and represented by a GitHub Latest Release after owner approval.

## Traceability

- Source feature slice: PR #96 — `Add local task database CLI`
- Source feature evidence: `.osc/releases/2026-05-23-061-local-task-database.md`
- Source feature plan: `.osc/plans/done/061-local-task-database.md`
- Release-sync plan: `.osc/plans/active/095-local-task-database-public-surface-sync.md`
- Release-sync branch: `release/local-task-database-public-surface-sync`
- Release-sync PR: https://github.com/graphanov/open-scaffold/pull/97

## Pre-release drift baseline

Observed after PR #96 reached `main`:

```text
repo main package.json: 0.4.14
npm latest: 0.4.14
GitHub Latest Release: v0.4.14 — Optional MCP server interface
fresh npx open-scaffold@latest task --help: exit 2, Unknown command: task
local repo npm run osc -- task --help: lists osc task subcommands
```

## Candidate changes

- `package.json`
  - Candidate version: `0.4.15`.
- `package-lock.json`
  - Candidate root package version aligned to `0.4.15`.
- `.osc/plans/active/095-local-task-database-public-surface-sync.md`
  - Release-sync plan kept active until real npm / `npx` / GitHub Release proof exists.
- `.osc/releases/2026-05-23-095-local-task-database-public-surface-sync.md`
  - This candidate evidence note.

## Outcome

This branch is a release-sync candidate only. It does not publish npm, create or update a GitHub Release, merge itself, resume Control Room runner autonomy, or change Open Scaffold's runtime boundary.

## Verification

Candidate verification from `release/local-task-database-public-surface-sync`:

```text
git diff --check — passed
./verify.sh --strict — 10 pass, 0 fail, 0 warn
npm test -- tests/init.test.ts tests/tasks.test.ts tests/package-payload.test.ts --reporter=verbose — 3 files / 24 tests passed
npm test -- --reporter=verbose — 34 files / 313 tests passed
npm run build — passed, core and runtime-omx TypeScript builds
npm pack --dry-run --json — open-scaffold-0.4.15.tgz, 120 files, unpackedSize 825953
npm publish --dry-run — + open-scaffold@0.4.15
fresh npx open-scaffold@latest task --help baseline — exit 2, Unknown command: task
```

Package payload spot-check from `npm pack --dry-run --json`:

```text
docs/TASKS.md YES
dist/tasks.js YES
dist/tasks.d.ts YES
dist/cli.js YES
.osc/.gitignore YES
forbidden .osc/plans/active 0
forbidden .osc/plans/backlog 0
forbidden .osc/plans/done 0
forbidden .osc/runs 0
forbidden .osc-dev 0
forbidden .git 0
forbidden node_modules 0
.osc/releases payload .osc/releases/README.md only
```

## Remaining gates

- Open release-sync PR.
- CI and latest-head Codex review must pass with zero unresolved current review threads.
- Owner approval is required before merge.
- After merge, trusted npm publishing must be dispatched and verified.
- Fresh isolated-cache `npx open-scaffold@latest task --help` must pass after publication.
- GitHub Release `v0.4.15` must be created or updated and marked Latest after publication.
- Plan `095` should move to `done/` only after registry, fresh `npx`, and GitHub Latest Release proof exist.
