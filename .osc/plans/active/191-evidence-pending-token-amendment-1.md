# Amendment 1: 191-evidence-pending-token

## Parent

191-evidence-pending-token

## Date

2026-10-08

## Learning

The first candidate narrowed the core validator and passed its regressions, but independent review found the identical substring rule in the shell verifier and changed-evidence GitHub workflow. The exact workflow Python block exits 1 on the actual changed notes. The shell verifier retains the false warning. The original three-path admission therefore missed public verification surfaces; retain candidate 795d965 and its worker tests/rejected review rather than publishing a partial repair.

## New direction

Keep the original lexical goal and core fix. Apply the same standalone-token policy to the shell verifier and changed-evidence workflow, retaining their genuine stale-work checks and all unrelated behavior.

The next bounded repair may change only:

- `verify.sh` — narrow the one unfinished-work token predicate.
- `.github/workflows/evidence-validate.yml` — narrow only the same predicate in its existing Python checker; preserve triggers, permissions, checkout, required sections, closure markers, check identity and failure behavior.
- `tests/verify-help.test.ts` — execute the real shell verifier on negative and positive note fixtures.
- `tests/github-actions-workflows.test.ts` — execute the actual extracted changed-note checker on negative and positive fixtures, including the actual publication notes.
- `.osc/releases/2026-10-08-191-evidence-pending-token.md` — distinguish the rejected initial candidate, repair checks and subsequent independent review.

No further core source/test edits, golden changes, package/dependency changes, protection administration or broader workflow refactor. The original implementation and full publication metadata remain visible for fresh review.

## Impact on acceptance criteria

Criterion 1 applies to all three existing verifier surfaces. Criterion 2 retains real standalone-word warnings and original closure-evidence gates in all three surfaces. Criterion 3 retains unchanged live/historical parser fixtures and unrelated diagnostics.

Criterion 4 is superseded with: only the original three paths changed after the first admission; only the five repair paths above may change after the new accepted base and exact native lease. Maintain the unchanged source cap and exact README restoration.

Criterion 5 remains, with new unchanged committed-head strict/build/full verification and fresh independent full publication review after the repair. Replay the rejected workflow case and original source controls; do not treat worker checks or a local CI script as actual GitHub CI.
