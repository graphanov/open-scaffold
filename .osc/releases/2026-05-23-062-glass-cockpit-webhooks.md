# Release / Evidence Note: 062-glass-cockpit-webhooks

## Summary

Added push-only glass-cockpit webhook support through `osc cockpit config`, `osc cockpit test`, and `osc cockpit post`. The slice sends structured Discord embed and Slack Block Kit payloads from `.osc/cockpit.json`, keeps webhook URLs masked in CLI output, and ships `.osc/cockpit.example.json` as the credential-safe template.

## Traceability

- Roadmap / issue / task: selector mode `backlog_plan`; no GitHub issue existed for this slice.
- Plan: .osc/plans/done/062-glass-cockpit-webhooks.md
- Run ID / run packet: N/A — direct runner implementation for the selected plan.
- Branch / PR: feat/062-glass-cockpit-webhooks; https://github.com/graphanov/open-scaffold/pull/100

## Verification

- `git diff --check` — passed.
- `./verify.sh --strict` — 10 pass, 0 fail, 0 warn.
- `npm test -- --run` — 35 test files passed; 323 tests passed.
- `npm run build` — passed for core and runtime-omx TypeScript builds.
- `npm pack --dry-run --json` — passed; package payload includes `.osc/cockpit.example.json`.
- `node dist/cli.js cockpit config`, `node dist/cli.js cockpit test --dry-run`, `node dist/cli.js cockpit post --event status --message "Test message" --dry-run`, `node dist/cli.js cockpit post --event blocker --message "should send" --dry-run`, and missing-config `node dist/cli.js cockpit test` — passed.

## Outcome

Local implementation and verification passed. This ships explicit one-shot webhook dispatch only: no daemon, no incoming webhooks, no slash commands, no background listener, and no chat surface as canonical project truth. Live Discord/Slack delivery with real webhooks remains credential-gated; the test suite proves the HTTP POST path against a local server and the CLI dry-runs prove Discord/Slack payload shape without exposing secrets.

Owner gates remain: merge, npm publication, and GitHub Release latest/public-surface sync.

## Follow-up

- Optional owner-gated smoke with a real Discord or Slack webhook after review/merge.
- Future slice, not part of v1: automatic cockpit posts from lifecycle commands such as `osc close` or `osc evidence new`.
