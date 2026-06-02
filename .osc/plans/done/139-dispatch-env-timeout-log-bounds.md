# Plan: 139-dispatch-env-timeout-log-bounds

## Status

done

## Context

The 2026-06-02 blueprint package identifies `OSB-003` / `SEC-01` and `OSB-004` / `SEC-02` as immediate P0 dispatch safety work. Current source inspection confirms `src/dispatch.ts` passes `process.env` directly to adapter subprocesses and does not enforce adapter timeouts or bounded log capture.

## Goal

Harden `osc dispatch` so project-local adapters receive a restricted allowlisted environment by default and cannot hang indefinitely or write unbounded stdout/stderr logs.

## Constraints / Out of scope

- Do not implement the adapter trust workflow in this slice; create/keep it as the next security slice.
- Do not implement full secret-redaction or doctor scanning here; leave that for the redaction/trust-boundary slice unless a small helper is required for log metadata safety.
- Do not spawn real OMC/OMX/Codex/Claude/OpenCode sessions.
- Do not add network, credential, commit, push, PR, merge, publish, release, deploy, or production side effects.
- Do not expose environment values in summaries, logs, docs, tests, or evidence.
- Keep backwards compatibility for existing adapter configs except where the old full-env behavior is now restricted by default.

## Files to touch

- `src/dispatch.ts` — parse adapter env/timeout/log config, build safe env, enforce timeout/log bounds, and summarize metadata without values.
- `src/cli.ts` — dispatch CLI flags/help for any explicit unsafe local override.
- `tests/cli-dispatch.test.ts` — failing-first coverage for secret env exclusion, allowlisted/env config values, timeout, truncation, and summary output.
- `docs/RUNTIME_ADOPTION_WORKFLOW.md` and/or runtime docs — document the restricted environment and bounded logs if CLI behavior changes user-facing semantics.
- `.osc/releases/2026-06-02-dispatch-env-timeout-log-bounds.md` — evidence note for this slice.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|--------------|----------------|
| T1 | Add failing dispatch tests for default env restriction and adapter allowlisted/env config behavior | None | A |
| T2 | Add failing dispatch tests for timeout and stdout/stderr truncation | None | A |
| T3 | Implement adapter config parsing and safe env builder | T1 | B |
| T4 | Implement timeout/log bounds and summary fields | T2 | B |
| T5 | Update docs/evidence and run full verification gates | T3, T4 | C |

### Parallel groups

- **Group A**: tests can be written independently but should run and fail before code changes.
- **Group B**: implementation touches the same dispatch module; keep it in one worktree/session to avoid merge conflicts.
- **Group C**: docs/evidence and final verification after code is green.

### Dependencies

- T3/T4 depend on red tests proving the current unsafe behavior.
- Receipt/evidence discovery should continue to use safe paths and should not infer stale files.

### Delegation notes

- This slice is small enough for Hermes direct TDD implementation.
- If delegated later, the worker must touch only files listed above unless it stops and proposes an amendment.

## Implementation Architecture Coverage

- Strengthens: runtime boundary, adapter authority, evidence/log containment, and security posture before any runtime beta lane.
- Audit envelope: dispatch summary should record adapter ID, run ID, env mode/key names, timeout/log limits, timeout signal/status, log paths, receipt/evidence paths, and verification results without secret values.
- Evaluation envelope: tests prove default secret exclusion, allowlisted and explicit adapter env values, controlled timeout failure, bounded log files, and truncation markers.
- Feedback routing: adapter trust, secret redaction, worktree isolation, receipt schema validation, and docs-wide trust boundaries become follow-up plans if not included here.
- Boundary: dispatch remains local adapter glue; bounded structural hardening is not semantic correctness, runtime production support, or compliance certification.

## Acceptance criteria

- [x] Secret-like parent env vars such as `SECRET_TOKEN` are not passed to adapters by default. Evidence: `.osc/releases/2026-06-02-139-dispatch-env-timeout-log-bounds.md`.
- [x] Adapter config allowlists pass only named parent env keys, and adapter-provided env values are passed explicitly. Evidence: `.osc/releases/2026-06-02-139-dispatch-env-timeout-log-bounds.md`.
- [x] Dispatch summary reports a restricted environment and env key names only, never env values. Evidence: `.osc/releases/2026-06-02-139-dispatch-env-timeout-log-bounds.md`.
- [x] An explicit unsafe local full-env override exists only if clearly named, warns in output, and remains blocked or clearly unsafe in CI-sensitive contexts. Evidence: `.osc/releases/2026-06-02-139-dispatch-env-timeout-log-bounds.md`.
- [x] Dispatch enforces adapter timeout and reports timeout as controlled adapter failure. Evidence: `.osc/releases/2026-06-02-139-dispatch-env-timeout-log-bounds.md`.
- [x] Stdout/stderr log files are bounded by configured/default byte limits and include clear truncation markers when shortened. Evidence: `.osc/releases/2026-06-02-139-dispatch-env-timeout-log-bounds.md`.
- [x] Receipt/evidence path discovery remains safe and works when reported paths appear within retained output. Evidence: `.osc/releases/2026-06-02-139-dispatch-env-timeout-log-bounds.md`.
- [x] Focused dispatch tests, `npm test`, `npm run build`, `./verify.sh --strict`, plan validation, and `git diff --check` pass or blockers are reported honestly. Evidence: `.osc/releases/2026-06-02-139-dispatch-env-timeout-log-bounds.md`.

## Verification steps

1. Run focused failing tests before implementation: `npm test -- tests/cli-dispatch.test.ts --run` and confirm new cases fail for the expected missing behavior.
2. After implementation, run `npm test -- tests/cli-dispatch.test.ts --run` and confirm the dispatch suite passes.
3. Run `git diff --check`.
4. Run `npm test`.
5. Run `npm run build`.
6. Run `./verify.sh --strict`.
7. Run `npm run osc -- plan validate .osc/plans/active/139-dispatch-env-timeout-log-bounds.md --strict`.
8. Run `npm run osc -- verify --evidence-chain --plan 139-dispatch-env-timeout-log-bounds --strict` if the plan/evidence note chain is ready; otherwise record why it is not applicable before PR.

## Open questions

- Should the unsafe full-env override be implemented in this first slice or deferred entirely until the adapter trust workflow lands? Current recommendation: implement it only if needed for compatibility, name it `--allow-full-env`, mark it unsafe, and keep default restricted.
- What default timeout/log limits should be used before a stable adapter registry exists? Current recommendation: conservative defaults that keep tests fast and logs bounded, with adapter config overrides validated as positive integers.
