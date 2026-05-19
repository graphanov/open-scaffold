# Release / Evidence Note: 052-interactive-plan-wizard

## Summary

Added `osc plan wizard`, a plain-terminal plan-creation interview that turns user-provided answers into a filled Open Scaffold plan without `TODO:` markers. The feature supports both interactive stdin/TTY use and deterministic `--non-interactive --answers <json>` mode for scripts and agents.

## Traceability

- Roadmap / issue / task: V2 adoption friction backlog; `.osc/plans/done/052-interactive-plan-wizard.md`.
- Plan: `.osc/plans/done/052-interactive-plan-wizard.md`.
- Run ID / run packet: N/A — OSC Shipwright executed directly in the repo under the accepted roadmap plan.
- Branch / PR: `cli/interactive-plan-wizard`; PR pending at initial evidence capture.

## Verification

- `npm test -- tests/wizard.test.ts --run` — pass; 6 wizard tests cover template rendering, JSON normalization, non-interactive creation, stdin-driven interactive creation, and unset-mission refusal.
- `npm run build` — pass; core and runtime package TypeScript builds succeeded.
- `npm test -- --run` — pass; 23 test files / 202 tests passed.
- Built CLI smoke: `node dist/cli.js plan wizard test-json --stage backlog --non-interactive --answers tests/fixtures/wizard-answers.json` in a temporary initialized scaffold — pass; created `.osc/plans/backlog/test-json.md`, no `TODO:` markers, cache acceptance criteria present.
- Built CLI stdin smoke: `node dist/cli.js plan wizard test-interactive` with piped answers in a temporary initialized scaffold — pass; created `.osc/plans/active/test-interactive.md`, no `TODO:` markers, two acceptance criteria present.
- Built CLI unset-mission smoke: `node dist/cli.js plan wizard blocked-plan --non-interactive --answers tests/fixtures/wizard-answers.json` in a fresh scaffold with the default unset mission — pass; exited 1, printed `Mission is not yet defined...`, and created no plan.
- `git diff --check` — pass.
- `./verify.sh --strict` — pass; 10 pass, 0 fail, 0 warn.
- `npm pack --dry-run --json` — pass; package candidate `open-scaffold@0.4.3`, 86 files, includes `dist/wizard.js`/`dist/wizard.d.ts`, and keeps dogfood plan/release history out of the npm payload.

## Outcome

The plan wizard is implemented as a local helper over the existing plan lifecycle. It does not invent scope, run agents, validate semantic quality, or replace plan review; it only captures user-provided answers into the standard seven-section plan shape.

## Follow-up

- PR review and Codex latest-head review remain pending until the branch is pushed and the PR is opened.
- Plan `055-plan-linter` remains the later mechanical quality feedback layer for judging generated or hand-written plans.
