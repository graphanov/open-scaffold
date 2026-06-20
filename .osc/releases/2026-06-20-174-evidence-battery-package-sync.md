# Release / Evidence Note: 174-evidence-battery-package-sync

## Summary

`open-scaffold@0.33.0` is published to npm as `latest` (with build provenance), and GitHub Release `v0.33.0 — Evidence battery package sync` is published as Latest. This minor release publishes the fail-closed evidence battery from PR #226 to the public npm and GitHub release surfaces, so public package users get the new `evidence_battery` proof-manifest gate (fail-closed required evidence, `not_evaluated` empty batteries, `required_evidence` omission/status/trim enforcement, and a proof-battery table in `osc prove compare`). This closeout records the post-merge publication proof; the candidate release-sync state was carried by PR #228.

## Traceability

- Roadmap / issue / task: owner-approved package sync after PR #226 fail-closed evidence battery merged to `main`.
- Source PR: https://github.com/graphanov/open-scaffold/pull/226 (squash-merged as `55644b8`).
- Source plan: `.osc/plans/done/173-codex-token-efficiency-proof.md`.
- Release-sync plan: `.osc/plans/done/174-evidence-battery-package-sync.md`.
- Release-sync PR: https://github.com/graphanov/open-scaffold/pull/228 (squash-merged as `d250e3a`); latest head `4f7ea49` Codex clean at `2026-06-20T15:18:39Z`, unresolved review threads `0`.
- Trusted publishing run: https://github.com/graphanov/open-scaffold/actions/runs/27875553205 (`Publish npm package`, `workflow_dispatch`, `expected-version=0.33.0`, tag `latest`).
- GitHub Release: https://github.com/graphanov/open-scaffold/releases/tag/v0.33.0 (Latest).
- npm: https://www.npmjs.com/package/open-scaffold/v/0.33.0 (`latest: 0.33.0`).
- Target commit: `d250e3a1bebaa09c4105ce9fa11af1f206453447` (release-sync PR #228 merge on `main`).

## Verification

Baseline live-truth inspection before release-sync edits:

- `git fetch --prune origin && git checkout main && git pull --ff-only origin main` — PASS: local `main` fast-forwarded to PR #226 squash merge `55644b8`.
- `node -p "require('./package.json').version"` — PASS before candidate bump: `0.32.1`.
- `npm view open-scaffold version dist-tags --json --prefer-online` — PASS before candidate bump: live registry `0.32.1`, `latest: 0.32.1`.
- `gh release list --repo graphanov/open-scaffold --limit 3` — PASS before candidate bump: `v0.32.1 — Public-readiness package sync` was Latest.
- PR #226 post-merge `main` CI — PASS: `ci` success for `55644b8`.
- PR #226 latest-head Codex review — PASS: clean artifact at `2026-06-20T13:31:09Z` for head `f84a4343e4`, unresolved review threads `0`.

Candidate and PR gates before merge (PR #228, head `4f7ea49`):

- [x] Version alignment — PASS: `0.33.0 / 0.33.0 / 0.33.0` for `package.json`, `package-lock.json` root, and `packages[""]` lockfile version.
- [x] Live registry check before publication — PASS: `open-scaffold@0.33.0` not yet published; current live registry `0.32.1`, `latest: 0.32.1`.
- [x] `npm ci` — PASS.
- [x] `git diff --check` — PASS.
- [x] `./verify.sh --strict` — PASS: 10 pass / 0 fail / 0 warn.
- [x] `npm test -- --run` — PASS: 48 files / 563 tests.
- [x] `npm run build` — PASS.
- [x] `npm run osc -- doctor --check secret-scan` — PASS.
- [x] `npm pack --dry-run --json` payload inspection — PASS for `open-scaffold@0.33.0` (226 files; `dist/cli.js`, README, `docs/STABILITY.md`, `docs/CHANGELOG.md` present; no `.pyc`/`__pycache__`/raw `.ts` residue).
- [x] `npm publish --dry-run --tag latest` — PASS for `open-scaffold@0.33.0`; dry-run only.
- [x] Release-sync PR CI green on the PR head; latest-head Codex review PASS (no remaining actionable issues on `4f7ea49` at `2026-06-20T15:18:39Z`); unresolved review threads `0` after closeout.

Post-merge and publication gates:

- [x] Release-sync PR #228 merged to `main` — PASS: squash-merged as `d250e3a1bebaa09c4105ce9fa11af1f206453447` at `2026-06-20T15:28:35Z`.
- [x] Post-merge local `main` fast-forward — PASS: fast-forwarded to `d250e3a`.
- [x] Post-merge `main` CI — PASS: `ci` success for `d250e3a` (run `27875541958`).
- [x] Trusted publishing workflow `publish-npm.yml` (`expected-version=0.33.0`, tag `latest`) — PASS: run `27875553205` completed/success; all steps green (install, build, test, `verify.sh --strict`, version validation, `npm publish --provenance`).
- [x] `npm view open-scaffold version` returns `0.33.0`; `latest: 0.33.0` — PASS.
- [x] Fresh isolated-cache `npx open-scaffold@latest` — PASS: installs `open-scaffold@0.33.0` and `--help` renders `osc — Open Scaffold CLI`.
- [x] GitHub Release `v0.33.0` is Latest — PASS: https://github.com/graphanov/open-scaffold/releases/tag/v0.33.0.
- [x] Repo About (description, homepage, topics) — PASS: current, no change required for this release.

## Outcome

`open-scaffold@0.33.0` is published to npm as `latest` with provenance, and GitHub Release `v0.33.0` is Latest, superseding `v0.32.1`. The fail-closed evidence-battery gate is now on the public package surface. The Codex 2x cold-resume claim remains bounded to its single fixture; this release adds the fail-closed evidence-battery gate, not a broader proof claim. Plan `174-evidence-battery-package-sync` remains in `.osc/plans/done/` with its acceptance criteria (release-sync preparation) met; publication was the owner-approved follow-through recorded in this evidence note.
