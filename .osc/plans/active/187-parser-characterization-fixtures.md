# Plan: 187-parser-characterization-fixtures

## Status

active

## Context

John Maintainer reproduced that adding a valid zero-issue plan or zero-warning evidence note fails the parser suite solely because moving live-corpus membership changes two hashes. Prior section maps and outcomes remain unchanged. This repeated friction makes honest ongoing work records require unrelated test edits; original plan 130's complete historical characterization must be preserved.

## Goal

Valid new work records and clean plan closures pass parser tests without golden-hash churn, while historical parser behavior and all unexpected live diagnostics remain strictly checked.

## Constraints / Out of scope

- Test-only implementation; no parser, validator, CLI, schema, dependency, shell verifier or public-document behavior changes.
- Preserve all 356 historical plan/release Markdown inputs from qualified tree `192509906ee59789d534f6ec8deaa8a0d8d5ed9d` (commit `6140a7bb1d40ecd226e7dcce07bbd6a49c613f16`), ordered complete canonical maps, 184 plan rows, 133 release rows, and both existing historical hashes.
- Live validation still visits every current document, rejects errors/scaffold failures, and compares complete nonempty plan issue/release warning rows exactly; do not filter warning severity, code, message, line, suggestion or path.
- Known diagnostic changes still require explicit review. The setup note 184 publication warning is preserved, not silently cleared.
- No auto-refresh of expected fixture data during tests, sampled replacement corpus, blanket warning allowance, or runtime/package publication.

## Files to touch

- `tests/section-parser.test.ts` — fixed historical characterization and diagnostic live validation with meaningful mutation controls.
- `tests/fixtures/section-parser-corpus/v1/corpus.json` — full immutable historical raw inputs, ordered maps, outcome rows and provenance/digests.
- `tests/fixtures/section-parser-corpus/v1/README.md` — source identity, reviewed generation and integrity policy.
- `tests/fixtures/section-parser-corpus/live-diagnostics.json` — explicit full known nonempty live diagnostics.

## Acceptance criteria

- [ ] Full historical fixture membership and bytes match the qualified source; complete ordered section bodies and both existing validation outcome hashes remain pinned and checked.
- [ ] Existing recognition/fence/CRLF/order/line-number tests remain; deliberate fence regression, body loss and fixture omission/tampering are detected by characterization even if validator errors remain empty.
- [ ] Disposable valid plan/evidence additions and clean status-aligned closure pass without expected-data changes; valid new canonical fenced/ATX/CRLF documents pass live validation.
- [ ] New errors, stage/status mismatch, vague-goal warnings or missing release sections fail the live checks with readable full diagnostic/path differences; known warning rows remain exact.
- [ ] Only the four test-fixture paths change after admission; targeted tests, strict verification, both builds, full tests and fresh independent current-head/scope review precede publication.

## Verification steps

1. Independently compare fixture bytes/membership/maps/outcomes to the recorded qualified Git tree; verify original two hash constants are unchanged.
2. `npm test -- tests/section-parser.test.ts` exercises real positive/negative fixture/live mutation controls; save failed-first and final results.
3. `./verify.sh --strict`, `npm run build`, `npm test` pass on unchanged committed candidate, including maintained-source and dependency gates.
4. Fresh independent Overwatch inspects actual complete publication scope; current-head GitHub checks and effect readback precede delegated merge.

## Open questions

- Full raw inputs add about 1.37 MB plus expected maps as a test fixture. This bounded repository cost preserves historical coverage and adds no shipped runtime dependency.
