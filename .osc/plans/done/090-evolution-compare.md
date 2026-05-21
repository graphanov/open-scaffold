# Plan: 090-evolution-compare

## Status

active

## Context

An outside reader reviewed Open Scaffold at v0.4.10 and identified the evolution loop as the project’s strongest differentiated product surface. The current `osc evolve` contract records `loop.json`, `attempts.jsonl`, and `frontier.json`, but reviewers still have to open raw JSONL to understand why one attempt beat another. This plan makes the loop visible without changing runtime authority.

## Goal

Add a read-only `osc evolve compare <loop-dir>` command that explains two evolution attempts side by side so a reviewer can understand the frontier decision in terminal, markdown, or JSON output.

## Constraints / Out of scope

- Do not add a top-level CLI command; keep the surface under `osc evolve`.
- Do not spawn runtimes, run agents, rank models, certify compliance, or approve release.
- Do not add runtime dependencies for this slice.
- Do not implement `osc evolve report`, `replay`, `diff-evidence`, adapter cloning, importers, SDKs, or static share sites in this slice.
- Do not publish npm or create a GitHub Release without a separate owner gate after merge.
- Do not include the raw private author report in tracked public artifacts.

## Files to touch

- `src/evolution.ts` — load loop state and render compare results.
- `src/cli.ts` — add `osc evolve compare` arguments, help text, output writing, and exit behavior.
- `tests/evolution.test.ts` — unit coverage for compare selection, rendering, and edge cases.
- `tests/cli-evolution.test.ts` or existing CLI test file — CLI coverage for compare help/output.
- `README.md` — lightly reposition `What you get` and document `evolve compare` in the repeated-attempt workflow.
- `.osc/releases/2026-05-22-090-evolution-compare.md` — evidence note with verification results.

## Implementation Architecture Coverage

- Strengthens: evaluation, audit trails, recovery/ownership, adoption trust.
- Audit envelope: plan `090-evolution-compare`, release/evidence note, PR, tests, and compare output examples.
- Evaluation envelope: unit and CLI tests prove compare resolves attempts and renders metadata without mutating loop state.
- Feedback routing: follow-up ideas (`report`, `replay`, adapter expansion, static share, badge, compliance export) remain backlog candidates, not scope creep.
- Boundary: Open Scaffold core remains a recorder/renderer. Attempt execution, runtime spawning, model judging, compliance certification, and release decisions remain outside core.

## Acceptance criteria

- [ ] `osc evolve compare <loop-dir>` defaults to previous frontier versus current frontier when frontier history and current frontier are present.
- [ ] `--a <attempt-id|run-id|frontier>` and `--b <attempt-id|run-id|frontier>` resolve explicit comparison targets with clear errors for unknown attempts.
- [ ] A loop with only one recorded attempt exits successfully with a clear “nothing to compare” message.
- [ ] Terminal output includes loop objective, strategy, attempt count, A/B decision, score/delta, run ID, evidence count/membership summary, evaluation presence, rationale, boundary differences, and frontier history.
- [ ] `--format markdown` renders a PR-comment-friendly comparison table and rationale block.
- [ ] `--format json` emits machine-readable comparison data.
- [ ] `--out <path>` writes markdown or JSON output without mutating loop files.
- [ ] README and CLI help mention the compare command without adding new top-level CLI vocabulary.
- [ ] Verification passes: `git diff --check`, `npm test -- --run`, `npm run build`, and `./verify.sh --strict`.

## Verification steps

1. Run targeted RED/GREEN tests for the compare unit coverage.
2. Run targeted CLI tests for `osc evolve compare` and help output.
3. Run `npm test -- --run` and expect all tests to pass.
4. Run `npm run build` and expect TypeScript build success.
5. Run `git diff --check` and expect no whitespace errors.
6. Run `./verify.sh --strict` and expect no failures.
7. Run a manual smoke on a temporary loop and verify terminal/markdown/json outputs are readable and no loop state changes.

## Open questions

- Whether to add richer evaluation criterion diffing now or keep the first slice to evaluation presence/metadata until evaluation envelopes expose stable per-criterion fields.
- Whether README repositioning should be a tiny paragraph only or a larger front-page rewrite after Daniel reviews the first compare output.
