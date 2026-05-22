# Plan: 094-evolution-ledger-demo-proof

## Status

done

## Context

Open Scaffold `v0.4.13` shipped the evolution loop comparison surface: `osc evolve compare` can render attempt deltas and acceptance-criteria movement from repo-local ledger files. The public docs now explain the idea, but the next credibility gap is proof: a new reader should be able to inspect and rerun a small fixture that shows why one agent attempt became the frontier instead of another.

This plan follows `.osc/plans/done/090-evolution-compare.md`, `.osc/plans/done/091-readme-work-record-evolution-ledger.md`, `.osc/plans/done/092-evolution-loop-visibility-v1.md`, and `.osc/plans/done/093-pr89-public-surface-sync.md`.

## Goal

Add a public-safe, reproducible evolution-ledger demo that shows recorded attempts, evaluations, a promoted frontier, and a PR-ready `osc evolve compare` report a reviewer can trust.

## Constraints / Out of scope

- Do not rewrite the README broadly; add only a small pointer if useful.
- Do not add BMAD/spec-kit/Agent OS comparison claims or importer work.
- Do not add runtime adapters, native spawning, hidden process launch, model ranking, compliance certification, or approval automation.
- Do not add `osc evolve report`, `osc evolve replay`, HTML output, static-site sharing, badges, SDKs, or marketplace/registry behavior.
- Do not publish npm or create/edit/move a GitHub Release in this slice.
- Do not copy private planning notes, owner-local paths, raw runtime transcripts, secrets, or private automation details into public repo artifacts.
- Keep the demo boring and inspectable: small static files, deterministic commands, and tests that fail if the proof rots.

## Files to touch

- `.osc/plans/done/094-evolution-ledger-demo-proof.md` — plan and acceptance contract for this slice.
- `examples/evolution-ledger-demo/` — public-safe fixture and README for the reproducible demo proof.
- `tests/cli-evolution.test.ts` and/or `tests/evolution.test.ts` — regression coverage that runs/validates the demo fixture.
- `README.md` — at most one short pointer to the demo.
- `docs/EVOLUTION_LOOP.md` — link the proof demo from the evolution-loop docs.
- `docs/EXAMPLES.md` and `docs/examples/README.md` — add the demo to the examples reading path.
- `.osc/releases/2026-05-22-094-evolution-ledger-demo-proof.md` — evidence note after implementation and verification.
- `MISSION.md` — close stamp only if this plan is closed after verification.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|--------------|----------------|
| T1 | Run read-only credibility/design review lanes over the proposed demo shape | None | A |
| T2 | Create the static demo fixture with loop, attempts, run packets, evaluations, and expected compare output | T1 | B |
| T3 | Add tests/smoke coverage proving the demo fixture checks and compare output remain stable | T2 | C |
| T4 | Add light docs links and public-safe explanatory copy | T2 | C |
| T5 | Write release/evidence note, close plan if ACs are met, and run full verification | T3, T4 | D |
| T6 | Open PR and complete CI/Codex latest-head review loop; stop before merge/publish/release | T5 | E |

### Parallel groups

- **Group A**: read-only review lanes may inspect current docs/code and return recommendations; they must not modify files.
- **Group B**: fixture creation is the backbone and must land before tests/docs can point at stable paths.
- **Group C**: tests and docs can proceed in parallel after fixture paths are stable.
- **Group D**: evidence and closeout wait for the exact implemented files and verification results.
- **Group E**: PR/Codex loop waits for local verification and final evidence.

### Dependencies

- T3 depends on T2 because tests need the concrete fixture paths and expected output.
- T4 depends on T2 because public docs should link to the actual demo path, not a placeholder.
- T5 depends on T3/T4 so evidence records real verification, not planned verification.
- T6 depends on T5 so the PR includes the final plan/evidence state.

### Delegation notes

Read-only review lanes are appropriate for T1 and pre-commit review. The operator owns final integration, verification, public-safe wording, GitHub PR, and Codex loop. No worker may merge, publish npm, create a GitHub Release, resume external automation, or mutate unrelated Open Scaffold state.

## Implementation Architecture Coverage

- Strengthens: adoption trust, public proof, evaluation visibility, repeated-attempt evidence, reviewer comprehension.
- Audit envelope: plan `094`, demo fixture files, test output, release/evidence note, PR, CI/Codex review comments.
- Evaluation envelope: the demo itself must contain two evaluation envelopes with different acceptance-criteria outcomes, and tests must verify that compare output exposes the delta.
- Feedback routing: demo/test/docs issues found during review route into this branch; broader report/replay/runtime/importer ideas become future backlog only after owner approval.
- Boundary: Open Scaffold remains a recorder/renderer. The demo must not imply that core launches agents, ranks models, certifies compliance, or approves releases.

## Acceptance criteria

- [ ] A public-safe `examples/evolution-ledger-demo/` fixture exists with at least three recorded attempts, run packets, evaluation envelopes, a loop directory, an attempts journal, a rejected non-frontier attempt, and a promoted current frontier.
- [ ] The demo README explains the scenario in plain language, includes exact commands to run `osc evolve check` and `osc evolve compare` against the fixture, and states that Open Scaffold did not execute the attempts or promote the frontier.
- [ ] The compare output clearly shows why attempt C became the frontier instead of attempt A, including at least one acceptance criterion that moves from fail to pass.
- [ ] A committed expected markdown output is asserted byte-for-byte against `osc evolve compare` output, with only intentional renderer changes allowed to update it.
- [ ] Automated tests or a deterministic smoke command prove the fixture stays valid and `osc evolve compare` renders the expected frontier rationale / acceptance-criteria delta.
- [ ] README/docs links are light and do not broaden the project positioning beyond the already-shipped work-record/evolution-ledger frame.
- [ ] Public docs contain no private planning notes, owner-local paths, raw runtime transcripts, secrets, or unsupported compliance/runtime/model-ranking claims.
- [ ] Local verification passes: `git diff --check`, targeted evolution/demo tests, full test suite, build, `./verify.sh --strict`, and `npm run osc -- verify` with any pre-existing warnings classified.
- [ ] PR is opened for review and the Codex latest-head loop is driven to clean or reported as pending/no-response after the required polling window.

## Verification steps

1. `git diff --check` — no whitespace errors.
2. `npm test -- --run tests/evolution.test.ts tests/cli-evolution.test.ts` — targeted evolution tests pass, including the demo fixture regression.
3. `npm test -- --run` — full suite passes.
4. `npm run build` — core and runtime package build.
5. `./verify.sh --strict` — scaffold compliance is clean.
6. `npm run osc -- verify` — CLI verifier passes; any warnings are pre-existing or intentionally explained.
7. Manual smoke: `npm run osc -- evolve check examples/evolution-ledger-demo/.osc/evolution/reviewable-csv-importer` passes.
8. Manual smoke: `npm run osc -- evolve compare examples/evolution-ledger-demo/.osc/evolution/reviewable-csv-importer --format markdown --out /tmp/osc-094-compare.md && diff -u examples/evolution-ledger-demo/docs/evidence/evolution-compare-expected.md /tmp/osc-094-compare.md` matches the committed expected output and includes the frontier rationale / acceptance-criteria delta.

## Open questions

- Should this slice stop at a repo-local fixture, or also include a short video/script artifact? Default: repo-local fixture only; a video can be a follow-up after the proof is reviewable.
- Should the demo fixture live under `examples/` or `docs/examples/`? Default: `examples/` for mechanically runnable fixtures, linked from `docs/examples/` for reading.
