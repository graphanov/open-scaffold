# Plan: 152-framework-cleanup-package-sync

## Status

active

## Context

PR #183 merged the framework cleanup shrink and PR #184 closed its Open Scaffold plan state on `main`. The change is package-visible: the maintained TypeScript surface is reduced, several historical/experimental commands are removed or repositioned, and shipped docs/help now point clean-clone users at committed migration guidance. `package.json`, npm `latest`, and GitHub Latest Release are still at `0.30.1`, so a release-sync slice is needed before `npx open-scaffold@latest` reflects the merged cleanup.

## Goal

Publish `open-scaffold@0.31.0` with dist-tag `latest`, verify the fresh package from outside the repo, create GitHub Release `v0.31.0` marked Latest, and close the release-sync evidence trail.

## Constraints / Out of scope

- Do not publish a mature `1.0` line; this remains pre-1.0 hardening.
- Do not claim runtime execution, model improvement, compliance certification, benchmark proof, or production readiness.
- Do not introduce product/code changes beyond package-version, release-truth docs, changelog/evidence, and release closeout hygiene.
- Use trusted publishing through `.github/workflows/publish-npm.yml`; do not add npm tokens or secrets.
- Keep GitHub Release and npm publication owner-approved and verified before claiming live status.

## Files to touch

- `package.json` and `package-lock.json` — bump package version to `0.31.0`.
- `docs/CHANGELOG.md` — add the adoption-facing `v0.31.0` release entry.
- `docs/STABILITY.md`, `docs/VERSION_TRUTH.md`, `README.md`, and `ROADMAP.md` — align the forward-moving pre-1.0 line with `v0.31.x` and the framework cleanup shrink.
- `.osc/releases/2026-06-06-152-framework-cleanup-package-sync.md` — release-sync evidence note.
- `.osc/plans/active/152-framework-cleanup-package-sync.md` — this release-sync plan, later moved to done after publication proof.

## Acceptance criteria

- [ ] `package.json`, `package-lock.json`, and the root lockfile package version all read `0.31.0`.
- [ ] Release-truth docs distinguish candidate repo state from live npm/GitHub Release state before publish, then record verified live state after publish.
- [ ] Local release gates pass: `git diff --check`, `npm ci`, `./verify.sh --strict`, `npm test -- --run`, `npm run build`, `npm run osc -- doctor --check secret-scan`, `npm pack --dry-run --json`, and `npm publish --dry-run --tag latest`.
- [ ] Release-sync PR CI is green and review/thread state is clean before merge.
- [ ] Trusted publishing workflow publishes `open-scaffold@0.31.0` with `latest`, and fresh isolated-cache `npx open-scaffold@latest` proves the reduced package surface from outside the repository.
- [ ] GitHub Release `v0.31.0` exists, targets the merged `origin/main` release commit, is marked Latest, and uses release notes grounded in verified PR/evidence facts.

## Verification steps

1. `node -p "require('./package.json').version"` plus package-lock checks — expected `0.31.0` everywhere.
2. `npm view open-scaffold version dist-tags --json --prefer-online` — expected `0.30.1` before publish and `0.31.0` after trusted publishing.
3. `git diff --check` — expected no whitespace errors.
4. `npm ci` — expected install success and zero vulnerabilities.
5. `./verify.sh --strict` — expected no failures; an active release-plan warning is acceptable before closeout only if documented.
6. `npm test -- --run` and `npm run build` — expected pass.
7. `npm run osc -- doctor --check secret-scan` — expected no issues.
8. `npm pack --dry-run --json` and `npm publish --dry-run --tag latest` — expected package `open-scaffold@0.31.0` and successful dry-run.
9. After merge/publish: trusted publishing workflow success, registry `0.31.0/latest`, fresh isolated-cache `npx` smoke, GitHub Release `v0.31.0` Latest, and this plan closed to `done`.

## Open questions

- None. The owner approved a publish after PR #183/#184 merged; use `0.31.0` because the cleanup changes the pre-1.0 package surface beyond a patch repair.
