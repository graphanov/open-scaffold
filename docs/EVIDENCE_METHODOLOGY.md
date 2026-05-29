# Evidence Methodology

Status: active measurement protocol for the observational self-study produced by `osc study`. This document is the recipe and the honesty contract; the computed result lives in `docs/EVIDENCE_SELF_STUDY.md`, and the controlled comparison that this study deliberately does **not** run is specified in `docs/AB_COMPARISON_PROTOCOL.md`.

## Why this exists

`docs/FAQ.md` makes several value claims about the methodology and, to its credit, labels them as hypotheses rather than benchmarks ("Not benchmarked, honestly. Treat any specific time-savings number as a hypothesis until you've measured it on your own workflow."). That honesty is the brand. But "treat it as a hypothesis" left the project with no reproducible way to look at its *own* repository and report what, if anything, the artifacts actually show.

This protocol closes that gap without betraying the posture that created it. It maps named FAQ claims to signals that can be computed from committed git history and `.osc/` artifacts, states exactly what each signal can and cannot support, and forbids the tooling from inventing a number it cannot source. The output is **evidence, not a marketing claim**: no figure here may be promoted to README/MISSION without a separate, explicit owner gate.

## Honesty rules (inherited from the project)

These are enforced by `osc study` and by `tests/study.test.ts`, not just stated here:

1. **Source-label every figure.** Each signal carries a `source` of `git`, `osc-artifact`, `metrics`, or `unavailable`. A figure with no source label is a bug, and the validator rejects it.
2. **Never impute.** If a value cannot be computed from committed artifacts, it is emitted as `null` with source `unavailable` — never estimated, interpolated, or back-filled. A signal sourced `unavailable` that carries a number is a hard validation failure.
3. **`unavailable` is not zero.** It means "the tool cannot compute this here," usually because it needs an optional input (such as the plan-114 usage ledger) that this repo does not have.
4. **`null` is not failure.** It means the computation ran and found no data yet (for example, cycle time before any plan is done). It is reported, not hidden.
5. **No causation.** Every signal is observational. See the disclaimer below.
6. **Report null and negative results.** A self-study that found nothing, or found an honesty gap in the project's own records, must say so. Inconvenient findings are not dropped.
7. **No network, no telemetry.** `osc study` is read-only over local git and `.osc/`. It makes no network calls and collects nothing about the user.

## No-causation disclaimer

`osc study` computes **correlational, observational** signals from a single repository's committed history. It cannot establish that the methodology *caused* any outcome, for three structural reasons:

- **No counterfactual.** Committed history never shows what the same work would have looked like *without* the scaffold. There is no control arm in observed history.
- **Snapshot, not experiment.** Signals are read from the current tree and commit log at one moment; nothing here is randomized, assigned, or held constant.
- **Indirect proxies.** Amendment counts, evidence completeness, and plan-referencing commits stand in for the underlying claims; they are not direct measurements of resume time, drift, or reviewer effort.

Moving from "scaffolded work *correlates* with X" to "the scaffold *caused* X" is the job of `docs/AB_COMPARISON_PROTOCOL.md`, which is **out of scope for this study and is not run here.**

## The scaffolded-vs-unscaffolded control model

The FAQ claims are implicitly comparative — they say scaffolded work goes better *than winging it*. Honest evaluation therefore needs two arms:

- **Arm A — scaffolded.** The full Open Scaffold loop: mission, immutable plans, amendments on scope change, evidence notes, `verify.sh`.
- **Arm B — control (unscaffolded).** AI-assisted work with no repo record; the participant's natural "winging it" baseline.

**This observational study only sees Arm A.** This repository was built with the scaffold throughout, so there is no Arm B inside it. That is the single most important limitation of the self-study: it can describe what scaffolded work looks like, but it cannot compare it against an unscaffolded baseline, because no such baseline exists in this history. Constructing a real, randomized Arm B is exactly what the A/B protocol is for, and why the A/B protocol — not `osc study` — is the only path to a causal, public-facing claim.

## Hypotheses mapped to repo-observable signals

Each hypothesis below is anchored to a verbatim FAQ question and tagged with an **observability** level:

- **observable** — the artifacts carry a usable, source-labeled proxy today.
- **descriptive** — computed for context only; supports no FAQ value claim.
- **unavailable** — named honestly so the gap is visible; no proxy exists in committed artifacts.

The hypothesis IDs and signal IDs here match `src/study.ts` exactly, so the protocol and the tool cannot drift apart.

### D-activity (descriptive baseline)

Not a value claim. Gives the value signals context: how much work exists and how fast it moves.

| Signal | Source | What it is |
|---|---|---|
| `total_plans` | metrics | Plan files in scope; the denominator for ratios. |
| `done_plans` | metrics | Plans that reached `done/`. |
| `commits_in_range` | git | Commits in the studied range; activity context only. |
| `cycle_time_median_days` / `cycle_time_mean_days` | metrics | Days from plan creation to close; `null` before any plan is done. The FAQ makes no cycle-time promise, so these stay descriptive. |

