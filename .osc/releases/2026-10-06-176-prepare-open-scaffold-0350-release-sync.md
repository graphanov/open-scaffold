# Release / Evidence Note: 176-prepare-open-scaffold-0350-release-sync

## Summary

Reconciled the historical 0.35.0 preparation as complete after confirming PR #248 merged and the source metadata matches the prepared version. npm and GitHub Releases still expose 0.34.0; publication is a separate incomplete backlog plan.

## Traceability

- Roadmap / issue / task: issue #246; maintenance plan 180; follow-through plan 182.
- Plan: `.osc/plans/done/176-prepare-open-scaffold-0350-release-sync.md`.
- Run ID / run packet: N/A; preparation reconciliation and observed package/release queries.
- Branch / PR: https://github.com/graphanov/open-scaffold/pull/248 merged at `38c014b4565549cb677003fc295f063dd845f168`; reconciliation branch `codex/revive-open-scaffold`.

## Verification

- `gh pr view 248` — PASS: merged 2026-07-02T17:33:42Z; merge commit `38c014b4565549cb677003fc295f063dd845f168`.
- package.json and lockfile source version — PASS: 0.35.0 remains aligned.
- `npm view open-scaffold version dist-tags --json` — PASS: latest remains 0.34.0.
- Latest GitHub Release — PASS: tag 0.34.0, published 2026-06-28.
- Preparation scope and its 51-file/631-test verification are retained in `.osc/releases/2026-07-02-176-prepare-open-scaffold-0350-release-sync.md`.
- No npm publish, tag/release creation, settings mutation, or workflow dispatch was performed by this reconciliation.

## Outcome

Preparation is complete; 0.35.0 is not published. Owner merge approval of the new maintenance update and the later publication decision remain separate.

## Follow-up

- `.osc/plans/backlog/182-0350-publication-follow-through.md` owns the publication and live-install evidence gates.
