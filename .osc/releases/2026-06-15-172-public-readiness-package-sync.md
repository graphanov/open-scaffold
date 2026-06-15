# Release / Evidence Note: 172-public-readiness-package-sync

## Summary

`open-scaffold@0.32.1` is published as npm `latest`, and GitHub Release `v0.32.1 — Public-readiness package sync` is published as Latest. This patch release publishes the public-readiness hardening from PR #219 plus the clean Dependabot lockfile update from PR #218 to npm/GitHub release surfaces, so public package metadata matches the repo's current pre-1.0, proof-boundary-aware positioning.

## Traceability

- Roadmap / issue / task: owner-approved package sync after PR #219 public-readiness hardening and PR #218 dev-dependency lockfile update.
- Source PRs: https://github.com/graphanov/open-scaffold/pull/219 and https://github.com/graphanov/open-scaffold/pull/218.
- Release-sync plan: `.osc/plans/done/172-public-readiness-package-sync.md`.
- Release-sync PR: https://github.com/graphanov/open-scaffold/pull/220.
- Trusted publishing run: https://github.com/graphanov/open-scaffold/actions/runs/27569365137.
- GitHub Release: https://github.com/graphanov/open-scaffold/releases/tag/v0.32.1.
- Target commit: `ea701e76b6e0a00974f09e830eafca129e2a4460`.

## Verification

Baseline live-truth inspection before release-sync edits:

- `git fetch --prune origin && git checkout main && git pull --ff-only origin main` — PASS: local `main` fast-forwarded through PR #219 merge commit `3705667e50723747c7c4a0fdb121f61a07497638`, then PR #218 merge commit `936c2ce9e880dbbc427c566d7cf1adf075eb5d4e`.
- `git status --short --branch` — PASS: clean `main...origin/main` before candidate branch.
- `node -p "require('./package.json').version"` — PASS before candidate bump: `0.32.0`.
- `npm view open-scaffold version description keywords dist-tags --json --prefer-online` — PASS before candidate bump: live registry still `0.32.0` with old package metadata and `latest: 0.32.0`.
- `gh release list --repo graphanov/open-scaffold --limit 3` — PASS before candidate bump: `v0.32.0 — Ambient capture package sync` was Latest.
- PR #219 post-merge `main` CI — PASS.
- PR #218 pre-merge checks and post-merge `main` CI — PASS.

Candidate and PR gates before merge:

- [x] Version alignment — PASS: `0.32.1 / 0.32.1 / 0.32.1` for `package.json`, `package-lock.json`, and lockfile root package version.
- [x] Live registry check before publication — PASS: `open-scaffold@0.32.1` returned 404 / not published; current live registry reported `0.32.0`, `latest: 0.32.0`, and old metadata.
- [x] `npm ci` — PASS: 51 packages installed/audited; 0 vulnerabilities.
- [x] `git diff --check` — PASS.
- [x] `./verify.sh --strict` — PASS: 10 pass / 0 fail / 0 warn after the intentional live-corpus hash update.
- [x] `npm test -- --run` — PASS: 48 files / 535 tests.
- [x] `npm run build` — PASS: core TypeScript build and runtime-omx build.
- [x] `npm run osc -- doctor --check secret-scan` — PASS: `PASS secret-scan: no obvious token/webhook strings found.`
- [x] `npm pack --dry-run --json` payload inspection — PASS for `open-scaffold@0.32.1`; entry count 205; required `dist/cli.js`, `README.md`, `docs/CHANGELOG.md`, `docs/PROOF_HARNESS.md`, `docs/STABILITY.md`, and `docs/START_HERE.md` present; no `__pycache__`/`.pyc` files.
- [x] `npm publish --dry-run --tag latest` — PASS for `open-scaffold@0.32.1` with tag `latest`; dry-run only.
- [x] PR #220 checks — PASS: `ci`, `Validate changed plans`, `Validate evidence notes`, and `Structural Open Scaffold PR check`; skipped mirrors were non-blocking.
- [x] PR #220 latest-head Codex review — PASS: latest clean artifact at `2026-06-15T18:51:53Z` for head `cecddc9413`; unresolved current review threads `0`.
- [x] PR #220 merge — PASS: squash-merged to `main` as `ea701e76b6e0a00974f09e830eafca129e2a4460`.

Post-merge and publication gates:

- [x] Post-merge local `main` — PASS: fast-forwarded to `ea701e76b6e0a00974f09e830eafca129e2a4460`.
- [x] Post-merge `main` CI — PASS: `ci` completed successfully for `ea701e76b6e0a00974f09e830eafca129e2a4460`.
- [x] `npm ci` — PASS: 51 packages installed/audited; 0 vulnerabilities.
- [x] `git diff --check` — PASS.
- [x] `./verify.sh --strict` — PASS: 10 pass / 0 fail / 0 warn.
- [x] `npm test -- --run` — PASS: 48 files / 535 tests.
- [x] `npm run build` — PASS.
- [x] `npm run osc -- doctor --check secret-scan` — PASS.
- [x] `npm pack --dry-run --json` — PASS for `open-scaffold@0.32.1`; 205 files; required CLI/docs present; no `__pycache__`, `.pyc`, or `.DS_Store` residue; shasum `8fc5125a854b37bb2f8667af7690464af9829176`.
- [x] `npm publish --dry-run --tag latest` — PASS.
- [x] Trusted publishing workflow — PASS: run `27569365137`, job `Publish package`, conclusion `success`.
- [x] npm registry verification — PASS: `open-scaffold@0.32.1`, `latest: 0.32.1`, description `Pre-1.0 repo-native work-record CLI for AI-agent handoff, evidence, and review.`, proof-boundary keywords present.
- [x] Fresh isolated-cache `npx open-scaffold@latest --version` — PASS: `0.32.1`.
- [x] Fresh isolated-cache `npx open-scaffold@latest --help` — PASS: help exposed `osc` and `first-run`.
- [x] Fresh isolated-cache `npx open-scaffold@latest first-run --non-interactive ...` — PASS: created mission/plan/evidence skeleton and printed evidence-chain, proof-harness, stability, production-readiness, and semantic-correctness boundary guidance.
- [x] GitHub Release `v0.32.1` — PASS: published as Latest, target `ea701e76b6e0a00974f09e830eafca129e2a4460`.

## Outcome

Complete. Public package, GitHub Release, shipped docs, and first-run output now expose the public-readiness hardening from PR #219 under `open-scaffold@0.32.1` / `v0.32.1`.

## Follow-up

- This closeout moves the release-sync plan to `.osc/plans/done/172-public-readiness-package-sync.md`, updates adoption-facing release truth, and leaves proof-harness v2 work out of scope.
