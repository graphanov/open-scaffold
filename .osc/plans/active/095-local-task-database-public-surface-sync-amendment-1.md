# Amendment 1: 095-local-task-database-public-surface-sync

## Parent

095-local-task-database-public-surface-sync

## Date

2026-05-23

## Learning

Post-publish verification for `open-scaffold@0.4.15` proved the task CLI reached npm, but the fresh isolated-cache `npx open-scaffold@latest init --tier min` smoke failed before the release could be marked complete. The package extracted `.osc/.gitignore` as `.osc/.npmignore`, so the published CLI could not copy the scaffold ignore template even though local source and dry-run pack checks looked green.

## New direction

Prepare a patch hotfix release that keeps the local task database public surface and fixes packaged `osc init` by allowing the CLI to copy the packaged `.osc/.npmignore` fallback into downstream `.osc/.gitignore` when npm rewrites the template filename.

## Impact on acceptance criteria

- Public npm verification now requires a fresh isolated-cache `npx open-scaffold@latest init --tier min --target <tmp>` pass in addition to `task --help`.
- The final public version may advance beyond `0.4.15` if a patch hotfix is required before GitHub Latest Release and plan closeout.
- Package-payload verification must cover an extracted tarball / installed package behavior, not only `npm pack --dry-run --json` file names.
