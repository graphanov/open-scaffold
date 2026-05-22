# 093 — PR #89 Public-Surface Sync

Date: 2026-05-22
Plan: `.osc/plans/done/093-pr89-public-surface-sync.md`
Branch: `release/pr89-public-surface-sync`
Package version: `open-scaffold@0.4.13`
Release: `https://github.com/graphanov/open-scaffold/releases/tag/v0.4.13`

## Summary

Published `open-scaffold@0.4.13` and aligned the public npm / `npx` surface plus GitHub Latest Release with the PR #89 evolution-loop visibility work.

PR #89 landed on `main` after `open-scaffold@0.4.12` had already been published and after GitHub Release `v0.4.12` had been marked Latest. PR #90 prepared the patch release-sync candidate, then the owner approved follow-through.

## Traceability

- Source feature slice: PR #89 — `Make evolution loop comparison visible`
- Source feature evidence: `.osc/releases/2026-05-22-092-evolution-loop-visibility-v1.md`
- Release-sync PR: `https://github.com/graphanov/open-scaffold/pull/90`
- PR #90 merge commit: `a5ee3b6bb7039a4862b0518ce6b6f5019b483f54`
- Trusted publishing workflow: `https://github.com/graphanov/open-scaffold/actions/runs/26298500793`
- GitHub Release: `https://github.com/graphanov/open-scaffold/releases/tag/v0.4.13`

## Outcome

Public surfaces are aligned:

- `package.json` on `main`: `0.4.13`
- npm registry: `open-scaffold@0.4.13`
- npm `latest` dist-tag: `0.4.13`
- GitHub Latest Release: `v0.4.13 — Evolution loop comparison visibility`
- Fresh isolated-cache `npx open-scaffold@latest --help`: passed
- Fresh isolated-cache `npx open-scaffold@latest evolve --help`: passed
- Fresh isolated-cache `npx open-scaffold@latest init --tier min`: passed

Plan `093` was moved to `done/` only after the registry, `npx`, and GitHub Release surfaces were verified.

## What changed

- `package.json`
  - Bumped from `0.4.12` to `0.4.13`.
- `package-lock.json`
  - Aligned package/root version metadata to `0.4.13`.
- `.osc/plans/done/093-pr89-public-surface-sync.md`
  - Archived the release-sync plan after public-surface proof.
- `.osc/releases/2026-05-22-093-pr89-public-surface-sync.md`
  - Updated this evidence note with final npm, `npx`, and GitHub Release proof.
- `MISSION.md`
  - Changelog stamped by `close.sh`.

## Boundary

This release did not add:

- runtime adapters;
- native spawning;
- model ranking;
- compliance certification;
- approval automation.

Open Scaffold core remains runtime-neutral and non-spawning.

## Verification

PR #90 candidate verification:

```text
git diff --check
./verify.sh --strict
npm test -- --run tests/evolution.test.ts tests/cli-evolution.test.ts
npm test -- --run
npm run build
npm pack --dry-run --json
npm publish --dry-run
```

Results before merge:

```text
./verify.sh --strict — 10 pass, 0 fail, 0 warn
Targeted evolution tests — 2 files / 28 tests passed
Full tests — 32 files / 292 tests passed
npm pack --dry-run --json — open-scaffold-0.4.13.tgz, 107 files
npm publish --dry-run — + open-scaffold@0.4.13
CI — success
Codex latest-head review — no major issues; 0 unresolved current review threads
```

Post-merge local publish gates from `main`:

```text
git diff --check
./verify.sh --strict — 10 pass, 0 fail, 0 warn
npm test -- --run — 32 files / 292 tests passed
npm run build — passed
npm pack --dry-run --json — open-scaffold-0.4.13.tgz, 107 files
npm publish --dry-run — + open-scaffold@0.4.13
```

Dry-run package payload proof:

```text
filename open-scaffold-0.4.13.tgz
version 0.4.13
files 107
docs/examples/evolution-loop-compare.md YES
docs/EVOLUTION_LOOP.md YES
dist/evolution.js YES
dist/cli.js YES
forbidden .osc/plans/done/ 0
forbidden .osc/plans/backlog/ 0
forbidden .osc/runs/ 0
forbidden .osc/research/ 0
forbidden .osc-dev/ 0
forbidden .git/ 0
forbidden node_modules/ 0
```

Trusted publishing:

```text
workflow: publish-npm.yml
run: 26298500793
head: a5ee3b6bb7039a4862b0518ce6b6f5019b483f54
conclusion: success
```

npm registry proof:

```text
version: 0.4.13
dist-tags.latest: 0.4.13
0.4.13 publish time: 2026-05-22T16:05:46.588Z
```

Fresh `npx` proof:

```text
npx --yes open-scaffold@latest --help — passed
npx --yes open-scaffold@latest evolve --help — passed
npx --yes open-scaffold@latest init --tier min --target <tmp> — generated expected min-tier files
```

GitHub Release proof:

```text
tag: v0.4.13
name: v0.4.13 — Evolution loop comparison visibility
target: a5ee3b6bb7039a4862b0518ce6b6f5019b483f54
published: 2026-05-22T16:12:09Z
latest: yes
url: https://github.com/graphanov/open-scaffold/releases/tag/v0.4.13
```

## Remaining gates

No public package/release gates remain for this slice.

The only remaining hygiene gate is merging the closeout PR that moves plan `093` to `done/` and records this final evidence on `main`.
