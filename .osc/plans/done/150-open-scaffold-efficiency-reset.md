# Plan: 150-open-scaffold-efficiency-reset

## Status

done

## Context

The latest private A/B result did not support a "makes Codex better" claim: Open Scaffold used more tokens while final mechanical outcome tied. The useful remaining thesis is narrower: Open Scaffold may earn its overhead as a workflow-control layer only if it can produce smaller, sharper stop/inspect/redesign/continue signals with measurable cost and handoff discipline.

## Goal

Add public-safe measurement and compact controller output for `osc evolve analyze` so workflow-control efficiency is computed from artifacts rather than claimed in prose.

## Constraints / Out of scope

- Do not add 2000m-specific fields, paths, scorer contracts, or benchmark claims.
- Do not add runtime spawning, process control, provider APIs, publishing, release, push, PR, or merge behavior.
- Do not treat evidence volume as score or hide missing current criteria.
- Do not claim Open Scaffold makes models smarter, improves benchmark outcomes, or proves productivity.
- Prefer compaction, deletion, and sharper decision packets over new ceremony or dependencies.

## Files to touch

- `src/evolution.ts` — analyze/report controller-signal metrics and compact analysis rendering.
- `src/cli.ts` — expose any compact/efficiency analysis flags without changing execution boundaries.
- `tests/evolution.test.ts` / `tests/cli-evolution.test.ts` — prove compactness, preserved control fields, leak safety, and measured ratios.
- `docs/EVOLUTION_LOOP.md` / `README.md` / related evidence docs — document benchmark-neutral workflow-control efficiency claims.
- `.osc/plans/active/150-open-scaffold-efficiency-reset.md` — trace this slice.

## Acceptance criteria

- [ ] Efficiency is explicitly defined in code and docs as controller signal per report/evidence overhead, with no benchmark or model-intelligence claim.
- [ ] A local public-safe harness reports before/after metrics including output bytes per useful decision field, evidence bytes per action recommendation, token/cost telemetry completeness, blind retries prevented, next-action packet compactness, analyze-to-recommendation steps, and required-control-field ratio.
- [ ] Compact/default analysis output is materially smaller while preserving required control fields, missing-current criteria, boundary notes, and safe evidence refs.
- [ ] Retry recommendations require a measurable repair hypothesis and no-op/blind retry fixtures are routed away from blind continuation.
- [ ] Tests prove private/unsafe refs do not leak and stop/redesign/inspect/continue recommendations remain boundary-safe.
- [ ] Any 1.5x efficiency result is computed by code from before/after artifacts, not asserted manually.
- [ ] The efficiency harness finds at least 10 additional measured full-to-compact controller targets that preserve required fields and clear the 1.5x byte-reduction threshold, or reports the miss explicitly.

## Verification steps

1. `git diff --check` — no whitespace errors.
2. `npm run build` — TypeScript builds for core and runtime package.
3. `npm test` — vitest suite passes.
4. `./verify.sh --strict` — repo verification gate passes.
5. Run the efficiency harness command added by this slice — report numeric before/after and whether 1.5x is achieved.

## Open questions

- None for implementation. If metrics do not prove 1.5x, report the miss bluntly instead of stretching the claim.
