# Release / Evidence Note: 122-compare-package-release-sync

## Summary

Completed the `open-scaffold@1.0.5` package/public-surface sync for PR #134's `osc compare <attempt-a-dir> <attempt-b-dir>` command.

The source feature reached `main` in PR #134. PR #135 prepared and merged the version/changelog/release-sync candidate. Owner-approved follow-through then published `open-scaffold@1.0.5` via trusted publishing, verified npm/latest and fresh isolated-cache `npx` behavior, created GitHub Release `v1.0.5`, and moved the release-sync plan to `done/`.

## Traceability

- Roadmap / issue / task: adoption wedge / attempt-diff magic moment; package-sync follow-through after PR #134.
- Source plan: `.osc/plans/done/109-bare-attempt-compare.md`.
- Release-sync plan: `.osc/plans/done/122-compare-package-release-sync.md`.
- Run ID / run packet: N/A for release-sync.
- Source Pull Request: https://github.com/graphanov/open-scaffold/pull/134.
- Release-sync Pull Request: https://github.com/graphanov/open-scaffold/pull/135.
- PR #135 merge commit: `3d5e6e22a6d0003eef3cae7b7fadbcb1a0a5eb35`.
- Trusted publishing run: https://github.com/graphanov/open-scaffold/actions/runs/26523258650.
- npm package: `open-scaffold@1.0.5` with `latest: 1.0.5`.
- npm tarball: https://registry.npmjs.org/open-scaffold/-/open-scaffold-1.0.5.tgz.
- GitHub Release: https://github.com/graphanov/open-scaffold/releases/tag/v1.0.5.

## Verification

Pre-publication candidate gates:

- `gh pr view 134 --repo graphanov/open-scaffold --json state,mergedAt,mergeCommit,url` — PASS: PR #134 is merged; merge commit `fc55df6` on local `main`.
- PR #134 checks — PASS: `Validate changed plans`, `Validate evidence notes`, and `ci` passed before merge.
- `git diff --check` after syncing `main` — PASS.
- `node dist/cli.js --help | grep -F 'osc compare <attempt-a-dir> <attempt-b-dir> [--json] [--output <path>]'` — PASS locally after PR #134.
- Fresh isolated-cache `npx --yes open-scaffold@latest --help` — PRECHECK: no `osc compare` command before this release-sync candidate was published.
- `npm view open-scaffold version dist-tags --json` — PRECHECK: npm/latest was `1.0.4` before this release-sync candidate.
- `gh release list --repo graphanov/open-scaffold --limit 5` — PRECHECK: GitHub Latest Release was `v1.0.4 — Work dry-run preview package sync` before this release-sync candidate.
- `node -p "require('./package.json').version"` — PASS on release-sync branch: `1.0.5`.
- `node -p "require('./package-lock.json').version + ' / ' + require('./package-lock.json').packages[''].version"` — PASS: `1.0.5 / 1.0.5`.
- `node dist/cli.js plan validate .osc/plans/active/122-compare-package-release-sync.md` — PASS: 0 issues found.
- `git diff --check` on release-sync branch — PASS.
- `./verify.sh --strict` on release-sync branch — PASS: 10 pass / 0 fail / 0 warn.
- `npm test -- tests/compare.test.ts --run` — PASS: 1 file / 8 tests.
- `npm test` — PASS: 45 files / 396 tests.
- `npm run build` — PASS.
- `node dist/cli.js compare examples/attempt-compare/attempt-a examples/attempt-compare/attempt-b` compared to `examples/attempt-compare/expected.md` — PASS.
- `node dist/cli.js compare examples/attempt-compare/attempt-a examples/attempt-compare/attempt-b --json` parsed as JSON — PASS: schema `open-scaffold.attempt-comparison.v1`.
- `npm pack --dry-run --json` — PASS for `open-scaffold@1.0.5` (156 files); package includes `dist/compare.js` and `dist/compare.d.ts`.
- `npm publish --dry-run` — PASS for `open-scaffold@1.0.5`.
- PR #135 CI and Codex latest-head review — PASS before merge: Validate evidence notes, Validate changed plans, and CI passed; Codex reported no major issues; unresolved review threads were 0.

