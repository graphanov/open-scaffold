# Release / Evidence Note: 127-ab-comparison-pilot-harness

## Summary

Turned the text-only A/B comparison protocol into an executable, pre-registered
pilot packet: an ordered runbook (`docs/AB_COMPARISON_PILOT.md`), a
commit-before-data pre-registration template, a source-labeled raw-data
template, a blinded reviewer rubric (all under `docs/examples/ab-comparison/`),
and an optional read-only `osc ab check` validator. **No controlled outcome
data was collected and no causal claim is made** — this slice ships the
instrument only; running the experiment remains separate, owner-gated work.

## Traceability

- Roadmap / issue / task: extends the A/B protocol authored under plan `125`; no separate issue.
- Plan: .osc/plans/done/127-ab-comparison-pilot-harness.md
- Run ID / run packet: N/A — no runtime lane was launched; all work was local edits and read-only validation.
- Branch / PR: review branch `cli/ab-protocol-and-pr-summary`; PR review and merge remain owner gates.

## Verification

- `npm test -- --run tests/ab.test.ts` — 15 passed (validator unit + CLI + honesty-guard tests, including preference for filled `raw-data.csv` over the blank template when both are present).
- `osc ab check docs/examples/ab-comparison` — exit 0, "A/B pilot packet is well-formed"; report states this is not evidence any experiment was run.
- `osc ab check` on a raw-data file with the `source` column dropped — exit 1, "Raw-data file is missing required column: source."
- `npm run build` — pass (build:core + build:runtime-omx, no tsc errors).
- `./verify.sh --strict` — 9 pass, 0 fail, 1 warn (plan-immutability check skipped because this checkout is a git worktree; environmental, not a defect).
- Read-through of `docs/AB_COMPARISON_PILOT.md` and `docs/examples/ab-comparison/README.md` — both state up front that no data has been collected and the packet proves nothing about outcomes.

## Outcome

All five acceptance criteria are met:

1. `docs/AB_COMPARISON_PILOT.md` ships as an ordered runbook that links to `docs/AB_COMPARISON_PROTOCOL.md` and opens with a no-data / no-claim banner.
2. `docs/examples/ab-comparison/` holds the pre-registration template, source-labeled raw-data CSV, and blinded reviewer rubric, indexed by a README and linked from `docs/examples/README.md`.
3. The pre-registration template requires hypotheses, metrics with source labels, an analysis plan, and an explicit "committed before any data" attestation.
4. `osc ab check <path>` runs read-only, reporting structural well-formedness with exit 0, and exits nonzero with explicit messages on a malformed packet.
5. Tests prove the validator accepts the well-formed example packet and rejects malformed cases (missing column, invalid arm, invalid source, honesty-rule violations); no test asserts any outcome, effect, or winner.

The raw-data template ships only blank, `unavailable`-sourced illustrative rows — no fabricated numbers. The validator is strictly read-only: it never writes, scores, interprets, or imputes.

This is not a merge, publication, release, or approval; those remain owner gates.

## Follow-up

- Running the pilot — building a matched task pool, randomizing arms, collecting and source-labeling real data — is separate, owner-gated work. Until then the packet remains an instrument, not evidence.
- Open question carried from the plan: whether `osc ab check` should later assert that the pre-registration commit predates the first raw-data row (a true time-ordering check), versus keeping the validator purely structural before any data exists.
