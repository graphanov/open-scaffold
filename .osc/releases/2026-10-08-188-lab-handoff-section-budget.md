# Release / Evidence Note: 188-lab-handoff-section-budget

## Summary

The exported lab handoff compiler preserves complete required headings at the tested 900-character budget by reducing content before structure. The exact synthetic S03 discovery now passes; the main CLI uses a separate compiler and is unchanged.

## Traceability

- Roadmap / issue / task: https://github.com/graphanov/open-scaffold/issues/289 (closed by PR #291); frozen synthetic S03 intake.
- Plan: `.osc/plans/done/188-lab-handoff-section-budget.md`.
- Run ID / run packet: `john-open-scaffold-six-day-20261008`, native task188; private runtime/failed-first records retained separately.
- Branch / PR: `codex/john-lab-handoff-budget`, https://github.com/graphanov/open-scaffold/pull/291.

## Verification

- Candidate `2aa759cfe95e1a31c247594b6d1a04921d00eca3`: only src/handoff.ts and tests/handoff-compiler.test.ts changed after accepted base.
- Exact reduced 139/260/260 input and initial large 900 case retain all five headings, validation pass and length <=900. Default 349/1563 outputs remain byte-identical.
- Targeted 8 handoff tests, full 800 tests, both builds and strict 9 pass / 0 fail / 18 historical warnings passed on unchanged clean HEAD. Maintained source 16865<=16866; handoff.ts 123 lines.
- Fresh independent Overwatch: 4000 generated cases, exact/adjacent/edge-budget controls, redaction and shared-helper parity and full publication metadata review passed. CLI, resume, shared redaction and dependencies untouched.
- Tiny budgets below 193-character structural minimum retain original requested value and explicitly fail with overBudget=true. No universal helper minimum or nonfinite range contract was invented.
- Controller independently verified the same HEAD before publication; draft readback observed and writer lease released. GitHub four required checks succeeded, two optional mirrors skipped.
- PR #291 merged at 2026-10-08T02:09:15Z as ad7ddc4b245117c064a85b38628ece1751904854; issue #289 closed. Both default-branch implementation blobs matched the candidate. GitHub account graphanov acted under owner delegation, not invented human review.

## Outcome

The bounded lab source repair shipped. Aggressive compaction can still omit or shorten body details; schema validation is structural, not factual completeness. No maintained CLI defect, real contributor/adoption, package release, OS isolation or provider-cap claim is made. Actual models/per-task cost remain unreported.

## Follow-up

- Keep six-day parent 184 active. Prepare preregistered plan 181 fixture/driver with integrity/parity/settings preflight before any comparison invocation; production tests are not comparison proof.
