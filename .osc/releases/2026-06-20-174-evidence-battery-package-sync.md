# Release / Evidence Note: 174-evidence-battery-package-sync

## Summary

Release-sync prepared for `open-scaffold@0.33.0`. This minor release will publish the fail-closed evidence battery from PR #226 to the public npm and GitHub release surfaces via owner-approved trusted publishing after merge, so public package users get the new `evidence_battery` proof-manifest gate (fail-closed required evidence, `not_evaluated` empty batteries, `required_evidence` omission/status/trim enforcement, and a proof-battery table in `osc prove compare`). `open-scaffold@0.33.0` is not yet published; npm `latest` and GitHub Release Latest remain `v0.32.1` until the post-merge publication follow-through completes.

## Traceability

- Roadmap / issue / task: owner-approved package sync after PR #226 fail-closed evidence battery merged to `main`.
- Source PR: https://github.com/graphanov/open-scaffold/pull/226 (squash-merged as `55644b8`).
- Source plan: `.osc/plans/done/173-codex-token-efficiency-proof.md`.
- Release-sync plan: `.osc/plans/done/174-evidence-battery-package-sync.md`.
- Release-sync PR: to be recorded in release follow-through closeout.
- Trusted publishing run: to be recorded in release follow-through closeout.
- GitHub Release: to be recorded in release follow-through closeout (`v0.33.0`).
- Target commit: release-sync PR merge commit (to be recorded in closeout).

## Verification

Baseline live-truth inspection before release-sync edits:

- `git fetch --prune origin && git checkout main && git pull --ff-only origin main` — PASS: local `main` fast-forwarded to PR #226 squash merge `55644b8`.
- `node -p "require('./package.json').version"` — PASS before candidate bump: `0.32.1`.
- `npm view open-scaffold version dist-tags --json --prefer-online` — PASS before candidate bump: live registry `0.32.1`, `latest: 0.32.1`.
- `gh release list --repo graphanov/open-scaffold --limit 3` — PASS before candidate bump: `v0.32.1 — Public-readiness package sync` was Latest.
- PR #226 post-merge `main` CI — PASS: `ci` success for `55644b8`.
- PR #226 latest-head Codex review — PASS: clean artifact at `2026-06-20T13:31:09Z` for head `f84a4343e4`, unresolved review threads `0`.

Candidate and PR gates before merge:

- [x] Version alignment — PASS: `0.33.0 / 0.33.0 / 0.33.0` for `package.json`, `package-lock.json` root, and `packages[""]` lockfile version.
- [x] Live registry check before publication — PASS: `open-scaffold@0.33.0` not yet published; current live registry `0.32.1`, `latest: 0.32.1`.
- [x] `npm ci` — PASS (candidate).
- [x] `git diff --check` — PASS.
- [x] `./verify.sh --strict` — PASS (candidate; recorded in closeout after any corpus-hash update).
- [x] `npm test -- --run` — PASS (candidate; test count recorded in closeout).
- [x] `npm run build` — PASS (candidate).
- [x] `npm run osc -- doctor --check secret-scan` — PASS (candidate).
- [x] `npm pack --dry-run --json` payload inspection — PASS (candidate) for `open-scaffold@0.33.0`.
- [x] `npm publish --dry-run --tag latest` — PASS (candidate) for `open-scaffold@0.33.0`; dry-run only.
- [x] Release-sync PR CI green on the PR head (final head SHA recorded in post-merge closeout).

Post-merge and publication gates (recorded in release follow-through closeout):

- [ ] Release-sync PR merged to `main` (merge SHA recorded in closeout).
- [ ] Post-merge local `main` fast-forward — recorded in closeout.
- [ ] Post-merge `main` CI — recorded in closeout.
- [ ] Trusted publishing workflow `publish-npm.yml` (expected-version `0.33.0`, tag `latest`) — recorded in closeout.
- [ ] `npm view open-scaffold version` returns `0.33.0`; `latest: 0.33.0` — recorded in closeout.
- [ ] Fresh isolated-cache `npx open-scaffold@latest --version` returns `0.33.0` — recorded in closeout.
- [ ] GitHub Release `v0.33.0` is Latest — recorded in closeout.

## Outcome

Release-sync prepared for `open-scaffold@0.33.0`. Owner-approved npm trusted publishing and GitHub Release `v0.33.0` Latest follow-through is scoped for this release and executes immediately after merge. Final publication proof — trusted publishing workflow run, npm registry confirmation, fresh `npx open-scaffold@latest --version` smoke, and GitHub Release `v0.33.0` Latest — is recorded in the release follow-through closeout. The Codex 2x cold-resume claim remains bounded to its single fixture; this release adds the fail-closed evidence-battery gate, not a broader proof claim.
