# Release / Evidence Note: adapter conformance contract v1

## Summary

Open Scaffold now has a sharper adapter conformance contract for the no-spawn runtime boundary. The fake/local conformance fixture proves the structural path from `run.json` package consumption to dispatch receipt creation and deterministic evidence writing, without launching a runtime or claiming task correctness.

## Traceability

- Plan: `.osc/plans/done/041-adapter-conformance-contract-v1.md`
- Branch: `runtime/adapter-conformance-contract-v1`
- PR: `#47` — https://github.com/graphanov/open-scaffold/pull/47
- Kanban: `t_11706cc9`
- Primary docs: `docs/RUNTIME_BINDING_CONTRACT.md`, `docs/SPAWNING_BOUNDARY.md`, `docs/RUNTIME_SELECTION.md`, `docs/RUNTIME_PROFILES.md`, `docs/examples/runtime-binding-conformance/README.md`
- Fixture/test: `docs/examples/runtime-binding-conformance/fake-local-adapter.mjs`, `tests/runtime-binding-conformance.test.ts`

## Outcome

- Canonicalized `open-scaffold.dispatch-receipt.v1` as the dispatch receipt schema and `dispatch-receipt.json` as the default receipt file.
- Clarified that runtime profiles are declarative data, adapters are external consumers/launch glue, and real runtime launch remains outside Open Scaffold core.
- Tightened the fake/local fixture to validate runtime selection, workflow/harness matching, required acceptance criteria and verification steps, safe receipt/evidence paths, and no-spawn behavior.
- Added deterministic evidence content linked to the dispatch receipt and explicit no-runtime/no-network/no-credentials claims.
- Kept OMC/OMX/Claude/Codex/OpenCode wording at lane/profile/adapter-candidate level, not runtime-support endorsement.

## Verification

- `npm test -- tests/runtime-binding-conformance.test.ts tests/runtime-binding-dry-run.test.ts` → 24 pass.
- `npm run build` → pass.
- `npm test` → 14 files / 129 tests passed.
- `./verify.sh --strict` → 10 pass / 0 fail / 0 warn.
- `git diff --check` → pass.
- Boundary scan for new positive `certified integration`, `officially supported`, `spawning: true`, or `spawned: true` claims → pass.

## Follow-up

- `042-reference-adapter-package-no-spawn` can now build against the dispatch receipt/evidence contract without guessing the schema or boundary.
- `043-one-real-runtime-adapter-spike` remains future work after the no-spawn reference package proves the package boundary.
