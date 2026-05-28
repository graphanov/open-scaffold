# Release / Evidence Note: 117-osc-trace-work-record-replay

## Summary

Adds `osc trace <plan-slug>` as a read-only work-record replay command. The command reconstructs one plan's local chain across stage folders, acceptance criteria, run packets, evidence/release notes, and recognized PR/issue references while keeping verification, external API checks, runtime spawning, publishing, and approval out of scope.

## Traceability

- Roadmap / issue / task: Kanban task `t_df8003f0` / plan 117.
- Plan: `.osc/plans/done/117-osc-trace-work-record-replay.md` after closeout; `.osc/plans/active/117-osc-trace-work-record-replay.md` during implementation.
- Run ID / run packet: `N/A` — this slice was implemented directly under the active plan with read-only scout subagents; no durable `.osc/runs/` packet was created.
- Branch / PR: branch `cli/work-record-trace`; PR #142 — https://github.com/graphanov/open-scaffold/pull/142.

## Verification

- `npm test -- --run tests/trace.test.ts` — PASS during RED/GREEN loop after implementation, and PASS after security regressions plus Codex regressions for run-packet external references and shorthand PR/issue references (`11 passed`).
- `npm test -- --run tests/trace.test.ts tests/cli-lifecycle-help.test.ts tests/public-positioning.test.ts` — PASS after docs/boundary/security/Codex updates (`31 passed`).
- `npm run build` — PASS for core and runtime-omx TypeScript builds.
- `node dist/cli.js trace 107-work-dry-run-package-sync` — PASS; produced human trace output with plan, acceptance criteria, release notes, external PR refs, and missing run packet label.
- `node dist/cli.js trace 107-work-dry-run-package-sync --json` plus Python `json.loads` schema/slug assertions — PASS.
- `npm test -- --run` — PASS (`47` test files, `425` tests).
- `node dist/cli.js plan validate .osc/plans/done/117-osc-trace-work-record-replay.md` — PASS (`0 issues found`).
- `node dist/cli.js trace 117-osc-trace-work-record-replay --json` plus Python `json.loads` schema/stage/release-note assertions — PASS.
- `git diff --check` — PASS.
- `./verify.sh --strict` — PASS (`10 pass, 0 fail, 0 warn`).

## Outcome

Repository feature implementation is ready for PR review, CI, and Codex latest-head review. The shipped behavior is local/read-only reconstruction only: no GitHub API calls, no network verification, no evidence-quality judgment, no runtime spawning, no hosted trace viewer, no approval, and no publication/release side effects.

## Follow-up

- If this package-visible command merges, run the normal post-merge public-surface check to decide whether a narrow npm/GitHub Release sync is needed.
- Future network-backed PR/issue/CI verification for trace output remains out of scope and would require a separate plan.