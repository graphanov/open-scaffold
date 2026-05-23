# Plan: 098-omo-security-hardening-package-sync

## Status

active

## Context

PR #103 is now present on `main` after `open-scaffold@0.4.17` and GitHub Release `v0.4.17` became the public latest surfaces. The repository now includes `SECURITY.md` in the package file list and release/security posture hardening, but the already-published `open-scaffold@0.4.17` npm tarball cannot be republished with that payload.

## Goal

Prepare and verify `open-scaffold@0.4.18` so npm latest and GitHub Latest Release can align with the security posture and package payload now present on `main`.

## Constraints / Out of scope

- Do not change security behavior beyond the already-reviewed PR #103 hardening patch.
- Do not publish npm or create/update GitHub Releases from this candidate branch; those remain owner-gated follow-through steps after PR review/merge.
- Do not resume Control Room runner autonomy until package/release surfaces are aligned and selector state is refreshed.
- Do not touch the open Dependabot PR #104 in this slice.

## Files to touch

- `package.json` — bump package version to `0.4.18`.
- `package-lock.json` — align root package metadata to `0.4.18`.
- `.osc/plans/active/098-omo-security-hardening-package-sync.md` — track package public-surface sync until final public proof exists.
- `.osc/releases/2026-05-23-098-omo-security-hardening-package-sync.md` — record candidate evidence and later final npm/release proof.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|--------------|----------------|
| T1 | Confirm public package drift after PR #103 reached main | None | A |
| T2 | Bump package metadata to `0.4.18` | T1 | B |
| T3 | Write release-sync plan and evidence note | T2 | B |
| T4 | Run local verification, package dry-run, and publish dry-run gates | T2, T3 | C |
| T5 | Open PR and complete CI/Codex latest-head review loop | T4 | D |
| T6 | After owner approval: merge, trusted publish, verify fresh public npm/npx, update GitHub Latest Release, and close the plan | T5 | E |

### Parallel groups

- **A**: read-only drift confirmation.
- **B**: metadata/evidence preparation.
- **C**: candidate verification and package inspection.
- **D**: PR review loop.
- **E**: approved public-surface follow-through and closeout.

### Dependencies

- T2 depends on T1 because npm versions are immutable and `0.4.18` must be selected from live registry truth.
- T4 depends on all candidate files so evidence describes the exact candidate.
- T6 depends on PR checks and latest-head review being clean.

### Delegation notes

Direct Hermes execution is appropriate. No runtime worker, automation runner, or Control Room proof lane should mutate the repo while this release-sync branch is active.

## Implementation Architecture Coverage

- Strengthens: public package truth, first-run trust, security reporting discoverability, release evidence discipline, and Control Room proof hygiene.
- Audit envelope: plan `098`, PR #103, package version bump, release-sync PR, trusted-publishing workflow run, fresh public npm/npx smokes, GitHub Release tag, final closeout.
- Evaluation envelope: this does not re-evaluate the security design; it verifies that the already-reviewed security posture/payload reaches public package surfaces.
- Feedback routing: any publish, npx, release, or selector-refresh failure blocks Control Room proof resume and becomes a focused follow-up.
- Boundary: no npm publish, GitHub Release mutation, runner resume, or dependency update work in this candidate PR.

## Acceptance criteria

- [ ] `package.json` and `package-lock.json` are updated to `0.4.18`.
- [ ] Candidate evidence explains that PR #103 reached `main` after `0.4.17` publish/release and that `0.4.18` is needed for public package payload alignment.
- [ ] Current `open-scaffold@latest` tarball is recorded as the pre-release baseline and lacks `SECURITY.md`.
- [ ] Candidate `npm pack --dry-run --json` includes `SECURITY.md` and excludes private dogfood state.
- [ ] `npm publish --dry-run` succeeds for `open-scaffold@0.4.18` without publishing.
- [ ] Local verification passes: `git diff --check`, `./verify.sh --strict`, package-payload targeted tests, full test suite, build, `npm pack --dry-run --json`, and `npm publish --dry-run`.
- [ ] PR is reviewed with latest-head Codex clean and zero unresolved current review threads.
- [ ] After owner approval and trusted publishing, npm latest reports `0.4.18` and fresh isolated-cache package inspection confirms `SECURITY.md` is present.
- [ ] GitHub Release `v0.4.18` is created or updated as Latest.
- [ ] The plan closes only after npm registry, package payload, GitHub Latest Release, and final evidence are all real.

## Verification steps

1. `git diff --check` — no whitespace errors.
2. `./verify.sh --strict` — scaffold verification passes while this plan remains active.
3. `npm test -- tests/package-payload.test.ts --reporter=verbose` — targeted package test passes.
4. `npm test -- --reporter=verbose` — full suite passes.
5. `npm run build` — package builds.
6. `npm pack --dry-run --json` — candidate package is inspectable and includes `SECURITY.md`.
7. `npm publish --dry-run` — publish candidate validates without performing a real publish.
8. After merge and trusted publish: `npm view open-scaffold version dist-tags --json --prefer-online` reports `0.4.18` / latest.
9. After publish: fresh isolated-cache tarball inspection confirms `package/SECURITY.md` exists.
10. `gh release list --repo graphanov/open-scaffold --limit 5` shows `v0.4.18` as Latest.

## Open questions

- GitHub Release title default: `v0.4.18 — Security posture and dependency maintenance`.
- Control Room proof resume is not part of this package-sync slice; after final public proof, refresh selector/current state and resume/re-qualify from the runbook gate.
