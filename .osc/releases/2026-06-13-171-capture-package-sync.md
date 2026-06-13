# Release / Evidence Note: 171-capture-package-sync

## Summary

Release-sync candidate for publishing merged `osc capture` work as `open-scaffold@0.32.0` after owner approval. This candidate bumps package metadata and records release truth only; it does not publish npm, create a GitHub Release, move the `latest` dist-tag, or claim a 1.0 maturity contract.

`0.32.0` is used because `osc capture` is a new package-visible CLI/docs/hooks surface. The release remains pre-1.0 and bounded to observed transcript capture, not runtime spawning, semantic approval, compliance, or production-readiness claims.

## Traceability

- Roadmap / issue / task: package sync for merged plan 170 / `osc capture`.
- Source plan: `.osc/plans/done/170-ambient-capture.md`.
- Source PR: https://github.com/graphanov/open-scaffold/pull/215.
- Release-sync plan: `.osc/plans/active/171-capture-package-sync.md`.
- Run ID / run packet: N/A for this scoped package/release sync.
- Branch / PR: `chore/release-0.32.0-package-sync` / https://github.com/graphanov/open-scaffold/pull/216.

## Verification

Baseline live-truth inspection before release-sync edits:

- `git fetch --prune origin && git checkout main && git pull --ff-only origin main` — PASS: local `main` was up to date at PR #215 merge commit `36d62fb7d7ebb2eb84dcfc7d50313537c2602e16` before the release-sync branch.
- `git status --short --branch` — PASS: clean `main...origin/main` before candidate branch.
- `node -p "require('./package.json').version"` — PASS before candidate bump: `0.31.1`.
- `npm view open-scaffold version dist-tags --json --prefer-online` — PASS before candidate bump: `0.31.1`, `latest: 0.31.1`.
- `gh release list --repo graphanov/open-scaffold --limit 3` — PASS before candidate bump: `v0.31.1 — Harness release readiness package sync` is Latest.

Candidate gates before PR-ready:

- [x] Version alignment — PASS: `0.32.0 / 0.32.0 / 0.32.0` for `package.json`, `package-lock.json`, and lockfile root package version.
- [x] Live registry check — PASS before publication: `npm view open-scaffold version dist-tags --json --prefer-online` reports `0.31.1`, `latest: 0.31.1`; `open-scaffold@0.32.0` returns 404 / not published.
- [x] `npm ci` — PASS: install completed successfully. npm audit reports one high-severity dev-dependency issue tracked by existing Dependabot PR #214; `npm audit --omit=dev --json` reports 0 production/runtime vulnerabilities.
- [x] `git diff --check` — PASS.
- [x] `./verify.sh --strict` — PASS: 10 pass / 0 fail / 0 warn after the intentional live-corpus hash update.
- [x] `npm test -- --run` — PASS: 48 files / 534 tests.
- [x] `npm run build` — PASS: core TypeScript build and runtime-omx build.
- [x] `npm run osc -- doctor --check secret-scan` — PASS: `PASS secret-scan: no obvious token/webhook strings found.`
- [x] `npm pack --dry-run --json` payload inspection after rebuilding — PASS for `open-scaffold@0.32.0`; entry count 205; required `dist/cli.js`, `dist/capture.js`, `dist/ambient.js`, `docs/CAPTURE.md`, and `examples/hooks/*` files present; no `__pycache__`/`.pyc` files.
- [x] `npm publish --dry-run --tag latest` — PASS for `open-scaffold@0.32.0` with tag `latest`; dry-run only.
- [ ] Release candidate PR CI and review/thread gate — pending PR creation.

Post-merge/publication gates after future owner-approved follow-through:

- [ ] Sync clean `main` after release PR merge.
- [ ] Main CI for release commit.
- [ ] Re-run post-merge local publish gates.
- [ ] Trusted publishing workflow publishes `open-scaffold@0.32.0` with dist-tag `latest`.
- [ ] Fresh isolated-cache `npx open-scaffold@latest` smokes prove the published package surface.
- [ ] GitHub Release `v0.32.0` exists, targets the merged release commit, and is marked Latest.
- [ ] This plan is closed to `done` with final public proof.

## Outcome

Candidate package gates passed locally. No npm publication, GitHub Release, dist-tag movement, deploy, or `main` push has occurred in this release-sync slice.

## Follow-up

- Owner gate after this PR: merge release-sync PR if accepted, then explicitly approve trusted npm publishing and GitHub Release creation for `v0.32.0`.
