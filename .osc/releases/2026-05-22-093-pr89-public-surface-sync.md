# 093 — PR #89 Public-Surface Sync Candidate

Date: 2026-05-22
Plan: `.osc/plans/active/093-pr89-public-surface-sync.md`
Branch: `release/pr89-public-surface-sync`
Package candidate: `open-scaffold@0.4.13`
PR: pending

## Summary

Prepared a narrow patch release candidate so the PR #89 evolution-loop visibility work can reach the public npm / `npx` surface after owner approval.

PR #89 landed on `main` after `open-scaffold@0.4.12` had already been published and after GitHub Release `v0.4.12` had been marked Latest. The repository now contains the public walkthrough and acceptance-criteria delta rendering, while the current npm/GitHub Latest surfaces still predate that work.

This branch does not publish npm, create a GitHub Release, mark any release Latest, or archive the plan. Those remain owner-gated follow-through actions after PR review and approval.

## Traceability

- Prior slice: PR #89 — `Make evolution loop comparison visible`
- Prior evidence: `.osc/releases/2026-05-22-092-evolution-loop-visibility-v1.md`
- Current plan: `.osc/plans/active/093-pr89-public-surface-sync.md`
- Package candidate: `0.4.13`
- npm latest before this candidate: `0.4.12`
- GitHub Latest Release before this candidate: `v0.4.12 — README work records and evolution ledgers`

## Outcome

Candidate prepared for review:

- `package.json` version is `0.4.13`.
- `package-lock.json` root package version is `0.4.13`.
- The plan remains active because npm publication, fresh post-publish `npx` proof, GitHub Latest Release alignment, and final evidence are not done yet.
- The dry-run package payload includes the PR #89 public docs and built code surfaces:
  - `docs/examples/evolution-loop-compare.md`
  - `docs/EVOLUTION_LOOP.md`
  - `dist/evolution.js`
  - `dist/cli.js`
- The dry-run payload excludes forbidden private/dogfood/runtime state prefixes:
  - `.osc/plans/done/`
  - `.osc/plans/backlog/`
  - `.osc/runs/`
  - `.osc/research/`
  - `.osc-dev/`
  - `.git/`
  - `node_modules/`

## What changed

- `package.json`
  - Bumped from `0.4.12` to `0.4.13`.
- `package-lock.json`
  - Aligned package/root version metadata to `0.4.13`.
- `.osc/plans/active/093-pr89-public-surface-sync.md`
  - Added active release-sync plan for the owner-gated public-surface follow-through.
- `.osc/releases/2026-05-22-093-pr89-public-surface-sync.md`
  - Added this candidate evidence note.

## Boundary

This candidate does not:

- run real `npm publish`;
- create or edit GitHub Releases;
- mark a GitHub Release as Latest;
- merge the PR;
- archive/finish plan `093`;
- add runtime adapters, native spawning, model ranking, compliance certification, or approval automation.

## Pre-release public baseline

Live registry before this candidate:

```text
npm latest: open-scaffold@0.4.12
npm 0.4.12 publish time: 2026-05-22T11:29:03.625Z
GitHub Latest Release: v0.4.12 — README work records and evolution ledgers
PR #89 merge time: 2026-05-22T15:29:10Z
```

Fresh `npx open-scaffold@latest --help` and `npx open-scaffold@latest evolve --help` still run, but they are the `0.4.12` public package surface and therefore predate this candidate.

## Verification

```text
git diff --check
```

Result: pass.

```text
./verify.sh --strict
```

Result after active-plan wording adjustment:

```text
10 pass, 0 fail, 0 warn
```

```text
npm test -- --run tests/evolution.test.ts tests/cli-evolution.test.ts
```

Result:

```text
Test Files  2 passed (2)
Tests       28 passed (28)
```

```text
npm test -- --run
```

Result:

```text
Test Files  32 passed (32)
Tests       292 passed (292)
```

```text
npm run build
```

Result: `build:core` and `build:runtime-omx` passed.

```text
npm pack --dry-run --json
```

Result:

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

```text
npm publish --dry-run
```

Result:

```text
+ open-scaffold@0.4.13
```

No actual npm publication was performed.

## Remaining owner gates

After PR review and owner approval:

1. Merge the release-sync PR.
2. Run/approve npm Trusted Publishing for `open-scaffold@0.4.13`.
3. Verify registry and fresh isolated-cache `npx open-scaffold@latest` exposes the PR #89 work.
4. Create or update GitHub Release `v0.4.13` and mark it Latest.
5. Update this evidence with final publish/release proof.
6. Archive/finish plan `093` only after the public surfaces are truly aligned.
