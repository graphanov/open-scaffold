# Plan: 163-proof-harness-v2

## Status

active

## Context

Phase 3 of the 2026-06-10 harness-identity pivot (see plan 161). The current proof fixture measures one task at three replicates with a checkbox scorer and byte-count proxies, and its proof gate is sized beyond what the owner will fund, so the verdict is permanently stuck at partially_reproduced. The owner's private A/B already showed the general claim ("scaffold beats naked AI on any task") is not winnable. The harness can win on three specific mechanisms instead, and those are the claims worth proving. Folds in the intent of backlog plan 114 (work usage ledger) for real token accounting.

## Goal

Three preregistered, reproducible benchmarks with real API token accounting and blinded judging show where the harness wins — cold-resume cost, retry-discipline savings, and long-horizon multi-slice quality/reviewability — producing numbers honest enough to put in the README.

## Constraints / Out of scope

- No general "beats naked AI" claim: each result states its boundary (task family, n, judge protocol) once.
- Token accounting comes from provider API usage fields captured per run, not stdout byte counts.
- Quality judging: blinded LLM judge with a written rubric plus owner spot-check on a sample; judge prompts and raw outputs ship with the results.
- Preregistration: task list, metrics, and pass thresholds are committed before any scored run; no post-hoc fixture selection.
- Budget honesty: the design must be runnable for single-digit dollars per benchmark arm; if a credible design needs more, the plan stops and reports that instead of shrinking n silently.

## Files to touch

- `src/bench.ts` — three benchmark modes: cold-resume, retry-trap, multi-slice.
- `src/usage.ts` (new, folds plan 114) — per-run token/cost ledger from adapter receipts.
- `examples/proof/` — replace the single fixture with the three preregistered task sets.
- `docs/PROOF_HARNESS.md` — methodology, boundaries, and how to reproduce.
- `.osc/bench/` — raw JSONL results committed per run.

## Acceptance criteria

- [ ] Cold-resume benchmark: n>=5 tasks interrupted mid-work, naked-vs-packet resume arms, reporting tokens-to-completion, completion rate, and judged quality with raw data committed.
- [ ] Retry-trap benchmark: n>=5 tasks containing an impossible or flaky acceptance criterion, reporting tokens spent before a correct stop/redesign decision per arm.
- [ ] Multi-slice benchmark: at least one 5-slice project run per arm across fresh sessions, reporting total tokens, judged final quality, and a timed third-party reviewability check.
- [ ] Every reported number traces to committed raw JSONL plus the preregistration file.
- [ ] README cites at most three headline numbers, each linking to its boundary statement.

## Verification steps

1. Rerun each benchmark from its preregistration with a clean checkout; numbers reproduce within stated variance.
2. `osc verify --evidence-chain` passes over the benchmark evidence.
3. Independent read: a reader can go from README number to raw data in two clicks.

## Open questions

- Judge model choice and whether two judge models are needed for agreement checks.
- Whether the naked arm gets a minimal-checklist variant as a second control (the June 3 reset doc suggests it should).
- Which adapter(s) constitute the proof arms first: codex only, or codex plus claude.
