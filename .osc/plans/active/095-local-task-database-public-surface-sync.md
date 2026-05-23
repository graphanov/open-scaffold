# Plan: 095-local-task-database-public-surface-sync

## Status

active

## Context

PR #96 (`Add local task database CLI`) is now present on `main` after `open-scaffold@0.4.14` and GitHub Release `v0.4.14` were already the public latest surfaces. The repository now contains the new `osc task` local SQLite task database CLI, `docs/TASKS.md`, task summary support in `osc status`, and package payload changes, but a fresh `npx open-scaffold@latest task --help` still resolves to `open-scaffold@0.4.14` and exits with `Unknown command: task`.

This is a narrow public-surface sync candidate. It prepares `open-scaffold@0.4.15` so the owner-approved PR #96 task-database work can be published through npm trusted publishing and represented by a GitHub Latest Release after the normal owner gates.

## Goal

Prepare `open-scaffold@0.4.15` as the package/release sync candidate for the local task database CLI so npm latest, fresh `npx open-scaffold@latest`, and GitHub Latest Release can align with repo `main` after owner approval.

## Constraints / Out of scope

- Do not run real `npm publish` in this PR.
- Do not create, edit, move, or mark a GitHub Release as Latest in this PR.
- Do not merge this PR without owner approval.
- Do not resume or increase Control Room runner autonomy as part of this release-sync candidate.
- Do not add task daemon behavior, sync, remote issue integration, WIP limits, multi-assignee workflow, or background execution.
- Do not change Open Scaffold core's non-spawning runtime boundary.
- Keep scope to package metadata/version, candidate evidence, package verification, and owner-gated release follow-through.

## Files to touch

- `package.json` — bump package candidate version to `0.4.15`.
- `package-lock.json` — align root package metadata to `0.4.15`.
- `.osc/plans/active/095-local-task-database-public-surface-sync.md` — keep this plan active until real public-surface proof exists.
- `.osc/releases/2026-05-23-095-local-task-database-public-surface-sync.md` — record candidate evidence and remaining owner gates.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|--------------|----------------|
| T1 | Confirm PR #96 merge and live public-surface drift | None | A |
| T2 | Bump candidate package metadata to `0.4.15` | T1 | B |
| T3 | Write candidate evidence note with owner-gated publish/release follow-through | T2 | B |
| T4 | Run local verification, package dry-run, and publish dry-run gates | T2, T3 | C |
| T5 | Open PR, trigger Codex review, and stop before merge/publish/release | T4 | D |

### Parallel groups

- **A**: read-only drift confirmation.
- **B**: metadata/evidence preparation.
- **C**: verification and package candidate inspection.
- **D**: PR preparation and latest-head review loop.

### Dependencies

- T2 depends on T1 because npm versions are immutable and the next patch version must be selected from live registry truth.
- T4 depends on all candidate files so evidence describes the exact PR contents.
- T5 depends on verification passing.

### Delegation notes

This is a small deterministic release-sync candidate. Direct Hermes execution is appropriate. No runtime worker, automation runner, or Control Room proof lane should mutate the repo while this branch is being prepared.

## Implementation Architecture Coverage

- Strengthens: public package truth, first-run trust, `npx` command-surface alignment, and release evidence discipline.
- Audit envelope: plan `095`, package version bump, candidate evidence note, package dry-run output, publish dry-run output, PR review status.
- Evaluation envelope: no new task-database behavior; this only prepares the package surface for PR #96 task-database work.
- Feedback routing: npm trusted publishing, fresh post-publish `npx` verification, GitHub Release creation/update, and final plan archive remain owner-gated follow-through after PR approval.
- Boundary: Open Scaffold core remains runtime-neutral and non-spawning; local task DB remains optional and local-only.

## Acceptance criteria

- [ ] `package.json` and `package-lock.json` are updated to `0.4.15`.
- [ ] Candidate evidence explains that PR #96 reached `main` after `0.4.14` publish/release and that `0.4.15` is needed for public `npx` alignment.
- [ ] Fresh current `npx open-scaffold@latest task --help` is recorded as the pre-release baseline and shows the current drift.
- [ ] Local built CLI exposes `osc task --help`.
- [ ] `npm pack --dry-run --json` succeeds and confirms package payload includes the local task database docs/code while excluding private dogfood state.
- [ ] `npm publish --dry-run` succeeds for the release candidate without publishing.
- [ ] Local verification passes: `git diff --check`, `./verify.sh --strict`, task/init/package-payload targeted tests, full test suite, build, `npm pack --dry-run --json`, and `npm publish --dry-run`.
- [ ] PR is opened for review and latest-head Codex review has no actionable findings with zero unresolved current review threads.
- [ ] The plan remains active until owner-gated PR approval, trusted npm publication, fresh post-publish `npx`, GitHub Latest Release alignment, and final evidence are all real.

## Verification steps

1. `git diff --check` — no whitespace errors.
2. `./verify.sh --strict` — scaffold verification passes while the release-sync plan remains active.
3. `npm test -- tests/init.test.ts tests/tasks.test.ts tests/package-payload.test.ts --reporter=verbose` — targeted task/package tests pass.
4. `npm test -- --reporter=verbose` — full suite passes.
5. `npm run build` — package builds.
6. `npm pack --dry-run --json` — package candidate is inspectable and includes task CLI/docs surfaces.
7. `npm publish --dry-run` — publish candidate validates without performing a real publish.
8. Fresh `npx open-scaffold@latest task --help` baseline is recorded before publish.

## Open questions

- GitHub Release title after owner approval: default candidate is `v0.4.15 — Local task database CLI`.
- Should plan `095` close in this candidate PR? No. It should remain active until npm registry, fresh `npx`, and GitHub Latest Release proof exist after owner approval.
