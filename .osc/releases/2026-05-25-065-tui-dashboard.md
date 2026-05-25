# Release / Evidence Note: 065-tui-dashboard

## Summary

Added a read-only terminal dashboard for Open Scaffold. The new `osc dashboard` command and `osc status --dashboard` alias show mission state, plan counts, active-plan freshness, recent evidence, validation health, and optional task summary data in a keyboard-driven terminal view without adding a daemon or browser surface.

## Traceability

- Roadmap / issue / task: backlog plan 065 terminal dashboard.
- Plan: .osc/plans/done/065-tui-dashboard.md
- Run ID / run packet: N/A — implemented directly by runner automation for a selected backlog plan.
- Branch / PR: Branch `feat/065-tui-dashboard`; PR pending owner review.

## Verification

- `npm test -- tests/dashboard.test.ts` — 5 dashboard tests passed after the RED failure for the missing dashboard module.
- `npm test -- tests/dashboard.test.ts packages/runtime-omx/tests/no-spawn-boundary.test.ts && npm run build` — dashboard tests, no-spawn boundary tests, and TypeScript build passed after replacing process spawning with in-process validation.
- `npm test` — full suite passed: 38 test files, 337 tests.
- `git diff --check` and `./verify.sh --strict` — whitespace and strict scaffold checks passed: 10 pass, 0 fail, 0 warn.
- `npm pack --dry-run --json` — package dry-run succeeded and included `dist/dashboard.js` plus `dist/dashboard.d.ts`.
- `node dist/cli.js dashboard` and `node dist/cli.js status --dashboard` — static non-interactive dashboard output showed mission, plan counts, active plans, recent evidence, and footer shortcuts.
- PTY smoke: `node dist/cli.js dashboard`, send `q` — interactive dashboard exited with code 0 and restored the terminal.

## Outcome

Terminal dashboard v1 is ready for owner review. It is intentionally read-only, uses ANSI/raw terminal handling instead of a new TUI dependency, preserves the core no-spawn boundary, and keeps publication, merge, npm publication, and GitHub Release changes behind owner gates.

## Follow-up

- Owner review and merge gate remain open.
- Publication gate remains batched with the release train; no `npm publish` or GitHub Latest Release move was performed.
