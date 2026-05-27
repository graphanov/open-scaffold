# Release / Evidence Note: 107-work-dry-run-package-sync

## Summary

Published `open-scaffold@1.0.4` as the package/public-surface sync for PR #129's `osc work <task-description> --runtime <preset> --dry-run` preview. The source feature reached `main` in PR #129, the release-sync PR #130 bumped the package to `1.0.4`, trusted publishing updated npm `latest`, and GitHub Release `v1.0.4` is now the Latest release.

## Traceability

- Roadmap / issue / task: Milestone 19 — Post-v1 Codex-first runtime adoption chain; package-sync follow-through after PR #129.
- Source plan: `.osc/plans/done/104-osc-work-dry-run-target.md`.
- Release-sync plan: `.osc/plans/done/107-work-dry-run-package-sync.md`.
- Run ID / run packet: N/A for release-sync.
- Source Pull Request: https://github.com/graphanov/open-scaffold/pull/129.
- Release-sync Pull Request: https://github.com/graphanov/open-scaffold/pull/130.
- Release-sync merge commit: `094688afa9f5f28950665683763a9b00e024d357`.
- Main CI after PR #130: https://github.com/graphanov/open-scaffold/actions/runs/26505195587.
- Trusted publishing run: https://github.com/graphanov/open-scaffold/actions/runs/26505406882.
- GitHub Release: https://github.com/graphanov/open-scaffold/releases/tag/v1.0.4.

## Verification

- `gh pr view 129 --repo graphanov/open-scaffold --json state,mergedAt,mergeCommit,url` — PASS: PR #129 is merged; merge commit `ee4d5507036f4237cc2ca8562f79518b8a6e8660`.
- Main push CI after PR #129 — PASS: https://github.com/graphanov/open-scaffold/actions/runs/26504074783.
- `git diff --check` after syncing `main` — PASS.
- `./verify.sh --strict` after syncing `main` — PASS, 10 pass / 0 fail / 0 warn.
- `npm test` after syncing `main` — PASS, 43 files / 379 tests.
- `npm run build` after syncing `main` — PASS.
- `node dist/cli.js --help | grep -F 'osc work <task-description> --runtime <preset> --dry-run [--json] [--adapter <adapter-id>]'` — PASS locally after PR #129.
- `npm view open-scaffold version dist-tags versions --json` — PRECHECK: npm/latest was `1.0.3` before this release-sync candidate.
- Fresh isolated-cache `npx --yes open-scaffold@latest --help` — PRECHECK: no `osc work` command before this release-sync candidate was published.
- `gh release list --repo graphanov/open-scaffold --limit 5` — PRECHECK: GitHub Latest Release was `v1.0.3 — Dispatch adapter glue`.
- `node -p "require('./package.json').version"` — PASS on release-sync branch: `1.0.4`.
- `node -p "require('./package-lock.json').version + ' / ' + require('./package-lock.json').packages[''].version"` — PASS: `1.0.4 / 1.0.4`.
- `git diff --check` on release-sync branch — PASS.
- `./verify.sh --strict` on release-sync branch — PASS, 10 pass / 0 fail / 0 warn.
- `npm test -- tests/cli-work.test.ts tests/package-payload.test.ts` — PASS, 2 files / 9 tests.
- `npm test` — PASS, 43 files / 379 tests.
- `npm run build` — PASS.
- `node dist/cli.js --help | grep -F 'osc work <task-description> --runtime <preset> --dry-run [--json] [--adapter <adapter-id>]'` — PASS.
- `npm pack --dry-run --json` — PASS for `open-scaffold@1.0.4` (153 files); package includes `dist/work.js` and `dist/work.d.ts` and excludes product dogfood done/backlog plans and `.osc/runs`.
- `npm publish --dry-run` — PASS for `open-scaffold@1.0.4`.
- PR #130 CI — PASS: `ci`, `Validate changed plans`, and `Validate evidence notes` were successful.
- PR #130 latest-head Codex review — PASS: Codex reported no major issues and review threads were zero before merge.
- Post-merge `git diff --check` on `main` — PASS.
- Post-merge `./verify.sh --strict` on `main` — PASS, 10 pass / 0 fail / 0 warn.
- Post-merge `npm test` on `main` — PASS, 43 files / 379 tests.
- Post-merge `npm run build` on `main` — PASS.
- Post-merge `npm pack --dry-run --json` — PASS for `open-scaffold@1.0.4` (153 files); package includes `dist/work.js` and `dist/work.d.ts` and excludes product dogfood done/backlog plans and `.osc/runs`.
- Post-merge `npm publish --dry-run` — PASS.
- `gh workflow run publish-npm.yml --ref main -f expected-version=1.0.4 -f npm-tag=latest` — PASS via trusted publishing run `26505406882`.
- `gh run view 26505406882 --repo graphanov/open-scaffold --json status,conclusion,headSha,url,jobs` — PASS: completed successfully on head `094688afa9f5f28950665683763a9b00e024d357`.
- `npm view open-scaffold version dist-tags repository homepage bugs keywords --json --prefer-online` — PASS: `version` is `1.0.4`; `dist-tags.latest` is `1.0.4`; repository/homepage/bugs/keywords metadata is present.
- Fresh isolated-cache `npx --yes open-scaffold@latest --help` from a temporary directory — PASS: help includes `osc work <task-description> --runtime <preset> --dry-run [--json] [--adapter <adapter-id>]`.
- Fresh isolated-cache `npx --yes open-scaffold@latest init --tier min --target <tmp>` — PASS: generated expected min-tier scaffold files including `MISSION.md`, `.osc/RULES.md`, `.osc/plans/WORKFLOW.md`, and `verify.sh`.
- `gh release create v1.0.4 --target 094688afa9f5f28950665683763a9b00e024d357 --latest` — PASS.
- `gh release view v1.0.4 --repo graphanov/open-scaffold --json tagName,name,publishedAt,targetCommitish,url,isDraft,isPrerelease` — PASS: release targets `094688afa9f5f28950665683763a9b00e024d357`, is not draft, and is not prerelease.
- `gh release list --repo graphanov/open-scaffold --limit 5` — PASS: `v1.0.4 — Work dry-run preview package sync` is marked Latest.
- `gh api repos/graphanov/open-scaffold/git/ref/tags/v1.0.4` — PASS: tag points to commit `094688afa9f5f28950665683763a9b00e024d357`.
- Remote branch cleanup — PASS: stale merged branch `release/work-dry-run-package-sync` was deleted and no longer appears in `git ls-remote --heads origin release/work-dry-run-package-sync`.

## Outcome

Complete. `main`, npm `latest`, fresh isolated-cache `npx`, and GitHub Latest Release now expose `open-scaffold@1.0.4` with the `osc work --dry-run` preview surface. The release-sync plan is closed after public-surface proof.

## Follow-up

- Stop at the continuation gate before starting another runtime-adoption slice.
- Recommended next decision: choose whether to continue the Codex-first adoption chain with a docs/example proof for `osc work --dry-run`, start a gated execution design, or pause mutating automation and keep only read-only/status lanes active.
