# Plan: 180-repository-revival

## Status

active

## Context

The owner returned on 2026-10-06 and authorized reviving the public project for outside users. Contributor issues #281 and #282 expose inconsistent onboarding instructions and mandatory mutable remote reading; a separate reproduction shows task A inheriting task B's blocked run in handoff. The canonical checkout has been fast-forwarded to public main, preserving the owner's untracked content draft.

## Goal

Prepare a verified, reviewable repository maintenance update that makes newcomer setup and task-specific handoff dependable and reconciles outstanding maintenance work.

## Constraints / Out of scope

- Preserve committed plan history and the owner's untracked content draft.
- Keep existing supported Node runtime compatibility; assess major development-tool upgrades explicitly.
- Keep user-project onboarding self-contained and generic; retain optional platform integrations and evidence links where useful.
- No npm publication, release/tag creation, workflow dispatch, repository settings changes, credentials access, or autonomous John Lomein execution.
- Owner merge approval follows review of the finished PR. Reversible duplicate/superseded issue and PR cleanup is within the owner's requested maintenance scope.
- The orchestrator report-transfer experiment is the next frontier, recorded separately in plan 181; no hundred-agent scaling claim in this maintenance slice.

## Files to touch

- `src/init.ts`, `src/first-run.ts`, and generated/source workflow documentation — align record authoring policy and remove required remote instruction reading.
- `src/resume.ts`, `tests/resume.test.ts` — bind handoff run state to the selected plan.
- Onboarding and package tests — verify actual generated tiers and an npm-only first-session-to-session journey.
- Root and runtime package manifests/lockfiles and workflow action references — update compatible dependencies and resolve known advisories.
- `.github/workflows/stale-plans.yml` — reuse one owned reminder instead of creating weekly duplicates.
- `.osc/plans/`, `.osc/releases/`, `ROADMAP.md`, `MISSION.md`, `docs/CHANGELOG.md` — reconcile intent, evidence, release-prep status, and future direction.
- `tests/section-parser.test.ts` — refresh the live-corpus hashes only after verifying intentional record changes.

## Execution strategy

### Parallel groups

Independent agents own handoff code/tests, onboarding generation/docs/tests, dependency manifests/action references, and stale-reminder workflow/PR triage. The coordinator alone owns plan lifecycle, mission/roadmap/changelog, evidence, commits, GitHub cleanup, and final integration.

### Dependencies

Dependency action-ref changes and stale-reminder logic share one workflow and must be coordinated before integration. Run the full required suite once after the groups converge, with repeat checks only for subsequent changes or failures.

## Acceptance criteria

- [x] Source and generated onboarding agree on CLI, supported shell, and explicit validated manual fallback; committed intent remains immutable. | Evidence: `.osc/releases/2026-10-06-180-repository-revival.md`
- [x] First-run generated guidance does not require reading mutable remote instructions; generic project workflow does not require GitHub. | Evidence: `.osc/releases/2026-10-06-180-repository-revival.md`
- [x] A clean npm-only user can initialize, record progress, and obtain the same task's next-session handoff without a previously installed global CLI. | Evidence: `.osc/releases/2026-10-06-180-repository-revival.md`
- [x] Selecting plan A cannot inherit plan B's run, blocker, repair instruction, or completion state; regression fixtures cover concurrent independent work. | Evidence: `.osc/releases/2026-10-06-180-repository-revival.md`
- [x] Dependencies and action references are reviewed and updated within the supported contract; the final audit has no unresolved applicable advisory without an explicit reason. | Evidence: `.osc/releases/2026-10-06-180-repository-revival.md`
- [ ] Existing portfolio drafts and stale reminders have a documented disposition, superseded duplicates are reconciled, and reminder automation no longer opens a new issue every week for unchanged state.
- [x] Plan 181 records the owner-directed orchestrator/report-transfer frontier and a bounded pilot with measurable outcomes. | Evidence: `.osc/releases/2026-10-06-180-repository-revival.md`
- [ ] Build, tests, strict structural verification, package smoke, and independent final review pass; the maintenance PR links this plan and its evidence with release authority explicit.

## Verification steps

1. Run focused generated-output, handoff isolation, and newcomer package lifecycle regression checks; each must reproduce the earlier failure before the fix and pass after it.
2. Run `npm run build`, `npm test`, `./verify.sh --strict`, and `npm run osc -- verify` after integration; record totals and actual warning boundaries.
3. Run `npm audit --json`, `npm outdated --json`, and the package smoke checks; distinguish compatible updates from major migrations.
4. Review every remaining open issue/PR against actual diff, state, and retained source work; record the disposition and preserve unique intent.
5. Run `git diff --check`, compare the preserved content draft hash, and obtain independent review of the completed change before publication of the PR.

## Open questions

- BLOCKING: None for implementation. Owner approval is required for merging the finished PR and for any later package publication/release; neither is implied by a successful test suite.
