# Plan: 173-codex-token-efficiency-proof

## Status

done

## Context

The shipped scaffold-vs-naked Codex fixture proves prompt payload shrinkage but
only a 1.118382x median Codex-reported total-token reduction. The current goal is
stronger and narrower: prove a bounded Codex cold-resume lane is at least 2x more
token efficient when it consumes an Open Scaffold compiled packet instead of raw
session/work-record artifacts.

## Goal

Add a source-labeled Codex cold-resume proof fixture and proof-gate support that
mechanically rejects the claim unless scaffolded Codex preserves decision quality
and uses at least 2x fewer Codex-reported total tokens than the naked Codex lane.

## Constraints / Out of scope

- Do not claim universal Open Scaffold dominance or broad workload superiority.
- Do not infer token usage from bytes when live Codex usage receipts are missing.
- Keep live raw logs sanitized into committed receipts; do not commit private
  Codex session files or local runtime state.
- This slice does not publish npm, create a GitHub release, or approve merge.

## Files to touch

- `src/compare.ts` - enforce optional minimum improvement ratios in proof
  manifests.
- `tests/proof.test.ts` - cover pass and fail behavior for 2x threshold claims.
- `examples/proof/codex-token-efficient-resume/` - bounded prompts, answers,
  receipts, aggregate, and manifest for the live Codex proof.
- `docs/PROOF_HARNESS.md`, `README.md`, `docs/FAQ.md` - state the new bounded
  claim and its limits.
- `tests/public-positioning.test.ts`, `tests/package-payload.test.ts` - keep
  public docs and package fixtures aligned.

## Acceptance criteria

- [x] `osc prove compare examples/proof/codex-token-efficient-resume/manifest.json --format markdown` reports PASS with a token metric ratio of at least 2x. Evidence: `examples/proof/codex-token-efficient-resume/manifest.json`, `examples/proof/codex-token-efficient-resume/receipts/aggregate.json`, `.osc/releases/2026-06-18-173-codex-token-efficiency-proof.md`.
- [x] If a proof manifest sets a minimum ratio that is not met, `compareProofManifest` marks the bounded proof as failed/inconclusive. Evidence: `src/compare.ts`, `tests/proof.test.ts`, `.osc/releases/2026-06-18-173-codex-token-efficiency-proof.md`.
- [x] The new fixture's live Codex receipts are source-labeled, committed, and include enough usage data to recompute the medians. Evidence: `examples/proof/codex-token-efficient-resume/receipts/aggregate.json`, `examples/proof/codex-token-efficient-resume/receipts/control-r1.json`, `examples/proof/codex-token-efficient-resume/receipts/scaffolded-r1.json`.
- [x] Public docs say exactly what the 2x fixture proves and what it does not prove. Evidence: `docs/PROOF_HARNESS.md`, `docs/SCHEMA_REGISTRY.md`, `examples/proof/codex-token-efficient-resume/evidence/human-reviewer-replication-boundary.md`, `examples/proof/codex-token-efficient-resume/evidence/controlled-ablations-boundary.md`.
- [x] Targeted tests and the full project test suite pass. Evidence: `tests/proof.test.ts`, `tests/package-payload.test.ts`, `.osc/releases/2026-06-18-173-codex-token-efficiency-proof.md`.

## Verification steps

1. Run the live paired Codex fixture and recompute `receipts/aggregate.json`.
2. Run `npm test -- tests/proof.test.ts tests/public-positioning.test.ts tests/package-payload.test.ts`.
3. Run `npm test`.
4. Run `npm run build`.

## Open questions

- The first live pair decides whether the raw-control prompt needs to grow before
  the three-replicate median can honestly clear 2x.
