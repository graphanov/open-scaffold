# Plan: 038-first-run-adoption-hardening

## Status

active

## Context

A 2026-05-17 external multi-lane review found that Open Scaffold's strongest adoption blockers happen before the protocol can prove its value: public docs advertise a package install path that is not currently published, `standard` initialization can copy Open Scaffold's own product identity into downstream projects, and package dry-runs include dogfood history as install baggage. This plan converts that critique into a narrow first-run trust hardening slice.

## Goal

Make the default first-run path mechanically truthful, downstream-neutral, and package-clean enough that a new user can try Open Scaffold without inheriting Open Scaffold's own project history.

## Constraints / Out of scope

- Do not add runtime spawning, adapter launch, credentials, daemons, or process supervision to core.
- Do not claim npm publication exists unless the package is actually published and verified.
- Do not copy private owner context, local paths, or product dogfood history into generated downstream projects.
- Do not rewrite the whole documentation corpus; only touch first-run/install/init/package truth needed for this slice.
- Do not make compliance, enterprise, or adapter-marketplace claims.

## Files to touch

- `README.md` — make primary install/try path match what works today.
- `docs/MINIMUM_VIABLE_SCAFFOLD.md` — align minimum path with current install truth and downstream-neutral flow.
- `src/init.ts` — make `standard` tier generate or copy neutral downstream root docs.
- `tests/init.test.ts` and/or `tests/cli-init.test.ts` — cover standard-tier neutrality and install/init behavior.
- `package.json` — trim package payload if dogfood history is being shipped unintentionally.
- `docs/examples/` — update only if examples cite stale first-run commands.
- `AGENTS.md` and `CLAUDE.md` — only if paired root instructions need a narrow note about product-vs-template boundaries.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|--------------|----------------|
| T1 | Audit every first-run/install command and package payload entry | None | A |
| T2 | Decide truthful primary install path: publish npm now or demote `npx` until publication | T1 | B |
| T3 | Make standard-tier downstream docs project-neutral | T1 | B |
| T4 | Trim package payload so product dogfood history is not default install baggage | T1 | B |
| T5 | Add regression tests and temp-init smoke checks | T2, T3, T4 | C |
| T6 | Run full verification and update concise release/PR evidence | T5 | D |

### Parallel groups

- **Group A**: audit only; no mutations.
- **Group B**: install docs, init templates, and package payload can be worked independently after the audit.
- **Group C**: tests must reflect the chosen implementation.
- **Group D**: final verification after all mutations.

### Dependencies

- T2 depends on T1 because docs must not be changed until the exact npm/package reality is verified.
- T5 depends on T2-T4 because tests should lock the final chosen behavior, not an intermediate guess.

### Delegation notes

- A documentation-focused worker can handle T2 while a code/test worker handles T3/T4.
- Keep one owner/Hermes pass for the final first-run story so README and generated templates do not drift.

## Implementation Architecture Coverage

- Strengthens: workflow design, recovery/ownership, adoption trust.
- Audit envelope: PR should cite external-review ingest, this plan, temp-init smoke path, npm/package dry-run output, and verification commands.
- Evaluation envelope: verify install truth, generated downstream root docs, package payload, and normal test/build gates.
- Feedback routing: if npm publication is not approved, route the npm decision as an owner gate instead of silently publishing.
- Boundary: runtime enforcement, adapter packages, compliance claims, model benchmarking, and hosted dashboards remain outside this slice.

## Acceptance criteria

- [ ] Primary public docs do not advertise `npx open-scaffold` as the default path unless `npm view open-scaffold version --json` succeeds for the intended package.
- [ ] A fresh `osc init --tier standard --target <tmp>` produces downstream root docs that do not identify the downstream project as Open Scaffold.
- [ ] Generated downstream files contain no private owner-local paths, personal names, or private owner-workspace references.
- [ ] `npm pack --dry-run --json` no longer includes `.osc/plans/done/*.md`, backlog hypothesis plans, or dated `.osc/releases/2026-*.md` as default package payload unless a deliberate curated example exception is documented.
- [ ] Existing min-tier behavior remains intact.
- [ ] `npm run build`, `npm test`, `./verify.sh --strict`, and `git diff --check` pass.

## Verification steps

1. Run `npm view open-scaffold version --json`; pass if it succeeds when `npx open-scaffold` remains primary, or if primary docs no longer depend on it.
2. Run `npm pack --dry-run --json`; pass if package contents exclude unintended dogfood history.
3. Run `npm run build` and `npm test`; pass on clean exits.
4. Run `tmp="$(mktemp -d)" && node dist/cli.js init --tier standard --target "$tmp" && ! grep -R "This project is .*open-scaffold\\|/Users/\\|owner-local\\|private workspace" "$tmp"`; pass if grep finds no downstream leakage.
5. Run `./verify.sh --strict` and `git diff --check`; pass on clean outputs.

## Open questions

- Should npm publication happen in this slice, or should docs use a currently true GitHub/template/local path until publication has a separate gate?
- Should a small vocabulary cleanup be included only where first-run docs are touched, or should full vocabulary compression v2 remain the next plan?
