# Harness architecture

Open Scaffold's harness is a transport-agnostic work-record layer for AI-assisted work.

It is not a Codex-only plugin and not an autonomous agent. The core receives a command, writes repo-local truth, emits status/events, and hands bounded work to an adapter or human-controlled runtime.

## Layer diagram

```text
Open Scaffold repo truth
  MISSION.md, .osc/plans, .osc/runs, evidence, improvements
        │
        ▼
Harness command router
  $interview | $plan | $work | $team
        │
        ▼
Controlled work runtime package
  run.json, human gates, worker lanes, status, events
        │
        ▼
Runtime adapter launch (explicit authority only)
  Codex first; project-local adapters for tests/custom paths
        │
        ▼
Evidence receipt back to repo
  runtime-receipt.json, bounded logs, postflight.md, feedback.jsonl, benchmark aggregates, handoff packets
        │
        ▼
Feedback / improvement loop
  repair hypothesis → retry, amend plan, or accepted lesson
```

## Event/status contracts

Every harness run writes a compact status contract:

```json
{
  "schema": "osc.harness-status.v1",
  "runId": "harness-work-example",
  "command": "work",
  "state": "ready",
  "pendingHumanGates": [],
  "artifacts": [],
  "workers": [],
  "boundary": {
    "feedback_is_not_approval": true,
    "core_runtime_spawning": false,
    "human_owns_merge_publish_release": true
  }
}
```

Events are JSONL records with `schema: "osc.harness-event.v1"`. Current event types include:

- `command_started`
- `human_gate`
- `human_gate_answered`
- `runtime_dry_run`
- `runtime_completed`
- `runtime_needs_human`
- `runtime_blocked`
- `runtime_failed`
- `runtime_resume_started`
- `command_blocked`
- `command_completed`

These are deliberately small so chat/plugin/desktop surfaces can render progress without reading raw logs.

## Human gate shape

A required gate pauses dispatch until answered:

```json
{
  "id": "missing-required-context",
  "required": true,
  "status": "pending",
  "prompt": "work needs missing task context before execution continues..."
}
```

After answer:

```json
{
  "status": "satisfied",
  "answer": {
    "boundary": {
      "answer_is_task_input": true,
      "answer_is_not_approval": true,
      "does_not_grant_commit_push_merge_publish_release": true
    }
  }
}
```

## Evidence links

Harness results return artifact links instead of dumping raw logs into chat:

```json
{
  "role": "run_packet",
  "path": ".osc/runs/<run-id>/run.json",
  "schema": "osc.controlled-work-run.v1"
}
```

Future surfaces should display these links, not paste entire logs by default.

## Runtime adapters

Open Scaffold owns:

- command parsing,
- run package creation,
- explicit spawn-authority checks,
- marker parsing,
- gates,
- status/events,
- bounded/redacted runtime logs,
- repo-relative adapter receipts,
- feedback records,
- benchmark/proof receipts.

Adapters own:

- the external runtime command,
- model/provider selection,
- sandbox/tool behavior while alive,
- the actual work attempted inside the bounded package.

`$work` refuses to launch an adapter unless the command includes explicit backend authority such as `--allow-spawn`. Without that flag, it still writes a dry-run receipt so the handoff is reviewable.

A successful process exit is not enough. Runtime stdout must end with exactly one standalone marker:

- `LOMEIN_COMPLETE` → completed receipt, still not owner approval or correctness proof.
- `LOMEIN_NEEDS_HUMAN` → pending human gate; the gate answer resumes the same run as task input.
- `LOMEIN_BLOCKED` → blocked receipt, not success.

Missing, duplicated, non-final, timed-out, signaled, or non-zero output fails closed.

This keeps the core portable across CLI, Codex plugin, Hermes, and future app surfaces while preserving owner authority.
