# Release / Evidence Note: GitHub Actions CI

## Summary

Open Scaffold now has a small GitHub Actions workflow for pull requests and pushes to `main`. It runs the same basic safety checks used locally: install, build, tests, strict scaffold verification, and CLI verification.

## Traceability

- Plan: `.osc/plans/done/045-github-actions-ci.md`
- Branch: `ci/github-actions-workflow`
- PR: `#46` — https://github.com/graphanov/open-scaffold/pull/46
- Kanban: `t_44c1b9b1`
- Workflow: `.github/workflows/ci.yml`

## Verification

- `npm test -- tests/e2e/lifecycle.test.ts` → pass after removing the CI-flaky mtime assertion
- `npm run build` → pass
- `npm test` → 14 files / 124 tests passed
- `./verify.sh --strict` → 10 pass / 0 fail / 0 warn
- `npm run osc -- verify` → pass
- `git diff --check` → pass

## Outcome

- The workflow runs on pull requests into `main`, pushes to `main`, and manual dispatch.
- The workflow uses Node `22.12.0` with `npm ci`.
- The workflow has read-only `contents` permission.
- The first GitHub Actions run exposed an existing flaky mtime assertion in the lifecycle smoke test; the test now checks the real safety condition instead: copied downstream files must not contain private local paths or Command Center text.
- No package publishing, deploy step, secrets, or write-token behavior was added.

## Follow-up

After this workflow is green on GitHub and the PR is merged, update branch protection so `main` requires the `ci` check before merge.
