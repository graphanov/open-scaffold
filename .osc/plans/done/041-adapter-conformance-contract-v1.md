# Plan: 041-adapter-conformance-contract-v1

## Status

done

## Context

External review correctly identified a run-packet adoption deadlock: `osc run` can create a `run.json`, but no production adapter is guaranteed to consume it. Current Open Scaffold code and docs also correctly preserve the boundary that core must not become a runtime spawner by drift. This plan makes the adapter contract sharper before any sister package or real runtime adapter work.

## Goal

Freeze a small v1 adapter conformance contract that proves consume-run-packet -> write adapter receipt -> write evidence without adding spawning to core.

## Constraints / Out of scope

- Do not add real process spawning, credentials, provider SDKs, network registry behavior, or runtime install logic to core.
- Do not certify OMC, OMX, Claude Code, Codex, OpenCode, or any runtime as supported without reproducible adapter evidence.
- Do not create a marketplace or package discovery system.
- Do not change `spawning: false` requirements in core runtime profiles.
- Do not make fake/local adapter output sound like proof of task correctness.

## Files to touch

- `docs/RUNTIME_BINDING_CONTRACT.md` — clarify adapter responsibilities and receipt/evidence contract.
- `docs/SPAWNING_BOUNDARY.md` — reinforce core/adapters/sibling-package split.
- `docs/RUNTIME_SELECTION.md` and/or `docs/RUNTIME_PROFILES.md` — distinguish data profiles from tested adapters.
- `docs/examples/runtime-binding-conformance/` — promote fixture as conformance target, not production adapter.
- `tests/runtime-binding-conformance.test.ts` — lock receipt/evidence expectations.
- Optional `src/` validation files — only for schema/receipt validation, not launch behavior.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|--------------|----------------|
| T1 | Audit current run packet, receipt, evidence, and fake/local fixture fields | None | A |
| T2 | Define the minimum v1 adapter receipt/evidence contract | T1 | B |
| T3 | Patch docs to distinguish profiles, adapters, and runtime launch | T2 | C |
| T4 | Add or tighten tests around conformance fixture output | T2 | C |
| T5 | Verify core still rejects spawning runtime profiles | T3, T4 | D |

### Parallel groups

- **Group A**: read-only audit.
- **Group B**: contract decision.
- **Group C**: docs and tests can proceed together after contract fields are fixed.
- **Group D**: final boundary verification.

### Dependencies

- T3/T4 depend on T2 so docs and tests describe the same contract.
- T5 depends on docs/tests to catch accidental runtime creep.

### Delegation notes

- Use a boundary reviewer for docs to ensure no wording implies certified runtime support.
- Use a code/test worker only if receipt validation or fixture test changes are needed.

## Implementation Architecture Coverage

- Strengthens: runtime boundaries, audit trails, evaluation, recovery/ownership.
- Audit envelope: PR should include sample run packet, adapter receipt, evidence artifact, and tests proving no spawn.
- Evaluation envelope: conformance is structural/factual only; correctness of runtime work remains a later evaluation step.
- Feedback routing: missing production launch support should feed `042-reference-adapter-package-no-spawn` or `043-one-real-runtime-adapter-spike`, not core spawning.
- Boundary: runtime install, auth, process lifecycle, remote execution, and commit/push/merge authority remain outside core.

## Acceptance criteria

- [ ] Docs define a small v1 adapter receipt/evidence contract in plain language.
- [ ] Runtime profiles remain data-only and `spawning: false` in core.
- [ ] Fake/local conformance fixture is documented as a contract target, not a production adapter.
- [ ] Tests prove run packet consumption, receipt creation, evidence creation, and no-spawn behavior.
- [ ] Public wording avoids certified integration claims for runtimes without real adapter evidence.
- [ ] `./verify.sh --strict`, `npm test`, `npm run build`, and `git diff --check` pass.

## Verification steps

1. Run `npm test -- tests/runtime-binding-conformance.test.ts tests/runtime-binding-dry-run.test.ts`; pass if conformance and no-spawn cases are green.
2. Run `! git diff -U0 origin/main...HEAD -- docs/RUNTIME_BINDING_CONTRACT.md docs/SPAWNING_BOUNDARY.md docs/RUNTIME_SELECTION.md docs/RUNTIME_PROFILES.md src | grep '^+' | grep -E "certified integration|officially supported|spawning: true|spawned: true"`; pass if no newly added unsupported integration claims or core spawning paths appear, with any intentional negative examples reviewed explicitly.
3. Run `npm run build`, `npm test`, `./verify.sh --strict`, and `git diff --check`; pass on clean outputs.

## Open questions

- Should core expose a receipt validation command, or should validation remain in tests/examples until the reference adapter package exists?
- What exact field name should become stable for the adapter receipt: `dispatch-receipt`, `adapter-receipt`, or a backwards-compatible alias?
