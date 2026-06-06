# Open Scaffold System Ontology

Open Scaffold is not an agent runtime. It is a repo-native work record and repository protocol that lets different humans, agents, orchestrators, runtime harnesses, task systems, and operator surfaces — the places people watch, steer, and approve work — cooperate without losing the thread.

## One-sentence definition

Open Scaffold is a runtime-neutral repository protocol for agent-orchestrated development: mission, roadmap, plans, amendments, evidence, handoffs, verification gates, and publication traces as durable files.

## Reader path

This document is the full ontology. Most readers do not need every protocol page.

- New here? Read the [README](../README.md), then [`docs/EXAMPLES.md`](EXAMPLES.md) for the 60-second viewer demo.
- Wiring task/run identity into a coordinator or task system: [`docs/TASK_RUN_MODEL.md`](TASK_RUN_MODEL.md).
- Using repo-local tasks before an external tracker: [`docs/TASKS.md`](TASKS.md).
- Understanding runtime handoff progressively: [`docs/RUNTIME_SELECTION.md`](RUNTIME_SELECTION.md) for choosing a lane, [`docs/RUNTIME_PROFILES.md`](RUNTIME_PROFILES.md) for profile metadata, then [`docs/RUNTIME_BINDING_CONTRACT.md`](RUNTIME_BINDING_CONTRACT.md) and [`docs/SPAWNING_BOUNDARY.md`](SPAWNING_BOUNDARY.md) for adapter/runtime responsibilities.
- Closing a slice and producing evidence: [`docs/SLICE_CLOSE_PROTOCOL.md`](SLICE_CLOSE_PROTOCOL.md).
- Recording multi-attempt improvement loops and frontier promotion: [`docs/EVOLUTION_LOOP.md`](EVOLUTION_LOOP.md).
- Exposing repo truth to MCP-capable tools: [`docs/MCP.md`](MCP.md).
- Reading public mentions of named tools (Hermes, OMC, OMX, Discord, etc.): [`docs/REFERENCE_TRUTH.md`](REFERENCE_TRUTH.md) for the public/private/adapter labels.

## Layers

### 1. Open Scaffold core

Open Scaffold core owns the portable project substrate:

- `MISSION.md` — product/project intent, goals, non-goals, changelog.
- `ROADMAP.md` — directional backlog and milestone story.
- `.osc/plans/` — immutable plans, amendments, stage-folder status.
- `.osc/specs/` — durable specs and context packs.
- `.osc/runs/` — generated `run.json` work packages (run packets), prompt bundles, execution evidence.
- `docs/` — decisions, workflow standards, examples, operator guidance.
- `docs/GLASS_COCKPIT_PROTOCOL.md` — runtime-neutral event vocabulary for status, blockers, questions, approvals, evidence receipts, PR links, and build-in-public streams.
- `docs/RUNTIME_BINDING_CONTRACT.md` — binding lifecycle and responsibilities for OMC/OMX/plain-agent/human lanes that consume `run.json` work packages (run packets) outside core.
- `docs/SLICE_CLOSE_PROTOCOL.md` — evidence receipts, postflight decisions, approval strength, correction routing, and next-slice inheritance.
- `docs/EVOLUTION_LOOP.md` — multi-attempt loop state, attempt journals, frontier promotion, and improvement routing.
- `osc mcp serve` / `osc-mcp` — optional stdio MCP server that exposes local mission, plan, evidence, status, rules, and roadmap state to MCP-capable tools without requiring each agent to parse markdown directly.
- External trackers / GitHub Issues — optional work-queue bindings around the repo record. Historical/repositioned note: the earlier `osc task` local SQLite bridge and `.osc/tasks.db` store were removed from the reduced maintained CLI; see [`docs/TASKS.md`](TASKS.md) for retired design context.
- `verify.sh` / `osc verify` — methodology compliance and evidence-chain structural checks.
- `osc trace` — read-only local work-record replay for one plan.
- `.github/` templates — issue and PR traceability for GitHub-centered workflows.

Core does **not** spawn agents. It defines the contract that agents and tools can use. The MCP server is an interface over local repo truth, not a planner, task database, execution controller, or runtime launcher. Per the 2026-05-29 MCP posture ADR, future write-capable MCP work must inherit the `osc work` controller/human-gate model rather than bypass it.

### 2. Coordinators, orchestrators, and agents

Coordinators/orchestrators decide what should happen next, maintain or bridge task state, and interact with the operator. Agents may also perform work directly against the Open Scaffold substrate.

Examples:

