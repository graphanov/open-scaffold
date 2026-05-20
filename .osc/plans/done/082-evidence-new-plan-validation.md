# Plan: 082-evidence-new-plan-validation

## Status

done

## Context

Pinpoint dogfood of the evidence flow found that `osc evidence new <slug>` can create a release/evidence note for a slug that has no matching plan. The next command in the same flow, `osc evidence collect <slug>`, then refuses the same slug because it cannot find a plan. This leaves a user with an orphan `.osc/releases/YYYY-MM-DD-<slug>.md` file and makes evidence traceability fail later instead of at creation time.

## Goal

Make `osc evidence new <slug>` require a matching plan in `.osc/plans/{active,backlog,blocked,done}` before writing a release/evidence note, aligning it with `osc evidence collect` and preserving the plan-to-evidence chain.

## Constraints / Out of scope

- Do not redesign evidence folders or introduce a separate `.osc/evidence/` store.
- Do not change `osc evidence collect` collector behavior.
- Do not edit existing done evidence notes except through a new release/evidence note for this slice.
- Keep the failure message actionable and consistent with existing CLI helper wording.

## Files to touch

- `src/scaffold.ts` — add plan existence validation to `createEvidenceNoteSkeleton`.
- `tests/cli-plan-evidence.test.ts` — require a plan before evidence note creation and cover missing-plan refusal.
- `.osc/releases/2026-05-20-082-evidence-new-plan-validation.md` — capture traceability and verification evidence.
- `.osc/plans/done/082-evidence-new-plan-validation.md` — close this plan after verification.
- `MISSION.md` — close stamp from `osc close`.

## Acceptance criteria

- [ ] `osc evidence new <existing-plan-slug>` still creates `.osc/releases/YYYY-MM-DD-<slug>.md` with the existing skeleton content.
- [ ] `osc evidence new <missing-plan-slug>` exits non-zero and does not create a release/evidence note.
- [ ] The missing-plan error tells the user the matching plan was not found in `.osc/plans/{active,backlog,blocked,done}`.
- [ ] Existing duplicate, unsafe slug, and missing-root evidence helper checks still pass.
- [ ] Standard Open Scaffold verification, targeted evidence tests, full test suite, and build pass.

## Verification steps

1. Reproduce the bug in a temporary initialized scaffold before patching: `osc evidence new typo-noplan` creates an orphan note, then `osc evidence collect typo-noplan --dry-run` fails with `Plan not found`.
2. Add a regression test for missing-plan evidence creation.
3. Run `npm test -- tests/cli-plan-evidence.test.ts tests/evidence.test.ts --run`.
4. Run `./verify.sh --strict`.
5. Run `npm test -- --run`.
6. Run `npm run build`.
7. Re-run the temporary scaffold reproduction and confirm `osc evidence new typo-noplan` now fails before writing.

## Open questions

- None for this slice. A broader future enhancement could offer `osc evidence new --for-plan <slug>` aliases or plan search suggestions, but that is outside this pinpoint fix.
