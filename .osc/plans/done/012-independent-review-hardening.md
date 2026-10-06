# Plan: independent-review-hardening

## Status

done

## Context

A two-lane independent Claude Code review on 2026-05-12 validated Open Scaffold's core concept and mechanics while flagging hardening work that should be verified against source before implementation. This plan turns those findings into the first post-v0.3.0 trust slice.

## Goal

Ship a small hardening release that resolves confirmed correctness, validation, audit, and runtime-state hygiene issues without expanding Open Scaffold core into a runtime spawner.

## Constraints / Out of scope

- Do not implement adapter launchers, downstream examples, or npm packaging in this slice.
- Do not patch report claims blindly; first confirm each issue against current source.
- Preserve Open Scaffold core's `spawning: false` boundary.

## Files to touch

- `verify.sh` — confirm/fix any remaining tier, stat, stale-state, or immutability check issues.
- `tests/` — add regression coverage for confirmed validation behavior where practical.
- `package-lock.json` / dependency metadata — resolve or document moderate audit advisories.
- `.gitignore` — ignore runtime-harness state if confirmed needed.
- `.osc/releases/` — record hardening evidence when shipped.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|--------------|----------------|
| T1 | Reproduce every hardening finding against current source with exact file/line evidence | None | A |
| T2 | Add regression tests or shell fixtures for confirmed verification behavior | T1 | B |
| T3 | Apply minimal fixes for confirmed findings | T1, T2 | C |
| T4 | Run full verification and write release/evidence note | T3 | D |

### Parallel groups

- **Group A**: source verification only; no code edits.
- **Group B/C/D**: serial because fixes depend on confirmed findings.

### Dependencies

- T2/T3 must not start until T1 separates true findings from stale or scratch-only observations.

### Delegation notes

- T1 is suitable for a read-only reviewer lane.
- T2/T3 should follow TDD for behavior changes.

## Acceptance criteria

- [ ] Every report-flagged hardening finding is classified as confirmed, stale, false positive, or intentionally deferred.
- [ ] Confirmed verification bugs have regression coverage or documented shell fixtures.
- [ ] `npm audit` is clean or advisories are explicitly accepted with rationale.
- [ ] Runtime-local state patterns are ignored where appropriate.
- [ ] Core remains runtime-neutral and does not spawn agents.
- [ ] Full verification passes.

## Verification steps

1. Run `./verify.sh --standard`; expected pass.
2. Run `./verify.sh --strict`; expected pass with no warnings.
3. Run `npm run osc -- verify`; expected pass.
4. Run `npm test`; expected pass.
5. Run `npm run build`; expected pass.
6. Run `npm audit`; expected clean or documented accepted advisories.
7. Run `git diff --check`; expected no whitespace errors.

## Open questions

- Should shell-level behavior in `verify.sh` get a dedicated test harness, or is strict self-verification sufficient for v0.3.x?
