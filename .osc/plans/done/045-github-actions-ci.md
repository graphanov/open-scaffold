# Plan: 045-github-actions-ci

## Status

active

## Context

`main` is now protected, but GitHub has no automatic build or test check to require. A small CI workflow gives every pull request the same basic verification Hermes already runs locally.

## Goal

Add a GitHub Actions workflow that runs the repo's build, tests, and scaffold verifier on pull requests and pushes to `main`.

## Constraints / Out of scope

- Do not add publish, release, deployment, or npm-token steps.
- Do not require the CI check in branch protection until the workflow exists and has passed at least once on GitHub.
- Do not change product docs beyond the plan and release/evidence note for this slice.
- Do not merge without owner approval.

## Files to touch

- `.github/workflows/ci.yml` — add the PR/push verification workflow.
- `.osc/plans/active/045-github-actions-ci.md` — track the slice while active.
- `.osc/releases/2026-05-17-github-actions-ci.md` — record local and GitHub evidence after implementation.
- `MISSION.md` — receive the mechanical close stamp from `./close.sh`.

## Acceptance criteria

- [ ] The workflow runs on pull requests into `main` and pushes to `main`.
- [ ] The workflow uses Node 22 and `npm ci`.
- [ ] The workflow runs `npm run build`, `npm test`, `./verify.sh --strict`, and `npm run osc -- verify`.
- [ ] The workflow does not require secrets, publish packages, deploy, or write repository content.
- [ ] Local verification passes before the PR is opened.
- [ ] The PR body says branch protection will require the CI check only after the workflow proves green on GitHub.

## Verification steps

1. `npm run build` — TypeScript compiles.
2. `npm test` — Vitest suite passes.
3. `./verify.sh --strict` — scaffold checks pass.
4. `npm run osc -- verify` — CLI verifier passes.
5. `git diff --check` — no whitespace errors.
6. After PR creation, inspect the GitHub Actions check result for the new workflow.

## Open questions

- After this PR merges and the `ci` check is green on `main`, branch protection should be updated to require `ci` before merge.
