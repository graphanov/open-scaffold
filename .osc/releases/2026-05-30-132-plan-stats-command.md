# Release / Evidence Note: 132-plan-stats-command

## Summary

Added `osc plan stats`, a portfolio-summary command for the plan lifecycle. It
prints per-stage counts (active/backlog/blocked/done), the total, and the oldest
active plan by modification time, with a clear non-error message when there are
no active plans. A `--json` mode emits the same data for scripting.

## Traceability

- Plan: `.osc/plans/done/132-plan-stats-command.md` (after closeout); `.osc/plans/active/132-plan-stats-command.md` during implementation.
- Branch / PR: branch `cli/plan-stats`; PR pending.
- Run ID / run packet: N/A — direct CLI feature slice.

## Implementation

- `src/plan-stats.ts` — `computePlanStats()` reads the scaffold via the existing `inspectScaffold()` helper (counts never hardcoded); `formatPlanStats()` renders the aligned text summary.
- `src/cli.ts` — `stats` branch registered in `planCommand()` with `--json` handling, an actionable unknown-flag error (exit 2), and help/usage text alongside `plan move` / `plan validate` / `plan graph`.
- `tests/cli-plan-stats.test.ts` — unit + CLI coverage: per-stage counts, total, oldest-active selection by mtime (proven against alphabetical order via controlled mtimes), no-active message in both text and JSON, `--json` parseability, and unknown-flag exit code 2.
- `tests/cli-lifecycle-help.test.ts` — extended help-parity coverage so the new command stays in `--help`.
- `tests/section-parser.test.ts` — live-corpus plan-validation hash pin refreshed for the new done plan + this evidence note.

## Verification

- `npm test -- tests/cli-plan-stats.test.ts tests/cli-lifecycle-help.test.ts` — PASS (16 tests).
- `npm test` — PASS, 54 files / 538 tests.
- `npm run build` — PASS.
- `./verify.sh --strict` — 10 pass / 0 fail / 0 warn.
- `git diff --check` — clean.
- CLI smoke (real repo): `node dist/cli.js plan stats` → per-stage counts + total + oldest-active line; `node dist/cli.js plan stats --json` → valid parseable JSON.

## Provenance

The implementation was selected through a real two-agent comparison: Codex CLI
and Claude Code each implemented this feature from an identical brief in isolated
git worktrees off the same base commit. Both passed all gates independently; the
Claude attempt was adopted via `osc compare` because it added a help-parity
regression guard and broader test coverage (including the unknown-flag error
path). The comparison artifacts are operator-local scratch and are intentionally
not part of this PR.

## Outcome

Shipped: `osc plan stats` with text and `--json` output, wired into `planCommand()`
and `--help`, covered by unit + CLI tests and a help-parity guard. All gates pass
(538 tests, build clean, `verify.sh --strict` clean). Pending owner PR review and
merge; no npm publish or release in this slice.

## Follow-up

- Owner gate: review and merge the PR for `cli/plan-stats`.
- After merge, this command surface is package-visible; a package/release sync may be warranted before advertising it externally (npm latest currently predates this command).
