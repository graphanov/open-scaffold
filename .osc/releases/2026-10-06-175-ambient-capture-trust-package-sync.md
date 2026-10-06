# Release / Evidence Note: 175-ambient-capture-trust-package-sync

## Summary

Reconciled the historical 0.34.0 release-preparation record using observed merged-PR, npm, and GitHub Release facts on 2026-10-06. The June preparation is complete and the published package remains the current live release; the October source is a later candidate.

## Traceability

- Roadmap / issue / task: issue #239; maintenance plan 180.
- Plan: `.osc/plans/done/175-ambient-capture-trust-package-sync.md`.
- Run ID / run packet: N/A; read-only reconciliation of existing publication facts.
- Branch / PR: historical preparation https://github.com/graphanov/open-scaffold/pull/240; reconciliation branch `codex/revive-open-scaffold`.

## Verification

- `gh pr list --state merged --search 0.34.0` — PASS: PR #240 merged 2026-06-28T18:51:55Z from the intended forge branch.
- `npm view open-scaffold@0.34.0 version --json` — PASS: 0.34.0 exists.
- `gh release view 0.34.0` — PASS: release published 2026-06-28T19:11:13Z.
- Historical version/change scope and verification are retained in `.osc/releases/2026-06-28-175-ambient-capture-trust-package-sync.md` and PR #240.
- Existing package and docs now describe 0.35.0 preparation; the original 0.34.0 version criterion is evaluated against its historical preparation, not the later source version.

## Outcome

The preparation and 0.34.0 publication are complete. This reconciliation performs no package publication, release/tag mutation, or workflow dispatch. The current maintenance update awaits its separate owner merge review.

## Follow-up

- Plan 182 tracks explicit owner-gated 0.35.0 publication; it remains incomplete.
