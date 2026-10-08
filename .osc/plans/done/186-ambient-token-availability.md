# Plan: 186-ambient-token-availability

## Status

done

## Context

John Maintainer independently corroborated the previously prepared task 183 defect: absent or partial Claude/Codex transcript token usage becomes fabricated zero or a complete-looking partial total. This corrupts budget facts carried into ambient work records and later handoffs. The six-day owner delegation now permits a bounded native Codex repair.

## Goal

Ambient capture and handoff records preserve missing token measurements as unavailable while retaining explicitly reported zero and complete authoritative totals.

## Constraints / Out of scope

- Preserve the existing numeric/null schema, CLI shape, complete fixture totals and vendor-neutral work-record boundary.
- Claude split aggregates require a valid report of that split on every counted assistant turn; a gap poisons only that aggregate to null, and total needs all four complete disjoint splits.
- Codex uses the latest cumulative snapshot with no older-field salvage or missing-total fallback. Only explicit finite nonnegative total_tokens is authoritative, including zero.
- Partial observed split usage may remain available while a complete runtime total is unavailable; document that distinction without inventing monetary cost.
- No new provider calls, transcript collection, package publication, releases or changes to authority/evaluation definitions.

## Files to touch

- `src/capture.ts` — honest Claude per-field coverage and Codex cumulative snapshot extraction.
- `src/ambient.ts` — no runtime-total construction from incomplete or invalid splits.
- `tests/capture.test.ts` — absent, empty, partial, mixed, zero, invalid and latest-snapshot regressions.
- `docs/CAPTURE.md` — explain partial usage versus unavailable total and provider semantics.

## Acceptance criteria

- [x] Absent/empty Claude usage and empty transcripts preserve null splits/unavailable total instead of measured zero. | Evidence: .osc/releases/2026-10-08-186-ambient-token-availability.md
- [x] Each Claude split aggregates only with complete valid assistant-turn coverage; mixed gaps remain unavailable, explicit complete zeros remain zero and complete fixture total 18070 is preserved. | Evidence: .osc/releases/2026-10-08-186-ambient-token-availability.md
- [x] Codex latest cumulative snapshot preserves missing split/total nulls and explicit total including zero; no input/output fallback or stale-field salvage; existing complete fixture total 5750 is preserved. | Evidence: .osc/releases/2026-10-08-186-ambient-token-availability.md
- [x] Direct ambient builder preserves incomplete/invalid usage as unavailable total; genuinely complete valid splits can still produce a total. | Evidence: .osc/releases/2026-10-08-186-ambient-token-availability.md
- [x] Tests cover records and trust-report availability, documentation distinguishes partial from complete measurements, and strict verification/build/full tests plus independent current-head review precede publication. | Evidence: .osc/releases/2026-10-08-186-ambient-token-availability.md

## Verification steps

1. Reproduce synthetic absent, empty, partial, mixed, invalid, explicit-zero and complete cases against exported pure functions; assert values and availability.
2. `npm test -- tests/capture.test.ts` passes targeted regressions without modifying existing complete fixture expectations.
3. `./verify.sh --strict`, `npm run build`, `npm test` pass on the committed candidate; fresh independent review examines the unchanged head.
4. Read back actual GitHub issue/PR, current-head checks and delegated merge; preserve failed attempts separately.

## Open questions

- Some runtimes omit otherwise-zero split fields. This repair treats omission as unknown because the supplied transcript is not evidence of a measured zero; no undocumented inference is used.
