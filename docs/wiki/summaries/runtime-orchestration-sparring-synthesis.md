---
title: Runtime And Orchestration Sparring Synthesis
created: 2026-05-15
updated: 2026-05-15
type: summary
tags: [open-scaffold, agent-orchestration, runtime, evidence, product-vision]
sources: [.osc/plans/done/030-agent-runtime-selection-vision.md, .osc/plans/backlog/031-agentic-orchestration-model-lab-vision.md, docs/wiki/concepts/agent-runtime-selection.md, docs/wiki/concepts/agentic-orchestration.md]
confidence: medium
contested: true
---

# Runtime And Orchestration Sparring Synthesis

This page preserves the durable findings from two 2026-05-15 strategic sparring reviews about Open Scaffold's relationship to runtimes, orchestration, closed loops, and model/task-fit research.

The raw review reports were evidence for the decision, but this page is the public-safe reusable synthesis for future product-market verification.

## Core finding

Open Scaffold's strongest position is to be the source-of-truth-first evidence substrate that runtimes, coordinators, and labs can implement against.

The project should preserve these distinctions:

- **Runtime-selectable by contract, not runtime-selecting at init.**
- **Orchestration-expressible by contract, not orchestration-executing in core.**
- **Model/task-fit observations require lab-grade evidence, not vibes or vendor preference.**

## Layer model

Four product layers should not be conflated:

1. **Core contract** — Open Scaffold core: plans, run packets, evidence receipts, slice-close protocol, human gates.
2. **Runtime or orchestration adapter** — external coordinator/adapter: selects lanes, dispatches work, manages processes/worktrees, returns evidence.
3. **Evaluation lab** — possible sibling package/product: reproducible benchmarks, model/task-fit observations, methodology, model/version tracking.
4. **Native runtime** — deferred research: justified only by proofability, auditability, or governed execution needs.

V1 owns layer 1.

## V1 stance

For V1, Open Scaffold should not ship:

- `osc init --runtime`;
- an init-time runtime picker;
- `osc orchestrate`;
- model rankings or "best model for task" tables;
- benchmark claims;
- AI-research-lab positioning in core docs;
- native runtime or multi-agent spawning in core.

V1 can safely ship:

- runtime-neutral scaffold tiers;
- run packets with `executor.lane` as an execution-lane trace;
- evidence receipts;
- slice-close loop and amendments;
- public conceptual pages that mark runtime/orchestration ideas as hypotheses rather than release promises.

## Adapter conformance is the next credible bridge

The reviews converged that the next credible move is not a picker or orchestrator. It is an adapter conformance track:

1. create a fake/local adapter that consumes a run packet and returns a dispatch receipt;
2. create a conformance fixture so adapter authors can prove they satisfy the contract;
3. only after that, refresh real runtime adapters or recipes;
4. only after real adapter evidence, consider multi-lane comparison examples or optional evidence-comparability fields.

This path preserves runtime neutrality while making the contract executable.

## Product-market verification questions

Future product-market verification should test these hypotheses:

- Do users understand Open Scaffold as a protocol/substrate rather than a runtime?
- Do adapter authors understand how to consume run packets and return evidence?
- Does an executable adapter conformance fixture make the product more credible than broader orchestration claims?
- Do users want runtime/model recommendations, or do they mainly need evidence that their chosen tools can plug into the scaffold?
- Does "LSP-like evidence substrate for agentic work" resonate more than "AI research lab" or "agent runtime marketplace"?

## Reopening criteria

Promote runtime/orchestration capability only when there is evidence beyond owner intuition:

- a fake/local adapter package proves the dispatch receipt contract;
- an adapter conformance fixture exists;
- at least one real runtime lane consumes Open Scaffold packets end-to-end;
- at least one external user or adapter author requests the next layer;
- any native runtime or lab direction is justified by proofability, auditability, or governed execution.

Related: [[agent-runtime-selection]], [[agentic-orchestration]], [[run-packets]], [[evidence-first-development]], [[human-in-the-loop-governance]].
