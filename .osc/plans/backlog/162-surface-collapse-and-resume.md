# Plan: 162-surface-collapse-and-resume

## Status

backlog

## Context

Phase 2 of the 2026-06-10 harness-identity pivot (see plan 161 and `.osc-dev/decisions/2026-06-10-harness-identity-pivot.md`). The CLI exposes ~28 top-level commands and the agent-facing protocol requires a ~200-line CLAUDE.md to operate — both contradict the token-efficiency promise. The primitives for a compact resume already exist (`src/handoff.ts` compileHandoffPacket, the evolution nextActionPacket) but are buried inside retry and evolve paths. Complements backlog plan 119 (osc work execution controller), which remains the deep execution slice.

## Goal

A human operates Open Scaffold with about six memorable surfaces (`osc init`, `$interview`, `$plan`, `$work`, `$team`, `osc resume`), `osc --help` fits on one screen, and `osc resume` emits a single budgeted packet (~1-2k tokens) that lets a fresh agent session continue work with no chat history.

## Constraints / Out of scope

- No removal of backend capability needed by CI/scripts: demoted commands move to a labeled advanced/lab namespace rather than disappearing, unless already dead.
- `osc resume` is read-only: it compiles repo truth (mission digest, active plan + acceptance criteria, run state, remaining failures, accepted lessons, next action, boundaries) into one packet; it does not spawn anything.
- The agent-side integration snippet must be ten lines or fewer; the packet carries the protocol so standing instructions do not have to.
- The LLM never hand-writes schema files: every artifact the protocol requires is scaffolded by the CLI from short field inputs.
- Live execution authority rules from plan 119 are unchanged: explicit adapter + explicit spawn authority + human gates.

## Files to touch

- `src/cli.ts` — regroup help into core verbs vs advanced/lab; demote or fold ~20 commands.
- `src/resume.ts` (new) — packet compiler over mission/plan/run/feedback/improvement state, reusing `src/handoff.ts` and the nextActionPacket shape from `src/evolution.ts`.
- `src/handoff.ts` — generalize budget/redaction primitives as needed.
- `CLAUDE.md`, `AGENTS.md`, `LLM_QUICKSTART.md` — replace the long protocol with the ten-line snippet pattern.
- `docs/HARNESS_COMMANDS.md`, `docs/COMMAND_MATURITY.md` — reflect the collapsed surface.
- Tests for the resume packet (budget, redaction, missing-state fallbacks, deterministic output).

## Acceptance criteria

- [ ] `osc --help` renders the core surface on one screen with advanced/lab surfaces behind a single labeled subcommand or flag.
- [ ] `osc resume` produces a packet within its character budget from any repo state (fresh, mid-run, blocked, post-failure) and never includes secrets or raw logs.
- [ ] A fresh agent given only the packet can state the active goal, the next action, and the verification commands without reading other files (covered by a fixture test).
- [ ] Agent entry docs (CLAUDE.md/AGENTS.md snippet) are at or under ten lines.
- [ ] All existing tests pass; demoted commands remain reachable for CI compatibility or have documented removals.

## Verification steps

1. `npm test` and `npm run build` green.
2. Snapshot test on `osc resume` output for the committed resume-demo fixture.
3. Manual: kill a session mid-task in a scratch repo, run `osc resume` in a new session, confirm continuation without re-explaining.
4. `./verify.sh --strict` green.

## Open questions

- Exact name: `osc resume` vs `osc context` vs both as aliases.
- Whether the packet should embed the ten-line protocol footer or reference it.
- Relationship to plan 119: whether 119's controller consumes resume packets as its handoff unit (recommended).
