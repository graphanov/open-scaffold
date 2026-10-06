# Plan: self-dogfood-release-loop

## Status

done

## Context

Open Scaffold has now shipped v1 protocol slices for task/run identity, slice-close evidence, glass-cockpit events, runtime dispatch, and runtime binding. The next product proof is not another isolated protocol document; it is a public end-to-end trace showing Open Scaffold developing Open Scaffold through its own issue -> plan -> run -> PR -> review -> release/evidence loop.

## Goal

Demonstrate one complete public Open Scaffold self-dogfood chain from ROADMAP Milestone 6 to GitHub issue, `.osc` plan, run ID, PR, Codex-review status, verification, and release/evidence note.

## Constraints / Out of scope

- Do not implement autonomous spawning in Open Scaffold core.
- Do not require Hermes, Command Center, Kanban, Discord, OMC, OMX, Claude, or Codex as mandatory runtime infrastructure.
- Do not add private Command Center state, Daniel-specific machinery, secrets, or local runtime logs to public core.
- Keep this as a v1 proof/evidence slice; full release automation, dashboards, and schema validators remain future work.

## Files to touch

- `.osc/plans/active/005-self-dogfood-release-loop.md` — concrete plan for Milestone 6 proof.
- `.osc/releases/2026-05-12-self-dogfood-release-loop.md` — release/evidence note for the public dogfood chain.
- `ROADMAP.md` — mark Milestone 6 as active/proven by the self-dogfood chain once the PR exists.
- `docs/GITHUB_WORKFLOW.md` — clarify release/evidence note expectations for v1 dogfood PRs.
- `README.md` — add a product-facing pointer to the self-dogfood proof chain if useful.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|--------------|----------------|
| T1 | Create GitHub issue and `.osc` plan for Milestone 6 | None | A |
| T2 | Generate a run packet / run ID binding issue, plan, branch, executor lane, and evidence path | T1 | B |
| T3 | Add release/evidence note and public documentation links | T2 | C |
| T4 | Open PR with full traceability and trigger Codex review | T3 | D |
| T5 | Verify, classify Codex/CI status, and merge/close if gates are satisfied | T4 | E |

### Parallel groups

- **Group A**: establish the durable work item and plan.
- **Group B**: bind execution attempt identity after plan exists.
- **Group C**: document the evidence outcome.
- **Group D**: publish through GitHub PR.
- **Group E**: verify and close the loop.

### Dependencies

- T2 depends on T1 because the run packet must cite the issue and plan.
- T3 depends on T2 because the release/evidence note must cite the run ID.
- T4 depends on T3 because the PR should carry issue, plan, run, evidence, and verification.
- T5 depends on T4 because review gates exist on the PR.

### Delegation notes

- This slice can be executed by a plain agent/Hermes direct workflow because it is documentation/product-evidence work.
- If a runtime harness executes a future variant, Open Scaffold core should still only generate the run packet; the harness launch belongs outside core.

## Acceptance criteria

- [ ] GitHub issue #8 represents ROADMAP Milestone 6 as a public work item.
- [ ] This plan exists in `.osc/plans/active/` and references the issue, expected evidence, and non-goals.
- [ ] A run ID binds issue #8, this plan, branch `docs/self-dogfood-release-loop`, executor lane, PR, and evidence path.
- [ ] A release/evidence note records the issue -> plan -> run -> PR -> verification -> Codex status -> merge/release chain.
- [ ] PR body includes issue, plan path, run ID, evidence path, verification commands, and Codex status.
- [ ] `./verify.sh --standard`, `npm run osc -- verify`, `npm test`, `npm run build`, and `git diff --check` pass.
- [ ] No private Command Center machinery leaks into Open Scaffold core.

## Verification steps

1. Run `./verify.sh --standard`; expected result: all checks pass.
2. Run `npm run osc -- verify`; expected result: mission and plan checks pass.
3. Run `npm test`; expected result: all tests pass.
4. Run `npm run build`; expected result: TypeScript build passes.
5. Run `git diff --check`; expected result: no whitespace errors.
6. Inspect the PR and release/evidence note for issue, plan, run ID, verification, Codex status, and private-leakage boundaries.

## Open questions

- Should `.osc/releases/` become the canonical release/evidence-note location for public Open Scaffold proof chains, or should future releases use GitHub Releases plus a mirrored repo note?
- Should a future CLI command generate release/evidence notes from run packets and PR metadata?
