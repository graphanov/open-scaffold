# Release / Evidence Note: 048-cli-lifecycle-parity

## Summary

Added CLI lifecycle parity helpers for common day-two Open Scaffold flows: `osc amend <plan-slug> --message ...` and `osc close <plan-slug> --message ...`. The helpers preserve stage-folder/amendment/changelog semantics, keep shell scripts as fallbacks, and avoid runtime execution, PR automation, or merge/publish behavior.

## Traceability

- Roadmap / issue / task: ROADMAP Milestone 14 CLI and packaging UX; Kanban `t_3135e2c3`.
- Plan: `.osc/plans/done/048-cli-lifecycle-parity.md`
- Run ID / run packet: N/A — Hermes direct implementation; no runtime handoff/spawn.
- Branch / PR: `cli/lifecycle-parity`; https://github.com/graphanov/open-scaffold/pull/54

## Verification

- `npm test -- tests/cli-lifecycle-parity.test.ts tests/first-run-docs.test.ts` — PASS, 2 files / 7 tests.
- `npm run build:core` — PASS.
- `npm test -- tests/cli-lifecycle-parity.test.ts tests/cli-plan-evidence.test.ts tests/first-run-docs.test.ts tests/cli-init.test.ts tests/init.test.ts tests/scaffold.test.ts` — PASS, 6 files / 47 tests.
- `npm run build` — PASS, core and `packages/runtime-omx` TypeScript builds.
- `npm test` — PASS, 21 files / 183 tests.
- Built CLI smoke: `node dist/cli.js init --tier min --target <tmp>`, define mission, `node dist/cli.js plan new 001-first-task --stage active`, `node dist/cli.js amend 001-first-task --message "dist smoke scope change"`, `node dist/cli.js evidence new 001-first-task`, `node dist/cli.js close 001-first-task --message "dist smoke shipped"`, `./verify.sh --standard` — PASS, 6 pass / 0 fail / 0 warn.
- `./verify.sh --strict` — PASS, 10 pass / 0 fail / 0 warn.
- `npm run osc -- verify` — PASS, 58 plan files / 0 warnings.
- `git diff --check` — PASS.

## Outcome

The common lifecycle path now has package-level commands for plan creation, amendment, evidence, and close. `amend.sh` and `close.sh` remain documented compatibility fallbacks; the new commands do not generate acceptance criteria, claim verification, launch runtimes, automate PRs, merge, or publish.

## Follow-up

- Owner review / PR gate remains pending.
- Codex round 1 findings were addressed locally: `osc close` now creates a missing `done/` folder before moving plans, and lifecycle date assertions no longer recompute expected dates after command execution.
- Codex round 2 finding was addressed locally: the no-root lifecycle test now uses the platform temp directory instead of hard-coded `/tmp`.
- Possible later cleanup: share implementation between shell scripts and TypeScript helpers if maintaining both becomes painful.
