# Plan: 027-lifecycle-e2e-smoke-strategy

## Status

done

## Context

A four-lane Claude Code review of Open Scaffold's E2E testing direction completed on 2026-05-14. The lanes agreed that Open Scaffold needs a deterministic lifecycle smoke fixture before deeper Discord/Hermes/runtime integration tests, and Lane 2 surfaced a fresh-user risk around confusing maintainer repo state with blank downstream state.

## Goal

Promote the E2E smoke review findings into a public strategy document and release/evidence note that define the next implementation PR's scope.

## Constraints / Out of scope

- Do not implement the smoke test in this slice.
- Do not commit raw Claude JSON, transcripts, prompts, or `.osc/runs/` artifacts.
- Do not require Hermes, Discord, OMC, OMX, Codex connector, network credentials, or a new server.
- Do not rewrite `MISSION.md`, `ROADMAP.md`, or completed plans.
- Keep the strategy concise enough to guide implementation without becoming another methodology tome.

## Files to touch

- `docs/E2E_SMOKE.md` — public strategy for lifecycle smoke testing.
- `docs/EXAMPLES.md` — link the existing examples page to the E2E smoke strategy.
- `.osc/releases/2026-05-14-e2e-smoke-review.md` — curated evidence note summarizing the four-lane review.
- `.osc/plans/active/027-lifecycle-e2e-smoke-strategy.md` — this plan; close it in the same PR if shipped.

## Acceptance criteria

- [ ] `docs/E2E_SMOKE.md` states what the lifecycle smoke proves and explicitly does not prove.
- [ ] The strategy names the fresh downstream/template-state risk found by the solo-developer simulation.
- [ ] The strategy defines required smoke deliverables, pass/weak-pass/fail criteria, and at least five anti-cheat/stale-state checks.
- [ ] The strategy defines the integration smoke ladder: core lifecycle smoke before GitHub, simulated operator-surface, and real Hermes/Discord tests.
- [ ] Raw `.osc/runs/` Claude artifacts remain ignored and uncommitted; only curated conclusions are promoted.
- [ ] A release/evidence note records the review source and wrapper caveat.
- [ ] The plan is closed via `./close.sh` in the same PR if the strategy ships.
- [ ] `./verify.sh --standard` exits 0.

## Verification steps

1. Run `./verify.sh --standard`; expected exit 0.
2. Run `git diff --check`; expected no whitespace errors.
3. Run `git status --short`; expected no staged or unstaged `.osc/runs/` artifacts.
4. Confirm `docs/E2E_SMOKE.md` includes sections for proves / does not prove / deliverables / anti-cheat / pass criteria / integration ladder.
5. Confirm this plan is moved to `.osc/plans/done/` before PR creation if the strategy is complete.

## Open questions

- Should the implementation PR use a Vitest E2E test, a shell smoke script, or both?
- Should the implementation PR close only `023-worked-downstream-example`, or also satisfy part of `014-downstream-example-project`?
