# Amendment 1: 163-proof-harness-v2

## Parent

163-proof-harness-v2

## Date

2026-06-10

## Learning

Three things got clearer since the plan was committed. First, the evolve loop is the undersold feature: the 2000m v1 postmortem showed both lanes burning five blind generations past a plateau because nothing flagged it, and `osc evolve analyze` now detects exactly that (plateau, probe-only/impossible ACs, stop/redesign recommendations) — so the retry-trap benchmark is not just a measurement, it is the evolve showcase, with the postmortem as the documented before-picture. Second, benchmark results should not be only code and text: a visual substrate (a game) makes blinded judging tangible, gives multi-slice a product shape, and produces demoable output — and the 2000m postmortem already prescribed a replay/viewer track for headless artifacts. Third, the owner currently runs on a Claude subscription with no API credits, so cost is measured in captured token counts, not billed dollars.

## New direction

Three preregistered mechanism benchmarks — cold-resume, retry-trap, multi-slice — run on one shared visual substrate: a seeded canvas game with a deterministic event-log replay format, specified and scored in an independent benchmark repo (per the 2026-06-01 correction: open-scaffold hosts no benchmark-specific fixtures or scorers). Three arms per benchmark: A naked model, B naked plus a one-page minimal checklist (the control the June 3 reset doc called for), C open-scaffold with the evolve loop driving record/analyze/stop decisions. Execution lane: Claude headless (`claude -p`) on the owner's subscription. Every run captures token usage from the CLI's JSON usage fields, wall time, turn count, and completion state into committed receipts; mechanical ACs score only from deterministic replays, aesthetic quality goes only to a blinded vision judge over screenshots; results render in a replay viewer and comparison dashboard, not just tables.

## Impact on acceptance criteria

- AC1 (cold-resume), AC2 (retry-trap), AC3 (multi-slice): intent unchanged; all three now share the seeded-game substrate and run three arms instead of two (adds the minimal-checklist control, resolving that open question). AC2 additionally reports the scaffold arm's `osc evolve analyze` recommendation trace alongside tokens-before-correct-stop.
- AC4 (raw data traceability): unchanged; receipts JSONL additionally records `usage_source: claude-cli-subscription` and omits billed USD rather than inventing it — token counts are the budget metric, consistent with the evolution-loop usage contract.
- AC5 (README headline numbers): unchanged.
- Files to touch deviates: benchmark fixtures, scorer, preregistration, runner, and dashboard live in the independent benchmark repo (`harness-bench`), not `examples/proof/`; open-scaffold keeps `src/usage.ts`, generic receipt-ingestion glue, and `docs/PROOF_HARNESS.md`.
- Open questions resolved: minimal-checklist control arm is in; lane is Claude-first (codex/OMX lane deferred); judge model decision deferred to preregistration review before any scored run.
