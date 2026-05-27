# Release / Evidence Note: 109-bare-attempt-compare

## Summary

Added a prerequisite-free `osc compare <attempt-a-dir> <attempt-b-dir>` command that turns two simple local attempt folders into a PR-pasteable work-record comparison. The command is intentionally local-file-only: it does not spawn runtimes, score models, promote a frontier, or approve work.

## Traceability

- Roadmap / issue / task: next release-train slice after plan 108, focused on the adoption "magic moment" for comparing repeated agent attempts.
- Plan: .osc/plans/done/109-bare-attempt-compare.md
- Run ID / run packet: N/A — direct CLI implementation and local fixture; no runtime execution.
- Branch / PR: `cli/bare-attempt-compare`; https://github.com/graphanov/open-scaffold/pull/134

## Verification

- RED check: `npm test -- tests/compare.test.ts --run` — failed before implementation with `Unknown command: compare`.
- Focused GREEN check: `npm test -- tests/compare.test.ts --run` — 1 file passed, 5 tests passed.
- Related evolution regression: `npm test -- tests/compare.test.ts tests/evolution.test.ts --run` — 2 files passed, 27 tests passed.
- Full suite: `npm test -- --run` — 45 files passed, 393 tests passed.
- Build: `npm run build` — PASS.
- Markdown fixture smoke: `node dist/cli.js compare examples/attempt-compare/attempt-a examples/attempt-compare/attempt-b` — output matches `examples/attempt-compare/expected.md`.
- JSON smoke: `node dist/cli.js compare examples/attempt-compare/attempt-a examples/attempt-compare/attempt-b --json` — parses as `open-scaffold.attempt-comparison.v1`, reports `docs/onboarding.md`, and keeps transcript bodies out of JSON.
- Plan validation: `node dist/cli.js plan validate .osc/plans/done/109-bare-attempt-compare.md` — 0 issues found.
- Scaffold verifier: `./verify.sh --strict` — 10 pass, 0 fail, 0 warn.
- Whitespace: `git diff --check` — PASS.
- Static scan: added-line scan found 0 hardcoded secrets, 0 shell injection, 0 dangerous eval/exec, and 0 private key/token markers.
- Independent review: pre-commit reviewer passed the diff with no security concerns and no logic errors; one markdown-escaping suggestion was applied before final verification.

## Outcome

Open Scaffold now exposes the attempt-comparison payoff without requiring a user to first create a plan, run packet, evaluation envelope, or full evolution loop. The full `osc evolve compare` path remains the durable structured loop for append-only state, frontier rationale, adapter receipts, and evaluation binding.

## Follow-up

- Owner gate remains: merge PR #134 after CI and latest-head Codex review are clean.
- No package publish or GitHub Release is included in this PR.
