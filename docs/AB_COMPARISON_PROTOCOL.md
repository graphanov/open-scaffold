# Controlled Comparison (A/B) Protocol

Status: protocol only — not yet run. Running this comparison is future work, gated on the observational self-study from `.osc/plans/done/125-methodology-evidence-harness.md` landing first and on having enough matched tasks/participants to run it credibly. This document is the recipe, not a result.

## Why this exists

The observational self-study (`osc study`, plan `125`) can show that scaffolded work *correlates* with better outcomes, but it cannot show *cause*. There is no counterfactual in observed history: you never see what the same work would have looked like without the scaffold. A controlled comparison is the only honest way to move from "scaffolded work tends to go better" to "the scaffold made it go better" — and the second is what would justify a public claim like the FAQ's "resume in under a minute instead of fifteen."

This protocol doubles as a recipe an adopting team can run on its own work to decide whether Open Scaffold earns its keep for them specifically.

## What is being compared

- **Arm A — scaffolded.** The full Open Scaffold loop: `MISSION.md`, an immutable plan, amendments on scope change, evidence notes, and `verify.sh`.
- **Arm B — control.** AI-assisted work with no repo record: the agent operates from chat/context only. Arm B is whatever the participant's natural "winging it" baseline is; it is **not** a clean zero, and its actual behavior must be documented (people improvise their own structure, and that improvisation is part of what is being measured against).

## Hypotheses

Each is stated as a falsifiable prediction with a null. The honest expectation is that some will show no effect, and that result is reported, not buried.

- **H1 (resume time).** Arm A resumes a cold, multi-session task faster than Arm B. Null: no difference in resume time.
- **H2 (rework / drift).** Arm A has fewer scope-drift and rework incidents ("I thought we decided X"). Null: no difference in incident count.
- **H3 (context re-explanation cost).** Arm A requires less human-typed context to re-establish state at resume. Null: no difference.
- **H4 (reviewer reconstruction).** A cold reviewer can more completely answer "what was asked, why, what changed, how it was verified" for Arm A than Arm B. Null: no difference in reconstruction score.

Hypotheses and metrics are **pre-registered** — written down and committed before any data is collected — so the analysis cannot be reshaped to fit the result.

## Design

- **Unit of analysis:** a *task* — a scoped piece of multi-session AI-assisted work of comparable size and difficulty.
- **Assignment:** tasks are randomly assigned to Arm A or Arm B.
- **Two design options:**
  - *Between-subjects:* different people/tasks in each arm. Cleaner (no learning effect) but needs more participants and careful matching of task difficulty. This is the form a confirmatory study should take.
  - *Within-subjects (crossover):* the same participant does some tasks scaffolded and some not. Cheaper, fewer participants, but introduces learning and ordering effects. Acceptable only for a **pilot**, and only with counterbalanced (randomized) ordering and a washout gap between tasks.
- **Recommended sequence:** run a small within-subjects **pilot** first to estimate effect sizes and shake out the measurement procedure; only then decide whether a larger, powered, between-subjects confirmatory study is worth the cost.

## Held constant (controls)

Same agent/model and tool access across both arms; same per-task time budget; same definition of done; same task-difficulty distribution; same environment; the same blinded reviewer and the same scoring rubric. The single intended difference between arms is the presence of the Open Scaffold loop.

## Metrics

Every figure is source-labeled. Where a metric is computable by `osc study` (plan `125`), reuse that computation so the observational and controlled views stay consistent; the remaining metrics are coded manually under a fixed rubric.

- **Resume time (H1).** Wall-clock from the start of a session on a previously-paused task to the first commit or edit that advances the task. "Cold" is defined precisely: at least a 24-hour gap, a fresh session, and no access to prior scrollback. `osc study` deliberately reports this as unavailable in the observational self-study; the controlled run measures it directly instead of approximating it from commit gaps.
- **Rework / drift incidents (H2).** Count of reversals or redos attributable to a forgotten or re-litigated decision, coded from commit history plus reviewer notes against a written rubric.
- **Context re-explanation cost (H3).** Words/tokens the human types to re-establish context at resume (and, optionally, agent context tokens spent re-reading versus re-asking). If optional `114` usage data is present, source it from there; otherwise measure typed context directly.
- **Reviewer reconstruction score (H4).** A reviewer **blinded to which arm produced which output** scores, on a fixed rubric, how completely they can reconstruct what/why/changed/verified from the available record alone.

## Procedure

1. **Pre-register.** Commit the hypotheses, metrics, rubrics, and analysis plan to the repo before collecting any data.
2. **Build a task pool.** Assemble tasks matched on size and difficulty; document how difficulty was judged.
3. **Randomize.** Assign tasks to arms by a recorded random procedure.
4. **Run each task** to a defined stopping point under its arm's rules; record the raw work trail.
5. **Force a cold gap**, then resume and measure H1 and H3 at the moment of resume.
6. **Code incidents (H2)** from the work trail against the rubric.
7. **Blind-review (H4):** strip arm labels, have the reviewer score reconstruction.
8. **Commit raw data** (per-task, source-labeled) alongside the analysis so results are reproducible.

## Sample size and statistical honesty

A pilot of roughly six to ten tasks with a single participant is **descriptive and hypothesis-generating only** — it can estimate effect size and surface measurement problems, but it cannot establish significance, and the writeup must say so. A confirmatory between-subjects study credibly needs dozens of tasks and multiple participants to detect anything but a very large effect. Report confidence intervals, not just point estimates; never present a pilot as proof.

## Threats to validity

- **Learning / ordering effects** (within-subjects): doing similar work a second time is faster regardless of the scaffold — mitigated by counterbalanced ordering and washout, and avoided entirely in the between-subjects form.
- **Selection bias** (between-subjects): differences between the people in each arm rather than the method.
- **Hawthorne effect:** participants behave differently because they are being measured.
- **Experimenter bias:** the author wants the scaffold to win — mitigated by pre-registration and by blinding the reviewer.
- **Unclean control:** Arm B participants improvise structure, so B is not a true zero; document the actual Arm B behavior.
- **Task heterogeneity and small samples:** real tasks are not identical, and small N yields weak conclusions.

## Honesty rules (inherited from the project)

Pre-register before data collection. Report every arm and every metric, including null and negative results. No dropping inconvenient tasks, no post-hoc metric selection. Source-label every number and commit the raw data. Always distinguish a pilot (descriptive) from a confirmatory study (pre-registered and powered). No public README/MISSION claim is drawn from this work without a separate, explicit owner gate.

## Relationship to plan 125

This protocol is text-only and is referenced from `docs/EVIDENCE_METHODOLOGY.md`; running it is out of scope for plan `125`. The observational self-study lands first and sets the baseline, which tells you which metrics are worth the real cost of a controlled comparison before anyone spends effort running one.
