# Plan: 092-evolution-loop-visibility-v1

## Status

active

## Context

Plans `087`, `090`, and `091` shipped the closed evolution-loop contract, `osc evolve compare`, and README repositioning around work records and evolution ledgers. The remaining adoption gap is visibility: a fresh reader needs one small public-safe path that shows two attempts, the comparison, and why the promoted frontier won without reading raw JSONL.

## Goal

Make the shipped evolution ledger and `osc evolve compare` flow obvious through one public-safe docs/example path and one focused compare-output improvement that turns evaluation envelopes into reviewer-readable acceptance-criteria deltas.

## Constraints / Out of scope

- Do not publish raw private notes or private owner/deployment context.
- Do not add runtime adapters, native spawning, model ranking, benchmark claims, compliance certification claims, or approval automation.
- Do not add new top-level CLI commands.
- Do not implement `osc evolve report`, `replay`, HTML output, `--range`, `--code`, or full evidence/code diffing in this slice.
- Do not change npm package version, publish npm, or create/edit GitHub Releases without a separate owner gate.
- Keep README changes tiny; the README already carries the work-record/evolution-ledger positioning from plan `091`.

## Files to touch

- `src/evolution.ts` — read linked evaluation envelopes during compare and render criteria deltas.
- `tests/evolution.test.ts` — unit coverage for criteria delta rendering and graceful missing-evaluation behavior.
- `tests/cli-evolution.test.ts` — CLI coverage that markdown `--out` includes the criteria delta table.
- `docs/EVOLUTION_LOOP.md` — link the existing contract doc to the one-screen walkthrough.
- `docs/examples/evolution-loop-compare.md` — public-safe walkthrough of two attempts, compare output, and frontier rationale.
- `docs/examples/README.md` — add the evolution-compare example to the examples index.
- `docs/EXAMPLES.md` — add a short pointer from the top-level examples page.
- `README.md` — add at most one pointer to the walkthrough if needed.
- `.osc/releases/2026-05-22-092-evolution-loop-visibility-v1.md` — final evidence note after verification.
- `MISSION.md` — closeout changelog stamp when the plan is complete.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|--------------|----------------|
| T1 | Write failing tests for acceptance-criteria delta output | None | A |
| T2 | Implement compare criteria-delta parsing/rendering | T1 | B |
| T3 | Add the public-safe evolution-loop compare walkthrough | T1 | B |
| T4 | Wire docs/index/README pointers | T3 | C |
| T5 | Create release evidence note and close the plan | T2, T3, T4 | D |
| T6 | Run verification gates and prepare PR-ready report | T5 | E |

### Parallel groups

- **Group A**: define behavior through tests first.
- **Group B**: implementation and docs can progress after tests describe the output contract.
- **Group C**: link the new docs once the target page exists.
- **Group D/E**: closeout and verification after code/docs settle.

### Dependencies

- T2 depends on T1 so compare behavior is test-first.
- T4 depends on T3 because docs links should point at a real page.
- T5/T6 depend on all changed artifacts so evidence and verification reflect final state.

### Delegation notes

This is small enough for direct implementation. Do not spawn runtime workers or external automation for this slice.

## Implementation Architecture Coverage

- Strengthens: adoption trust, evaluation readability, audit trails, recovery/ownership.
- Audit envelope: plan `092`, release/evidence note, tests, verification commands, branch/PR-ready report.
- Evaluation envelope: `osc evolve compare` should surface existing `open-scaffold.evaluation.v1` acceptance-criteria statuses without becoming an evaluator.
- Feedback routing: larger ideas (`report`, replay, HTML, range, code/evidence diffs, adapters, launch work) remain follow-up candidates.
- Boundary: Open Scaffold core remains read-only for compare; runtime execution, model ranking, compliance certification, and release approval stay outside core.

## Acceptance criteria

- [ ] A fresh reader can open one public docs page and understand in under five minutes: one task can have multiple attempts, `compare` shows why the frontier changed, and the repo keeps that decision reconstructable.
- [ ] `osc evolve compare --format markdown` includes a PR-ready acceptance-criteria delta table when evaluation envelopes are present.
- [ ] `osc evolve compare` still exits cleanly for one-attempt loops and loops without frontier comparison state.
- [ ] Compare output does not mutate `loop.json`, `attempts.jsonl`, or `frontier.json`.
- [ ] Docs and examples use public-safe, owner-neutral wording and contain no private paths, raw notes, private deployment internals, credentials, or personal context.
- [ ] No docs claim that Open Scaffold launches agents, ranks models, certifies compliance, or approves releases.
- [ ] README remains compact; any README change is a pointer, not another broad positioning rewrite.
- [ ] Verification passes: targeted evolution tests, full tests, build, strict scaffold verification, and whitespace check.

## Verification steps

1. `git diff --check` — no whitespace errors.
2. `npm test -- --run tests/evolution.test.ts tests/cli-evolution.test.ts` — targeted evolution tests pass.
3. `npm test -- --run` — full suite passes.
4. `npm run build` — package builds.
5. `./verify.sh --strict` — scaffold verification passes.
6. Manual smoke: `npm run osc -- evolve compare <tmp-loop-dir> --format terminal`, `--format markdown --out /tmp/osc-evolution-compare.md`, and `--format json` produce readable output without mutating loop files.
7. Public-safety review confirms no private notes, owner paths, runtime-spawning/model-ranking/compliance/approval overclaims, or private deployment context entered public docs.

## Open questions

- Should a follow-up slice add `osc evolve report` or static HTML after this v1 visibility proof? Deferred.
- Should adapter expansion start immediately after this? Deferred until the ledger story is visibly useful.
