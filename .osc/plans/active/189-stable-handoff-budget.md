# Plan: 189-stable-handoff-budget

## Status

active

## Context

John Maintainer's read-only repository triage found that the stable handoff compiler raw-slices text at its supported 600-character minimum. Root independently reproduced the library and source CLI behavior against the committed resume-demo: default text is 1115 characters with navigation and boundary prose; the 600-character output ends in the acceptance checklist, losing the Next actions section, generated commands and boundary prose. The next bounded action still appears in the checklist and the JSON summary stays intact. This is a usability and presentation defect, distinct from the lab compiler repaired in PR 291. No published npm executable was run. Plan 181's verified public delivery is closed before this new source slice begins.

## Goal

Supported compact handoff text retains usable navigation and a complete read-only boundary within its requested character budget, while structured summaries and already-fitting packets remain compatible.

## Constraints / Out of scope

- Preserve the documented 600..20000 range, JSON summary/schema and invocation-aware commands. No package version, dependency, runtime execution, authority or release changes.
- Compact lower-priority body details explicitly; essential navigation and boundary prose must not disappear through an arbitrary final slice.
- If an unusually large command cannot fit, indicate the available structured detail honestly; never output a cut executable command or claim omitted evidence is present.
- Keep the unmodified maintained-source cap at 16866 lines and 41 files, using narrow readable refactoring if needed. No line-golf or unrelated cleanup.
- Owner six-day delegation authorizes routine source development; existing GitHub protection and independent review remain required. Six-day parent 184 stays active.

## Files to touch

- `src/resume.ts` — budget-aware rendering for the stable handoff/resume compiler.
- `tests/resume.test.ts` — meaningful small-budget navigation, bulky/gated/redaction and compatibility cases.
- `.osc/releases/2026-10-08-189-stable-handoff-budget.md` — actual failed-first, verification, review and publication evidence.

## Acceptance criteria

- [ ] At maxChars 600, the committed resume-demo text retains its title, status, selected plan identity, complete Next actions section with at least one full generated command and complete read-only boundary; output length is at most 600.
- [ ] Bulky active-plan, no-plan, gated-run and redaction cases remain bounded and retain essential navigation/boundary structure, with honest detail omission and no truncated executable command or invented approval.
- [ ] JSON summaries and budget validation remain unchanged; packets already fitting their requested budget remain byte-compatible.
- [ ] Only the three scoped paths change after admission, with no maintained-source cap, dependency, schema, API or CLI range changes.
- [ ] Failed-first and passing targeted tests, unchanged committed-head strict/build/full tests, independent full-scope review and current GitHub CI precede publication and delegated merge.

## Verification steps

1. Capture the reduced committed fixture/library/source-CLI failure without claiming published-package execution.
2. Run targeted resume tests with small/adjacent/default budgets and bulky/gated/redaction controls; retain the failed-first attempt.
3. Compare JSON summaries and already-fitting text bytes against the accepted base.
4. Verify ./verify.sh --strict, npm run build, npm test on the unchanged committed candidate; independently inspect full publication metadata as well as source behavior.
5. Read back the actual PR/CI/merge/default-branch effects before closeout.

## Open questions

- None. Root delegates the bounded usability policy above; fresh design/critique must resolve the minimal rendering approach before implementation without expanding source scope.
