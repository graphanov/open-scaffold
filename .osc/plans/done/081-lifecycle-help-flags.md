# Plan: 081-lifecycle-help-flags

## Status

done

## Context

The pinpoint dogfood scout checked the day-two plan lifecycle surface after recent plan helper PRs. `osc plan --help`, `osc plan new --help`, `osc plan move --help`, `osc amend --help`, and `osc close --help` currently enter normal execution paths instead of printing usage. That makes scripted or exploratory users hit ENOENT, missing-option, or unsafe-slug errors while trying to learn the lifecycle commands.

## Goal

Make plan lifecycle help flags print command-specific usage with exit code 0 instead of treating `--help` as a plan path, slug, or missing option.

## Constraints / Out of scope

- Do not change plan creation, movement, amendment, or close semantics.
- Do not add new lifecycle commands or broad command-parser refactors.
- Do not move, publish, merge, or release anything outside this focused help behavior.
- Keep help text concise and aligned with existing root CLI usage.

## Files to touch

- `src/cli.ts` — route plan/amend/close help flags before normal execution.
- `tests/cli-lifecycle-help.test.ts` — regression coverage for lifecycle help flags.
- `.osc/releases/2026-05-20-081-lifecycle-help-flags.md` — evidence note for the pinpoint delta.

## Acceptance criteria

- [x] `osc plan --help` exits 0 and prints plan-specific usage.
- [x] `osc plan new --help`, `osc plan move --help`, `osc plan validate --help`, and `osc plan wizard --help` exit 0 and print subcommand-specific usage.
- [x] `osc amend --help` and `osc close --help` exit 0 and print lifecycle usage instead of unsafe-slug errors.
- [x] Existing lifecycle behavior and validation remain unchanged.

## Verification steps

1. `npm test -- tests/cli-lifecycle-help.test.ts --run` — targeted help regression tests pass.
2. `npm run build` — TypeScript build passes.
3. `npm test -- --run` — full Vitest suite passes.
4. `./verify.sh --strict` — scaffold verification passes.
5. `npm run osc -- verify` — CLI verifier passes.
6. `git diff --check` — no whitespace errors.

## Open questions

- None.
