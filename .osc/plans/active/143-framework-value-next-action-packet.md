# Plan: 143-framework-value-next-action-packet

## Status

active

## Context

The private framework-value reset found that prior slices already added repair hypotheses, usage receipts, plateau/impossible-criteria analysis, external scorer import, and compact evidence. The remaining generic control gap is handoff/recovery: `osc evolve analyze` recommends an action, but it does not emit a compact next-action packet that a fresh human, agent, or coordinator can use after context loss.

## Goal

Add a compact, benchmark-neutral next-action packet to `osc evolve analyze` so repeated-attempt loops produce controller-grade handoff guidance without runtime spawning or public proof claims.

## Constraints / Out of scope

- Do not add benchmark-specific contracts, fields, scorer rules, or 2000m assumptions.
- Do not claim Open Scaffold makes models smarter, improves benchmark scores, or has benchmark support.
- Do not spawn runtimes, select models, approve work, publish, release, push, open a PR, merge, or tag.
- Do not add dependencies.
- Keep the diff reviewable and focused on evolution analysis/handoff output.

## Files to touch

- `src/evolution.ts` — add next-action packet data model, synthesis, and terminal/markdown/JSON rendering.
- `tests/evolution.test.ts` — cover packet content for redesign and stop/handoff cases.
- `tests/cli-evolution.test.ts` — cover CLI JSON/markdown packet output.
- `docs/EVOLUTION_LOOP.md` — document the packet as decision support, not execution/control proof.
- `.osc-dev/framework-value-reset-2026-06-03.md` — private investigation report and evidence log for this reset.
- `.omx/interviews/` and `.omx/state/` — Ralph PRD/interview/progress artifacts for this session.

## Implementation Architecture Coverage

- Strengthens: workflow control, handoff/recovery, stop/redesign decisions, token-efficiency pressure, and audit trails.
- Audit envelope: this plan, `.omx/plans/prd-framework-value-reset.md`, `.osc-dev/framework-value-reset-2026-06-03.md`, changed code/tests/docs, and final verification command output.
- Evaluation envelope: unit/CLI tests must prove the packet carries action, reasons, resume point, remaining criteria, required next fields, evidence refs, and boundary notes.
- Feedback routing: packet actions route to stop, inspect_scorer, redesign, or continue; it must say what evidence or fields are missing before another retry.
- Boundary: no runtime enforcement, benchmark certification, score approval, model ranking, or production release authority.

## Acceptance criteria

- [ ] `analyzeEvolutionLoop` JSON includes a compact `nextActionPacket` derived from current analysis evidence.
- [ ] The packet includes recommended action, reasons, resume/current/frontier attempt ids, plateau state, acceptance counts, remaining failing criteria, safe evidence refs, required next fields, and boundary notes.
- [ ] Terminal and markdown `osc evolve analyze` output render the packet in a concise handoff section.
- [ ] Tests show redesign packets block blind retry and stop packets route to human closeout without treating frontier score as approval.
- [ ] Docs describe the packet as handoff/decision support, not a runtime spawner, benchmark claim, approval authority, or model-improvement proof.
- [ ] Full verification passes: `git diff --check`, `npm run build`, `npm test`, and `./verify.sh --strict`.

## Verification steps

1. `npm test -- --run tests/evolution.test.ts tests/cli-evolution.test.ts` — focused packet and regression coverage passes.
2. `git diff --check` — no whitespace errors.
3. `npm run build` — TypeScript builds for core and runtime package.
4. `npm test` — full Vitest suite passes.
5. `./verify.sh --strict` — repository compliance passes.

## Open questions

- None for this slice. Broader native controller behavior remains out of scope until independent evidence shows a need and boundary decision.
