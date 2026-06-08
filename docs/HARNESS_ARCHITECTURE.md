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
Runtime adapter boundary
  Codex first; Hermes / Claude / desktop adapters later
        │
        ▼
Evidence receipt back to repo
  postflight.md, feedback.jsonl, benchmark aggregates, handoff packets
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

Open Scaffold core owns:

- command parsing,
- run package creation,
- gates,
- status/events,
- feedback records,
- benchmark/proof receipts.

Adapters own:

- process spawning,
- model/provider selection,
- sandboxing,
- long-running worker lifecycle,
- tool-specific logs.

This keeps the core portable across CLI, Codex plugin, Hermes, and future app surfaces.
