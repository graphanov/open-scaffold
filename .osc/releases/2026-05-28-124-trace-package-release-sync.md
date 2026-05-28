# Release / Evidence Note: 124-trace-package-release-sync

## Summary

Publishes `open-scaffold@0.20.1` as the package/public-surface sync for the `osc trace <plan-slug>` work-record replay command.

The release keeps the forward-moving public package cadence in the `0.20.x` line and makes the trace command available through fresh `npx open-scaffold@latest` installs. `osc trace` remains local, read-only, and non-authoritative: it reconstructs local work-record links and does not call GitHub, verify evidence quality, approve work, merge, publish, or claim trust/provenance.

## Traceability

- Source plan: `.osc/plans/done/117-osc-trace-work-record-replay.md`.
- Source evidence note: `.osc/releases/2026-05-28-117-osc-trace-work-record-replay.md`.
- Source Pull Request: https://github.com/graphanov/open-scaffold/pull/142.
- Source merge commit: `5bd33e96d7b34e24d74ecbb4a618060a9f009566`.
- Release-sync plan: `.osc/plans/done/124-trace-package-release-sync.md`.
- Release-sync branch: `release/trace-package-sync-0201`.
- Release-sync Pull Request: https://github.com/graphanov/open-scaffold/pull/143.
- Release-sync merge commit: `161c968a1d342be6b89c05c6da4a31bde8e8c395`.
- Trusted publishing workflow: https://github.com/graphanov/open-scaffold/actions/runs/26603167168.
- npm package: `open-scaffold@0.20.1` with dist-tag `latest`.
- GitHub Release: https://github.com/graphanov/open-scaffold/releases/tag/v0.20.1.
- Run ID / run packet: N/A for release-sync.

## Verification

Candidate gates completed before PR-ready:

- [x] `node -p "require('./package.json').version + ' / ' + require('./package-lock.json').version + ' / ' + require('./package-lock.json').packages[''].version"` — PASS: `0.20.1 / 0.20.1 / 0.20.1`.
- [x] `npm view open-scaffold version dist-tags versions --json` — PASS before publish: live npm was `0.20.0`, `latest: 0.20.0`, and `0.20.1` was not in the published versions list.
- [x] `npm run build` — PASS.
- [x] `node dist/cli.js --help` — PASS: includes `osc trace <plan-slug> [--json] [--include-unverified]`.
- [x] `./verify.sh --strict` — PASS: 10 pass / 0 fail / 0 warn.
- [x] `npm test -- --run` — PASS: 47 files / 426 tests.
- [x] `npm pack --dry-run --json` — PASS for `open-scaffold@0.20.1` (162 files); includes `dist/trace.js`, `dist/trace.d.ts`, and `docs/TRACE.md`.
- [x] `npm publish --dry-run --tag latest` — PASS for `open-scaffold@0.20.1` with `latest` tag in dry-run mode.
- [x] `git diff --check` — PASS.
- [x] PR CI and latest-head Codex review — PASS: PR #143 checks were green, Codex reported no major issues, and unresolved current Codex review threads were `0`.

Post-merge/publication gates completed after owner approval:

- [x] Sync clean `main` after merge — PASS: local `main` fast-forwarded to `161c968a1d342be6b89c05c6da4a31bde8e8c395`.
- [x] Trusted publishing workflow publishes `open-scaffold@0.20.1` with workflow input `npm-tag=latest` — PASS: workflow run `26603167168` succeeded.
- [x] `npm view open-scaffold version dist-tags --json --prefer-online` reports `0.20.1` and `latest: 0.20.1` — PASS.
- [x] Fresh isolated-cache `npx --yes open-scaffold@latest --help` exposes `osc trace <plan-slug> [--json] [--include-unverified]` — PASS.
- [x] Fresh isolated-cache `npx --yes open-scaffold@latest trace` prints trace usage from the published package — PASS.
- [x] Fresh isolated-cache `npm exec --yes --package open-scaffold@latest -- open-scaffold trace 117-osc-trace-work-record-replay --json` works from the repository and reports plan `117-osc-trace-work-record-replay` as `done` — PASS.
- [x] GitHub Release `v0.20.1` is created/marked Latest — PASS.
- [x] Release-sync plan can be closed to `done/` with final public proof — PASS in this closeout branch.

## Outcome

Complete. PR #143 merged, trusted publishing moved npm `latest` to `0.20.1`, fresh isolated-cache `npx` verified the public trace command surface, GitHub Release `v0.20.1` is marked Latest, and plan `124` is closed with final evidence.

## Follow-up

Optional deferred decision: whether to deprecate historical `1.0.x` npm versions with a gentle cadence-correction message, or leave them as published history.
