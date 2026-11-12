# Plan: 213-november-bot-follow-up

## Status

done

## Context

On November 9 the scheduled workflow reopened [issue #280](https://github.com/graphanov/open-scaffold/issues/280) for the October maintainer trial. On November 12 the owner asked which bot items could proceed while a contributor works on PR #327.

## Goal

Reconcile the stale work records, address independent review feedback on its original PR and check the dependency proposals against the supported Node 20 floor.

## Constraints / Out of scope

- Preserve the trial’s expiry, the original acceptance criteria and the contributor’s exact-version assignment. The owner decides merges and releases.
- Keep the state correction on a branch from main and the website-address check on PR #327.

## Files to touch

- The October plans and their evidence records, plus the mission changelog if a plan closes.
- The generated-file test on PR #327 and the evidence note for this maintenance review.
- A separate dependency branch may carry the compatible lockfile entry and the root development-update grouping rule.

## Acceptance criteria

- [x] The stale-plan detector agrees with the documented disposition of the October work, and incomplete criteria stay visible. | Evidence: .osc/releases/2026-11-12-213-november-bot-follow-up.md
- [x] The website-address review on PR #327 has a tested change or a documented reason the change is unnecessary. | Evidence: .osc/releases/2026-11-12-213-november-bot-follow-up.md
- [x] Both Dependabot PRs have a compatibility verdict tied to the proposed commits and the supported Node 20 floor. | Evidence: .osc/releases/2026-11-12-213-november-bot-follow-up.md

## Verification steps

1. Compare the October plan records with the dated delegation, issue and merged PR. Run the scheduled detector on the proposed tree.
2. Run the generated-file test on PR #327 and verify the resulting GitHub revision and check results.
3. Exercise both dependency proposals with a clean, engine-strict installation on Node 20.19.0. Run the build and test suite on a compatible proposal.
4. Run `./verify.sh --strict`, `npm run build` and `npm test` for the state correction. Capture failures with the revision and command.

## Open questions

- Does the record support closure of the October child plan, or does it still need independent evidence?
