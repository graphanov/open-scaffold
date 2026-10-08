# Release / Evidence Note: 186-ambient-token-availability

## Summary

Captured handoffs preserve missing token measurements as unavailable, explicit zero as zero, and complete authoritative totals. John Maintainer corroborated the prepared defect, Forge implemented four scoped files, Overwatch independently reviewed the unchanged committed candidate, and the controller published and merged verified PR287.

## Traceability

- Roadmap / issue / task: https://github.com/graphanov/open-scaffold/issues/286 (closed by PR287).
- Plan: `.osc/plans/done/186-ambient-token-availability.md`.
- Run ID / run packet: `john-open-scaffold-six-day-20261008`, native task186; private operational receipts retained separately.
- Branch / PR: `codex/john-six-day-maintenance`, https://github.com/graphanov/open-scaffold/pull/287.

## Verification

- Exact candidate: `46e2169f2f529dfc0258bcb3c08106404f2c7bc2`; only `src/capture.ts`, `src/ambient.ts`, `tests/capture.test.ts`, `docs/CAPTURE.md` changed after accepted task base.
- Targeted capture:82 tests passed; full suite:56 files /770 tests passed. Complete Claude/Codex fixture totals remain18070/5750.
- `./verify.sh --strict`:9 pass,0 fail,18 historical warnings; scaffold verification and both builds passed.
- Maintained source16865 against unchanged16866 cap. Initial1517606 candidate exceeded that cap; failure and subsequent same-scope refactor preserved privately.
- Fresh independent Overwatch:110 tests and294 additional cases passed; exact head/source hashes clean before/after. Full publication-scope supplement confirmed immutable intent and corpus outcome parity.
- Controller separately verified all required checks on the same candidate before publication reservation; external draft readback observed and lease released.
- GitHub CI, structural, evidence and changed-plan checks succeeded on the exact candidate; two optional mirror jobs skipped.
- PR287 MERGED at2026-10-08T00:53:29Z as`6140a7bb1d40ecd226e7dcce07bbd6a49c613f16`; issue286 closed. GitHub merge account was`graphanov`, acting under explicit owner development delegation, not a fabricated human review.
- All four default-branch implementation Git blobs matched the tested candidate after merge.

## Outcome

This source repair shipped to GitHub main. Existing captured records were preserved; no npm/package release occurred. Missing runtime/model usage and monetary cost remain unknown. The offline controller guards participating task/publication admission; root separately checked review, exact head/base and CI before merge. No OS sandbox or provider spending-cap guarantee is inferred.

## Follow-up

- Keep six-day parent184 active. Ordinary failed attempts stay in the independent observation record; continue real scoped maintenance and labeled synthetic discussions.
