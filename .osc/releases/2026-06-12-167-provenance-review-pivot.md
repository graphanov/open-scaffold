# Release / Evidence Note: 167-provenance-review-pivot

## Summary

Repositioned the product around the measured core — the repo-native work record,
the handoff packet (`osc handoff`), and cheap-model review with stop authority
(`osc analyze` / `osc gate`) — across MISSION, README, core help, and the doc
set; exposed that front door read-only over MCP; added an OpenAI-compatible
external reviewer profile for the gate; and wired live ambient-record capture
on this repo via a Claude Code SessionEnd hook. The `$`-verb grammar left every
public surface (deprecated in `help --all`; code removal staged as plan 168).

## Traceability

- Roadmap / issue / task: plan 167 amendment 1 (owner interview, 2026-06-12); pivot ADR `.osc-dev/decisions/2026-06-12-provenance-review-pivot.md` (owner-local).
- Plan: .osc/plans/active/167-provenance-review-pivot.md (+ amendment 1)
- Run ID / run packet: N/A — direct coordinator-session work; ambient record of the pivot session at `.osc-dev/ambient/ea90ff6e-282f-4cbc-b8b0-609f8e712654.json` (owner-local).
- Branch / PR: `167-provenance-review-pivot`; PR pending owner review after AC7.

## Verification

- `npm run build && npm test && ./verify.sh --strict && git diff --check` — green at every commit on the branch (631 tests at 39a7f7a; 643 tests / 56 files after the MCP and reviewer additions; strict verify 10 pass / 0 fail / 0 warn).
- AC1/AC2 (surfaces): `tests/public-positioning.test.ts`, `tests/cli-lifecycle-help.test.ts`, `tests/cli-harness-backend.test.ts`, `tests/first-run-docs.test.ts`, `tests/reduced-cli-docs.test.ts` — all passing with 167-rationale repins. Note: the review alias shipped as `osc analyze` because `osc review` collides with the legacy runtime command until plan 168 reclaims the name.
- AC3 (MCP): `tests/mcp-server.test.ts` (16 tests incl. 5 new front-door tests: read-only handoff compile, loop analysis, loop_dir escape/missing-dir errors, judge stop ruling, orphan judge args). JSON-RPC stdio smoke against `dist/cli.js mcp serve` on this repo: 15 tools listed, `get_handoff` returned the live resume packet (`open-scaffold.resume.v1`). Client smokes 2026-06-12: Claude Code (`claude -p` with inline `--mcp-config` + `--strict-mcp-config` + `--allowedTools mcp__open_scaffold__get_handoff`) returned the correct Status line and schema in 3 turns / 405 output tokens; Codex CLI 0.139.0 (`codex mcp add open_scaffold`, `codex exec --full-auto`) returned the same — after diagnosing that a hyphenated server name (`open-scaffold`) makes every Codex tool call fail in 0 ns with "user cancelled MCP tool call" (sanitized-namespace roundtrip; documented in docs/MCP.md, receipt in codex session log rollout-2026-06-12T18-42-08).
- AC4 (Spike A): `examples/spikes/ambient-from-transcript.mjs` on a real review-bench judge transcript (35 turns, 1.13M tokens) and `examples/spikes/ambient-hook.mjs` exercised with the exact SessionEnd stdin contract against the live pivot session's transcript — valid `osc.ambient-work-record.v1` produced; hook registered owner-locally (`.claude/settings.local.json`, gitignored).
- AC5 (Spike B): `examples/spikes/claims-from-tests.mjs` — claims-vs-actual verdict from real `npm test` JSON; green=consistent exit 0, flipped-copy failing path names mismatches and exits 1. No bench scorer involved.
- AC6 (reviewer profile): `tests/reviewer.test.ts` (7 tests, mocked fetch — endpoint normalization, strict-JSON judge contract, ruling parse paths, bearer-by-env-var-name, error surfacing, gate flag validation). End-to-end on a real record: `osc gate <harness-bench arm-D retry-trap loop> --judge-endpoint http://localhost:11434/v1 --judge-model gemma4:31b` — local judge ruled `continue` (2,861 tokens, 77s, zero cloud quota); gate still refused retry (`blocked_by_packet` / `redesign_required_before_retry`): record-level discipline overrides a permissive judge, consistent with the review-bench finding.
- AC7 (judge-feeds-worker): one end-to-end run through shipped commands, receipts in `examples/spikes/ac7-judge-feeds-worker/`. Terse-prompt sonnet worker scored 6/8 against held-back criteria (wrong error class; negatives silently parsed); `osc evolve record` + `osc gate --judge-endpoint` (local gemma4:31b, 1,725 tokens, zero cloud quota) authorized retry with the failing criterion texts in the packet; a fresh worker given ONLY the terse prompt + that packet scored 8/8 (530 → 1,520 output tokens; frontier promoted; auto-filled delta +2). n=1 mechanism validation, not a benchmark claim.

## Outcome

Shipped on branch `167-provenance-review-pivot` (key commits: 1f2fc8e surface
pivot, bf3fca6 evergreen mission, 39a7f7a docs recenter, 8d937cc MCP front
door, b86826b reviewer profile, ef9d820 live ambient hook; spikes at 1bcabbb).
Maintained source 17,146 LOC / 42 files (pinned with rationale trail). All
seven acceptance criteria now carry receipts. Out of scope here: $-verb and
dispatch code removal (plan 168, backlog). No merge, publish, or release
performed or claimed — owner gates.

## Follow-up

- Rebase branch onto main (owner merged PRs 207-209) and repin the section-parser corpus hash before PR.
- Plan 168 (backlog): remove $-verb grammar and runtime-dispatch code; reclaim `osc review` as the alias name.
