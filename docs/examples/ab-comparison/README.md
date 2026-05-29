# A/B Comparison — Pilot Packet

> **No data has been collected. This packet proves nothing about outcomes.**
> It is a *pre-registered measurement instrument* — the templates an adopting
> team copies to run the controlled comparison described in
> [`docs/AB_COMPARISON_PROTOCOL.md`](../../AB_COMPARISON_PROTOCOL.md) on their own
> work. It does not claim, and cannot show, that Open Scaffold improves any
> outcome. Running the comparison and interpreting results is separate future
> work, gated on having enough matched tasks and participants.

## What is in this packet

| File | Purpose |
|------|---------|
| [`pre-registration.md`](pre-registration.md) | Fill-before-data form: hypotheses, arms, metrics (source-labeled), assignment, analysis plan, and a commit-before-data attestation. |
| [`raw-data-template.csv`](raw-data-template.csv) | One row per task per metric. Every figure carries a `source` label; unmeasured figures are `unavailable`, never imputed. Ships with illustrative `unavailable` rows only. |
| [`reviewer-rubric.md`](reviewer-rubric.md) | Blinded 0–12 rubric for the reviewer-reconstruction hypothesis (H4). |

The step-by-step runbook that ties these together is
[`docs/AB_COMPARISON_PILOT.md`](../../AB_COMPARISON_PILOT.md).

## Raw-data schema

`raw-data-template.csv` uses a long format — one figure per row — so that every
number is independently source-labeled:

- `task_id` — identifier for the task.
- `arm` — `A` (scaffolded) or `B` (control). No other value is valid.
- `metric` — what is measured, e.g. `resume_time_seconds`, `rework_incidents`, `context_reexplanation_words`, `reconstruction_score`.
- `value` — the measurement, or blank when unavailable.
- `source` — one of `git`, `osc-artifact`, `metrics`, `manual`, `unavailable`. This is a superset of the `osc study` source enum (`git`/`osc-artifact`/`metrics`/`unavailable`); `manual` covers figures coded by hand under the rubric, which `osc study` cannot produce.
- `notes` — free text (optional).

## Checking the packet

The optional read-only validator confirms the packet is structurally
well-formed before you trust it — it never writes, scores, or interprets data:

```bash
osc ab check docs/examples/ab-comparison
```

It exits `0` when the pre-registration and raw-data files are well-formed, and
nonzero with an explicit message when a required column is missing, an `arm` is
not `A`/`B`, a `source` is not in the allowed set, or the pre-registration is
missing its attestation. A passing check means "the instrument is well-formed,"
**not** "the experiment was run" or "the scaffold works."
