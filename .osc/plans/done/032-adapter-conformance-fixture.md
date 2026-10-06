# Plan: 032-adapter-conformance-fixture

## Status

done — recommended next implementation track after the 2026-05-15 runtime-selection and agentic-orchestration sparring syntheses. Promote to active only after the current capture PR is merged and the repo is back on clean `main`.

## Context

The runtime-selection and agentic-orchestration reviews converged on the same next credible move: make the runtime binding contract executable before adding runtime picker, orchestration, model-lab, or native-runtime surfaces. A fake/local adapter plus conformance fixture can prove the dispatch-receipt contract without requiring real runtimes, credentials, or spawning.

## Goal

Add a small fake/local adapter conformance fixture that proves an adapter can consume an Open Scaffold run packet and return a valid dispatch receipt/evidence artifact without Open Scaffold core owning runtime execution.

## Constraints / Out of scope

- Do not launch Claude, Codex, OMC, OMX, GSD, or any real agent runtime.
- Do not add `osc init --runtime`, `osc orchestrate`, model rankings, or native runtime behavior.
- Do not store credentials or provider-specific config.
- Keep the adapter fake/local and deterministic.
- Preserve `spawning: false` semantics for Open Scaffold core; the fixture demonstrates adapter boundaries, not core spawning.
- Keep public wording vendor-neutral and avoid certifying third-party runtimes.

## Files to touch

- `docs/examples/runtime-binding-conformance/` — fixture run packet, fake adapter invocation notes, expected receipt shape.
- `docs/examples/runtime-binding-dry-run.mjs` or sibling example script — only if reusing existing dry-run mechanics is simpler than adding a new script.
- `docs/RUNTIME_BINDING_CONTRACT.md` — concise link to the conformance fixture and adapter expectations.
- `docs/SPAWNING_BOUNDARY.md` — only if the dispatch-receipt boundary needs a small clarification.
- `package.json` / test files — only if a runnable npm script or Vitest smoke is needed.

## Acceptance criteria

- [ ] A fake/local adapter fixture consumes a sample `.osc/runs/<run_id>/run.json` or documented equivalent.
- [ ] The fixture produces a dispatch receipt/evidence artifact with stable fields that match the documented boundary.
- [ ] The fixture is deterministic and does not require network, credentials, private tools, or real agent runtimes.
- [ ] Documentation explains that adapter conformance is the bridge toward runtime/orchestration ecosystems, not a core spawning feature.
- [ ] `./verify.sh --standard` exits 0.
- [ ] `npm test` exits 0 if tests are added or touched.
- [ ] `npm run build` exits 0 if TypeScript/package code is added or touched.
- [ ] `git diff --check` exits 0.

## Verification steps

1. Run the fixture command documented in `docs/examples/runtime-binding-conformance/`; expected: dispatch receipt/evidence artifact is produced deterministically.
2. Run `./verify.sh --standard`; expected exit 0.
3. Run `npm test` if tests are added or touched; expected exit 0.
4. Run `npm run build` if package/TypeScript code is added or touched; expected exit 0.
5. Run `git diff --check`; expected no whitespace errors.

## Open questions

- Should the fake/local adapter live only as docs/examples, or should it become an npm-accessible package later?
- Should conformance validate JSON schema mechanically in this slice, or only provide a fixture and expected receipt shape?
- What is the minimum receipt schema needed before real adapters can be refreshed under Milestone 9?
