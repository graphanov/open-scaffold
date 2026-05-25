# Glass Cockpit Protocol

Open Scaffold treats operator surfaces — the places people watch, steer, and approve work — as control glass, not truth. Discord, Slack, Telegram, GitHub comments, CLI dashboards, web UIs, and webhook-fed rooms can show status, ask questions, request approval, and publish progress. They should not become the only place the project remembers what happened.

This protocol defines a runtime-neutral event shape for private control rooms, team rooms, stakeholder rooms, and build-in-public streams.

## Executive rule

```text
Cockpits show and steer.
Tasks track.
Runs execute.
Evidence proves.
GitHub publishes.
```

A cockpit event is useful only when it points back to the durable chain: roadmap item, plan/spec, task ID, run ID, question ID, evidence path, issue, PR, or release.

## Layer ownership

| Layer | Owns | Does not own |
|---|---|---|
| Open Scaffold core | event vocabulary, required fields, source-of-truth boundaries | live bot, chat backend, gateway, runtime auth |
| Event/session transport | delivery to Discord/Slack/Telegram/GitHub/CLI/webhook surfaces | planning, execution, canonical task state |
| Coordinator/task bridge | operational state, assignment, retries, blockers, review queue | final evidence by itself |
| Runtime harness/agent | bounded execution while alive | approval, publication, durable truth |
| Operator surface | visibility, questions, answers, approval capture, public narrative | canonical project state |
| Evidence/PR/release | proof and publication | ephemeral chat transcript |

## Cockpit modes

### Private cockpit

A solo operator room for personal projects or sensitive work.

Use for:

- private status updates;
- approval requests;
- blockers and questions;
- evidence links;
- one-person command and control.

Default visibility: private.

### Team control room

An internal engineering/product room.

Use for:

- multi-person coordination;
- handoff between humans and agents;
- review queue updates;
- blockers requiring a named owner;
- PR and release readiness.

Default visibility: internal.

### Build-in-public room

A public or semi-public narrative stream.

Use for:

- progress updates safe to publish;
- demo links;
- release notes;
- non-sensitive blockers;
- public learning loops.

Default visibility: public-safe only. Never post secrets, private logs, customer data, or unreviewed sensitive transcripts.

### Web dashboard

A static browser cockpit generated from repository state.

Use for:

- local visual review without a terminal dashboard;
- stakeholder-friendly snapshots of mission, plans, tasks, evidence, and verification status;
- public-safe build-in-public snapshots that still point back to repository truth.

Default visibility: same as the repository. The generated page is read-only and self-contained: no backend, no network dependency, no external scripts, no analytics, and no chat transcript storage. `osc dashboard --web` writes a static `.osc/dashboard.html` file. `osc dashboard --serve` serves the same view on localhost for local review only; `--open` prints the browser URL without spawning an OS command from core.

### Stakeholder room

A curated room for clients, sponsors, or non-technical stakeholders.

Use for:

- milestone summaries;
- approval requests;
- evidence receipts translated into stakeholder language;
- decision points and risks.

Default visibility: curated.

## Event envelope

Every cockpit event should be able to fit this shape:

```yaml
schema: open-scaffold.cockpit_event.v1
event_id: evt_20260512_001
created_at: 2026-05-12T10:30:00Z
event_type: nudge | session_start | status | blocker | question | answer | approval_request | completion_report | evidence_receipt | pr_link | release_link | cancellation
visibility: private | internal | public | stakeholder
source:
  kind: coordinator | runtime | human | ci | github | scheduler | manual
  name: "optional sender name"
refs:
  roadmap_item: "Milestone 3"
  plan: .osc/plans/active/003-glass-cockpit-event-protocol.md
  task_id: issue:42
  run_id: 20260512T103000Z-glass-cockpit
  question_id: q_001
  evidence: docs/evidence/2026-05-12-glass-cockpit.md
  issue: 42
  pr: 12
  release: v0.3.0
title: "Short human-readable headline"
body: "Human-readable event text."
requires_response: false
response_schema: null
redaction: public_safe | internal_only | private_sensitive
next_action: none | answer_question | approve | review_pr | inspect_evidence | unblock | retry | close
```

Fields may be omitted when not applicable, but these rules hold:

- `event_type` is required.
- `visibility` is required before posting to shared or public surfaces.
- At least one canonical reference should be present for non-trivial work: `task_id`, `run_id`, `question_id`, plan/spec path, evidence path, issue, PR, or release.
- `question` and `approval_request` events require `requires_response: true` and a response path.
- Public events require redaction review.

## Event types

### `nudge`