### H-scope-drift — observable

> FAQ: "How much time does this actually save me vs. just winging it?" → "fewer 'wait, I thought we decided X' moments."

Claim: scope changes are captured as explicit amendments rather than silent re-litigation.

| Signal | Source | What it is |
|---|---|---|
| `amendment_total` | osc-artifact | Count of `-amendment-N.md` files across in-scope plans. |
| `plans_with_amendments` | osc-artifact | Distinct plans carrying at least one amendment. |
| `amendments_per_plan` | osc-artifact | `amendment_total / total_plans`; `null` when no plans are in scope. |

Honest limit: a count alone cannot distinguish "little drift" from "drift that was never captured." A low number is ambiguous, not a win.

### H-reviewer-reconstruction — observable

> FAQ: "Is this useful for consulting, client delivery, or compliance/audit work?" and "answer what you did, why, and how you know it worked, months later."

Claim: a cold reader can reconstruct what/why/changed/verified from the repo alone.

| Signal | Source | What it is |
|---|---|---|
| `evidence_completeness_pct` | metrics | Share of done plans that have an evidence/release note; `null` before any plan is done. |
| `plans_with_evidence` | metrics | Done plans with at least one evidence note a reviewer could read. |
| `plan_referencing_commits` | git | Commits whose subject names a known plan slug. A **floor** on plan↔commit traceability: commits omitting the slug are not counted. |

Honest limit: presence of an evidence note is not proof of its quality; `plan_referencing_commits` undercounts by construction.

### H-protocol-adherence — observable

> FAQ: "Will my agent actually follow the protocol, or will it just ignore the files?"

Claim: work is carried through to an evidenced, decision-stamped close rather than abandoned mid-loop.

| Signal | Source | What it is |
|---|---|---|
| `approval_approved` / `approval_weak_approved` / `approval_rejected` / `approval_blocked` | metrics | Done plans whose evidence note records each machine-readable decision. |
| `approval_unknown` | metrics | Done plans with **no** machine-readable approval decision. An honesty gap, not evidence of adherence. |

Honest limit: a high `approval_unknown` is a finding *against* the project's own record-keeping and must be reported as such.

### H-resume-time — unavailable

> FAQ: "How much time does this actually save me vs. just winging it?" → sessions "resume in under a minute instead of fifteen."

`session_resume_seconds` is **unavailable**. Wall-clock resume time is not observable from committed artifacts; inferring it from commit gaps would be imputation. Measure it directly under the A/B protocol.

### H-context-reexplanation — unavailable

> FAQ: "Is this just going to slow me down? I'm used to vibing." → session two does not start with "OK so where were we..."

`context_reexplanation_tokens` is **unavailable**. It requires the optional usage ledger (plan `114-work-usage-ledger-v1`), which is not present in this repo.

### H-cost — unavailable

> FAQ: "Does this reduce token usage / cost?" → "Often, indirectly — but this is not benchmarked yet."

`token_cost_usd` is **unavailable** for the same reason: no usage ledger. The study reports the gap rather than guessing a dollar figure.

## Threats to validity

- **No control arm (selection):** the repo is all-scaffolded; there is no unscaffolded baseline to compare against. This is the dominant threat and the reason no causal claim is possible.
- **Survivorship / publication of self:** the project measuring itself has an incentive to look good. Mitigated by forcing null/negative reporting and by source-labeling, not by trust.
- **Proxy validity:** amendment counts and evidence presence are indirect; they may over- or under-state the underlying behavior.
- **Undercounting:** `plan_referencing_commits` only matches commit subjects that name a known slug.
- **Snapshot bias:** a single moment's tree and log, not a time series of how the repo evolved.
- **Tooling coupling:** signals are only as correct as `osc metrics` and the git log they read; a bug there propagates here.

## How to reproduce

```
osc study                 # human-readable markdown to stdout
osc study --json          # machine-readable open-scaffold.study.v1 report
osc study --since <date>  # restrict to plans/commits on or after a date
osc study --out <path>    # write the report to a file (markdown, or JSON with --json)
```

`docs/EVIDENCE_SELF_STUDY.md` is the committed output of `osc study --out`. Regenerating it on the same commit reproduces every section except the `Computed at:` timestamp.

## Relationship to the A/B protocol

`docs/AB_COMPARISON_PROTOCOL.md` is the controlled, causal counterpart to this observational study. It is **text-only and not run.** The observational self-study lands first and sets the baseline; that baseline tells an adopting team which metrics are worth the real cost of a controlled comparison before anyone spends effort running one. No public claim is drawn from either document without a separate, explicit owner gate.
