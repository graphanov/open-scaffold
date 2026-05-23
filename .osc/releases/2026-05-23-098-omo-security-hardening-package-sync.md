# 098 — OmO Security Hardening Package Sync

Date: 2026-05-23
Plan: `.osc/plans/active/098-omo-security-hardening-package-sync.md`
Candidate package version: `open-scaffold@0.4.18`
Release target: `v0.4.18`

## Summary

PR #103 added release/security posture hardening to `main`: pinned npm in the trusted publishing job, Dependabot coverage, `SECURITY.md`, package payload inclusion for `SECURITY.md`, optional native dependency guidance, and runtime/cockpit trust-boundary wording.

That work reached `main` after `open-scaffold@0.4.17` and GitHub Release `v0.4.17` were already public latest surfaces. The local package candidate now includes `SECURITY.md`, but the already-published `open-scaffold@0.4.17` npm tarball does not. Because npm versions are immutable, `0.4.18` is the next narrow package-sync candidate.

## Traceability

- Source hardening PR: https://github.com/graphanov/open-scaffold/pull/103
- Source hardening plan: `.osc/plans/done/097-omo-security-hardening.md`
- Source hardening evidence: `.osc/runs/omo-security-research-20260523T205502Z/hermes-verified-report.md`
- Source hardening merge commit: `8b88c1bb44a26057012daf6cac248dbb3414dfc5`
- Release-sync plan: `.osc/plans/active/098-omo-security-hardening-package-sync.md`
- Release-sync branch: `release/098-omo-security-hardening-package-sync`
- Release-sync PR: to be recorded after branch publication
- Trusted publishing run: to be recorded after owner-approved merge and workflow dispatch
- GitHub Release: to be recorded after owner-approved release creation/update

## Pre-release drift baseline

Observed after PR #103 reached `main` and before this release-sync candidate:

```text
repo main package.json: 0.4.17
npm latest: 0.4.17
GitHub Latest Release: v0.4.17 — Glass cockpit webhooks
local repo npm pack --dry-run --json: includes SECURITY.md
open-scaffold@latest npm tarball: no package/SECURITY.md entry
```

## Candidate changes

- `package.json`
  - Candidate version: `0.4.18`.
- `package-lock.json`
  - Candidate root package version aligned to `0.4.18`.
- `.osc/plans/active/098-omo-security-hardening-package-sync.md`
  - Tracks release-sync acceptance criteria until final public proof exists.
- `.osc/releases/2026-05-23-098-omo-security-hardening-package-sync.md`
  - This evidence note.

## Outcome

Candidate prepared for review. Final npm latest, fresh public package payload proof, GitHub Latest Release alignment, and plan closeout remain owner-gated follow-through after PR review/merge.

## Verification

Candidate-prep verification from `release/098-omo-security-hardening-package-sync`:

```text
git diff --check — passed
./verify.sh --strict — 10 pass, 0 fail, 0 warn
npm test -- tests/package-payload.test.ts --reporter=verbose — 1 file / 2 tests passed
npm test -- --reporter=verbose — 35 files / 326 tests passed
npm run build — passed, core and runtime-omx TypeScript builds
npm pack --dry-run --json — open-scaffold-0.4.18.tgz, 124 files, SECURITY.md included, active plans excluded, .osc/releases payload limited to README.md
npm publish --dry-run — + open-scaffold@0.4.18
```

Expected final public-surface verification after owner-approved merge/publish/release:

```text
trusted publishing run <id> — success
npm latest — 0.4.18
fresh isolated-cache open-scaffold@latest tarball inspection — package/SECURITY.md present
GitHub Release v0.4.18 — Latest
```

## Remaining gates

- PR creation, CI, Codex latest-head review, and unresolved-thread check.
- Owner merge gate.
- Owner-gated trusted npm publishing.
- Fresh public package payload verification.
- Owner-gated GitHub Latest Release alignment.
- Final plan closeout only after the public surfaces are real.
