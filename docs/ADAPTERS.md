# Integrations, Orchestrators, and Runtime Harnesses

Open Scaffold is the runtime-neutral core. It owns the project contract: mission, roadmap, plans, amendments, verification, evidence, and run artifacts under `.osc/`.

This page uses precise language:

- **Coordinators/orchestrators** — controllers/deciders — decide what should happen next and may maintain or bridge package/task state.
- **Agents** perform work directly when bounded by the Open Scaffold contract.
- **Runtime harnesses** — workflow wrappers around agents — extend a base agent with workflow modes such as teams, planning, persistence, and verification.
- **Task/state bridges** — work queues/status boards — track live operational state.
- **Operator surfaces** — chats/dashboards for human interaction — expose status and approvals.

For the full taxonomy, see [`docs/OPEN_SCAFFOLD_SYSTEM.md`](OPEN_SCAFFOLD_SYSTEM.md). For public/private/future tool availability labels, see [`docs/REFERENCE_TRUTH.md`](REFERENCE_TRUTH.md).

## Choosing a runtime

Runtime selection answers one question: which execution target should a `run.json` work package be prepared for?

```text
User selects a runtime
  -> Open Scaffold reads its runtime profile
  -> Open Scaffold creates the run.json work package
  -> Adapter/coordinator launches the actual runtime outside core
  -> Runtime does the work
  -> Evidence comes back into Open Scaffold
```

### Built-in runtime profiles

| Runtime | Executor lane | Backend | Use when |
|---|---|---|---|
| `omc` | `omc-claude` | Claude Code + OMC | Execution lane is Claude Code with OMC workflow skills. |
| `codex` | `omx-codex` | Codex via OMX | Broad Codex preset; backed by the `runtime-omx` adapter path. |
| `omx` | `omx-codex` | Codex + OMX | Targeting OMX by name directly. |
| `plain` | `plain-agent` | Any capable agent | Runtime-neutral prompt package; no harness skill inferred. |
| `human` | `human` | Human/manual | Manual execution with evidence gates. |

`codex` and `omx` both record the same `omx-codex` lane and `$ralplan` workflow token in `run.json`; `codex` is the broad user-facing preset, `omx` is for operators who want the OMX harness name explicitly.

### Project-local adapters

Drop a JSON file at `.osc/adapters/<id>.json` to define a project-local adapter — a company bot, private wrapper, or experimental runtime. The schema is `open-scaffold.adapter.v1`. Built-in profile ids (`omc`, `codex`, `omx`, `plain`, `human`, `custom`) are reserved and cannot be silently overridden by a project-local file.

Minimal example:

```json
{
  "schemaVersion": "open-scaffold.adapter.v1",
  "id": "company-review-bot",
  "command": ["company-review-bot"],
  "envAllowlist": ["PATH"],
  "timeoutMs": 600000
}
```

Project-local adapter configs are checked into the repo and treated as untrusted configuration until `osc adapter trust <id>` records the reviewed config digest. Trust is invalidated automatically when the config changes.

### Execution authority

Execution authority is explicit: an adapter id plus `--allow-spawn` plus human gates.

Open Scaffold core selects and packages; it never spawns a runtime process by itself. A runtime adapter owns installation, authentication, process launch, sandbox behavior, and the dispatch receipt it returns. Runtime-local logs and session state are forensic — useful for investigation, not durable project truth — until promoted into `.osc/runs/`, evidence docs, PRs, or release notes.

For the full adapter/coordinator lifecycle contract, see [`docs/RUNTIME_BINDING_CONTRACT.md`](RUNTIME_BINDING_CONTRACT.md).

## Generic core: `graphanov/open-scaffold`

Namespace: `.osc/`
CLI: `osc`

Responsibilities:

- Define the repo-native methodology and source-of-truth boundaries.
- Parse missions, roadmap items, plans, amendments, acceptance criteria, and Execution Strategy sections.
- Generate prompt/artifact bundles with `osc` under `.osc/runs/`.
- Keep all outputs inspectable as files.
- Never spawn autonomous agents directly.
- Remain useful to any orchestrator or agent runtime.

## Coordinators, orchestrators, and agents

Open Scaffold should be usable by any capable coordinator, orchestrator, or agent, including:

- Hermes as a **private deployment example** of a coordinator / stateful product-workflow surface.
- Hermes Kanban/Nudge as a **private deployment example** of coordination/control and live task lifecycle.
- Claw / OpenClaw as **coordinator/orchestrator or agent examples**.
- Claude Code, Codex, Gemini / Antigravity as **runtime lane examples**.
- GitHub Issues as a **public example** of public task/intent state.
- custom scripts, CI jobs, or future agent runtimes as **adapter candidates**.

