# Release / Evidence Note: 128-methodology-pr-summary-ab-package-sync

## Summary

Publishes `open-scaffold@0.20.2` as the package/public-surface sync for the methodology evidence and reviewer evidence commands now present on `main`.

This release makes three local commands available through fresh installs:

- `osc study [--json] [--since <date>] [--out <path>]` — source-labeled methodology evidence/self-study read model.
- `osc pr-summary <plan-slug> [--format <markdown|json>]` — reviewer-ready plan/evidence summary mirror.
- `osc ab check <path>` — structural A/B pilot packet validator.

The A/B command remains an instrument validator only: it does not run an experiment, collect outcomes, score arms, prove causation, or claim that Open Scaffold improves any outcome.

## Traceability

- Source plan: `.osc/plans/done/125-methodology-evidence-harness.md`.
- Source evidence note: `.osc/releases/2026-05-29-125-methodology-evidence-harness.md`.
- Source Pull Request: https://github.com/graphanov/open-scaffold/pull/145.
- Source merge commit: `a27bf64ebec3c8393ab5bd3fdeb2e7b87a298c1c`.
- Source plan: `.osc/plans/done/126-pr-native-evidence-surface.md`.
- Source evidence note: `.osc/releases/2026-05-29-126-pr-native-evidence-surface.md`.
- Source plan: `.osc/plans/done/127-ab-comparison-pilot-harness.md`.
- Source evidence note: `.osc/releases/2026-05-29-127-ab-comparison-pilot-harness.md`.
- Source Pull Request: https://github.com/graphanov/open-scaffold/pull/146.
- Source merge commit: `d0895744d1010d7ce54ae1c8d8d0c38b73b40e48`.
- Release-sync plan: `.osc/plans/done/128-methodology-pr-summary-ab-package-sync.md`.
- Release-sync branch: `release/package-sync-0202`.
- Release-sync Pull Request: https://github.com/graphanov/open-scaffold/pull/147.
- Release-sync merge commit: `542db9bddb6ee4c51f3e6ab20d119ae2da306a5b`.
- Trusted publishing workflow: https://github.com/graphanov/open-scaffold/actions/runs/26627017065.
- npm package: `open-scaffold@0.20.2` with dist-tag `latest`.
- GitHub Release: https://github.com/graphanov/open-scaffold/releases/tag/v0.20.2.
- Run ID / run packet: N/A for release-sync.

## Verification

Candidate gates completed before PR-ready:

- [x] `node -p "require('./package.json').version + ' / ' + require('./package-lock.json').version + ' / ' + require('./package-lock.json').packages[''].version"` — PASS: `0.20.2 / 0.20.2 / 0.20.2`.
- [x] `npm view open-scaffold version dist-tags versions --json --prefer-online` — PASS before publish: live npm remains `0.20.1`, `latest: 0.20.1`, and `0.20.2` is not in the published versions list.
- [x] `npm run build` — PASS.
- [x] `node dist/cli.js --help` — PASS: includes `osc study`, `osc pr-summary`, and `osc ab check`.
- [x] `npm run osc -- plan validate .osc/plans/active/128-methodology-pr-summary-ab-package-sync.md` — PASS: `0 issues found`.
- [x] `./verify.sh --strict` — PASS in the release-sync worktree: 9 pass / 0 fail / 1 worktree immutability warning; PASS from a fresh clone of `release/package-sync-0202`: 10 pass / 0 fail / 0 warn.
- [x] `node dist/cli.js pr-summary 126-pr-native-evidence-surface` — PASS: renders the PR summary marker, done stage, and 5/5 checked AC.
- [x] `node dist/cli.js ab check docs/examples/ab-comparison` — PASS: packet well-formed, with explicit no-experiment/no-outcome claim wording.
- [x] `npm test -- --run` — PASS: 50 files / 481 tests.
- [x] `npm pack --dry-run --json` — PASS for `open-scaffold@0.20.2` (177 files); includes `dist/study.js`, `dist/study.d.ts`, `dist/pr-summary.js`, `dist/pr-summary.d.ts`, `dist/ab.js`, `dist/ab.d.ts`, `docs/AB_COMPARISON_PILOT.md`, and the A/B example packet files.
- [x] `npm publish --dry-run --tag latest` — PASS for `open-scaffold@0.20.2` with `latest` tag in dry-run mode.
- [x] `git diff --check` — PASS.
- [x] PR CI and latest-head Codex review — PASS; Codex reported no major issues on PR #147 head `73cccea` before merge.

Post-merge/publication gates after owner approval:

- [x] Sync clean `main` after merge — PASS at `542db9bddb6ee4c51f3e6ab20d119ae2da306a5b`.
- [x] Trusted publishing workflow publishes `open-scaffold@0.20.2` with workflow input `npm-tag=latest` — PASS: run `26627017065` succeeded.
- [x] `npm view open-scaffold version dist-tags --json --prefer-online` reports `0.20.2` and `latest: 0.20.2`.
- [x] Fresh isolated-cache `npx --yes open-scaffold@latest --help` exposes `osc study`, `osc pr-summary`, and `osc ab check`.
- [x] Fresh isolated-cache command-specific smoke tests prove the published package surfaces print expected help/usage/error text.
- [x] GitHub Release `v0.20.2` is created/marked Latest.
- [x] Release-sync plan is closed to `done/` with final public proof.

## Outcome

PR #147 merged, trusted publishing succeeded, npm `open-scaffold@latest` now resolves to `0.20.2`, fresh isolated-cache `npx` exposes the expected public commands, GitHub Release `v0.20.2` is Latest, and the release-sync plan is closed.

## Follow-up

- Optional deferred decision: whether to run the actual A/B pilot using the package-visible packet after public release.
- Optional deferred decision: whether to deprecate historical `1.0.x` npm versions with a gentle cadence-correction message, or leave them as published history.
