# Release / Evidence Note: 171-capture-package-sync

## Summary

Published `open-scaffold@0.32.0` as the public `latest` npm package and created GitHub Release `v0.32.0` as Latest after owner-approved release follow-through.

`0.32.0` is used because `osc capture` is a new package-visible CLI/docs/hooks surface. The release remains pre-1.0 and bounded to observed transcript capture, not runtime spawning, semantic approval, compliance, production-readiness, or a 1.0 maturity contract.

## Traceability

- Roadmap / issue / task: package sync for merged plan 170 / `osc capture`.
- Source plan: `.osc/plans/done/170-ambient-capture.md`.
- Source PR: https://github.com/graphanov/open-scaffold/pull/215.
- Release-sync plan: `.osc/plans/done/171-capture-package-sync.md`.
- Release-sync PR: https://github.com/graphanov/open-scaffold/pull/216.
- Release-sync merge commit: `61b858ac79761264ef1b10fb2a2206df13b4f188`.
- Trusted publishing workflow: https://github.com/graphanov/open-scaffold/actions/runs/27465464440.
- GitHub Release: https://github.com/graphanov/open-scaffold/releases/tag/v0.32.0.

## Verification

Baseline live-truth inspection before release-sync edits:

- `git fetch --prune origin && git checkout main && git pull --ff-only origin main` — PASS: local `main` was up to date at PR #215 merge commit `36d62fb7d7ebb2eb84dcfc7d50313537c2602e16` before the release-sync branch.
- `git status --short --branch` — PASS: clean `main...origin/main` before candidate branch.
- `node -p "require('./package.json').version"` — PASS before candidate bump: `0.31.1`.
- `npm view open-scaffold version dist-tags --json --prefer-online` — PASS before candidate bump: `0.31.1`, `latest: 0.31.1`.
- `gh release list --repo graphanov/open-scaffold --limit 3` — PASS before candidate bump: `v0.31.1 — Harness release readiness package sync` was Latest.

Candidate gates before PR-ready:

- [x] Version alignment — PASS: `0.32.0 / 0.32.0 / 0.32.0` for `package.json`, `package-lock.json`, and lockfile root package version.
- [x] Live registry check before publication — PASS: `npm view open-scaffold version dist-tags --json --prefer-online` reported `0.31.1`, `latest: 0.31.1`; `open-scaffold@0.32.0` returned 404 / not published.
- [x] `npm ci` — PASS. npm audit reported one high-severity dev-dependency issue tracked by Dependabot PR #214; `npm audit --omit=dev --json` reported 0 production/runtime vulnerabilities.
- [x] `git diff --check` — PASS.
- [x] `./verify.sh --strict` — PASS: 10 pass / 0 fail / 0 warn after the intentional live-corpus hash update.
- [x] `npm test -- --run` — PASS: 48 files / 534 tests.
- [x] `npm run build` — PASS: core TypeScript build and runtime-omx build.
- [x] `npm run osc -- doctor --check secret-scan` — PASS: `PASS secret-scan: no obvious token/webhook strings found.`
- [x] `npm pack --dry-run --json` payload inspection after rebuilding — PASS for `open-scaffold@0.32.0`; entry count 205; required `dist/cli.js`, `dist/capture.js`, `dist/ambient.js`, `docs/CAPTURE.md`, and `examples/hooks/*` files present; no `__pycache__`/`.pyc` files.
- [x] `npm publish --dry-run --tag latest` — PASS for `open-scaffold@0.32.0` with tag `latest`; dry-run only.
- [x] Release-sync PR opened and merged: https://github.com/graphanov/open-scaffold/pull/216. CI passed, Codex latest-head review was clean, and unresolved current review threads were 0 before merge.

Post-merge/publication gates after owner-approved follow-through:

- [x] Sync clean `main` after release PR merge — PASS at `61b858ac79761264ef1b10fb2a2206df13b4f188`.
- [x] Main CI for release commit — PASS for product `ci`; Dependabot failed separately because PR #214 already exists for `esbuild@0.28.1` (`pull_request_exists_for_latest_version`).
- [x] Re-run post-merge local publish gates — PASS: version checks, `npm ci`, production audit, `git diff --check`, `./verify.sh --strict`, `npm test -- --run`, `npm run build`, secret scan, pack dry-run, and publish dry-run.
- [x] Trusted publishing workflow published `open-scaffold@0.32.0` with dist-tag `latest` — PASS: https://github.com/graphanov/open-scaffold/actions/runs/27465464440.
- [x] Fresh isolated-cache `npx open-scaffold@latest` smokes prove the published package surface — PASS for top-level help and `capture --help`.
- [x] GitHub Release `v0.32.0` exists, targets merged commit `61b858ac79761264ef1b10fb2a2206df13b4f188`, and is marked Latest — PASS: https://github.com/graphanov/open-scaffold/releases/tag/v0.32.0.
- [x] This plan is closed to `done` with final public proof.

## Outcome

`open-scaffold@0.32.0` is published on npm with dist-tag `latest`, fresh `npx open-scaffold@latest` smokes passed, and GitHub Release `v0.32.0` is Latest. No deploy was performed and no 1.0 maturity claim was made.

## Follow-up

- Dependabot PR #214 remains open for the existing dev-dependency security update (`esbuild@0.28.1`).
