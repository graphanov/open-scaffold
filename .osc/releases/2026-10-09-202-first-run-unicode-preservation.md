# Evidence Note: 202-first-run-unicode-preservation

## Summary

Prepared a test-only proposal for successful first-run in a brownfield root containing Unicode, spaces and an apostrophe. It retains the ASCII case and original assertions, and adds original project bytes/inventory, contained root-relative record paths, reciprocal plan/evidence links, and preservation of edited mission, plan, evidence and whole-tree bytes/inventory through repeat with different setup inputs.

Independent coverage inspection found these guarantees split across existing ASCII brownfield, conflict, direct-repeat and newcomer tests, without the inspected combined successful Unicode-root CLI invariant. Current implementation passes; no product defect or production behavior change is claimed.

## Traceability

- Plan: `.osc/plans/active/202-first-run-unicode-preservation.md`.
- Parent: `.osc/plans/active/184-john-six-day-maintainer.md` remains active; the six-day run is incomplete.
- Branch: `codex/john-first-run-unicode-preservation`.
- Source base: `9ccaa9ce1ed39f90562c652593c85465e8166d53`.
- Implementation scope: `tests/blueprint-mega.test.ts` and this note only.
- Publication: no PR, commit, merge or release observed for this proposal.

## Verification

- A private copy of current source and package inputs compiled with `node node_modules/typescript/bin/tsc -p tsconfig.json` (exit 0). This was a private core compile, not the repository full build or a production rebuild.
- The exact proposed test bytes ran with `node node_modules/vitest/vitest.mjs run tests/blueprint-mega.test.ts -t 'creates one valid first work-record path|onboards an empty folder|explains first-run scaffold file conflicts'`: five cases passed, seven unrelated cases filtered, exit 0. The retained controls account for eleven actual CLI calls, including their expected conflict refusal. The Unicode variant used three calls: first-run, strict plan validation after synthetic uncommitted progress edits, then first-run with different mission/goal inputs. It resolves the reported evidence filename without a fixed date and compares file bytes plus directory/file inventory while ignoring timestamps.
- A separately isolated private test-effectiveness control removed only the evidence-write existence guard. The single Unicode case failed at its edited-evidence byte assertion while all three CLI calls exited 0. Exact private source bytes were restored, and one Unicode restoration check passed. This artificial control is not a current production bug or a source fix, and no mutation source bytes are proposed for delivery.
- The actual note parser accepted this note without note-specific failures or warnings; removing the Outcome section in a separate private fixture produced the expected missing-section diagnostic, after which the original fixture note bytes were restored. The fixture's two active-plan advisory warnings remain recorded because this proposal does not close the active plan.
- All tracked source-checkout bytes and inventory remained unchanged. Maintained production source stays at the accepted 16,984 lines / 41 files with unchanged roots, physical algorithm, 20,890 baseline, file cap and POSIX counting. No metric or dependency changes are proposed.
- These are private preparation checks on the local platform. The unchanged committed-head `./verify.sh --strict`, `npm run build`, `npm test` floor, independent acceptance and publication review, current CI, and delivery readback have not yet occurred. This does not establish installed-package or all-platform correctness, adoption, project execution, or production readiness.

## Outcome

prepared_not_observed: the exact two-file test-only proposal is ready for independent design acceptance. No implementation commit, draft PR, merge, release, or factual plan closeout has occurred. Later implementation requires native ownership for the two admitted paths, unchanged committed-head full verification, fresh publication review including corrected prior-201 metadata, current CI and actual effect readback. Parent 184 remains active through the maintenance interval.

Implementation observations recorded before commit on 2026-10-09:

- The preparation text above remains an exact 4,125-byte historical prefix. Fresh independent design acceptance approved the exact two-file proposal before implementation. The accepted test bytes are now applied unchanged; the evidence note only appends subsequent factual observations.
- One implementation focused run of the same five-case filter passed: 5 cases passed, 7 unrelated cases filtered, exit 0. Eleven recorded real CLI calls include ten exit-0 results and the retained expected conflict refusal. The Unicode variant's three calls exited 0 and preserved the 38-entry edited tree, record identities and bytes. Healthy current code passing is expected; this is added coverage, with no production defect or source fix claimed. The earlier artificial mutation remains attributed private design effectiveness evidence and was not repeated during implementation.
- Precommit byte/mode comparison of all 745 original tracked files found only the admitted test changed. The original ASCII assertions and setup inputs, exact CLI subprocess helper and unrelated test bodies are preserved. Maintained source and the POSIX count remain 16,984 lines across 41 files, zero production growth, with the original roots, physical algorithm, 20,890 baseline and caps intact. README, dependencies, workflows, mission and plans remain unchanged.
- The quick compliance gate passed once. The initial resume attempt failed in a private recorder environment at a tsx IPC socket using a long temporary path. One explicitly authorized environment correction preserved ordinary OS temporary paths; the corrected resume passed. Both attempts remain recorded, without a product-defect claim or repetition of the passed quick gate.
- These observations precede the implementation commit. The unchanged committed-head strict/build/full floor, Root's independent floor, fresh complete publication review including corrected prior-201 metadata, current CI, delivery and factual closeout remain pending. This note will not be updated after the implementation verification floor; later delivery facts belong in a subsequent factual closeout. Parent 184 remains active and the six-day run is incomplete.

- The implementation source-parser harness found zero note-specific diagnostics. Its separate missing-Outcome fixture produced exactly `release_note.missing_section`, then restored the fixture bytes. The two legitimate active-plan advisories remain recorded; no warning waiver or plan closure is claimed. The fixture used an exact copy of the existing evidence README, which remains unchanged in the worktree.
