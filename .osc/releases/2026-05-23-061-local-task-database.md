# Release / Evidence Note: 061-local-task-database

## Summary

Added an optional local task database for Open Scaffold. `osc task` now supports creating, listing, filtering, showing, claiming/starting, completing, blocking, cancelling, commenting on, and plan-linking local tasks backed by `.osc/tasks.db`.

The feature stays local-only: no network access, no daemon, no background sync, and no claim that it replaces shared task systems such as GitHub Issues, Linear, Jira, or coordinator-owned Kanban boards.

## Traceability

- Roadmap / issue / task: backlog plan selected by Open Scaffold runner automation.
- Plan: `.osc/plans/done/061-local-task-database.md`
- Run ID / run packet: N/A — direct runner implementation against selected backlog plan.
- Branch / PR: `feat/061-local-task-database`; https://github.com/graphanov/open-scaffold/pull/96.

## Verification

- `git diff --check` — passed.
- `npx vitest run tests/tasks.test.ts` — passed, 6 tests.
- `npx vitest run tests/tasks.test.ts tests/package-payload.test.ts` — passed, 7 tests across 2 files.
- `npm test -- --run` — passed, 312 tests across 34 files.
- `npm run build` — passed, core and runtime-omx TypeScript builds.
- `npm pack --dry-run --json` — passed; package `open-scaffold-0.4.14.tgz` includes `.osc/.gitignore` and `docs/TASKS.md`, and excludes dogfood plan/release history.
- `./verify.sh --strict` — passed, 10 pass / 0 fail / 0 warn after plan close and evidence update.
- Built CLI smoke in a temporary initialized scaffold — passed: empty `task list --json`, `task new`, `task list --json`, `task claim`, `task comment`, `task complete`, `task show`, and `status` task counts.
- Codex round-1 hardening — fixed native SQLite install risk by moving `better-sqlite3` to `optionalDependencies`, and fixed `osc status` outside scaffold roots with a regression test; latest local gates after the fix: `npx vitest run tests/tasks.test.ts`, `npm run build:core`, `npm pack --dry-run --json`, `./verify.sh --strict`, `git diff --check`, and `npm test -- --run`.

## Outcome

The slice implements the local task bridge described in plan 061:

- new `src/tasks.ts` SQLite-backed local task storage using `better-sqlite3`;
- `src/cli.ts` `osc task` subcommands and task summary in `osc status`;
- initialized scaffolds receive `.osc/.gitignore` with `tasks.db*`;
- `docs/TASKS.md`, `docs/WORKFLOW.md`, and `docs/OPEN_SCAFFOLD_SYSTEM.md` explain the task DB boundary and usage;
- tests cover graceful no-DB listing, CRUD/filtering, status transitions, comments, plan linking, persistence, status summary integration, invalid options, and scaffold ignore-rule shipping.

Merge, npm publication, and GitHub Release changes remain owner-gated.

## Follow-up

- Merge remains owner-gated.
- If this merges, decide separately whether a package/release-train sync is needed for the new CLI surface.
