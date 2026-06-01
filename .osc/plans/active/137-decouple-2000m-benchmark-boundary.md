# Plan: 137-decouple-2000m-benchmark-boundary

## Status

active

## Context

The 2000m v1 two-lane run produced useful Open Scaffold lessons, but follow-up work crossed a product boundary: Open Scaffold started carrying 2000m-specific benchmark-v2 proposal text and a hardcoded `2000m-v1` eval-import adapter. That makes the benchmark look dependent on Open Scaffold and makes Open Scaffold look dependent on one benchmark. The corrected boundary is: 2000m owns benchmark design/scoring; Open Scaffold only absorbs benchmark findings as generic workflow/product improvements.

## Goal

Remove 2000m-specific benchmark-v2 coupling from Open Scaffold while preserving generic Open Scaffold improvements for external scorer import, plateau analysis, and compact evidence.

## Constraints / Out of scope

- Do not edit, rerun, or mutate 2000m benchmark evidence.
- Do not implement benchmark-v2 in Open Scaffold.
- Do not claim Open Scaffold improved raw 2000m score.
- Do not make 2000m depend on Open Scaffold or Open Scaffold depend on 2000m.
- Do not npm publish, create/update GitHub Releases, or merge without owner approval.

## Files to touch

- `src/evaluation.ts` — generalize the eval importer adapter away from `2000m-v1`.
- `src/cli.ts` — update CLI help/adapter parsing to the generic adapter name.
- `docs/EVOLUTION_LOOP.md` — document generic external scorer import, not a 2000m adapter.
- `docs/benchmarks/README.md` — remove the Open Scaffold-owned benchmark-v2 proposal link.
- `docs/benchmarks/2000m-v1-two-lane-postmortem.md` — keep the historical postmortem but correct future routing.
- `docs/decisions/2026-05-31-osc-evolve-v2-after-2000m.md` — add a superseding boundary correction and remove current-state 2000m adapter direction.
- `docs/benchmarks/2000m-v2-workflow-benchmark-proposal.md` — remove from Open Scaffold.
- `tests/*` — update generic importer fixtures and live-corpus hashes.
- `.osc/releases/2026-06-01-137-decouple-2000m-benchmark-boundary.md` — evidence note for this repair slice.

## Acceptance criteria

- [x] Open Scaffold no longer contains `docs/benchmarks/2000m-v2-workflow-benchmark-proposal.md`.
- [x] `osc eval import` exposes a benchmark-neutral adapter name and no longer hardcodes `2000m-v1` in core code, CLI help, generated envelopes, or tests.
- [x] The 2000m postmortem remains as historical negative-result evidence but routes future benchmark-v2 mechanics to the benchmark repo and Open Scaffold follow-up to generic improvements only.
- [x] The decision note records the corrected boundary: benchmark findings may inform Open Scaffold, but Open Scaffold does not own 2000m benchmark-v2 fixtures/contracts.
- [x] Tests prove the generic external scorer importer still blocks skipped/probe-only/non-pass criteria and redacts local paths.
- [x] Full Open Scaffold gates pass, including `git diff --check`, `npm test`, `npm run build`, and `./verify.sh --strict`.
- [x] A changed-file scan finds no newly introduced private identity/path leaks or affirmative raw-score-win/adoption/model-ranking claims.

## Verification steps

1. `npm test -- tests/evaluation.test.ts tests/cli-eval.test.ts tests/cli-lifecycle-help.test.ts tests/section-parser.test.ts` — targeted tests pass.
2. `git diff --check` — whitespace gate passes.
3. `npm test` — full suite passes.
4. `npm run build` — TypeScript build passes.
5. `./verify.sh --strict` — Open Scaffold strict verifier passes.
6. Changed-file public-safety/coupling scan — no new leaks or affirmative unsupported claims.

## Open questions

- None.
