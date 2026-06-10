# Plan: 160-harness-release-readiness-package-sync

## Status

active

## Context

The harness release-readiness work and plan closeout are now on `main`. The repo has clearer public docs plus package-visible CLI help parity for `osc feedback --help` and `osc bench --help`, but npm and GitHub Latest Release still point at `0.31.0`. The owner approved publishing the next package and GitHub Release.

## Goal

Publish `open-scaffold@0.31.1` with dist-tag `latest`, verify the fresh package from outside the repo, create GitHub Release `v0.31.1` marked Latest, and close the release-sync evidence trail without upgrading the project to a 1.0 promise.

## Constraints / Out of scope

- Keep this as a pre-1.0 patch release on the `v0.31.x` hardening line.
- Do not claim full live runtime stability, cost/token proof, broad benchmark dominance, compliance certification, or production readiness.
- Use trusted publishing through `.github/workflows/publish-npm.yml`; do not add npm tokens or secrets.
- Keep the release grounded in merged repo facts: harness docs/readiness, command-help parity, and plan closeout.
- GitHub Release and npm publication are owner-approved for this slice, but future releases still need separate owner approval.

## Files to touch

- `package.json` and `package-lock.json` — bump package version to `0.31.1`.
- `docs/CHANGELOG.md` — add the adoption-facing `v0.31.1` release entry.
- `docs/VERSION_TRUTH.md` — distinguish repo candidate state from live npm/GitHub surfaces before publish, then record verified live truth after publish.
- `.osc/releases/2026-06-10-160-harness-release-readiness-package-sync.md` — release-sync evidence note.
- `.osc/plans/done/160-harness-release-readiness-package-sync.md` — this plan, moved to done after publication proof.

## Acceptance criteria

- [ ] `package.json`, `package-lock.json`, and the root lockfile package version all read `0.31.1`.
- [ ] Release-truth docs distinguish candidate repo state from live npm/GitHub Release state before publish, then record verified live state after publish.
- [ ] Local release gates pass: `git diff --check`, `./verify.sh --strict`, `npm test -- --run`, `npm run build`, `npm run osc -- doctor --check secret-scan`, `npm pack --dry-run --json`, and `npm publish --dry-run --tag latest`.
- [ ] Release-sync PR CI is green and review/thread state is clean before merge.
- [ ] Trusted publishing workflow publishes `open-scaffold@0.31.1` with `latest`, and fresh isolated-cache `npx open-scaffold@latest` proves the package surface from outside the repository.
- [ ] GitHub Release `v0.31.1` exists, targets the merged `origin/main` release commit, is marked Latest, and uses release notes grounded in verified PR/evidence facts.

## Verification steps

1. `node -p "require('./package.json').version"` plus package-lock checks — expected `0.31.1` everywhere.
2. `npm view open-scaffold version dist-tags --json --prefer-online` — expected `0.31.0` before publish and `0.31.1` after trusted publishing.
3. `git diff --check` — expected no whitespace errors.
4. `./verify.sh --strict` — expected no failures and no warnings.
5. `npm test -- --run` and `npm run build` — expected pass.
6. `npm run osc -- doctor --check secret-scan` — expected no issues.
7. `npm pack --dry-run --json` and `npm publish --dry-run --tag latest` — expected package `open-scaffold@0.31.1` and successful dry-run.
8. After merge/publish: trusted publishing workflow success, registry `0.31.1/latest`, fresh isolated-cache `npx` smoke, GitHub Release `v0.31.1` Latest, and this plan closed to `done`.

## Open questions

- None. The owner approved publishing after the harness readiness closeout; use `0.31.1` because this is a patch release for package-visible docs/help readiness on the existing `v0.31.x` line.
