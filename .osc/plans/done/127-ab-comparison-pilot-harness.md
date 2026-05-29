# Plan: 127-ab-comparison-pilot-harness

## Status

done

## Context

The controlled comparison (A/B) protocol at `docs/AB_COMPARISON_PROTOCOL.md` (written under plan `125`) is text-only — a recipe, not something an adopter can pick up and run. To move beyond the observational self-study's correlational signal toward a defensible causal reading, a team needs concrete, pre-registered artifacts: a runbook, a pre-registration form committed before any data, a source-labeled raw-data template, and a blinded reviewer rubric. This plan packages those so the comparison is runnable and auditable — without running it.

## Goal

Turn the text-only A/B protocol into an executable, pre-registered pilot packet — a step-by-step runbook, a commit-before-data pre-registration template, a source-labeled raw-data template, and a blinded reviewer rubric, plus an optional read-only `osc ab check` validator — while recording explicitly that no controlled outcome data has been collected and no causal claim is made.

## Constraints / Out of scope

- Do not run the experiment or collect outcome data: this slice ships the harness only; running it is separate future work gated on having enough matched tasks and participants.
- Do not make or imply any causal or marketing claim such as "Open Scaffold wins"; the packet is a pre-registered measurement instrument, and any public claim remains a separate owner gate.
- No new canonical state and no runtime dependency: the optional validator is read-only and never writes results, scores data, or mutates files.
- Keep all wording public-safe and neutral; the artifacts are templates an external adopter copies into their own repo.
- Reuse the existing protocol rather than restating it; the runbook links to `docs/AB_COMPARISON_PROTOCOL.md` for rationale and threats to validity.

## Files to touch

- `docs/AB_COMPARISON_PILOT.md` — operational runbook that turns the protocol into ordered, runnable steps.
- `docs/examples/ab-comparison/README.md` — index of the pilot packet artifacts and how they fit together.
- `docs/examples/ab-comparison/pre-registration.md` — fill-before-data template: hypotheses, metrics, analysis plan, arms, attestation.
- `docs/examples/ab-comparison/raw-data-template.csv` — one row per task with source-labeled columns, arm, and metric fields.
- `docs/examples/ab-comparison/reviewer-rubric.md` — blinded reconstruction-scoring rubric for the reviewer (H4).
- `docs/examples/README.md` — link the new pilot packet from the examples index.
- `src/ab.ts`, `src/cli.ts` — optional read-only `osc ab check <path>` validator over the pre-registration and raw-data files.
- `tests/ab.test.ts` — prove the validator accepts a well-formed packet and rejects malformed cases.

## Implementation Architecture Coverage

- Strengthens: evaluation and audit-trail honesty — pre-registration plus source-labeled raw data make the comparison falsifiable and reproducible.
- Audit envelope: the pre-registration file (committed before data), the raw-data CSV, and the reviewer rubric scores.
- Evaluation envelope: `osc ab check` validates structure (required columns, declared arms, pre-registration completeness); human coding and blinded review evaluate outcomes against the rubric.
- Feedback routing: a malformed or incomplete packet fails `osc ab check` with explicit messages; missing data is reported as missing, never imputed.
- Boundary: this slice does not run the experiment, compute effect sizes, collect data, or make any causal claim; those remain out of scope and owner-gated.

## Acceptance criteria

- [x] `docs/AB_COMPARISON_PILOT.md` exists as an ordered runbook that links to `docs/AB_COMPARISON_PROTOCOL.md` and states up front that no data has been collected and that the packet proves nothing about outcomes on its own.
- [x] `docs/examples/ab-comparison/` contains a pre-registration template, a source-labeled raw-data template (CSV), and a blinded reviewer rubric, indexed by a README and linked from `docs/examples/README.md`.
- [x] The pre-registration template requires hypotheses, metrics with source labels, the analysis plan, and an explicit "committed before any data" attestation line.
- [x] Optional `osc ab check <path>` runs read-only and reports whether the pre-registration and raw-data files are structurally well-formed, exiting nonzero on a malformed packet and zero on a well-formed one.
- [x] Tests prove `osc ab check` accepts the well-formed example packet and rejects at least one malformed case (missing required column or unlabeled metric); no test asserts any outcome, effect, or winner.

## Verification steps

1. Run `npm test -- --run tests/ab.test.ts` — expect green.
2. Run `osc ab check docs/examples/ab-comparison` — expect exit 0 with a "well-formed" report.
3. Run `osc ab check` against a copy of the raw-data template with the `source` column dropped — expect a nonzero exit with an explicit message.
4. Run `npm run build` and `./verify.sh --strict` — expect pass.
5. Read `docs/AB_COMPARISON_PILOT.md` and the packet README and confirm both state, prominently, that no data has been collected and no causal claim is made.

## Open questions

- Should `osc ab check` also assert that the pre-registration file's commit predates the first raw-data row (a true "registered before data" time check), or is that more than a pre-data pilot harness needs before any data exists?
- Is a single CSV the right raw-data shape for the template, or would one source-labeled file per task be easier for an adopter to audit?