- Hermes as coordinator / stateful product-workflow surface.
- Hermes Kanban as live package/task state and nudge-driven lifecycle.
- Claw / OpenClaw as autonomous coding or orchestration agent family.
- Claude Code, Codex, Gemini / Antigravity as base agent runtimes.
- GitHub Issues as public task/intent state when work should be versioned publicly.
- Custom scripts, CI bots, or local task queues.

These tools may read roadmap items, create plans, create/live-update tasks, choose executor lanes, ask for approval, open PRs, or update evidence — but they should preserve Open Scaffold’s source-of-truth boundaries.

A coordinator should dispatch **bounded packages** into execution lanes rather than letting multiple systems mutate the same worktree and truth state at once.

### 3. Runtime harnesses — workflow wrappers around base agents

Runtime harnesses extend a base agent with workflow modes, teams, persistence, planning, or verification. Bindings that launch those harnesses from Open Scaffold `run.json` work packages (run packets) are defined in [`docs/RUNTIME_BINDING_CONTRACT.md`](RUNTIME_BINDING_CONTRACT.md).

They are not the same class as orchestrators like Hermes or Claw/OpenClaw.

#### OMC

OMC / oh-my-claudecode is a Claude Code workflow/orchestration harness.

It can provide Claude Code-native capabilities such as:

- `/deep-interview`
- `/ralplan`
- `/team`
- `/ralph`
- `/ultrawork`
- hooks, agents, skills, HUD, notifications, and team workflows

Use OMC when the execution lane is Claude Code plus OMC-specific workflows.

#### OMX

OMX / oh-my-codex is a Codex workflow/execution harness.

It can provide Codex-native capabilities such as:

- `$deep-interview`
- `$ralplan`
- `$team`
- `$ralph`
- `$ultrawork`
- `$ultragoal`
- goal modes, tmux teams, state surfaces, and verification workflows

Use OMX when the execution lane is Codex plus OMX-specific planning/execution workflows.

### 4. Task and state bridges — work queues/status boards

Task systems hold live operational state: what is ready, running, blocked, under review, or done.

Examples:

- Hermes Kanban
- GitHub Issues
- Linear
- Jira
- historical/repositioned local `.osc/tasks.db` task queues from the retired `osc task` bridge
- a custom orchestrator board

Open Scaffold should define how roadmap items and plans link to these systems, but it should not assume one board is universal. The dispatch pattern is documented in [`docs/RUNTIME_HARNESS_DISPATCH.md`](RUNTIME_HARNESS_DISPATCH.md): core creates the package, coordinators/task bridges choose and launch the harness, and evidence returns to `.osc/runs`, GitHub, or release notes.

A live task should dispatch work through a canonical run record instead of through a chat thread or runtime transcript directly. See [`docs/TASK_RUN_MODEL.md`](TASK_RUN_MODEL.md) for the v1 task/run/operator-surface schema. A task or run should close through the evidence-backed slice-close protocol in [`docs/SLICE_CLOSE_PROTOCOL.md`](SLICE_CLOSE_PROTOCOL.md), not merely because a runtime or chat message says "done".

```text
task_id = durable product/work item
run_id = one execution attempt
question_id = one blocking clarification/approval inside a run
thread_id = optional operator-surface binding
session/worktree/branch/PR = runtime/publication bindings
```

### 5. Event/session transport

Event/session transport routes notifications, session updates, and status messages between runtimes and operator surfaces. It is glue, not the planner or executor.

Examples:

- clawhip-style event/session notification routing
- webhook listeners
- gateway adapters
- tmux/session notification hooks

Transport can post active-session updates, blockers, and completion events into a glass cockpit — an operator dashboard/control room. It should not become canonical task state or perform planning/execution itself.

### 6. Operator surfaces / glass cockpits — human dashboards/control rooms

Operator surfaces let humans and teams see, steer, approve, or unblock work.

Examples:

- Discord
- Slack
- Telegram
- CLI dashboards
- GitHub issue/PR comments
- web dashboards

The glass cockpit can run in several modes:

- **Private cockpit:** solo dev / personal agent room.
- **Team control room:** internal engineering room.
- **Build-in-public room:** public or semi-public devlog channel.
- **Stakeholder room:** curated client/product updates.

Operator surfaces are **not canonical truth**. They should link back to roadmap items, task IDs, `run.json` work packages (run packets), evidence, issues, branches, and PRs. Their event vocabulary is documented in [`docs/GLASS_COCKPIT_PROTOCOL.md`](GLASS_COCKPIT_PROTOCOL.md).

