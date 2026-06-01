# Plan: 135-osc-eval-external-scorer-adapter

## Status

done

## Context

The 2000m v1 two-lane run showed that hand-filled `osc eval` envelopes are brittle. One run had a missing `acceptance_criteria` section, and later records were too easy to treat as schema checks rather than correctness evidence. The external scorer already had structured per-AC data, but Open Scaffold did not have a first-class import path for it.

## Goal

Add an external-scorer adapter path for `osc eval` so structured domain-scorer output can be converted into a complete Open Scaffold evaluation envelope without hand-filling criteria or blurring score frontier with acceptance approval.

## Constraints / Out of scope

- Do not make Open Scaffold a domain judge; the external scorer remains the evaluator source.
- Do not certify correctness, compliance, model quality, or production readiness.
- Do not call an evaluation `approved` while any mechanical acceptance criterion is `partial`, `fail`, `blocked`, or `not_evaluated`.
- Do not require network access or external APIs.
- Do not store raw private logs, local absolute paths, or unbounded scorer output in public artifacts.
- Start with a 2000m v1 conformance adapter only if the generic adapter contract remains reusable for other scorers.

## Files to touch

- `src/evaluation.ts` — external scorer import model and validation helpers.
- `src/cli.ts` — `osc eval import` or equivalent CLI surface.
- `tests/evaluation.test.ts` and `tests/cli-eval.test.ts` — fixtures for 2000m v1 conformance JSON import, non-pass decision handling, and missing criteria prevention.
- `docs/TASK_RUN_MODEL.md` — clarify external scorer import as a post-run evidence-review record if needed.
- `docs/EVOLUTION_LOOP.md` — describe how imported evaluations feed repeated-attempt analysis if needed.
- `.osc/releases/<date>-eval-external-scorer-adapter.md` — release/evidence note for the implementation slice.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
| --- | --- | --- | --- |
| T1 | Define the generic external-scorer adapter envelope contract. | None | A |
| T2 | Add a 2000m v1 fixture and expected evaluation envelope. | T1 | B |
| T3 | Implement CLI import and validation. | T1, T2 | C |
| T4 | Add docs and non-claim wording. | T1 | B |
| T5 | Run full verification and inspect public safety. | T3, T4 | D |

### Parallel groups

- **Group A:** contract first so implementation cannot overfit to one scorer shape.
- **Group B:** fixture and docs can proceed after the contract draft exists.
- **Group C:** implementation waits for the fixture.
- **Group D:** verification waits for implementation and docs.

### Dependencies

T3 must wait for T1/T2 because the adapter is meant to be evidence import, not a 2000m-only script hidden in the CLI.

### Delegation notes

A verifier can independently review the fixture and generated envelope before implementation lands.

## Implementation Architecture Coverage

- Strengthens: evaluation evidence, scorer provenance, acceptance routing, and retry/block decisions.
- Audit envelope: scorer input JSON, generated evaluation envelope, run packet, evidence refs, adapter metadata, tests, and release/evidence note.
- Evaluation envelope: every imported AC must have id, text/name, status, evaluator source, evidence or rationale, confidence, and correction route for non-pass outcomes.
- Feedback routing: non-pass criteria route to retry, next slice, issue, roadmap update, or block; score-frontier promotion remains separate.
- Boundary: the adapter imports scorer evidence; it does not run the scorer, spawn a runtime, approve work, or certify domain correctness.

## Acceptance criteria

- [ ] `osc eval import` or equivalent accepts a run/plan source plus an external scorer JSON file and writes a valid `open-scaffold.evaluation.v1` envelope.
- [ ] The 2000m v1 adapter maps `acs[].id`, `name`, `pass`, `skipped`, `quality`, `detail`, and `breakdown` into criteria entries with clear evaluator provenance.
- [ ] The 2000m v1 adapter maps determinism and composite score into verification/evidence metadata without blending them into approval.
- [ ] A failing AC produces evaluation decision `rejected` or `blocked`, never `approved`.
- [ ] Missing or empty `acceptance_criteria` is impossible for valid imported scorer output and remains a validation failure for malformed output.
- [ ] Non-pass criteria include correction routes.
- [ ] Imported local evidence refs are repo-relative or explicitly external; no local absolute paths are emitted by default.
- [ ] Docs and help text say the adapter imports external evidence; Open Scaffold does not become the scorer.
- [ ] Tests cover pass, fail, skipped, malformed scorer JSON, and approved-with-non-pass rejection.

## Verification steps

1. Add a small 2000m v1 conformance fixture with at least one failed AC and deterministic PASS.
2. Run focused eval import tests and expect the generated envelope to pass `osc eval check`.
3. Run `npm test` and expect the full suite to pass.
4. Run `npm run build` and expect TypeScript/package build success.
5. Run `./verify.sh --strict` and expect repository compliance to pass.
6. Run `git diff --check` and expect no whitespace errors.
7. Manually scan generated fixture output for local paths, raw logs, and unsupported correctness/approval claims.

## Open questions

- Should the first CLI surface be `osc eval import --adapter 2000m-v1` or `osc eval adapter 2000m-v1`?
- Should imported scorer outputs live beside run directories, under `.osc/evaluations/`, or as explicit tracked evidence notes?
- How should generic scorer adapters declare probe-only or no-score-sensitivity criteria so `osc evolve analyze` can consume them?
