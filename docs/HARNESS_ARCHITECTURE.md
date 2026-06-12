# Harness architecture

Open Scaffold's harness is a transport-agnostic work-record layer for AI-assisted work.

In plain terms: it turns a request into repo files a human can inspect later — plan, work package, status, evidence links, gates, feedback, and post-run notes.

It is not a Codex-only plugin and not an autonomous agent. The core receives a command, writes repo-local truth, emits status/events, and hands bounded work to an adapter or human-controlled runtime.

Pivot note (plan 167): the maintained core of this architecture is the work
record, the handoff packet (`osc handoff`), and the judgment layer
(`osc analyze` / `osc gate`). The `$`-verb command grammar and the
runtime-dispatch layers described below are deprecated — functional behind
`osc help --all`, removal staged as plan 168 — kept here as architecture
history until then.

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

`core_runtime_spawning` is false for dry-run/status-only packages and true after `$work --allow-spawn` actually launches a runtime adapter for that run.

Events are JSONL records with `schema: "osc.harness-event.v1"`. Current event types include:

- `command_started`
- `human_gate`
- `human_gate_answered`
- `runtime_dry_run`
- `runtime_completed`
- `runtime_needs_human`
- `runtime_blocked`
- `runtime_failed`
- `feedback_recorded`
- `retry_created`
- `handoff_packet_written`
- `runtime_resume_started`
- `command_blocked`
- `command_ready`
- `command_completed`
- `team_worker_status`
- `team_worker_resumed`
- `control_room_status`

Each event also includes a small `controlRoom` projection with `transport: "neutral"`, `platform: null`, and no webhook, plugin, Hermes, Electron, or Tauri dependency. CLI, chat, plugin, Hermes, and future app surfaces can render the same event stream without becoming the source of truth.

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

A successful process exit is not enough. Runtime stdout must end with exactly one standalone marker. These marker strings are adapter wire protocol, not product branding:

- `LOMEIN_COMPLETE` → completed receipt, still not owner approval or correctness proof.
- `LOMEIN_NEEDS_HUMAN` → pending human gate; the gate answer resumes the same run as task input.
- `LOMEIN_BLOCKED` → blocked receipt, not success.

Missing, duplicated, non-final, timed-out, signaled, or non-zero output fails closed.

For failed and blocked outcomes, `$work` records feedback before the next attempt. The feedback file carries the repair hypothesis and repo-relative evidence refs. `--retry-of <run-id>` starts a sibling run that links to the old evidence and inherits the newest actionable repair hypothesis instead of overwriting it. If the parent has no feedback yet, the retry packet keeps moving with a bounded fallback repair hypothesis and the same evidence-linking rules.

`$work ... --checkpoint <loop-dir>` adds a mandatory judgment checkpoint before
runtime dispatch. The harness runs the evolution analysis, writes
`judgment-checkpoint.json` and `controller-signal.md`, injects the compact signal
into the work context, and refuses to launch an adapter when retry is blocked by
`stop` or `redesign`. This is the product-side version of enforced retry
discipline: judgment is mandatory, bookkeeping stays ambient.

Every `$work` postflight with a runtime receipt writes `ambient-record.json`
(`osc.ambient-work-record.v1`). It is extracted by the harness from the run
packet, runtime receipt, artifact list, and evidence paths. The worker does not
author this record in-loop, and the record is not approval or correctness
certification. Core does not spawn subprocesses to collect git state for this
record.

When requested, `$work --handoff --handoff-max-chars <n>` writes `.osc/runs/<run-id>/handoff.md` with required resume sections under the budget. This packet is a continuation aid only.

`$team` keeps parity with the same loop: shared evidence, shared feedback path, accepted improvement inheritance when requested, repair hypotheses for blocked or failed worker lanes, worker-level human gates, and one postflight record. A worker lane has:

- an id and role,
- a state (`ready`, `completed`, `waiting_on_human`, `blocked`, or `failed`),
- adapter metadata using `osc.team-worker-adapter-contract.v1`,
- repo-relative evidence links,
- a portable failure code when blocked or failed,
- optional human gate ids.

All worker lanes stay inside one `.osc/runs/<run-id>/` directory. Worker evidence files can exist per lane, but the run keeps one shared `shared-evidence.md`, one `status.json`, one `feedback.jsonl`, and one `postflight.md` so the truth does not split across workers.

A worker gate such as `worker-review-needs-human` appears in the shared `pendingHumanGates` list. Answering it through `osc harness answer` updates the same team run; the answer is task input, not approval.

This keeps the core portable across CLI, Codex plugin, Hermes, and future app surfaces while preserving owner authority.

## Release-readiness boundary

Implemented now:

- `$interview` writes a clarification/work-package draft and missing-context gates.
- `$plan` writes or proposes repo-native plan files.
- `$work` writes controlled work packages, dry-run/runtime receipts, human gates, feedback, retry links, and optional handoff packets.
- `$team` writes shared worker-lane status, gates, evidence links, feedback, and postflight under one run folder.
- `osc bench` writes simulated/live reproduction receipts and handoff-lab reports.

Still experimental or owner-gated:

- Live runtime spawning through `$work --allow-spawn`.
- Full live reproduction suites and broad Open Scaffold > naked Codex claims.
- npm publish, GitHub Release changes, merge, release, deploy, and force-push actions.
