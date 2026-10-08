# Plan: 194-viewer-reference-labels

## Status

done

## Context

Independent delivery audit for plan 192 found two remaining prose references to the replaced 60-second viewer: OPEN_SCAFFOLD_SYSTEM.md and downstream-walkthrough.md. Their links still reach EXAMPLES, but the descriptions retain an old timing label; the downstream text also calls it the loop on Open Scaffold itself, while the current viewer reads a synthetic greeting-project snapshot. The actual primary viewer and its index navigation are delivered. This is a separate small description correction, not a reopened claim that all references were already repaired.

## Goal

Both remaining reader-path references accurately describe and reach the current linked synthetic work-record viewer.

## Constraints / Out of scope

- Only change the two existing viewer referral sentences and their target fragment if useful; preserve the rest of each document.
- Keep the root README, assets, fixture data, CLI/core, dependencies, source-size metric and frozen John definitions unchanged.
- Describe the recorded synthetic example without a timing claim or current implementation/adoption certification.
- No new phrase-only tests or general documentation-link engine for this reversible prose change. Existing meaningful viewer coverage and independent target inspection provide verification.
- Six-day parent 184 remains active. The separate close-link prototype is read-only and unadmitted.

## Files to touch

- `docs/OPEN_SCAFFOLD_SYSTEM.md` — the reader-path viewer referral.
- `docs/examples/downstream-walkthrough.md` — the Where to go next viewer referral.
- `.osc/releases/2026-10-08-194-viewer-reference-labels.md` — actual finding, checks and independent review evidence.

## Acceptance criteria

- [x] The two existing referrals name the current synthetic linked-record viewer and resolve to its actual EXAMPLES file/heading. | Evidence: .osc/releases/2026-10-08-194-viewer-reference-labels.md
- [x] Neither referral promises a timed read or describes the greeting snapshot as current Open Scaffold implementation proof. | Evidence: .osc/releases/2026-10-08-194-viewer-reference-labels.md
- [x] Only the three admitted paths change after admission; no fixture/core/rootREADME/asset/dependency/cap or unrelated prose changes occur. | Evidence: .osc/releases/2026-10-08-194-viewer-reference-labels.md
- [x] Existing viewer/parser checks, unchanged committed-head strict/build/full verification and fresh independent full-publication review precede public effects; current GitHub CI precedes delegated merge. | Evidence: .osc/releases/2026-10-08-194-viewer-reference-labels.md

## Verification steps

1. Inspect the exact old referral lines and current target heading, preserving the observed mismatch.
2. Read both repaired relative Markdown targets and the viewer's actual record scope.
3. Run existing first-run-docs and section-parser checks; inspect the exact diff and source-size invariant.
4. Independently verify ./verify.sh --strict, npm run build and npm test on the unchanged committed candidate; obtain fresh review and actual GitHub CI before merge.
5. Read back actual publication/default-branch effects before closeout.

## Open questions

- None. The delivered viewer and actual audit establish the correction's wording and scope.
