# Plan: 151-framework-cleanup-shrink

## Status

done

## Context

The approved OMX deep-interview and ralplan artifacts define an audit-first cleanup of the whole Open Scaffold framework: `.omx/specs/deep-interview-framework-cleanup.md`, `.omx/plans/prd-framework-cleanup.md`, `.omx/plans/test-spec-framework-cleanup.md`, and `.omx/plans/ralplan-consensus-framework-cleanup.json`. The current maintained TypeScript surface is large enough that deletion/merge/refactor work must be planned, measured, and regression-locked before any source edits. This plan is the repo-native Open Scaffold trace for the Ultragoal cleanup run.

## Goal

Reduce Open Scaffold's maintained TypeScript source surface by at least 40% while preserving the protected core deliverables and leaving auditable evidence for every break/removal decision.

## Constraints / Out of scope

- No source edits before G001 baseline artifacts and G002 protected-core regression coverage exist.
- Preserve protected core: mission/plans/amendments, run packets/handoff, evidence/verify/close, and MCP/cockpit/evolution extras.
- Breaking/removal changes are allowed only when evidence-justified, covered by tests, and recorded in the break/removal ledger with migration or repositioning notes.
- Do not add dependencies unless a later amendment explicitly approves it.
- Do not claim the 40% target by moving maintained behavior into generated blobs, vendored code, docs-only hiding places, or unmeasured runtime layers.
- Do not weaken verification commands, public safety boundaries, or package/run-record traceability to hit the shrink metric.

## Files to touch

- `.osc/plans/active/151-framework-cleanup-shrink.md` — active repo-native plan for the cleanup run.
- `.osc/runs/20260605T154630Z-151-framework-cleanup-shrink-run/run.json` — bound run package for this OMX Ultragoal execution.
- `.osc/runs/20260605T154630Z-151-framework-cleanup-shrink-run/baseline-maintained-source.json` — maintained-source LOC/file/module baseline and target.
- `.osc/runs/20260605T154630Z-151-framework-cleanup-shrink-run/public-surface-baseline.md` — package, bin, CLI, and runtime public surface inventory.
- `.osc/runs/20260605T154630Z-151-framework-cleanup-shrink-run/protected-core-map.md` — protected behavior map and regression anchors.
- `.osc/runs/20260605T154630Z-151-framework-cleanup-shrink-run/slop-signal-baseline.json` — initial cleanup-signal counts.
- `.osc/runs/20260605T154630Z-151-framework-cleanup-shrink-run/dependency-security-baseline.md` — dependency and audit status.
- `.osc/runs/20260605T154630Z-151-framework-cleanup-shrink-run/break-removal-ledger.md` — required ledger for future break/removal decisions.
- `src/**/*.ts` — maintained core source eligible for later audited shrink waves.
- `packages/runtime-omx/src/**/*.ts` — maintained runtime package source eligible for later audited shrink waves.
- `tests/**/*.ts` and `packages/runtime-omx/tests/**/*.ts` — protected-core and behavior-lock tests.
- Public docs and release notes as needed for migration/repositioning evidence.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|--------------|----------------|
| G001 | Promote this active plan and establish baseline ledger artifacts. | None | A |
| G002 | Lock protected-core regression coverage and maintained-surface measurement. | G001 | B |
| G003 | Produce shrink audit and wave plan with break/removal candidates. | G001, G002 | C |
| G004 | Execute small verified shrink waves toward the 40% target. | G003 | D |
| G005 | Run final verification, ai-slop-cleaner, independent code-reviewer review, architect review, and final evidence report. | G004 | E |

### Parallel groups

- **Group A**: G001 is leader-owned setup because it creates the canonical plan/run/baseline trace.
- **Group B**: G002 can split protected-core test discovery across mission/plans/evidence/runtime surfaces, but shared test files require leader integration.
- **Group C**: G003 can parallelize read-only audits by surface (`src/cli.ts`, evolution/evidence, MCP/cockpit, runtime-omx, tests/docs) once regression anchors are known.
- **Group D**: G004 must run in small serial waves unless the wave plan proves independent file ownership and rollback boundaries.
- **Group E**: G005 requires independent reviewer lanes after implementation and post-cleaner verification.

