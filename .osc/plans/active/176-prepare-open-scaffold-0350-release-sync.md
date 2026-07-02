# Plan: 176-prepare-open-scaffold-0350-release-sync

## Status

active

## Context

Issue #246 requests the next release-prep slice for `open-scaffold@0.35.0`. The package metadata on the prepared branch started at `0.34.0`, the top changelog entry was still the prior `v0.34.0` release-sync candidate, and the approved forge plan scoped this work to a reviewable draft PR only. The trusted OWNER comment confirms the current need is to rerun the forge implementation lane after the prior attempt produced no PR branch.

## Goal

Prepare a draft release-sync PR for `open-scaffold@0.35.0` with version metadata, changelog, release-sync plan/evidence, and dry-run verification ready for owner-gated npm publish and GitHub Release follow-through.

## Constraints / Out of scope

- This plan prepares a draft PR only; it does not merge, publish to npm, create tags, create GitHub Releases, dispatch workflows, change repository settings, change branch protection, or touch secrets.
- Keep release language in candidate/prep state until npm and GitHub Release proof exists after owner-gated follow-through.
- Follow current `origin/main` truth. The release delta after the `0.34.0` release-sync includes PRs #242, #243, #245, and #247.
- Do not change product behavior, publish/release workflows, `.env`, `SECURITY.md`, package publication authority, or package version beyond `0.35.0`.
- The only allowed test edit is `tests/section-parser.test.ts`, and only if verification proves the new release-prep records are the sole live-corpus hash change.

## Files to touch

- `package.json` - bump the package version from `0.34.0` to `0.35.0`.
- `package-lock.json` - keep the root and `packages[""]` lockfile versions aligned with `package.json`.
- `docs/CHANGELOG.md` - add a top `v0.35.0` release-candidate entry with source issue, release-prep records, verification status, and owner-gated boundaries.
- `.osc/plans/active/176-prepare-open-scaffold-0350-release-sync.md` - this release-prep work record while in progress.
- `.osc/releases/2026-07-02-176-prepare-open-scaffold-0350-release-sync.md` - release-prep evidence note with observed checks and authority boundary.
- `tests/section-parser.test.ts` - update live-corpus hash only if the new plan/evidence records are proven to be the sole snapshot change.

## Acceptance criteria

- [ ] `package.json`, `package-lock.json` root, and `package-lock.json` `packages[""]` all read `0.35.0`.
- [ ] `docs/CHANGELOG.md` contains a top `v0.35.0` candidate/prep entry that links issue #246, source PRs #242, #243, #245, and #247, this plan, this evidence note, and the draft PR once opened.
- [ ] The release-prep evidence note records observed version alignment, npm/GitHub availability check attempts, package dry-run output, verification commands, and the no-merge/no-publish/no-release authority boundary.
- [ ] Open Scaffold plan/evidence records contain no placeholder text and validate under strict plan validation.
- [ ] A draft PR is opened or updated against `main` from `forge/issue-246-prepare-open-scaffold-npm-github-release`, with `Closes #246` and a public-safe authority boundary.
- [ ] No forbidden external release action is performed: no merge, real publish, workflow dispatch, tag, GitHub Release, force-push, settings change, secret change, or package version beyond `0.35.0`.

## Verification steps

1. `node -e "const p=require('./package.json'), l=require('./package-lock.json'); if (p.version !== '0.35.0' || l.version !== '0.35.0' || l.packages[''].version !== '0.35.0') process.exit(1)"` - expected pass.
2. `npm view open-scaffold dist-tags --json` and `npm view open-scaffold@0.35.0 version --json` - expected to record live registry state, or record environment/network failure honestly.
3. GitHub PR overlap and release checks for issue #246, `0.35.0`, and branch `forge/issue-246-prepare-open-scaffold-npm-github-release` - expected no open overlap before this draft PR and no owner-gated release action from this plan.
4. `git diff --check` - expected pass.
5. `npm run osc -- plan validate 176-prepare-open-scaffold-0350-release-sync --strict` - expected pass.
6. `./verify.sh --strict && npm test -- --run` - configured required verification, expected pass or an honest sandbox blocker with focused follow-up evidence.
7. `npm run build` - expected pass.
8. `npm pack --dry-run --json` - expected package id `open-scaffold@0.35.0`; record observed tarball/file metadata.
9. Do not run `npm publish` or `npm publish --dry-run` in this release-prep PR. Real package publication and any publish rehearsal remain owner-gated follow-through after review/merge.

## Open questions

- None for release-prep. npm publish, GitHub Release creation, tag/release movement, and post-publish smoke remain owner-gated follow-through after review/merge.