These tools may read and act on Open Scaffold state. They are not required dependencies of the core. When they invoke a runtime harness, they should dispatch a bounded package and receive result artifacts/status back into the source-of-truth chain.

## Runtime harness: OMC / oh-my-claudecode

Base agent: Claude Code
Harness family: OMC / oh-my-claudecode

OMC is a **runtime lane / adapter candidate** for Claude Code execution/orchestration. It is useful when Claude Code is the execution environment. It is not an Open Scaffold adapter in the same class as a coordinator such as Hermes or an orchestrator/agent surface such as Claw/OpenClaw.

Responsibilities when used with Open Scaffold:

- Execute Claude Code-native workflows against a bounded Open Scaffold plan or `run.json` work package (run packet).
- Use workflows such as `/deep-interview`, `/ralplan`, `/team`, `/ralph`, and `/ultrawork` where appropriate.
- Keep OMC runtime state forensic — useful for investigation, not durable project truth — unless promoted into `.osc/runs/`, docs, issues, or PRs.
- Return evidence and status back to the Open Scaffold source-of-truth chain.

Use OMC when the chosen execution lane is Claude Code plus OMC workflow skills.

## Runtime harness: OMX / oh-my-codex

Base agent: Codex
Harness family: OMX / oh-my-codex

OMX is a **runtime lane / adapter candidate** for Codex execution/orchestration. It is useful when Codex is the executor, reviewer, or planner lane. It is not automatically the runtime for Hermes or OMC; a coordinator must explicitly dispatch a bounded package into an OMX/Codex session.

Responsibilities when used with Open Scaffold:

- Execute Codex-native planning, team, persistence, and verification workflows against a bounded Open Scaffold plan or `run.json` work package (run packet).
- Use workflows such as `$deep-interview`, `$ralplan`, `$team`, `$ralph`, `$ultrawork`, and `$ultragoal` where appropriate.
- Keep OMX runtime state forensic — useful for investigation, not durable project truth — unless promoted into `.osc/runs/`, docs, issues, or PRs.
- Return evidence and status back to the Open Scaffold source-of-truth chain.

Use OMX when the chosen execution lane is Codex plus OMX workflow skills.

## Task/state bridges

Task/state bridges track live work state: queued, ready, running, blocked, review, done.

Examples:

- Hermes Kanban
- GitHub Issues
- Linear/Jira
- local task queues
- custom orchestrator state

Open Scaffold should link to these systems without turning any one of them into a hard dependency.

The preferred bridge is a task/run split:

```text
Task system owns task_id and live lifecycle.
Open Scaffold `run.json` work package owns run_id, executor choice, context package, bindings, and evidence paths.
Harness/runtime owns execution while alive.
Operator surface mirrors/questions/approves through a binding.
```

Use `osc run <plan> --task-id <id> --executor <lane> --harness-skill <skill> ...` to create a runtime-neutral `.osc/runs/<run_id>/run.json` package. The core still does not spawn; adapters/coordinators consume that package according to the runtime adapter contract (runtime binding contract). See [`docs/TASK_RUN_MODEL.md`](TASK_RUN_MODEL.md) and [`docs/RUNTIME_BINDING_CONTRACT.md`](RUNTIME_BINDING_CONTRACT.md).

## Event/session routing glue

Routing glue moves events between runtimes, sessions, and operator surfaces. clawhip-style tooling belongs here.

It may:

- bind a chat thread or session id to a canonical `run_id`
- forward active-session and completion events
- route blockers/questions to Discord or another cockpit
- attach session/log/status metadata to a task or `run.json` work package

It should not:

- make a chat thread the canonical task/run
- route replies by "latest pending message" when `question_id`/`run_id` correlation is required
- decide the plan
- execute the task
- become the task database
- replace Open Scaffold/GitHub/task-system evidence

## Operator surfaces / glass cockpits — human dashboards/control rooms

Operator surfaces display and route human interaction:

- Discord
- Slack
- Telegram
- CLI dashboards
- GitHub comments
- web dashboards

A glass cockpit may show:

- roadmap nudges
- active sessions
- blockers and questions
- worker reports
- approval requests
- GitHub issue/PR links
- evidence receipts

Rule:

```text
The glass cockpit is the window and steering wheel.
The repo/task/GitHub chain remains the durable truth.
```

## Rule of thumb

```text
Open Scaffold = repo protocol and methodology.
Coordinators = choose what should happen next and manage/bridge task state.
Agents = perform bounded work.
OMC = Claude Code execution/orchestration lane.
OMX = Codex execution/orchestration lane.
Event routers = session/status transport.
Task bridges = live operational state.
Operator surfaces = glass cockpit / human control room.
GitHub = public/versioned implementation layer.
```

Do not put runtime-specific hook logic into generic Open Scaffold core. Put harness-specific behavior in the runtime integration that owns that behavior.