Post-merge/publication gates:

- `git checkout main && git pull --ff-only origin main` — PASS: local `main` synced to `3d5e6e22a6d0003eef3cae7b7fadbcb1a0a5eb35`.
- `git diff --check` — PASS on synced `main` before publish.
- `./verify.sh --strict` — PASS on synced `main`: 10 pass / 0 fail / 0 warn.
- `npm test -- --run` — PASS on synced `main`: 45 files / 396 tests.
- `npm run build` — PASS on synced `main`.
- `npm pack --dry-run --json` — PASS on synced `main`; package includes `dist/compare.js` and `dist/compare.d.ts`.
- `npm publish --dry-run` — PASS on synced `main`.
- Trusted publishing workflow `publish-npm.yml` — PASS: run `26523258650`, conclusion `success`, head SHA `3d5e6e22a6d0003eef3cae7b7fadbcb1a0a5eb35`.
- `npm view open-scaffold version dist-tags repository homepage bugs keywords --json --prefer-online` — PASS: `version: 1.0.5`, `dist-tags.latest: 1.0.5`.
- `npm view open-scaffold@1.0.5 version dist.integrity dist.tarball --json --prefer-online` — PASS: tarball `https://registry.npmjs.org/open-scaffold/-/open-scaffold-1.0.5.tgz`.
- Fresh isolated-cache `npx --yes open-scaffold@latest --help` from a temp directory — PASS: help includes `osc compare <attempt-a-dir> <attempt-b-dir> [--json] [--output <path>]`.
- Fresh isolated-cache `npx --yes open-scaffold@1.0.5 --help` from a temp directory — PASS: help includes `osc compare <attempt-a-dir> <attempt-b-dir> [--json] [--output <path>]`.
- Fresh isolated-cache `npx --yes open-scaffold@latest compare /Users/danimal/Projects/open-scaffold/examples/attempt-compare/attempt-a /Users/danimal/Projects/open-scaffold/examples/attempt-compare/attempt-b` — PASS: Markdown compare output produced expected diff sections.
- Fresh isolated-cache `npx --yes open-scaffold@latest compare ... --json` — PASS: parsed JSON schema `open-scaffold.attempt-comparison.v1`.
- Fresh isolated-cache `npx --yes open-scaffold@latest init --tier min --target <tmp>` — PASS: created `MISSION.md`, `.osc/RULES.md`, `.osc/plans/WORKFLOW.md`, and `verify.sh` in the target.
- `gh release create v1.0.5 --target 3d5e6e22a6d0003eef3cae7b7fadbcb1a0a5eb35 --latest` — PASS.
- `gh release view v1.0.5 --repo graphanov/open-scaffold --json tagName,name,publishedAt,targetCommitish,url,isDraft,isPrerelease` — PASS: tag `v1.0.5`, target `3d5e6e22a6d0003eef3cae7b7fadbcb1a0a5eb35`, not draft, not prerelease.
- `gh release list --repo graphanov/open-scaffold --limit 5` — PASS at publication time: `v1.0.5 — Compare command package sync` was marked Latest.
- `gh workflow list --repo graphanov/open-scaffold --json id,name,path,state --jq '.[] | select(.path|contains("publish"))'` — PASS: only `.github/workflows/publish-npm.yml` is active for publish.

## Outcome

Published and verified at the time of this release. `open-scaffold@latest` became `1.0.5`; fresh `npx` exposed and ran `osc compare`; GitHub Release `v1.0.5` was marked Latest until superseded by a later release; release-sync plan `122-compare-package-release-sync` is closed to `done/`.

## Follow-up

Resume Context Authority in the order `071-evidence-chain-verifier` → `117-osc-trace-work-record-replay` → reserved Context Authority slices.
