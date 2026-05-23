# Plan: 096-glass-cockpit-webhooks-public-surface-sync

## Status

active

## Context

PR #100 (`Add glass cockpit webhooks`) is now present on `main` after `open-scaffold@0.4.16` and GitHub Release `v0.4.16` became the public latest surfaces. The repository now exposes `osc cockpit config`, `osc cockpit test`, and `osc cockpit post`, but a fresh `npx open-scaffold@latest cockpit --help` still resolves to `open-scaffold@0.4.16` and exits with `Unknown command: cockpit`.

This is a narrow public-surface sync. It prepares `open-scaffold@0.4.17` so the owner-approved cockpit webhook work can become available through npm trusted publishing and represented by a GitHub Latest Release before Control Room proof automation resumes.

## Goal

Publish and verify `open-scaffold@0.4.17` so npm latest, fresh `npx open-scaffold@latest cockpit --help`, and GitHub Latest Release align with repo `main` for the glass-cockpit webhook CLI.

## Constraints / Out of scope

- Do not add new cockpit behavior beyond the PR #100 command surface.
- Do not add incoming webhooks, daemons, slash commands, background listeners, or lifecycle auto-posting in this release-sync slice.
- Do not resume or increase Control Room runner autonomy until public package/release surfaces are aligned and selector state is refreshed.
- Do not change Open Scaffold core's runtime-neutral and non-spawning boundary.
- Keep scope to package metadata/version, release-sync evidence, trusted publication, fresh public smoke tests, GitHub Release alignment, and final closeout.

## Files to touch

- `package.json` — bump package version to `0.4.17`.
- `package-lock.json` — align root package metadata to `0.4.17`.
- `.osc/plans/active/096-glass-cockpit-webhooks-public-surface-sync.md` — track release-sync acceptance criteria until public proof exists.
- `.osc/releases/2026-05-23-096-glass-cockpit-webhooks-public-surface-sync.md` — record candidate evidence and final npm/release proof.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|--------------|----------------|
| T1 | Confirm PR #100 public-surface drift against npm latest | None | A |
| T2 | Bump package metadata to `0.4.17` | T1 | B |
| T3 | Write release-sync plan and evidence note | T2 | B |
| T4 | Run local verification, package dry-run, and publish dry-run gates | T2, T3 | C |
| T5 | Open PR and complete CI/Codex latest-head review loop | T4 | D |
| T6 | Merge, publish with trusted publishing, verify fresh public `npx`, create GitHub Latest Release, and close the plan | T5 | E |

### Parallel groups

- **A**: read-only drift confirmation.
- **B**: metadata/evidence preparation.
- **C**: candidate verification and package inspection.
- **D**: PR review loop.
- **E**: approved public-surface follow-through and closeout.

### Dependencies

- T2 depends on T1 because npm versions are immutable and `0.4.17` must be selected from live registry truth.
- T4 depends on all candidate files so evidence describes the exact candidate.
- T6 depends on PR checks and latest-head review being clean.

### Delegation notes

Direct Hermes execution is appropriate. No runtime worker, automation runner, or Control Room proof lane should mutate the repo while this release-sync branch is active.

## Implementation Architecture Coverage

- Strengthens: public package truth, first-run trust, `npx` command-surface alignment, release evidence discipline, and Control Room proof hygiene.
- Audit envelope: plan `096`, PR #100, package version bump, release-sync PR, trusted-publishing workflow run, fresh public `npx` smokes, GitHub Release tag, final closeout.
- Evaluation envelope: this does not evaluate webhook product design again; it verifies that the already-reviewed cockpit CLI is reachable from npm/latest.
- Feedback routing: any publish, `npx`, release, or selector-refresh failure blocks Control Room proof resume and becomes a focused follow-up.
- Boundary: cockpit remains push-only and credential-configured; Discord/Slack remain glass surfaces, not canonical project truth.

## Acceptance criteria

- [ ] `package.json` and `package-lock.json` are updated to `0.4.17`.
- [ ] Candidate evidence explains that PR #100 reached `main` after `0.4.16` publish/release and that `0.4.17` is needed for public `npx` alignment.
- [ ] Fresh current `npx open-scaffold@latest cockpit --help` is recorded as the pre-release baseline and shows the current drift.
- [ ] Local built CLI exposes `osc cockpit --help`.
- [ ] `npm pack --dry-run --json` succeeds and confirms package payload includes `dist/cockpit.js`, `dist/cockpit.d.ts`, and `.osc/cockpit.example.json` while excluding private dogfood state.
- [ ] `npm publish --dry-run` succeeds for the release candidate without publishing.
- [ ] Local verification passes: `git diff --check`, `./verify.sh --strict`, cockpit/package targeted tests, full test suite, build, `npm pack --dry-run --json`, and `npm publish --dry-run`.
- [ ] PR is reviewed with latest-head Codex clean and zero unresolved current review threads.
- [ ] Trusted npm publishing publishes `open-scaffold@0.4.17` as latest.
- [ ] Fresh isolated-cache `npx open-scaffold@latest cockpit --help` succeeds and lists cockpit subcommands.
- [ ] GitHub Release `v0.4.17` is created or updated as Latest.
- [ ] The plan closes only after npm registry, fresh `npx`, GitHub Latest Release, and final evidence are all real.

## Verification steps

1. `git diff --check` — no whitespace errors.
2. `./verify.sh --strict` — scaffold verification passes while this plan remains active.
3. `npm test -- tests/cockpit.test.ts tests/package-payload.test.ts --reporter=verbose` — targeted cockpit/package tests pass.
4. `npm test -- --reporter=verbose` — full suite passes.
5. `npm run build` — package builds.
6. `npm pack --dry-run --json` — package candidate is inspectable and includes the cockpit CLI/template surfaces.
7. `npm publish --dry-run` — publish candidate validates without performing a real publish.
8. After merge and trusted publish: `npm view open-scaffold version dist-tags --json --prefer-online` reports `0.4.17` / latest.
9. After publish: fresh isolated-cache `npx --yes open-scaffold@latest cockpit --help` succeeds.
10. `gh release list --repo graphanov/open-scaffold --limit 5` shows `v0.4.17` as Latest.

## Open questions

- GitHub Release title default: `v0.4.17 — Glass cockpit webhooks`.
- Control Room proof resume is not part of this package-sync slice; after final public proof, refresh selector/current state and resume/re-qualify from the runbook gate.
