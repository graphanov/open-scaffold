# Release / Evidence Note: 075-brownfield-package-release-sync

## Summary

Prepared the package/public-surface sync needed after PR #60 added brownfield init. Local `main` now exposes `osc init --from-existing`, but npm `latest` remains `open-scaffold@0.4.2` and rejects the new flag. This slice bumps the release candidate to `0.4.3`, verifies the package payload, and records the explicit owner gates for real npm publish and GitHub Release creation.

## Traceability

- Preceding feature: PR #60 — https://github.com/graphanov/open-scaffold/pull/60.
- Preceding evidence: `.osc/releases/2026-05-19-051-brownfield-init-from-existing.md`.
- Plan: `.osc/plans/done/075-brownfield-package-release-sync.md`.
- Branch: `release/brownfield-init-package-sync`.
- Kanban: `t_16140b93`.
- Release candidate: `open-scaffold@0.4.3`.
- PR: #61 — https://github.com/graphanov/open-scaffold/pull/61.

## Registry and command-surface evidence

Before publish:

- `npm view open-scaffold version time dist-tags --json` reports `version: 0.4.2` and `dist-tags.latest: 0.4.2`.
- `npx --yes open-scaffold@latest --help` does not include `osc init --from-existing --tier min --target <dir> [--force]`.
- `npx --yes open-scaffold@latest init --from-existing --tier min --target <tmp>` exits `2` with `Unknown option for init: --from-existing`.
- Local build help includes `osc init --from-existing --tier min --target <dir> [--force]`.

## Package payload evidence

`npm pack --dry-run --json` for the local release candidate reports:

- package name: `open-scaffold`.
- version: `0.4.3`.
- filename: `open-scaffold-0.4.3.tgz`.
- package size: `164190` bytes.
- unpacked size: `559055` bytes.
- file count: `84`.
- forbidden private/dogfood prefixes: none found for `.osc/research/`, `.osc/runs/`, `.osc/plans/done/`, `.osc/plans/backlog/`, `.git/`, or `node_modules/`.
- `dist/cli.js` is present.
- plan/evidence history for `051` or `075` is not shipped in the root npm payload.

`npm publish --dry-run` succeeds for `open-scaffold@0.4.3` and reports a dry-run publish to the npm registry with tag `latest`.

## Verification

- `npm view open-scaffold version time dist-tags --json` — captured current registry truth (`0.4.2` latest).
- `npx --yes open-scaffold@latest --help` — captured missing brownfield command.
- `npx --yes open-scaffold@latest init --from-existing --tier min --target <tmp>` — fails before publish with `Unknown option for init: --from-existing`, confirming drift.
- `npm run build` — pass.
- `node dist/cli.js --help` — local brownfield command present.
- `npm pack --dry-run --json` — pass; public-safe payload, 84 files.
- `npm publish --dry-run` — pass.

## Gates

- Real `npm publish` is not performed in this branch. It requires explicit owner approval after review/merge.
- GitHub Release creation or marking `v0.4.3` as Latest is not performed in this branch. It requires explicit owner approval after publish.
- Merge remains an owner gate.

## Outcome

`open-scaffold@0.4.3` is prepared as the smallest package release candidate for brownfield init. Public npm truth is still intentionally unchanged until the owner approves real publish and GitHub Release creation.
