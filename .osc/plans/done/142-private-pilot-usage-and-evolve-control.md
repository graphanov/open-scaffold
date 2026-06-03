# Plan: 142-private-pilot-usage-and-evolve-control

## Status

done

## Context

A private structured-workflow A/B pilot tied final mechanical output while the workflow lane consumed materially more tokens. The useful product lesson is generic: Open Scaffold needs attempt-level usage receipts and controller-grade repair hypotheses so repeated attempts can be judged by measurable deltas, plateau state, and cost instead of evidence volume or ceremony.

## Goal

Add a narrow generic repair slice: evolution attempts can record a measurable repair hypothesis plus nullable token/cost usage, and `osc evolve analyze` reports target metric, expected gain, actual delta, token cost, plateau/stagnation, and stop/redesign guidance without coupling to any benchmark.

## Constraints / Out of scope

- Do not add benchmark-specific contracts or scorer rules.
- Do not claim Open Scaffold makes models smarter, improves benchmark scores, or has public support from a private pilot.
- Do not spawn runtimes or make Open Scaffold core a controller.
- Do not implement the full usage-ledger backlog in this slice.
- Do not publish, release, push, merge, or open a PR.

## Files to touch

- `src/evolution.ts` — attempt metadata, validation, comparison, and analysis rendering.
- `src/cli.ts` — CLI flags for repair hypothesis and usage metadata.
- `tests/evolution.test.ts` — model-level coverage.
- `tests/cli-evolution.test.ts` — CLI coverage.
- `docs/EVOLUTION_LOOP.md` — generic usage/hypothesis contract and non-claim wording.
- `docs/WHY_OPEN_SCAFFOLD.md` or `README.md` if needed — clarify workflow-value boundary without public proof claims.

## Acceptance criteria

- [ ] `osc evolve record` accepts a required explicit rationale as before and optional repair-hypothesis fields: target metric, expected measurable gain, actual delta, and hypothesis text.
- [ ] `osc evolve record` accepts nullable usage fields for total tokens and estimated USD without requiring prompt bodies or raw transcripts.
- [ ] `osc evolve analyze` JSON and rendered reports show target metric, expected gain, actual delta, token cost, plateau/stagnation, score sensitivity, and recommendation.
- [ ] Validation fails closed for unsafe/private refs and malformed numeric usage metadata.
- [ ] Docs state usage/hypothesis data is decision support, not proof of correctness, benchmark victory, approval, or model intelligence.

## Verification steps

1. `npm test -- --run tests/evolution.test.ts tests/cli-evolution.test.ts` — focused coverage passes.
2. `npm run build` — TypeScript build passes.
3. `git diff --check` — whitespace gate passes.
4. `./verify.sh --strict` — repository verifier passes or any unrelated pre-existing blocker is documented.

## Open questions

- Should the broader `osc ledger` backlog become the next slice after this attempt-level telemetry lands?
