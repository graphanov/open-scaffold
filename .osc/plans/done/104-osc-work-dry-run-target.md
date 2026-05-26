# Plan: 104-osc-work-dry-run-target

## Status

done


## Context

The north-star workflow is `osc work "Add a /health endpoint with tests" --runtime codex`: a user starts from intent, Open Scaffold drafts a plan, confirms scope, creates a run packet, dispatches to the selected adapter, captures evidence, verifies, and asks before commit/push/PR. That target should be approached only after the smaller no-spawn pieces exist.

## Goal

Add the first `osc work` composition as a dry-run intake command that drafts the plan/run/dispatch preview for a natural-language task without launching a runtime.

## Constraints / Out of scope

- Do not launch Codex, OMX, Claude Code, OpenHands, or any other runtime.
- Do not auto-commit, push, open PRs, merge, publish, or modify source files outside the drafted scaffold artifacts.
- Do not replace project/product judgment; the operator must confirm scope before execution.
- Do not require network access or model calls in the first dry-run version unless a separate design proves it safe and useful.

## Files to touch

- `src/cli.ts` or CLI command modules — `osc work` parsing/help.
- `src/` plan/run preview helpers — natural-language intent to scaffolded candidate artifacts.
- `tests/` — dry-run output, no-spawn/no-source-mutation tests.
- `docs/RUNTIME_ADOPTION_WORKFLOW.md`, `README.md`, or quickstart docs — target workflow docs.
- `.osc/releases/` — evidence note if shipped.

## Implementation Architecture Coverage

- Strengthens: adoption UX, scope confirmation, and staged runtime boundaries.
- Audit envelope: candidate plan preview, run packet preview, dispatch command preview, and operator confirmation status.
- Evaluation envelope: tests assert no runtime spawn and no source mutation; manual UX read checks that the command is understandable.
- Feedback routing: if users need automatic plan drafting via an LLM, route that as a later adapter/model-assisted planning slice.
- Boundary: `osc work --dry-run` composes existing primitives; it is not a native runtime.

## Acceptance criteria

- [x] `osc work "TASK DESCRIPTION" --runtime codex --dry-run` produces a readable plan/run/dispatch preview.
- [x] The command clearly asks for scope confirmation before any execution path.
- [x] The command does not spawn runtime processes, call provider APIs, mutate source files, commit, push, or create PRs.
- [x] Output points to the next staged command (`osc start`, `osc run`, or `osc dispatch`) rather than hiding execution.
- [x] Tests cover no-spawn/no-source-mutation behavior.
- [x] `./verify.sh --strict`, `npm test`, `npm run build`, and `git diff --check` pass.

## Verification steps

1. Run focused `osc work --dry-run` tests.
2. Run a scratch CLI smoke with a simple task string.
3. Inspect generated preview artifacts for no private owner context.
4. Run `./verify.sh --strict`.
5. Run `npm test`.
6. Run `npm run build`.
7. Run `git diff --check`.

## Open questions

- Should the first version write a draft plan file immediately, or only print a preview until the operator confirms? Prefer preview-first unless user testing shows too much friction.
