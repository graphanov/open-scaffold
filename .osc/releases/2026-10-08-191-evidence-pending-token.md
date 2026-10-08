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
