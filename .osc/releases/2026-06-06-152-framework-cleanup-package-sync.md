# Release / Evidence Note: 152-framework-cleanup-package-sync

## Summary

Release-sync candidate for publishing the merged framework cleanup shrink as `open-scaffold@0.31.0`.

The package-visible change is a narrowed/reduced Open Scaffold CLI/source surface after PR #183, with shipped migration breadcrumbs and preserved protected core behavior. This release remains pre-1.0 hardening: it does not claim runtime execution, model improvement, benchmark proof, compliance certification, production readiness, or a mature 1.0 contract.

## Traceability

- Roadmap / issue / task: framework cleanup shrink / package public-surface sync after PR #183 and PR #184.
- Source plan: `.osc/plans/done/151-framework-cleanup-shrink.md`.
- Source PR: https://github.com/graphanov/open-scaffold/pull/183.
- Source closeout PR: https://github.com/graphanov/open-scaffold/pull/184.
- Release-sync plan: `.osc/plans/active/152-framework-cleanup-package-sync.md`.
- Run ID / run packet: N/A for this scoped package/release sync.
- Branch / PR: `release/0.31.0-framework-cleanup-sync`; PR pending.

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
- [ ] Release candidate PR CI and review/thread gate — pending.

Post-merge/publication gates after owner-approved follow-through:

- [ ] Sync clean `main` after release PR merge.
- [ ] Main CI for release commit.
- [ ] Post-merge local publish gates.
- [ ] Trusted publishing workflow publishes `open-scaffold@0.31.0` with dist-tag `latest`.
- [ ] `npm view open-scaffold version dist-tags --json --prefer-online` reports `0.31.0`, `latest: 0.31.0`.
- [ ] Fresh isolated-cache `npx --yes open-scaffold@latest --help` from an external temp directory passes.
- [ ] Fresh isolated-cache smoke proves removed/repositioned command guidance from the published package.
- [ ] GitHub Release `v0.31.0` exists, targets the release commit, and is marked Latest.
- [ ] This plan is closed to `done` with final public proof.

## Outcome

Pending. The release-sync branch prepares `open-scaffold@0.31.0`; npm publication and GitHub Release movement are not yet claimed until verified after PR merge and trusted publishing.

## Follow-up

- Merge the release-sync PR only after CI/review gates pass.
- Dispatch trusted publishing for `0.31.0` with npm tag `latest` after the release-sync commit lands on `main`.
- Verify npm/latest, fresh `npx`, GitHub Release Latest, and close this plan to `done` after public proof.
