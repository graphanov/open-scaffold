# Release / Evidence Note: 074-package-public-surface-sync

## Summary

Prepares the next package/public-surface sync after PR #57. Live npm `latest` is still `open-scaffold@0.4.1`, while current `main` contains newer CLI lifecycle helpers and local package metadata that have not reached the registry. This slice prepares `0.4.2` as the recommended patch release candidate, clarifies that `packages/runtime-omx/` is a GitHub source path rather than part of the root npm payload, and keeps npm publish / GitHub Release / merge as explicit owner gates.

## Traceability

- Prior reconciliation: `.osc/releases/2026-05-18-050-npm-publish-and-npx-init.md`.
- Plan: `.osc/plans/active/074-package-public-surface-sync.md`.
- Branch: `release/package-public-surface-sync`.
- PR: #58 — https://github.com/graphanov/open-scaffold/pull/58.
- npm publish: not performed.
- GitHub Release: not created.

## Registry and command-surface evidence

- `npm view open-scaffold version time dist-tags --json`:
  - `version`: `0.4.1`.
  - `dist-tags.latest`: `0.4.1`.
  - published versions: `0.4.0`, `0.4.1`.
- `npm view open-scaffold --json` summary:
  - package exists with description and MIT license.
  - published metadata does not expose `repository`, `homepage`, `bugs`, or `keywords` yet.
  - `dist.fileCount`: `82`.
  - `dist.unpackedSize`: `484719` bytes.
- `npx --yes open-scaffold@latest --help` succeeds, but npm latest lacks current local lifecycle helpers:
  - `osc plan new`
  - `osc plan move`
  - `osc amend`
  - `osc evidence new`
  - `osc close`
- `node dist/cli.js --help` after local build includes those helpers.
- `npx --yes open-scaffold@latest init --tier min --target <tmp>` succeeds and creates the expected 13 min-tier files.

## Package payload evidence

- `npm pack --dry-run --json` for the local release candidate:
  - package name: `open-scaffold`.
  - version: `0.4.2`.
  - file count: `84`.
  - package size: `162567` bytes.
  - unpacked size: `552199` bytes.
  - forbidden private/dogfood prefixes: none found for `.osc-dev/`, `.osc/research/`, `.osc/runs/`, `.osc/plans/done/`, `.osc/plans/backlog/`, `.git/`, or `node_modules/`.
  - `packages/runtime-omx/` files in the root package: `0`.
  - shipped docs with relative `../packages/runtime-omx` links: `0`.

## Runtime package distribution decision

Decision for this slice: keep `packages/runtime-omx/` as a GitHub source / repo-only package path for now. Do not include it in the root `open-scaffold` npm tarball and do not publish a separate runtime package in this PR. Runtime-package publication remains a separate owner-approved release decision.

Docs were updated so shipped root-package docs no longer imply that `packages/runtime-omx/` is available inside the root npm payload. Relative links to `../packages/runtime-omx/` in shipped docs were converted to GitHub source links where needed.

## Version / publish recommendation

Recommended next package action after review and owner approval: publish patch version `0.4.2`.

Rationale:

- The package public surface is stale relative to current main but this is not a breaking or feature-strategy release.
- The local release candidate adds already-merged CLI lifecycle helpers to the public `npx` path.
- Missing npm metadata can only reach npm through a new version publish.
- Runtime wording is a clarification, not a new installable runtime package.

## Verification

Final verification for this branch should include:

- `git diff --check`
- `./verify.sh --strict`
- `npm test -- --run`
- `npm run build`
- `npm pack --dry-run --json`
- `npx --yes open-scaffold@latest init --tier min --target <tmp>`
- `node dist/cli.js --help`

## Outcome

- Local release candidate prepared as `open-scaffold@0.4.2`.
- Root package remains core-only: CLI, scaffold files, and docs; no `packages/runtime-omx/` payload ships inside the root tarball.
- Runtime package distribution is clarified as repo/GitHub source for now, with any installable runtime-package release left as a separate owner-approved decision.
- Public npm `latest` remains `0.4.1` until the owner approves and performs `npm publish`.
- Plan 074 remains active until the owner decides whether to merge the PR and publish `0.4.2`.

## Gates

- Owner approval received to open PR #58; merge remains owner-gated.
- Owner approval required before `npm publish`.
- Owner approval required before creating or moving the GitHub Release marked Latest.
