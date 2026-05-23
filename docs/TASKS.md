# Local Tasks

`osc task` is the optional local task bridge for solo developers and small teams that do not want to wire GitHub Issues, Linear, Jira, or an external Kanban board on day one.

It is intentionally small:

- task data lives in `.osc/tasks.db`;
- the database is local and gitignored;
- IDs are local short codes such as `T-001`;
- statuses are `todo`, `in-progress`, `blocked`, `done`, and `cancelled`;
- priorities are `high`, `medium`, and `low`;
- tasks may link to an Open Scaffold plan with `--plan <slug>`, but tasks and plans stay independent.

The task database is not a team project-management replacement. Use GitHub Issues, Linear, Jira, Hermes Kanban, or another shared coordinator when multiple people or automation lanes need shared live state.

## First commands

```bash
osc task list
osc task new "Fix login redirect bug" --priority high --plan 050-npm-publish
osc task list --status todo
osc task show T-001
osc task claim T-001
osc task comment T-001 "Investigated the redirect path"
osc task block T-001 --reason "Waiting for npm access token"
osc task complete T-001
```

`osc task list --json` prints a JSON array for scripts and local dashboards.

## Tasks versus plans

Use a task when you need a lightweight operational reminder or status marker:

- something to pick up next;
- a small blocker note;
- a local checklist item that should survive shell history;
- a work item that may later become a GitHub issue or plan.

Use a plan when the work is non-trivial and needs acceptance criteria, files-to-touch, verification steps, and close evidence.

A task can link to a plan:

```bash
osc task new "Implement local task DB" --plan 061-local-task-database
osc task link T-001 --plan 061-local-task-database
```

The link is just traceability. Closing a plan does not automatically complete tasks, and completing a task does not close a plan.

## Tasks versus GitHub Issues

Use local tasks for private, repo-local, day-one operation. Use GitHub Issues when work should be public, shared, discussed, assigned, referenced from PRs, or managed across clones.

Local task IDs such as `T-001` are only unique inside the repo's `.osc/tasks.db`. They are not global product IDs.

## Storage and safety

`.osc/tasks.db` is SQLite-backed and ignored by `.osc/.gitignore` via `tasks.db*`, which also covers local SQLite sidecar files if they appear.

No task command uses the network, starts a daemon, syncs in the background, or stores secrets. The database is local operator state; promote durable product proof into plans, evidence notes, PRs, or GitHub issues when it needs to be reviewed or shared.
