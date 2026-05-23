# Plan: 061-local-task-database

## Status

done


## Context

Open Scaffold's system ontology describes Kanban, GitHub Issues, Linear, and Jira as task bridges — the operational layer that tracks what's ready, running, blocked, or done. But the scaffold itself ships with zero task tracking. A solo developer adopting Open Scaffold today has nowhere to put "things I need to do" inside the scaffold. They must bring their own GitHub Issues project, set up a Kanban board, or keep a mental list. This is the #1 "now what?" gap after `osc init`. A lightweight local task database — not a Kanban replacement, not a project management tool, just durable task tracking that lives in the repo — closes this gap. Follows the task/run identity model in `docs/TASK_RUN_MODEL.md` and the folder-as-state-machine pattern.

## Goal

Ship a lightweight, SQLite-backed local task database with `osc task` subcommands (new, list, claim, start, complete, comment, link) that gives solo developers and small teams basic durable task tracking without requiring any external system.

## Constraints / Out of scope

- The task DB is local and optional — `osc task` commands fail gracefully if no tasks.db exists (no crash, just report zero tasks).
- Task DB file lives at `.osc/tasks.db` (gitignored — added to `.osc/.gitignore`).
- NOT a Kanban replacement — no swimlanes, no WIP limits, no multi-assignee, no due dates in v1.
- NOT multi-user — SQLite is local. For team use, recommend GitHub Issues or a shared coordinator.
- Tasks can optionally link to a plan (`--plan <slug>`), but tasks and plans are independent — a task can exist without a plan and vice versa.
- Task IDs are auto-generated short codes (e.g., `T-001`, `T-002`) for easy human reference.
- NO network access, NO daemon, NO background sync. Pure file-backed SQLite.
- Statuses: `todo`, `in-progress`, `done`, `blocked`, `cancelled` — simple and sufficient.
- Priority: `high`, `medium`, `low` — optional, defaults to medium.

## Files to touch

- `src/tasks.ts` — new file: SQLite schema creation, CRUD operations, list with filters, status transitions
- `src/cli.ts` — wire `osc task new|list|claim|start|complete|comment|link|show` subcommands
- `tests/tasks.test.ts` — test task creation, listing, filtering, status transitions, plan linking, persistence across CLI invocations
- `.osc/.gitignore` — add `tasks.db` line (or `tasks.db*` if WAL/SHM files are generated)
- `docs/TASKS.md` — new file: task system guide, relationship to plans, when to use tasks vs plans vs GitHub Issues
- `docs/OPEN_SCAFFOLD_SYSTEM.md` — add local task database to the task bridges section as an optional local option
- `docs/WORKFLOW.md` — mention `osc task` commands in the Execute phase section

## Acceptance criteria

- [ ] `osc task new "Fix login redirect bug" --priority high --plan 050-npm-publish` creates a task with auto-generated ID (T-001), sets status to `todo`, stores timestamp, and prints the task ID
- [ ] `osc task list` shows all tasks with ID, status, priority, title, and linked plan (if any) in a readable table
- [ ] `osc task list --status todo` filters to tasks with that status
- [ ] `osc task list --priority high` filters by priority
- [ ] `osc task list --plan 050-npm-publish` filters by linked plan
- [ ] `osc task show T-001` displays full task details including all comments with timestamps
- [ ] `osc task claim T-001` transitions task from `todo` to `in-progress` and records the transition timestamp
- [ ] `osc task start T-001` is an alias for `claim` (ergonomic — matches common mental model of "starting" work)
- [ ] `osc task complete T-001` transitions to `done` with completion timestamp
- [ ] `osc task block T-001 --reason "Waiting for npm access token"` transitions to `blocked` with a reason stored in the task
- [ ] `osc task cancel T-001` transitions to `cancelled`
- [ ] `osc task comment T-001 "Investigated: the redirect uses window.location not router.push"` adds a timestamped comment to the task
- [ ] `osc task link T-001 --plan 060-mcp-server` adds or changes the linked plan
- [ ] Tasks survive between CLI invocations — close terminal, reopen, `osc task list` shows same tasks (SQLite persistence verified)
- [ ] `osc status` includes task summary counts when `.osc/tasks.db` exists (e.g., "Tasks: 3 todo, 2 in-progress, 12 done")
- [ ] Commands fail gracefully when no tasks.db exists: `osc task list` outputs "No tasks yet. Create one with `osc task new <title>`"
- [ ] `osc task list --json` outputs machine-parseable JSON array for CI/scripting
- [ ] Existing tests pass, new task tests cover all CRUD operations and edge cases

## Verification steps

1. **CRUD cycle:** Run `osc task new "Test task 1" --priority high`. Note the ID. Run `osc task list --json | jq '.[] | select(.id=="T-001")'`. Verify title, priority, status=todo.
2. **Status transitions:** Run `osc task claim T-001`, then `osc task show T-001`, verify status=in-progress. Run `osc task complete T-001`, verify status=done.
3. **Comments:** Run `osc task comment T-001 "Found the issue"` then `osc task show T-001`, verify comment appears with timestamp.
4. **Persistence:** After closing terminal, run `osc task list` again. Verify T-001 still exists.
5. **Plan linking:** Run `osc task new "Test with plan" --plan 060-mcp-server`. Verify `osc task list --plan 060-mcp-server` shows it.
6. **Graceful degradation:** Delete `.osc/tasks.db`. Run `osc task list`. Verify friendly "no tasks" message, not error.
7. **Status integration:** Run `osc status`. Verify task counts appear when tasks.db exists. Delete tasks.db, run `osc status`, verify no crash.

## Open questions

- Should `osc task` use a separate WAL-mode SQLite file or a simpler JSON file? SQLite is preferred for durability and query flexibility (filtering by status/priority/plan is trivial with SQL, painful with grep on JSON). Trade-off: adds a native dependency or uses better-sqlite3 (native addon) or sql.js (WASM). Recommendation: use `better-sqlite3` for performance, with graceful fallback message if native build fails ("Install with npm install --build-from-source or use GitHub Issues for task tracking").
- Should task IDs be globally unique or per-project? Auto-increment simple integers (T-001, T-002) are local to the DB file. This is sufficient for local use. If multiple repos share tasks, they'd use GitHub Issues.
- Should completed tasks be archived or kept in the active DB? Keep all tasks in the DB; filtering by status handles the UX. Archival could be a future `osc task archive` command.
- Should `osc task` support tags/labels in v1? Defer — add after priority proves useful. Tags add schema complexity (many-to-many) without clear demand signal.
