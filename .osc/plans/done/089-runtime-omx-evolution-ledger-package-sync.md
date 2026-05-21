# Plan: 089-runtime-omx-evolution-ledger-package-sync

## Status

done

## Context

PR #80 landed the runtime OMX evolution ledger bridge on `main` after `open-scaffold@0.4.9` had already been published for the base evolution loop contract. The repository now contains user-facing CLI/runtime behavior that npm `latest` does not expose yet, so public package and GitHub Release surfaces need a narrow patch sync before the next product slice.

## Goal

Publish and verify `open-scaffold@0.4.10` so npm `latest`, fresh `npx`, and GitHub Release Latest expose the runtime OMX evolution ledger bridge shipped in PR #80.

## Constraints / Out of scope

- Do not add new runtime behavior beyond the already-merged PR #80 bridge.
- Do not publish npm or create a GitHub Release until the owner gate is explicitly satisfied.
- Do not change trusted-publishing workflow semantics unless the existing publish gate fails because of workflow drift.
- Do not claim hidden spawning, automatic frontier promotion, model ranking, compliance certification, or full OMX workflow support.
- Do not touch unrelated local untracked files such as `02_Active_Projects/`.

## Files to touch

- `package.json` — bump the root package version from `0.4.9` to `0.4.10`.
- `package-lock.json` — keep the lockfile package version in sync.
- `.osc/releases/2026-05-21-089-runtime-omx-evolution-ledger-package-sync.md` — record package/release evidence, gates, and post-publish verification.
- `.osc/plans/done/089-runtime-omx-evolution-ledger-package-sync.md` — this plan after package-sync candidate closure.
- `MISSION.md` — receive the mechanical close stamp from `close.sh` after verification.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|--------------|----------------|
| T1 | Verify repo, npm, GitHub Release, workflow, and auth surfaces before mutation | None | A |
| T2 | Bump version and create package/release evidence note | T1 | B |
| T3 | Run local publish gates and package/npx smokes | T2 | C |
| T4 | Close the plan, commit, push, open PR, and run latest-head Codex loop | T3 | D |
| T5 | After owner merge/publish/release approval, dispatch trusted publishing, verify npm/npx, and create GitHub Release | T4 plus owner gate | E |

### Parallel groups

- **Group A/B/C/D/E** are sequential because package publishing depends on exact version, verified candidate contents, PR merge, and explicit owner gates.

### Dependencies

- T5 must use the existing trusted-publishing workflow when possible and target the merged `origin/main` commit for the GitHub Release.
- Release evidence must avoid exact latest-head Codex SHA claims inside committed files because the PR head changes when evidence is committed.

### Delegation notes

- This is a small release-sync slice; Hermes should execute it locally rather than spawning workers.
- If Codex finds valid package or release-surface issues, fix them manually with scoped commits and rerun the latest-head loop.

## Implementation Architecture Coverage

- Strengthens: package truth, public adoption path, GitHub release traceability, and recovery/ownership.
- Audit envelope: plan `089`, PR #80, Kanban `t_b3b28c80`, package version `0.4.10`, trusted publishing run, npm registry proof, fresh `npx` smoke, and GitHub Release URL.
- Evaluation envelope: local publish gates, npm pack/publish dry-runs, CI/Codex PR loop, registry verification, and fresh `npx` command-surface smoke.
- Feedback routing: publish workflow/auth failures become owner-gated operational notes; Codex findings become scoped PR fixes; package-surface drift becomes a follow-up plan only if not fixed here.
- Boundary: runtime execution, merge authority, npm publication, GitHub Release creation, and compliance claims remain outside Hermes' unilateral authority unless explicitly approved.

## Acceptance criteria

- [x] `package.json` and `package-lock.json` both carry `0.4.10`, and `npm view open-scaffold` confirms `0.4.10` is not already published before the publish gate.
- [x] Local publish gates pass: `git diff --check`, `./verify.sh --strict`, `npm test -- --run`, `npm run build`, `npm pack --dry-run --json`, and `npm publish --dry-run`.
- [x] Package payload inspection confirms the root npm package includes the built core CLI/docs needed for `osc evolve record --receipt/--evidence` and excludes private/dogfood/runtime-source-only paths that are not part of the root package contract.
- [ ] PR is opened against `main`, CI passes, and Codex latest-head review has no actionable findings before merge approval is requested.
- [ ] After owner approval and merge, trusted publishing publishes `open-scaffold@0.4.10` with `latest` dist-tag.
- [ ] Fresh `npx --yes open-scaffold@latest` smoke verifies the public command surface for `osc evolve record --receipt/--evidence` and the runtime OMX bridge docs remain available in the published package.
- [ ] GitHub Release `v0.4.10` targets the merged `origin/main` commit, is marked Latest, and release notes cite PR #80 / plan 089 / verification evidence.

## Verification steps

1. `git diff --check` — no whitespace errors.
2. `./verify.sh --strict` — scaffold checks pass with no warnings.
3. `npm test -- --run` — full test suite passes.
4. `npm run build` — core and runtime-omx builds pass.
5. `npm pack --dry-run --json` — package payload is inspectable and free of forbidden private paths.
6. `npm publish --dry-run` — npm publish candidate validates locally before the real trusted-publishing gate.
7. `gh pr view <PR> --repo graphanov/open-scaffold --json statusCheckRollup,mergeable` plus Codex comment/review/thread inspection — PR is review-ready and latest-head clean.
8. Post-merge/publish: `npm view open-scaffold version dist-tags --json`, `npx --yes open-scaffold@latest evolve --help`, and `gh release list --repo graphanov/open-scaffold --limit 5` all show `0.4.10` / `v0.4.10` alignment.

## Open questions

- Can trusted publishing publish `0.4.10` without workflow or npm trusted-publisher drift? Initial assumption: yes, because prior releases used `.github/workflows/publish-npm.yml`.
- Should this slice open a version-bump PR before publish? Yes; the version change must land on `main` before the trusted-publishing workflow publishes from `main`.
