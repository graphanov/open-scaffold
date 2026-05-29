# A/B Comparison — Pre-Registration (template)

> **This is a template, not a result.** Copy it into your own repo, fill every
> section with your specifics, and commit it **before collecting any data**.
> Nothing in this file is evidence about Open Scaffold; it is the instrument you
> commit to in advance so the analysis cannot be reshaped to fit the outcome.
> See `docs/AB_COMPARISON_PROTOCOL.md` for the rationale, design options, and
> threats to validity that this form operationalizes.

## Study identity

- Title: `<short name for this comparison>`
- Owner / experimenter: `<name>`
- Design: within-subjects pilot (descriptive, hypothesis-generating only) — see protocol for the between-subjects confirmatory form.
- Participant pool: `<who runs the tasks>`
- Planned task count: `<e.g. 6–10 for a pilot>`

## Hypotheses

Each hypothesis is a falsifiable prediction with an explicit null. Report every
arm and every metric, including null and negative results.

- **H1 (resume time).** Arm A resumes a cold, multi-session task faster than Arm B. Null: no difference.
- **H2 (rework / drift).** Arm A has fewer scope-drift and rework incidents. Null: no difference in incident count.
- **H3 (context re-explanation cost).** Arm A requires less human-typed context to re-establish state at resume. Null: no difference.
- **H4 (reviewer reconstruction).** A blinded reviewer can more completely reconstruct what/why/changed/verified for Arm A than Arm B. Null: no difference in reconstruction score.

## Arms

- **Arm A — scaffolded.** The full Open Scaffold loop: `MISSION.md`, an immutable plan, amendments on scope change, evidence notes, and `verify.sh`.
- **Arm B — control.** AI-assisted work with no repo record (chat/context only). Document the actual Arm B behavior; it is not a clean zero.

## Metrics

Every figure is source-labeled. Allowed `source` values, recorded per row in the
raw-data file: `git`, `osc-artifact`, `metrics`, `manual`, `unavailable`. A metric
that cannot be measured for a task is recorded with `source: unavailable` and a
blank value — never imputed or estimated.

| Hypothesis | Metric (raw-data `metric` value) | Unit | Typical source |
|-----------|----------------------------------|------|----------------|
| H1 | `resume_time_seconds` | seconds | manual (stopwatch at cold resume) |
| H2 | `rework_incidents` | count | manual (coded from history + notes) |
| H3 | `context_reexplanation_words` | words | manual or `metrics` if `114` usage data present |
| H4 | `reconstruction_score` | 0–12 rubric points | manual (blinded reviewer, see `reviewer-rubric.md`) |

## Assignment

- Randomization procedure: `<recorded random method, e.g. seeded coin flip>`.
- Counterbalancing / washout (within-subjects): `<ordering rule and the gap between tasks>`.
- "Cold" definition for resume: at least a 24-hour gap, a fresh session, and no access to prior scrollback.

## Analysis plan

- Primary report: per-arm descriptive statistics for each metric with confidence intervals, not just point estimates.
- A pilot is descriptive and hypothesis-generating only; it cannot establish significance and the writeup must say so.
- No dropping inconvenient tasks. No post-hoc metric selection. All four hypotheses are reported even when null.
- Where a metric is computable by `osc study` (plan `125`), reuse that computation so observational and controlled views stay consistent.

## Pre-registration attestation

- [ ] These hypotheses, metrics, rubric, and analysis plan were committed to version control **before any data** was collected.
- Pre-registration commit: `<git sha, filled in when committed>`
- First data-collection commit: `<git sha, filled in later — must come after the line above>`

No public README or MISSION claim is drawn from this work without a separate, explicit owner gate.
