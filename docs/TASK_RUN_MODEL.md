# Task, Run, and Operator-Surface Model

Open Scaffold separates product intent, operational task state, execution attempts, runtime sessions, and chat/operator surfaces. This prevents a Discord thread, terminal transcript, or runtime state folder from becoming the only place the system remembers what is true.

## Core rule

```text
Task owns intent/lifecycle.
Run owns one execution attempt.
Harness owns execution while alive.
Operator surface: visibility/questions/approvals.
Cockpit event: replaceable visible message that references task/run/question/evidence IDs.
Evidence owns proof.
Evaluation envelope owns AC-to-evidence judgment and improvement routing.
Audit envelope owns integrity-oriented reconstruction.
```

A chat thread may be extremely useful. It is not the canonical task.

## Identity objects

### `task_id`

A durable work item or product slice. It may live in Hermes Kanban, GitHub Issues, Linear/Jira, a local task DB, or another coordinator-owned task system.

Examples:

```text
TASK-2026-0511-auth-reset
kanban:card-123
issue:42
```

A task can have many runs.

### `run_id`

One concrete execution attempt against a task or plan. In Open Scaffold core, a run packet lives under:

```text
.osc/runs/<run_id>/
  run.json
  prompts/
```

A run can succeed, fail, block for a question, be cancelled, or be postflighted. A retry is a new run, not a rewrite of the old one. Slice closure is a separate evidence-backed decision: a postflight can produce `approved`, `weak_approved`, `rejected`, or `blocked` outcomes as defined in [`docs/SLICE_CLOSE_PROTOCOL.md`](SLICE_CLOSE_PROTOCOL.md).

### `evaluation_id`

One post-run/postflight evaluation record that maps acceptance criteria to evidence, evaluator source, feedback, verdict, confidence, and improvement route.

An evaluation can reference one or more runs, but it should not rewrite those runs. If feedback changes the outcome, create a new evaluation record or amend/route the next slice rather than editing history by implication.

### `audit_envelope_id`

One integrity-oriented envelope for reconstructing the slice/run evidence bundle. It can reference plan, run packet, evaluation, evidence receipt, changed files, PR, release note, artifact digests, parent envelopes, and optional external-anchor receipts.

The audit envelope is not raw runtime state. It points to promoted artifacts and safe evidence, preserving privacy and source-of-truth boundaries.

### `question_id`

One blocking clarification, approval request, or human decision inside a run. Human replies should route by structured correlation:

```text
question_id -> run_id -> expected answer schema -> operator response -> resume executor
```

Never route by "latest pending message" when more than one run or question can exist.

### `thread_id` / operator-surface binding

A Discord/Slack/Telegram/GitHub-comment/CLI surface binding. It mirrors status, shows artifacts, asks questions, and collects approvals. It should point back to `task_id`, `run_id`, and evidence paths.

A thread can be replaced, deleted, or unavailable without destroying task/run recovery.

### Runtime binding

A runtime binding consumes `run.json`, validates package quality, launches or hands off to the selected lane outside Open Scaffold core, attaches runtime metadata, and returns evidence. The binding contract is documented in [`docs/RUNTIME_BINDING_CONTRACT.md`](RUNTIME_BINDING_CONTRACT.md).

### Event / cockpit bindings

Cockpit events are status, blocker, question, answer, approval, completion, evidence, PR, release, nudge, or cancellation messages posted to an operator surface. They should carry canonical IDs rather than becoming canonical themselves. See [`docs/GLASS_COCKPIT_PROTOCOL.md`](GLASS_COCKPIT_PROTOCOL.md).

### Runtime bindings

A run may bind runtime resources:

```text
tmux_session
process_id
repo_path
worktree_path
branch
pr_number
log_paths
artifact_paths
```

Runtime state is live/forensic until promoted into the run packet, evidence, docs, issue, PR, or release note. Bindings that launch OMC, OMX, plain-agent, or human lanes should follow [`docs/RUNTIME_BINDING_CONTRACT.md`](RUNTIME_BINDING_CONTRACT.md).

## Minimal run record

`osc run`, `osc delegate`, `osc review`, and `osc ultrareview` generate `run.json` with this v1 shape:

