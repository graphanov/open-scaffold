# Release / Evidence Note: 137-benchmark-v2-workflow-value-fixture

## Summary

Adds a public-safe, machine-readable benchmark-v2 workflow-value scenario fixture after the 2000m v1 raw-score tie. The fixture defines a two-repo protocol handoff: Open Scaffold records the work-record/control evidence contract, while `graphanov/2000m` remains the owner of future v2 scorer and harness implementation.

## Traceability

- Roadmap / issue / task: Post-2000m benchmark-v2 follow-up from `docs/benchmarks/2000m-v1-two-lane-postmortem.md` and `docs/decisions/2026-05-31-osc-evolve-v2-after-2000m.md`; no GitHub issue selected for this bounded slice.
- Plan: `.osc/plans/active/137-benchmark-v2-workflow-value-fixture.md`
- Run ID / run packet: `N/A` — this slice changed docs, fixture JSON, and tests directly and did not spawn a runtime.
- Branch / PR: `feat/benchmark-v2-workflow-fixture`; PR pending owner review.

## Verification

- `npm test -- benchmark-workflow-fixture.test.ts` — PASS, 1 file / 5 tests.
- `npm run osc -- plan validate 137-benchmark-v2-workflow-value-fixture --strict` — PASS, `0 issues found`.
- `git diff --check` — PASS.
- `npm test` — PASS, 56 files / 574 tests.
- `npm run build` — PASS, core and runtime-omx TypeScript builds.
- `./verify.sh --strict` — PASS, 10 pass / 0 fail / 0 warn.
- Public-safety scan over changed files — PASS; no private identity, local absolute path, Discord/thread ID, secret-token, unsupported raw-score-win, adoption-proof, or model-ranking claim hits.

## Outcome

Candidate fixture is prepared on a feature branch. It separates mechanical conformance, artifact quality, process-control quality, and handoff/recovery quality; includes staged requirement, reviewer-injection, regression-trap, context-wipe, and impossible/stale-requirement phases; and references `osc evolve analyze`, `osc eval import`, and `osc evidence compact` as evidence surfaces without making Open Scaffold the benchmark scorer or runtime.

No npm publish, GitHub Release, benchmark rerun, 2000m v1 evidence mutation, merge, or model-ranking claim is included in this slice.

## Follow-up

- Owner gate remains for PR review and merge.
- Next likely slice: port or adapt this fixture into `graphanov/2000m` as a v2 scorer/harness design or implementation PR.
- Package/public release reconciliation remains out of scope unless the owner explicitly authorizes a release train.
