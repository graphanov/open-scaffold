# Release / Evidence Note: 152-framework-cleanup-package-sync

## Summary

Release-sync evidence for publishing the merged framework cleanup shrink as `open-scaffold@0.31.0`.

The package-visible change is a narrowed/reduced Open Scaffold CLI/source surface after PR #183, with shipped migration breadcrumbs and preserved protected core behavior. This release remains pre-1.0 hardening: it does not claim runtime execution, model improvement, benchmark proof, compliance certification, production readiness, or a mature 1.0 contract.

## Traceability

- Roadmap / issue / task: framework cleanup shrink / package public-surface sync after PR #183 and PR #184.
- Source plan: `.osc/plans/done/151-framework-cleanup-shrink.md`.
- Source PR: https://github.com/graphanov/open-scaffold/pull/183.
- Source closeout PR: https://github.com/graphanov/open-scaffold/pull/184.
- Release-sync plan: `.osc/plans/done/152-framework-cleanup-package-sync.md`.
- Run ID / run packet: N/A for this scoped package/release sync.
- Branch / PR: `release/0.31.0-framework-cleanup-sync` / https://github.com/graphanov/open-scaffold/pull/185.

## Verification

Baseline live-truth inspection before release-sync edits:

- `git fetch --prune origin && git checkout main && git pull --ff-only origin main` — PASS: local `main` up to date at `4dd438097440874f8d5e4044a620bb6d1599e4e7` before candidate branch.
- `git status --short --branch` — PASS: clean `main...origin/main` before candidate branch.
- `node -p "require('./package.json').version"` — PASS: `0.30.1` before candidate bump.
- `npm view open-scaffold version dist-tags --json --prefer-online` — PASS before candidate bump: `0.30.1`, `latest: 0.30.1`.
- `gh release list --repo graphanov/open-scaffold --limit 5` — PASS before candidate bump: `v0.30.1 — Evolution handoff packet release` was Latest.
- `gh pr list --repo graphanov/open-scaffold --state open --json number,title,headRefName,url` — PASS: no open PRs before candidate branch.

Candidate gates before PR-ready:

- [x] Version alignment — PASS: `0.31.0 / 0.31.0 / 0.31.0` for `package.json`, `package-lock.json`, and lockfile root package version.
- [x] `npm ci` — PASS: installed 88 packages; npm audit found 0 vulnerabilities.
- [x] `git diff --check` — PASS.
- [x] `./verify.sh --strict` — PASS with expected active-release-plan warning: 9 pass / 0 fail / 1 warn while this release-sync plan remains active before public proof.
- [x] `npm test -- --run` — PASS: 43 files / 484 tests.
- [x] `npm run build` — PASS: core TypeScript build and runtime-omx build.
- [x] `npm run osc -- doctor --check secret-scan` — PASS: `PASS secret-scan: no obvious token/webhook strings found.`
- [x] `npm pack --dry-run --json` payload inspection after cleaning ignored local build residue — PASS for `open-scaffold@0.31.0`; entry count 198; no stale removed-command `dist/*` modules; no Python `__pycache__` files.
- [x] `npm publish --dry-run --tag latest` — PASS for `open-scaffold@0.31.0` with tag `latest`.
- [x] Release candidate PR CI and review/thread gate — PASS: PR #185 CI green; latest-head Codex clean at `2026-06-06T15:18:32Z`; review threads unresolved count `0` after fixed/outdated thread resolution.

Post-merge/publication gates after owner-approved follow-through:

- [x] Sync clean `main` after release PR merge — PASS: local `main` fast-forwarded to `origin/main` at `b50f2b272b302c5b12118912c47880046eeb33e3`.
- [x] Main CI for release commit — PASS: https://github.com/graphanov/open-scaffold/actions/runs/27066136409.
- [x] Post-merge local publish gates — PASS: `git diff --check`, `./verify.sh --strict`, `npm test -- --run`, `npm run build`, `npm run osc -- doctor --check secret-scan`, `npm pack --dry-run --json`, and `npm publish --dry-run --tag latest`.
- [x] Trusted publishing workflow publishes `open-scaffold@0.31.0` with dist-tag `latest` — PASS: https://github.com/graphanov/open-scaffold/actions/runs/27066187879.
- [x] `npm view open-scaffold version dist-tags --json --prefer-online` reports `0.31.0`, `latest: 0.31.0`.
- [x] Fresh isolated-cache `npx --yes open-scaffold@latest --help` from an external temp directory passes.
- [x] Fresh isolated-cache smoke proves removed/repositioned command guidance from the published package: `osc work --help` exits `2` and points to `docs/COMMAND_MATURITY.md`.
- [x] GitHub Release `v0.31.0` exists, targets `b50f2b272b302c5b12118912c47880046eeb33e3`, and is marked Latest: https://github.com/graphanov/open-scaffold/releases/tag/v0.31.0.
- [x] This plan is closed to `done` with final public proof.

## Outcome

Published and verified. `open-scaffold@0.31.0` is live on npm with dist-tag `latest`, fresh isolated-cache `npx open-scaffold@latest` passes, and GitHub Release `v0.31.0` is marked Latest at the release commit.

## Follow-up

- None for this release-sync slice after closeout PR merge. Future package-visible changes still require separate owner-approved release follow-through.
