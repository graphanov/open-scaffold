# Plan: 169-review-battery

## Status

backlog

## Context

Plan 168 narrowed Open Scaffold core to the repo-native work record, handoff packets, review/gate judgments, evidence, and close protocol. `osc review` now names the local recorded-attempt analysis front door, while `osc analyze` remains its synonym.

Prior review experiments used fixed factual batteries over recorded work to make cheap/local judges answer concrete questions instead of offering vibes. AC6 already gave `osc gate` an OpenAI-compatible judge endpoint for rulings; this plan stages the sibling product move for `osc review`: an optional external battery mode that reads the record and reports structured review facts.

This exists now because the command name is finally available and stable after the `$`-verb retirement. The work should be designed before implementation because the output may later map into evaluation envelopes and docs tiers.

## Goal

When activated, add an optional review-battery mode to `osc review`:

`osc review <loop-or-run> --judge-endpoint <url> --judge-model <name>`

The mode asks a record-only battery and emits versioned JSON (`open-scaffold.review-battery.v1`) plus markdown. Without `--judge-endpoint`, `osc review` remains the local analysis front door and `osc analyze` remains a synonym.

The battery fields are:

- `work_complete`
- `attempts_made`
- `final_criteria_passing`
- `quality_regressed`
- `unsatisfiable_requirement`
- `claimed_vs_actual_mismatch`
- `recommended_next_action`
- `why_work_ended`

## Constraints / Out of scope

- This backlog plan does not implement the feature until the owner explicitly activates it.
- Do not change the default local behavior of `osc review` or `osc analyze` when no judge endpoint is provided.
- Do not spawn runtimes, execute work, approve retries, merge, publish, release, deploy, or change package versions.
- The battery must answer from the recorded loop/run only. It must abstain with `unknown` rather than guess when the record is insufficient.
- The review battery is a structured review aid, not proof of correctness, not human approval, and not compliance certification.
- Do not invent USD costs; if usage appears, tokens remain the cost metric.

## Files to touch

- `src/reviewer.ts` — add review-battery prompt construction, strict parsing, and tolerance patterns mirroring `parseJudgeRuling` where appropriate.
- `src/cli.ts` — wire `osc review <loop-or-run> --judge-endpoint <url> --judge-model <name>` while preserving the existing local review/analyze path without endpoint flags.
- `src/mcp-tools.ts` — add read-only `review_record` MCP tool, mirroring `gate_loop` safety and output patterns.
- `src/schema-registry.ts` and `docs/SCHEMA_REGISTRY.md` — register `open-scaffold.review-battery.v1`.
- `tests/reviewer.test.ts` or adjacent focused tests — mock fetch success, malformed responses, unknown/abstain behavior, and endpoint flag validation.
- `tests/cli-lifecycle-help.test.ts` and `tests/framework-cleanup-metric.test.ts` — update help/LOC pins with rationale if the implementation changes them.
- `docs/EVOLUTION_LOOP.md`, `docs/MCP.md`, and `README.md` — document the optional battery mode without overclaiming.

## Acceptance criteria

- [ ] `osc review <loop-or-run>` without endpoint flags still runs the current local analysis front door; `osc analyze` still works as a synonym.
- [ ] `osc review <loop-or-run> --judge-endpoint <url> --judge-model <name>` sends only bounded record context to an OpenAI-compatible endpoint and does not mutate evidence unless an explicit future option is designed.
- [ ] The command emits JSON with schema `open-scaffold.review-battery.v1` plus markdown output, including every required battery field.
- [ ] Battery parsing fails closed on malformed endpoint output and uses `unknown` for unsupported or insufficient-record answers instead of guessing.
- [ ] The MCP `review_record` tool is read-only, mirrors CLI safety boundaries, and cannot spawn runtimes or approve work.
- [ ] Tests cover success, malformed endpoint output, unknown/abstain behavior, missing/conflicting judge flags, and default local review behavior.
- [ ] Docs and schema registry describe the feature as a structured review aid, not correctness proof or owner approval.

## Verification steps

1. `npm run build` — TypeScript passes for core and runtime package.
2. `npm test -- --run tests/reviewer.test.ts tests/cli-lifecycle-help.test.ts tests/mcp-server.test.ts` — focused tests pass.
3. `npm test` — full suite passes.
4. `./verify.sh --strict` — 0 fail, 0 warn.
5. `git diff --check && git diff --cached --check` — whitespace checks pass.
6. Manual smoke: `osc review <fixture-loop>` still runs local analysis without endpoint flags.
7. Manual smoke with mocked/local OpenAI-compatible endpoint records `open-scaffold.review-battery.v1` JSON and markdown with `unknown` where the fixture lacks enough evidence.

## Open questions

- Should the public command shape stay as `osc review <loop-or-run> --judge-endpoint <url> --judge-model <name>`, or should the battery mode get an explicit subcommand/flag such as `osc review battery`?
- Should review-battery answers be recordable as `open-scaffold.evaluation.v1` envelopes, since the fields map closely to evaluation criteria?
- Should review-3 judge-ladder results gate which endpoint/model tiers the docs recommend, or should docs stay endpoint-neutral until there is broader evidence?
