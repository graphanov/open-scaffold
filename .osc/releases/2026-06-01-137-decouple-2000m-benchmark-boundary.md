# Release / Evidence Note: 137-decouple-2000m-benchmark-boundary

## Summary

Repairs the Open Scaffold / 2000m boundary after the 2000m v1 two-lane postmortem follow-up drifted too far into benchmark-specific artifacts.

This slice removes the Open Scaffold-owned benchmark-v2 proposal, generalizes `osc eval import` from a hardcoded `2000m-v1` adapter to a benchmark-neutral `generic-ac-json-v1` adapter, and updates docs/tests so benchmark findings feed Open Scaffold only as generic workflow improvements.

## Traceability

- Roadmap / issue / task: owner-directed repair after PR #164 was closed as the wrong benchmark-v2 coupling shape.
- Plan: `.osc/plans/active/137-decouple-2000m-benchmark-boundary.md`.
- Run ID / run packet: N/A — direct docs/code/test repair slice; no runtime, benchmark rerun, npm publish, or GitHub Release.
- Branch / PR: branch `fix/decouple-2000m-boundary`; PR pending.

## Verification

- `npm test -- tests/evaluation.test.ts tests/cli-eval.test.ts tests/cli-lifecycle-help.test.ts tests/evolution.test.ts tests/cli-evolution.test.ts tests/section-parser.test.ts` — PASS, 6 files / 87 tests.
- `npm run osc -- plan validate 137-decouple-2000m-benchmark-boundary --strict` — PASS, `0 issues found`.
- `git diff --check` — PASS.
- `npm test` — PASS, 55 files / 569 tests.
- `npm run build` — PASS, core and runtime-omx TypeScript builds.
- `./verify.sh --strict` — PASS, 10 pass / 0 fail / 0 warn.
- Changed-file public-safety/coupling scan — PASS; no private identity/path leaks, secret-token shapes, unexpected 2000m/benchmark-v2 coupling in code/tests, or affirmative raw-score-win/adoption/model-ranking claims.

## Outcome

Implemented and locally verified on the repair branch. Open Scaffold keeps generic evaluator/import/analyze/evidence mechanics while 2000m remains the independent home for benchmark design/scorer/harness work.

## Follow-up

- Do not merge without owner approval.
- No npm publish or GitHub Release work is included in this slice.
- If a future 2000m-specific converter is needed, put it in `graphanov/2000m` or an optional integration rather than Open Scaffold core.
