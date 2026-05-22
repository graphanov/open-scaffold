# Plan: 093-pr89-public-surface-sync

## Status

active

## Context

PR #89 (`Make evolution loop comparison visible`) landed on `main` after `open-scaffold@0.4.12` was already published to npm and after GitHub Release `v0.4.12` was marked Latest. The repository `main` now includes the evolution-loop compare walkthrough and acceptance-criteria delta rendering, but the public package/release surfaces still predate that landing.

This is a narrow public-surface sync candidate. It prepares the next patch package version so the PR #89 work can be published and released after explicit owner approval.

## Goal

Prepare `open-scaffold@0.4.13` as the release-sync candidate for PR #89 so the npm package, fresh `npx open-scaffold@latest`, and GitHub Latest Release can be aligned after the owner approves publish/release follow-through.

## Constraints / Out of scope

- Do not run real `npm publish` in this PR.
- Do not create, edit, move, or mark a GitHub Release as Latest in this PR.
- Do not merge this PR without owner approval.
- Do not archive this plan or stamp `MISSION.md` until npm registry, fresh `npx`, and GitHub Latest Release proof exist after owner-gated follow-through.
- Do not change evolution-loop product behavior beyond the already-landed PR #89 work.
- Do not add runtime adapters, native spawning, model ranking, compliance certification, or approval automation.
- Keep scope to package metadata/version, candidate evidence, and package verification.

## Files to touch

- `package.json` — bump package candidate version to `0.4.13`.
- `package-lock.json` — align lockfile package version to `0.4.13`.
- `.osc/plans/active/093-pr89-public-surface-sync.md` — keep this plan active until post-merge publish/release proof exists.
- `.osc/releases/2026-05-22-093-pr89-public-surface-sync.md` — candidate evidence note and owner gates.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|--------------|----------------|
| T1 | Confirm repo, npm, GitHub Release, and PR #89 public-surface drift | None | A |
| T2 | Bump candidate package metadata to `0.4.13` | T1 | B |
| T3 | Write candidate evidence note with owner-gated publish/release follow-through | T2 | B |
| T4 | Run local verification and package dry-run gates | T2, T3 | C |
| T5 | Open PR and request review; stop before merge/publish/release | T4 | D |

### Parallel groups

- **A**: read-only drift confirmation.
- **B**: metadata/evidence preparation.
- **C**: verification and package candidate inspection.
- **D**: PR preparation and review loop.

### Dependencies

- T2 depends on T1 because npm versions are immutable and the next version must be chosen from live registry truth.
- T4 depends on all candidate files so evidence reflects the exact branch contents.
- T5 depends on verification passing.

### Delegation notes

This is a small, deterministic release-sync candidate. Direct Hermes execution is appropriate. No runtime worker, automation runner, or Control Room proof lane should be resumed for this slice.

## Implementation Architecture Coverage

- Strengthens: public package truth, external install trust, GitHub Release alignment readiness.
- Audit envelope: plan `093`, candidate evidence note, package version bump, package dry-run output, verification commands, PR review status.
- Evaluation envelope: no new evaluator behavior; this only prepares the package surface for already-landed code/docs.
- Feedback routing: npm publication, fresh `npx` verification, GitHub Release creation/update, and plan archive remain owner-gated follow-through after PR approval.
- Boundary: Open Scaffold core remains non-spawning; this release-sync candidate does not add runtime or approval authority.

## Acceptance criteria

- [ ] `package.json` and `package-lock.json` are updated to `0.4.13`.
- [ ] Candidate evidence explains that PR #89 landed after `0.4.12` publish/release and that `0.4.13` is needed for public `npx` alignment.
- [ ] `npm pack --dry-run --json` includes the PR #89 public docs and package-visible code required for the evolution-loop compare visibility work.
- [ ] Local verification passes: `git diff --check`, `./verify.sh --strict`, targeted evolution tests, full test suite, build, `npm pack --dry-run --json`, and `npm publish --dry-run`.
- [ ] Fresh current `npx open-scaffold@latest` smoke is recorded as the pre-release baseline, not proof that `0.4.13` is live.
- [ ] PR is opened for review with clear owner gates.
- [ ] The plan remains active until owner-gated PR approval, trusted npm publication, fresh post-publish `npx`, GitHub Latest Release alignment, and final evidence are all real.

## Verification steps

1. `git diff --check` — no whitespace errors.
2. `./verify.sh --strict` — scaffold verification passes while plan remains active.
3. `npm test -- --run tests/evolution.test.ts tests/cli-evolution.test.ts` — targeted evolution compare tests pass.
4. `npm test -- --run` — full suite passes.
5. `npm run build` — package builds.
6. `npm pack --dry-run --json` — package payload is inspectable and includes PR #89 public docs/code surfaces.
7. `npm publish --dry-run` — publish candidate dry-run passes without publishing.
8. Fresh `npx open-scaffold@latest --help` and `npx open-scaffold@latest evolve --help` baseline is recorded.

## Open questions

- Should `0.4.13` GitHub Release title emphasize evolution-loop comparison visibility or broader public-surface sync? Deferred to the owner-gated release step.
- Should the plan be archived in this same branch? No. It remains active until real npm/GitHub Release proof exists after owner approval.
