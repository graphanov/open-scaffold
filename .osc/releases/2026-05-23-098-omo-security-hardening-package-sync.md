# 098 — OmO Security Hardening Package Sync

Date: 2026-05-23
Plan: `.osc/plans/done/098-omo-security-hardening-package-sync.md`
Final package version: `open-scaffold@0.4.18`
Release: https://github.com/graphanov/open-scaffold/releases/tag/v0.4.18

## Summary

PR #103 added release/security posture hardening to `main`: pinned npm in the trusted publishing job, Dependabot coverage, `SECURITY.md`, package payload inclusion for `SECURITY.md`, optional native dependency guidance, and runtime/cockpit trust-boundary wording.

That work reached `main` after `open-scaffold@0.4.17` and GitHub Release `v0.4.17` were already public latest surfaces. The already-published `open-scaffold@0.4.17` npm tarball could not be republished with the new `SECURITY.md` payload, so PR #105 prepared and merged the narrow `0.4.18` package-sync candidate.

## Traceability

- Source hardening PR: https://github.com/graphanov/open-scaffold/pull/103
- Source hardening plan: `.osc/plans/done/097-omo-security-hardening.md`
- Source hardening evidence: `.osc/runs/omo-security-research-20260523T205502Z/hermes-verified-report.md`
- Source hardening merge commit: `8b88c1bb44a26057012daf6cac248dbb3414dfc5`
- Release-sync plan: `.osc/plans/done/098-omo-security-hardening-package-sync.md`
- Release-sync branch: `release/098-omo-security-hardening-package-sync`
- Release-sync PR: https://github.com/graphanov/open-scaffold/pull/105
- Release-sync merge commit: `489a8eec6b7816673cf7d452edc7c93e6d5571ed`
- Trusted publishing run: https://github.com/graphanov/open-scaffold/actions/runs/26344810839
- GitHub Release: https://github.com/graphanov/open-scaffold/releases/tag/v0.4.18

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
  - Tracked release-sync acceptance criteria until final public proof existed.
- `.osc/releases/2026-05-23-098-omo-security-hardening-package-sync.md`
  - This evidence note.

## Outcome

Completed. `open-scaffold@0.4.18` is published on npm as `latest`, the fresh public tarball includes `SECURITY.md`, fresh isolated-cache `npx` smokes pass, GitHub Release `v0.4.18 — Security posture and dependency maintenance` is marked Latest, and plan `098` has been moved to `done/` for closeout.

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
PR #105 CI — success
PR #105 Codex — clean comment at 2026-05-23T21:50:54Z, zero unresolved current review threads
```

Post-merge publish verification from `main`:

```text
git diff --check — passed
./verify.sh --strict — 10 pass, 0 fail, 0 warn
npm test -- --run — 35 files / 326 tests passed
npm run build — passed
npm pack --dry-run --json — open-scaffold-0.4.18.tgz, 124 files, SECURITY.md included, active plans excluded
npm publish --dry-run — + open-scaffold@0.4.18
trusted publishing run 26344810839 — success, published open-scaffold@0.4.18
npm latest — 0.4.18 / latest
fresh public tarball inspection — package/SECURITY.md present
fresh isolated-cache npx open-scaffold@latest --help — passed
fresh isolated-cache npx open-scaffold@latest cockpit --help — passed
fresh isolated-cache npx open-scaffold@latest init --tier min --target <tmp> — passed and created .osc/.gitignore containing tasks.db*
GitHub Release v0.4.18 — created and marked Latest
```

## Remaining gates

None for this release-sync slice after this closeout PR lands. Control Room runner automation remains a separate resume/re-qualification gate and should start from refreshed selector/current truth after this closeout lands.
