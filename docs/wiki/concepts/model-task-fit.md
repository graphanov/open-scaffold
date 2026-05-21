---
title: Model Task Fit
created: 2026-05-21
updated: 2026-05-21
type: concept
tags: [open-scaffold, model-routing, evaluation, agent-orchestration]
sources: [.osc/plans/done/031-agentic-orchestration-model-lab-vision.md, docs/wiki/concepts/agentic-orchestration.md, docs/wiki/summaries/runtime-orchestration-sparring-synthesis.md, docs/EVOLUTION_LOOP.md, docs/RUNTIME_BINDING_CONTRACT.md]
confidence: low
contested: true
---

# Model Task Fit

Model task fit is the hypothesis that an Open Scaffold project could eventually record which models, runtimes, or evaluator lanes work better for specific classes of work.

This is not a shipped Open Scaffold capability and it is not a core promise. It is a research/lab-layer idea that may become useful only when observations come from reproducible evidence rather than preference, anecdotes, or vendor claims.

## Why the idea matters

Open Scaffold already records plans, run packets, evidence notes, evaluations, audit manifests, and evolution-loop attempts. Those artifacts could make future model/task-fit observations more grounded than chat memory or ad-hoc benchmark screenshots.

A credible observation would answer questions like:

- What task class was attempted?
- Which model, runtime, workflow, and prompt/plan contract were used?
- What acceptance criteria and evaluator judged the result?
- What evidence proves the result was better, worse, cheaper, safer, or more reliable?
- Could another project reproduce the comparison?

## Boundary

Model task fit should stay out of Open Scaffold core until there is lab-grade evidence and a maintenance owner.

Open Scaffold core may provide:

- stable task/run/evidence identifiers;
- evaluation and audit envelope structures;
- evolution-loop attempt/frontier records;
- optional metadata fields that a lab or adapter can consume later.

Open Scaffold core should not provide:

- model rankings;
- “best model for task” tables;
- benchmark claims;
- vendor certification;
- automatic model routing;
- init-time model/runtime pickers.

## Smallest credible future artifact

The smallest credible artifact is not a public leaderboard. It is a reproducible evidence profile for one task class:

1. define the task class and acceptance criteria;
2. run comparable attempts through bounded run packets;
3. record evaluator identity, model/runtime versions, cost/time, and failure modes;
4. publish evidence and caveats;
5. state only what the evidence supports.

That belongs in a future lab, adapter, or sibling package unless the owner explicitly promotes it into the roadmap.

## Current recommendation

- **V1:** do not include model task fit beyond hypothesis docs and source-of-truth evidence primitives.
- **V1.x:** consider optional evidence-comparability metadata only after adapter conformance and real runtime evidence make comparisons meaningful.
- **V2 or sibling package:** if demand appears, explore an evaluation lab package that consumes Open Scaffold evidence but owns benchmark methodology and maintenance.

Related: [[agentic-orchestration]], [[agent-runtime-selection]], [[evidence-first-development]], [[run-packets]], [[human-in-the-loop-governance]].
