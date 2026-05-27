# Attempt comparison: attempt-a → attempt-b

| Field | Attempt A | Attempt B | Δ |
|---|---|---|---|
| Path | `examples/attempt-compare/attempt-a` | `examples/attempt-compare/attempt-b` | — |
| Rationale present | yes | yes | — |
| Diff summary | docs/onboarding.md (2+/1-) | docs/onboarding.md (3+/1-) | additions +1, deletions 0 |
| User-provided score (human reviewer score; not automatic benchmark) | 0.62 | 0.91 | +0.29 ▲ |
| Transcript captured | 156 bytes | 147 bytes | metadata only |

## Summary

- Changed files: `docs/onboarding.md`
- Scores are user-provided judgment metadata when present; Open Scaffold does not auto-rank or benchmark attempts.
- This command reads local files only. It does not spawn runtimes, promote a frontier, or approve work.

## Rationale

**A:** Attempt A improved the onboarding note, but it still reads like a checklist and does not explain what evidence a reviewer should inspect.

**B:** Attempt B keeps the concrete onboarding path and adds the missing evidence-review step, so the reviewer can connect the PR to plan acceptance criteria.

## Acceptance criteria delta

| Criterion | A | B |
|---|---|---|
| AC1 — Names the first file a cold agent should inspect. | ✓ pass | ✓ pass |
| AC2 — Explains which evidence a reviewer should inspect. | ✗ fail | ✓ pass ▲ |

## Diff files

- Only in A: —
- Only in B: —
- In both: `docs/onboarding.md`
