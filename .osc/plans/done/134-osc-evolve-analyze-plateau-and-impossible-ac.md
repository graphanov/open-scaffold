# Plan: 134-osc-evolve-analyze-plateau-and-impossible-ac

## Status

done

## Context

A local 2000m v1 two-lane run showed that `osc evolve compare` could be technically valid but operationally unhelpful: useful generations often rendered “only one attempt recorded” or “no previous frontier/current frontier comparison is recorded yet.” The same run plateaued after generation 2 while AC28 was probe-only and could not mechanically pass. The loop recorded evidence but did not explain that another generation could not improve the pass count.

## Goal

Add a read-only `osc evolve analyze` capability that turns existing loop, evaluation, and optional scorer evidence into a clear plateau, failing-criteria, score-sensitivity, and next-action report.

## Constraints / Out of scope

- Do not spawn runtimes, run agents, or mutate loop state.
- Do not claim model ranking, benchmark victory, compliance certification, or approval.
- Do not require 2000m-specific logic for the generic command; benchmark-specific hints should enter through adapter metadata or optional scorer evidence.
- Do not break current `osc evolve init`, `record`, `check`, or `compare` behavior.
- Do not import raw logs or private/local paths into committed reports.

## Files to touch

- `src/evolution.ts` — analysis data model, plateau detection, score deltas, AC delta rendering, and recommendation logic.
- `src/cli.ts` — `osc evolve analyze <loop-dir>` help, flags, JSON/markdown/terminal output, and safe exit behavior.
- `tests/evolution.test.ts` — unit coverage for plateau, impossible/probe-only ACs, AC deltas, and non-mutating behavior.
- `tests/cli-evolution.test.ts` — CLI coverage for output formats and read-only behavior.
- `docs/EVOLUTION_LOOP.md` — document the analysis command and its non-claims.
- `docs/benchmarks/2000m-v1-two-lane-postmortem.md` — keep only if implementation needs a public cross-link after the feature ships.
- `.osc/releases/<date>-evolve-analyze.md` — release/evidence note for the implementation slice.

## Implementation Architecture Coverage

- Strengthens: evaluation, stop-condition recovery, audit trails, and handoff quality.
- Audit envelope: loop directory, attempts journal, frontier, evaluation envelopes, optional scorer evidence, rendered report, tests, and release/evidence note.
- Evaluation envelope: tests must show that non-pass criteria remain non-approved and that analysis does not promote a frontier or close work.
- Feedback routing: plateau or impossible criteria route to stop/redesign, human decision, benchmark redesign, or a next implementation slice.
- Boundary: no runtime execution, no approval, no benchmark ranking, no compliance certification, no raw-log storage.

## Acceptance criteria

- [ ] Given a loop with repeated unchanged scores, `osc evolve analyze` reports plateau status and no-improvement count.
- [ ] Given evidence that a criterion is probe-only, hardcoded non-pass, skipped, stale, or impossible under the current artifact type, the report flags that criterion as low/no score-sensitivity with the evidence source.
- [ ] The report includes current-vs-previous and current-vs-frontier AC deltas when evaluation or scorer evidence exposes per-criterion statuses.
- [ ] The report distinguishes score-frontier promotion from acceptance/compliance approval.
- [ ] The report recommends `stop/redesign` or `ask_human` instead of another retry when all remaining failures are non-score-moving or impossible.
- [ ] Terminal, markdown, and JSON outputs are supported.
- [ ] The command is read-only: it does not append attempts, alter frontier, change evaluations, or write reports unless `--out` is supplied.
- [ ] Existing `osc evolve compare` behavior and tests continue to pass.
- [ ] Docs state that analysis is a decision aid, not a model ranker, scorer, runtime, or approval authority.

## Verification steps

1. Add RED fixtures for a 2000m-like plateau: repeated `27/28`, unchanged composite, and one probe-only failing criterion.
2. Run focused tests for `evolution analyze` and compare regression coverage.
3. Run `npm test` and expect the full suite to pass.
4. Run `npm run build` and expect TypeScript/package build success.
5. Run `./verify.sh --strict` and expect repository compliance to pass.
6. Run `git diff --check` and expect no whitespace errors.
7. Manually inspect docs and CLI text for unsupported claims about automatic improvement, ranking, approval, or runtime control.

## Open questions

- Should probe-only/impossible-AC metadata come from evaluation envelopes first, scorer-adapter metadata first, or both?
- Should `osc evolve analyze` be a new subcommand or should `osc evolve compare` grow an `--analyze` mode? This plan prefers a separate command so compare stays simple.
- What default plateau threshold should apply when a loop has scores but no domain-specific scorer metadata?
