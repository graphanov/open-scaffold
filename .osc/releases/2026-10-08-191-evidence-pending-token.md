# Release / Evidence Note: 191-evidence-pending-token

## Summary

The unfinished-work diagnostic now matches the standalone word `pending` case-insensitively. Embedded identifiers such as `pending_gates` and `pending_gate_ids`, and unrelated words such as `depending`, no longer trigger it. The closure-evidence gate and diagnostic code, message, severity and path are unchanged.

## Traceability

- Task: plan 191, found during actual plan 189 closeout.
- Plan: `.osc/plans/active/191-evidence-pending-token.md`.
- Run packet: N/A — native Codex source maintenance under the six-day owner delegation; no osc runtime adapter dispatch.
- Branch: `codex/john-evidence-pending-token`; no PR for this slice yet.

## Verification

- Before the source fix, `npm test -- tests/validation.test.ts` failed on six embedded-token cases. The tests were added first and the source still matched the accepted base. Standalone, mixed-case, punctuation and no-closure controls passed. Failed output is retained privately.
- Before the source fix, `npm test -- tests/section-parser.test.ts` passed 31 of 32 tests and rejected the extra `release_note.pending_after_close` row in plan 189's note. That reproduced the actual closeout failure without changing fixtures or goldens.
- After the source fix, `npm test -- tests/validation.test.ts tests/section-parser.test.ts tests/framework-cleanup-metric.test.ts` passed: 4 test files, 92 tests. Coverage retains all four closure-marker forms and exact diagnostic metadata.
- Full local verification passed: `./verify.sh --strict` reported 8 pass, 0 fail and 19 warnings; `npm run build` passed both builds; `npm test` passed 56 files and 865 tests. Strict retains 18 historical intent warnings and its unchanged shell heuristic warning on plan 189's note; that shell checker is outside this source fix.
- Maintained source remains 16,865 lines across 41 files under the unchanged 16,866-line/41-file cap. Only the three admitted paths changed; plan intent, parser fixtures/goldens and README are unchanged, and the removed SVG remains absent.
- Committed-head verification and fresh independent review are not yet observed at this note-writing step.

## Outcome

The narrow source fix and regression tests pass focused and full local verification. Publication and independent review are not observed by this note. Six-day parent 184 stays active.

## Follow-up

- Freeze the committed candidate and obtain fresh committed-head verification and independent review before publication.

## Initial candidate review and scoped repair

The first candidate `795d965489f1e9c5204968820be1220c93e4b2be` is retained unpublished. Its worker ran strict/build/all 865 tests sequentially on that unchanged committed head. Strict recorded 8 pass, 0 fail and 19 warnings: 18 historical intent warnings plus the unchanged shell substring warning. This is worker verification, not Root independent verification or public delivery.

Fresh Overwatch found the core fix correct: 88 independent controls and 92 focused tests passed, with only the intended live diagnostic removed. Review returned REVISE because the shell verifier and GitHub changed-evidence checker still used substring matching. The exact workflow Python block rejected the actual two-note publication set with exit 1; 86 real-shell/extracted-CI controls confirmed the same identifier collision while retaining genuine warning cases. No GitHub action was attempted.

Supported amendment 1 adds the two remaining verifier predicates and executable tests under a new exact repair admission. The initial lease is released with no public effect. Earlier source, tests, failed attempts and review remain preserved. New repair verification and independent review are still required.
