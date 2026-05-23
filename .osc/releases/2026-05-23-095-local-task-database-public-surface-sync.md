# 095 — Local Task Database Public-Surface Sync

Date: 2026-05-23
Plan: `.osc/plans/done/095-local-task-database-public-surface-sync.md`
Final package version: `open-scaffold@0.4.16`
Release: https://github.com/graphanov/open-scaffold/releases/tag/v0.4.16

## Summary

PR #96 added the optional local SQLite task database CLI to repo `main`. PR #97 published `open-scaffold@0.4.15`, which exposed `osc task`, but post-publish verification caught a packaged `osc init` regression before the GitHub Latest Release gate. This follow-up prepares `open-scaffold@0.4.16` so the local task database work and packaged init path can both be published and represented by a GitHub Latest Release after owner approval.

## Traceability

- Source feature slice: PR #96 — `Add local task database CLI`
- Source feature evidence: `.osc/releases/2026-05-23-061-local-task-database.md`
- Source feature plan: `.osc/plans/done/061-local-task-database.md`
- Release-sync plan: `.osc/plans/done/095-local-task-database-public-surface-sync.md`
- Release-sync branch: `release/local-task-database-public-surface-sync`
- Release-sync PR: https://github.com/graphanov/open-scaffold/pull/97
- Hotfix branch: `fix/packaged-init-gitignore-fallback`
- Hotfix PR: https://github.com/graphanov/open-scaffold/pull/98
- Release-sync amendment: `.osc/plans/done/095-local-task-database-public-surface-sync-amendment-1.md`
- Trusted publishing run: https://github.com/graphanov/open-scaffold/actions/runs/26328487716
- GitHub Release: https://github.com/graphanov/open-scaffold/releases/tag/v0.4.16

## Pre-release and post-0.4.15 drift baseline

Observed after PR #96 reached `main` and before PR #97:

```text
repo main package.json: 0.4.14
npm latest: 0.4.14
GitHub Latest Release: v0.4.14 — Optional MCP server interface
fresh npx open-scaffold@latest task --help: exit 2, Unknown command: task
local repo npm run osc -- task --help: lists osc task subcommands
```

Observed after PR #97 and trusted publishing run `26328214129`:

```text
npm latest: 0.4.15
fresh npx open-scaffold@latest task --help: passed
fresh npx open-scaffold@latest init --tier min --target <tmp>: failed
failure: Template source missing for .osc/.gitignore because the extracted package had .osc/.npmignore
GitHub Latest Release: still v0.4.14 because the 0.4.15 release gate was intentionally not completed after the init blocker
```

## Candidate changes

- `package.json`
  - Candidate version: `0.4.16`.
- `package-lock.json`
  - Candidate root package version aligned to `0.4.16`.
- `src/init.ts`
  - Copies packaged `.osc/.npmignore` as downstream `.osc/.gitignore` when npm rewrites the template filename during tarball extraction.
- `tests/package-payload.test.ts`
  - Adds an extracted-tarball `osc init` regression test instead of relying only on dry-run file names.
- `.osc/plans/active/095-local-task-database-public-surface-sync-amendment-1.md`
  - Records the public-package verification learning and hotfix direction.
- `.osc/releases/2026-05-23-095-local-task-database-public-surface-sync.md`
  - This candidate evidence note, updated with the 0.4.15 blocker and 0.4.16 follow-through.

## Outcome

Completed. `open-scaffold@0.4.16` is published on npm as `latest`, fresh isolated-cache `npx` smokes pass for both `task --help` and `init --tier min`, GitHub Release `v0.4.16 — Local task database CLI` is marked Latest, and plan `095` has been moved to `done/` for closeout.

## Verification

PR #97 / `0.4.15` verification reached npm but failed the final fresh-init smoke:

```text
trusted publishing run 26328214129 — success, published open-scaffold@0.4.15
npm latest — 0.4.15
fresh isolated-cache npx open-scaffold@latest task --help — passed
fresh isolated-cache npx open-scaffold@latest init --tier min --target <tmp> — failed: Template source missing for .osc/.gitignore
```

Hotfix candidate verification from `fix/packaged-init-gitignore-fallback`:

```text
git diff --check — passed
git diff --cached --check — passed
./verify.sh --strict — 10 pass, 0 fail, 0 warn
npm test -- tests/init.test.ts tests/tasks.test.ts tests/package-payload.test.ts --reporter=verbose — 3 files / 25 tests passed
npm test -- --reporter=verbose — 34 files / 314 tests passed
npm run build — passed, core and runtime-omx TypeScript builds
npm pack --dry-run --json — open-scaffold-0.4.16.tgz, 120 files, unpackedSize 826202
npm publish --dry-run — + open-scaffold@0.4.16
```

Package payload spot-check from `npm pack --dry-run --json`:

```text
docs/TASKS.md YES
dist/tasks.js YES
dist/tasks.d.ts YES
dist/cli.js YES
.osc/.gitignore YES
forbidden .osc/plans/active 0
.osc/releases payload .osc/releases/README.md only
```

Regression coverage added:

```text
npm package payload > runs init successfully from an extracted npm tarball — passed
```

Final public-surface verification:

```text
trusted publishing run 26328487716 — success, published open-scaffold@0.4.16
npm latest — 0.4.16
fresh isolated-cache npx open-scaffold@latest --help — passed
fresh isolated-cache npx open-scaffold@latest task --help — passed and listed task subcommands
fresh isolated-cache npx open-scaffold@latest init --tier min --target <tmp> — passed and created .osc/.gitignore containing tasks.db*
GitHub Release v0.4.16 — created and marked Latest
```

## Remaining gates

None for this release-sync slice. Control Room runner automation remains a separate resume/re-qualification gate.
