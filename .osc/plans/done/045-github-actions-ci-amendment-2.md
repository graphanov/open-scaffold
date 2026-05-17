# Amendment 2: 045-github-actions-ci

## Parent

045-github-actions-ci

## Date

2026-05-17

## Learning

Codex correctly pointed out that `actions/checkout@v4` fetches only one commit by default. Open Scaffold's strict verifier checks plan immutability against git history, so a shallow checkout could make CI miss the exact history signal strict mode is supposed to test.

## New direction

Keep the CI workflow simple, but configure checkout with full history before running `./verify.sh --strict`.

## Impact on acceptance criteria

The original acceptance criteria remain. Strengthen the verification expectation: the workflow must use `fetch-depth: 0` so strict scaffold verification has access to enough git history to check plan immutability.
