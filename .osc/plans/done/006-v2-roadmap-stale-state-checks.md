# Plan: v2-roadmap-stale-state-checks

## Status

done

## Context

Open Scaffold v1 now has a public task/run/evidence protocol baseline and a self-dogfood proof chain. The repo still had the old foundational `001-generic-osc-core` plan active, and the next product step is to make folder state truthful, define v2 backlog, formalize release/evidence notes, add mechanical stale-state checks, and prepare the first public release tag.

## Goal

Reconcile v1 operational state and prepare the v0.3.0/v2 product baseline with truthful plan folders, official release/evidence notes, stale-state validation, and a concrete v2 backlog.

## Constraints / Out of scope

- Do not add autonomous spawning to Open Scaffold core.
- Do not add Daniel-specific Command Center, Hermes Kanban, Discord, OMC, or OMX runtime machinery to core.
- Keep new stale-state checks local and best-effort; network/GitHub checks may be future work.
- Do not publish the release/tag until the PR is merged and verification is green.

## Files to touch

- `.osc/plans/active/001-generic-osc-core.md` and amendments — move to `done/` after audit.
- `.osc/plans/active/006-v2-roadmap-stale-state-checks.md` — current slice plan.
- `.osc/plans/backlog/007-cli-validation-upgrades.md` — v2 backlog.
- `.osc/plans/backlog/008-user-facing-examples.md` — v2 backlog.
- `.osc/plans/backlog/009-runtime-harness-adapter-refresh.md` — v2 backlog.
- `.osc/plans/backlog/010-product-packaging-release.md` — v2 backlog.
- `.osc/releases/` — officialize release/evidence notes and prepare v0.3.0 note.
- `ROADMAP.md` — mark v1 baseline complete and add M7-M10.
- `bootstrap.sh`, `verify.sh`, `src/`, `tests/` — official release directory and stale-state checks.
- `README.md`, `AGENTS.md`, `CLAUDE.md`, `docs/GITHUB_WORKFLOW.md` — release/evidence note docs.
- `package.json`, `package-lock.json` — bump to `0.3.0` for the release baseline.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|--------------|----------------|
| T1 | Audit and close/supersede stale `001-generic-osc-core` | None | A |
| T2 | Create v2 roadmap/backlog plans M7-M10 | T1 | B |
| T3 | Make `.osc/releases/` official core convention | T1 | B |
| T4 | Add local stale-state/release-evidence validation checks | T2, T3 | C |
| T5 | Prepare v0.3.0 release evidence and package version | T2, T3 | C |
| T6 | Verify, PR, Codex review, merge, tag/release | T4, T5 | D |

### Parallel groups

- **Group A**: reconcile current truth first.
- **Group B**: roadmap and release convention can be updated together once active state is truthful.
- **Group C**: implementation checks and release packaging build on the new convention.
- **Group D**: publication and final release gates.

### Dependencies

- T2/T3 depend on T1 because v2 should start from clean v1 state.
- T4 depends on T2/T3 because validation should check the chosen conventions.
- T5 depends on T2/T3 because release evidence should cite the v1 baseline and v2 backlog.
- T6 depends on all product/code changes.

### Delegation notes

- Direct Hermes/plain-agent execution is sufficient; no runtime harness is required.
- Future adapter work belongs in the M9 backlog plan, not this core slice.

## Acceptance criteria

- [ ] `001-generic-osc-core.md` and its amendments are audited and moved out of `active/`.
- [ ] V2 backlog plans exist for CLI validation, user-facing examples, adapter/harness refresh, and product packaging.
- [ ] `.osc/releases/` is documented as an official scaffold-native release/evidence-note convention and created by bootstrap.
- [ ] `osc verify` and `verify.sh --strict` include local stale-state/release-evidence checks.
- [ ] Package/release evidence identifies `v0.3.0 — Runtime-neutral semi-autonomous protocol baseline`.
- [ ] `./verify.sh --standard`, `./verify.sh --strict`, `npm run osc -- verify`, `npm test`, `npm run build`, and `git diff --check` pass.
- [ ] No private Command Center machinery leaks into Open Scaffold core.

## Verification steps

1. Run `./verify.sh --standard`; expected result: pass.
2. Run `./verify.sh --strict`; expected result: pass or only acceptable warnings documented and resolved before release.
3. Run `npm run osc -- verify`; expected result: pass with stale-state checks green.
4. Run `npm test`; expected result: all tests pass.
5. Run `npm run build`; expected result: TypeScript build passes.
6. Run `git diff --check`; expected result: no whitespace errors.
7. Confirm GitHub PR/Codex/release status before tagging.

## Open questions

- Should future GitHub-aware stale checks call `gh` directly or remain local-only in core with GitHub-specific validation owned by a coordinator/binding?
- Should `.osc/releases/` later get a generated schema or stay markdown-first for v0.3.0?
