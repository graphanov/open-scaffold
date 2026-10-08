# Plan: 188-lab-handoff-section-budget

## Status

active

## Context

Frozen synthetic case S03 led John to independently reproduce a supported 900-character input in the exported lab compiler that truncates the final required heading. The validator honestly reports failure. The maintained CLI uses a different compiler and correctly rejects tiny budgets; public issue 289 records this narrow lab defect.

## Goal

The lab handoff compiler preserves every complete required section within its tested 900-character budget by shortening content before packet structure.

## Constraints / Out of scope

- Keep the exported schema/signature, default budget, redaction behavior, boundary flags and validation honesty.
- Preserve normal already-valid output when feasible; below-structure budgets must not falsely pass.
- Do not change compileResume, CLI/MCP budget range 600–20000, records, dependencies, validators, test thresholds, persona or evaluation definitions.
- Respect the maintained-source cap through readable scoped simplification, never threshold changes or code minification.

## Files to touch

- `src/handoff.ts` — reserve all five complete headings before reducing bodies/list entries.
- `tests/handoff-compiler.test.ts` — exact observed reproduction, adjacent/default/redaction and tiny-budget controls.

## Acceptance criteria

- [ ] The exact S03 reduced 139-character state/two 260-character blockers at maxChars 900 emits all five complete sections, validation pass and length at most 900.
- [ ] The initial legitimate large 900-character case and ordinary/default-budget cases retain structure and redaction; all existing tests remain.
- [ ] Tiny or insufficient structural budgets remain honest failures, never a false pass or silent larger-than-requested budget.
- [ ] Only the two scoped files change after admission; no maintained-source/dependency/API/CLI threshold changes.
- [ ] Targeted tests, strict verification, both builds, full tests and independent unchanged-head/full-scope review pass before public effects.

## Verification steps

1. Replay exact saved S03 reproduction and adjacent controls against exported functions; record failed-first and final outputs.
2. `npm test -- tests/handoff-compiler.test.ts` passes new regressions and existing cases.
3. `./verify.sh --strict`, `npm run build`, `npm test` pass on unchanged committed candidate, including maintained-source cap.
4. Fresh Overwatch reviews actual complete publication scope; verify current GitHub head/base/checks and read back effects before delegated merge.

## Open questions

- There is no universal helper minimum budget contract; this task fixes the already-tested supported 900-character behavior and preserves explicit validation failure when structure cannot fit.
