# Release / Evidence Note: 081-lifecycle-help-flags

## Summary

Fixed a day-two plan lifecycle help gap: help flags for plan/amend/close commands now print command-specific usage instead of falling into execution paths. This keeps exploratory users and automation from seeing ENOENT, missing-option, or unsafe-slug errors when asking how to use the lifecycle helpers.

## Traceability

- Roadmap / issue / task: Open Scaffold pinpoint dogfood scout, plan lifecycle surface.
- Plan: `.osc/plans/done/081-lifecycle-help-flags.md`.
- Run ID / run packet: N/A — local CLI pinpoint fix, no runtime run packet needed.
- Branch / PR: `fix/lifecycle-help-flags`; PR pending at initial commit time.
- Automation provenance: Opened/advanced by John-Lo-Mein autopilot; cron job `open-scaffold-autopilot-pr-runner` / `13dc0942e2e9`; script `open-scaffold-prrunner-webhook-runner.py`; source `cron-open-scaffold-pr-runner`.
- Owner gates: merge, npm publish, and GitHub Release creation/latest movement remain owner-gated.

## Verification

- Reproduction before fix: `node dist/cli.js plan --help` → exit 1, `ENOENT: no such file or directory, open '/Users/danimal/Projects/open-scaffold/--help'`.
- Reproduction before fix: `node dist/cli.js plan new --help` / `plan move --help` → exit 2, missing required lifecycle options.
- Reproduction before fix: `node dist/cli.js amend --help` / `close --help` → exit 2, unsafe slug errors.
- `npm test -- tests/cli-lifecycle-help.test.ts --run` → pass; 1 file / 7 tests.
- `npm run build` → pass.
- `npm test -- --run` → pass; 27 files / 235 tests.
- `./verify.sh --strict` → pass; 10 pass / 0 fail / 0 warn.
- `npm run osc -- verify` → pass with one pre-existing backlog warning unrelated to this slice.
- `git diff --check` → pass.

## Outcome

The lifecycle help pinpoint is fixed locally on `fix/lifecycle-help-flags`. `osc plan --help`, `osc plan new --help`, `osc plan validate --help`, `osc plan wizard --help`, `osc plan move --help`, `osc amend --help`, and `osc close --help` are covered by regression tests and route to usage output with exit code 0.

Out of scope: parser refactor, new lifecycle commands, npm publish, GitHub Release changes, merge, or any plan lifecycle behavior change beyond help routing.

## Follow-up

- Open PR, trigger Codex, and keep latest-head review loop alive.
- After merge approval, owner may separately decide whether to publish npm and create/move GitHub Release latest.
