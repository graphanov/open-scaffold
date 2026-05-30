# Plan: 132-plan-stats-command

## Status

done

## Context

Open Scaffold repos accumulate plans across four stages (`active`, `backlog`,
`blocked`, `done`). On a mature repo there can be well over a hundred plans, and
a maintainer currently has no quick way to see the shape of that portfolio or to
spot in-flight work that has gone stale. The lifecycle commands (`plan new`,
`plan move`, `plan validate`, `close`) all operate on a single plan; there is no
summary view.

## Goal

Add an `osc plan stats` command that prints a portfolio summary: a count of
plans in each stage, the total, and the oldest active plan (least recently
modified) so a maintainer can spot stale in-flight work. Provide a `--json`
mode emitting the same data for scripting, with a clear non-error message when
there are no active plans.

## Constraints / Out of scope

- Do not change unrelated workflows or other `osc plan` subcommands.
- Do not add hidden network calls or runtime spawning.
- Do not add new runtime dependencies.
- Do not modify `MISSION.md`, `ROADMAP.md`, or committed plan bodies.
- Stage counts must be read from the real `.osc/plans/` structure, never hardcoded.

## Files to touch

- `src/plan-stats.ts` — stats computation (`computePlanStats`) and text rendering (`formatPlanStats`); reads the scaffold via the existing `inspectScaffold()` helper.
- `src/cli.ts` — register a `stats` branch in `planCommand()` with help/usage text mirroring `plan move` / `plan validate`.
- `tests/cli-plan-stats.test.ts` — unit + CLI coverage: per-stage counts, total, oldest-active-by-mtime (not alphabetical), no-active message, `--json` parseability, and bad-flag exit code.
- `tests/cli-lifecycle-help.test.ts` — extend help-parity coverage so the new command is locked into `--help`.

## Acceptance criteria

- [ ] `osc plan stats` prints a count of plans in each stage (active, backlog, blocked, done) plus the total.
- [ ] `osc plan stats` identifies the oldest active plan by modification time, and prints a clear non-error message when there are no active plans.
- [ ] `osc plan stats --json` prints valid, parseable JSON containing the same counts, total, and oldest-active data.
- [ ] Invalid input (unknown flag) fails with an actionable error and a non-zero exit code.
- [ ] Documentation/help lists `osc plan stats [--json]`, and a help-parity test covers it.
- [ ] Existing behavior remains backwards-compatible: build, full test suite, and `./verify.sh --strict` all pass.

## Verification steps

1. `npm test -- tests/cli-plan-stats.test.ts tests/cli-lifecycle-help.test.ts`
2. `npm test`
3. `npm run build && ./verify.sh --strict`
4. CLI smoke: `node dist/cli.js plan stats` and `node dist/cli.js plan stats --json`

## Open questions

- None.

## Provenance

This implementation was selected through a real two-agent `osc compare` run:
Codex CLI and Claude Code each implemented this feature from an identical brief
in isolated worktrees. Both passed all gates; the Claude attempt was adopted
because it added a help-parity regression guard and broader test coverage. The
comparison artifacts are operator-local scratch and are not part of this PR.
