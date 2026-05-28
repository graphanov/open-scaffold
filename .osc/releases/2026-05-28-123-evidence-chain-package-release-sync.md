# Release / Evidence Note: 123-evidence-chain-package-release-sync

## Summary

Publishes `open-scaffold@0.20.0` as the package/public-surface sync for `osc verify --evidence-chain` and the latest first-read `osc compare` help grouping.

This release intentionally corrects the public version cadence back to pre-1.0 hardening. Historical `1.0.x` packages and GitHub Releases remain published history, while the forward-moving `latest` channel is now `0.20.0`.

## Traceability

- Roadmap / issue / task: Context Authority prerequisite package sync before `117-osc-trace-work-record-replay`.
- Source plan: `.osc/plans/done/071-evidence-chain-verifier.md`.
- Source evidence note: `.osc/releases/2026-05-27-071-evidence-chain-verifier.md`.
- Source Pull Request: https://github.com/graphanov/open-scaffold/pull/137.
- First-read compare docs/help source Pull Request: https://github.com/graphanov/open-scaffold/pull/138.
- Runtime-control-loop decision source Pull Request: https://github.com/graphanov/open-scaffold/pull/139.
- Release-sync plan: `.osc/plans/done/123-evidence-chain-package-release-sync.md`.
- Release-sync branch: `release/evidence-chain-package-sync-020`.
- Release-sync Pull Request: https://github.com/graphanov/open-scaffold/pull/140.
- Run ID / run packet: N/A for release-sync.
- npm precheck: before publish, live `latest` was `open-scaffold@1.0.5`; `0.20.0` was not yet published.
- Trusted publishing run: https://github.com/graphanov/open-scaffold/actions/runs/26570236888.
- npm final state: `open-scaffold@latest` is `0.20.0`.
- GitHub Release: https://github.com/graphanov/open-scaffold/releases/tag/v0.20.0.
- Closeout Pull Request: https://github.com/graphanov/open-scaffold/pull/141.

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
- [x] PR CI and latest-head Codex review — PASS on PR #140 after the final push; no unresolved current review threads.

Post-merge/publication gates, if the owner approves follow-through:

- [x] Sync clean `main` after merge — PASS at `ebf69e24a22a7980e4d23fa289aa7dacae4637c0`.
- [x] Trusted publishing workflow publishes `open-scaffold@0.20.0` with workflow input `npm-tag=latest` — PASS, run https://github.com/graphanov/open-scaffold/actions/runs/26570236888.
- [x] `npm view open-scaffold version dist-tags --json` reports `latest: 0.20.0` — PASS.
- [x] Fresh isolated-cache `npx --yes open-scaffold@latest verify --help` exposes `--evidence-chain` — PASS.
- [x] Fresh isolated-cache `npx --yes open-scaffold@latest --help` exposes the first-read `osc compare` grouping — PASS.
- [x] Fresh isolated-cache `npx --yes open-scaffold@latest init --tier min --target <tmp>` creates the expected min-tier scaffold files — PASS.
- [x] GitHub Release `v0.20.0` is created/marked Latest — PASS.
- [x] Release-sync plan can be closed to `done/` with final public proof — completed in closeout PR.

## Outcome

Complete. PR #140 merged, trusted publishing moved npm `latest` to `0.20.0`, fresh isolated-cache `npx` verified the public command surface, and GitHub Release `v0.20.0` is marked Latest. Historical `1.0.x` releases remain published history; optional npm deprecation of those versions is deferred.

## Follow-up

After public package surfaces are aligned, resume `117-osc-trace-work-record-replay`. Optional follow-up decision: whether to deprecate the historical `1.0.x` npm versions with a clear pre-1.0 cadence-correction message, or simply leave them as published history.
