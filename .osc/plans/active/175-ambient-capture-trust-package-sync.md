# Plan: 175-ambient-capture-trust-package-sync

## Status

active

## Context

Issue #239 requests a release-prep PR for `open-scaffold@0.34.0` because npm `latest` remains `0.33.0` while `origin/main` contains package-visible work merged after `v0.33.0`. The release target must be `0.34.0`, not the stale `0.4.0`/`0.5.0` line, and the release must be cut from current `origin/main`.

## Goal

Prepare a draft release-sync PR for `open-scaffold@0.34.0` with package metadata, changelog, and release-prep evidence ready for owner-gated publish and GitHub Release follow-through.

## Constraints / Out of scope

- This plan prepares a draft PR only; it does not merge, publish to npm, create/move tags, create/move GitHub Releases, dispatch workflows, change branch protection, or touch secrets.
- Keep all release language in candidate/prep state until npm and GitHub Release proof exists.
- Follow current `origin/main` truth. The release delta includes PRs #229, #230, #232, #236, #237, and #238.
- Do not change ambient capture product behavior, local Claude/Codex user config, package publication workflow authority, or package version beyond `0.34.0`.
- Do not close issue #239 merely because the prep PR exists; owner-gated publish/release proof remains follow-through after merge.

## Files to touch

- `package.json` — bump the package version from `0.33.0` to `0.34.0`.
- `package-lock.json` — keep the root and `packages[""]` lockfile versions aligned with `package.json`.
- `docs/CHANGELOG.md` — add a top `v0.34.0` release-candidate entry with source PRs, evidence links, and owner-gated boundaries.
- `.osc/plans/active/175-ambient-capture-trust-package-sync.md` — this release-prep work record while in progress.
- `.osc/releases/2026-06-28-175-ambient-capture-trust-package-sync.md` — release-prep evidence note with observed verification.
- `tests/section-parser.test.ts` — update live-corpus hash comments only if validation proves the new plan/evidence records are the sole snapshot change.
- `MISSION.md` — only if `osc close` records the verified plan closeout.

## Acceptance criteria

- [ ] `package.json`, `package-lock.json` root, and `package-lock.json` `packages[""]` all read `0.34.0`.
- [ ] `docs/CHANGELOG.md` contains a top `v0.34.0` candidate/prep entry that links issue #239, source PRs #229, #230, #232, #236, #237, and #238, prior release `v0.33.0`, npm `0.33.0`, and this evidence note.
- [ ] The release-prep evidence note records observed version alignment, registry/release availability checks, package dry-run output, verification commands, and the no-merge/no-publish/no-release authority boundary.
- [ ] Open Scaffold plan/evidence records contain no placeholder text and validate after any intentional live-corpus hash update.
- [ ] A draft PR is opened or updated against `main` from `forge/issue-239-release-open-scaffold-ambient-capture-trust-package`, with `Closes #239` or an explicit keep-open explanation and a public-safe authority boundary.
- [ ] No forbidden external release action is performed: no merge, real publish, workflow dispatch, tag, GitHub Release, force-push, settings change, secret change, or package version beyond `0.34.0`.

## Verification steps

1. `node -e "const p=require('./package.json'), l=require('./package-lock.json'); if (p.version !== '0.34.0' || l.version !== '0.34.0' || l.packages[''].version !== '0.34.0') process.exit(1)"` — expected pass.
2. `npm view open-scaffold dist-tags --json` and `npm view open-scaffold@0.34.0 version --json` — before owner publishing, expected `latest` remains `0.33.0` and `0.34.0` is not found, or record environment/network failure honestly.
3. GitHub tag/release/PR overlap checks — expected no `v0.34.0` release/tag and no open overlapping PR before this draft PR.
4. `git diff --check` — expected pass.
5. `./verify.sh --strict && npm test -- --run` — configured required verification, expected pass.
6. `npm run build` — expected pass.
7. `npm pack --dry-run --json` — expected package id `open-scaffold@0.34.0`; record observed tarball/file counts.
8. `npm publish --dry-run --tag latest` — dry-run only if npm auth/network permits; if blocked, record as not observed without attempting a real publish.

## Open questions

- None for release-prep. npm publish, GitHub Release creation, tag/release movement, and post-publish smoke remain owner-gated follow-through after review/merge.
