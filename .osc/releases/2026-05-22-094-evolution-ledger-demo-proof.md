# Release / Evidence Note: 094-evolution-ledger-demo-proof

## Summary

Plan 094 adds a runnable evolution-ledger demo proof under `examples/evolution-ledger-demo/`. The fixture records a small public-safe CSV-importer scenario with three attempts, a rejected non-frontier attempt, two promoted frontiers, evaluation envelopes, and a committed expected `osc evolve compare` markdown report.

The slice keeps Open Scaffold's boundary intact: the demo records and renders loop state only. It does not launch agents, rank models, certify compliance, approve a merge, publish a package, or create a GitHub Release.

## Traceability

- Roadmap / issue / task: Kanban `open-scaffold` task `t_79a23c8a`; roadmap direction after `v0.4.13` evolution-loop comparison visibility.
- Plan: `.osc/plans/done/094-evolution-ledger-demo-proof.md`
- Run ID / run packet: `N/A` for this evidence note; the public fixture itself contains demo run packets under `examples/evolution-ledger-demo/.osc/runs/`.
- Branch / PR: `docs/evolution-ledger-demo-proof`; PR pending at evidence-note creation and owner-gated before merge.

## How to inspect

Primary fixture files:

- `examples/evolution-ledger-demo/README.md` — scenario, boundaries, and commands.
- `examples/evolution-ledger-demo/.osc/plans/active/reviewable-csv-importer.md` — nested fixture plan and acceptance criteria.
- `examples/evolution-ledger-demo/.osc/runs/attempt-a/run.json`
- `examples/evolution-ledger-demo/.osc/runs/attempt-b-prompt-rewrite/run.json`
- `examples/evolution-ledger-demo/.osc/runs/attempt-c/run.json`
- `examples/evolution-ledger-demo/.osc/evolution/reviewable-csv-importer/loop.json`
- `examples/evolution-ledger-demo/.osc/evolution/reviewable-csv-importer/attempts.jsonl`
- `examples/evolution-ledger-demo/.osc/evolution/reviewable-csv-importer/frontier.json`
- `examples/evolution-ledger-demo/docs/evidence/*-evaluation.json`
- `examples/evolution-ledger-demo/docs/evidence/evolution-compare-expected.md`

Docs pointers added lightly from:

- `README.md`
- `docs/EVOLUTION_LOOP.md`
- `docs/EXAMPLES.md`
- `docs/examples/README.md`
- `docs/examples/evolution-loop-compare.md`

## Verification

Already run before closeout evidence was written:

- `git diff --check` — passed.
- `npm test -- --run tests/evolution.test.ts tests/cli-evolution.test.ts` — passed: 2 files, 31 tests.
- `npm test -- --run` — passed: 32 files, 295 tests.
- `npm run build` — passed (`build:core` and `build:runtime-omx`).
- `npm run osc -- evolve check examples/evolution-ledger-demo/.osc/evolution/reviewable-csv-importer` — passed: `PASS evolution loop structure valid; 0 warning(s)`.
- `npm run osc -- evolve compare examples/evolution-ledger-demo/.osc/evolution/reviewable-csv-importer --format markdown --out /tmp/osc-094-compare-direct.md && diff -u examples/evolution-ledger-demo/docs/evidence/evolution-compare-expected.md /tmp/osc-094-compare-direct.md` — passed.
- Read-only Opus pre-PR review over compact diff corpus — verdict `PASS`; one non-blocking README clarification and one boundary assertion were applied, then verification reran.

Final branch verification after evidence note and plan closeout:

- `git diff --check` — passed.
- `npm test -- --run tests/evolution.test.ts tests/cli-evolution.test.ts` — passed: 2 files, 31 tests.
- `npm test -- --run` — passed: 32 files, 295 tests.
- `npm run build` — passed (`build:core` and `build:runtime-omx`).
- `./verify.sh --strict` — passed: 10 pass, 0 fail, 0 warn.
- `npm run osc -- verify` — passed with 3 pre-existing warnings outside this slice: `093` release-note traceability shape and backlog `062` run-id/release-summary hygiene.

## Outcome

The repo now contains a concrete proof artifact for the evolution-ledger wedge. A skeptical reader can inspect real fixture bytes, run `osc evolve check`, render `osc evolve compare --format markdown`, and see why `attempt-c` became the current frontier over `attempt-a` through a fail-to-pass acceptance-criteria delta.

No npm publish, GitHub Release, Control Room automation change, runtime adapter work, BMAD/spec-kit comparison rewrite, or broad README repositioning is included.

## Follow-up

- Open the focused PR, trigger/poll Codex review, and resolve any actionable latest-head findings.
- Owner approval is required before merge.
- Optional future slice after review: record a short screencast/video using this fixture, but only after the repo proof is accepted.
