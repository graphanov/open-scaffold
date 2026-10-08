# Release / Evidence Note: 191-evidence-pending-token

## Summary

The core diagnostic, shell verifier and changed-evidence workflow now match the standalone word `pending` case-insensitively with ASCII word boundaries. Embedded identifiers such as `pending_gates` and `pending_gate_ids`, and unrelated words such as `depending`, no longer trigger it. The closure-evidence gate and diagnostic code, message, severity and path are unchanged.

## Traceability

- Task: plan 191, found during actual plan 189 closeout.
- Plan: `.osc/plans/active/191-evidence-pending-token.md`.
- Run packet: N/A — native Codex source maintenance under the six-day owner delegation; no osc runtime adapter dispatch.
- Branch: `codex/john-evidence-pending-token`; no PR for this slice yet.

## Verification

### Initial source candidate

- Before the source fix, `npm test -- tests/validation.test.ts` failed on six embedded-token cases. The tests were added first and the source still matched the accepted base. Standalone, mixed-case, punctuation and no-closure controls passed. Failed output is retained privately.
- Before the source fix, `npm test -- tests/section-parser.test.ts` passed 31 of 32 tests and rejected the extra `release_note.pending_after_close` row in plan 189's note. That reproduced the actual closeout failure without changing fixtures or goldens.
- After the source fix, `npm test -- tests/validation.test.ts tests/section-parser.test.ts tests/framework-cleanup-metric.test.ts` passed: 4 test files, 92 tests. Coverage retains all four closure-marker forms and exact diagnostic metadata.
- Full local verification passed: `./verify.sh --strict` reported 8 pass, 0 fail and 19 warnings; `npm run build` passed both builds; `npm test` passed 56 files and 865 tests. Strict retains 18 historical intent warnings and its unchanged shell heuristic warning on plan 189's note; that shell checker is outside this source fix.
- Maintained source remains 16,865 lines across 41 files under the unchanged 16,866-line/41-file cap. Only the three admitted paths changed; plan intent, parser fixtures/goldens and README are unchanged, and the removed SVG remains absent.
- Committed-head verification and fresh independent review are not yet observed at this note-writing step.

## Outcome

The repaired predicates and executable regressions pass the worker precommit checks below. Root independent verification, fresh Overwatch review of the repaired committed head, GitHub CI and publication are not observed by this note. Plans 191 and six-day parent 184 stay active.

## Follow-up

- Freeze the committed candidate and obtain fresh committed-head verification and independent review before publication.

## Initial candidate review and scoped repair

The first candidate `795d965489f1e9c5204968820be1220c93e4b2be` is retained unpublished. Its worker ran strict/build/all 865 tests sequentially on that unchanged committed head. Strict recorded 8 pass, 0 fail and 19 warnings: 18 historical intent warnings plus the unchanged shell substring warning. This is worker verification, not Root independent verification or public delivery.

Fresh Overwatch found the core fix correct: 88 independent controls and 92 focused tests passed, with only the intended live diagnostic removed. Review returned REVISE because the shell verifier and GitHub changed-evidence checker still used substring matching. The exact workflow Python block rejected the actual two-note publication set with exit 1; 86 real-shell/extracted-CI controls confirmed the same identifier collision while retaining genuine warning cases. No GitHub action was attempted.

Supported amendment 1 adds the two remaining verifier predicates and executable tests under a new exact repair admission. The initial lease is released with no public effect. Earlier source, tests, failed attempts and review remain preserved. New repair verification and independent review are still required.


## Repair verification

- Amendment 1 retains the accepted core fix and admits exactly `verify.sh`, `.github/workflows/evidence-validate.yml`, `tests/verify-help.test.ts`, `tests/github-actions-workflows.test.ts` and this evidence note after base `bee6fba3e17266cc35aef7643895dd2859427458`.
- Failing-first integration tests ran the real shell copy and the Python checker extracted from the actual workflow while both predicates and core source/tests still matched the accepted base. `npm test -- tests/verify-help.test.ts tests/github-actions-workflows.test.ts` produced 27 expected failures and 160 passes: 13 embedded cases in each surface and the actual 189/191 publication-note case failed; genuine standalone, mixed-case, punctuation, no-closure and unrelated controls passed.
- The repair changes one predicate in each verifier. Shell uses portable extended-regex ASCII boundaries under command-local `LC_ALL=C`; Python uses case-insensitive ASCII word boundaries. Existing closure patterns, warning/failure behavior, section checks, workflow triggers, permissions, checkout and check identity are unchanged. This remains a lexical heuristic over the existing whole-note checks.
- Targeted worker checks passed: `npm test -- tests/verify-help.test.ts tests/github-actions-workflows.test.ts tests/validation.test.ts tests/section-parser.test.ts tests/framework-cleanup-metric.test.ts` — 279 tests / 6 files. The real shell controls ran in `C` and the available `en_US.UTF-8` locale.
- Replay of the retained independent fixtures passed all 86 shell/extracted-CI controls and all 88 original source controls, including unchanged unrelated live diagnostics. The old candidate's exact two publication notes still reproduce exit 1 with its original checker; the repaired extracted checker accepts the identical notes with exit 0, and the repaired real shell has no target warning. These are local replays, not GitHub CI or a new independent review.
- Worker precommit floor: `./verify.sh --strict` — 9 pass / 0 fail / 18 historical intent warnings; `npm run build` — both builds pass; `npm test` — 1,041 tests / 56 files pass. The first full attempt had 1,039 passes and two scratch-environment failures: intentionally non-Git fixtures discovered an outer Git checkout. The two affected tests then passed (18 tests), followed by the complete passing run using command-local temporary-directory and Git-discovery isolation. The failed output and versioned local test-environment amendment are retained privately.
- An initial resume attempt exceeded macOS's Unix-socket path limit with the long private temporary path. The normal runtime replay passed with the shorter admitted temporary path. The quick gate passed; all attempted commands and discarded local workaround evidence are retained privately.
- Maintained source is unchanged at 16,865 lines / 41 files under the unchanged 16,866 / 41 cap. Core source/tests, parser fixtures/goldens, immutable parent plan/amendment and exact README restoration match the repair base; SVG remains absent. Only the five repair paths change.
- These are worker precommit results. New unchanged committed-head strict/build/full verification and its native receipt follow the commit; Root independent floor and fresh Overwatch review remain required before public effects. The native helper checks envelope/lease/evidence bindings and does not establish provider capacity or sandboxing. Actual inherited model remains unreported.
