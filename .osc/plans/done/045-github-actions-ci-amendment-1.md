# Amendment 1: 045-github-actions-ci

## Parent

045-github-actions-ci

## Date

2026-05-17

## Learning

The first GitHub Actions run failed before it reached the new scaffold verification steps. The failure was an existing lifecycle smoke test assertion that compared copied file mtimes against the test start time. That passed locally but is not a reliable CI signal because checkout/copy timestamp behavior can vary on GitHub-hosted runners.

## New direction

Keep the CI workflow as planned, and fix the lifecycle smoke test so it checks the real adoption-safety point: the downstream copied project must not contain private local paths or Command Center text. Do not require file mtimes to prove that.

## Impact on acceptance criteria

The original CI acceptance criteria remain the same. Add one implementation note: if CI exposes an existing flaky local-only assumption, remove that assumption in the smallest test patch needed for the workflow to run reliably on GitHub.
