# Release / Evidence Note: 107-work-dry-run-package-sync

## Summary

Prepare `open-scaffold@1.0.4` as the package/public-surface sync for PR #129's `osc work <task-description> --runtime <preset> --dry-run` preview. The source feature reached `main`, but npm `latest` remains `open-scaffold@1.0.3` and fresh isolated-cache `npx open-scaffold@latest --help` does not expose the new `osc work` command.

## Traceability

- Roadmap / issue / task: Milestone 19 — Post-v1 Codex-first runtime adoption chain; package-sync follow-through after PR #129.
- Source plan: `.osc/plans/done/104-osc-work-dry-run-target.md`.
- Release-sync plan: `.osc/plans/active/107-work-dry-run-package-sync.md`.
- Run ID / run packet: N/A for release-sync.
- Source Pull Request: https://github.com/graphanov/open-scaffold/pull/129.
- Release-sync Pull Request: https://github.com/graphanov/open-scaffold/pull/130.
- Trusted publishing run: pending owner-approved publish follow-through.
- GitHub Release: pending owner-approved release follow-through.

## Verification

- `gh pr view 129 --repo graphanov/open-scaffold --json state,mergedAt,mergeCommit,url` — PASS: PR #129 is merged; merge commit `ee4d5507036f4237cc2ca8562f79518b8a6e8660`.
- Main push CI after PR #129 — PASS: https://github.com/graphanov/open-scaffold/actions/runs/26504074783.
- `git diff --check` after syncing `main` — PASS.
- `./verify.sh --strict` after syncing `main` — PASS, 10 pass / 0 fail / 0 warn.
- `npm test` after syncing `main` — PASS, 43 files / 379 tests.
- `npm run build` after syncing `main` — PASS.
- `node dist/cli.js --help | grep -F 'osc work <task-description> --runtime <preset> --dry-run [--json] [--adapter <adapter-id>]'` — PASS locally after PR #129.
- `npm view open-scaffold version dist-tags versions --json` — PRECHECK: npm/latest remains `1.0.3` before this release-sync candidate.
- Fresh isolated-cache `npx --yes open-scaffold@latest --help` — PRECHECK: no `osc work` command before this release-sync candidate is published.
- `gh release list --repo graphanov/open-scaffold --limit 5` — PRECHECK: GitHub Latest Release remains `v1.0.3 — Dispatch adapter glue`.
- `node -p "require('./package.json').version"` — PASS on release-sync branch: `1.0.4`.
- `node -p "require('./package-lock.json').version + ' / ' + require('./package-lock.json').packages[''].version"` — PASS: `1.0.4 / 1.0.4`.
- `git diff --check` on release-sync branch — PASS.
- `./verify.sh --strict` on release-sync branch — PASS, 10 pass / 0 fail / 0 warn.
- `npm test -- tests/cli-work.test.ts tests/package-payload.test.ts` — PASS, 2 files / 9 tests.
- `npm test` — PASS, 43 files / 379 tests.
- `npm run build` — PASS.
- `node dist/cli.js --help | grep -F 'osc work <task-description> --runtime <preset> --dry-run [--json] [--adapter <adapter-id>]'` — PASS.
- `npm pack --dry-run --json` — PASS for `open-scaffold@1.0.4` (153 files, unpacked 1,039,498 bytes); package includes `dist/work.js` and `dist/work.d.ts` and excludes product dogfood done/backlog plans and `.osc/runs`.
- `npm publish --dry-run` — PASS for `open-scaffold@1.0.4`.

## Outcome

Candidate in progress. This release-sync branch bumps the package candidate to `1.0.4` and records the public-surface drift for `osc work --dry-run`. npm publishing, fresh post-publish `npx`, GitHub Latest Release alignment, and final plan closeout remain follow-through gates after PR integration and owner approval.

## Follow-up

- Open a release-sync PR for `open-scaffold@1.0.4`.
- Trigger CI and latest-head Codex review for the release-sync PR.
- After owner approval, merge the release-sync PR and run trusted publishing for `1.0.4`.
- Verify npm/latest, fresh isolated-cache `npx`, GitHub Latest Release, then close this release-sync plan with final evidence.
