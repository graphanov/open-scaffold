# Plan: 137-benchmark-v2-workflow-value-fixture

## Status

active

## Context

Plans 134, 135, and 136 shipped the Open Scaffold-side prep exposed by the 2000m v1 negative result: plateau/impossible-AC analysis, external scorer import, and compact evidence. The next benchmark-v2 phase needs a public-safe handoff contract before the benchmark repo grows scorer or harness code, so the next slice is a two-repo protocol fixture rather than another raw 2000m score run.

## Goal

Create a machine-readable benchmark-v2 scenario fixture and public handoff notes that define how the benchmark repo should test workflow value instead of raw model intelligence.

## Constraints / Out of scope

- Do not claim Open Scaffold improved the raw 2000m v1 score.
- Do not claim adoption proof, model-ranking proof, or a benchmark win.
- Do not npm publish, create a GitHub Release, merge, or mutate prior stopped 2000m v1 evidence.
- Do not implement the full 2000m v2 scorer, controller, hidden-seed harness, or runtime execution in this repo.
- Keep benchmark implementation ownership in `graphanov/2000m`; this repo may provide the public protocol fixture and claim boundaries.

## Files to touch

- `docs/benchmarks/2000m-v2-workflow-benchmark-proposal.md` — promote the first v2 slice decision and link the machine-readable fixture.
- `docs/benchmarks/README.md` — index the new fixture and honesty boundary.
- `docs/examples/benchmark-v2-workflow/README.md` — explain the scenario packet and how the benchmark repo should consume it.
- `docs/examples/benchmark-v2-workflow/scenario.schema.json` — define the workflow-value scenario shape.
- `docs/examples/benchmark-v2-workflow/workflow-value-scenario.json` — provide the first concrete v2 scenario packet.
- `tests/benchmark-workflow-fixture.test.ts` — prove the fixture tests workflow pain rather than score-only deltas.
- `.osc/releases/2026-06-01-137-benchmark-v2-workflow-value-fixture.md` — record public-safe evidence for this slice.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
| --- | --- | --- | --- |
| T1 | Define the v2 scenario schema and concrete scenario packet. | None | A |
| T2 | Update benchmark proposal and fixture README with ownership boundaries. | T1 | B |
| T3 | Add tests that reject score-only/model-ranking benchmark shapes. | T1 | B |
| T4 | Add evidence note and run full verification gates. | T2, T3 | C |

### Parallel groups

- **Group A:** the schema/fixture sets the contract.
- **Group B:** docs and tests can proceed after the fixture exists.
- **Group C:** evidence and verification wait until docs and tests are coherent.

### Dependencies

T2 and T3 depend on T1 so the prose and tests point at the same machine-readable contract. T4 depends on both because the evidence note must describe the final changed surface.

### Delegation notes

A reviewer can independently inspect the fixture for public-safety and claim boundaries. Benchmark-repo implementation is a follow-up slice, not delegated here.

## Implementation Architecture Coverage

- Strengthens: benchmark design, recovery/handoff evidence, stop-condition checks, and public claim boundaries.
- Audit envelope: this plan, the v2 proposal, the scenario schema, the scenario fixture, the fixture tests, and the evidence note.
- Evaluation envelope: tests verify that the fixture contains workflow/recovery tracks, impossible/stale requirement handling, scorer-feedback integration, and score-only/model-ranking non-claims.
- Feedback routing: benchmark scorer/harness work moves to `graphanov/2000m`; Open Scaffold controller/runtime work remains behind explicit safety and adapter gates.
- Boundary: no runtime execution, no scorer implementation, no raw benchmark rerun, no publish/release, no merge authority, no adoption proof.

## Acceptance criteria

- [ ] The slice records the decision that benchmark-v2 starts as a two-repo protocol plus benchmark fixture, not as an Open Scaffold-only design note or full benchmark implementation.
- [ ] A machine-readable scenario fixture defines phases for staged requirements, reviewer injection, regression trap, context wipe/handoff, and impossible/stale requirement handling.
- [ ] The scenario separates mechanical, artifact-quality, process-control, and handoff/recovery tracks instead of collapsing the result into a flattering raw score.
- [ ] The fixture references current Open Scaffold prep surfaces: `osc evolve analyze`, `osc eval import`, and `osc evidence compact`.
- [ ] Tests fail if the fixture omits workflow-value dimensions or permits model-ranking/adoption-proof claims.
- [ ] Docs explain that the benchmark repo owns the scorer/harness implementation and that Open Scaffold owns only the work-record/control evidence surfaces.
- [ ] Public-safety scan finds no private names, local paths, Discord/thread IDs, raw-score win claims, or adoption-proof claims in changed public files.

## Verification steps

1. Run `npm test -- benchmark-workflow-fixture.test.ts` and expect the fixture tests to pass.
2. Run `git diff --check` and expect no whitespace errors.
3. Run `npm test` and expect the full suite to pass.
4. Run `npm run build` and expect TypeScript/package build success.
5. Run `./verify.sh --strict` and expect repository compliance to pass.
6. Run a public-safety scan over changed files for private names, local paths, Discord/thread IDs, unsupported score-win claims, model-ranking claims, and adoption-proof claims.

## Open questions

- Should the next slice port this fixture into `graphanov/2000m` as `v2/` scorer/harness scaffolding, or should it first open a benchmark-repo design PR with no scorer code? This slice assumes the fixture should be reviewed here before benchmark-repo mutation.
