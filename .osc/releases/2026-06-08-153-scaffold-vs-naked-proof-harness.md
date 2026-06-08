# Evidence: 153-scaffold-vs-naked-proof-harness

## Summary

Added a bounded proof harness for source-labeled scaffolded-vs-control comparisons:

- New CLI: `osc prove check <manifest.json>` and `osc prove compare <manifest.json> [--format terminal|markdown|json]`.
- New schemas: `open-scaffold.proof-comparison.v1`, `open-scaffold.proof-comparison-result.v1`, `open-scaffold.proof-receipt.v1`, and `open-scaffold.proof-aggregate.v1`.
- New shipped fixture: `examples/proof/scaffold-vs-naked-codex/manifest.json` with prompts, final answers, per-run receipts, aggregate receipt, and copied public-safe evolution source refs.
- New doc: `docs/PROOF_HARNESS.md` plus README / evidence / evolution / FAQ / command-maturity positioning.

## Outcome

Open Scaffold now has a bounded proof harness and a checked-in scaffolded-vs-naked-Codex fixture. The framework still does not claim universal superiority; it now has an inspectable way to compare source-labeled receipts for a specific task.

## Traceability

- Plan: `.osc/plans/done/153-scaffold-vs-naked-proof-harness.md`
- Proof fixture: `examples/proof/scaffold-vs-naked-codex/manifest.json`
- Proof CLI: `src/compare.ts` + `src/cli.ts`
- Proof docs: `docs/PROOF_HARNESS.md`
- Tests: `tests/proof.test.ts`, `tests/package-payload.test.ts`, `tests/public-positioning.test.ts`, `tests/cli-lifecycle-help.test.ts`

## Approval decision

Status: `approved`
Approver: implementation evidence gate (local)
Rationale: The harness is bounded, source-labeled, test-covered, and does not claim universal model/task superiority.

## Bounded proof result

Command:

```bash
npm run osc -- prove compare examples/proof/scaffold-vs-naked-codex/manifest.json --format markdown
```

Observed report highlights:

| Metric | Naked Codex/raw artifacts | Open Scaffold compact signal | Result |
|---|---:|---:|---|
| Prompt payload | 15,225 bytes | 1,308 bytes | scaffolded is 11.639908× smaller |
| Median Codex-reported total tokens | 35,380 | 31,635 | scaffolded is 1.118382× lighter |
| Median wall-clock time | 11.087 s | 10.469 s | scaffolded is 1.059031× faster |
| Median decision quality | 5/5 | 5/5 | tied; no quality regression |
| Decision quality per 1k Codex tokens | 0.141323 | 0.158053 | scaffolded is 1.118381× better |
| Evolution-loop frontier delta | 0 | +1 accepted criterion | scaffolded records improvement over repeated attempts |

The report passes for this fixture because Open Scaffold preserved decision quality, reduced prompt payload, reduced median Codex token receipt, reduced median wall time, and supplied an evolution-loop improvement record.

## Verification

- `npm run osc -- prove check examples/proof/scaffold-vs-naked-codex/manifest.json` — PASS, 0 warnings
- `npm run osc -- prove compare --format markdown examples/proof/scaffold-vs-naked-codex/manifest.json --out /tmp/scaffold-vs-naked-proof.md` — PASS, report written
- `./verify.sh --strict` — PASS (10 pass, 0 fail, 0 warn)
- `npm test -- --run` — PASS (44 files, 488 tests)
- `npm run build` — PASS
- `npm run osc -- doctor --check secret-scan` — PASS
- Independent review after fixes — PASS; checked source refs, proof CLI argument handling, public fixture paths, and proof tests/build.

## Caveats / boundaries

- This is one bounded cold-resume evolution-loop decision fixture, not proof that Open Scaffold wins every task.
- Open Scaffold did not spawn Codex; Codex was run manually/read-only and the framework compared receipts.
- Raw private stdout/stderr stayed under ignored `.osc/research/`; only sanitized public-safe prompts, answers, receipts, and aggregate metrics are committed.
- Codex token receipts were noisy across replicates, so the fixture reports prompt payload bytes and median Codex-reported total tokens separately.
- This evidence does not authorize merge, publish, npm release, or GitHub Release updates.

## Next-slice bootstrap prompt

Continue from `graphanov/open-scaffold` after PR merge. Inspect `docs/PROOF_HARNESS.md`, `examples/proof/scaffold-vs-naked-codex/manifest.json`, and the merged PR discussion. Next useful slice: add a small `osc prove summarize` or fixture-generation helper only if repeated proof runs need a safer way to produce sanitized receipts; otherwise collect another independent fixture before broadening any public claims.