### 7. GitHub/public versioning layer

GitHub owns public/versioned implementation state:

- issues
- branches
- PRs
- reviews, including Codex connector review when enabled
- CI results
- releases

A mature Open Scaffold workflow should make GitHub artifacts traceable to roadmap items, task IDs, run IDs, plans, evidence, and verification gates. See [`docs/GITHUB_WORKFLOW.md`](GITHUB_WORKFLOW.md).

## Correct boundary statements

Use [`docs/REFERENCE_TRUTH.md`](REFERENCE_TRUTH.md) when deciding whether a named tool is a public example, private deployment example, adapter candidate, runtime lane, operator surface, or historical/unmigrated repository.

Use these statements in product docs and agent prompts:

```text
Open Scaffold is the repo protocol, not the agent runtime.
Slice close requires evidence, acceptance-gate status, and an explicit approval/rejection/block decision; chat alone is not closure.
Hermes is a coordinator / stateful product-workflow surface that may use Kanban, nudges, package/task state, and operator interaction.
Hermes Kanban/Nudge is a coordination/control layer, not a Codex or Claude Code runtime.
Claude Code, Codex, Gemini, Claw/OpenClaw, and custom agents can operate Open Scaffold directly when bounded by the repo contract.
OMC is a Claude Code execution/orchestration lane.
OMX is a Codex execution/orchestration lane.
OMX is not automatically the runtime engine for Hermes or OMC; it becomes one only when a coordinator dispatches a bounded package into an OMX/Codex session.
Open Scaffold can invest heavily in an OMX-based agentic runtime/engine path through explicit runtime packages such as `packages/runtime-omx/` while keeping core contracts, evidence, and approval boundaries separate from process spawning.
clawhip-style tooling is routing/status/event transport, not the planner or executor.
Discord is a glass cockpit, not canonical state.
A chat thread is a binding on a task/run, not the task/run itself.
GitHub is public/versioned work truth.
```

## Anti-patterns

Avoid these claims:

```text
OMX is an Open Scaffold adapter in the same sense Hermes is.
OMX is automatically the runtime engine for any Hermes or OMC workflow.
OMC is the Open Scaffold orchestrator.
clawhip is the planner or executor.
Discord is the task database.
Runtime session logs are durable project truth.
A chat transcript is enough evidence for done.
Open Scaffold requires one preferred agent runtime.
Multiple coordinators/runtimes can mutate the same worktree at once safely.
```

## Integration pattern

A clean coordinator-to-runtime flow looks like this:

```text
User selects runtime
  -> Open Scaffold reads runtime profile
  -> Open Scaffold creates the run.json work package (run packet)
  -> Adapter/coordinator launches the actual runtime
  -> Runtime does the work
  -> Evidence comes back into Open Scaffold
  -> Evaluation/audit envelopes and optional evolution-loop attempts/frontier record what happened
  -> Slice close records approval, corrections, or next-slice inheritance
```

Rules:

- Keep coordinator state separate from runtime execution state.
- Dispatch bounded packages; do not let Hermes, OMC, OMX, and Discord all become competing brains.
- Do not make Hermes/OMC/OMX mutate the same worktree at the same time unless the plan explicitly defines isolation and merge rules.
- Treat event routers such as clawhip as transport for session/status events, not as the source of planning or execution truth.
- Require an executable package before harness dispatch: clear objective, bounded scope, testable acceptance criteria, explicit constraints/non-goals, verification, and no blocking open questions.
- If the package is ambiguous, route to clarification, interview, Seed/spec generation, or a harness-specific deep-interview mode before implementation.

## Shell scripts and CLI boundary

Shell scripts are the zero-dependency compatibility floor. They make a fresh template clone usable before `npm install`, global CLI setup, Hermes, OMC, OMX, or any agent runtime exists. The richer tested path is the `osc` CLI; over time shell helpers should remain thin wrappers or fallbacks rather than becoming a separate strategic brain.

```text
bootstrap.sh / verify.sh = day-zero floor
osc CLI = canonical tested package/run implementation
amend.sh / close.sh / delegate.sh = compatibility helpers that should converge toward osc-backed behavior
```

## Self-dogfood loop

Open Scaffold should be developed with Open Scaffold:

```text
ROADMAP.md
  -> GitHub issue or live task
  -> .osc plan / amendment
  -> runtime/harness handoff when needed
  -> .osc run.json work package / evidence
  -> verification gate
  -> PR / release note
  -> roadmap update
```

This is the product proof. The framework earns trust by using its own protocol to evolve.
