# Release / Evidence Note: 126-pr-native-evidence-surface

## Summary

Added a read-only `osc pr-summary <plan-slug> [--format markdown|json]` renderer that surfaces a plan's goal, acceptance-criteria checklist state, evidence-note status, plan-validation results, and open questions for reviewers. Added an optional, opt-in GitHub Action that mirrors that rendering onto a pull request as a single, idempotently-updated comment, plus tests and a documented read-only mirror boundary.

## Traceability

- Roadmap / issue / task: plan `126-pr-native-evidence-surface` (PR-native evidence surface, glass-cockpit review-surface line following done `062`/`096`/`063`).
- Plan: `.osc/plans/done/126-pr-native-evidence-surface.md`.
- Run ID / run packet: N/A — direct repository implementation slice, no external runtime packet.
- Branch / PR: review branch `cli/ab-protocol-and-pr-summary`; PR review and merge remain owner gates.

## Pre-work coverage check

Per acceptance-criterion 1, confirmed before writing code that this surface was not already delivered elsewhere:

- `docs/GITHUB_WORKFLOW.md` documented the issue/PR/run chain, CI guardrails, and build-in-public operator events, but carried no PR-native plan + acceptance-criteria + evidence summary.
- Done `063` (`github-actions-ci-templates`) added plan-validate, evidence-validate, stale-plans, and publish-npm guardrails — none renders a reviewer summary comment.
- Done `062`/`096` (glass-cockpit webhooks) emit push-only operator events; the only PR-related event is a `pr_link` ("pull request ready") notification, not a rendered plan/AC/evidence comment.

Decision: not substantially covered — proceed with new code as a read-only renderer plus an optional thin workflow wrapper, staying inside the existing "operator surfaces mirror, they are not canonical" boundary. No downgrade to a docs-only task.

## Verification

- `npx vitest run tests/cli-pr-summary.test.ts` — passed, 22 tests (renderer output, checkbox-state count, evidence/skeleton detection, validator reuse, graceful missing/unsafe-slug paths, idempotent upsert selector, CLI exit codes, and workflow marker-drift / opt-in / no-`actions/checkout` guards).
- `npm run build` — passed (core and runtime-omx TypeScript builds).
- `npm test -- --run` (full suite) — passed, 50 files / 480 tests after the combined plan-126 and plan-127 tree plus the post-Codex raw-data preference regression.
- `git diff --check` — clean, no whitespace errors.
- Smoke: `osc pr-summary 125-methodology-evidence-harness --format markdown` — rendered stage `done`, goal, `Acceptance criteria (6/6 checked)` matching the plan file, evidence note present + `approved`, plan validation passed, and open questions; first line carried the `<!-- osc-pr-summary -->` upsert marker.
- Smoke: `osc pr-summary 999-missing` and `osc pr-summary ../outside` — both exited `0` with an explicit "no plan found" body rather than failing the check.

## Outcome

The PR-native evidence surface slice is implemented and the plan is closed; all five acceptance criteria are met:

1. Pre-work coverage check recorded (above) with a proceed decision.
2. `osc pr-summary <slug>` renders goal, acceptance-criteria checklist with checked/unchecked state, evidence-note presence, and open questions.
3. The renderer reuses the existing `parsePlanFile`/`parseChecklist` plan readers, `findEvidenceNote` + `evidenceApprovalStatus`, and `validatePlanFile` rather than re-parsing plans independently.
4. The optional `pr-summary.yml` workflow is opt-in (gated on `vars.OSC_PR_SUMMARY == 'true'`), reads repository contents with `contents: read`, and upserts exactly one PR comment by finding the marker — re-runs update in place.
5. Tests prove idempotent comment content (single comment, no duplication) and a graceful "no/invalid plan" path.

This note is not a merge, publication, GitHub Release, deployment, or npm publish approval; those remain owner gates.

## Follow-up

- Owner gate: review the PR and decide whether to merge.
- Owner gate: decide separately on any npm publication or GitHub Release; this slice does not change the package version.
- The optional mirror stays disabled until an owner sets `OSC_PR_SUMMARY=true` and `OSC_PR_SUMMARY_PLAN`.
