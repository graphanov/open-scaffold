# Release / Evidence Note: 172-public-readiness-package-sync

## Summary

Release-sync candidate for `open-scaffold@0.32.1`. This patch release publishes the public-readiness hardening from PR #219 plus the clean Dependabot lockfile update from PR #218 to npm/GitHub release surfaces, so public package metadata matches the repo's current pre-1.0, proof-boundary-aware positioning.

## Traceability

- Roadmap / issue / task: owner-approved package sync after PR #219 public-readiness hardening and PR #218 dev-dependency lockfile update.
- Source PRs: https://github.com/graphanov/open-scaffold/pull/219 and https://github.com/graphanov/open-scaffold/pull/218.
- Release-sync plan: `.osc/plans/active/172-public-readiness-package-sync.md` until publication proof exists.
- Run ID / run packet: N/A; scoped release/package sync with local and GitHub workflow verification.
- Branch / PR: `release/public-readiness-0.32.1`; https://github.com/graphanov/open-scaffold/pull/220.

## Verification

Baseline live-truth inspection before release-sync edits:

- `git fetch --prune origin && git checkout main && git pull --ff-only origin main` — PASS: local `main` fast-forwarded through PR #219 merge commit `3705667e50723747c7c4a0fdb121f61a07497638`, then PR #218 merge commit `936c2ce9e880dbbc427c566d7cf1adf075eb5d4e`.
- `git status --short --branch` — PASS: clean `main...origin/main` before candidate branch.
- `node -p "require('./package.json').version"` — PASS before candidate bump: `0.32.0`.
- `npm view open-scaffold version description keywords dist-tags --json --prefer-online` — PASS before candidate bump: live registry still `0.32.0` with old package metadata and `latest: 0.32.0`.
- `gh release list --repo graphanov/open-scaffold --limit 3` — PASS before candidate bump: `v0.32.0 — Ambient capture package sync` was Latest.
- PR #219 post-merge `main` CI — PASS.
- PR #218 pre-merge checks and post-merge `main` CI — PASS.

Candidate gates before PR-ready:

- [x] Version alignment — PASS: `0.32.1 / 0.32.1 / 0.32.1` for `package.json`, `package-lock.json`, and lockfile root package version.
- [x] Live registry check before publication — PASS: `open-scaffold@0.32.1` returned 404 / not published; current live registry reports `0.32.0`, `latest: 0.32.0`, and old metadata.
- [x] `npm ci` — PASS: 51 packages installed/audited; 0 vulnerabilities.
- [x] `git diff --check` — PASS.
- [x] `./verify.sh --strict` — PASS: 10 pass / 0 fail / 0 warn after the intentional live-corpus hash update.
- [x] `npm test -- --run` — PASS: 48 files / 535 tests.
- [x] `npm run build` — PASS: core TypeScript build and runtime-omx build.
- [x] `npm run osc -- doctor --check secret-scan` — PASS: `PASS secret-scan: no obvious token/webhook strings found.`
- [x] `npm pack --dry-run --json` payload inspection — PASS for `open-scaffold@0.32.1`; entry count 205; required `dist/cli.js`, `README.md`, `docs/CHANGELOG.md`, `docs/PROOF_HARNESS.md`, `docs/STABILITY.md`, and `docs/START_HERE.md` present; no `__pycache__`/`.pyc` files.
- [x] `npm publish --dry-run --tag latest` — PASS for `open-scaffold@0.32.1` with tag `latest`; dry-run only.
- [ ] Release-sync PR opened, merged, npm trusted publishing run completed, fresh `npx open-scaffold@latest --version` returns `0.32.1`, fresh help smokes passed, and GitHub Release `v0.32.1` created as Latest — pending.

## Outcome

Candidate in progress. Publication, GitHub Release creation/Latest movement, final closeout, and public verification are owner-preapproved for this scoped release sync, but not yet executed in this evidence note.

## Follow-up

- Open and merge the release-sync PR after candidate gates pass.
- Dispatch trusted publishing for `open-scaffold@0.32.1` with npm tag `latest`.
- Verify npm registry metadata, fresh isolated-cache `npx open-scaffold@latest --version` plus help smokes, GitHub Release `v0.32.1` as Latest, and then close this plan with final proof.
