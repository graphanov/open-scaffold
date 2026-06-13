# Plan: 171-capture-package-sync

## Status

done

## Context

Plan 170 / PR #215 is now on `main`: `osc capture` is a package-visible CLI command, shipped docs, synthetic fixtures, and hook examples. The live public package surfaces still point at `open-scaffold@0.31.1` and GitHub Release `v0.31.1`, so new adopters using `npx open-scaffold@latest` cannot access `osc capture` yet.

The owner explicitly approved preparing a release-sync PR for `open-scaffold@0.32.0`. This plan prepares the candidate only. npm publishing, GitHub Release creation/Latest movement, and merge remain separate gates.

## Goal

Prepare a verified `open-scaffold@0.32.0` release-sync PR that bumps package metadata, records candidate release truth, passes package/repo gates, and stops before npm publish or GitHub Release creation.

## Constraints / Out of scope

- Keep this as a pre-1.0 release. `0.32.0` means a new public CLI/package surface (`osc capture`), not a 1.0 maturity claim.
- Do not publish to npm, create or update a GitHub Release, push to `main`, deploy, or move dist-tags in this PR.
- Do not add npm tokens, secrets, or new trusted-publishing credentials.
- Do not change product behavior beyond release metadata/docs/evidence required for this package sync.
- Keep release truth explicit: before owner-approved publication, npm latest and GitHub Latest Release remain `0.31.1`.

## Files to touch

- `package.json` and `package-lock.json` — bump package version to `0.32.0`.
- `docs/CHANGELOG.md` — add the adoption-facing `v0.32.0` candidate entry while keeping `v0.31.1` as the live Latest until publication.
- `README.md`, `docs/STABILITY.md`, and `ROADMAP.md` — move adoption-facing forward-line wording from `v0.31.x` to `v0.32.x` so the published package is internally consistent.
- `.osc/plans/active/171-capture-package-sync.md` — this release-sync plan.
- `.osc/releases/2026-06-13-171-capture-package-sync.md` — candidate release evidence note.
- `tests/section-parser.test.ts` — only if the live-corpus hash changes after adding this plan/evidence.

## Acceptance criteria

- [x] `package.json`, `package-lock.json`, and the lockfile root package version all read `0.32.0`.
- [x] Release-truth docs distinguish candidate repo state from live npm/GitHub Release state before publication.
- [x] Local release gates pass: `npm ci`, `git diff --check`, `./verify.sh --strict`, `npm test -- --run`, `npm run build`, `npm run osc -- doctor --check secret-scan`, `npm pack --dry-run --json`, and `npm publish --dry-run --tag latest`.
- [x] Package payload inspection confirms `open-scaffold@0.32.0`, includes `dist/cli.js`, `docs/CAPTURE.md`, and `examples/hooks/*`, and excludes `__pycache__`/`.pyc` files.
- [x] Release-sync PR is opened against `main`; CI/review state is reported, but merge remains owner-gated.
- [x] No npm publish, GitHub Release, version tag, deploy, or `main` push occurs in this slice.

## Verification steps

1. `node -p "require('./package.json').version"` plus package-lock checks — expected `0.32.0` everywhere.
2. `npm view open-scaffold version dist-tags --json --prefer-online` — expected live registry still `0.31.1` / `latest: 0.31.1` before publication.
3. `npm ci` — expected dependency install succeeds with no dependency drift beyond lockfile version metadata.
4. `git diff --check` — expected no whitespace errors.
5. `./verify.sh --strict` — expected no failures and no warnings after any required corpus-hash repin.
6. `npm test -- --run` and `npm run build` — expected pass.
7. `npm run osc -- doctor --check secret-scan` — expected no obvious token/webhook strings found.
8. `npm pack --dry-run --json` — expected package `open-scaffold@0.32.0`; required capture files present; no cache residue.
9. `npm publish --dry-run --tag latest` — expected dry-run success only, with no actual npm publication.
10. PR checks and review-thread query — expected green/thread-zero before recommending merge.

## Open questions

- None. The owner approved preparing the `0.32.0` release-sync PR and explicitly withheld npm publish / GitHub Release approval until after the PR is green/merged.
