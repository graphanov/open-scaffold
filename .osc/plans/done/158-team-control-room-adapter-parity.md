# Plan: 158-team-control-room-adapter-parity

## Status

done

## PR association

- Planned PR slot: #196, or the next available GitHub PR number.
- Branch: `feat/team-control-room-adapter-parity`.
- Title: `feat: add team and control-room adapter contracts`.
- Base: fresh `main` after PR #194, or after PR #193 if `$team` parity becomes the immediate blocker.

## Context

The source prototype was useful partly because it made controlled work feel operational: a run had state, gates, receipts, feedback, and a compact handoff. Open Scaffold also needs a future Hermes-like control-room shape, but the core should stay transport-agnostic. This PR makes `$team` real enough to coordinate multiple bounded workers while emitting status/events that chat, plugin, CLI, or desktop surfaces can consume.

## Goal

Make `$team` coordinate multiple controlled worker lanes with one shared plan, status, evidence record, gates, feedback path, and postflight, while defining adapter contracts for future chat/plugin/desktop control rooms.

## Constraints / Out of scope

- Do not build a full desktop app in this PR unless Daniel explicitly rescope it.
- Do not make Open Scaffold depend on Hermes, Codex UI, Claude UI, or a specific desktop shell.
- Do not let worker lanes create separate unlinked truth records.
- Do not allow workers to merge, publish, release, deploy, or force-push.
- Do not hide human gates in worker-local logs; gates must be visible in shared run status.

## Files to touch

- `src/harness.ts` — implement real `$team` worker-lane orchestration using the runtime/feedback primitives from PR #193/#194.
- `src/runtimes.ts` — define worker adapter capability metadata.
- `src/cockpit.ts` — align existing status/control-room concepts with harness event/status contracts if appropriate.
- `src/schema-registry.ts` — register team run, worker lane, shared gate, and control-room event schemas.
- `tests/harness-command-surface.test.ts`, `tests/*team*.test.ts`, `tests/*cockpit*.test.ts` — cover team/status behavior.
- `docs/CONTROL_ROOM_FOUNDATION.md`, `docs/HARNESS_ARCHITECTURE.md`, `docs/HARNESS_COMMANDS.md` — document future UI and current adapter contract.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
| --- | --- | --- | --- |
| T1 | Read current `$team` foundation and existing `cockpit.ts` status concepts. | None | A |
| T2 | Write failing tests for multiple worker lanes sharing one run status and evidence record. | T1 | B |
| T3 | Write failing tests for worker-level gates surfacing in shared status. | T1 | B |
| T4 | Write failing tests for shared feedback/postflight and accepted-improvement inheritance. | T1 | B |
| T5 | Write failing tests for transport-neutral event stream suitable for CLI/chat/plugin/desktop surfaces. | T1 | B |
| T6 | Implement worker lane model and shared run state. | T2-T5 | C |
| T7 | Implement status/event projection for control-room consumers. | T6 | C |
| T8 | Implement adapter capability metadata and worker failure handling. | T6 | C |
| T9 | Update docs with current implementation and future UI boundary. | T7-T8 | D |
| T10 | Run verification, review, and PR workflow. | T9 | E |

### Parallel groups

- **Group A** (discovery): T1 reads current team and control-room status concepts.
- **Group B** (TDD red): T2-T5 define worker lanes, shared gates, feedback, and event stream behavior.
- **Group C** (implementation): T6-T8 wire worker lanes, status projection, and adapter metadata.
- **Group D** (docs): T9 explains current implementation and future UI boundary.
- **Group E** (verification): T10 runs gates and review.

### Dependencies

- This PR depends on PR #193 for runtime status and PR #194 for feedback/improvement behavior.
- Shared status must exist before a future app/plugin can consume the event stream.
- A full desktop UI remains out of scope unless Daniel explicitly rescope it.

## Acceptance criteria

- [x] `$team` can create multiple worker lanes from one plan/goal.
- [x] Each lane has status, adapter metadata, evidence links, and failure code when blocked.
- [x] All lanes write to one shared `.osc/runs/<run-id>/` evidence/postflight record.
- [x] Human gates from any lane appear in the shared status.
- [x] Feedback from any lane can produce shared repair hypotheses.
- [x] Accepted improvements can be inherited by team runs with relevance filtering.
- [x] Event/status output can be consumed by CLI, chat/plugin, Hermes, or future desktop surfaces without depending on any of them.
- [x] Docs describe the future control-room UI as direction, not shipped desktop implementation.

## Verification steps

1. Run focused `$team`/control-room tests.
2. Run fake-adapter `$team` smoke with two lanes: one complete, one needs-human, then answer/resume.
3. Run fake-adapter `$team` smoke with one failed lane and verify repair hypothesis/postflight.
4. Run `npm run build`.
5. Run `npm test`.
6. Run `./verify.sh --strict`.
7. Run `git diff --check` and secret scan.
8. Run independent review focused on transport lock-in, hidden authority, evidence fragmentation, and gate visibility.

## Open questions

- Should `$team` split lanes itself, or should lane definitions always come from a plan generated by `$plan`?
- What minimum event stream is enough for a future desktop app without creating a premature app framework?
