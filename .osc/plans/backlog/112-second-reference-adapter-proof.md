# Plan: 112-second-reference-adapter-proof

## Status

backlog

## Context

Runtime-neutrality is credible in architecture but still thin in public proof because the serious adapter path is effectively the OMX/Codex lane. The strategy review found that a registry or broad runtime claim should wait until a second reference adapter proves the handoff contract is not single-runtime theater.

## Goal

Ship a second no-spawn reference adapter proof that can consume an Open Scaffold run packet and produce a valid dispatch receipt and evidence note without core owning runtime execution.

## Constraints / Out of scope

- No hidden spawning in Open Scaffold core.
- No claim of full production support for the selected runtime.
- No registry or marketplace behavior in this slice.
- No secrets, hosted service, or remote execution requirement.
- Adapter choice must be justified before implementation; likely candidates are Claude Code, Aider, or a plain local-agent adapter.

## Files to touch

- `packages/runtime-ADAPTER/` — new package or fixture for the selected second adapter.
- `src/runtimes.ts` — add a profile only if the adapter has real handoff evidence.
- `docs/RUNTIME_BINDING_CONTRACT.md` — document second-adapter conformance expectations.
- `docs/RUNTIME_PROFILES.md` — explain the new reference adapter boundary.
- `tests/` or `packages/runtime-ADAPTER/tests/` — conformance and no-spawn receipt tests.

## Implementation Architecture Coverage

- Strengthens: runtime boundaries, adapter conformance, evidence, and ecosystem credibility.
- Audit envelope: run-packet fixture, adapter invocation transcript or dry-run, dispatch receipt, evidence note, and conformance test output.
- Evaluation envelope: schema validation, no-spawn assertions, private-path guards, and receipt identity checks.
- Feedback routing: adapter gaps become registry blockers or conformance follow-ups.
- Boundary: no marketplace, no automatic install, no certification, no core runtime launch.

## Acceptance criteria

- [ ] The PR selects exactly one second adapter candidate and documents why it is the right proof target.
- [ ] The adapter consumes a local `run.json` fixture and writes `dispatch-receipt.json` with the existing dispatch receipt schema.
- [ ] The adapter writes or documents a corresponding evidence note path without storing raw private transcripts by default.
- [ ] Tests prove the adapter does not spawn from Open Scaffold core and does not write outside the intended run directory.
- [ ] Runtime docs explicitly state support level, setup requirements, and non-certification boundary.
- [ ] Plan 070's registry dependency is satisfied or clearly moved closer by the shipped proof.

## Verification steps

1. Run the adapter package tests and schema validation tests for dispatch receipts.
2. Run a local fixture invocation against a temp `.osc/runs/RUN_ID/run.json`.
3. Inspect generated receipt/evidence for correct run ID, plan slug, adapter ID, and paths.
4. Run `npm run build` and `npm test -- --run`.
5. Run `./verify.sh --strict`.

## Open questions

- Which adapter is the best second proof after the Codex/OMX lane: Claude Code, Aider, Cursor/manual export, or a plain local-agent adapter?
- Should the second adapter be a package, a documented fixture, or a conformance harness first?
