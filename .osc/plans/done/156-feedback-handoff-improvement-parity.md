# Plan: 156-feedback-handoff-improvement-parity

## Status

done

## PR association

- Planned PR slot: #195, or the next available GitHub PR number.
- Branch: `feat/feedback-handoff-improvement-parity`.
- Title: `feat: wire feedback and handoff improvement loop`.
- Base: fresh `main` after PR #194 merges.

## Context

PR #192 adds feedback files, accepted-improvement primitives, and a handoff lab. PR #194 made `$work` execute through a real controlled runtime. This PR makes the loop behave like the serious part of the source prototype:

```text
run -> verify -> feedback -> repair hypothesis -> retry or accepted lesson -> next run inherits it
```

The goal is not a fifth top-level command. Feedback and self-improvement must be baked into `$work` and `$team`.

## Goal

Make feedback, repair hypotheses, retries, accepted improvements, and compact handoffs part of real harness runs instead of standalone backend artifacts.

## Constraints / Out of scope

- Do not expose feedback as a fifth primary user command.
- Do not treat feedback as merge, publish, release, or owner approval.
- Do not inherit every accepted lesson into every run; relevance filtering is required.
- Do not claim the handoff compiler proves broad runtime superiority.
- Do not run full live reproduction in this PR; this PR prepares the loop that reproduction will test.

## Files to touch

- `src/feedback.ts` — connect runtime outcomes to feedback records, repair hypotheses, accepted improvements, and relevance filtering.
- `src/handoff.ts` — integrate compiler output into `$work` continuation/postflight when requested or needed.
- `src/harness.ts` — wire feedback and handoff behavior into `$work` and `$team` flows.
- `src/cli.ts` — expose backend commands for retry, accepted improvement, handoff compile, and status inspection as needed.
- `src/schema-registry.ts` — register retry, repair hypothesis, applied improvement, and handoff packet schemas.
- `tests/feedback-harness.test.ts`, `tests/handoff-compiler.test.ts`, `tests/harness-command-surface.test.ts` — expand behavior coverage.
- `docs/FEEDBACK_IMPROVEMENT_LOOP.md`, `docs/HANDOFF_COMPILER.md`, `docs/HARNESS_COMMANDS.md`, `docs/HARNESS_ARCHITECTURE.md` — update implemented behavior.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
| --- | --- | --- | --- |
| T1 | Read PR #194 runtime receipt/status shape. | None | A |
| T2 | Write failing tests for failed/rejected/blocked runs creating feedback records and repair hypotheses. | T1 | B |
| T3 | Write failing tests for retry inheriting the repair hypothesis. | T2 | B |
| T4 | Write failing tests for accepted improvements being stored and relevant future runs loading only matching lessons. | T2 | B |
| T5 | Write failing tests for handoff compiler integration in `$work` continuation packet generation. | T1 | B |
| T6 | Write failing tests for `$team` feedback and improvement parity with `$work`. | T1 | B |
| T7 | Implement runtime-outcome-to-feedback conversion. | T2-T6 | C |
| T8 | Implement repair hypothesis and retry inheritance. | T7 | C |
| T9 | Implement accepted improvement relevance filtering. | T8 | C |
| T10 | Integrate handoff compiler into run postflight/continuation path. | T7 | C |
| T11 | Update docs and examples with plain loop explanation. | T7-T10 | D |
| T12 | Run verification, review, and PR workflow. | T11 | E |

### Parallel groups

- **Group A** (discovery): T1 reads the runtime receipt/status shape from PR #194.
- **Group B** (TDD red): T2-T6 define feedback, retry, improvement, handoff, and team parity behavior.
- **Group C** (implementation): T7-T10 wire feedback, retry, accepted lessons, and handoff packets into real runs.
- **Group D** (docs): T11 updates plain-language docs and examples.
- **Group E** (verification): T12 runs gates and review.

### Dependencies

- This PR depends on real runtime outcomes from PR #194.
- Retry semantics depend on stable run ID / attempt ID decisions from PR #194.
- Handoff compiler integration must not bypass proof gates; it writes evidence, not marketing claims.

## Acceptance criteria

- [x] A failed, rejected, blocked, benchmark-failed, or reviewer-failed run creates an `osc.feedback.v1` record.
- [x] Feedback records include source, verdict, scope, what happened, why it matters, repair hypothesis, evidence paths, and next action.
- [x] Repair hypotheses can be attached to a retry attempt.
- [x] Retry attempts preserve the old evidence and write new attempt evidence instead of overwriting history.
- [x] Accepted improvements persist under `.osc/improvements/applied/...`.
- [x] Future runs load only relevant accepted improvements.
- [x] `$work` can emit a bounded handoff packet with required sections and hard character budget.
- [x] `$team` has feedback path, shared repair hypotheses, accepted improvement inheritance, and shared postflight parity.
- [x] Docs explain that feedback is not approval.

## Verification steps

1. Run focused feedback/handoff tests.
2. Run `$work` fake-runtime smoke where the first attempt fails, feedback creates a repair hypothesis, and retry inherits it.
3. Run `$work` handoff smoke and verify packet budget/sections.
4. Run `$team` fake-runtime smoke and verify shared feedback/postflight.
5. Run `npm run build`.
6. Run `npm test`.
7. Run `./verify.sh --strict`.
8. Run `git diff --check` and secret scan.
9. Run independent review focused on feedback-as-approval confusion, evidence overwrites, relevance filtering, and handoff overclaims.

## Open questions

- Should retry attempts live under `.osc/runs/<run-id>/attempts/<n>/` or as sibling run IDs linked by parent/child metadata?
- What is the minimal relevance scoring for accepted improvements before a richer search/index exists?