A prompt to move work forward.

Required references:

- `task_id` or roadmap item when available;
- plan/spec path when the nudge is about a specific slice.

Use for:

- stale task reminders;
- next-action prompts;
- review queue nudges.

Do not use for:

- authoritative closure;
- unbounded execution instructions.

### `session_start`

A runtime, agent, manual work session, or coordinator run has started.

Recommended references:

- `run_id`;
- `task_id`;
- executor lane;
- branch/worktree if relevant.

Example:

```text
Started run 20260512T103000Z-docs-slice on task issue:42. Executor: plain-agent. Commit policy: no push without approval.
```

### `status`

A progress update that does not require immediate human input.

Recommended references:

- `task_id`;
- `run_id`;
- plan/spec path;
- latest evidence path if available.

Status events should be concise. Detailed logs belong in run/evidence files.

### `blocker`

Work cannot continue without something external.

Required references:

- `task_id` or `run_id`;
- blocker owner when known;
- required action.

A blocker should state:

```text
blocked_on: credential | access | human_decision | dependency | environment | verification | upstream_task | unknown
owner: person | team | unknown
required_action: concrete next step
```

### `question`

A blocking clarification or decision request.

Required references:

- `question_id`;
- `run_id` or `task_id`;
- expected answer schema or options;
- where the answer should be recorded.

Never route by latest chat message. Route by:

```text
question_id -> run_id -> expected answer schema -> response -> resume/close/block
```

### `answer`

A response to a specific question.

Required references:

- `question_id`;
- answer author;
- answer value;
- whether it unblocks the run.

Answers should be promoted to the relevant durable layer when they change scope, acceptance criteria, product direction, or evidence.

### `approval_request`

A request for a human or review gate to decide.

Required references:

- `task_id` or `run_id`;
- evidence receipt or PR;
- requested decision;
- approval vocabulary.

Use the slice-close approval taxonomy:

```text
approved | weak_approved | rejected | blocked
```

### `completion_report`

A runtime, coordinator, or human says the execution attempt is finished.

Required references:

- `run_id` or task ID;
- changed files/artifacts;
- verification summary;
- evidence path;
- known gaps.

A completion report is not the same as approval. It should trigger postflight or approval request.

### `evidence_receipt`

A durable proof summary is available.

Required references:

- evidence path;
- acceptance-gate status;
- verification summary;
- related run/task/PR.

This event should point to `docs/SLICE_CLOSE_PROTOCOL.md` evidence shape or a compatible project-specific evidence file.

### `pr_link`

A branch or PR is ready for review.

Required references:

- PR URL or number;
- branch;
- task/run/plan references;
- review gates such as CI, Codex review, or human review.

### `release_link`

A release, tag, changelog, or public artifact is available.

Required references:

- release URL/tag;
- PR(s);
- evidence or release notes;
- visibility classification.

### `cancellation`

A run or task was cancelled.

Required references:

- run/task ID;
- cancellation reason;
- whether artifacts/evidence should be preserved;
- next action: retry, abandon, amend, or block.

## Visibility and redaction

Before posting an event, classify it:

| Visibility | Allowed content | Examples |
|---|---|---|
| `private` | personal/private project details | solo command room |
| `internal` | team-safe internal details | engineering channel |
| `stakeholder` | curated business-safe summary | client/status room |
| `public` | public-safe only | build-in-public post |

Public and stakeholder events should avoid:

- secrets and credentials;
- local absolute paths;
- private user names unless intended;
- customer/confidential data;
- raw runtime logs;
- speculative claims not backed by evidence;
- sensitive failures not approved for disclosure.

## Routing rules

1. **Create or select canonical work first.** A cockpit event should refer to a roadmap item, plan/spec, task ID, run ID, issue, PR, or evidence path.
2. **Use `question_id` for decisions.** Human answers must route to the right run/question, not the most recent message.
3. **Promote durable facts back to files.** If an event changes product truth, create an amendment, evidence receipt, roadmap update, issue comment, PR note, or next-slice plan.
4. **Treat transport as replaceable.** Losing a Discord thread or Slack channel should not destroy recovery.
5. **Separate completion from approval.** A runtime can report completion; a postflight/approval gate decides close status.
6. **Respect visibility.** Redact before public/stakeholder posting.

## Minimal event examples

### Question

```yaml
schema: open-scaffold.cockpit_event.v1
event_type: question
visibility: internal
refs:
  task_id: issue:42
  run_id: 20260512T103000Z-runtime-binding
  question_id: q_runtime_lane
  plan: .osc/plans/active/004-runtime-binding.md
title: "Choose runtime lane"
body: "Should this package target OMX, OMC, plain agent, or manual execution?"
requires_response: true
response_schema:
  type: enum
  values: [omx-codex, omc-claude, plain-agent, manual]
next_action: answer_question
```

