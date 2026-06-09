# Plan: 157-reproduction-proof-parity

## Status

active

## PR association

- Planned PR slot: #195, or the next available GitHub PR number.
- Branch: `feat/harness-reproduction-proof-parity`.
- Title: `feat: reproduce source prototype proof lanes`.
- Base: fresh `main` after PR #194 merges.

## Context

The source prototype produced strong efficiency and compact-handoff signals, but broad dominance remained mixed / not proven. Open Scaffold cannot inherit those claims by copying docs or schemas. It must run Open Scaffold-owned reproduction suites and preserve the result honestly.

This is the PR that answers Daniel's concern: did Open Scaffold reproduce the source signal, partially reproduce it, or fail to reproduce it?

## Goal

Run and document Open Scaffold-owned reproduction stages with strict proof gates, ablations, evidence paths, and no broad claim unless the evidence clears the gate.

## Constraints / Out of scope

- Do not fabricate token, duration, quality, or command evidence.
- Do not strengthen claims based on source-prototype evidence alone.
- Do not commit raw live logs, secrets, local home paths, or runtime residue.
- Do not silently cap explicitly selected ablation fixtures.
- Do not overwrite primary evidence spines with post-hoc drills.
- Do not run full live reproduction if budget/runtime is not acceptable without Daniel's explicit approval.

## Files to touch

- `src/bench.ts` — add or harden live reproduction stages, fixture selection, ablations, aggregates, and proof gate output.
- `src/handoff.ts` — ensure handoff compiler evidence is included in targeted live handoff reproduction.
- `src/feedback.ts` — capture benchmark feedback and repair hypotheses when reproduction fails.
- `src/schema-registry.ts` — register reproduction aggregate/report schemas.
- `tests/bench-harness.test.ts`, `tests/handoff-compiler.test.ts`, `tests/path-safety-harness.test.ts` — expand proof/reproduction coverage.
- `docs/HARNESS_REPRODUCIBILITY.md`, `docs/PROOF_HARNESS.md`, `docs/JOHN_LOMEIN_MIGRATION_ROADMAP.md` — update claim boundaries and evidence instructions.
- `.osc/releases/<date>-harness-reproduction-proof-parity.md` — source-labeled evidence note if the repo convention accepts release/evidence notes for this slice.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
| --- | --- | --- | --- |
| T1 | Read source-prototype aggregate files and summarize fixture IDs, metrics, confounds, and required ablations into repo-relative notes only. | None | A |
| T2 | Write failing tests for explicit fixture selection, no silent ablation cap, aggregate metrics, and proof gate refusal when confounds remain. | T1 | B |
| T3 | Write failing tests for benchmark feedback and failed reproduction repair hypotheses. | T1 | B |
| T4 | Implement/harden fixture selection, live mode guards, aggregate/report output, and proof gate reasons. | T2-T3 | C |
| T5 | Run simulated smoke and handoff lab as baseline checks. | T4 | D |
| T6 | Run targeted live handoff if budget/runtime are acceptable. | T5 | E |
| T7 | Run representative live fixtures with selected ablations if targeted live is meaningful. | T6 | F |
| T8 | Run full live only if Daniel explicitly approves cost/runtime and D/E are promising. | T7 | G |
| T9 | Write reproduction report: reproduced, partially reproduced, or not reproduced. | T5-T8 | H |
| T10 | Run verification, review, and PR workflow. | T9 | I |

### Parallel groups

- **Group A** (source readout): T1 summarizes source evidence and confounds.
- **Group B** (TDD red): T2-T3 define fixture, ablation, aggregate, proof, and feedback behavior.
- **Group C** (implementation): T4 hardens benchmark/reproduction code.
- **Groups D-G** (evidence): T5-T8 run the reproduction ladder in increasing cost/risk order.
- **Group H** (reporting): T9 writes the claim readout from actual evidence.
- **Group I** (verification): T10 runs gates and review.

### Dependencies

- Live reproduction depends on the controlled runtime from PR #193 and feedback/handoff loop from PR #194.
- Targeted live handoff must run before representative live because it validates the narrow compact-handoff path cheaply.
- Full live reproduction requires explicit owner approval if runtime/cost is significant.
- Later post-hoc drills must not overwrite the primary evidence spine.

### Reproduction stages

| Stage | Required command shape | Gate |
| --- | --- | --- |
| A. Simulated smoke | `osc bench suite --mode simulated --out .osc/bench/simulated-runtime-smoke ...` | Must pass before any live run. |
| B. Handoff lab | `osc bench handoff-lab --out .osc/bench/handoff-lab-15` | Must evaluate all 15 candidates. |
| C. Targeted live handoff | `osc bench suite --mode live --fixture token-efficient-handoff-resume --include-ablations --ablation-fixture token-efficient-handoff-resume --allow-spawn ...` | Required for narrow compact-handoff reproduction. |
| D. Representative live | 3+ fixtures with explicit matching ablations | Required for serious parity readout. |
| E. Full live | all fixtures + all ablations | Required before any broad dominance claim. |

## Acceptance criteria

- [ ] Source-prototype evidence is summarized as provenance, not treated as Open Scaffold proof.
- [ ] Simulated smoke writes aggregate/report and keeps broad proof as not proven.
- [ ] Handoff lab evaluates all 15 method candidates.
- [ ] Explicit ablation fixture selections are not silently capped.
- [ ] Live lane completion is dirty/blocked if the process times out, exits non-zero, is signaled, lacks clean markers, or has incomplete evidence.
- [ ] Aggregate includes quality, tokens, duration, rounds, clean completion, ablations, and proof-gate reasons.
- [ ] Failed or partial reproduction creates benchmark feedback and repair hypotheses.
- [ ] Report states one of: reproduced, partially reproduced, not reproduced.
- [ ] Broad dominance remains mixed / not proven unless all strict gates clear.

## Verification steps

1. Run focused benchmark/proof tests.
2. Run `npm run build`.
3. Run `npm test`.
4. Run `./verify.sh --strict`.
5. Run simulated smoke and inspect aggregate/report.
6. Run handoff lab and inspect aggregate/report.
7. If approved/safe, run targeted live handoff and inspect aggregate/report.
8. If approved/safe, run representative live suite and inspect aggregate/report.
9. Run path/count-only scan for runtime residue, private paths, and secrets.
10. Run independent review focused on proof overclaims, ablations, dirty completions, and evidence paths.

## Open questions

- What is the maximum live runtime budget Daniel wants for targeted and representative reproduction?
- Should full live reproduction be a PR task or a scheduled/overnight evidence task followed by a small report PR?
