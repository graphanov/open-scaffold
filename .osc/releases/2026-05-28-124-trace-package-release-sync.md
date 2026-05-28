# Release / Evidence Note: 124-trace-package-release-sync

## Summary

Prepares `open-scaffold@0.20.1` as the package/public-surface sync for the newly merged `osc trace <plan-slug>` work-record replay command.

The candidate keeps the forward-moving public package cadence in the `0.20.x` line. It does not publish to npm or create a GitHub Release; those remain owner-approved follow-through gates after merge.

## Traceability

- Source plan: `.osc/plans/done/117-osc-trace-work-record-replay.md`.
- Source evidence note: `.osc/releases/2026-05-28-117-osc-trace-work-record-replay.md`.
- Source Pull Request: https://github.com/graphanov/open-scaffold/pull/142.
- Source merge commit: `5bd33e96d7b34e24d74ecbb4a618060a9f009566`.
- Release-sync plan: `.osc/plans/active/124-trace-package-release-sync.md`.
- Release-sync branch: `release/trace-package-sync-0201`.
- Release-sync Pull Request: pending.
- Run ID / run packet: N/A for release-sync.
- npm precheck: before candidate publish, live `latest` is `open-scaffold@0.20.0`; `0.20.1` is not yet published.

## Verification

Candidate gates completed before PR-ready:

- [x] `node -p "require('./package.json').version + ' / ' + require('./package-lock.json').version + ' / ' + require('./package-lock.json').packages[''].version"` — PASS: `0.20.1 / 0.20.1 / 0.20.1`.
- [x] `npm view open-scaffold version dist-tags versions --json` — PASS: live npm remains `0.20.0`, `latest: 0.20.0`, and `0.20.1` is not in the published versions list.
- [x] `npm run build` — PASS.
- [x] `node dist/cli.js --help` — PASS: includes `osc trace <plan-slug> [--json] [--include-unverified]`.
- [x] `./verify.sh --strict` — PASS: 10 pass / 0 fail / 0 warn.
- [x] `npm test -- --run` — PASS: 47 files / 426 tests.
- [x] `npm pack --dry-run --json` — PASS for `open-scaffold@0.20.1` (162 files); includes `dist/trace.js`, `dist/trace.d.ts`, and `docs/TRACE.md`.
- [x] `npm publish --dry-run --tag latest` — PASS for `open-scaffold@0.20.1` with `latest` tag in dry-run mode.
- [x] `git diff --check` — PASS.
- [ ] PR CI and latest-head Codex review — pending after PR creation.

Post-merge/publication gates, if the owner approves follow-through:

- [ ] Sync clean `main` after merge.
- [ ] Trusted publishing workflow publishes `open-scaffold@0.20.1` with workflow input `npm-tag=latest` if required.
- [ ] `npm view open-scaffold version dist-tags --json` reports `latest: 0.20.1`.
- [ ] Fresh isolated-cache `npx --yes open-scaffold@latest --help` exposes `osc trace`.
- [ ] Fresh isolated-cache `npx --yes open-scaffold@latest trace 117-osc-trace-work-record-replay --json` works from a repo with the merged plan/evidence, or equivalent local package smoke confirms the command surface.
- [ ] GitHub Release `v0.20.1` is created/marked Latest.
- [ ] Release-sync plan can be closed to `done/` with final public proof.

## Outcome

Candidate in progress. This PR prepares package metadata and adoption-facing evidence only. npm publish, GitHub Latest Release, and final closeout remain separate owner-gated steps.

## Follow-up

After owner-approved merge and public package surfaces are aligned, close plan `124` with final npm/GitHub Release proof in a tiny closeout PR if needed.
