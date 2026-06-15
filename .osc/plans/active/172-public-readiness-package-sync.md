# Plan: 172-public-readiness-package-sync

## Status

active

## Context

PR #219 hardened Open Scaffold's public readiness messaging on `main`: README, mission, FAQ, proof-harness docs, Start Here, package metadata, first-run output, and regression tests now describe Open Scaffold as a pre-1.0 repo-native work-record layer with bounded proof claims.

The live public package still advertises the old npm metadata from `open-scaffold@0.32.0`, so users installing through npm do not yet see the corrected package description and keywords. The owner explicitly pre-approved the full release follow-through for this package sync: merge, npm trusted publishing, GitHub Release creation/Latest movement, and public verification for the scoped `0.32.1` release.

## Goal

Publish `open-scaffold@0.32.1` and create GitHub Release `v0.32.1` as Latest so the npm package and GitHub release surfaces match the public-readiness hardening now on `main`.

## Constraints / Out of scope

- Keep this as a pre-1.0 patch release for public positioning/package metadata; do not claim production readiness, compliance certification, broad adoption, or a mature 1.0 contract.
- Do not add product behavior beyond package/release metadata and evidence required for this release sync.
- Use the existing trusted-publishing workflow; do not add npm tokens, secrets, or new publish credentials.
- No deployment, announcement, paid promotion, or public launch campaign is included.
- Plan `163-proof-harness-v2` remains active and unsatisfied; this slice does not generate new benchmark proof.

## Files to touch

- `package.json` and `package-lock.json` — bump package version to `0.32.1` while preserving the public-readiness metadata from PR #219.
- `docs/CHANGELOG.md` — add the adoption-facing `v0.32.1` release-sync entry and mark `v0.32.0` as superseded after publication.
- `.osc/plans/active/172-public-readiness-package-sync.md` — this release-sync plan until publication proof exists.
- `.osc/releases/2026-06-15-172-public-readiness-package-sync.md` — candidate and final publication evidence.
- `tests/section-parser.test.ts` — update live-corpus hashes if the plan/evidence/changelog changes require it.

## Acceptance criteria

- [ ] `package.json`, `package-lock.json`, and the lockfile root package version all read `0.32.1`.
- [ ] Candidate release docs distinguish repo candidate state from live npm/GitHub Release state before publication, and final closeout records npm/GitHub proof after publication.
- [ ] Local release gates pass: `npm ci`, `git diff --check`, `./verify.sh --strict`, `npm test -- --run`, `npm run build`, `npm run osc -- doctor --check secret-scan`, `npm pack --dry-run --json`, and `npm publish --dry-run --tag latest`.
- [ ] Package payload inspection confirms `open-scaffold@0.32.1`, includes `dist/cli.js`, README/docs, and package metadata carrying the pre-1.0 work-record positioning.
- [ ] Release-sync PR is opened, reviewed, merged, npm trusted publishing succeeds, fresh isolated-cache `npx open-scaffold@latest --version` returns `0.32.1`, fresh `--help` smokes pass, and GitHub Release `v0.32.1` is Latest.
- [ ] No unrelated proof-harness, runtime-controller, benchmark, deployment, or announcement scope is included.

## Verification steps

1. `node -p "require('./package.json').version"` plus package-lock checks — expected `0.32.1` everywhere.
2. `npm view open-scaffold version description keywords dist-tags --json --prefer-online` — before publication expected live package still `0.32.0` with old metadata; after publication expected `0.32.1` plus public-readiness metadata.
3. `npm ci` — expected dependency install succeeds with no unexpected lockfile drift.
4. `git diff --check` — expected no whitespace errors.
5. `./verify.sh --strict` — expected no failures and no warnings after any required corpus-hash update.
6. `npm test -- --run` and `npm run build` — expected pass.
7. `npm run osc -- doctor --check secret-scan` — expected no obvious token/webhook strings found.
8. `npm pack --dry-run --json` — expected package `open-scaffold@0.32.1` with required CLI/docs payload present and no cache residue.
9. `npm publish --dry-run --tag latest` — expected dry-run success before real trusted publishing.
10. PR checks, Codex/latest-head review, review-thread query, trusted publishing workflow, npm registry check, fresh isolated-cache `npx open-scaffold@latest --version`, help smokes, and GitHub Release inspection — expected green/public proof.

## Open questions

- None. The owner explicitly pre-approved merge, npm publish, GitHub Release creation/Latest movement, and public verification for this scoped release sync.
