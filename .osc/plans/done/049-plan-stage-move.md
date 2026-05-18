# Plan: 049-plan-stage-move

## Status

done

## Context

After the roadmap open-question reconciliation, Open Scaffold produced and shipped the concrete `048-cli-lifecycle-parity` follow-up. The repo now has first-class CLI helpers for creating plans, creating evidence notes, amending plans, and closing plans, but one common solo-developer action still requires manual file movement: moving a plan between `backlog`, `active`, and `blocked`.

That friction matters because the product promise is repo-native control without needing Hermes Kanban or private operator habits. A fresh user should be able to promote a backlog plan to active or park active work as blocked through the same `npx open-scaffold ...` path as the rest of the lifecycle.

## Goal

Add a small `osc plan move <slug> --to <active|backlog|blocked>` command that moves an existing non-done plan and its amendment files between stage folders, updates the parent plan's internal status to match the destination stage, and keeps `done` movement reserved for `osc close`.

## Constraints / Out of scope

- Do not move plans into `done`; `osc close` remains the done path because it stamps closure evidence.
- Do not introduce a task database, GitHub issue sync, runtime launch, or Kanban replacement in this slice.
- Do not edit committed historical done plans.
- Do not publish npm or bump package version in this slice.
- Keep shell script fallbacks unchanged.

## Files to touch

- `src/scaffold.ts` — add a safe stage-move helper for non-done plans.
- `src/cli.ts` — expose `osc plan move <slug> --to <active|backlog|blocked>` and help text.
- `tests/cli-plan-move.test.ts` — cover moving parent plans/amendments, status updates, missing directories, and refusal cases.
- `README.md`, `docs/WORKFLOW.md`, `.osc/plans/README.md` — document the common backlog → active / active → blocked CLI path.
- `.osc/releases/2026-05-18-049-plan-stage-move.md` — record verification evidence after implementation.

## Acceptance criteria

- [x] `osc plan move <slug> --to active` moves a backlog or blocked parent plan into `.osc/plans/active/` and updates its `## Status` body to `active`.
- [x] The move also carries matching amendment files such as `<slug>-amendment-1.md` to the same destination stage.
- [x] `osc plan move <slug> --to blocked` and `--to backlog` work for non-done plans.
- [x] The command refuses unsafe slugs, missing plans, unsupported destinations, and attempts to move into `done` with clear errors.
- [x] The command creates a missing destination stage folder for older/manual scaffolds.
- [x] Public docs show the fast solo-dev flow: create a backlog plan, move it to active, amend if needed, close when shipped.
- [x] Existing lifecycle commands and verification remain green.

## Verification steps

1. `npm test -- tests/cli-plan-move.test.ts` — expected pass after failing first.
2. `npm run build` — expected pass.
3. `npm test` — expected pass.
4. `./verify.sh --strict` — expected pass with 0 warnings.
5. `npm run osc -- verify` — expected pass.
6. `git diff --check` — expected no whitespace errors.

## Open questions

- Should a future follow-up add `osc plan list --stage <stage>` ergonomics, or is `osc status` enough for now?
