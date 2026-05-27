# Plan: 109-bare-attempt-compare

## Status

backlog

## Context

`osc evolve compare` already produces the most differentiated artifact in the product: a side-by-side record of attempts, evidence, and acceptance-criteria movement. The problem is reachability. A cold user must learn plans, runs, evaluation envelopes, and evolution loops before seeing the payoff.

## Goal

Ship a prerequisite-free `osc compare ATTEMPT_A ATTEMPT_B` command that turns simple agent-attempt folders into a PR-pasteable attempt-diff table.

## Constraints / Out of scope

- Reuse existing evolution comparison rendering where practical; do not create a second visual language.
- No automatic scoring, model judging, frontier promotion, or claims that a score is objective.
- No runtime spawning. The command reads local files only.
- No dependency on `.osc/runs/`, a plan file, or an evaluation envelope for the bare path.
- Full `osc evolve` stays intact for structured loops.

## Files to touch

- `src/evolution.ts` or a new `src/compare.ts` — shared attempt-diff parsing and rendering.
- `src/cli.ts` — add `osc compare ATTEMPT_A ATTEMPT_B [--json] [--output OUTPUT_PATH]`.
- `tests/evolution.test.ts` or `tests/compare.test.ts` — fixture coverage for bare attempt folders.
- `docs/EVOLUTION_LOOP.md` — document when to use bare compare versus full evolution loop.
- `examples/attempt-compare/` — small fixture with two attempts and expected output.

## Implementation Architecture Coverage

- Strengthens: evaluation, recovery, adoption magic moment, and evidence portability.
- Audit envelope: input folders, rendered comparison output, and fixture expected-output snapshots.
- Evaluation envelope: deterministic tests for parsing, missing optional files, JSON output, and markdown table output.
- Feedback routing: malformed input should return actionable local errors, not partial output.
- Boundary: no automatic quality judgment, no model benchmark, no hidden runtime launch.

## Acceptance criteria

- [ ] `osc compare attempt-a attempt-b` reads local attempt folders containing `diff.patch`, `transcript.md`, `rationale.txt`, and optional `ac-status.json`.
- [ ] The markdown output includes a concise summary, input paths, rationale comparison, changed-file or diff summary, and acceptance-criteria deltas when `ac-status.json` is present.
- [ ] `--json` emits machine-readable comparison data with stable keys and without embedding full transcripts by default.
- [ ] Missing optional files produce warnings; missing both meaningful diff and rationale fails with a clear error.
- [ ] Scores, if present, are labeled as user-provided judgment rather than automatic benchmark results.
- [ ] Existing `osc evolve compare` tests still pass and use the shared renderer where practical.

## Verification steps

1. Run `npm test -- --run tests/compare.test.ts tests/evolution.test.ts`.
2. Run `npm run build`.
3. Run `node dist/cli.js compare examples/attempt-compare/attempt-a examples/attempt-compare/attempt-b` and inspect the markdown table.
4. Run the same command with `--json` and parse the output with `node -e 'JSON.parse(require("fs").readFileSync(0,"utf8"))'`.
5. Run `./verify.sh --strict`.

## Open questions

- Should the command accept more than two attempts in v1, or should multi-attempt comparison stay in `osc evolve compare` until the two-folder path is proven?
- Should the optional AC file be named `ac-status.json`, `acceptance.json`, or reuse the existing evaluation-envelope schema when present?