### Completion report

```yaml
schema: open-scaffold.cockpit_event.v1
event_type: completion_report
visibility: internal
refs:
  task_id: issue:42
  run_id: 20260512T103000Z-slice-close
  pr: 12
  evidence: .osc/runs/20260512T103000Z-slice-close/postflight.md
title: "Docs slice complete; ready for postflight"
body: "Changed 6 docs. verify.sh, osc verify, tests, and build passed. Known gap: no CLI validator yet."
next_action: inspect_evidence
```

### Build-in-public progress post

```yaml
schema: open-scaffold.cockpit_event.v1
event_type: status
visibility: public
refs:
  roadmap_item: "Milestone 3"
  pr: 12
title: "Open Scaffold glass cockpit protocol drafted"
body: "Defined runtime-neutral events for status, blockers, questions, approvals, and evidence receipts. The repo remains the source of truth; chat is just the control glass."
redaction: public_safe
next_action: none
```

## Anti-patterns

Avoid:

- using Discord/Slack/Telegram as the task database;
- posting "done" without a task/run/evidence reference;
- letting a runtime answer a blocking question without a `question_id`;
- publishing raw logs to public rooms;
- using chat approvals without promoting the decision to evidence, PR, issue, or plan state;
- making one transport mandatory for Open Scaffold core;
- confusing event routers with planners or executors.

## Relationship to other protocols

- `docs/TASK_RUN_MODEL.md` defines `task_id`, `run_id`, `question_id`, and bindings.
- `docs/RUNTIME_HARNESS_DISPATCH.md` defines how coordinators consume run packets and launch harnesses outside core.
- `docs/SLICE_CLOSE_PROTOCOL.md` defines evidence receipts, postflight, approval strength, and next-slice inheritance.
- `docs/GITHUB_WORKFLOW.md` defines how PRs, CI, Codex review, and human approval become the publication layer.

Glass cockpit events are the visible stream across those protocols. They do not replace any of them.

## Implementation: `osc cockpit`

Open Scaffold includes a minimal push-only webhook implementation for the protocol:

```bash
osc cockpit config
osc cockpit test --dry-run
osc cockpit test
osc cockpit post --event status --message "Plan 062 in progress: implementing webhook dispatch" --dry-run
osc cockpit post --event completion_report --run-id 20260518T120000Z-062 --plan 062-glass-cockpit-webhooks --pr "https://github.com/graphanov/open-scaffold/pull/56"
osc cockpit post --event evidence_receipt --evidence-path ".osc/releases/2026-05-18-062-glass-cockpit-webhooks.md"
osc cockpit post --event blocker --message "Blocked: waiting for webhook URL approval"
osc cockpit post --event approval_request --message "Please review PR #56: 20 backlog items"
```

Configure webhook targets by copying `.osc/cockpit.example.json` to `.osc/cockpit.json` and replacing the placeholder URLs. `.osc/cockpit.json` is ignored by git because it contains credentials.

```json
{
  "targets": [
    {
      "platform": "discord",
      "webhookUrl": "https://discord.com/api/webhooks/...",
      "events": ["status", "completion_report"]
    },
    {
      "platform": "slack",
      "webhookUrl": "https://hooks.slack.com/services/...",
      "events": ["blocker", "approval_request"]
    }
  ]
}
```

`osc cockpit config` prints configured targets with masked webhook URLs. `osc cockpit test --dry-run` and `osc cockpit post --dry-run` print the exact Discord embed or Slack Block Kit payload without sending anything. When no `.osc/cockpit.json` exists, cockpit commands exit successfully with `No cockpit targets configured. See .osc/cockpit.example.json`.

Discord targets receive embed payloads with color-coded event types: green for completion/evidence/release, red for blockers, yellow for approval/questions, blue for status/session/PR updates, and gray for neutral events. Slack targets receive Block Kit messages with the same title, body, structured references, and footer.

The v1 implementation is deliberately narrow: one-shot HTTP POST only. It does not receive messages, run a daemon, handle slash commands, store chat state, or make Discord/Slack canonical project truth.

## Product implication

Open Scaffold should make semi-autonomous work visible without making visibility the truth:

```text
Open Scaffold core = source-of-truth protocol
Task bridge = live work state
Runtime harness = bounded execution
Glass cockpit = visible control surface
Evidence/PR/release = proof and publication
```
