# Plan: 138-blueprint-security-adoption-program

## Status

done

## Context

A 2026-06-02 external review/blueprint package was provided as source input for Open Scaffold's next hardening wave. The package prioritizes security/trust hardening, first-run adoption, reviewer value, runtime-lane stabilization, adoption proof, schema/help cleanup, and trust-boundary clarity while explicitly dropping Korean adoption/localization.

## Goal

Turn the accepted blueprint package into staged, reviewable Open Scaffold slices with P0/P1 work prioritized and P2 work captured as concrete follow-up plans.

## Constraints / Out of scope

- Do not commit the full blueprint package as product documentation; it remains ignored research input unless a specific public-safe excerpt is promoted.
- Do not add Korean docs, examples, localization, or translation-maintenance work.
- Do not publish npm, create/mark GitHub Releases, merge, push protected branches, deploy, expose secrets, or claim compliance/correctness certification.
- Do not weaken the no-spawn core boundary or make runtime execution default-on.
- Do not turn this into one giant unreviewable PR; keep implementation slices small enough to inspect.

## Files to touch

- `.osc/plans/active/139-dispatch-env-timeout-log-bounds.md` — first executable P0 security slice.
- `.osc/plans/backlog/` — future P0/P1/P2 slices when not implemented in the current branch.
- `.osc/releases/` — slice evidence notes after concrete implementation work.
- Product/code/docs files named by each child slice plan.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|--------------|----------------|
| T1 | Ingest blueprint package and compare against current repo truth | None | A |
| T2 | Create staged plan map and first executable dispatch hardening plan | T1 | B |
| T3 | Implement dispatch env restriction + timeout/log bounds | T2 | C |
| T4 | Create remaining backlog plans for adapter trust, redaction/docs, README/help, first-run, PR checks, runtime beta, adoption proof, and P2 cleanup | T1 | D |
| T5 | Verify each implemented slice and record evidence | T3 or later implementation slices | E |

### Parallel groups

- **Group A**: research/source-truth reading only.
- **Group B/C**: first P0 implementation sequence; T3 depends on T2.
- **Group D**: backlog planning can proceed after T1 but should not block the first P0 security patch.
- **Group E**: verification/evidence after each implementation slice.

### Dependencies

- Child implementation plans must exist before non-trivial code/doc changes.
- P0 dispatch hardening should land before runtime beta or broader adapter trust work.
- Runtime beta claims depend on env allowlist, timeout, bounded logs, redaction, trust workflow, and worktree/protected-branch enforcement.

### Delegation notes

- Future docs/adoption/help slices can be delegated to bounded workers after their plans exist.
- Security/runtime slices should use strict TDD and avoid runtime spawning unless a child plan explicitly gates it.

## Implementation Architecture Coverage

- Strengthens: authority, runtime boundary, audit trails, recovery/ownership, and adoption trust.
- Audit envelope: blueprint source path `.osc/research/2026-06-02-review-blueprint-ingest/`, child plan slugs, evidence notes, verification commands, and PR/branch identifiers.
- Evaluation envelope: each child slice must define mechanical acceptance criteria and local verification commands.
- Feedback routing: scope changes become child plan amendments; deferred recommendations become backlog plans, not chat-only promises.
- Boundary: this program is structural and local by default; it is not a runtime launch, correctness certification, compliance claim, npm release, or localization program.

## Acceptance criteria

- [x] Blueprint package is unpacked only in ignored research/temp storage and treated as input, not product docs. Evidence: `.osc/releases/2026-06-02-138-blueprint-security-adoption-program.md`
- [x] P0/P1/P2 recommendations are mapped to implemented slices or concrete backlog plans. Evidence: `.osc/releases/2026-06-02-138-blueprint-security-adoption-program.md`
- [x] The first P0 dispatch hardening slice has its own plan, tests, implementation, evidence note, and verification results. Evidence: `.osc/releases/2026-06-02-138-blueprint-security-adoption-program.md`
- [x] Public-facing changes avoid Korean localization and avoid overclaiming semantic correctness, compliance, runtime support, or release status. Evidence: `.osc/releases/2026-06-02-138-blueprint-security-adoption-program.md`
- [x] Remaining owner-gated actions are explicit at final handoff. Evidence: `.osc/releases/2026-06-02-138-blueprint-security-adoption-program.md`

## Verification steps

1. Run `git status --short --branch --ignored` and verify the blueprint package remains under ignored `.osc/research/` unless explicitly promoted.
2. Run `npm run osc -- plan validate .osc/plans/done/138-blueprint-security-adoption-program.md --strict`.
3. Run child-plan validation for every new/touched plan.
4. For implemented code slices, run `git diff --check`, focused tests, `npm test`, `npm run build`, `./verify.sh --strict`, and relevant `npm run osc -- verify` / evidence-chain checks.

## Open questions

- None. The owner-directed execution-style change is captured in amendment 1; merge, npm publish, GitHub Release/latest movement, real runtime execution, deployment, and credential side effects remain owner-gated.
