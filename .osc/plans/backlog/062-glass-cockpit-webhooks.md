# Plan: 062-glass-cockpit-webhooks

## Status

backlog

## Context

The glass cockpit protocol (`docs/GLASS_COCKPIT_PROTOCOL.md`) defines a rich event vocabulary — session_start, status, blocker, question, completion_report, evidence_receipt, approval_request, cancellation, pr_link, release_note — but none of it is implemented. The protocol document is well-designed but until a single message actually posts to a real channel, the glass cockpit is a specification, not a feature. This plan proves the protocol with working code: webhook-based posting to Discord and Slack. It is intentionally minimal — one command, one event type at a time, push-only — to establish the implementation pattern that richer cockpit UIs can build on later.

## Goal

Ship `osc cockpit post` and `osc cockpit test` commands that send structured glass-cockpit events to configured Discord and Slack webhooks, proving the protocol with working, credential-safe implementation.

## Constraints / Out of scope

- Push-only: sends messages to webhooks. Does NOT receive messages, handle slash commands, or implement two-way interaction.
- Webhook URLs are stored in `.osc/cockpit.json` (gitignored). A documented example at `.osc/cockpit.example.json` shows the format.
- Does NOT implement a daemon, real-time listener, or background process — each `osc cockpit post` is a one-shot HTTP POST.
- Does NOT handle incoming webhooks, interactive buttons, or threaded replies in v1.
- Discord and Slack only in v1. Telegram, Matrix, and custom webhooks are deferred.
- Event format follows the glass cockpit protocol event vocabulary exactly.
- Messages include `task_id`, `run_id`, `plan_slug`, and repo links when available.
- Must work without any runtime or agent dependency — just Node.js built-in `fetch` (Node 20+) or `https` module.

## Files to touch

- `src/cockpit.ts` — new file: webhook message formatting (Discord embed, Slack block kit), HTTP POST, config loading and validation
- `src/cli.ts` — wire `osc cockpit post --event <event> --message <text> [--run-id <id>] [--plan <slug>] [--task-id <id>] [--pr <url>] [--evidence-path <path>] [--dry-run]` and `osc cockpit test [--dry-run]` and `osc cockpit config` (show config)
- `.osc/cockpit.example.json` — new file: example config with placeholder webhook URLs, comments explaining each platform's format, and the event-to-channel mapping
- `tests/cockpit.test.ts` — test message formatting, config parsing, Discord embed structure validation, Slack block structure validation, dry-run output, graceful missing-config handling
- `docs/GLASS_COCKPIT_PROTOCOL.md` — add "Implementation" section with `osc cockpit` usage examples, webhook setup instructions for Discord and Slack, and message format examples
- `docs/WORKFLOW.md` — mention `osc cockpit` in the Publish/review phase

## Acceptance criteria

- [ ] `.osc/cockpit.example.json` exists with documented format: `{"targets":[{"platform":"discord","webhookUrl":"https://discord.com/api/webhooks/...","events":["status","completion_report"]},{"platform":"slack","webhookUrl":"https://hooks.slack.com/services/...","events":["blocker","approval_request"]}]}`
- [ ] `osc cockpit config` prints the configured targets with masked webhook URLs (show first 20 chars + "..."), and warns if no config exists
- [ ] `osc cockpit test --dry-run` prints the test message that would be sent without sending (validates config format, message structure)
- [ ] `osc cockpit test` sends a test message to all configured targets, reports success/failure per target
- [ ] `osc cockpit post --event status --message "Plan 062 in progress: implementing webhook dispatch"` posts to all targets whose `events` list includes `status`
- [ ] `osc cockpit post --event completion_report --run-id 20260518T120000Z-062 --plan 062-glass-cockpit-webhooks --pr "https://github.com/graphanov/open-scaffold/pull/56"` posts structured completion report with run ID, plan slug, and PR link
- [ ] `osc cockpit post --event evidence_receipt --evidence-path ".osc/releases/2026-05-18-062-glass-cockpit-webhooks.md"` posts evidence receipt linking the evidence file
- [ ] `osc cockpit post --event blocker --message "Blocked: waiting for webhook URL approval"` posts blocker event
- [ ] `osc cockpit post --event approval_request --message "Please review PR #56: 20 backlog items"` posts approval request
- [ ] `osc cockpit post --dry-run` prints exactly what would be sent (platform, URL masked, message body) without sending
- [ ] When no `.osc/cockpit.json` exists, all commands gracefully report "No cockpit targets configured. See .osc/cockpit.example.json" (exit 0, not error)
- [ ] When a webhook POST fails (4xx/5xx), error message includes the platform name, HTTP status, and response body snippet (not the full webhook URL)
- [ ] Messages include a footer with `osc cockpit` version and repo path
- [ ] Discord messages use embed format (title, description, fields for structured data like run_id/plan/task, color-coded by event type: green=completion, red=blocker, yellow=approval_request, blue=status)
- [ ] Slack messages use Block Kit format for structured, readable messages
- [ ] All existing tests pass, new cockpit tests cover formatting, config handling, dry-run, and error cases
- [ ] `npm run build` succeeds

## Verification steps

1. **Config format:** Copy `.osc/cockpit.example.json` to `.osc/cockpit.json`. Replace webhook URLs with a test webhook (or leave placeholders). Run `osc cockpit config`, verify targets are listed with masked URLs.
2. **Dry-run:** Run `osc cockpit test --dry-run`. Verify output shows the exact message that would be sent, with masked URL.
3. **Format validation:** Run `osc cockpit post --event status --message "Test message" --dry-run`. Manually inspect output for correct Discord embed structure (title, description, color, footer) or Slack block structure.
4. **Real send:** With a real Discord webhook URL configured, run `osc cockpit test`. Verify message appears in the Discord channel with correct formatting.
5. **Event routing:** Configure one target with `events: ["blocker"]` only. Run `osc cockpit post --event status --message "should not send" --dry-run`. Verify message is skipped for that target (event not in list). Run `osc cockpit post --event blocker --message "should send" --dry-run`. Verify message is included.
6. **Missing config:** Rename `.osc/cockpit.json` to `.osc/cockpit.json.bak`. Run `osc cockpit test`. Verify graceful message, exit 0.
7. **Build:** Run `npm run build`, verify no TypeScript errors.

## Open questions

- Should cockpit events auto-post during `osc close` and `osc evidence new`? That is, should the lifecycle commands automatically post to configured cockpits? This would be a natural next step but adds complexity to commands that are currently filesystem-only. Defer to a follow-up plan — keep v1 as explicit `osc cockpit post` only.
- Should `osc cockpit post` infer event type from the command context? E.g., `osc cockpit post --run-id X --status completed` auto-sets event to `completion_report`. This is a nice-to-have but adds ambiguity. Keep explicit `--event` flag for clarity in v1.
