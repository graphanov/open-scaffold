# Evolution ledger demo

A small, public-safe fixture that shows the evolution loop end to end: three recorded attempts at the same plan, two promoted frontiers, one rejected middle attempt, and two evaluation envelopes in the default comparison. The compare output explains why `attempt-c` became the current frontier instead of `attempt-a`.

This demo is a recorded loop, not a live one. Open Scaffold records the loop state and evidence; it did not execute the attempts, did not rank models, and did not promote the frontier. The attempts were authored by hand to make the comparison reproducible and reviewable, and no implementation of the CSV importer is committed here.

The scenario is a contacts CSV importer that must parse quoted fields, report useful malformed-row errors, and strip a UTF-8 BOM from the first field. `attempt-a` became the first useful frontier, `attempt-b-prompt-rewrite` was rejected because it regressed BOM handling without fixing malformed-row errors, and `attempt-c` became the current frontier after fixing the row/column error reporting while preserving the other checks.

Default compare reads previous frontier vs current frontier, so the rejected middle attempt is recorded in `attempts.jsonl` but is not one side of the default comparison.

## Run the proof

From the repository root:

```bash
npm run osc -- evolve check examples/evolution-ledger-demo/.osc/evolution/reviewable-csv-importer
npm run osc -- evolve compare examples/evolution-ledger-demo/.osc/evolution/reviewable-csv-importer --format markdown
```

The markdown compare output should match [`docs/evidence/evolution-compare-expected.md`](docs/evidence/evolution-compare-expected.md). The expected file is committed so renderer or fixture drift shows up as a normal test diff instead of a silent documentation mismatch.

To regenerate the expected output after an intentional renderer change:

```bash
npm run osc -- evolve compare \
  examples/evolution-ledger-demo/.osc/evolution/reviewable-csv-importer \
  --format markdown \
  --out examples/evolution-ledger-demo/docs/evidence/evolution-compare-expected.md
```

Re-running `osc evolve compare` is read-only: it inspects `loop.json`, `attempts.jsonl`, `frontier.json`, run packets, and evaluation envelopes, then renders a comparison. Human maintainers still own taste, risk, merge, publish, and release decisions.

For the teaching walkthrough version, see [`docs/examples/evolution-loop-compare.md`](../../docs/examples/evolution-loop-compare.md).
