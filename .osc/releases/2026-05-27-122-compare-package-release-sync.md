# Release / Evidence Note: 122-compare-package-release-sync

## Summary

Prepared `open-scaffold@1.0.5` as the package/public-surface sync for PR #134's `osc compare <attempt-a-dir> <attempt-b-dir>` command. The source feature reached `main` in PR #134, but npm `latest` and GitHub Latest Release still point to `1.0.4`, so this release-sync candidate bumps the package metadata and records the gates needed before publication.

This is candidate evidence only. The release-sync plan remains active until owner-approved merge, trusted publishing, fresh `npx` verification, GitHub Latest Release publication, and closeout proof are complete.

## Traceability

- Roadmap / issue / task: adoption wedge / attempt-diff magic moment; package-sync follow-through after PR #134.
- Source plan: `.osc/plans/done/109-bare-attempt-compare.md`.
- Release-sync plan: `.osc/plans/active/122-compare-package-release-sync.md`.
- Run ID / run packet: N/A for release-sync.
- Source Pull Request: https://github.com/graphanov/open-scaffold/pull/134.
- Release-sync Pull Request: pending.
- Trusted publishing run: pending owner-approved merge/publication.
- GitHub Release: pending owner-approved release publication.

## Verification

- `gh pr view 134 --repo graphanov/open-scaffold --json state,mergedAt,mergeCommit,url` — PASS: PR #134 is merged; merge commit `fc55df6` on local `main`.
- PR #134 checks — PASS: `Validate changed plans`, `Validate evidence notes`, and `ci` passed before merge.
- `git diff --check` after syncing `main` — PASS.
- `node dist/cli.js --help | grep -F 'osc compare <attempt-a-dir> <attempt-b-dir> [--json] [--output <path>]'` — PASS locally after PR #134.
- Fresh isolated-cache `npx --yes open-scaffold@latest --help` — PRECHECK: no `osc compare` command before this release-sync candidate is published.
- `npm view open-scaffold version dist-tags --json` — PRECHECK: npm/latest is `1.0.4` before this release-sync candidate.
- `gh release list --repo graphanov/open-scaffold --limit 5` — PRECHECK: GitHub Latest Release is `v1.0.4 — Work dry-run preview package sync` before this release-sync candidate.
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
- PR CI and latest-head Codex review — pending after PR creation.
- Trusted publishing for `open-scaffold@1.0.5` — pending owner-approved merge/publication.
- Fresh isolated-cache `npx` verification for `osc compare` — pending after publication.
- GitHub Release `v1.0.5` marked Latest — pending owner-approved release publication.

## Outcome

Candidate prepared; owner-gated public-surface follow-through pending.

## Follow-up

- Open a focused release-sync PR and keep it latest-head clean.
- After owner approval, merge the release-sync PR, run trusted publishing for `open-scaffold@1.0.5`, verify fresh isolated-cache `npx` exposes and runs `osc compare`, create GitHub Release `v1.0.5` as Latest, then close this plan.
- After this public-surface sync is complete, resume Context Authority in the order `071-evidence-chain-verifier` → `117-osc-trace-work-record-replay` → reserved Context Authority slices.
