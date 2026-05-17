# Plan: <slug>

<!--
Copy this template to `.osc/plans/<slug>.md` for each task or feature slice.
Fill every section. Keep each section tight — a reader with no prior context
should be able to act on the plan after reading it once.

Plans are IMMUTABLE once committed. If new information changes the plan,
run `./amend.sh <slug>` from the repo root — it scaffolds the next amendment
file and stamps MISSION.md's changelog in one shot. Do not hand-edit plan
files or MISSION.md for amendment bookkeeping.
-->

## Status

<!-- One of: active | complete | superseded -->
active

## Context

<1-3 sentences: why this plan exists. What happened that made us write it now? What prior plan or decision does it follow from, if any?>

## Goal

<One crisp sentence describing the outcome that defines "done" for this plan. Not a feature list — the single observable change in the world when this is complete.>

## Constraints / Out of scope

- <what this plan will NOT do>
- <non-goals specific to this slice>
- <boundaries on stack, time, or surface area>

## Files to touch

- `path/to/file.ext` — <one-line reason>
- `path/to/other.ext` — <one-line reason>

## Execution strategy

<Include this section when a plan involves 3+ tasks that can be organized into independent parallel batches. Omit for simple single-agent plans.>

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|-------------|----------------|
| T1 | <task description> | None | A |
| T2 | <task description> | T1 | B |
| T3 | <task description> | None | A |

### Parallel groups

- **Group A** (<rationale>): T1, T3 — <why these are independent>
- **Group B** (depends on Group A): T2 — <why this must wait>

### Dependencies

- T2 depends on T1 (<specific reason — e.g., "needs the API schema T1 produces">)

### Delegation notes

- <which groups are suitable for parallel agents or separate terminal sessions>
- <which groups must wait for earlier groups to complete>

## Implementation Architecture Coverage

<!-- Optional. Include when the slice affects architecture, evidence, runtime boundaries, authority, or adoption trust. Keep this short. -->

- Strengthens: <workflow design | data access | authority | evaluation | audit trails | recovery/ownership>
- Audit envelope: <task/run/PR/evidence IDs or paths needed to reconstruct what happened>
- Evaluation envelope: <how acceptance criteria will be checked; who/what evaluates; where evidence lands>
- Feedback routing: <where failures, weak approvals, scope changes, or follow-ups should go>
- Boundary: <what remains outside this slice: runtime enforcement, credentials, system-of-record permissions, compliance certification, model benchmarking, production rollback, etc.>

## Acceptance criteria

- [ ] <testable bullet — something a verifier can check mechanically or with a clear yes/no>
- [ ] <testable bullet>
- [ ] <testable bullet>

## Verification steps

1. <command or manual check>
2. <expected output or observable>
3. <pass criterion: exactly what makes this step green>

## Open questions

- <unresolved decision, tag with owner if known>
- <assumption that needs validation before or during execution>
