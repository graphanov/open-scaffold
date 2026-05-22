# Evolution loop: reviewable-csv-importer — A vs B

**Comparing:** `attempt-a` (promote) → `attempt-c` (promote, current frontier)

| Field | A | B | Δ |
|---|---|---|---|
| Decision | promote | promote | — |
| Score | 0.62 | 0.94 | +0.32 ▲ |
| Run ID | attempt-a | attempt-c | changed |
| Evidence files | 2 | 2 | 0 |
| Evaluation envelope | ✓ | ✓ | — |

## Rationale

**A (promote):** First useful baseline; AC2 still returns a generic error. Promoted to set the frontier so improvement attempts can be measured against it.

**B (promote):** Promoted to current frontier. AC2 now reports row and column of the offending token; AC1 and AC3 remain passing. Operator promoted after manual review of the evaluation envelope.

## Acceptance criteria delta

| Criterion | A | B |
|---|---|---|
| AC1 — Quoted fields with embedded commas parse correctly. | ✓ pass | ✓ pass |
| AC2 — Malformed rows return an error that identifies the row and column of the offending token. | ✗ fail | ✓ pass ▲ |
| AC3 — UTF-8 BOM is stripped and does not leak into the first parsed field. | ✓ pass | ✓ pass |

## Evidence files

- Only in A: `docs/evidence/attempt-a-proof.md`, `docs/evidence/attempt-a-evaluation.json`
- Only in B: `docs/evidence/attempt-c-proof.md`, `docs/evidence/attempt-c-evaluation.json`
- In both: —

## Frontier history

- `attempt-a` → promote (0.62) ← A
- `attempt-c` → promote (0.94) ← B/current
