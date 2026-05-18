# Release / Evidence Note: 050-npm-publish-and-npx-init

## Summary

Reconciles plan 050 with live package truth. The initial npm publish blocker is stale: `open-scaffold@0.4.1` is published, npm `latest` points to `0.4.1`, and `npx open-scaffold@latest init --tier min --target <tmp>` succeeds. This slice records the evidence, adds missing package metadata locally, closes plan 050 as superseded by live evidence, and creates a narrow follow-up for remaining package/public-surface sync.

## Traceability

- Roadmap / issue / task: Open Scaffold v2 Opus action map OS-V2-01; no public GitHub issue yet.
- Plan: `.osc/plans/done/050-npm-publish-and-npx-init.md`.
- Amendment: `.osc/plans/done/050-npm-publish-and-npx-init-amendment-1.md`.
- Follow-up plan: `.osc/plans/backlog/074-package-public-surface-sync.md`.
- Run ID / run packet: `N/A` — package/evidence/plan reconciliation slice, no runtime run packet.
- Branch / PR: `release/package-truth-sync`; PR pending owner approval.

## Verification

- `git status --short --branch` before work — clean `main` behind `origin/main` by one commit; fast-forwarded to `f7a8d5a`.
- `gh pr list --repo graphanov/open-scaffold --state open --json number,title,headRefName,baseRefName,url` — `[]`.
- `./verify.sh --quick --quiet` — pass before mutation.
- `npm view open-scaffold version time dist-tags --json` — `version: 0.4.1`, `dist-tags.latest: 0.4.1`; published versions `0.4.0` and `0.4.1` present on 2026-05-17.
- `npm view open-scaffold --json` — package exists; live metadata before this PR has `description` and `license`, but no `repository`, `homepage`, or `keywords`.
- `gh release view v0.4.1 --repo graphanov/open-scaffold` and `gh release list` — `v0.4.1 — First-run adoption hardening` exists and is the Latest GitHub Release.
- `npx --yes open-scaffold@latest --help` — pass; public latest exposes init/status/run/audit/eval/runtime commands, but not current-main lifecycle helpers (`plan new`, `plan move`, `amend`, `evidence new`, `close`).
- `npx --yes open-scaffold@latest init --tier min --target <tmp>` — pass; generated 13 min-tier files.
- Generated min scaffold `./verify.sh --standard` — expected mission-gate failure because `MISSION.md` still contains `<!-- mission:unset -->`; this corrects the original plan's over-strong immediate-verify criterion.
- `npm run build` — pass.
- `node dist/cli.js --help` — pass; local current-main help includes lifecycle helpers not present in npm latest.
- Final `git diff --check` — pass.
- Final `./verify.sh --strict` — 10 pass / 0 fail / 0 warn; 85 plan files.
- Final `npm test -- --run` — 22 files / 187 tests passed.
- Final `npm run build` — pass.
- Final `npm pack --dry-run --json` — pass; local tarball has 84 files, package size 162053 bytes, unpacked size 550333 bytes, no `.osc-dev/`, `.osc/research/`, `.osc/runs/`, `.osc/plans/done/`, `.osc/plans/backlog/`, `.git/`, or `node_modules/` paths. The size is above plan 050's old sub-100KB target, so plan 074 carries the future footprint-budget decision.
- Final `npx --yes open-scaffold@latest init --tier min --target <tmp>` — pass; generated 13 min-tier files.
- Final local built CLI help smoke, `node dist/cli.js --help` — pass.
- Tarball scan — `packages/runtime-omx/` is not shipped in the root package while 10 shipped docs reference `packages/runtime-omx`; captured as follow-up plan 074 rather than changing runtime distribution in this PR.

## Outcome

- Plan 050 no longer represents a true blocker: initial npm publication already happened.
- `package.json` now includes repository, homepage, bugs, and keywords so the next owner-approved publish can expose complete npm metadata.
- Plan 050 is closed as a truth-reconciliation slice with amendment evidence rather than being executed as a first-publish slice.
- Remaining package/public-surface drift is represented by plan 074, not hidden in stale plan 050.
- No npm publish, merge, GitHub Release change, OMO/OMX runtime roadmap change, docs compression, brownfield init, wizard/linter, dashboard, task database, registry, or evidence-chain feature work was performed.

## Follow-up

- Execute `.osc/plans/backlog/074-package-public-surface-sync.md` when the owner wants the next package release/public-surface sync.
- Owner approval is still required before any `npm publish`, merge, or GitHub Release update.
