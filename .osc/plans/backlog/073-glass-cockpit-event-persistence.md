# Plan: 073-glass-cockpit-event-persistence

## Status

backlog

## Context

The glass cockpit protocol defines events (status, blocker, completion_report, evidence_receipt, etc.) and plan 062 implements webhook posting, but events are fire-and-forget — once posted, they disappear into chat scrollback. For compliance, audit, and team handoff, cockpit events should be persisted locally as a durable log. An event log — a simple append-only JSON Lines file — would give cockpit events the same durability as plans and evidence. The log serves as both a recovery mechanism (what was communicated and when) and an audit trail (who approved what, when was a blocker raised, when was evidence published). Together with plan 062 (webhook posting) and plan 071 (evidence chain verifier), this completes the cockpit protocol from "specification" to "fully implemented with durable state."

## Goal

Add `osc cockpit log` — an append-only JSON Lines event log at `.osc/cockpit.log` that persists every cockpit event with timestamp, event type, content, and correlation IDs — and `osc cockpit history` to query and replay the log.

## Constraints / Out of scope

- The event log is a local JSON Lines file (`.osc/cockpit.log`), one JSON object per line. Append-only — events are never modified or deleted.
- Events are written automatically by `osc cockpit post` (plan 062) and can also be written manually via `osc cockpit log-event`.
- The log is gitignored (similar to `.osc/tasks.db` and `.osc/runs/`). It's forensic/operational data, not canonical truth.
- Does NOT implement log rotation, compression, or archiving in v1 — the file grows indefinitely. For projects generating thousands of events, log rotation can be added later.
- Does NOT sync to a remote service or implement distributed event logs.
- Querying supports: time range filtering, event type filtering, plan/task/run ID filtering, and full-text search over message content.

## Files to touch

- `src/cockpit-log.ts` — new file: event log writer (append JSON Lines), reader (parse and filter), query functions
- `src/cockpit.ts` — modify cockpit.ts to call log writer automatically on every `osc cockpit post`
- `src/cli.ts` — wire `osc cockpit log-event --event <type> --message <text> [correlation IDs]`, `osc cockpit history [--since <ISO>] [--until <ISO>] [--event <type>] [--plan <slug>] [--task-id <id>] [--run-id <id>] [--search <query>] [--limit <n>] [--json]`, `osc cockpit stats`
- `tests/cockpit-log.test.ts` — test event writing, log parsing, filtering, querying
- `docs/GLASS_COCKPIT_PROTOCOL.md` — add "Event Persistence" section

## Acceptance criteria

- [ ] `osc cockpit log-event --event status --message "Sprint review started" --plan 050-npm-publish` appends a JSON line to `.osc/cockpit.log` with: timestamp (ISO 8601), event_type, message, plan_slug, and an auto-generated event_id (UUID or timestamp-nanoid)
- [ ] `osc cockpit post --event completion_report --message "..." --plan 050-npm-publish` (plan 062) automatically writes the same event to the log after posting to webhooks (no double command needed)
- [ ] `osc cockpit post --dry-run` does NOT write to the log (dry-run means no side effects)
- [ ] `.osc/cockpit.log` is valid JSON Lines: every line is a parseable JSON object, no trailing commas, no multi-line objects
- [ ] `osc cockpit history` displays recent events in reverse chronological order (newest first) with timestamp, event type, and message summary
- [ ] `osc cockpit history --since 2026-05-01 --until 2026-05-18` filters by time range
- [ ] `osc cockpit history --event blocker` filters to only blocker events
- [ ] `osc cockpit history --plan 050-npm-publish` filters to events correlated with that plan
- [ ] `osc cockpit history --search "deploy"` full-text searches event messages
- [ ] `osc cockpit history --limit 10` returns at most 10 events
- [ ] `osc cockpit history --json` outputs machine-parseable JSON array
- [ ] `osc cockpit stats` prints: total events, events by type (count per event_type), events by plan (count per plan), date range (first event to last event), most recent event timestamp
- [ ] When `.osc/cockpit.log` does not exist, all commands gracefully report "No cockpit events logged yet" (exit 0)
- [ ] Events logged include all correlation IDs from the post command: task_id, run_id, plan_slug, pr_url, evidence_path
- [ ] All existing tests pass; new cockpit log tests cover writing, reading, filtering, querying, and empty-state handling

## Verification steps

1. **Write event:** Run `osc cockpit log-event --event status --message "Test event" --plan 050-npm-publish`. Verify `.osc/cockpit.log` exists with one JSON line containing correct fields.
2. **Read history:** Run `osc cockpit history`. Verify the test event appears.
3. **Filter by plan:** Run `osc cockpit history --plan 050-npm-publish`. Verify only events with that plan appear.
4. **Filter by type:** Run `osc cockpit history --event status`. Verify only status events.
5. **Stats:** Run `osc cockpit stats`. Verify correct counts and date range.
6. **Automatic logging (integration with plan 062):** Run `osc cockpit post --event status --message "Integration test" --dry-run`. Verify no event logged. Run without `--dry-run` (may fail if no webhook configured). Verify event logged even if webhook posting fails (logging should succeed independently).
7. **Empty state:** Delete `.osc/cockpit.log`. Run `osc cockpit history`. Verify friendly "no events" message.
8. **JSON validity:** Run `python3 -c "import json; [json.loads(line) for line in open('.osc/cockpit.log')]"`. Verify no parse errors.
9. **Build:** Run `npm run build`. Verify no TypeScript errors.

## Open questions

- Should cockpit events be automatically logged during `osc close` and `osc evidence new` lifecycle commands? Plan 062 left this as an open question. This plan should answer it: yes, lifecycle commands should emit cockpit events that are both posted (if webhooks are configured) and logged. The event types map naturally: `osc close` → `completion_report`, `osc evidence new` → `evidence_receipt`, `osc amend` → `status` (scope change). Implementation should be in the lifecycle commands themselves, not the cockpit module — each command calls `cockpit.emit(event)` after its main operation succeeds.
- Should `.osc/cockpit.log` be human-readable in a text editor? JSON Lines is semi-human-readable (one JSON object per line). It's not pretty-printed but `jq` can format it. This is the right trade-off: machine-parseable and append-efficient, with human readability via tooling.
- Should the log support structured event schemas beyond the current flat JSON? Each event type could have a specific schema (e.g., `completion_report` must include `verification_status`, `approval_decision`). Defer to v2 — v1 uses a common base schema for all events with optional type-specific fields. This keeps the implementation simple while allowing richer data on a per-event basis.
