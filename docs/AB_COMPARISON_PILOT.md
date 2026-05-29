# A/B Comparison — Pilot Runbook

> **Status: harness only. No data has been collected and no causal claim is
> made.** This runbook turns the text-only [`AB_COMPARISON_PROTOCOL.md`](AB_COMPARISON_PROTOCOL.md)
> into ordered, runnable steps and points at the templates in
> [`examples/ab-comparison/`](examples/ab-comparison/README.md). Following it
> produces a *pre-registered instrument and, later, source-labeled raw data* —
> it does not, on its own, show that Open Scaffold improves any outcome. Read
> the protocol's "Threats to validity" and "Sample size and statistical
> honesty" sections before trusting any pilot you run.

## What this runbook is for

The observational self-study (`osc study`, plan `125`) can show correlation but
not cause. A controlled comparison is the honest way to ask whether the scaffold
*made* work go better. This runbook is the operational recipe for a small
**within-subjects pilot** — descriptive and hypothesis-generating only. It exists
so that the comparison, if anyone runs it, is pre-registered, source-labeled,
blinded where it matters, and reproducible.

## Before you start

- Read [`AB_COMPARISON_PROTOCOL.md`](AB_COMPARISON_PROTOCOL.md) end to end. The design choices (within- vs between-subjects, controls held constant, threats to validity) are decided there; this runbook assumes them.
- Copy the packet templates from [`examples/ab-comparison/`](examples/ab-comparison/README.md) into your own repository. You will fill them in; the shipped copies stay as blank-able examples.

## Steps

1. **Pre-register.** Fill `pre-registration.md` completely: hypotheses with nulls, the two arms, each metric with its source label, the randomization and cold-resume definitions, and the analysis plan. Commit it. Record the commit sha in the attestation block. **Commit this before collecting any data** — that ordering is the whole point.
2. **Validate the instrument.** Run `osc ab check <your-packet-dir>` and confirm it reports the packet well-formed (exit `0`). This checks structure only; it does not run or interpret anything.
3. **Build a task pool.** Assemble tasks matched on size and difficulty, of comparable, scoped, multi-session shape. Write down how you judged difficulty.
4. **Randomize.** Assign tasks to Arm A (scaffolded) or Arm B (control) by the recorded random procedure. For a within-subjects pilot, counterbalance ordering and keep a washout gap between tasks.
5. **Run each task** to its defined stopping point under its arm's rules. Arm A uses the full Open Scaffold loop; Arm B is the documented "no repo record" baseline. Keep the held-constant controls identical across arms (same model, tool access, time budget, definition of done).
6. **Force a cold gap**, then resume. At the moment of resume, measure resume time (H1) and the human-typed context cost (H3). "Cold" means at least 24 hours, a fresh session, and no prior scrollback.
7. **Code incidents (H2)** from the work trail against a fixed rubric: count reversals and redos attributable to a forgotten or re-litigated decision.
8. **Blind-review (H4).** Strip arm labels, then have the reviewer score reconstruction with [`reviewer-rubric.md`](examples/ab-comparison/reviewer-rubric.md). The experimenter fills the `arm` column afterward from the blinding key.
9. **Record raw data.** Add one source-labeled row per task per metric to your copy of `raw-data-template.csv`. Unmeasured figures are `source: unavailable` with a blank value — never imputed. Re-run `osc ab check` and commit the data.
10. **Analyze descriptively.** Report per-arm descriptive statistics with confidence intervals for every metric and every hypothesis, including null and negative results. State plainly that a pilot cannot establish significance.

## What a finished pilot can and cannot say

- **Can:** estimate effect sizes, surface measurement problems, and tell you whether a larger, powered, between-subjects confirmatory study is worth the cost.
- **Cannot:** establish statistical significance, prove causation from a handful of tasks, or justify a public "the scaffold works" claim. Any README or MISSION claim drawn from a pilot remains a separate, explicit owner gate.

## Relationship to `osc study`

Where a metric is computable by `osc study` (plan `125`), reuse that computation
so the observational and controlled views stay consistent. `osc study`
deliberately reports resume time as `unavailable`; the controlled pilot measures
it directly at the cold resume instead of approximating it from commit gaps.
