# Plan: reviewable-csv-importer

## Status

active

## Context

A contacts CSV importer needs repeated attempts before it is reviewable enough to merge. This fixture records the ledger state only; no importer implementation is committed here.

## Goal

Make the contacts CSV importer reviewable across repeated attempts.

## Constraints / Out of scope

- Do not spawn runtimes from Open Scaffold core.
- Do not rank models or agents.
- Do not treat the frontier as merge, publish, or release approval.
- Keep the fixture public-safe and small.

## Files to touch

- `docs/evidence/attempt-a-proof.md` — baseline attempt evidence.
- `docs/evidence/attempt-b-prompt-rewrite-proof.md` — rejected prompt-rewrite evidence.
- `docs/evidence/attempt-c-proof.md` — promoted frontier evidence.

## Acceptance criteria

- [ ] Quoted fields with embedded commas parse correctly.
- [ ] Malformed rows return an error that identifies the row and column of the offending token.
- [ ] UTF-8 BOM is stripped and does not leak into the first parsed field.

## Verification steps

1. `osc evolve check .osc/evolution/reviewable-csv-importer`
2. `osc evolve compare .osc/evolution/reviewable-csv-importer --format markdown`

## Open questions

- None for the fixture.
