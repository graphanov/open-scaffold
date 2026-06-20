# Plan: 174-evidence-battery-package-sync

## Status

done (release-sync preparation complete; owner-approved npm trusted publishing and GitHub Release `v0.33.0` Latest follow-through executes after merge, with publication proof recorded in `.osc/releases/2026-06-20-174-evidence-battery-package-sync.md`)

## Context

PR #226 added a fail-closed evidence battery to Open Scaffold's proof harness on `main` (squash-merged as `55644b8`): `evidence_battery` support in proof manifests, a gate that blocks `boundedProof` when required evidence is not demonstrated/reproduced, `not_evaluated` reporting for empty batteries, a manifest-level `required_evidence` list (omission + demonstrated-status + trimmed-ID enforcement), and a proof-battery table in `osc prove compare`. Codex reviewed the latest head (`f84a4343e4`) clean on 2026-06-20 with zero unresolved review threads, and `main` CI is green.

The live public package still advertises `open-scaffold@0.32.1`, so users installing through npm do not yet see the evidence-battery feature. PR #226 is already merged to `main`; the owner explicitly pre-approved the release follow-through for this package sync: this release-sync PR (merge after review), npm trusted publishing, GitHub Release creation/Latest movement, and public verification for the scoped `0.33.0` release.

## Goal

Prepare the `open-scaffold@0.33.0` release-sync — version bump, CHANGELOG entry, release-sync plan and candidate evidence note, local gates, and PR merge — so the owner-approved npm trusted publishing and GitHub Release `v0.33.0` Latest follow-through can ship the fail-closed evidence battery now on `main`. Publication itself is the owner-approved follow-through, not part of this PR's acceptance criteria; its proof is recorded in the evidence note.

## Constraints / Out of scope

- Keep this as a pre-1.0 minor release for a new proof-harness feature; do not claim production readiness, compliance certification, broad adoption, or a mature 1.0 contract.
- Do not add product behavior beyond package/release metadata and evidence required for this release sync.
- Use the existing trusted-publishing workflow (`publish-npm.yml`); do not add npm tokens, secrets, or new publish credentials.
- No deployment, announcement, paid promotion, or public launch campaign is included.
- The Codex 2x cold-resume claim remains bounded to its single fixture; this release does not generate new benchmark proof or expand that claim.

## Files to touch

- `package.json` and `package-lock.json` — bump package version to `0.33.0` (root and `packages[""]` lockfile fields).
- `docs/CHANGELOG.md` — add the adoption-facing `v0.33.0` release-sync entry and mark `v0.32.1` as superseded after publication.
- `.osc/plans/done/174-evidence-battery-package-sync.md` — this completed release-sync plan.
- `.osc/releases/2026-06-20-174-evidence-battery-package-sync.md` — candidate and final publication evidence.
- `tests/section-parser.test.ts` — update live-corpus hashes if the plan/evidence/changelog changes require it.

## Acceptance criteria

- [x] `package.json`, `package-lock.json` root, and `packages[""]` lockfile version all read `0.33.0`.
- [x] Candidate release docs distinguish repo candidate state from live npm/GitHub Release state before publication, and final closeout records npm/GitHub proof after publication.
- [x] Local release gates pass: `npm ci`, `git diff --check`, `./verify.sh --strict`, `npm test -- --run`, `npm run build`, `npm run osc -- doctor --check secret-scan`, `npm pack --dry-run --json`, and `npm publish --dry-run --tag latest`.
- [x] Package payload inspection confirms `open-scaffold@0.33.0`, includes `dist/cli.js`, README/docs, and package metadata carrying the pre-1.0 work-record positioning.
- [x] Release-sync PR opened with CI green on the PR head (PR merge, npm trusted publishing, and GitHub Release are owner-approved follow-through recorded in the evidence note, not acceptance criteria).
- [x] No unrelated proof-harness, runtime-controller, benchmark, deployment, or announcement scope is included.

## Publication follow-through (after merge, owner-approved)

Not acceptance criteria for this PR; executed as a separate owner-approved operation after merge, with proof recorded in `.osc/releases/2026-06-20-174-evidence-battery-package-sync.md`:

- Trigger `publish-npm.yml` workflow_dispatch with `expected-version=0.33.0`, `npm-tag=latest`.
- Verify `npm view open-scaffold version` returns `0.33.0` and `latest: 0.33.0`.
- Fresh isolated-cache `npx open-scaffold@latest --version` returns `0.33.0`; `--help` smokes pass.
- Create GitHub Release `v0.33.0` as Latest; mark `v0.32.1` superseded in the CHANGELOG and evidence note.

## Verification steps

1. `node -p "require('./package.json').version"` plus package-lock checks — expected `0.33.0` everywhere.
2. `npm view open-scaffold version dist-tags --json --prefer-online` — before publication expected live package still `0.32.1`; after publication expected `0.33.0`.
3. `npm ci` — expected dependency install succeeds with no unexpected lockfile drift.
4. `git diff --check` — expected no whitespace errors.
5. `./verify.sh --strict` — expected no failures and no warnings after any required corpus-hash update.
6. `npm test -- --run` and `npm run build` — expected pass.
7. `npm run osc -- doctor --check secret-scan` — expected no obvious token/webhook strings found.
8. `npm pack --dry-run --json` — expected package `open-scaffold@0.33.0` with required CLI/docs payload present and no cache residue.
9. `npm publish --dry-run --tag latest` — expected dry-run success before real trusted publishing.
10. PR CI checks, trusted publishing workflow, npm registry check, fresh isolated-cache `npx open-scaffold@latest --version`, help smokes, and GitHub Release inspection — expected green/public proof.

## Open questions

- None. The owner explicitly pre-approved merge, npm publish, GitHub Release creation/Latest movement, and public verification for this scoped release sync.
