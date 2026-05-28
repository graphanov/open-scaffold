# Release / Evidence Note: 123-evidence-chain-package-release-sync

## Summary

Prepares `open-scaffold@0.20.0` as the package/public-surface sync for `osc verify --evidence-chain` and the latest first-read `osc compare` help grouping.

This release candidate intentionally corrects the public version cadence back to pre-1.0 hardening. Historical `1.0.x` packages and GitHub Releases remain published history, but the intended forward-moving `latest` channel should be `0.20.0` after owner-approved publish and GitHub Release follow-through.

## Traceability

- Roadmap / issue / task: Context Authority prerequisite package sync before `117-osc-trace-work-record-replay`.
- Source plan: `.osc/plans/done/071-evidence-chain-verifier.md`.
- Source evidence note: `.osc/releases/2026-05-27-071-evidence-chain-verifier.md`.
- Source Pull Request: https://github.com/graphanov/open-scaffold/pull/137.
- First-read compare docs/help source Pull Request: https://github.com/graphanov/open-scaffold/pull/138.
- Runtime-control-loop decision source Pull Request: https://github.com/graphanov/open-scaffold/pull/139.
- Release-sync plan: `.osc/plans/active/123-evidence-chain-package-release-sync.md`.
- Release-sync branch: `release/evidence-chain-package-sync-020`.
- Release-sync Pull Request: https://github.com/graphanov/open-scaffold/pull/140.
- Run ID / run packet: N/A for release-sync.
- npm precheck: current live `latest` is `open-scaffold@1.0.5`; `0.20.0` is not yet published.

## Verification

Candidate gates completed before PR-ready:

- [x] `node -p "require('./package.json').version + ' / ' + require('./package-lock.json').version + ' / ' + require('./package-lock.json').packages[''].version"` — PASS: `0.20.0 / 0.20.0 / 0.20.0`.
- [x] `npm view open-scaffold version dist-tags versions --json` — PASS: live npm remains `1.0.5`, `latest: 1.0.5`, and `0.20.0` is not in the published versions list.
- [x] `npm run build` — PASS.
- [x] `node dist/cli.js verify --help` — PASS: includes `osc verify [--evidence-chain [--plan <slug>] [--json] [--strict]]`.
- [x] `node dist/cli.js --help` — PASS: top-level help starts with the first-read `osc compare <attempt-a-dir> <attempt-b-dir> [--json] [--output <path>]` grouping.
- [x] `./verify.sh --strict` — PASS: 10 pass / 0 fail / 0 warn.
- [x] `npm test` — PASS: 46 files / 412 tests.
- [x] `npm pack --dry-run --json` — PASS for `open-scaffold@0.20.0` (159 files); includes `dist/evidence-chain.js` and `dist/compare.js`.
- [x] `npm publish --dry-run` — EXPECTED FAIL for cadence correction: npm refuses to implicitly apply `latest` to lower semver `0.20.0` while `1.0.5` is published.
- [x] `npm publish --dry-run --tag latest` — PASS; real trusted publishing must pass `npm-tag=latest` explicitly.
- [x] `git diff --check` — PASS.
- [ ] PR CI and latest-head Codex review — evaluated in the PR conversation after the final push, so this evidence note does not freeze a stale head SHA.

Post-merge/publication gates, if the owner approves follow-through:

- [ ] Sync clean `main` after merge.
- [ ] Trusted publishing workflow publishes `open-scaffold@0.20.0` with workflow input `npm-tag=latest`.
- [ ] `npm view open-scaffold version dist-tags --json` reports `latest: 0.20.0`.
- [ ] Fresh isolated-cache `npx --yes open-scaffold@latest verify --help` exposes `--evidence-chain`.
- [ ] Fresh isolated-cache `npx --yes open-scaffold@latest --help` exposes the first-read `osc compare` grouping.
- [ ] GitHub Release `v0.20.0` is created/marked Latest.
- [ ] Release-sync plan can be closed to `done/` with final public proof.

## Outcome

Candidate preparation in progress. Publication is not complete until the owner approves merge, trusted npm publishing, fresh `npx` verification, GitHub Release Latest movement, and closeout.

## Follow-up

After public package surfaces are aligned, resume `117-osc-trace-work-record-replay`. Optional follow-up decision: whether to deprecate the historical `1.0.x` npm versions with a clear pre-1.0 cadence-correction message, or simply leave them as published history.
