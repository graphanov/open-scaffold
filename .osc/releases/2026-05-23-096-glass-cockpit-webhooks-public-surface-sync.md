# 096 — Glass Cockpit Webhooks Public-Surface Sync

Date: 2026-05-23
Plan: `.osc/plans/active/096-glass-cockpit-webhooks-public-surface-sync.md`
Candidate package version: `open-scaffold@0.4.17`

## Summary

PR #100 added push-only glass-cockpit webhook commands to repo `main`: `osc cockpit config`, `osc cockpit test`, and `osc cockpit post`. Because `open-scaffold@0.4.16` was already published before that work reached `main`, fresh public `npx open-scaffold@latest cockpit --help` still serves the older package and does not expose the cockpit command.

This release-sync slice prepares `open-scaffold@0.4.17` and records the proof needed to align npm/latest, fresh `npx`, and GitHub Latest Release with the already-reviewed cockpit webhook CLI.

## Traceability

- Source feature slice: PR #100 — `Add glass cockpit webhooks`
- Source feature evidence: `.osc/releases/2026-05-23-062-glass-cockpit-webhooks.md`
- Source feature plan: `.osc/plans/done/062-glass-cockpit-webhooks.md`
- Source feature merge commit: `928c7d7a8013de215261cfbfedc13095774a09cf`
- Release-sync plan: `.osc/plans/active/096-glass-cockpit-webhooks-public-surface-sync.md`
- Release-sync branch: `release/glass-cockpit-webhooks-public-surface-sync`
- Release-sync PR: pending at candidate-prep time
- Trusted publishing run: pending at candidate-prep time
- GitHub Release: pending at candidate-prep time

## Pre-release drift baseline

Observed after PR #100 reached `main` and before this release-sync candidate:

```text
repo main package.json: 0.4.16
npm latest: 0.4.16
GitHub Latest Release: v0.4.16 — Local task database CLI
local repo npm run --silent osc -- cockpit --help: lists osc cockpit config/test/post
fresh isolated-cache npx open-scaffold@latest cockpit --help: exit 2, Unknown command: cockpit
```

## Candidate changes

- `package.json`
  - Candidate version: `0.4.17`.
- `package-lock.json`
  - Candidate root package version aligned to `0.4.17`.
- `.osc/plans/active/096-glass-cockpit-webhooks-public-surface-sync.md`
  - Tracks release-sync acceptance criteria until final public proof exists.
- `.osc/releases/2026-05-23-096-glass-cockpit-webhooks-public-surface-sync.md`
  - This evidence note.

## Outcome

Pending. This candidate is not complete until the release-sync PR is reviewed and merged, trusted npm publishing succeeds, fresh public `npx open-scaffold@latest cockpit --help` exposes the cockpit command, GitHub Release `v0.4.17` is Latest, and the plan is closed with final evidence.

## Verification

Candidate-prep verification from `release/glass-cockpit-webhooks-public-surface-sync`:

```text
git diff --check — passed
./verify.sh --strict — 10 pass, 0 fail, 0 warn
npm test -- tests/cockpit.test.ts tests/package-payload.test.ts --reporter=verbose — 2 files / 14 tests passed
npm test -- --reporter=verbose — 35 files / 326 tests passed
npm run build — passed, core and runtime-omx TypeScript builds
npm run --silent osc -- cockpit --help — passed and listed cockpit config/test/post
npm pack --dry-run --json — open-scaffold-0.4.17.tgz, 123 files, unpackedSize 851406
npm publish --dry-run — + open-scaffold@0.4.17
latest-head Codex review — pending after PR opens
```

Package payload spot-check from `npm pack --dry-run --json`:

```text
dist/cockpit.js YES
dist/cockpit.d.ts YES
.osc/cockpit.example.json YES
dist/cli.js YES
forbidden .osc/plans/active 0
.osc/releases payload .osc/releases/README.md only
```

Final public-surface verification targets:

```text
trusted publishing run — pending
npm latest — pending 0.4.17
fresh isolated-cache npx open-scaffold@latest cockpit --help — pending success
GitHub Release v0.4.17 — pending Latest
```

## Remaining gates

- Release-sync PR review/merge.
- Trusted npm publishing for `open-scaffold@0.4.17`.
- Fresh public `npx` cockpit smoke.
- GitHub Release `v0.4.17` as Latest.
- Final plan closeout after public proof.
- Control Room proof resume remains separate and should start from refreshed selector/current truth after this release-sync completes.
