# Plan: 044-cli-friction-reduction

## Status

backlog

## Context

External review praised Open Scaffold's methodology mechanics but called out per-slice ceremony and manual template friction. After first-run path and vocabulary are hardened, the next product improvement is to make common scaffold actions easier without hiding the plan/evidence discipline.

## Goal

Add small CLI helpers that reduce first-plan and evidence-note ceremony while preserving explicit acceptance criteria and verification.

## Constraints / Out of scope

- Do not replace shell helpers wholesale in this slice.
- Do not implement `osc amend` and `osc close` parity until `plan new` / `evidence new` behavior is proven.
- Do not hide or auto-invent acceptance criteria.
- Do not add runtime launch behavior.
- Do not create a wizard that writes vague plans without human review.

## Files to touch

- `src/cli.ts` — route new CLI commands.
- `src/scaffold.ts` and/or new CLI helper modules — create plan/evidence files safely.
- `tests/cli-*.test.ts`, `tests/scaffold.test.ts`, and/or `tests/validation.test.ts` — cover command behavior.
- `.osc/plans/handoff-template.md` — only if template wording needs command compatibility clarification.
- `README.md`, `docs/MINIMUM_VIABLE_SCAFFOLD.md`, and `docs/WORKFLOW.md` — document the new minimal commands.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|--------------|----------------|
| T1 | Audit manual friction points in first plan and evidence creation | None | A |
| T2 | Implement `osc plan new <slug> --stage <stage>` with overwrite refusal | T1 | B |
| T3 | Implement `osc evidence new <slug>` or equivalent release/evidence skeleton command | T1 | B |
| T4 | Add tests for safe paths, duplicate refusal, stage validation, and generated structure | T2, T3 | C |
| T5 | Patch docs to use helpers without hiding required human content | T4 | D |
| T6 | Run full verification | T5 | E |

### Parallel groups

- **Group A**: audit only.
- **Group B**: plan and evidence helpers can be implemented in parallel if they do not share risky internals.
- **Group C**: tests after command behavior exists.
- **Group D/E**: docs and final verification.

### Dependencies

- T2/T3 depend on T1 so command scope stays minimal.
- T5 depends on tests to avoid documenting unproven behavior.

### Delegation notes

- Code worker can implement commands; Hermes should review generated plan/evidence wording for public-safe clarity.

## Implementation Architecture Coverage

- Strengthens: workflow design, adoption trust, evidence, recovery/ownership.
- Audit envelope: PR should include before/after first-plan command path, generated file examples, and test output.
- Evaluation envelope: generated files must still require human-filled goals, constraints, ACs, and verification; command success is not task success.
- Feedback routing: requests for amend/close parity route to a later plan after helper adoption is proven.
- Boundary: runtime launching, automatic task execution, and autonomous plan generation remain outside this slice.

## Acceptance criteria

- [ ] `osc plan new <slug> --stage active|backlog|blocked` creates a schema-compatible plan skeleton in the correct folder and refuses overwrite.
- [ ] The generated plan contains all required sections and explicit TODO/fill-in prompts without hallucinated acceptance criteria.
- [ ] `osc evidence new <slug>` or equivalent creates a release/evidence skeleton with Summary, Traceability, Verification, Outcome, and Follow-up sections.
- [ ] Commands reject unsafe paths, invalid stages, duplicate files, and missing scaffold roots with actionable errors.
- [ ] Shell helpers remain available and documented as compatibility floor.
- [ ] `npm run build`, `npm test`, `./verify.sh --strict`, and `git diff --check` pass.

## Verification steps

1. Run `npm test` for CLI/scaffold/validation suites; pass if new helper behavior and error cases are covered.
2. In a temp initialized project, run `node dist/cli.js plan new 001-first-task --stage active`; pass if `./verify.sh --quick` can see the plan structure after required fields are filled.
3. Run evidence helper in a temp project; pass if the skeleton has required sections and no false proof claims.
4. Run `npm run build`, `npm test`, `./verify.sh --strict`, and `git diff --check`; pass on clean outputs.

## Open questions

- Should evidence helper create `.osc/releases/<date>-<slug>.md`, a task/run evidence file, or both depending on flags?
- Should `osc amend` / `osc close` parity be the immediate follow-up once these helpers land?
