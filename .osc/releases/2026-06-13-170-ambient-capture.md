# Release / Evidence Note: 170-ambient-capture

## Summary

Plan 170 adds `osc capture`, a read-only transcript normalizer that maps Claude Code,
Codex, and generic JSONL transcripts into the existing `osc.ambient-work-record.v1`
schema. The command writes one ambient record, never modifies the transcript, and keeps
capture boundary language explicit: observed facts only, not approval or correctness.

## Traceability

- Roadmap / issue / task: plan 170 (`osc capture` ambient transcript extraction).
- Plan: `.osc/plans/done/170-ambient-capture.md` after closeout.
- Run ID / run packet: N/A — this slice adds a transcript capture command, not a spawned run.
- Branch / PR: `170-ambient-capture`; https://github.com/graphanov/open-scaffold/pull/215.

## Verification

- `npm run build` — PASS after rebase and closeout candidate; TypeScript compiled core and runtime-omx.
- `npm test` — PASS after rebase and closeout candidate; 48 files / 534 tests passed.
- `./verify.sh --strict` — PASS after rebase and closeout candidate; 10 pass / 0 fail / 0 warn.
- `git diff --check` — PASS after rebase and closeout candidate.
- Real Codex rollout capture (owner-local transcript, output written only under `/tmp`) — PASS:
  schema `osc.ambient-work-record.v1`, source `transcript-extraction`, adapter `codex-rollout`,
  assistant turns 1, user events 2, token total 64,924 (Codex-reported `total_tokens`),
  tool census keys `get_handoff`, `mcp:open-scaffold.get_handoff`, `tool_search_call`, notes
  record that `total_tokens` is authoritative and Codex cache-creation split is unavailable
  and stored as `null`.
- Real Claude Code transcript capture (owner-local transcript, output written only under `/tmp`) — PASS:
  schema `osc.ambient-work-record.v1`, source `transcript-extraction`, adapter
  `claude-code-transcript`, assistant turns 1,566, user events 804, token total 673,577,801,
  tool census keys `Agent`, `AskUserQuestion`, `Bash`, `Edit`, `Read`, `SendMessage`,
  `SendUserFile`, `TaskCreate`, `TaskList`, `TaskUpdate`, `ToolSearch`, `Write`.
- Real `--detect` smoke — PASS for both owner-local Codex and Claude Code transcripts:
  detected formats `codex` and `claude-code` respectively, both wrote valid ambient records.
- Pinned-test review — PASS: framework LOC/file count pin, section-parser corpus hash, and
  CLI help arrays carry plan-170 rationale comments.
- Review hardening — PASS: `--out` may not overwrite the transcript, malformed capture options
  remain hook-safe under `--hook-safe`, default repo-local captures land under `.osc/state/ambient/`
  so scaffolded `.osc/.gitignore` excludes them from git, the example hook climbs from nested cwd
  to the scaffold root, transcript captures remain not-spawned observed records, unknown token totals stay
  `null`, split final-message text is accumulated before digesting/claim sniffing, Codex records
  preserve the runtime-reported `total_tokens`, the Codex notify hook scopes capture to the event
  `thread-id` instead of a newest-rollout race, example hooks use this checkout's absolute `tsx`
  loader fallback, the checked-in Codex notify hook matches the documented registration path and
  `examples/hooks` ships in the npm package, transcript intent and touched local paths are redacted
  before recording/digesting, and the schema registry names `osc capture` as an
  `osc.ambient-work-record.v1` emitter.
- Commit-structure review — PASS: the original feature layering kept capture implementation/docs/CLI
  wiring separated; subsequent review-hardening commits are small, defect-scoped follow-ups with
  targeted tests and evidence updates.

## Outcome

`osc capture` is locally verified and ready for owner PR review. The implementation satisfies
the plan acceptance criteria without adding daemons, watchers, network calls, real transcript
fixtures, schema forks, npm publish, version bump, release, or merge side effects.

## Follow-up

- Owner gate remains: review/merge the PR if accepted.
- Optional follow-up from the plan: add a read-only MCP `get_ambient_record` tool if/when it is
  worth a separate slice.
