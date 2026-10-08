# Plan: 191-evidence-pending-token

## Status

active

## Context

Supported closeout of verified plan 189 exposed a false positive in release diagnostics: the substring matcher treats documented JSON identifiers `pending_gates` and `pending_gate_ids` as an unfinished publication statement when the same note records actual closure. The live diagnostic regression correctly rejected the new warning; its golden must remain unchanged. This is an observed source-validator defect, not a failed delivery or real-user incident.

## Goal

The unfinished-work warning recognizes the standalone word pending without flagging embedded identifiers or unrelated words, while retaining its existing closure-evidence gate and genuine warnings.

## Constraints / Out of scope

- Keep diagnostic code, message, severity, closure-evidence patterns and all unrelated validation behavior unchanged.
- No parser goldens, source-size cap, dependencies, schemas, runtime, authority, README or package publication changes.
- Match standalone tokens case-insensitively; a word followed by ordinary punctuation still counts. This remains a lexical heuristic, not semantic proof of readiness.
- Preserve failed-first and actual closeout evidence. Six-day parent 184 stays active.

## Files to touch

- `src/validation.ts` — narrow only the unfinished-work token predicate.
- `tests/validation.test.ts` — meaningful false-positive and genuine-warning controls.
- `.osc/releases/2026-10-08-191-evidence-pending-token.md` — actual implementation, verification and independent review evidence.

## Acceptance criteria

- [ ] Release notes recording closure and only embedded occurrences such as pending_gates, pending_gate_ids or depending do not produce release_note.pending_after_close.
- [ ] Standalone pending, mixed-case PENDING and punctuation-adjacent pending still produce the same warning when closure evidence exists; absent closure evidence does not trigger it.
- [ ] Live parser diagnostics and historical characterization pass without any fixture/golden edits; all unrelated warning behavior remains unchanged.
- [ ] Only the three admitted paths change after writer admission; maintained source remains within the unchanged 16866-line/41-file cap and the owner's exact README restoration is preserved.
- [ ] Failed-first regression, unchanged committed-head strict/build/full verification and fresh independent review precede public effects.

## Verification steps

1. Reproduce embedded-token false positives and positive standalone/closure controls in focused validation tests before changing source.
2. Run tests/validation.test.ts and tests/section-parser.test.ts; preserve the prior closeout failure and do not update goldens.
3. Inspect source diff and run the maintained-source cap test.
4. Independently verify ./verify.sh --strict, npm run build and npm test on the unchanged committed candidate.
5. Refresh full publication scope, current CI and effect readback before any delegated merge.

## Open questions

- None. Narrow lexical word-boundary behavior is sufficient for this observed identifier collision; richer status semantics require a separate finding and plan.
