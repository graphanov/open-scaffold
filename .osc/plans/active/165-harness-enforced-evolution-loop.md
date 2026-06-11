# Plan: 165-harness-enforced-evolution-loop

## Status

active

## Context

The harness-bench pilot-2 campaign (2026-06-11, results in the benchmark repo)
produced the first instrumented arm separation — against this product. The
scaffold arm failed both decision cells: it claimed complete five times against an
identical 7/8 plateau without ever running `osc evolve analyze`, left empty the
fields plateau detection consumes, and later reverted working code to satisfy a
stale requirement. The naked arm won both cells with plain requirement-questioning.
Root cause per the campaign report: the harness does its enforcement THROUGH the
model (agent hand-types telemetry, optionally runs analyze, judges its own work)
instead of AROUND it. This plan implements the product side of the fix; the
benchmark's enforced arm (arm D) tests it.

## Goal

The evolution loop earns its overhead without agent discretion: `osc evolve record`
auto-fills the delta telemetry plateau detection needs from linked evaluation
envelopes, and `osc evolve analyze` detects plateaus from AC-state fingerprints
alone and explicitly recommends questioning the requirement on zero-sensitivity
plateaus — verified by tests and consumable verbatim by an external coordinator.

## Constraints / Out of scope

- No changes to `osc` CLI command surface (no new commands; flags only where stated).
- No changes to init-generated agent-protocol templates in this plan (the
  question-the-requirement branch ships in analyze packet language and
  EVOLUTION_LOOP.md protocol text; template wording is follow-up work).
- No claim that this improves benchmark outcomes until the preregistered 4-arm
  experiment measures it (equal-prominence rule applies to a null result).

## Files to touch

- `src/evolution.ts` — record auto-fill (target_metric/actual_delta from linked
  evaluation envelopes when flags absent); analyze AC-fingerprint plateau
  detection; question-the-requirement language in the next-action packet.
- `tests/evolution-enforced.test.ts` (new) — coverage for all three behaviors.
- `tests/framework-cleanup-metric.test.ts` — LOC/file-count repin with rationale.
- `tests/section-parser.test.ts` — corpus hash repin (this plan file).
- `docs/EVOLUTION_LOOP.md` — enforced-loop coordinator protocol section.

## Acceptance criteria

- [ ] `osc evolve record --evaluation <env>` without `--target-metric`/`--actual-delta` stores `target_metric: accepted_ac_count` and `actual_delta` computed as current minus previous attempt's evaluation passCount (first attempt: delta vs 0), visible in attempts.jsonl.
- [ ] `osc evolve analyze` reports plateau when three or more consecutive attempts share an identical per-AC pass/fail fingerprint from linked evaluations, even when score, target_metric, and actual_delta are all absent.
- [ ] On a zero-sensitivity plateau (one or more criteria failing in every attempt with no observed delta), the analyze next-action packet recommends stop or redesign AND names the candidate criteria with explicit question-the-requirement language.
- [ ] New tests cover all three behaviors; `npm run build && npm test && ./verify.sh --strict && git diff --check` all green.

## Verification steps

1. `npx vitest run tests/evolution-enforced.test.ts` — new behaviors covered, green.
2. `npm run build && npm test && ./verify.sh --strict && git diff --check` — full chain green.
3. Benchmark-side (separate repo): harness-bench arm D consumes the analyze packet verbatim; its shakedown on the cell arm C failed demonstrates the packet reaching the worker prompt.

## Open questions

- None. (Whether enforcement closes the benchmark gap is the preregistered 4-arm experiment's question, not this plan's.)
