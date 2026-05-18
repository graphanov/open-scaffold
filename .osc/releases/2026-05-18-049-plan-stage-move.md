# Release / Evidence Note: 049-plan-stage-move

## Summary

Adds `osc plan move <slug> --to active|backlog|blocked` so solo developers can move non-done plans through the stage folders without manual file moves. The command carries amendment files with the parent plan, updates the parent `## Status` body, and keeps movement into `done/` reserved for `osc close`.

## Traceability

- Roadmap / issue / task: Kanban `t_c6641254`.
- Plan: `.osc/plans/done/049-plan-stage-move.md`.
- Run ID / run packet: `N/A` — local CLI/product slice, no runtime run packet needed.
- Branch / PR: `cli/plan-stage-move`; PR #55 — https://github.com/graphanov/open-scaffold/pull/55.

## Verification

- RED check: `npm test -- tests/cli-plan-move.test.ts` initially failed because `osc plan move` did not exist and `osc plan` tried to parse `move` as a file path.
- Targeted GREEN: `npm test -- tests/cli-plan-move.test.ts` → 1 file / 3 tests passed.
- `npm run build` → pass.
- `npm test` → 22 files / 186 tests passed.
- `./verify.sh --strict` → 10 pass / 0 fail / 0 warn; 59 plan files before closure.
- `npm run osc -- verify` → pass; 59 plan file(s), 0 warning(s).
- Codex follow-up: first review artifact reported a subprocess-heavy Vitest timeout risk in `tests/cli-plan-move.test.ts`; the three new tests now carry explicit `20_000` ms per-test timeouts without changing assertions or CLI behavior.
- Post-Codex targeted GREEN: `npm test -- tests/cli-plan-move.test.ts` → pass.
- Post-Codex `npm run build` → pass.
- Post-Codex `npm test` → pass.
- Post-Codex `./verify.sh --strict` → pass.
- Post-Codex `npm run osc -- verify` → pass.
- Codex second pass: valid P2 findings on legacy root-level plans and compact `## Status\nactive` formatting; added regression coverage and fixed `movePlan()` to support root plans plus single-newline status headers.
- Final targeted GREEN: `npm test -- tests/cli-plan-move.test.ts` → 1 file / 4 tests passed.
- Final `npm run build` → pass.
- Final `npm test` → pass.
- Final `./verify.sh --strict` → pass.
- Final `npm run osc -- verify` → pass.
- Final `git diff --check` → pass.

## Outcome

The plan movement gap is closed for the normal npm/day-two path. Users can now create a backlog plan, promote it to active, park it as blocked, move it back, amend it, create evidence, and close it without private Hermes/Kanban habits or manual filesystem moves.

Out of scope: moving plans into `done` outside `osc close`, task database behavior, GitHub issue sync, runtime launch, npm publish, package version bump, and broad runtime/model-lab hypothesis work.

## Follow-up

- Consider a later `osc plan list --stage <stage>` / `osc plan show <slug>` ergonomics slice if `osc status` feels too coarse.
- Publish remains a separate owner-gated release action after enough product slices accumulate.