```json
{
  "schemaVersion": "open-scaffold.run.v1",
  "runId": "20260511T120000Z-001-demo-run",
  "taskId": "TASK-2026-0511-demo",
  "mode": "run",
  "status": "created",
  "lifecycleStates": [
    "created",
    "packaged",
    "dispatched",
    "running",
    "waiting_on_operator",
    "completed",
    "failed",
    "blocked",
    "cancelled",
    "postflighted"
  ],
  "createdAt": "2026-05-11T12:00:00.000Z",
  "updatedAt": "2026-05-11T12:00:00.000Z",
  "namespace": ".osc",
  "sourceRefs": ["kanban:card-123", "issue:42"],
  "plan": {
    "slug": "001-demo",
    "path": ".osc/plans/active/001-demo.md",
    "goal": "Ship the bounded slice.",
    "acceptanceCriteria": [],
    "verificationSteps": [],
    "openQuestions": []
  },
  "packageQuality": {
    "executable": true,
    "blockers": [],
    "requiredAction": null
  },
  "executor": {
    "lane": "omx-codex",
    "harnessSkill": "$ralplan",
    "spawning": false,
    "note": "Generic open-scaffold creates prompt/artifact bundles only. Coordinators or runtime adapters perform autonomous spawning."
  },
  "runtime": {
    "repoPath": "/repo",
    "worktreePath": "/worktree",
    "branch": "feat/demo",
    "tmuxSession": null,
    "processId": null
  },
  "bindings": {
    "operatorSurface": "discord",
    "operatorThreadId": "thread-456",
    "githubIssue": "42",
    "githubPr": null
  },
  "artifacts": {
    "runDir": ".osc/runs/...",
    "manifest": ".osc/runs/.../run.json",
    "prompts": [],
    "logs": [],
    "outputs": [],
    "evidence": []
  },
  "questions": [],
  "commitPolicy": "no commit/push unless explicitly approved by the operator",
  "note": "Canonical lifecycle belongs to the task/run record. Chat threads mirror/control via bindings; they are not canonical task identity."
}
```

Generic Open Scaffold sets `spawning: false`: the core writes the package and bindings; a coordinator or runtime adapter performs actual dispatch. See [`docs/RUNTIME_HARNESS_DISPATCH.md`](RUNTIME_HARNESS_DISPATCH.md) for the public pattern that maps `.osc/runs/<run_id>/run.json` into OMX/OMC/plain-agent/human execution without moving private control-plane machinery into core.

## Lifecycle states

Recommended states:

```text
created
  -> packaged
  -> dispatched
  -> running
  -> waiting_on_operator
  -> completed | failed | blocked | cancelled
  -> postflighted
```

State transitions should be idempotent. A restarted coordinator may re-read the run store, repost current status, or re-bind a cockpit thread without duplicating terminal summaries, open questions, or completion reports.

`postflighted` is not the same as `approved`. Postflight means the evidence was reviewed against acceptance criteria. The close decision may still be `approved`, `weak_approved`, `rejected`, or `blocked`; record that decision using the slice-close protocol.

## Executable package gate

No harness should execute unbounded prose. A run package should contain:

```yaml
objective: clear
scope: bounded
acceptance_criteria: testable
constraints: explicit
non_goals: explicit
verification: command/evidence
open_questions: none that block execution
commit_policy: explicit
```

If the package is missing goal, acceptance criteria, verification, or has blocking open questions, the correct next step is clarification, interview, Seed/spec generation, or a harness-specific deep-interview mode — not implementation.

Open questions are treated as blocking only when explicitly marked with a blocking prefix such as `BLOCKING: ...`, `[BLOCKING] ...`, or `Blocking - ...`. Strategic/future open questions can remain in a plan without preventing package creation.

## Chat-in-the-loop pattern

```text
Kanban/GitHub/CLI/chat creates or selects task_id
  -> coordinator creates run_id and .osc/runs/<run_id>/run.json
  -> optional chat thread is attached as a binding
  -> executor session/worktree/branch is attached as runtime metadata
  -> questions route by question_id/run_id/thread_id
  -> artifacts, PRs, and evidence update the run and task
  -> restart recovery scans task/run store and bindings, then rehydrates surfaces
```

## Source-of-truth boundaries

- Roadmap: direction and invariants.
- Plan/spec/package: executable slice contract.
- Task system: operational lifecycle.
- Run packet: exact attempt contract and bindings.
- Runtime harness: execution while alive.
- Operator surface: visibility/questions/approvals.
- GitHub PR/release: versioned publication.
- Evidence receipt / postflight: proof, approval strength, correction routing, and next-slice inheritance.
- Evaluation envelope: per-acceptance-criterion judgment, feedback capture, confidence, and improvement route.
- Audit envelope: integrity-oriented reconstruction of promoted evidence, artifact digests, parent links, and optional anchors.
- Evidence: proof of what happened.

## Anti-patterns

Avoid:

- using a Discord thread as the canonical task ID;
- treating chat scrollback as the only recovery source;
- mutating a terminal session based on an uncorrelated latest reply;
- letting multiple runtimes mutate one worktree without isolation/merge rules;
- calling a task executable when acceptance criteria or verification are missing;
- rewriting a failed run instead of creating a new retry run.
