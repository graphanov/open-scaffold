# Release / Evidence Note: 074-package-public-surface-sync

## Summary

Completed the package/public-surface sync after PR #57. PR #58 prepared `open-scaffold@0.4.2`, clarified that `packages/runtime-omx/` is a GitHub source path rather than part of the root npm payload, and kept merge/npm/GitHub Release gates explicit. After owner approval, `open-scaffold@0.4.2` was published to npm and GitHub Release `v0.4.2` was created and marked Latest.

## Traceability

- Prior reconciliation: `.osc/releases/2026-05-18-050-npm-publish-and-npx-init.md`.
- Plan: `.osc/plans/done/074-package-public-surface-sync.md`.
- Branch / PR: `release/package-public-surface-sync`; PR #58 — https://github.com/graphanov/open-scaffold/pull/58.
- npm package: https://www.npmjs.com/package/open-scaffold/v/0.4.2.
- GitHub Release: https://github.com/graphanov/open-scaffold/releases/tag/v0.4.2.
- Release target: `3e0a633c5431435c1ed473d83c07b2dadafe75a7`.

## Registry and command-surface evidence

Before publish:

- `npm view open-scaffold version time dist-tags --json` reported `version: 0.4.1` and `dist-tags.latest: 0.4.1`.
- `npx --yes open-scaffold@latest --help` succeeded, but npm latest lacked current lifecycle helpers:
  - `osc plan new`
  - `osc plan move`
  - `osc amend`
  - `osc evidence new`
  - `osc close`
- `node dist/cli.js --help` after local build included those helpers.

After publish:

- `npm view open-scaffold version dist-tags --json` reports `version: 0.4.2` and `dist-tags.latest: 0.4.2`.
- `npm view open-scaffold --json` exposes repository, homepage, bugs URL, license, description, and keywords.
- `npx --yes open-scaffold@latest --help` exposes the lifecycle helpers listed above.
- `npx --yes open-scaffold@latest init --tier min --target <tmp>` succeeds and creates the expected min-tier files.

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

Decision for this slice: keep `packages/runtime-omx/` as a GitHub source / repo-only package path for now. Do not include it in the root `open-scaffold` npm tarball and do not publish a separate runtime package in this release. Runtime-package publication remains a separate owner-approved release decision.

Docs were updated so shipped root-package docs no longer imply that `packages/runtime-omx/` is available inside the root npm payload. Relative links to `../packages/runtime-omx/` in shipped docs were converted to GitHub source links where needed.

## Verification

PR #58 / release-candidate verification:

- `git diff --check` — pass.
- `./verify.sh --strict` — 10 pass / 0 fail / 0 warn.
- `npm test -- --run` — 22 files / 187 tests passed.
- `npm run build` — pass.
- `npm pack --dry-run --json` — pass.
- `npm publish --dry-run` — pass.
- `npx --yes open-scaffold@latest init --tier min --target <tmp>` — pass.
- `node dist/cli.js --help` — pass.
- GitHub CI — pass.
- Codex latest-head review for PR #58 — no major issues.

Post-publish verification:

- `npm view open-scaffold version dist-tags --json` — latest `0.4.2`.
- `npx --yes open-scaffold@latest --help` — lifecycle helper commands present.
- `npx --yes open-scaffold@latest init --tier min --target <tmp>` — pass.
- `gh release view v0.4.2 --repo graphanov/open-scaffold` — release exists, non-draft, non-prerelease, target `3e0a633c5431435c1ed473d83c07b2dadafe75a7`.
- `gh release list --repo graphanov/open-scaffold --limit 5` — `v0.4.2 — Package public-surface sync` is Latest.

## Outcome

- `open-scaffold@0.4.2` is published to npm and is the `latest` dist-tag.
- GitHub Release `v0.4.2 — Package public-surface sync` exists and is marked Latest.
- Root package remains core-only: CLI, scaffold files, and docs; no `packages/runtime-omx/` payload ships inside the root tarball.
- Runtime package distribution is clarified as repo/GitHub source for now, with any installable runtime-package release left as a separate owner-approved decision.
- Plan 074 is closed to `done/` by the follow-up closeout PR.
