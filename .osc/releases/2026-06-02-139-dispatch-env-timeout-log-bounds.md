# Release / Evidence Note: 139-dispatch-env-timeout-log-bounds

## Summary

Implemented the first P0 dispatch hardening slice from the 2026-06-02 blueprint package: `osc dispatch` no longer passes the full parent environment by default, adapter configs can provide an explicit env allowlist and literal adapter env values, dispatch summaries list env keys only, adapter env config is validated before spawn, adapters run with hard timeout/kill behavior, and stdout/stderr logs are bounded with truncation markers and policy maxima.

## Traceability

- Blueprint input: ignored research package at `.osc/research/2026-06-02-review-blueprint-ingest/open-scaffold-review-blueprints/`.
- Blueprint IDs: `OSB-003` / `SEC-01` and `OSB-004` / `SEC-02`.
- Program plan slug: `138-blueprint-security-adoption-program`.
- Slice plan: `.osc/plans/done/139-dispatch-env-timeout-log-bounds.md`.
- Branch: `security/dispatch-env-timeout-logs`.
- PR: not opened in this local slice yet.

## Verification

- `./verify.sh --quick --quiet` — PASS before source changes.
- Meta-plan validation for `138-blueprint-security-adoption-program` — PASS, `0 issues found`.
- `npm run osc -- plan validate .osc/plans/active/139-dispatch-env-timeout-log-bounds.md --strict` — PASS before close, `0 issues found`.
- RED: `npm test -- tests/cli-dispatch.test.ts --run` — FAIL as expected before implementation: 5 new dispatch hardening tests failed for missing env summary/restriction, unsafe override support, timeout handling, log truncation, and wildcard env refusal.
- GREEN focused: `npm test -- tests/cli-dispatch.test.ts --run` — PASS, 18 dispatch tests including SIGTERM-ignoring timeout, CI full-env refusal, env config validation/no-value-leakage, and resource-ceiling regressions.
- `npm run build` — PASS, core and runtime-omx TypeScript builds.
- `git diff --check` — PASS.
- `npm run osc -- close 139-dispatch-env-timeout-log-bounds --message "hardened dispatch env timeout and log bounds"` — PASS, moved plan to `done/` and stamped `MISSION.md` changelog.
- `npm run osc -- plan validate .osc/plans/done/139-dispatch-env-timeout-log-bounds.md --strict` — PASS, `0 issues found`.
- `./verify.sh --strict` — PASS, `10 pass, 0 fail, 0 warn`.
- `npm run osc -- verify --evidence-chain --plan 139-dispatch-env-timeout-log-bounds --strict` — PASS, `21 intact, 0 broken, 0 missing, 0 unverifiable`.
- `npm test` — PASS, 55 files / 578 tests.
- Independent pre-commit re-review — PASS; no blocking security concerns or logic errors after adding `SIGKILL`, env validation, CI full-env refusal, and policy maxima. Non-blocking follow-up noted: process-tree cleanup and marker-inclusive byte caps can be considered in later hardening.
- `npm run osc -- verify` — PASS with 7 pre-existing repository warnings unrelated to this slice; no warnings for plan 139 or this evidence note.

## Outcome

`osc dispatch` now uses a restricted environment by default, reports environment key names without values, supports `--allow-full-env` only as an explicit unsafe local override with a warning and CI guard, validates adapter env names and control characters before spawn, refuses wildcard env allowlists without the unsafe override, enforces adapter timeout with `SIGKILL`, caps adapter-configured timeout/log limits, times out sleeping or SIGTERM-ignoring adapters, and writes bounded stdout/stderr logs with clear truncation markers. Receipt/evidence discovery remains path-contained and uses retained stdout only.

## Follow-up

- Next security slice: `OSB-005` / `SEC-03` adapter trust workflow (`osc adapter check/trust/list`, gitignored trust state, config digest invalidation).
- Later security/docs slice: `OSB-006` / `SEC-04` redaction and doctor checks plus `OSB-014` trust boundaries documentation.
- Runtime beta (`OSB-009`) remains blocked until adapter trust, redaction, worktree/protected-branch enforcement, and schema validation hardening land.

## Boundary statement

This is local structural hardening for dispatch adapter invocation. It does not spawn a real runtime by default, does not grant network/credential/commit/push/PR/merge/publish/release/deploy authority, does not certify adapter correctness, and does not claim compliance or semantic task correctness.

approval.status: weak_approved
approval.rationale: Local structural acceptance criteria for plan 139 passed in focused tests, plan validation, build, `git diff --check`, and strict scaffold verification. Owner approval is still required for push, PR publication if desired, merge, npm publish, GitHub Release, runtime beta claims, or any external side effect.