### Dependencies

- G002 depends on G001 because tests must lock the measured baseline and protected-core matrix.
- G003 depends on G002 because deletion candidates must reference coverage or required new tests.
- G004 depends on G003 because source changes must map to predeclared shrink waves and rollback rules.
- G005 depends on G004 because final cleanup/review evidence must cover the actual changed files.

### Delegation notes

- Use read-only `explore`, `test-engineer`, `code-reviewer`, and `architect` subagents for independent audits/reviews when they reduce risk.
- Do not use `worker` outside active OMX team/swarm mode.
- The Ultragoal leader owns `.omx/ultragoal/goals.json`, `.omx/ultragoal/ledger.jsonl`, checkpoints, and the aggregate Codex goal.

## Implementation Architecture Coverage

- Strengthens: workflow design, audit trails, recovery/ownership, runtime-boundary discipline, and evaluation against acceptance criteria.
- Audit envelope: `.omx/ultragoal/goals.json`, `.omx/ultragoal/ledger.jsonl`, this plan, `.osc/runs/20260605T154630Z-151-framework-cleanup-shrink-run/`, and final `.osc/releases/<YYYY-MM-DD>-framework-cleanup-shrink.md` if a release/evidence note is warranted.
- Evaluation envelope: maintained-source measurement command, protected-core regression matrix, build/test/runtime/audit/verify commands, ai-slop-cleaner report, independent code-reviewer review, and architect review.
- Feedback routing: protected-core failures become blocker stories or amendments; justified scope changes use `osc amend`; non-clean final review uses Ultragoal `record-review-blockers` before any aggregate goal completion.
- Boundary: this plan does not publish packages, merge PRs, rotate credentials, launch production side effects, or make OMC/OMX a core source of truth.

## Acceptance criteria

- [ ] G001 baseline artifacts exist in `.osc/runs/20260605T154630Z-151-framework-cleanup-shrink-run/`, including maintained-source LOC/files/module count, public surface baseline, protected-core behavior map, slop signals, dependency/security status, and break/removal ledger location.
- [ ] G002 protected-core regression coverage is added or confirmed for mission/plans/amendments, run packets/handoff, evidence/verify/close, MCP/cockpit/evolution extras, runtime-omx boundary behavior, and the maintained-surface measurement command.
- [ ] G003 shrink audit identifies deletion/merge/deprecation candidates, expected shrink deltas, break/removal risks, migration/repositioning notes, and rollback conditions before source shrink waves begin.
- [ ] G004 verified shrink waves reduce maintained TypeScript source from the 20,890 LOC baseline to 12,534 LOC or less, unless an approved PRD exception records the equivalent metric policy.
- [ ] G005 final gate passes required verification: `npm run build`, `npm test`, `npm run test:runtime-omx`, `npm audit --json`, `./verify.sh`, smoke/e2e or approved replacement, ai-slop-cleaner on changed files, rerun verification, independent code-reviewer approval, and architect clear review.
- [ ] Every breaking/removal decision is recorded in `.osc/runs/20260605T154630Z-151-framework-cleanup-shrink-run/break-removal-ledger.md` with evidence, affected surface, replacement/migration/repositioning note, and verification.

## Verification steps

1. Validate this plan with `npm run osc -- plan validate .osc/plans/active/151-framework-cleanup-shrink.md --json`; pass means no validation findings.
2. Run the maintained-source measurement command from `.osc/runs/20260605T154630Z-151-framework-cleanup-shrink-run/baseline-maintained-source.json`; pass means it reproduces 48 files / 20,890 LOC before source edits.
3. Run `./verify.sh --quick --quiet`; pass means mission and plan compliance remain green.
4. For later source waves, run targeted behavior-lock tests before and after each wave plus the final G005 command suite.
5. Check `.omx/ultragoal/ledger.jsonl`; pass means every completed story has a checkpoint with evidence and active/final Codex goal reconciliation as required by Ultragoal.

## Open questions

- None for G001. Later G003 may discover break/removal candidates that require explicit amendments or steering before implementation.
